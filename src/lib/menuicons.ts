// @ts-nocheck
/**
 * Menu icons for the games (not Pug Patch, which keeps its own pug picture).
 * Drawn smooth with outlines and shading, then pixelated to 56 across - the "E" look approved in the 2026-11-16 mockups.
 * (The chunkier 44-across "F" look is the same drawing with N = 44, L = 40: change those two numbers to switch.)
 * Generated on first use and cached; nothing is checked in as an image.
 */
const N = 56, L = 36;
const O='#24140a';
function G(ctx,x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));return g}
function shape(ctx,fn,fill,lw=3.2){ctx.beginPath();fn(ctx);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=O;ctx.stroke()}
function rr(c,x,y,w,h,r){c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function circ(c,x,y,r){c.moveTo(x+r,y);c.arc(x,y,r,0,Math.PI*2)}
let SH=[];function shadow(ctx,x,y,rx,ry,a=.3){SH.push([x,y,rx,ry])}
function gloss(ctx,fn,a=.55){ctx.beginPath();fn(ctx);ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fill()}
const IV=['#fffae4','#ecdfb2','#c4ad78'],RD=['#ff7d8e','#d4475a','#8f1d33'],GD=['#fff0a0','#f5c443','#c98a10'],BL=['#9ed4f6','#3b86cc','#1f4f8a'],WD=['#d9a566','#a56f35','#5b3716'],GR=['#b4ec80','#56ad3e','#2a6d2b'];
const icons={};
icons.Chess=c=>{shadow(c,48,88,30,4);
 shape(c,x=>rr(x,20,82,56,8,3),G(c,0,82,0,90,[IV[0],IV[2]]));
 shape(c,x=>rr(x,25,75,46,9,3),G(c,0,75,0,84,[IV[0],IV[2]]));
 shape(c,x=>{x.moveTo(29,76);x.bezierCurveTo(29,68,36,62,38,54);x.bezierCurveTo(32,55,26,54,20,50);x.bezierCurveTo(14,47,10,43,12,39);x.bezierCurveTo(16,35,25,28,30,22);x.lineTo(32,8);x.lineTo(40,17);x.bezierCurveTo(50,14,62,20,67,34);x.bezierCurveTo(74,48,74,64,71,76);x.closePath()},G(c,16,10,72,78,IV));
 // flowing mane
 c.strokeStyle='#9a8250';c.lineWidth=3.2;c.lineCap='round';[[42,19,58,26,66,36],[44,27,60,34,68,48],[46,37,62,44,70,60],[46,48,60,54,70,70]].forEach(([a,b,d,e,f,g])=>{c.beginPath();c.moveTo(a,b);c.quadraticCurveTo(d,e,f,g);c.stroke()});
 shape(c,x=>{x.moveTo(33,12);x.lineTo(34,21);x.lineTo(38,19);x.closePath()},RD[1],1.4);
 c.fillStyle=O;c.beginPath();c.ellipse(31,32,2.4,2.7,0,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(31.8,31.2,.9,0,7);c.fill();
 c.fillStyle=O;c.beginPath();c.ellipse(13.6,42,1.6,2.4,.5,0,7);c.fill();
 c.strokeStyle='#9a8250';c.lineWidth=2;c.beginPath();c.moveTo(14,47);c.quadraticCurveTo(24,52,34,51);c.stroke();
 c.beginPath();c.moveTo(34,38);c.quadraticCurveTo(38,44,37,52);c.stroke();
 gloss(c,x=>{x.moveTo(16,38);x.quadraticCurveTo(24,31,29,24);x.quadraticCurveTo(24,32,18,41)},.7);
 gloss(c,x=>rr(x,24,77,40,2,1),.7)};
icons.Checkers=c=>{shadow(c,48,86,32,5);
 function piece(cx,cy,P,ring){shape(c,x=>{x.ellipse(cx,cy+8,26,13,0,0,7)},G(c,0,cy,0,cy+20,[P[1],P[2]]));
  c.fillStyle=G(c,0,cy,0,cy+8,[P[1],P[2]]);c.fillRect(cx-26,cy-2,52,10);
  shape(c,x=>{x.ellipse(cx,cy,26,13,0,0,7)},G(c,cx-20,cy-14,cx+20,cy+10,[P[0],P[1]]));
  c.strokeStyle=ring;c.lineWidth=2.4;c.beginPath();c.ellipse(cx,cy,17,8,0,0,7);c.stroke();
  gloss(c,x=>x.ellipse(cx-9,cy-6,7,2.4,-.3,0,7),.6)}
 piece(54,40,['#fffae4','#e3d3a2','#a99566'],'#b29a64');piece(44,58,RD,'#8f1d33')};
icons.DropFour=c=>{shadow(c,48,90,36,3);
 shape(c,x=>rr(x,9,9,78,78,10),G(c,0,9,0,87,[WD[0],WD[1],WD[2]]),3.4);
 const Y=GR,R=['#ffc4e2','#f08ab4','#c0587f'],grid={'0,3':'Y','1,3':'R','1,2':'Y','2,3':'R','2,2':'R','2,1':'Y','3,3':'R','3,2':'R','3,1':'R','3,0':'Y'};
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){const x=24+i*16,y=24+j*16,k=grid[i+','+j];
  shape(c,t=>circ(t,x,y,6.6),k?G(c,x-6,y-6,x+6,y+6,k==='Y'?Y:R):'#2a1608',2.2);
  if(k){c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1.4;c.beginPath();c.arc(x,y,3.6,0,7);c.stroke();gloss(c,t=>t.ellipse(x-2.2,y-2.6,2,1.2,-.5,0,7),.6)}}
 c.strokeStyle='#fff6d8';c.lineWidth=2.4;c.setLineDash([2,3.5]);c.beginPath();c.moveTo(24,72);c.lineTo(72,24);c.stroke();c.setLineDash([])};
icons['Dice Harvest']=c=>{shadow(c,48,90,32,4);
 const face=(pts,fill)=>shape(c,x=>{x.moveTo(...pts[0]);pts.slice(1).forEach(p=>x.lineTo(...p));x.closePath()},fill,3);
 face([[48,8],[84,28],[48,48],[12,28]],G(c,12,8,84,48,[IV[0],IV[1]]));
 face([[12,28],[48,48],[48,90],[12,70]],G(c,12,30,48,90,[IV[1],IV[2]]));
 face([[48,48],[84,28],[84,70],[48,90]],G(c,48,48,84,90,['#d8c78e','#a89160']));
 const pips=(o,u,v,pts)=>{pts.forEach(([a,b])=>{c.save();c.setTransform(2*u[0],2*u[1],2*v[0],2*v[1],2*o[0]+2*(u[0]*a+v[0]*b),2*o[1]+2*(u[1]*a+v[1]*b));c.fillStyle='#8f1d33';c.beginPath();c.arc(0,0,.1,0,7);c.fill();c.restore()})};
 const P=(o,u,v,pts,col='#8f1d33')=>pts.forEach(([a,b])=>{const x=o[0]+u[0]*a+v[0]*b,y=o[1]+u[1]*a+v[1]*b;c.save();c.translate(x,y);c.transform(u[0]/36,u[1]/36,v[0]/36,v[1]/36,0,0);c.fillStyle=col;c.beginPath();c.arc(0,0,4.2,0,7);c.fill();c.restore()});
 P([12,28],[36,-20],[36,20],[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([a,b])=>[a,b]));
 P([12,28],[36,20],[0,42],[[.28,.28],[.72,.72]],'#8f1d33');
 P([48,48],[36,-20],[0,42],[[.25,.25],[.5,.5],[.75,.75]],'#8f1d33')};
icons['Fairway']=c=>{shadow(c,48,88,34,4);
 shape(c,x=>x.ellipse(48,74,38,15,0,0,7),G(c,0,60,0,90,[GR[0],GR[1],GR[2]]));
 c.fillStyle='#15210f';c.beginPath();c.ellipse(52,72,9,3.6,0,0,7);c.fill();
 shape(c,x=>rr(x,51,12,3.6,60,1.5),G(c,51,0,55,0,['#fff','#8c95a1']),2);
 shape(c,x=>{x.moveTo(55,12);x.lineTo(80,20);x.lineTo(55,30);x.closePath()},G(c,55,12,80,30,RD),2.6);
 shape(c,x=>circ(x,32,73,4.6),G(c,29,70,36,77,['#fff','#c9c2ae']),2.2)};
icons.Palace=c=>{shadow(c,48,90,32,3);
 function card(rot,rank,col){c.save();c.translate(48,86);c.rotate(rot*Math.PI/180);
  shape(c,x=>rr(x,-19,-62,38,56*1.1,5),G(c,-19,-62,19,0,IV),2.6);
  c.strokeStyle=col;c.lineWidth=1.6;c.beginPath();rr(c,-15,-58,30,53.6,3);c.stroke();
  c.fillStyle=col;c.font="700 11px 'Pixelify Sans',monospace";c.textAlign='left';c.fillText(rank,-13,-48);
  c.beginPath();c.moveTo(0,-47);c.bezierCurveTo(11,-40,11,-27,0,-18);c.bezierCurveTo(-11,-27,-11,-40,0,-47);c.fillStyle=col;c.fill();c.strokeStyle='#5b3716';c.lineWidth=1.6;c.beginPath();c.moveTo(0,-18);c.lineTo(0,-12);c.stroke();
  c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.2;c.beginPath();c.moveTo(-4,-40);c.quadraticCurveTo(-5,-33,-2,-28);c.stroke();c.restore()}
 card(-24,'8','#2a6d8f');card(24,'10','#2a6d8f');card(0,'A','#c8283f')};
icons.Backgammon=c=>{shadow(c,48,88,38,3);
 shape(c,x=>rr(x,6,16,84,66,8),G(c,0,16,0,82,WD),3.4);
 shape(c,x=>rr(x,12,22,72,54,3),G(c,0,22,0,76,['#2c7a52','#1d5a3c']),2);
 const pts=[[12,'#ead6a0'],[30,'#7a4a24'],[48,'#ead6a0'],[66,'#7a4a24']];
 pts.forEach(([x0,col],i)=>{c.beginPath();c.moveTo(x0+1,22);c.lineTo(x0+17,22);c.lineTo(x0+9,46);c.closePath();c.fillStyle=i%2?'#ead6a0':'#7a4a24';c.fill();
  c.beginPath();c.moveTo(x0+1,76);c.lineTo(x0+17,76);c.lineTo(x0+9,52);c.closePath();c.fillStyle=col;c.fill()});
 const chk=(x,y,P)=>{shape(c,t=>circ(t,x,y,6.4),G(c,x-6,y-6,x+6,y+6,P),2.4);c.strokeStyle='rgba(0,0,0,.22)';c.lineWidth=1.3;c.beginPath();c.arc(x,y,3.8,0,7);c.stroke()};
 [66,57.5,49].forEach(y=>chk(21,y,RD));[68,59].forEach(y=>chk(57,y,['#fff','#e9e2cc','#b7ad8c']));
 [30,38.5].forEach(y=>chk(39,y,['#fff','#e9e2cc','#b7ad8c']));[30,38.5,47].forEach(y=>chk(75,y,RD))};
icons.Mancala=c=>{shadow(c,48,82,40,3);
 shape(c,x=>rr(x,5,26,86,48,22),G(c,0,26,0,74,WD),3.4);
 shape(c,x=>x.ellipse(21,50,11,17,0,0,7),G(c,10,34,32,66,['#3a2410','#6b4424']),2.4);shape(c,x=>x.ellipse(75,50,11,17,0,0,7),G(c,64,34,86,66,['#3a2410','#6b4424']),2.4);
 for(let i=0;i<3;i++)for(let j=0;j<2;j++)shape(c,x=>circ(x,36+i*12,41+j*17,5.6),G(c,0,0,0,10,['#2c1a0b','#5b3716']),2);
 const st=(x,y,k)=>{c.beginPath();c.arc(x,y,2.5,0,7);c.fillStyle=k?'#8fd3ee':'#fff4d6';c.fill();c.lineWidth=1;c.strokeStyle=O;c.stroke()};
 [[34,40,0],[38,42,1],[36,45,0],[48,40,1],[46,43,0],[60,59,1],[62,57,0],[24,46,0],[20,52,1],[23,56,0],[75,46,1],[72,52,0],[77,55,1],[47,58,0],[50,60,1],[36,59,1],[60,41,0]].forEach(a=>st(...a))};
icons['Pond Patrol']=c=>{shadow(c,48,90,36,3);
 shape(c,x=>{x.moveTo(8,50);x.lineTo(88,50);x.lineTo(78,72);x.lineTo(18,72);x.closePath()},G(c,0,50,0,72,['#cfd6de','#8c95a1','#5f6772']),3.2);
 c.fillStyle='#d4475a';c.fillRect(9,50,78,5);c.strokeStyle=O;c.lineWidth=1.6;c.strokeRect(9,50,78,5);
 shape(c,x=>rr(x,30,32,36,18,3),G(c,0,32,0,50,IV),3);[36,48,58].forEach(x=>{shape(c,t=>rr(t,x-2,37,7,6,1.5),BL[0],1.6)});
 shape(c,x=>rr(x,42,16,12,16,2),G(c,42,0,54,0,RD),2.6);
 c.strokeStyle=O;c.lineWidth=2;c.beginPath();c.moveTo(74,22);c.lineTo(74,50);c.stroke();shape(c,x=>{x.moveTo(74,22);x.lineTo(87,27);x.lineTo(74,32);x.closePath()},GD[1],2);
 shape(c,x=>{x.moveTo(0,70);for(let i=0;i<=96;i+=2)x.lineTo(i,70+Math.sin(i*.28)*2.4);x.lineTo(96,92);x.lineTo(0,92);x.closePath()},G(c,0,70,0,92,['#74b8f0','#2f6fb0','#1f4f8a']),3);
 c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1.6;c.beginPath();for(let i=0;i<=96;i+=2)c.lineTo(i,72+Math.sin(i*.28)*2.4);c.stroke()};
icons['Acorn Pop']=c=>{shadow(c,50,90,38,4);
 shape(c,x=>rr(x,10,40,38,38,7),G(c,10,40,48,78,IV),3.2);[[22,52],[36,52],[29,59],[22,66],[36,66]].forEach(([x,y])=>{c.fillStyle='#8f1d33';c.beginPath();c.arc(x,y,2.8,0,7);c.fill()});
 gloss(c,x=>rr(x,14,43,18,3,1.5),.6);
 c.save();c.translate(68,52);
 shape(c,x=>x.ellipse(0,12,15,18,0,0,7),G(c,-14,-6,14,28,['#efc387','#cf9552','#8a5527']),3);
 shape(c,x=>{x.ellipse(0,-4,17,12,0,Math.PI,0,false);x.closePath()},G(c,-16,-16,16,4,['#a96d33','#6b3f1a']),3);
 c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1.2;[-10,-3,4,11].forEach(x=>{c.beginPath();c.moveTo(x,-12);c.lineTo(x+4,-3);c.stroke()});
 shape(c,x=>rr(x,-2,-22,4.4,9,1.5),'#6b3f1a',2);gloss(c,x=>x.ellipse(-6,12,2.6,6,.2,0,7),.5);c.restore()};
function mush(c,x,y,s,cap,rot){c.save();c.translate(x,y);c.rotate(rot*Math.PI/180);c.scale(s,s);
 shape(c,t=>rr(t,-7,-2,14,20,6),G(c,-7,0,7,0,[IV[0],IV[1],IV[2]]),3.4);
 shape(c,t=>{t.ellipse(0,0,19,17,0,Math.PI,0,false);t.closePath()},G(c,-19,-17,19,2,cap),3.4);
 [[-9,-8,3.4],[4,-11,3.8],[11,-4,2.6]].forEach(([a,b,r])=>{c.beginPath();c.arc(a,b,r,0,7);c.fillStyle='#fffae4';c.fill()});c.restore()}
icons['Slide & Swap']=c=>{shadow(c,40,90,34,3);
 shape(c,x=>rr(x,6,68,30,22,5),G(c,0,68,0,90,GR),3);shape(c,x=>rr(x,36,68,30,22,5),G(c,0,68,0,90,GD),3);shape(c,x=>rr(x,66,68,26,22,5),G(c,0,68,0,90,RD),3);
 mush(c,51,70,.95,RD,0);
 // bumped piece flying away
 c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=2.4;c.setLineDash([3,4]);c.beginPath();c.moveTo(60,50);c.quadraticCurveTo(70,24,82,24);c.stroke();c.setLineDash([]);
 mush(c,80,28,.62,BL,28);
 shape(c,x=>{for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?5:10;x.lineTo(66+Math.cos(a)*r,44+Math.sin(a)*r)}x.closePath()},GD[1],2.2)};
