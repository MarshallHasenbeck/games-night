// Pugdoku iOS app: layout + play-through check in a browser (the web build of apps/pugdoku).
// Needs: cd apps/pugdoku && npm run build && npx vite preview --port 4174     Run: node tools/pugapp.cjs [outdir]
const { chromium } = require('playwright');
const OUT = process.argv[2];
const SIZES = [
  [390, 844, 'iPhone 14 portrait', 47, 34], [375, 667, 'iPhone SE portrait', 20, 0], [430, 932, 'Pro Max portrait', 59, 34], [844, 390, 'iPhone 14 landscape', 0, 21], [932, 430, 'Pro Max landscape', 0, 21], [667, 375, 'iPhone SE landscape', 0, 0],
  [820, 1180, 'iPad 11 portrait', 24, 20], [1180, 820, 'iPad 11 landscape', 24, 20], [1024, 1366, 'iPad 13 portrait', 24, 20], [1366, 1024, 'iPad 13 landscape', 24, 20], [744, 1133, 'iPad mini portrait', 24, 20],
];
(async () => {
  const b = await chromium.launch(); let bad = 0; const errs = [];
  for (const [vw, vh, name] of SIZES) {
    const mob = vw < 700 || vh < 460;
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, isMobile: mob, hasTouch: true, deviceScaleFactor: OUT ? 2 : 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
    await p.addInitScript(() => { localStorage.setItem('gn-time', 'day'); });
    await p.goto('http://localhost:4174/'); await p.waitForSelector('.pdk-home'); await p.waitForTimeout(500);
    // first launch shows the rules; check, then close
    const rulesShown = await p.$('.pdk-modal');
    if (OUT && vw === 390) await p.screenshot({ path: `${OUT}/rules-${vw}.png` });
    if (rulesShown) await p.click('.pdk-modal .btn.small');
    const home = await p.evaluate(() => { const h = document.querySelector('.pdk-home'); return { sx: document.documentElement.scrollWidth - innerWidth, hs: h.scrollHeight - h.clientHeight }; });
    if (OUT) await p.screenshot({ path: `${OUT}/home-${vw}x${vh}.png` });
    const row = [`home:${home.sx > 1 ? 'W+' + home.sx : 'ok'}${home.hs > 1 ? '(scrolls ' + home.hs + ')' : ''}`];
    for (const diff of ['relaxed', 'easy', 'medium', 'hard']) {
      await p.goto('http://localhost:4174/'); await p.waitForSelector('.pdk-home');
      const idx = ['relaxed', 'easy', 'medium', 'hard'].indexOf(diff);
      await p.locator('.pdk-diff').nth(idx).click(); await p.waitForSelector('.pgdboard'); await p.waitForTimeout(500);
      const r = await p.evaluate(() => {
        const q = (s) => document.querySelector(s)?.getBoundingClientRect(); const pl = document.querySelector('.pdk-play');
        const bd = q('.pgdframe'), pn = q('.pdk-panel'), bar = q('.pdk-bar');
        const W = innerWidth, H = innerHeight;
        const inside = (r) => r.left >= -0.5 && r.right <= W + 0.5 && r.top >= -0.5 && r.bottom <= H + 0.5;
        const overlap = !(bd.right <= pn.left + 1 || bd.bottom <= pn.top + 1 || pn.right <= bd.left + 1 || pn.bottom <= bd.top + 1);
        const btns = [...document.querySelectorAll('.pdk-btns .btn')].map((e) => e.getBoundingClientRect());
        return { scrollY: pl.scrollHeight - pl.clientHeight, sx: document.documentElement.scrollWidth - W, board: Math.round(bd.width), inside: inside(bd) && inside(pn) && inside(bar) && btns.every(inside), overlap, cells: document.querySelectorAll('.pgdcell').length };
      });
      const ok = r.scrollY <= 1 && r.sx <= 1 && r.inside && !r.overlap;
      if (!ok) bad++;
      row.push(`${diff.slice(0, 3)}:${ok ? 'ok' : 'BAD ' + JSON.stringify(r)}@${r.board}`);
      if (OUT && diff === 'hard') await p.screenshot({ path: `${OUT}/play-hard-${vw}x${vh}.png` });
    }
    if (home.sx > 1) bad++;
    console.log(name.padEnd(22), `${vw}x${vh}`, row.join(' '));
    await ctx.close();
  }

  // ---- play-through at iPhone size: place pugs, autosave/continue, hint, undo, win
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('flow: ' + e.message));
  await p.addInitScript(() => { try { if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded', '1'); localStorage.setItem('CapacitorStorage.pugdoku.local.v1', JSON.stringify({ device: 'd', settings: { sound: false, haptics: false, icloud: false, diff: 'easy', seenRules: true }, cloud: { v: 1, game: { u: 0, g: null }, stats: {} }, used: {} })); } } catch (e) {} });
  await p.goto('http://localhost:4174/'); await p.waitForSelector('.pdk-home');
  const check = (c, m) => { if (!c) { bad++; console.log('FLOW FAIL', m); } };
  check(!(await p.$('.pdk-modal')), 'rules not shown again once seen');
  check((await p.locator('.pdk-diff').count()) === 4, 'four difficulties');
  await p.locator('.pdk-diff').nth(1).click(); await p.waitForSelector('.pgdboard');
  const cell = (r, c) => p.locator(`[data-pr="${r}"][data-pc="${c}"]`);
  await cell(0, 0).click(); check((await p.locator('.pgdx').count()) === 1, 'tap places an X');
  await p.click('text=↶ UNDO'); check((await p.locator('.pgdx').count()) === 0, 'undo removes it');
  const hintsBefore = await p.locator('.pdk-btns .btn').nth(1).innerText();
  await p.click('text=/HINT/'); check((await p.locator('.pdk-btns .btn').nth(1).innerText()) !== hintsBefore, 'hint used up one');
  check((await p.locator('.pdk-msg').innerText()).length > 20, 'hint explains itself');
  // leave and Continue
  await p.waitForTimeout(700); await p.click('text=← MENU'); await p.waitForSelector('.pdk-continue');
  check((await p.locator('.pdk-continue').innerText()).includes('EASY'), 'continue offered after leaving');
  await p.reload(); await p.waitForSelector('.pdk-continue'); check(true, '');
  await p.click('.pdk-continue'); await p.waitForSelector('.pgdboard');
  check((await p.locator('.pdk-btns .btn').nth(1).innerText()).includes('(2)'), 'saved game restored after reload (hints=2)');
  // finish with hints
  for (let i = 0; i < 2; i++) { const d = await p.locator('.pdk-btns .btn').nth(1).isDisabled(); if (!d) await p.click('text=/HINT/'); }
  // solve the rest by reading the puzzle out of the saved state
  const sol = await p.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.pugdoku.local.v1')).cloud.game.g);
  check(!!sol, 'game persisted to storage'); 
  if (sol) {
    for (let r = 0; r < sol.n; r++) { const c = sol.p[r]; if (await p.locator(`[data-pr="${r}"][data-pc="${c}"] .pgdpug`).count()) continue; await cell(r, c).click(); await p.waitForTimeout(60); await cell(r, c).click(); await p.waitForTimeout(450); }
    await p.waitForSelector('.pgdhappy', { timeout: 5000 }).catch(() => {});
    check((await p.locator('.pgdhappy').count()) === 1, 'win screen shows');
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.pugdoku.local.v1')));
    check(st.cloud.game.g === null, 'finished game cleared from save');
    check(Object.values(st.cloud.stats)[0]?.d?.easy?.w === 1, 'win recorded in stats');
    if (OUT) await p.screenshot({ path: `${OUT}/win.png` });
  }
  console.log('bad', bad, errs.length ? errs : ''); await b.close(); process.exit(bad ? 1 : 0);
})();
