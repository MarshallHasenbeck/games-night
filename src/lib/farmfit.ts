/**
 * Farm Fit - pure rules, no React.
 * A 10x10 board. Three colour-coded blocks are dealt at a time (never rotated). Drop them anywhere they fit.
 * A full row or column disappears; clearing several at once scores a bigger bonus. When all three are used, three new ones appear.
 * The game ends when none of the blocks in hand fits anywhere.
 */
export const N = 10;
export type Cell = [number, number]; // [row, col]
export type Shape = { id: string; cells: Cell[]; w: number; h: number; color: number }; // color 1..9
export type Grid = number[][]; // 0 empty, otherwise the colour of the block that filled it
export type State = { grid: Grid; tray: (Shape | null)[]; score: number; over: boolean; lines: number; moves: number; /** duel games: every player is dealt the same hands from this seed */ seed?: number; hand?: number };
export type Placed = { state: State; rows: number[]; cols: number[]; cleared: { r: number; c: number; color: number }[]; points: number; bonus: number };

const make = (id: string, art: string[], color: number): Shape => {
  const cells: Cell[] = [];
  art.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return { id, cells, w: art[0].length, h: art.length, color };
};

/** every block in the fixed orientation it is dealt in (no rotating) */
export const SHAPES: Shape[] = [
  make('I4h', ['####'], 3), make('I4v', ['#', '#', '#', '#'], 3),
  make('O', ['##', '##'], 6),
  make('T0', ['###', '.#.'], 9), make('T1', ['#.', '##', '#.'], 9), make('T2', ['.#.', '###'], 9), make('T3', ['.#', '##', '.#'], 9),
  make('S0', ['.##', '##.'], 1), make('S1', ['#.', '##', '.#'], 1),
  make('Z0', ['##.', '.##'], 2), make('Z1', ['.#', '##', '#.'], 2),
  make('L0', ['#.', '#.', '##'], 8), make('L1', ['###', '#..'], 8), make('L2', ['##', '.#', '.#'], 8), make('L3', ['..#', '###'], 8),
  make('J0', ['.#', '.#', '##'], 4), make('J1', ['#..', '###'], 4), make('J2', ['##', '#.', '#.'], 4), make('J3', ['###', '..#'], 4),
  make('I3h', ['###'], 7), make('I3v', ['#', '#', '#'], 7), make('I2h', ['##'], 7), make('I2v', ['#', '#'], 7),
  make('V0', ['##', '#.'], 5), make('V1', ['##', '.#'], 5), make('V2', ['#.', '##'], 5), make('V3', ['.#', '##'], 5),
  make('ONE', ['#'], 10),
];
/** what blocks are dealt from: the single block is listed three times so it turns up fairly often */
const ONE = SHAPES.find((s) => s.id === 'ONE')!;
const POOL: Shape[] = [...SHAPES, ONE, ONE];

import { makeRng } from './duel';
type Rng = () => number;
const emptyGrid = (): Grid => Array.from({ length: N }, () => Array(N).fill(0));

export function canPlace(grid: Grid, s: Shape, r: number, c: number): boolean {
  for (const [dr, dc] of s.cells) {
    const y = r + dr, x = c + dc;
    if (y < 0 || x < 0 || y >= N || x >= N || grid[y][x]) return false;
  }
  return true;
}
export function fitsAnywhere(grid: Grid, s: Shape): boolean {
  for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.w; c++) if (canPlace(grid, s, r, c)) return true;
  return false;
}
/** rows and columns that would be full if `s` were placed at (r, c) */
export function completes(grid: Grid, s: Shape, r: number, c: number): { rows: number[]; cols: number[] } {
  const g = grid.map((row) => row.slice());
  for (const [dr, dc] of s.cells) g[r + dr][c + dc] = s.color;
  const rows: number[] = [], cols: number[] = [];
  for (let y = 0; y < N; y++) if (g[y].every(Boolean)) rows.push(y);
  for (let x = 0; x < N; x++) if (g.every((row) => row[x])) cols.push(x);
  return { rows, cols };
}

/** points for clearing n lines at once: 1 -> 10, 2 -> 30, 3 -> 60, 4 -> 100, 5 -> 150 ... */
/** a duel game lasts this many hands (30 blocks) unless somebody runs out of room first, so a strong player cannot go on forever */
const devHands = (): number => { try { const dev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV; return dev ? Number(new URLSearchParams(location.search).get('hands')) || 0 : 0; } catch { return 0; } }; // ?hands=1 in the dev server only, for quick testing
export const DUEL_HANDS = devHands() || 10;
export const lineBonus = (n: number) => (n * (n + 1) / 2) * 10;

function deal(grid: Grid, rng: Rng): Shape[] {
  let best: Shape[] = [];
  for (let tries = 0; tries < 40; tries++) {
    const t = [0, 1, 2].map(() => POOL[Math.floor(rng() * POOL.length)]);
    best = t;
    if (t.some((s) => fitsAnywhere(grid, s))) return t; // never deal a hand that is dead on arrival if a live one exists
  }
  return best;
}
/** the k-th hand of a duel game: depends only on the seed, so both players see exactly the same blocks */
export const handFor = (seed: number, k: number): Shape[] => { const r = makeRng(seed * 7919 + k * 104729 + 13); return [0, 1, 2].map(() => POOL[Math.floor(r() * POOL.length)]); };
const stuck = (grid: Grid, tray: (Shape | null)[]) => tray.every((s) => !s || !fitsAnywhere(grid, s));

