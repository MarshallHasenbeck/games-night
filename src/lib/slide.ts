/**
 * Slide & Swap - a Sorry!-style card race. 60 squares round the edge, 4 pawns each.
 * Seat s (0 top, 1 right, 2 bottom, 3 left) owns ring squares 15s..15s+14. Its pawns leave the start area onto ring square 15s+4.
 * A pawn's progress q: PEN = in the start area, -10..58 on the ring (0 = its exit square, 58 = its turn-in square),
 * 59..63 = the five safe squares, 64 = home (exact count).
 */
import { shuffle } from './playnine';

export const PEN = -100, SAFE = 59, HOME = 64, MIN_Q = -10, RING = 60;
export type SState = {
  seats: number[]; pawns: number[][]; turn: number; deck: number[]; discard: number[];
  card: number | null; remaining: number | null; locked: number | null; winner: number | null;
};
export type SMove = { pawn: number; to: number; kind: 'move' | 'enter' | 'sorry' | 'swap'; target?: { seat: number; pawn: number }; oppTo?: number; label?: string };
export type Slide = { start: number; end: number; owner: number };

export const SLIDES: Slide[] = [0, 1, 2, 3].flatMap((owner) => {
  const b = 15 * owner;
  return [{ start: (b + 1) % RING, end: (b + 4) % RING, owner }, { start: (b + 9) % RING, end: (b + 13) % RING, owner }];
});

const mod = (a: number) => ((a % RING) + RING) % RING;
export const ringOf = (seat: number, q: number) => mod(15 * seat + 4 + q);
/** Progress of `seat` for a pawn standing on ring square idx (idx 15s+3 is one step behind the exit square). */
export const progOf = (seat: number, idx: number) => { const q = mod(idx - 15 * seat - 4); return q === 59 ? -1 : q; };
const onRing = (q: number) => q !== PEN && q <= 58;
const key = (seat: number, q: number) => (onRing(q) ? `r${ringOf(seat, q)}` : `s${q}`);

export const freshDeck = () => {
  const d: number[] = [];
  for (let k = 0; k < 5; k++) d.push(1);
  for (const v of [0, 2, 3, 4, 5, 7, 8, 10, 11, 12]) for (let k = 0; k < 4; k++) d.push(v);
  return shuffle(d);
};

export function newSlide(seats: number[]): SState {
  return { seats, pawns: Array.from({ length: 4 }, () => [PEN, PEN, PEN, PEN]), turn: seats[0], deck: freshDeck(), discard: [], card: null, remaining: null, locked: null, winner: null };
}

export function draw(s: SState): SState {
  let deck = [...s.deck], discard = s.discard;
  if (!deck.length) { deck = shuffle(discard); discard = []; }
  return { ...s, deck: deck.slice(0, -1), discard, card: deck[deck.length - 1] };
}

/** Pawns standing on ring square idx. */
export function occupants(s: SState, idx: number) {
  const out: { seat: number; pawn: number }[] = [];
  for (const seat of s.seats) s.pawns[seat].forEach((q, pawn) => { if (onRing(q) && ringOf(seat, q) === idx) out.push({ seat, pawn }); });
  return out;
}

