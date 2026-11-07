/** Pugdoku: pure puzzle logic (no React). One pug in every row, column and colour; pugs never touch, even diagonally.
 *  Every puzzle must have exactly ONE answer, so the bank (pugdoku-bank.ts) is pre-verified and live-built puzzles are verified before use. */
export type Grid = number[][];
export type Puzzle = { g: Grid; p: number[] };   // g = colour region per cell, p[row] = column of that row's pug

export const rnd = (n: number) => Math.floor(Math.random() * n);
export function shuf<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Board size grows with the level. */
export const sizeFor = (level: number) => (level <= 2 ? 5 : level <= 4 ? 6 : level <= 6 ? 7 : level <= 9 ? 8 : level <= 14 ? 9 : 10);

export const COLORS = ['#d4475a', '#f2b632', '#6fbf4a', '#5ab0c8', '#9b7bd1', '#f08fb0', '#e8842f', '#3fa58a', '#c9a272', '#f4e3b0'];

/* ---------- bank format: [regions as n*n digits, pug columns as n digits] ---------- */
export function decodePuzzle([gs, ps]: [string, string], n: number): Puzzle {
  const g: Grid = [];
  for (let r = 0; r < n; r++) g.push([...gs.slice(r * n, r * n + n)].map(Number));
  return { g, p: [...ps].map(Number) };
}

/** Any of the 8 rotations / flips of a board keeps its single answer. */
export function transformPuzzle(pz: Puzzle, n: number, t = rnd(8)): Puzzle {
  const M = n - 1;
  const f = (r: number, c: number): [number, number] => [[r, c], [c, M - r], [M - r, M - c], [M - c, r], [r, M - c], [M - r, c], [c, r], [M - c, M - r]][t] as [number, number];
  const g: Grid = Array.from({ length: n }, () => Array(n).fill(0));
  const p: number[] = Array(n).fill(0);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [a, b] = f(r, c); g[a][b] = pz.g[r][c]; }
  for (let r = 0; r < n; r++) { const [a, b] = f(r, pz.p[r]); p[a] = b; }
  return { g, p };
}

/** Some levels start with a pug already placed (always one on levels 1-2). Returns the rows that are given. */
export function pickGivens(n: number, level: number): number[] {
  const k = level <= 2 ? 1 : rnd(100) < 40 ? (n >= 8 && rnd(100) < 40 ? 2 : 1) : 0;
  return shuf([...Array(n).keys()]).slice(0, k);
}

/* ---------- solver (used to prove a puzzle has exactly one answer) ---------- */
export function solveAll(n: number, g: Grid, limit: number): number[][] {
  const out: number[][] = [], cols: number[] = [], usedC = new Set<number>(), usedR = new Set<number>();
  const go = (r: number) => {
    if (out.length >= limit) return;
    if (r === n) { out.push(cols.slice()); return; }
    for (let c = 0; c < n; c++) {
      const k = g[r][c];
      if (usedC.has(c) || usedR.has(k)) continue;
      if (r > 0 && Math.abs(c - cols[r - 1]) < 2) continue;
      cols[r] = c; usedC.add(c); usedR.add(k);
      go(r + 1);
      usedC.delete(c); usedR.delete(k);
    }
  };
  go(0);
  return out;
}

/* ---------- live puzzle building (slow for big boards, so it runs in a worker) ---------- */
const BIAS = 0.3, MINSZ = 1;

function randomSolution(n: number): number[] {
  const p: number[] = [];
  const go = (r: number): boolean => {
    if (r === n) return true;
    for (const c of shuf([...Array(n).keys()])) {
      if (p.includes(c)) continue;
      if (r > 0 && Math.abs(c - p[r - 1]) < 2) continue;
      p[r] = c;
      if (go(r + 1)) return true;
    }
    p.length = r;
    return false;
  };
  go(0);
  return p;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function growRegions(n: number, p: number[]): Grid {
  const g: Grid = Array.from({ length: n }, () => Array(n).fill(-1));
  const size = Array(n).fill(1);
  p.forEach((c, r) => { g[r][c] = r; });
  let left = n * n - n;
  while (left > 0) {
    const opts: [number, number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] < 0)
      for (const [dr, dc] of DIRS) {
        const a = r + dr, b = c + dc;
        if (a >= 0 && b >= 0 && a < n && b < n && g[a][b] >= 0) opts.push([r, c, g[a][b]]);
      }
    let pick: [number, number, number];
    if (Math.random() < BIAS) {
      const m = Math.min(...opts.map((o) => size[o[2]]));
      const small = opts.filter((o) => size[o[2]] === m);
      pick = small[rnd(small.length)];
    } else pick = opts[rnd(opts.length)];
    g[pick[0]][pick[1]] = pick[2]; size[pick[2]]++; left--;
  }
  return g;
}

function connectedWithout(n: number, g: Grid, k: number, sr: number, sc: number): boolean {
  const cells: [number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] === k && !(r === sr && c === sc)) cells.push([r, c]);
  if (!cells.length) return false;
  const seen = new Set([cells[0][0] * n + cells[0][1]]), st = [cells[0]];
  while (st.length) {
    const [r, c] = st.pop()!;
    for (const [dr, dc] of DIRS) {
      const a = r + dr, b = c + dc;
      if (a >= 0 && b >= 0 && a < n && b < n && g[a][b] === k && !(a === sr && b === sc) && !seen.has(a * n + b)) { seen.add(a * n + b); st.push([a, b]); }
    }
  }
  return seen.size === cells.length;
}

/** Nudges region borders until the intended answer is the only one. */
function repair(n: number, g: Grid, p: number[]): boolean {
  for (let step = 0; step < 500; step++) {
    const sols = solveAll(n, g, 2);
    if (sols.length === 1) return true;
    const alt = sols.find((s) => s.some((c, r) => c !== p[r]))!;
    const cand: [number, number, number][] = [];
    alt.forEach((c, r) => {
      if (c === p[r]) return;
      for (const [dr, dc] of DIRS) {
        const a = r + dr, b = c + dc;
        if (a >= 0 && b >= 0 && a < n && b < n && g[a][b] !== g[r][c]) cand.push([r, c, g[a][b]]);
      }
    });
    shuf(cand);
    for (const [r, c, k] of cand) {
      let sz = 0;
      for (const row of g) for (const v of row) if (v === g[r][c]) sz++;
      if (sz > MINSZ && connectedWithout(n, g, g[r][c], r, c)) { g[r][c] = k; break; }
    }
  }
  return solveAll(n, g, 2).length === 1;
}

/** Keeps going until the puzzle has exactly ONE answer; never returns an unverified one. */
export function makePuzzle(n: number): Puzzle {
  for (;;) {
    const p = randomSolution(n), g = growRegions(n, p);
    if (repair(n, g, p) && solveAll(n, g, 2).length === 1) return { g, p };
  }
}
