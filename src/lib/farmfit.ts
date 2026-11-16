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
export type State = { grid: Grid; tray: (Shape | null)[]; score: number; over: boolean; lines: number; moves: number };
export type Placed = { state: State; rows: number[]; cols: number[]; cleared: { r: number; c: number; color: number }[]; points: number; bonus: number };

const make = (id: string, art: string[], color: number): Shape => {
  const cells: Cell[] = [];
  art.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return { id, cells, w: art[0].length, h: art.length, color };
};

/** every block in the fixed orientation it is dealt in (no rotating) */
export const SHAPES: Shape[] = [
  make('I4h', ['####'], 1), make('I4v', ['#', '#', '#', '#'], 1),
  make('O', ['##', '##'], 2),
  make('T0', ['###', '.#.'], 3), make('T1', ['#.', '##', '#.'], 3), make('T2', ['.#.', '###'], 3), make('T3', ['.#', '##', '.#'], 3),
  make('S0', ['.##', '##.'], 4), make('S1', ['#.', '##', '.#'], 4),
  make('Z0', ['##.', '.##'], 5), make('Z1', ['.#', '##', '#.'], 5),
  make('L0', ['#.', '#.', '##'], 6), make('L1', ['###', '#..'], 6), make('L2', ['##', '.#', '.#'], 6), make('L3', ['..#', '###'], 6),
  make('J0', ['.#', '.#', '##'], 7), make('J1', ['#..', '###'], 7), make('J2', ['##', '#.', '#.'], 7), make('J3', ['###', '..#'], 7),
  make('I3h', ['###'], 8), make('I3v', ['#', '#', '#'], 8), make('I2h', ['##'], 8), make('I2v', ['#', '#'], 8),
  make('V0', ['##', '#.'], 9), make('V1', ['##', '.#'], 9), make('V2', ['#.', '##'], 9), make('V3', ['.#', '##'], 9),
  make('ONE', ['#'], 10),
];
/** what blocks are dealt from: the single block is listed three times so it turns up fairly often */
const ONE = SHAPES.find((s) => s.id === 'ONE')!;
const POOL: Shape[] = [...SHAPES, ONE, ONE];

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
const stuck = (grid: Grid, tray: (Shape | null)[]) => tray.every((s) => !s || !fitsAnywhere(grid, s));

export function newGame(rng: Rng = Math.random): State {
  const grid = emptyGrid();
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
  if (tray.every((t) => !t)) tray = deal(grid, rng);
  const state: State = { grid, tray, score: prev.score + points, over: false, lines: prev.lines + n, moves: prev.moves + 1 };
  state.over = stuck(grid, tray);
  return { state, rows, cols, cleared, points, bonus };
}
