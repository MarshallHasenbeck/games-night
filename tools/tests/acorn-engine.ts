import { newAcorn, legalMoves, applyMove, noMove, cpuMove, type AState } from '../../src/lib/acorn';
let wins=[0,0,0,0], turns=0, maxT=0;
for (let g=0; g<400; g++) {
  const seats = [[0,2],[0,1,2],[0,1,2,3]][g%3];
  let s: AState = newAcorn(seats); let t=0;
  while (s.winner===null && t<20000) {
    t++; const die=1+Math.floor(Math.random()*6);
    const mv = legalMoves(s, die);
    if (!mv.length) { s = noMove({...s, roll: die}); continue; }
    const m = cpuMove(s, die, mv, (s.turn%2? 3:2) as 2|3);
    // invariants
    s = applyMove(s, m, die).state;
    for (const seat of seats) { const p=s.pegs[seat].filter(x=>x>=32); if (new Set(p).size!==p.length) throw new Error('dup home'); const r=s.pegs[seat].filter(x=>x>=0&&x<32); if(new Set(r).size!==r.length) throw new Error('dup ring'); }
  }
  if (s.winner===null) throw new Error('no winner in '+t); wins[s.winner]++; turns+=t; maxT=Math.max(maxT,t);
}
console.log({wins, avgTurns: turns/400, maxT});
