import { gridScore, deal } from '../../src/lib/playnine';
let bad=0, neg=0, bothNeg=0;
const ref=(v:number[])=>{let t=0;const m:Record<number,number>={};for(let c=0;c<4;c++){const a=v[c],b=v[c+4];if(a===b){if(a===-5)t-=10;m[a]=(m[a]||0)+1}else t+=a+b}for(const k in m)if(m[k]>=2)t-=5*m[k];return t};
for(let i=0;i<50000;i++){const r=deal(0);const s=r.grids.map(g=>gridScore(g,false));const rr=r.grids.map(g=>ref(g.map(x=>x.v)));if(s[0]!==rr[0]||s[1]!==rr[1])bad++;if(s[0]<0)neg++;if(s[0]<0&&s[1]<0)bothNeg++;}
console.log({bad,neg,bothNeg});
