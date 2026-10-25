const { chromium } = require('playwright');
(async () => {
  const d = process.argv[2];
  const b = await chromium.launch(); const errs = []; const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4173/'); await p.evaluate(() => { localStorage.setItem('gn-time','day'); localStorage.setItem('gn-rules-playnine','1'); localStorage.setItem('gn-opp-playnine', JSON.stringify({cpu:false})); });
  await p.goto('http://localhost:4173/#playnine'); await p.reload(); await p.waitForTimeout(2600);
  const F = (l) => l.click({ force: true });
  const turnText = () => p.textContent('.turnbar');
  const down = () => p.locator('.pgrid.turn .pcard:not(.up)').count();
  const discardTop = async () => (await p.locator('.pile').nth(2).locator('.cmid b').textContent()).trim();
  const handCard = async () => (await p.locator('.pile').nth(1).locator('.cmid b').textContent()).trim();
  const slotVals = () => p.locator('.pgrid.turn .pcard').evaluateAll(els => els.map(e => e.classList.contains('up') ? e.querySelector('.cmid b').textContent.trim() : 'X'));
  const draw = async () => { await F(p.locator('.pile').nth(0).locator('.pcard')); await p.waitForTimeout(500); };
  // setup flips
  for (let k = 0; k < 2; k++) { for (let i = 0; i < 2; i++) { await F(p.locator('.pgrid.turn .pcard.active').first()); await p.waitForTimeout(120); } }
  await p.waitForTimeout(500);
  ok(/P1/.test(await turnText()) || /P2/.test(await turnText()), 'turn banner shows a player: ' + (await turnText()).replace(/\s+/g,' '));
  console.log('   dim other hand:', await p.evaluate(() => getComputedStyle(document.querySelector('.pgrid:not(.turn)')).opacity), '| ribbon on active:', await p.evaluate(() => getComputedStyle(document.querySelector('.pgrid.turn'), '::before').content));

  // A) draw from deck, tap a FACE-DOWN card -> flips it, drawn card discarded, turn passes
  let who = await turnText(); let dn = await down(); await draw(); let hv = await handCard();
  ok(/PLACE YOUR CARD/.test(await p.textContent('.prompt')) && (await p.locator('.choice2 .btn').count()) >= 1 && !(await p.locator('.choice2 .btn', { hasText: 'USE IT' }).count()), 'default mode place-it, single DISCARD & FLIP button, no USE button');
  await F(p.locator('.choice2 .btn', { hasText: 'FLIP' })); await p.waitForTimeout(200);
  ok(/FLIP IT/.test(await p.textContent('.prompt')), 'DISCARD & FLIP mode prompt');
  await F(p.locator('.choice2 .btn', { hasText: 'CANCEL' })); await p.waitForTimeout(200);
  ok(/PLACE YOUR CARD/.test(await p.textContent('.prompt')), 'can switch back (nothing is stuck equipped)');
  await F(p.locator('.choice2 .btn', { hasText: 'FLIP' })); await p.waitForTimeout(200);
  await F(p.locator('.pgrid.turn .pcard.active.m-flip').first()); await p.waitForTimeout(600);
  ok((await discardTop()) === hv, `A) drawn ${hv} went to discard (top = ${await discardTop()})`);
  ok((await turnText()) !== who, 'A) turn passed to the other player');
  // B) draw, tap a FACE-UP card -> swap
  who = await turnText(); await draw(); hv = await handCard();
  const before = await slotVals(); const upIdx = before.findIndex(v => v !== 'X');
  await F(p.locator('.pgrid.turn .pcard.active.m-swap').first()); await p.waitForTimeout(600);
  ok((await discardTop()) === before[upIdx], `B) swapped: old face-up ${before[upIdx]} to discard (top = ${await discardTop()})`);
  // C) USE IT (default): tap a face-down spot places the drawn card there
  who = await turnText(); await draw(); hv = await handCard(); const b2 = await slotVals();
  const hidden = b2.findIndex(v => v === 'X');
  await F(p.locator('.pgrid.turn .pcard').nth(hidden)); await p.waitForTimeout(600);
  ok((await turnText()) !== who, 'C) placed on a face-down spot and turn passed');
  // D) take discard, then tap discard again to put back
  who = await turnText(); const topBefore = await discardTop();
  await F(p.locator('.pile').nth(2).locator('.pcard')); await p.waitForTimeout(500);
  ok(/TAP A CARD TO SWAP IT IN/.test(await p.textContent('.prompt')) && (await handCard()) === topBefore, 'D) took the discard, must place it');
  await F(p.locator('.pile').nth(2).locator('.pcard')); await p.waitForTimeout(500);
  ok(/STEP 1/.test(await p.textContent('.prompt')) && (await discardTop()) === topBefore, 'D) tapping the discard pile put it back (no button)');
  // play on (flip path) until someone has exactly one face-down card, then check automatic SKIP
  let sawSkip = false, skipped = false;
  for (let t = 0; t < 40 && !skipped; t++) {
    const n = await down();
    await draw(); { const fb = p.locator('.choice2 .btn', { hasText: 'FLIP' }); if (await fb.count()) await F(fb); }
    if (n === 1) {
      sawSkip = (await p.locator('.skipbtn').count()) === 1;
      ok(sawSkip, 'E) SKIP button appears automatically on the last card');
      who = await turnText(); await F(p.locator('.skipbtn')); await p.waitForTimeout(600);
      ok((await turnText()) !== who && (await p.locator('.pgrid:not(.turn)').first().evaluate(e => e.querySelectorAll('.pcard:not(.up)').length)) >= 0, 'E) skip passed the turn');
      skipped = true; break;
    }
    await F(p.locator('.pgrid.turn .pcard.active.m-flip').first()); await p.waitForTimeout(450);
  }
  // finish the hole: keep flipping last cards
  for (let t = 0; t < 60; t++) {
    if (await p.locator('.holedone').count()) break;
    if ((await p.locator('.pile').count()) === 0) break;
    const act = await p.locator('.pile').nth(0).locator('.pcard.active').count();
    if (act) { await draw(); { const fb = p.locator('.choice2 .btn', { hasText: 'FLIP' }); if (await fb.count()) await F(fb); } }
    const flip = p.locator('.pgrid.turn .pcard.active.m-flip');
    if (await flip.count()) { await F(flip.first()); await p.waitForTimeout(450); }
    else { const sw = p.locator('.pgrid.turn .pcard.active.m-swap'); if (await sw.count()) { await F(sw.first()); await p.waitForTimeout(450); } }
  }
  ok((await p.locator('.holedone').count()) === 1, 'F) hole over: NEXT HOLE panel is in the centre (.pnmid .holedone): ' + (await p.locator('.pnmid .holedone').count()));
  const box = await p.evaluate(() => { const h = document.querySelector('.holedone').getBoundingClientRect(), b = document.querySelector('.pnboard').getBoundingClientRect(); return { hx: Math.round(h.x + h.width / 2), bx: Math.round(b.x + b.width / 2) }; });
  ok(Math.abs(box.hx - box.bx) < 40, `F) button is horizontally centred (button ${box.hx}px vs table centre ${box.bx}px)`);
  await p.screenshot({ path: d + '/flow_holeover.png' });
  await F(p.locator('.holedone .btn')); await p.waitForTimeout(900);
  ok(/HOLE 2 OF 9/.test(await turnText()), 'F) NEXT HOLE starts hole 2');
  // G) new game needs confirmation
  await F(p.locator('.newgame')); await p.waitForTimeout(300);
  ok((await p.locator('.celebrate .banner h2').textContent()).includes('NEW GAME'), 'G) NEW GAME asks for confirmation');
  await F(p.getByText('KEEP PLAYING')); await p.waitForTimeout(300);
  ok((await p.locator('.celebrate').count()) === 0 && /HOLE 2 OF 9/.test(await turnText()), 'G) KEEP PLAYING dismisses it and the game continues');
  console.log('errors:', errs); await b.close();
})();
