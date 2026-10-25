const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:932,height:370},isMobile:true,hasTouch:true,deviceScaleFactor:2});
await p.goto('http://localhost:4173/');await p.evaluate(()=>{localStorage.setItem('gn-time','day');localStorage.setItem('gn-rules-mancala','1');});
await p.goto('http://localhost:4173/#mancala');await p.reload();await p.waitForTimeout(1200);
await p.evaluate(()=>{Object.defineProperty(window,'innerWidth',{get:()=>932,configurable:true});Object.defineProperty(window,'innerHeight',{get:()=>370,configurable:true});});
await p.setViewportSize({width:430,height:760});await p.waitForTimeout(1200);
console.log(await p.evaluate(()=>({inner:[innerWidth,innerHeight],appw:getComputedStyle(document.documentElement).getPropertyValue('--app-w'),apph:getComputedStyle(document.documentElement).getPropertyValue('--app-h'),fit:document.documentElement.dataset.fit,over:document.documentElement.scrollWidth-430,board:(()=>{const r=document.querySelector('.mboard').getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]})()})));
await p.screenshot({path:process.argv[2]+'/stale.png'});await b.close();})();
