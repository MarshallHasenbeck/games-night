export type Piece = { c: 0 | 1; k: boolean };
export type Board = (Piece | null)[][];
export type Move = { from: [number, number]; to: [number, number]; cap?: [number, number] };

/** Player 0 starts at the bottom and moves up (row decreasing); player 1 starts at the top. */
export function newBoard(): Board {
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => {
      if ((r + c) % 2 === 0) return null;
      if (r < 3) return { c: 1 as const, k: false };
      if (r > 4) return { c: 0 as const, k: false };
      return null;
    }));
}

const inb = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function pieceMoves(b: Board, r: number, c: number, jumpsOnly = false): Move[] {
  const p = b[r][c];
  if (!p) return [];
  const fwd = p.c === 0 ? -1 : 1;
  const dirs = p.k ? [-1, 1] : [fwd];
  const out: Move[] = [];
  for (const dr of dirs) for (const dc of [-1, 1]) {
    const nr = r + dr, nc = c + dc;
    if (!inb(nr, nc)) continue;
    const t = b[nr][nc];
    if (!t && !jumpsOnly) out.push({ from: [r, c], to: [nr, nc] });
    else if (t && t.c !== p.c) {
      const jr = nr + dr, jc = nc + dc;
      if (inb(jr, jc) && !b[jr][jc]) out.push({ from: [r, c], to: [jr, jc], cap: [nr, nc] });
    }
  }
  return out;
}

/** Legal moves for a player. Captures are mandatory; mid-chain, only the jumping piece may continue. */
export function legalMoves(b: Board, turn: 0 | 1, chain: [number, number] | null): Move[] {
  if (chain) return pieceMoves(b, chain[0], chain[1], true);
  const all: Move[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c]?.c === turn) all.push(...pieceMoves(b, r, c));
  const jumps = all.filter((m) => m.cap);
  return jumps.length ? jumps : all;
}

export type State = { board: Board; turn: 0 | 1; chain: [number, number] | null; winner: 0 | 1 | null };
export const fresh = (): State => ({ board: newBoard(), turn: 0, chain: null, winner: null });

export function apply(s: State, m: Move): State {
  const board = s.board.map((row) => row.map((p) => (p ? { ...p } : null)));
  const p = board[m.from[0]][m.from[1]]!;
  board[m.from[0]][m.from[1]] = null;
  board[m.to[0]][m.to[1]] = p;
  if (m.cap) board[m.cap[0]][m.cap[1]] = null;
  const crowned = !p.k && m.to[0] === (p.c === 0 ? 0 : 7);
  if (crowned) p.k = true;
  // Chain continues only after a capture, if not just crowned and another jump exists.
  if (m.cap && !crowned && pieceMoves(board, m.to[0], m.to[1], true).length) {
    return { ...s, board, chain: m.to };
  }
  const turn = (s.turn === 0 ? 1 : 0) as 0 | 1;
  const next: State = { board, turn, chain: null, winner: null };
  if (!legalMoves(board, turn, null).length) next.winner = s.turn;
  return next;
}
