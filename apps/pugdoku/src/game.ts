/** Pugdoku (solo) game state and moves. Pure and JSON-serialisable: the whole state is what gets autosaved and synced.
 *  Every function returns a NEW state (boards are tiny, so copying is cheap and undo/autosave stay trivial). */
import { rnd, shuf, COLORS, type Diff, type Puzzle } from '../../../src/lib/pugdoku';
import { hintFor, type Cell } from '../../../src/lib/pugdoku-logic';

export const MAX_HINTS = 3;
export const MAX_LIVES = 3;

export type GState = {
  v: 1;
  id: string;                      // unique per puzzle played, so a cloud copy can tell "same game" from "a new one"
  diff: Diff;
  n: number;
  g: number[][];                   // colour region per cell
  p: number[];                     // solution: pug column per row
  pal: string[];                   // colour per region
  st: number[][];                  // 0 empty, 1 ✕, 2 pug
  bad: boolean[][];                // ✕ left by a wrong guess: red, permanent
  given: boolean[];                // rows that started with a pug
  lives: number;
  hints: number;
  secs: number;
  over: null | 'win' | 'lose';
  pts: number;
  best: boolean;                   // this solve beat the old best time (filled in by the caller)
  msg: string;                     // last hint explanation
  hl: Cell[];                      // cells the last hint is talking about
  hist: { st: number[][]; bad: boolean[][] }[];   // undo stack
};

export type Fx = 'none' | 'x' | 'unx' | 'pug' | 'unpug' | 'wrong' | 'win' | 'lose' | 'hint';
export type Result = { s: GState; fx: Fx };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const grid = <T,>(n: number, v: T): T[][] => Array.from({ length: n }, () => Array(n).fill(v) as T[]);

/** How many pugs start on the board: easy/relaxed 1-2, medium 0-1, hard 0-1. */
export function pickGivens(n: number, diff: Diff): number[] {
  const k = diff === 'easy' || diff === 'relaxed' ? (rnd(100) < 35 ? 2 : 1) : diff === 'medium' ? (rnd(100) < 50 ? 1 : 0) : (rnd(100) < 25 ? 1 : 0);
  return shuf([...Array(n).keys()]).slice(0, k);
}

export function newGame(diff: Diff, pz: Puzzle, givenRows: number[] = pickGivens(pz.p.length, diff), pal = shuf(COLORS.slice(0, pz.p.length))): GState {
  const n = pz.p.length, st = grid(n, 0), given: boolean[] = Array(n).fill(false);
  givenRows.forEach((r) => { st[r][pz.p[r]] = 2; given[r] = true; });
  return {
    v: 1, id: `${Date.now().toString(36)}${rnd(1e6).toString(36)}`, diff, n, g: pz.g, p: pz.p, pal, st, bad: grid(n, false), given,
    lives: MAX_LIVES, hints: MAX_HINTS, secs: 0, over: null, pts: 0, best: false, msg: '', hl: [], hist: [],
  };
}

/** Same puzzle, same colours, same starter pugs, fresh board. */
export const restart = (s: GState): GState => {
  const rows = s.given.flatMap((g, r) => (g ? [r] : []));
  return newGame(s.diff, { g: s.g, p: s.p }, rows, s.pal);
};

export const isRelaxed = (s: GState) => s.diff === 'relaxed';
export const pugCount = (s: GState) => s.st.flat().filter((v) => v === 2).length;
export const solved = (s: GState) => pugCount(s) === s.n && s.p.every((c, r) => s.st[r][c] === 2);
export const pugs = (s: GState): Cell[] => s.st.flatMap((row, r) => row.flatMap((v, c) => (v === 2 ? [[r, c] as Cell] : [])));
/** Is this a pug that doesn't belong (only possible in relaxed mode)? */
export const wrongPug = (s: GState, r: number, c: number) => isRelaxed(s) && s.st[r][c] === 2 && s.p[r] !== c;

const MAX_HIST = 60;
const withUndo = (s: GState): GState => {
  const h = [...s.hist, { st: clone(s.st), bad: clone(s.bad) }];
  return { ...s, hist: h.length > MAX_HIST ? h.slice(-MAX_HIST) : h };
};
const finish = (s: GState): Result => {
  if (!solved(s)) return { s, fx: 'none' };
  return { s: { ...s, over: 'win', pts: s.n * 10 + (isRelaxed(s) ? 0 : s.lives * 10), hl: [], msg: '' }, fx: 'win' };
};

/** Can this tile be changed by the player at all? Starter pugs and red ✕ marks are permanent. */
export const locked = (s: GState, r: number, c: number) => (s.given[r] && s.st[r][c] === 2) || s.bad[r][c];

