/**
 * Acorn Pop - a Trouble-style dice race. 32 squares round the board, 4 acorns each.
 * Seat s starts on ring square 3 + 8s. An acorn's progress: -1 = in the pen, 0..31 = on the ring (0 = its start square),
 * 32..35 = the four home slots. Seat ids are board sides (0 top, 1 right, 2 bottom, 3 left).
 */
export const RING = 32, PEN = -1, HOME = 32, LAST = 35;
export type AState = { seats: number[]; pegs: number[][]; turn: number; roll: number | null; tries: number; winner: number | null };
export type AMove = { peg: number; to: number };

export const ringIdx = (seat: number, prog: number) => (3 + 8 * seat + prog) % RING;
export const onRing = (p: number) => p >= 0 && p < RING;

const startTries = (pegs: number[]) => (pegs.some(onRing) ? 1 : 3);   // nobody out yet: three goes at a 6

export function newAcorn(seats: number[]): AState {
  const pegs = Array.from({ length: 4 }, () => [PEN, PEN, PEN, PEN]);
  return { seats, pegs, turn: seats[0], roll: null, tries: 3, winner: null };
}

export function legalMoves(s: AState, die: number): AMove[] {
  const mine = s.pegs[s.turn], out: AMove[] = [];
  let penDone = false;
  mine.forEach((p, peg) => {
    if (p === PEN) {
      if (die === 6 && !penDone && !mine.includes(0)) { out.push({ peg, to: 0 }); penDone = true; }
    } else if (onRing(p)) {
      const to = p + die;
      if (to <= LAST && !mine.includes(to)) out.push({ peg, to });
    }
  });
  return out;
}

/** Everything that happens when an acorn lands: bump anyone sitting there. */
export function applyMove(s: AState, m: AMove, die: number): { state: AState; bumped: { seat: number; peg: number }[] } {
  const pegs = s.pegs.map((a) => [...a]);
  const bumped: { seat: number; peg: number }[] = [];
  pegs[s.turn][m.peg] = m.to;
  if (onRing(m.to)) {
    const at = ringIdx(s.turn, m.to);
    for (const seat of s.seats) if (seat !== s.turn) pegs[seat].forEach((p, peg) => {
      if (onRing(p) && ringIdx(seat, p) === at) { pegs[seat][peg] = PEN; bumped.push({ seat, peg }); }
    });
  }
  const won = pegs[s.turn].every((p) => p >= HOME);
  const next: AState = { ...s, pegs, roll: null, winner: won ? s.turn : null };
  if (won) return { state: next, bumped };
  if (die === 6) return { state: { ...next, tries: 1 }, bumped };               // a 6 earns another roll
  return { state: passTurn(next), bumped };
}

export function passTurn(s: AState): AState {
  const i = s.seats.indexOf(s.turn), turn = s.seats[(i + 1) % s.seats.length];
  return { ...s, turn, roll: null, tries: startTries(s.pegs[turn]) };
}

/** No legal move after a roll: roll again if the player still has tries, otherwise pass. */
export function noMove(s: AState): AState {
  if (s.tries > 1) return { ...s, roll: null, tries: s.tries - 1 };
  return passTurn(s);
}

/* ---------- computer player ---------- */
export function cpuMove(s: AState, die: number, moves: AMove[], level: 1 | 2 | 3): AMove {
  if (level === 1 || moves.length === 1) return moves[Math.floor(Math.random() * moves.length)];
  const mine = s.pegs[s.turn];
  const threatened = (seat: number, p: number) => {
    if (!onRing(p)) return false;
    const at = ringIdx(seat, p);
    return s.seats.some((o) => o !== seat && s.pegs[o].some((q) => onRing(q) && ((at - ringIdx(o, q) + RING) % RING) <= 6 && ((at - ringIdx(o, q) + RING) % RING) > 0));
  };
  const score = (m: AMove) => {
    const from = mine[m.peg];
    let v = m.to * 1.2;
    if (m.to >= HOME) v += 100 + (m.to - HOME) * 2;
    if (from === PEN) v += 55;
    if (onRing(m.to)) {
      const at = ringIdx(s.turn, m.to);
      for (const o of s.seats) if (o !== s.turn) s.pegs[o].forEach((q) => { if (onRing(q) && ringIdx(o, q) === at) v += 60 + q * 1.5; });
      if (threatened(s.turn, m.to)) v -= 18 + m.to * 0.3;
    }
    if (threatened(s.turn, from)) v += 14 + from * 0.3;
    return v + (level === 2 ? Math.random() * 25 : Math.random());
  };
  return moves.reduce((best, m) => (score(m) > score(best) ? m : best));
}

/* ---------- board geometry (9x9 grid, [row, col]) ---------- */
export const RING_RC: [number, number][] = [
  ...Array.from({ length: 9 }, (_, c) => [0, c] as [number, number]),
  ...Array.from({ length: 8 }, (_, r) => [r + 1, 8] as [number, number]),
  ...Array.from({ length: 8 }, (_, c) => [8, 7 - c] as [number, number]),
  ...Array.from({ length: 7 }, (_, r) => [7 - r, 0] as [number, number]),
];
export const HOME_RC: [number, number][][] = [
  [[1, 3], [2, 3], [3, 3], [4, 3]], [[3, 7], [3, 6], [3, 5], [3, 4]],
  [[7, 5], [6, 5], [5, 5], [4, 5]], [[5, 1], [5, 2], [5, 3], [5, 4]],
];
const PEN_BASE: [number, number][] = [[1, 1], [1, 6], [6, 6], [6, 1]];
export const penRC = (seat: number, peg: number): [number, number] => [PEN_BASE[seat][0] + (peg >> 1), PEN_BASE[seat][1] + (peg & 1)];
export const cellOf = (seat: number, peg: number, prog: number): [number, number] =>
  prog === PEN ? penRC(seat, peg) : onRing(prog) ? RING_RC[ringIdx(seat, prog)] : HOME_RC[seat][prog - HOME];
