import { RING_RC, safeRC, homeRC, penRC } from '../../src/lib/slide';
const used=new Map<string,string>(); let bad=0;
const add=(rc:[number,number],n:string)=>{const k=rc.join(',');if(used.has(k)){console.log('overlap',n,used.get(k));bad++}used.set(k,n)};
RING_RC.forEach((rc,i)=>add(rc,'ring'+i));
for(let s=0;s<4;s++){for(let i=0;i<5;i++)add(safeRC(s,i),`s${s}safe${i}`);for(let i=0;i<4;i++){add(homeRC(s,i),`s${s}home${i}`);add(penRC(s,i),`s${s}pen${i}`);}}
console.log('bad',bad,'cells',used.size);
// ring adjacency
for(let i=0;i<60;i++){const a=RING_RC[i],b=RING_RC[(i+1)%60];if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)console.log('gap at',i,a,b);}
// entrance adjacency: safe[0] adjacent to ring entrance idx 15s+2
for(let s=0;s<4;s++){const e=RING_RC[15*s+2],f=safeRC(s,0);console.log('seat',s,'entrance',e,'first safe',f);}