/** Tap a tile. `quick` = a second tap right after the first: on an ✕ that means "the pug is here". */
export function tap(s0: GState, r: number, c: number, quick: boolean): Result {
  if (s0.over || locked(s0, r, c)) return { s: s0, fx: 'none' };
  const v = s0.st[r][c];
  if (v === 1 && quick) {
    // the guess
    if (!isRelaxed(s0) && s0.p[r] !== c) {
      const s = withUndo(s0); const st = clone(s.st), bad = clone(s.bad);
      bad[r][c] = true;
      const lives = s.lives - 1;
      return { s: { ...s, st, bad, lives, over: lives <= 0 ? 'lose' : null, hl: [], msg: '' }, fx: lives <= 0 ? 'lose' : 'wrong' };
    }
    const s = withUndo(s0); const st = clone(s.st);
    st[r][c] = 2;
    const done = finish({ ...s, st, hl: [], msg: '' });
    return done.fx === 'win' ? done : { s: done.s, fx: 'pug' };
  }
  const s = withUndo(s0); const st = clone(s.st);
  st[r][c] = v === 0 ? 1 : 0;
  return { s: { ...s, st, hl: [], msg: '' }, fx: v === 0 ? 'x' : v === 1 ? 'unx' : 'unpug' };
}

/** Drag across tiles: paint ✕ onto empty tiles, or (when the drag began on an ✕) wipe ✕ marks. Never touches pugs. One undo step per drag. */
export function paint(s0: GState, cells: Cell[], mode: 'x' | 'erase', firstOfDrag: boolean): GState {
  if (s0.over) return s0;
  let s = s0, st: number[][] | null = null;
  for (const [r, c] of cells) {
    const v = (st ?? s.st)[r][c];
    const want = mode === 'x' ? (v === 0 ? 1 : -1) : (v === 1 && !s.bad[r][c] ? 0 : -1);
    if (want < 0) continue;
    if (!st) { if (firstOfDrag) s = withUndo(s); st = clone(s.st); }
    st[r][c] = want;
  }
  return st ? { ...s, st, hl: [], msg: '' } : s;
}

export function clearX(s0: GState): GState {
  if (s0.over) return s0;
  const had = s0.st.some((row, r) => row.some((v, c) => v === 1 && !s0.bad[r][c]));
  if (!had) return s0;
  const s = withUndo(s0);
  return { ...s, st: s.st.map((row, r) => row.map((v, c) => (v === 1 && !s.bad[r][c] ? 0 : v))), hl: [], msg: '' };
}

/** Takes back the last change. Red ✕ marks from wrong guesses and lost treats stay (undo can't be used to dodge a mistake). */
export function undo(s0: GState): GState {
  if (s0.over || !s0.hist.length) return s0;
  const last = s0.hist[s0.hist.length - 1];
  const st = clone(last.st);
  s0.bad.forEach((row, r) => row.forEach((b, c) => { if (b) st[r][c] = 1; }));
  const bad = last.bad.map((row, r) => row.map((b, c) => b || s0.bad[r][c]));
  return { ...s0, st, bad, hist: s0.hist.slice(0, -1), hl: [], msg: '' };
}

/** A hint is a real deduction: the game works out what logic says is next, explains it, and does it for you
 *  (places the pug, or fills in the ✕ marks). If the board is too tangled to reason about (a wrong pug in relaxed mode), it reveals a pug. */
export function hint(s0: GState): Result {
  if (s0.over || s0.hints <= 0) return { s: s0, fx: 'none' };
  const step = hintFor(s0.n, s0.g, pugs(s0).filter(([r, c]) => !wrongPug(s0, r, c)), (r, c) => s0.st[r][c] !== 0);
  const s = withUndo(s0); const st = clone(s.st);
  const base = { ...s, hints: s.hints - 1 };
  if (step?.kind === 'elim') {
    for (const [r, c] of step.cells) if (st[r][c] === 0) st[r][c] = 1;
    return { s: { ...base, st, hl: step.focus, msg: step.why }, fx: 'hint' };
  }
  let r: number, c: number, msg: string, hl: Cell[];
  if (step?.kind === 'place') { [r, c] = step.cell; msg = step.why; hl = step.focus; }
  else {
    const rows = s.p.flatMap((col, row) => (st[row][col] === 2 ? [] : [row]));
    if (!rows.length) return { s: s0, fx: 'none' };
    r = rows[rnd(rows.length)]; c = s.p[r]; msg = 'Here is one of the pugs!'; hl = [[r, c]];
  }
  for (let k = 0; k < s.n; k++) if (st[r][k] === 2 && k !== c) st[r][k] = 0;
  st[r][c] = 2;
  const done = finish({ ...base, st, hl, msg });
  return done.fx === 'win' ? done : { s: done.s, fx: 'hint' };
}
