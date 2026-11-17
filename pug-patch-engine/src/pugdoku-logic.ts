/** Pugdoku: a human-style deduction solver (no guessing, no backtracking search).
 *  Used three ways: (1) grade how hard a puzzle really is, (2) prove a generated puzzle can be solved by logic alone,
 *  (3) produce real hints ("this is the next thing you can work out, and why").
 *  Pure TypeScript, no React, so it runs in the worker, in the app and under tsx tests. */
import type { Grid } from './pugdoku';

export type Cell = [number, number];
export type Step =
  | { kind: 'place'; cell: Cell; level: number; why: string; focus: Cell[] }
  | { kind: 'elim'; cells: Cell[]; level: number; why: string; focus: Cell[] };

/** Technique levels (the hardest one a puzzle needs is its rating):
 *  1 last spot left in a row / column / colour
 *  2 a colour sits entirely in one row/column (or the other way round) and a pug next to every spot of a colour is impossible
 *  3 two colours squeezed into two rows/columns (or the reverse)
 *  4 three or more squeezed together
 *  5 "what if": try a spot, it leaves some row/column/colour with nowhere to go */
export type Level = 1 | 2 | 3 | 4 | 5;

const NB = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export class Logic {
  n: number;
  g: Grid;
  cand: boolean[][];
  placed: Cell[] = [];
  constructor(n: number, g: Grid, cand?: boolean[][], placed?: Cell[]) {
    this.n = n; this.g = g;
    this.cand = cand ? cand.map((r) => r.slice()) : Array.from({ length: n }, () => Array(n).fill(true));
    if (placed) this.placed = placed.slice();
  }
  clone() { return new Logic(this.n, this.g, this.cand, this.placed); }

  isPlaced(r: number, c: number) { return this.placed.some(([a, b]) => a === r && b === c); }

  /** Put a pug here: it rules out its row, column, colour and the eight cells around it. Returns false if that contradicts an earlier pug. */
  place(r: number, c: number): boolean {
    if (!this.cand[r][c]) return false;
    const { n, g } = this, k = g[r][c];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (a === r && b === c) continue;
      if (a === r || b === c || g[a][b] === k || (Math.abs(a - r) <= 1 && Math.abs(b - c) <= 1)) this.cand[a][b] = false;
    }
    this.placed.push([r, c]);
    return true;
  }

  /** The three kinds of line a pug must appear exactly once in: 0 = rows, 1 = columns, 2 = colours. */
  unitCells(type: number, i: number): Cell[] {
    const { n, g } = this, out: Cell[] = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (cand(this, a, b) && (type === 0 ? a === i : type === 1 ? b === i : g[a][b] === i)) out.push([a, b]);
    }
    return out;
  }
  /** Which line (of kind `type`) a cell is in. */
  lineOf(type: number, r: number, c: number) { return type === 0 ? r : type === 1 ? c : this.g[r][c]; }

  /** True once every unit has a pug. */
  solved() { return this.placed.length === this.n; }
  /** True if some unit has no place left for its pug. */
  dead() {
    for (let t = 0; t < 3; t++) for (let i = 0; i < this.n; i++) if (!this.unitCells(t, i).length) return true;
    return false;
  }
}
const cand = (L: Logic, r: number, c: number) => L.cand[r][c];

const UNIT_NAME = ['row', 'column', 'colour'];
const UNIT_PLURAL = ['rows', 'columns', 'colours'];

/** Next single deduction for this position, or null if only trial-and-error is left. `maxLevel` stops the search early. */
export function nextStep(L: Logic, maxLevel: Level = 5): Step | null {
  const { n } = L;

  // level 1: only one spot left in a unit
  for (let t = 0; t < 3; t++) for (let i = 0; i < n; i++) {
    const cs = L.unitCells(t, i);
    if (cs.length === 1 && !L.isPlaced(cs[0][0], cs[0][1])) {
      return { kind: 'place', cell: cs[0], level: 1, focus: cs, why: `This ${UNIT_NAME[t]} has only one spot left, so the pug has to go there.` };
    }
  }
  if (maxLevel < 2) return null;

  // level 2: a pug next to every spot of a unit is impossible, because that unit's pug must go on one of those spots
  for (let t = 0; t < 3; t++) for (let i = 0; i < n; i++) {
    const cs = L.unitCells(t, i);
    if (cs.length < 2 || cs.length > 4) continue;
    const bad: Cell[] = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (!L.cand[a][b] || cs.some(([r, c]) => r === a && c === b)) continue;
      if (cs.every(([r, c]) => Math.abs(r - a) <= 1 && Math.abs(c - b) <= 1)) bad.push([a, b]);
    }
    if (bad.length) return { kind: 'elim', cells: bad, level: 2, focus: cs, why: `A pug on the marked spots would touch every spot this ${UNIT_NAME[t]} has left, so they can't hold a pug.` };
  }

  // levels 2-4: k units of one kind that all fit inside exactly k lines of another kind use those lines up
  for (let k = 1; k <= Math.min(4, Math.floor(n / 2)); k++) {
    const level = Math.min(4, k + 1) as Level;
    if (level > maxLevel) break;
    for (let A = 0; A < 3; A++) for (let B = 0; B < 3; B++) {
      if (A === B) continue;
      const found = confine(L, A, B, k);
      if (found) return { kind: 'elim', cells: found.cells, level, focus: found.focus, why: found.why };
    }
  }
  if (maxLevel < 5) return null;

  // level 5: try a spot; if that leaves any row/column/colour with nowhere to go, the spot is out
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (!L.cand[a][b] || L.isPlaced(a, b)) continue;
    const t = L.clone();
    if (!t.place(a, b) || propagate(t) === 'dead') {
      return { kind: 'elim', cells: [[a, b]], level: 5, focus: [[a, b]], why: 'If a pug went here, some row, column or colour would run out of spots. So it can\'t go here.' };
    }
  }
  return null;
}

