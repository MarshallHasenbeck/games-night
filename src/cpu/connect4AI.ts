import { R, C, type Grid, findWin, landingRow } from '../lib/connect4';

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const DEPTH = [3, 5, 7];

function windows(g: Grid, me: 0 | 1): number {
  let s = 0;
  const score = (cells: (0 | 1 | null)[]) => {
    const mine = cells.filter((x) => x === me).length, theirs = cells.filter((x) => x !== null && x !== me).length;
    if (mine && theirs) return 0;
    if (mine === 4) return 100000;
    if (mine === 3) return 50;
    if (mine === 2) return 10;
    if (theirs === 3) return -80;
    if (theirs === 2) return -8;
    return 0;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells: (0 | 1 | null)[] = [];
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= R || cc < 0 || cc >= C) break;
        cells.push(g[rr][cc]);
      }
      if (cells.length === 4) s += score(cells);
    }
    if (g[r][c] === me && c === 3) s += 4;
  }
  return s;
}

function minimax(g: Grid, depth: number, alpha: number, beta: number, turn: 0 | 1, me: 0 | 1): number {
  const w = findWin(g);
  if (w) return g[w[0][0]][w[0][1]] === me ? 1e6 + depth : -1e6 - depth;
  if (depth === 0 || g[0].every((x) => x !== null)) return depth === 0 ? windows(g, me) : 0;
  const maxing = turn === me;
  let best = maxing ? -Infinity : Infinity;
  for (const c of ORDER) {
    const r = landingRow(g, c);
    if (r < 0) continue;
    g[r][c] = turn;
    const v = minimax(g, depth - 1, alpha, beta, turn === 0 ? 1 : 0, me);
    g[r][c] = null;
    if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

export function bestColumn(g0: Grid, me: 0 | 1, level: 1 | 2 | 3): number {
  const g = g0.map((r) => [...r]);
  const cols = ORDER.filter((c) => landingRow(g, c) >= 0);
  if (level === 1 && Math.random() < 0.3) return cols[Math.floor(Math.random() * cols.length)];
  let best = cols[0], bv = -Infinity;
  for (const c of cols) {
    const r = landingRow(g, c);
    g[r][c] = me;
    const v = minimax(g, DEPTH[level - 1] - 1, -Infinity, Infinity, me === 0 ? 1 : 0, me) + Math.random() * 0.5;
    g[r][c] = null;
    if (v > bv) { bv = v; best = c; }
  }
  return best;
}
