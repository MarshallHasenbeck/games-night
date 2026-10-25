export type Slot = { v: number; up: boolean };
export type Drawn = { v: number; from: 'deck' | 'discard' };
export type Phase = 'setup' | 'draw' | 'place' | 'flip' | 'roundOver';

export type Round = {
  grids: [Slot[], Slot[]];
  deck: number[];
  discard: number[];
  turn: 0 | 1;
  phase: Phase;
  drawn: Drawn | null;
  setupFlips: [number, number];
  finisher: 0 | 1 | null;
};

export const HOLES = 9;

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** 108 cards: 0–12 ×8, plus four Hole-in-One (-5) cards. */
const freshDeck = () => {
  const d: number[] = [-5, -5, -5, -5];
  for (let n = 0; n <= 12; n++) for (let k = 0; k < 8; k++) d.push(n);
  return shuffle(d);
};

export function deal(starter: 0 | 1): Round {
  const deck = freshDeck();
  const mk = (): Slot[] => Array.from({ length: 8 }, () => ({ v: deck.pop()!, up: false }));
  const grids: [Slot[], Slot[]] = [mk(), mk()];
  const discard = [deck.pop()!];
  return { grids, deck, discard, turn: starter, phase: 'setup', drawn: null, setupFlips: [0, 0], finisher: null };
}

/** Grid is 2 rows × 4 columns; slot i sits in column i % 4. A matching column scores 0. */
export function gridScore(g: Slot[], onlyUp = true): number {
  let t = 0;
  for (let c = 0; c < 4; c++) {
    const a = g[c], b = g[c + 4];
    if (onlyUp && !(a.up && b.up)) {
      t += (a.up ? a.v : 0) + (b.up ? b.v : 0);
    } else if (a.v === b.v) {
      // pair cancels
    } else {
      t += a.v + b.v;
    }
  }
  return t;
}
/** Score of cards that are visible (a column only cancels if both are face up). */
export const visibleScore = (g: Slot[]) => gridScore(g, true);
export const finalScore = (g: Slot[]) => gridScore(g, false);

const other = (t: 0 | 1): 0 | 1 => (t === 0 ? 1 : 0);
const clone = (r: Round): Round => ({
  ...r,
  grids: [r.grids[0].map((s) => ({ ...s })), r.grids[1].map((s) => ({ ...s }))],
  deck: [...r.deck],
  discard: [...r.discard],
  setupFlips: [...r.setupFlips],
});

function refill(r: Round) {
  if (r.deck.length === 0) {
    const top = r.discard.pop()!;
    r.deck = shuffle(r.discard);
    r.discard = [top];
  }
}

function endTurn(r: Round): Round {
  const me = r.turn;
  r.drawn = null;
  if (r.finisher === null && r.grids[me].every((s) => s.up)) r.finisher = me;
  const next = other(me);
  if (r.finisher !== null && next === r.finisher) {
    r.grids.forEach((g) => g.forEach((s) => (s.up = true)));
    r.phase = 'roundOver';
  } else {
    r.turn = next;
    r.phase = 'draw';
  }
  return r;
}

export function flipSetup(r0: Round, i: number): Round {
  if (r0.phase !== 'setup') return r0;
  const r = clone(r0);
  const slot = r.grids[r.turn][i];
  if (slot.up) return r0;
  slot.up = true;
  r.setupFlips[r.turn]++;
  if (r.setupFlips[r.turn] === 2) {
    if (r.setupFlips[other(r.turn)] === 2) {
      r.phase = 'draw'; // same player who started the hole goes first
      r.turn = r.setupFlips[0] === 2 && r.setupFlips[1] === 2 ? startPlayer(r) : r.turn;
    } else r.turn = other(r.turn);
  }
  return r;
}

/** Higher visible total goes second, so the lower starts (ties: player 1). */
function startPlayer(r: Round): 0 | 1 {
  const a = visibleScore(r.grids[0]), b = visibleScore(r.grids[1]);
  return a <= b ? 0 : 1;
}

export function drawDeck(r0: Round): Round {
  if (r0.phase !== 'draw') return r0;
  const r = clone(r0);
  refill(r);
  r.drawn = { v: r.deck.pop()!, from: 'deck' };
  r.phase = 'place';
  return r;
}

export function takeDiscard(r0: Round): Round {
  if (r0.phase !== 'draw') return r0;
  const r = clone(r0);
  r.drawn = { v: r.discard.pop()!, from: 'discard' };
  r.phase = 'place';
  return r;
}

export function swapSlot(r0: Round, i: number): Round {
  if (r0.phase !== 'place' || !r0.drawn) return r0;
  const r = clone(r0);
  const slot = r.grids[r.turn][i];
  r.discard.push(slot.v);
  slot.v = r.drawn!.v;
  slot.up = true;
  return endTurn(r);
}

/** Only legal when the card came from the deck: discard it, then flip a face-down card. */
export function discardDrawn(r0: Round): Round {
  if (r0.phase !== 'place' || r0.drawn?.from !== 'deck') return r0;
  const r = clone(r0);
  r.discard.push(r.drawn!.v);
  r.drawn = null;
  if (r.grids[r.turn].every((s) => s.up)) return endTurn(r);
  r.phase = 'flip';
  return r;
}

export function flipAfterDiscard(r0: Round, i: number): Round {
  if (r0.phase !== 'flip') return r0;
  const r = clone(r0);
  const slot = r.grids[r.turn][i];
  if (slot.up) return r0;
  slot.up = true;
  return endTurn(r);
}