/** Plain propagation used by the trial technique: keep placing forced pugs until nothing is forced or something breaks. */
function propagate(L: Logic): 'ok' | 'dead' {
  for (let guard = 0; guard < 200; guard++) {
    if (L.dead()) return 'dead';
    let moved = false;
    for (let t = 0; t < 3 && !moved; t++) for (let i = 0; i < L.n && !moved; i++) {
      const cs = L.unitCells(t, i);
      if (cs.length === 1 && !L.isPlaced(cs[0][0], cs[0][1])) { if (!L.place(cs[0][0], cs[0][1])) return 'dead'; moved = true; }
    }
    if (!moved) return 'ok';
  }
  return 'ok';
}

function subsets(n: number, k: number): number[][] {
  const out: number[][] = [], cur: number[] = [];
  const go = (s: number) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = s; i < n; i++) { cur.push(i); go(i + 1); cur.pop(); } };
  go(0);
  return out;
}

function confine(L: Logic, A: number, B: number, k: number): { cells: Cell[]; focus: Cell[]; why: string } | null {
  const { n } = L;
  for (const S of subsets(n, k)) {
    const lines = new Set<number>(), focus: Cell[] = [];
    for (const i of S) for (const [r, c] of L.unitCells(A, i)) { lines.add(L.lineOf(B, r, c)); focus.push([r, c]); }
    if (lines.size !== k) continue;
    const cells: Cell[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!L.cand[r][c] || !lines.has(L.lineOf(B, r, c)) || S.includes(L.lineOf(A, r, c))) continue;
      cells.push([r, c]);
    }
    if (!cells.length) continue;
    const why = k === 1
      ? `This ${UNIT_NAME[A]} only fits in one ${UNIT_NAME[B]}, so nothing else can use that ${UNIT_NAME[B]}.`
      : `These ${k} ${UNIT_PLURAL[A]} only fit in ${k} ${UNIT_PLURAL[B]}, so nothing else can use those ${UNIT_PLURAL[B]}.`;
    return { cells, focus, why };
  }
  return null;
}

/** Apply a step to the position. */
export function applyStep(L: Logic, s: Step) {
  if (s.kind === 'place') L.place(s.cell[0], s.cell[1]);
  else for (const [r, c] of s.cells) L.cand[r][c] = false;
}

export type Grade = { solvable: boolean; level: Level; steps: number; counts: number[] };

/** Solve using logic only. `solvable` is false if the puzzle would need real guessing (beyond level 5). */
export function grade(n: number, g: Grid, given: Cell[] = []): Grade {
  const L = new Logic(n, g);
  for (const [r, c] of given) L.place(r, c);
  let level: Level = 1, steps = 0;
  const counts = [0, 0, 0, 0, 0, 0];
  while (!L.solved()) {
    const s = nextStep(L);
    if (!s) return { solvable: false, level: 5, steps, counts };
    applyStep(L, s);
    if (L.dead()) return { solvable: false, level: 5, steps, counts };
    steps++; counts[s.level]++;
    if (s.level > level) level = s.level as Level;
  }
  return { solvable: true, level, steps, counts };
}

/** For a hint: the next thing worth telling the player, given the pugs they have placed and the ✕ marks they have made.
 *  Skips deductions whose ✕ marks are already on the board. Returns null if the position is contradictory (a wrong pug in relaxed mode). */
export function hintFor(n: number, g: Grid, pugs: Cell[], marked: (r: number, c: number) => boolean): Step | null {
  const L = new Logic(n, g);
  for (const [r, c] of pugs) if (!L.place(r, c)) return null;
  for (let guard = 0; guard < 400 && !L.solved(); guard++) {
    const s = nextStep(L);
    if (!s || L.dead()) return null;
    if (s.kind === 'place') return s;
    if (s.cells.some(([r, c]) => !marked(r, c))) return { ...s, cells: s.cells.filter(([r, c]) => !marked(r, c)) };
    applyStep(L, s);
  }
  return null;
}
