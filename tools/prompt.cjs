const { chromium } = require('playwright');
const SIZES=[[1376,900],[1376,1032],[1032,1250],[1180,740],[820,1180],[1024,700],[390,844],[844,390]];
(async()=>{const b=await chromium.launch();let bad=0;
for(const [vw,vh] of SIZES){const mob=vw<700||vh<460;const p=await b.newPage({viewport:{width:vw,height:vh},isMobile:mob,hasTouch:mob});
await p.goto('http://localhost:4173/');await p.evaluate(()=>{localStorage.setItem('gn-time','day');localStorage.setItem('gn-rules-playnine','1');localStorage.setItem('gn-opp-playnine',JSON.stringify({cpu:false}));});
await p.goto('http://localhost:4173/#playnine');await p.reload();await p.waitForTimeout(2200);
for(let i=0;i<2;i++)for(let k=0;k<2;k++){await p.locator('.pgrid.turn .pcard.active').first().click({force:true});await p.waitForTimeout(100);}
await p.waitForTimeout(600);
const snap=()=>p.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]};return {pr:r('.prompt'),p1:r('.pgrid'),foot:r('.foot'),sy:scrollY,over:document.documentElement.scrollHeight-innerHeight,lines:Math.round(document.querySelector('.prompt').getBoundingClientRect().height)}});
const A=await snap();
await p.locator('.pile').nth(2).locator('.pcard').click({force:true});await p.waitForTimeout(600);const B=await snap();
await p.locator('.pile').nth(2).locator('.pcard').click({force:true});await p.waitForTimeout(500);
await p.locator('.pile').nth(0).locator('.pcard').click({force:true});await p.waitForTimeout(600);const C=await snap();
await p.locator('.choice2 .btn',{hasText:'FLIP'}).click({force:true});await p.waitForTimeout(400);const D=await snap();
const same=[B,C,D].every(x=>JSON.stringify([x.pr,x.p1,x.foot])===JSON.stringify([A.pr,A.p1,A.foot]));
if(!same||A.sy||A.over>1)bad++;
console.log(vw+'x'+vh,'same:',same,'scrollY',A.sy,'over',A.over,'promptH',A.pr[3]);
if(!same)console.log(JSON.stringify([A.pr,A.p1,A.foot]),'\n',JSON.stringify([B.pr,B.p1,B.foot]),'\n',JSON.stringify([C.pr,C.p1,C.foot]),'\n',JSON.stringify([D.pr,D.p1,D.foot]));
await p.close();}
console.log('bad',bad);await b.close();})();
