const { chromium } = require('playwright');
const SIZES = [[1376,900,'13in Safari land'],[1376,1032,'13in full land'],[1032,1250,'13in portrait'],[1180,740,'11in Safari land'],[1180,820,'11in land'],[820,1180,'11in portrait'],[820,1060,'11in portrait Safari'],[390,844,'phone p'],[844,390,'phone l']];
(async () => {
  const b = await chromium.launch(); const errs=[];
  for (const [vw,vh,name] of SIZES) {
    const mob = vw < 700 || vh < 460;
    const p = await b.newPage({ viewport: { width: vw, height: vh }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:4173/'); await p.evaluate(()=>{ localStorage.setItem('gn-time','day'); localStorage.setItem('gn-rules-playnine','1'); localStorage.setItem('gn-opp-playnine', JSON.stringify({cpu:false})); });
    await p.goto('http://localhost:4173/#playnine'); await p.reload(); await p.waitForTimeout(2600);
    for (let k=0;k<2;k++){ for (let i=0;i<2;i++){ await p.locator('.pgrid.turn .pcard.active').first().click({force:true}); await p.waitForTimeout(100);} }
    await p.waitForTimeout(600);
    const snap = () => p.evaluate(()=>{ const r=(s,n=0)=>{const e=document.querySelectorAll(s)[n]; const b=e.getBoundingClientRect(); return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]}; 
      let minLeft = 1e9, maxRight = 0; document.querySelectorAll('.pgrid, .pnmid, .holestrip, .head').forEach(e=>{const b=e.getBoundingClientRect(); if(b.width>0){minLeft=Math.min(minLeft,b.left); maxRight=Math.max(maxRight,b.right);}});
      return { p1:r('.pgrid',0), p2:r('.pgrid',1), mid:r('.pnmid'), prompt:r('.prompt'), foot:r('.foot'), minLeft:Math.round(minLeft), maxRight:Math.round(maxRight), iw: innerWidth, over: document.documentElement.scrollHeight-innerHeight, cw: Math.round(document.querySelector('.pcard:not(.small)').getBoundingClientRect().width) }; });
    const A = await snap();                                   // step 1 (draw)
    await p.locator('.pile').nth(0).locator('.pcard').click({force:true}); await p.waitForTimeout(700);
    const B = await snap();                                   // step 2 (card drawn: extra card + choice row)
    const same = JSON.stringify([A.p1,A.p2,A.mid,A.prompt,A.foot]) === JSON.stringify([B.p1,B.p2,B.mid,B.prompt,B.foot]);
    console.log(`${name.padEnd(22)} ${vw}x${vh}  cardW=${A.cw}  layout identical after draw: ${same}  clipped-left:${A.minLeft<0?'YES '+A.minLeft:'no'}  clipped-right:${A.maxRight>A.iw+1?'YES':'no'}  scroll:+${B.over}`);
    if (!same) console.log('   before', JSON.stringify([A.p1,A.mid,A.prompt]), '\n   after ', JSON.stringify([B.p1,B.mid,B.prompt]));
    if (name==='13in Safari land'||name==='11in portrait'||name==='phone p') await p.screenshot({ path: `${process.argv[2]}/stab_${name.replace(/ /g,'_')}.png` });
    await p.close();
  }
  console.log(errs); await b.close();
})();
