const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:932,height:370},isMobile:true,hasTouch:true,deviceScaleFactor:2});
await p.goto('http://localhost:4173/');await p.evaluate(()=>{localStorage.setItem('gn-time','day');localStorage.setItem('gn-rules-mancala','1');});
for(const g of ['mancala','playnine','acorn']){
await p.goto('http://localhost:4173/#'+g);await p.reload();await p.waitForTimeout(1200);
const m=()=>p.evaluate(()=>({iw:innerWidth,aw:getComputedStyle(document.documentElement).getPropertyValue('--app-w'),fit:document.documentElement.dataset.fit,overW:document.documentElement.scrollWidth-innerWidth,board:(()=>{const e=document.querySelector('.mboard,.apboard,.pnboard');const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]})()}));
console.log(g,'land',JSON.stringify(await m()));
await p.setViewportSize({width:430,height:760});await p.waitForTimeout(900);
console.log(g,'port',JSON.stringify(await m()));
await p.setViewportSize({width:932,height:370});await p.waitForTimeout(900);
console.log(g,'back',JSON.stringify(await m()));}
await b.close();})();