icons.Dominoes=c=>{shadow(c,48,90,34,3);
 function tile(rot,top,bot,x0,y0){c.save();c.translate(x0,y0);c.rotate(rot*Math.PI/180);
  shape(c,x=>rr(x,-17,-34,34,68,6),G(c,-17,-34,17,34,IV),3.2);
  c.strokeStyle='#8a7a52';c.lineWidth=2;c.beginPath();c.moveTo(-12,0);c.lineTo(12,0);c.stroke();
  const pp={1:[[0,0]],2:[[-7,-6],[7,6]],3:[[-7,-7],[0,0],[7,7]],5:[[-7,-7],[7,-7],[0,0],[-7,7],[7,7]],6:[[-6,-8],[6,-8],[-6,0],[6,0],[-6,8],[6,8]]};
  const dr=(arr,oy)=>arr.forEach(([a,b])=>{c.beginPath();c.arc(a*.85,oy+b*.85,2.8,0,7);c.fillStyle='#2b1a0e';c.fill();c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.arc(a*.85-.8,oy+b*.85-.9,.9,0,7);c.fill()});
  dr(pp[top],-17);dr(pp[bot],17);c.restore()}
 tile(-16,3,5,34,50);tile(16,6,2,62,48)};

const cache = new Map<string, string>();
export function menuIcon(name: string): string {
  const hit = cache.get(name); if (hit) return hit;
  SH = [];
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const x = cv.getContext('2d')!; x.scale(N / 96, N / 96); icons[name](x);
  const im = x.getImageData(0, 0, N, N), d = im.data, k = N / 96;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % N, py = Math.floor(i / 4 / N);
    if (d[i + 3] >= 120) { d[i + 3] = 255; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, Math.round(d[i + j] / L) * L); }
    else { d[i + 3] = 0; for (const [sx, sy, rx, ry] of SH) { const nx = (px + .5 - sx * k) / (rx * k), ny = (py + .5 - sy * k) / (ry * k); if (nx * nx + ny * ny <= 1) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 75; } } }
  }
  x.putImageData(im, 0, 0);
  const big = document.createElement('canvas'); big.width = big.height = N * 4;
  const b = big.getContext('2d')!; b.imageSmoothingEnabled = false; b.drawImage(cv, 0, 0, N * 4, N * 4);
  const url = big.toDataURL('image/png'); cache.set(name, url); return url;
}
