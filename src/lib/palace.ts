/**
 * Palace (house rules). Pure state machine - no React.
 *
 * Deal: 2 face-down, 2 face-up (on top of the face-down), 3 in hand; the rest is the draw pile. One 52-card deck, ace high.
 * Before play each player may swap face-up cards with cards in hand. Play a card (or several of the same rank) equal to or higher
 * than the pile. Special cards: 2 wild, 3 wild + reverse, 8 window (wild, but the next player must beat the card UNDER the 8, or play
 * a wild), 10 burns the pile and gives another turn. Four of a kind on top of the pile gives another turn (no burn).
 * The hand is topped back up to 3 after each play while the draw pile lasts. Can't (or won't) play: take the whole pile.
 * Hand first, then face-up, then face-down (blind; if it can't be played it is picked up with the pile).
 * First player out wins; the rest play on until one is left, who loses.
 */
export type PCard = { id: number; r: number }; // r: 2..14 (11 J, 12 Q, 13 K, 14 A)
export type Player = { hand: PCard[]; up: PCard[]; down: PCard[] };
export type Phase = 'swap' | 'play' | 'over';
export type Ev = 'wild' | 'reverse' | 'window' | 'burn' | 'quad' | 'again' | 'pickup' | 'blindfail' | 'out';
export type PState = {
  n: number; players: Player[]; deck: PCard[]; pile: PCard[]; burned: number;
  turn: number; dir: 1 | -1; phase: Phase; ready: boolean[]; finished: number[]; loser: number | null;
  /** what the last action did (for toasts and sounds) */
  events: Ev[];
  /** ids of cards moved by the last action (for animations) */
  moved: number[];
};

export const RANK_LABEL = (r: number) => (r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : r === 14 ? 'A' : String(r));
export const isWild = (r: number) => r === 2 || r === 3 || r === 8 || r === 10;
/** short badge for the special cards */
export const SPECIAL: Record<number, string> = { 2: 'WILD', 3: 'REVERSE', 8: 'WINDOW', 10: 'BURN' };

type Rng = () => number;
const shuffle = <T,>(a: T[], rng: Rng): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

export function newGame(n: number, rng: Rng = Math.random): PState {
  const deck: PCard[] = [];
  let id = 0;
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push({ id: id++, r });
  const d = shuffle(deck, rng);
  const players: Player[] = Array.from({ length: n }, () => ({ hand: [], up: [], down: [] }));
  for (const p of players) { p.down = d.splice(0, 2); p.up = d.splice(0, 2); p.hand = d.splice(0, 3); }
  return { n, players, deck: d, pile: [], burned: 0, turn: 0, dir: 1, phase: 'swap', ready: Array(n).fill(false), finished: [], loser: null, events: [], moved: [] };
}

const clone = (s: PState): PState => ({
  ...s, players: s.players.map((p) => ({ hand: p.hand.slice(), up: p.up.slice(), down: p.down.slice() })), deck: s.deck.slice(), pile: s.pile.slice(),
  ready: s.ready.slice(), finished: s.finished.slice(), events: [], moved: [],
});

export const active = (s: PState) => Array.from({ length: s.n }, (_, i) => i).filter((i) => !s.finished.includes(i));

/** the rank that must be met or beaten; 0 means anything goes */
export function need(pile: PCard[]): number {
  for (let i = pile.length - 1; i >= 0; i--) {
    const r = pile[i].r;
    if (r === 2 || r === 3) return 0; // wild on top: anything
    if (r === 8) continue;            // window: look at the card under it
    return r;
  }
  return 0;
}
export const canPlayRank = (pile: PCard[], r: number) => isWild(r) || r >= need(pile);

export type Source = 'hand' | 'up' | 'down';
export const sourceOf = (p: Player): Source => (p.hand.length ? 'hand' : p.up.length ? 'up' : 'down');

/** ranks the current player may play right now (never for the blind face-down stage) */
export function legalRanks(s: PState): number[] {
  if (s.phase !== 'play') return [];
  const p = s.players[s.turn];
  const src = sourceOf(p);
  if (src === 'down') return [];
  const ranks = new Set(p[src].map((c) => c.r));
  return [...ranks].filter((r) => canPlayRank(s.pile, r)).sort((a, b) => a - b);
}

/** next player in play order, skipping players who are out */
function nextActive(s: PState, from: number, dir: 1 | -1): number {
  let i = from;
  for (let k = 0; k < s.n; k++) {
    i = (i + dir + s.n) % s.n;
    if (!s.finished.includes(i)) return i;
  }
  return from;
}

function refill(s: PState, p: number) {
  const h = s.players[p].hand;
  while (h.length < 3 && s.deck.length) h.push(s.deck.shift()!);
}

/** after a play: special effects, going out, and whose turn is next */
function resolve(s: PState, p: number, rank: number): PState {
  const ev = s.events;
  let again = false;
  if (rank === 2) ev.push('wild');
  if (rank === 8) ev.push('window');
  if (rank === 10) { s.burned += s.pile.length; s.pile = []; ev.push('burn'); again = true; }
  else {
    const L = s.pile.length;
    if (L >= 4 && s.pile.slice(L - 4).every((c) => c.r === rank)) { ev.push('quad'); again = true; }
  }
  if (rank === 3) {
    s.dir = (s.dir * -1) as 1 | -1;
    ev.push('reverse');
    if (active(s).length === 2) again = true; // with two left, reversing means you go again
  }
  const pl = s.players[p];
  if (!pl.hand.length && !pl.up.length && !pl.down.length) {
    s.finished.push(p);
    ev.push('out');
    const left = active(s);
    if (left.length <= 1) { s.phase = 'over'; s.loser = left.length ? left[0] : null; return s; }
    s.turn = nextActive(s, p, s.dir);
    return s;
  }
  if (again) { ev.push('again'); s.turn = p; } else s.turn = nextActive(s, p, s.dir);
  return s;
}

