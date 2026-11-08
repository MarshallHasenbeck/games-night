// Grades every bank puzzle with the human-style solver: how many can be solved by pure logic, and at what level?
// Run: npx tsx tools/tests/pugdoku-logic.ts
import { BANK } from '../../src/lib/pugdoku-bank';
import { decodePuzzle } from '../../src/lib/pugdoku';
import { grade } from '../../src/lib/pugdoku-logic';

for (const [k, list] of Object.entries(BANK)) {
  const n = +k, hist: Record<string, number> = {}; let guess = 0; const t0 = Date.now();
  for (const row of list) {
    const pz = decodePuzzle(row, n), gr = grade(n, pz.g);
    if (!gr.solvable) guess++; else hist[gr.level] = (hist[gr.level] ?? 0) + 1;
  }
  console.log(`size ${n}: ${list.length} puzzles, needs guessing: ${guess}, by level:`, JSON.stringify(hist), `${Date.now() - t0}ms`);
}

// Live generator: tier-fit puzzles must come out unique, guess-free and inside their level band.
import { TIERS, buildPuzzle, pickFromBank, verified } from '../../src/lib/pugdoku-gen';
import { solveAll } from '../../src/lib/pugdoku';
let bad = 0;
for (const [d, t] of Object.entries(TIERS)) {
  const t0 = Date.now();
  for (let i = 0; i < 6; i++) {
    const pz = buildPuzzle(t), gr = grade(t.n, pz.g);
    if (!verified(pz, t.n) || solveAll(t.n, pz.g, 2).length !== 1 || !gr.solvable || gr.level < t.min || gr.level > t.max) { console.log('BAD live', d, gr); bad++; }
  }
  const pick = pickFromBank(BANK[t.n] as [string, string][], t, new Set());
  if (!pick || !verified(pick.pz, t.n)) { console.log('BAD bank pick', d); bad++; }
  console.log(`${d}: 6 live builds ok in ${Date.now() - t0}ms`);
}
console.log(bad ? `PROBLEMS: ${bad}` : 'GENERATOR OK');
process.exit(bad ? 1 : 0);