export function legalMoves(s: SState): SMove[] {
  if (s.card === null || s.winner !== null) return [];
  const t = s.turn, mine = s.pawns[t], out: SMove[] = [];
  const taken = (q: number, except = -1) => mine.some((p, i) => i !== except && p !== PEN && key(t, p) === key(t, q));
  const fwd = (n: number, only?: number) => mine.forEach((q, pawn) => {
    if (q === PEN || q >= HOME || pawn === s.locked || (only !== undefined && pawn !== only)) return;
    const to = q + n;
    if (to <= HOME && (to === HOME || !taken(to, pawn))) out.push({ pawn, to, kind: 'move', label: `+${n}` });
  });
  const back = (n: number) => mine.forEach((q, pawn) => {
    if (q === PEN || q > 58 || pawn === s.locked) return;
    const to = q - n;
    if (to >= MIN_Q && !taken(to, pawn)) out.push({ pawn, to, kind: 'move', label: `-${n}` });
  });
  const enter = () => {
    const pawn = mine.indexOf(PEN);
    if (pawn >= 0 && !taken(0)) out.push({ pawn, to: 0, kind: 'enter', label: 'OUT' });
  };
  if (s.remaining !== null) { fwd(s.remaining); return out; }       // second half of a 7
  const c = s.card;
  if (c === 1 || c === 2) { enter(); fwd(c); }
  else if (c === 3 || c === 5 || c === 8 || c === 12) fwd(c);
  else if (c === 4) back(4);
  else if (c === 10) { fwd(10); back(1); }
  else if (c === 11) {
    fwd(11);
    mine.forEach((q, pawn) => { if (onRing(q)) for (const seat of s.seats) if (seat !== t) s.pawns[seat].forEach((oq, op) => {
      if (onRing(oq)) out.push({ pawn, to: progOf(t, ringOf(seat, oq)), kind: 'swap', target: { seat, pawn: op }, oppTo: progOf(seat, ringOf(t, q)), label: 'SWAP' });
    }); });
  } else if (c === 0) {
    const pawn = mine.indexOf(PEN);
    if (pawn >= 0) for (const seat of s.seats) if (seat !== t) s.pawns[seat].forEach((oq, op) => {
      if (onRing(oq)) out.push({ pawn, to: progOf(t, ringOf(seat, oq)), kind: 'sorry', target: { seat, pawn: op }, label: 'SORRY!' });
    });
  } else if (c === 7) {
    for (let k = 1; k <= 7; k++) mine.forEach((q, pawn) => {
      if (q === PEN || q >= HOME) return;
      const to = q + k;
      if (to > HOME || (to < HOME && taken(to, pawn))) return;
      if (k < 7) {                                   // a split is only offered if the other pawn can use the rest
        const after = play({ ...s, remaining: null }, { pawn, to, kind: 'move' }).state;
        const rest = { ...after, card: 7, remaining: 7 - k, locked: pawn, turn: t };
        if (!legalMoves(rest).length) return;
      }
      out.push({ pawn, to, kind: 'move', label: `+${k}` });
    });
  }
  return out;
}

export type PlayInfo = { bumped: { seat: number; pawn: number }[]; slide: { from: number; to: number } | null };

export function play(s: SState, m: SMove): { state: AfterState; info: PlayInfo } {
  const t = s.turn;
  const pawns = s.pawns.map((a) => [...a]);
  const bumped: { seat: number; pawn: number }[] = [];
  let slide: PlayInfo['slide'] = null;
  const bump = (o: { seat: number; pawn: number }) => { pawns[o.seat][o.pawn] = PEN; bumped.push(o); };
  if (m.kind === 'swap' && m.target) {
    pawns[m.target.seat][m.target.pawn] = m.oppTo!; pawns[t][m.pawn] = m.to;
  } else if (m.kind === 'sorry' && m.target) {
    bump(m.target); pawns[t][m.pawn] = m.to;
  } else {
    const from = pawns[t][m.pawn];
    pawns[t][m.pawn] = m.to;
    if (onRing(m.to)) {
      const idx = ringOf(t, m.to);
      const sl = SLIDES.find((x) => x.start === idx && x.owner !== t);
      const here = (i: number) => occupants({ ...s, pawns }, i).filter((o) => !(o.seat === t && o.pawn === m.pawn));
      if (sl && from !== m.to) {
        for (let i = mod(sl.start + 1); ; i = mod(i + 1)) { here(i).forEach(bump); if (i === sl.end) break; }
        pawns[t][m.pawn] = progOf(t, sl.end);
        slide = { from: m.to, to: pawns[t][m.pawn] };
      } else here(idx).filter((o) => o.seat !== t).forEach(bump);
    }
  }
  const next: SState = { ...s, pawns };
  return { state: finish(next, s, m), info: { bumped, slide } };
}
type AfterState = SState;

