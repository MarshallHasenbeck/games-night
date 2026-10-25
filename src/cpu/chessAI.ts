import { Chess, type Move } from 'chess.js';

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const TIMEOUT = new Error('timeout');

function evaluate(g: Chess): number {
  let s = 0;
  g.board().forEach((row, r) => row.forEach((p, c) => {
    if (!p) return;
    let v = VAL[p.type];
    const center = 3.5 - Math.abs(c - 3.5) + 3.5 - Math.abs(r - 3.5);
    if (p.type === 'n' || p.type === 'b') v += center * 6;
    else if (p.type === 'p') v += (p.color === 'w' ? 6 - r : r - 1) * 5 + (c > 1 && c < 6 ? center : 0);
    else if (p.type === 'q') v += center * 2;
    s += p.color === 'w' ? v : -v;
  }));
  return s;
}

function ordered(g: Chess): Move[] {
  return g.moves({ verbose: true }).sort((a, b) =>
    (b.captured ? VAL[b.captured] * 10 - VAL[b.piece] : 0) - (a.captured ? VAL[a.captured] * 10 - VAL[a.piece] : 0) + (b.promotion ? 800 : 0) - (a.promotion ? 800 : 0));
}

let nodes = 0;
function negamax(g: Chess, depth: number, alpha: number, beta: number, ply: number, deadline: number): number {
  if ((++nodes & 255) === 0 && Date.now() > deadline) throw TIMEOUT;
  if (g.isCheckmate()) return -99000 + ply;
  if (g.isDraw()) return 0;
  if (depth === 0) return (g.turn() === 'w' ? 1 : -1) * evaluate(g);
  let best = -Infinity;
  for (const m of ordered(g)) {
    g.move(m);
    const v = -negamax(g, depth - 1, -beta, -alpha, ply + 1, deadline);
    g.undo();
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function bestChessMove(fen: string, level: 1 | 2 | 3): { from: string; to: string; promotion?: string } {
  const g = new Chess(fen);
  const moves = ordered(g);
  if (level === 1 && Math.random() < 0.3) { const m = moves[Math.floor(Math.random() * moves.length)]; return { from: m.from, to: m.to, promotion: m.promotion }; }
  const maxDepth = [1, 2, 4][level - 1];
  const deadline = Date.now() + (level === 3 ? 1400 : 700);
  let best = moves[0];
  for (let d = 1; d <= maxDepth; d++) {
    try {
      let bv = -Infinity, bm = moves[0];
      for (const m of moves) {
        g.move(m);
        const v = -negamax(g, d - 1, -Infinity, Infinity, 1, deadline) + Math.random() * 3;
        g.undo();
        if (v > bv) { bv = v; bm = m; }
      }
      best = bm;
      moves.sort((a, b) => (a === bm ? -1 : b === bm ? 1 : 0));
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      break;
    }
  }
  return { from: best.from, to: best.to, promotion: best.promotion };
}
