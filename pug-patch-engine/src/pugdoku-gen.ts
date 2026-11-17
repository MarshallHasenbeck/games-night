/** Puzzle supply for the Pugdoku app: what "easy / medium / hard / relaxed" mean, and how a puzzle is judged fit to play.
 *  A puzzle is fit when (a) it has exactly ONE answer and (b) the deduction solver can finish it without guessing,
 *  with its hardest needed technique inside the tier's level band (see pugdoku-logic.ts for the levels). */
import { decodePuzzle, makePuzzle, solveAll, transformPuzzle, rnd, type Diff, type Puzzle } from './pugdoku';
import { grade, type Level } from './pugdoku-logic';

export type Tier = { n: number; min: Level; max: Level };
export const TIERS: Record<Diff, Tier> = {
  relaxed: { n: 5, min: 1, max: 2 },
  easy: { n: 5, min: 1, max: 3 },
  medium: { n: 7, min: 2, max: 4 },
  hard: { n: 9, min: 3, max: 5 },
};

export const fits = (pz: Puzzle, t: Tier): boolean => {
  const gr = grade(t.n, pz.g);
  return gr.solvable && gr.level >= t.min && gr.level <= t.max;
};

/** Live build for the worker: only returns puzzles that pass `fits`. */
export const buildPuzzle = (t: Tier): Puzzle => makePuzzle(t.n, (pz) => fits(pz, t));

/** Pick a puzzle from the pre-verified bank that suits the tier (random orientation). `skip` = bank indices already played. */
export function pickFromBank(list: [string, string][], t: Tier, skip: Set<number>): { pz: Puzzle; idx: number } | null {
  const order = list.map((_, i) => i).sort(() => Math.random() - 0.5);
  for (const pass of [0, 1]) {
    for (const i of order) {
      if (pass === 0 && skip.has(i)) continue;
      const pz = decodePuzzle(list[i], t.n);
      if (fits(pz, t)) return { pz: transformPuzzle(pz, t.n, rnd(8)), idx: i };
    }
  }
  return null;
}

/** Last line of defence before a puzzle reaches a player. */
export const verified = (pz: Puzzle, n: number): boolean => {
  const s = solveAll(n, pz.g, 2);
  return s.length === 1 && s[0].every((c, r) => c === pz.p[r]);
};