/** play the cards with these ids (all same rank, from the current source: hand, or face-up once the hand is gone) */
export function play(prev: PState, ids: number[]): PState {
  const s = clone(prev);
  if (s.phase !== 'play' || !ids.length) return prev;
  const p = s.turn, pl = s.players[p], src = sourceOf(pl);
  if (src === 'down') return prev;
  const cards = ids.map((id) => pl[src].find((c) => c.id === id));
  if (cards.some((c) => !c) || new Set(ids).size !== ids.length) return prev;
  const rank = cards[0]!.r;
  if (cards.some((c) => c!.r !== rank) || !canPlayRank(s.pile, rank)) return prev;
  pl[src] = pl[src].filter((c) => !ids.includes(c.id));
  s.pile.push(...(cards as PCard[]));
  s.moved = ids.slice();
  refill(s, p);
  return resolve(s, p, rank);
}

/** play a blind face-down card by position; if it can't be played it is picked up with the pile */
export function playBlind(prev: PState, idx: number): PState {
  const s = clone(prev);
  if (s.phase !== 'play') return prev;
  const p = s.turn, pl = s.players[p];
  if (sourceOf(pl) !== 'down' || idx < 0 || idx >= pl.down.length) return prev;
  const card = pl.down[idx];
  const ok = canPlayRank(s.pile, card.r);
  pl.down.splice(idx, 1);
  s.pile.push(card);
  s.moved = [card.id];
  if (ok) return resolve(s, p, card.r);
  pl.hand.push(...s.pile);
  s.moved = s.pile.map((c) => c.id);
  s.pile = [];
  s.events.push('blindfail', 'pickup');
  s.turn = nextActive(s, p, s.dir);
  return s;
}

export function pickUp(prev: PState): PState {
  const s = clone(prev);
  if (s.phase !== 'play' || !s.pile.length) return prev;
  const p = s.turn;
  s.players[p].hand.push(...s.pile);
  s.moved = s.pile.map((c) => c.id);
  s.pile = [];
  s.events.push('pickup');
  s.turn = nextActive(s, p, s.dir);
  return s;
}

/** swap phase */
export function swap(prev: PState, p: number, upIdx: number, handIdx: number): PState {
  if (prev.phase !== 'swap' || prev.ready[p]) return prev;
  const s = clone(prev);
  const pl = s.players[p];
  if (upIdx < 0 || upIdx >= pl.up.length || handIdx < 0 || handIdx >= pl.hand.length) return prev;
  [pl.up[upIdx], pl.hand[handIdx]] = [pl.hand[handIdx], pl.up[upIdx]];
  return s;
}
export function setReady(prev: PState, p: number, rng: Rng = Math.random): PState {
  if (prev.phase !== 'swap' || prev.ready[p]) return prev;
  const s = clone(prev);
  s.ready[p] = true;
  if (s.ready.every(Boolean)) { s.phase = 'play'; s.turn = Math.floor(rng() * s.n); }
  return s;
}

/* ---------- computer player ---------- */
const keepValue = (r: number) => (r === 2 ? 15 : r === 10 ? 15.5 : r === 3 ? 11 : r === 8 ? 9.5 : r);

/** CPU swaps its best cards face-up (they can't be taken away) and keeps the low ones in hand */
export function cpuSwap(prev: PState, p: number, rng: Rng = Math.random): PState {
  let s = prev;
  const all = [...s.players[p].hand, ...s.players[p].up].sort((a, b) => keepValue(b.r) - keepValue(a.r));
  const want = new Set(all.slice(0, 2).map((c) => c.id));
  for (let k = 0; k < 2; k++) {
    const pl = s.players[p];
    const ui = pl.up.findIndex((c) => !want.has(c.id));
    const hi = pl.hand.findIndex((c) => want.has(c.id));
    if (ui >= 0 && hi >= 0) s = swap(s, p, ui, hi);
  }
  return setReady(s, p, rng);
}

export type Action = { t: 'play'; ids: number[] } | { t: 'pickup' } | { t: 'blind'; idx: number };

export function cpuAction(s: PState, level: 1 | 2 | 3, rng: Rng = Math.random): Action {
  const pl = s.players[s.turn], src = sourceOf(pl);
  if (src === 'down') return { t: 'blind', idx: Math.floor(rng() * pl.down.length) };
  const ranks = legalRanks(s);
  if (!ranks.length) return { t: 'pickup' };
  const idsOf = (r: number) => pl[src].filter((c) => c.r === r).map((c) => c.id);
  if (level === 1) return { t: 'play', ids: idsOf(ranks[Math.floor(rng() * ranks.length)]) };
  const plain = ranks.filter((r) => !isWild(r));
  if (s.pile.length >= 6 && ranks.includes(10)) return { t: 'play', ids: idsOf(10) }; // a big pile is worth burning
  if (plain.length) return { t: 'play', ids: idsOf(plain[0]) };                      // lowest ordinary card, all copies
  for (const r of [2, 8, 3, 10]) if (ranks.includes(r)) return { t: 'play', ids: idsOf(r) };
  return { t: 'pickup' };
}

export function apply(s: PState, a: Action): PState {
  return a.t === 'play' ? play(s, a.ids) : a.t === 'blind' ? playBlind(s, a.idx) : pickUp(s);
}

/** number of cards still in the game (for the invariant tests) */
export const totalCards = (s: PState) =>
  s.deck.length + s.pile.length + s.burned + s.players.reduce((a, p) => a + p.hand.length + p.up.length + p.down.length, 0);
