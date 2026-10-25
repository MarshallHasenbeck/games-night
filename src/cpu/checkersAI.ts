import { apply, legalMoves, type Move, type State } from '../lib/checkers';

const DEPTH = [2, 4, 6];

function evaluate(s: State, me: 0 | 1): number {
  let v = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = s.board[r][c];
    if (!p) continue;
    let x = p.k ? 170 : 100;
    if (!p.k) x += (p.c === 0 ? 7 - r : r) * 4;
    x += (3.5 - Math.abs(c - 3.5)) * 1.5;
    v += p.c === me ? x : -x;
  }
  return v;
}

function search(s: State, depth: number, alpha: number, beta: number, me: 0 | 1): number {
  if (s.winner !== null) return s.winner === me ? 10000 + depth : -10000 - depth;
  if (depth === 0) return evaluate(s, me);
  const moves = legalMoves(s.board, s.turn, s.chain);
  const maxing = s.turn === me;
  let best = maxing ? -Infinity : Infinity;
  for (const m of moves) {
    const v = search(apply(s, m), depth - 1, alpha, beta, me);
    if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

export function bestCheckersMove(s: State, level: 1 | 2 | 3): Move {
  const moves = legalMoves(s.board, s.turn, s.chain);
  if (level === 1 && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
  let best = moves[0], bv = -Infinity;
  for (const m of moves) {
    const v = search(apply(s, m), DEPTH[level - 1] - 1, -Infinity, Infinity, s.turn) + Math.random() * 0.5;
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}
