const { chromium } = require('playwright');
const SIZES = [[1376,900,'13 Safari land'],[1376,1032,'13 land'],[1032,1250,'13 port'],[1032,1100,'13 port safari'],[1180,740,'11 Safari land'],[1180,820,'11 land'],[820,1180,'11 port'],[820,1060,'11 port safari'],[390,844,'phone p'],[844,390,'phone l'],[1024,700,'ipad9 land short']];
const GAMES=['chess','checkers','connect4','yahtzee','playnine','backgammon','dominoes','mancala','battleship'];
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
