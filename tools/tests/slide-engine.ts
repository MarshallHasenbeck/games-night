import { newSlide, draw, legalMoves, play, skipTurn, cpuChoose, ringOf, progOf, PEN, HOME, type SState } from '../../src/lib/slide';
// mapping sanity
for (let seat=0;seat<4;seat++) for (let q=-1;q<=58;q++){ const idx=ringOf(seat,q); const p=progOf(seat,idx); const exp=q; if(p!==exp) throw new Error(`map ${seat} ${q} ${idx} ${p}`);} 
let turns=0, wins=[0,0,0,0], stuck=0;
const cardsSeen:Record<number,number>={};
for (let g=0; g<300; g++) {
  const seats=[[0,2],[0,1,2],[0,1,2,3]][g%3];
  let s: SState = newSlide(seats); let t=0;
  while (s.winner===null && t<6000) {
    t++; s=draw(s); cardsSeen[s.card!]=(cardsSeen[s.card!]||0)+1;
    let guard=0;
    while (s.card!==null && s.winner===null && guard++<10) {
      const mv=legalMoves(s);
      if(!mv.length){ s=skipTurn(s); break; }
      const m=cpuChoose(s,mv,(1+ (g%3)) as 1|2|3);
      s=play(s,m).state;
    }
    // invariants
    for (const seat of seats){ const ring=s.pawns[seat].filter(q=>q!==PEN&&q<=58).map(q=>ringOf(seat,q)); if(new Set(ring).size!==ring.length) throw new Error('dup ring '+JSON.stringify(s.pawns)); const sf=s.pawns[seat].filter(q=>q>=59&&q<HOME); if(new Set(sf).size!==sf.length) throw new Error('dup safe'); }
  }
  if(s.winner===null){stuck++;continue;} wins[s.winner]++; turns+=t;
}
console.log({wins, stuck, avgDraws: turns/(300-stuck)});
