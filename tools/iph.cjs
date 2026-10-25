const { chromium } = require('playwright');
const SIZES = [[390,664,'iPhone 14 Safari'],[375,553,'iPhone SE Safari'],[430,740,'Pro Max Safari'],[393,660,'iPhone 15 Safari'],[844,340,'iPhone 14 land'],[932,360,'Pro Max land'],[667,320,'SE land']];
const GAMES=['chess','checkers','connect4','yahtzee','playnine','backgammon','dominoes','mancala','battleship','acorn','slide'];
(async () => {
  const b = await chromium.launch(); const errs=[]; let bad=0;
  for (const [vw,vh,name] of SIZES) {
    const mob = vw < 700 || vh < 460;
    const p = await b.newPage({ viewport: { width: vw, height: vh }, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
    p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:4173/');
    await p.evaluate((G)=>{ localStorage.setItem('gn-time','day'); G.forEach(g=>{localStorage.setItem('gn-rules-'+g,'1'); localStorage.setItem('gn-opp-'+g, JSON.stringify({cpu:false}));}); },GAMES);
    const row=[];
    for (const g of GAMES) {
      await p.goto('http://localhost:4173/#'+g); await p.reload(); await p.waitForTimeout(900);
      const r = await p.evaluate(()=>{ const sh=document.querySelector('.shell'); const m=sh.style.transform.match(/scale\(([\d.]+)/); return { over: document.documentElement.scrollHeight-innerHeight, scale: m? +(+m[1]).toFixed(2):1, w: document.documentElement.scrollWidth-innerWidth }; });
      if (r.over>1 || r.w>1) bad++;
      row.push(`${g.slice(0,5)}:${r.over>1?'SCROLL+'+r.over:'ok'}${r.scale<1?'@'+r.scale:''}${r.w>1?' W+'+r.w:''}`);
    }
    console.log(name.padEnd(18), vw+'x'+vh, row.join(' '));
    await p.close();
  }
  console.log('bad',bad,errs); await b.close();
})();
