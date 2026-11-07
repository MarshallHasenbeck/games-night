// Checks the Pugdoku bank: every puzzle (and its rotations/flips) has exactly ONE answer, and it matches the stored one.
// Run: npx tsx tools/tests/pugdoku-bank.ts
import { BANK } from '../../src/lib/pugdoku-bank';
import { decodePuzzle, solveAll, transformPuzzle, makePuzzle } from '../../src/lib/pugdoku';

let bad = 0, total = 0;
const seen = new Set<string>();
for (const [k, list] of Object.entries(BANK)) {
  const n = +k;
  for (const row of list) {
    total++;
    if (seen.has(row[0])) { console.log('DUPLICATE', n); bad++; }
    seen.add(row[0]);
    const pz = decodePuzzle(row, n);
    if (new Set(pz.g.flat()).size !== n) { console.log('BAD region count', n); bad++; }
    for (let t = 0; t < 8; t++) {
      const q = transformPuzzle(pz, n, t);
      const s = solveAll(n, q.g, 2);
      if (s.length !== 1 || s[0].join('') !== q.p.join('')) { console.log('BAD puzzle/transform', n, t, s.length); bad++; break; }
    }
  }
  console.log(`size ${n}: ${list.length} checked`);
}
// live builder: a few small boards must come out verified too
for (const n of [5, 6, 7]) for (let i = 0; i < 5; i++) {
  const pz = makePuzzle(n); const s = solveAll(n, pz.g, 2);
  if (s.length !== 1 || s[0].join('') !== pz.p.join('')) { console.log('BAD live puzzle', n); bad++; }
}
console.log(bad ? `PROBLEMS: ${bad}` : `ALL ${total} BANK PUZZLES (x8 orientations) + live builds VERIFIED: exactly one answer each`);
process.exit(bad ? 1 : 0);
