// Writes snapshot/bank-grades.json: for every bank puzzle, the logic solver's result. A Swift port should reproduce these exactly.
// Format: { "<n>": [[bankIndex, level, steps, [count at level 1..5]], ...] }.   Run: npx tsx tests/snapshot.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { BANK } from '../src/pugdoku-bank';
import { decodePuzzle } from '../src/pugdoku';
import { grade } from '../src/pugdoku-logic';
const out: Record<string, number[][]> = {};
for (const [k, list] of Object.entries(BANK)) {
  const n = +k;
  out[k] = list.map((row, i) => { const gr = grade(n, decodePuzzle(row, n).g); return [i, gr.solvable ? gr.level : 0, gr.steps, ...gr.counts.slice(1)]; });
}
mkdirSync('snapshot', { recursive: true });
writeFileSync('snapshot/bank-grades.json', JSON.stringify(out));
console.log('wrote snapshot/bank-grades.json');