export function newGame(rng: Rng = Math.random, seed?: number): State {
  const grid = emptyGrid();
  if (seed !== undefined) return { grid, tray: handFor(seed, 0), score: 0, over: false, lines: 0, moves: 0, seed, hand: 0 };
  return { grid, tray: deal(grid, rng), score: 0, over: false, lines: 0, moves: 0 };
}

export function place(prev: State, slot: number, r: number, c: number, rng: Rng = Math.random): Placed | null {
  const s = prev.tray[slot];
  if (prev.over || !s || !canPlace(prev.grid, s, r, c)) return null;
  const grid = prev.grid.map((row) => row.slice());
  for (const [dr, dc] of s.cells) grid[r + dr][c + dc] = s.color;
  const rows: number[] = [], cols: number[] = [];
  for (let y = 0; y < N; y++) if (grid[y].every(Boolean)) rows.push(y);
  for (let x = 0; x < N; x++) if (grid.every((row) => row[x])) cols.push(x);
  const cleared: Placed['cleared'] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x] && (rows.includes(y) || cols.includes(x))) cleared.push({ r: y, c: x, color: grid[y][x] });
  cleared.forEach(({ r: y, c: x }) => { grid[y][x] = 0; });
  const n = rows.length + cols.length;
  const bonus = lineBonus(n), points = s.cells.length + bonus;
  let tray = prev.tray.slice(); tray[slot] = null;
  let hand = prev.hand;
  if (tray.every((t) => !t)) { if (prev.seed !== undefined) { hand = (prev.hand ?? 0) + 1; tray = handFor(prev.seed, hand); } else tray = deal(grid, rng); }
  const finished = prev.seed !== undefined && (hand ?? 0) >= DUEL_HANDS;
  if (finished) tray = [null, null, null];
  const state: State = { grid, tray, score: prev.score + points, over: false, lines: prev.lines + n, moves: prev.moves + 1, seed: prev.seed, hand };
  state.over = finished || stuck(grid, tray);
  return { state, rows, cols, cleared, points, bonus };
}

/* ---------- computer player (for the duel games) ---------- */
/** how tidy a board is: fewer lonely holes and a less ragged edge is better */
function tidy(grid: Grid): number {
  let holes = 0, edges = 0, empty = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (grid[r][c]) continue;
    empty++;
    const filled = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dr, dc]) => { const y = r + dr, x = c + dc; return y < 0 || x < 0 || y >= N || x >= N || grid[y][x]; }).length;
    if (filled === 4) holes += 3; else if (filled === 3) holes += 1;
    edges += filled;
  }
  return empty * 0.4 - holes * 2.2 - edges * 0.12;
}
type Move = { slot: number; r: number; c: number };
function options(s: State): Move[] {
  const out: Move[] = [];
  s.tray.forEach((sh, slot) => { if (sh) for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.w; c++) if (canPlace(s.grid, sh, r, c)) out.push({ slot, r, c }); });
  return out;
}
const worth = (s: State, m: Move) => { const p = place(s, m.slot, m.r, m.c, () => 0.5); return p ? p.points * 1.6 + tidy(p.state.grid) : -1e9; };
/** Easy tries things at random most of the time; medium plays the tidiest single block; hard also plans the order of the three blocks in its hand. */
export function cpuMove(s: State, level: 1 | 2 | 3, rng: Rng): Move | null {
  const opts = options(s);
  if (!opts.length) return null;
  if (level === 1) {
    if (rng() < 0.6) return opts[Math.floor(rng() * opts.length)];
    return opts.slice().sort((a, b) => worth(s, b) - worth(s, a))[0];
  }
  if (level === 2) { const top = opts.map((m) => ({ m, w: worth(s, m) })).sort((a, b) => b.w - a.w); const r = rng(); return top[Math.min(top.length - 1, r < 0.6 ? 0 : r < 0.85 ? 1 : 2)].m; } // a good player who sometimes misses the best spot
  // hard: look one extra block ahead and keep the board tidy for the pieces still in hand
  let best = opts[0], bv = -1e18;
  const shortlist = opts.map((m) => ({ m, w: worth(s, m) })).sort((a, b) => b.w - a.w).slice(0, 10).map((x) => x.m);
  for (const m of shortlist) {
    const p = place(s, m.slot, m.r, m.c, () => 0.5); if (!p) continue;
    let v = p.points * 2.6 + tidy(p.state.grid);
    const next = options(p.state);
    if (next.length) { let nb = -1e18; for (const n of next) { const q = place(p.state, n.slot, n.r, n.c, () => 0.5); if (q) nb = Math.max(nb, q.points * 2.6 + tidy(q.state.grid)); } v += nb * 0.9; } else v -= 25;
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}