/** Decide whose go it is next (or the second half of a 7, or another draw after a 2). */
function finish(next: SState, prev: SState, m: SMove): SState {
  const t = prev.turn;
  if (next.pawns[t].every((q) => q === HOME)) return { ...next, winner: t, card: null, remaining: null, locked: null };
  if (prev.card === 7 && prev.remaining === null && m.to - prev.pawns[t][m.pawn] < 7 && m.kind === 'move') {
    return { ...next, remaining: 7 - (m.to - prev.pawns[t][m.pawn]), locked: m.pawn };
  }
  const discard = [...prev.discard, prev.card!];
  if (prev.card === 2) return { ...next, discard, card: null, remaining: null, locked: null };      // a 2 draws again
  return endTurn({ ...next, discard });
}

export function endTurn(s: SState): SState {
  const i = s.seats.indexOf(s.turn);
  return { ...s, turn: s.seats[(i + 1) % s.seats.length], card: null, remaining: null, locked: null };
}
/** Nothing legal: the card is spent (a 2 still draws again). */
export function skipTurn(s: SState): SState {
  const spent = { ...s, discard: [...s.discard, s.card!], card: null, remaining: null, locked: null };
  return s.card === 2 && s.remaining === null ? spent : endTurn(spent);
}

/* ---------- computer player ---------- */
const worth = (q: number) => (q === PEN ? -8 : q === HOME ? 90 : q >= SAFE ? q + 12 : q);
const value = (s: SState, seat: number) => {
  const mine = s.pawns[seat].reduce((a, q) => a + worth(q), 0);
  const opp = Math.max(...s.seats.filter((o) => o !== seat).map((o) => s.pawns[o].reduce((a, q) => a + worth(q), 0)));
  return mine - opp * 0.8;
};
export function cpuChoose(s: SState, moves: SMove[], level: 1 | 2 | 3): SMove {
  if (level === 1) return moves[Math.floor(Math.random() * moves.length)];
  let best = moves[0], bv = -Infinity;
  for (const m of moves) {
    const v = value(play(s, m).state, s.turn) + Math.random() * (level === 2 ? 14 : 0.5);
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}

/* ---------- board geometry (16x16 grid, [row, col]) ---------- */
export const RING_RC: [number, number][] = [
  ...Array.from({ length: 16 }, (_, c) => [0, c] as [number, number]),
  ...Array.from({ length: 15 }, (_, r) => [r + 1, 15] as [number, number]),
  ...Array.from({ length: 15 }, (_, c) => [15, 14 - c] as [number, number]),
  ...Array.from({ length: 14 }, (_, r) => [14 - r, 0] as [number, number]),
];
const rot = (rc: [number, number], times: number): [number, number] => {
  let [r, c] = rc;
  for (let i = 0; i < times; i++) [r, c] = [c, 15 - r];
  return [r, c];
};
const LOCAL = {
  safe: [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2]] as [number, number][],
  home: [[6, 2], [6, 3], [7, 2], [7, 3]] as [number, number][],
  pen: [[2, 4], [2, 5], [3, 4], [3, 5]] as [number, number][],
};
export const safeRC = (seat: number, i: number) => rot(LOCAL.safe[i], seat);
export const homeRC = (seat: number, i: number) => rot(LOCAL.home[i], seat);
export const penRC = (seat: number, i: number) => rot(LOCAL.pen[i], seat);
/** Where pawn `pawn` of `seat` is drawn; pawns at home stack into the home block in order. */
export function cellOf(seat: number, pawn: number, q: number, all: number[]): [number, number] {
  if (q === PEN) return penRC(seat, pawn);
  if (q === HOME) return homeRC(seat, all.slice(0, pawn).filter((x) => x === HOME).length);
  return q >= SAFE ? safeRC(seat, q - SAFE) : RING_RC[ringOf(seat, q)];
}
