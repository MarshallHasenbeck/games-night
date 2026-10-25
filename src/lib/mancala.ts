/**
 * Mancala (Kalah, 6 pits × 4 stones). pits[0..5] = player 0 (bottom, left→right), pits[6] = player 0's store (right),
 * pits[7..12] = player 1 (top, right→left), pits[13] = player 1's store (left). Sowing runs counter-clockwise.
 */
export type MState = { pits: number[]; turn: 0 | 1; winner: 0 | 1 | 'draw' | null };
export const STORE = [6, 13] as const;

export const newGame = (): MState => ({ pits: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn: 0, winner: null });
const ownPits = (p: 0 | 1) => (p === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
export const legalPits = (s: MState) => (s.winner !== null ? [] : ownPits(s.turn).filter((i) => s.pits[i] > 0));

export type Sow = { steps: number[]; final: MState; extra: boolean; captured: number; swept: boolean };

export function sow(s: MState, i: number): Sow {
  const pits = [...s.pits];
  const me = s.turn, opp: 0 | 1 = me === 0 ? 1 : 0;
  let stones = pits[i];
  pits[i] = 0;
  const steps: number[] = [];
  let pos = i;
  while (stones > 0) {
    pos = (pos + 1) % 14;
    if (pos === STORE[opp]) continue;
    pits[pos]++; stones--; steps.push(pos);
  }
  let captured = 0;
  const mine = ownPits(me);
  if (mine.includes(pos) && pits[pos] === 1 && pits[12 - pos] > 0) {
    captured = pits[12 - pos] + 1;
    pits[STORE[me]] += captured;
    pits[pos] = 0; pits[12 - pos] = 0;
  }
  let extra = pos === STORE[me];
  let swept = false;
  if (ownPits(0).every((k) => pits[k] === 0) || ownPits(1).every((k) => pits[k] === 0)) {
    swept = true; extra = false;
    for (const p of [0, 1] as const) for (const k of ownPits(p)) { pits[STORE[p]] += pits[k]; pits[k] = 0; }
  }
  let winner: MState['winner'] = null;
  if (swept) winner = pits[6] === pits[13] ? 'draw' : pits[6] > pits[13] ? 0 : 1;
  return { steps, final: { pits, turn: extra ? me : opp, winner }, extra, captured, swept };
}

/* ---------- computer player ---------- */
const DEPTH = [2, 5, 7];
function search(s: MState, depth: number, alpha: number, beta: number, me: 0 | 1): number {
  if (s.winner !== null) return s.winner === 'draw' ? 0 : s.winner === me ? 1000 + (s.pits[STORE[me]] - s.pits[STORE[me === 0 ? 1 : 0]]) : -1000 - (s.pits[STORE[me === 0 ? 1 : 0]] - s.pits[STORE[me]]);
  const opp: 0 | 1 = me === 0 ? 1 : 0;
  if (depth === 0) {
    const side = (p: 0 | 1) => ownPits(p).reduce((a, k) => a + s.pits[k], 0);
    return (s.pits[STORE[me]] - s.pits[STORE[opp]]) * 3 + (side(me) - side(opp)) * 0.3;
  }
  const maxing = s.turn === me;
  let best = maxing ? -Infinity : Infinity;
  const moves = legalPits(s).sort((a, b) => (s.turn === 0 ? b - a : a - b)); // try pits nearest the store first
  for (const m of moves) {
    const r = sow(s, m);
    const v = search(r.final, depth - 1, alpha, beta, me);
    if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}
export function cpuPit(s: MState, level: 1 | 2 | 3): number {
  const moves = legalPits(s);
  if (level === 1 && Math.random() < 0.35) return moves[Math.floor(Math.random() * moves.length)];
  let best = moves[0], bv = -Infinity;
  for (const m of moves) {
    const r = sow(s, m);
    const v = search(r.final, DEPTH[level - 1] - 1, -Infinity, Infinity, s.turn) + Math.random() * 0.4 + (r.extra ? 2 : 0);
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}
