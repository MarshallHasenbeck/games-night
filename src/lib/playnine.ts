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

/** With exactly one face-down card left you may skip: keep it face down and end your turn. */
export const downCount = (g: Slot[]) => g.filter((x) => !x.up).length;
export function skipFlip(r0: Round): Round {
  if (r0.phase !== 'flip' || downCount(r0.grids[r0.turn]) !== 1) return r0;
  return endTurn(clone(r0));
}

/** Changed your mind after taking the discard: return it and choose again (nothing has changed yet). */
export function putBackDiscard(r0: Round): Round {
  if (r0.phase !== 'place' || r0.drawn?.from !== 'discard') return r0;
  const r = clone(r0);
  r.discard.push(r.drawn!.v);
  r.drawn = null;
  r.phase = 'draw';
  return r;
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

/* ---------- computer player ---------- */
export type Action =
  | { t: 'flipSetup'; i: number } | { t: 'drawDeck' } | { t: 'takeDiscard' }
  | { t: 'swap'; i: number } | { t: 'discard' } | { t: 'flipAfter'; i: number } | { t: 'skip' };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const downSlots = (g: Slot[]) => g.map((s, i) => (s.up ? -1 : i)).filter((i) => i >= 0);
const matched = (g: Slot[], i: number) => { const j = (i + 4) % 8; return g[i].up && g[j].up && g[i].v === g[j].v; };
/** A face-down slot whose column partner is face-up with value v. */
const pairSlot = (g: Slot[], v: number) => g.findIndex((s, i) => !s.up && g[(i + 4) % 8].up && g[(i + 4) % 8].v === v);
const worstUp = (g: Slot[]) => {
  let bi = -1;
  g.forEach((s, i) => { if (s.up && !matched(g, i) && (bi < 0 || s.v > g[bi].v)) bi = i; });
  return bi;
};

export function cpuDecide(r: Round, level: 1 | 2 | 3 = 2): Action {
  const g = r.grids[r.turn];
  const rnd = level === 1 && Math.random() < 0.3;
  if (r.phase === 'setup') return { t: 'flipSetup', i: pick(downSlots(g)) };
  if (r.phase === 'draw') {
    const v = r.discard[r.discard.length - 1];
    const w = worstUp(g);
    const good = v <= 2 || pairSlot(g, v) >= 0 || (w >= 0 && g[w].v >= v + 5);
    return !rnd && good ? { t: 'takeDiscard' } : { t: 'drawDeck' };
  }
  if (r.phase === 'flip') {
    const down = downSlots(g);
    if (down.length === 1) {
      // last hidden card: flipping ends my round, so only do it when I expect to be ahead (average unseen card ~4.5)
      const opp = r.grids[r.turn === 0 ? 1 : 0];
      const mine = visibleScore(g) + 4.5, theirs = visibleScore(opp) + downCount(opp) * 4.5;
      if (!(mine + 1 <= theirs) && Math.random() < 0.75) return { t: 'skip' };
    }
    return { t: 'flipAfter', i: pick(down) };
  }
  const c = r.drawn!.v;
  const pair = pairSlot(g, c);
  if (pair >= 0 && !rnd) return { t: 'swap', i: pair };
  const w = worstUp(g);
  if (w >= 0 && g[w].v >= c + 4 && !rnd) return { t: 'swap', i: w };
  const down = downSlots(g);
  if (r.drawn!.from === 'deck') {
    if (c <= 4 && down.length && !rnd) return { t: 'swap', i: pick(down) };
    return { t: 'discard' };
  }
  if (w >= 0 && g[w].v > c) return { t: 'swap', i: w };
  return { t: 'swap', i: down.length ? pick(down) : g.findIndex((_, i) => !matched(g, i)) };
}

export function applyAction(r: Round, a: Action): Round {
  switch (a.t) {
    case 'flipSetup': return flipSetup(r, a.i);
    case 'drawDeck': return drawDeck(r);
    case 'takeDiscard': return takeDiscard(r);
    case 'swap': return swapSlot(r, a.i);
    case 'discard': return discardDrawn(r);
    case 'flipAfter': return flipAfterDiscard(r, a.i);
    case 'skip': return skipFlip(r);
  }
}
