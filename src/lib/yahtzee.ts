export const CATS = [
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
  'threeKind', 'fourKind', 'fullHouse', 'smStraight', 'lgStraight', 'yahtzee', 'chance',
] as const;
export type Cat = (typeof CATS)[number];
export const LABEL: Record<Cat, string> = {
  ones: 'Ones', twos: 'Twos', threes: 'Threes', fours: 'Fours', fives: 'Fives', sixes: 'Sixes',
  threeKind: '3 of a Kind', fourKind: '4 of a Kind', fullHouse: 'Full House',
  smStraight: 'Small Straight', lgStraight: 'Large Straight', yahtzee: 'Yahtzee', chance: 'Chance',
};
export const UPPER = CATS.slice(0, 6);
export const LOWER = CATS.slice(6);
export type Card = Record<Cat, number | null>;
export const emptyCard = (): Card => Object.fromEntries(CATS.map((c) => [c, null])) as Card;

const sum = (d: number[]) => d.reduce((a, b) => a + b, 0);
const counts = (d: number[]) => [1, 2, 3, 4, 5, 6].map((n) => d.filter((x) => x === n).length);

export const isYahtzee = (d: number[]) => d.every((x) => x === d[0]);

/** Score for putting `d` in `cat`. `joker` = extra Yahtzee with its upper box filled (fixed-value boxes pay in full). */
export function scoreFor(cat: Cat, d: number[], joker = false): number {
  const c = counts(d);
  const i = UPPER.indexOf(cat as (typeof UPPER)[number]);
  if (i >= 0) return c[i] * (i + 1);
  switch (cat) {
    case 'threeKind': return c.some((n) => n >= 3) ? sum(d) : 0;
    case 'fourKind': return c.some((n) => n >= 4) ? sum(d) : 0;
    case 'fullHouse': return joker || (c.includes(3) && c.includes(2)) ? 25 : 0;
    case 'smStraight': {
      const s = new Set(d);
      return joker || [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].some((r) => r.every((n) => s.has(n))) ? 30 : 0;
    }
    case 'lgStraight': {
      const s = new Set(d);
      return joker || (s.size === 5 && (!s.has(1) || !s.has(6))) ? 40 : 0;
    }
    case 'yahtzee': return isYahtzee(d) ? 50 : 0;
    default: return sum(d);
  }
}

export const upperSum = (card: Card) => UPPER.reduce((a, c) => a + (card[c] ?? 0), 0);
export const upperBonus = (card: Card) => (upperSum(card) >= 63 ? 35 : 0);
export const total = (card: Card, yahtzeeBonuses: number) =>
  CATS.reduce((a, c) => a + (card[c] ?? 0), 0) + upperBonus(card) + yahtzeeBonuses * 100;

/* ---------- computer player ---------- */
const PAR: Record<Cat, number> = {
  ones: 2.1, twos: 5.3, threes: 8.6, fours: 12.2, fives: 15.6, sixes: 19.2,
  threeKind: 21.7, fourKind: 13.1, fullHouse: 22.9, smStraight: 29.5, lgStraight: 32.7, yahtzee: 16.9, chance: 22,
};
const open = (card: Card) => CATS.filter((c) => card[c] === null);
const rand6 = () => 1 + Math.floor(Math.random() * 6);
const isJoker = (card: Card, d: number[]) => isYahtzee(d) && card.yahtzee === 50 && card[UPPER[d[0] - 1]] !== null;

function bestValue(card: Card, d: number[]): number {
  const joker = isJoker(card, d);
  return Math.max(...open(card).map((c) => scoreFor(c, d, joker) - PAR[c]));
}
export function cpuCategory(card: Card, d: number[]): Cat {
  const joker = isJoker(card, d);
  let best = open(card)[0], bv = -Infinity;
  for (const c of open(card)) {
    const v = scoreFor(c, d, joker) - PAR[c];
    if (v > bv) { bv = v; best = c; }
  }
  return best;
}
/** Returns a hold mask, or null if the CPU should stop rolling and score. */
export function cpuHolds(card: Card, d: number[], level: 1 | 2 | 3): boolean[] | null {
  if (level === 1 && Math.random() < 0.25) return d.map(() => Math.random() < 0.4);
  const samples = level === 3 ? 80 : 30;
  let bestAvg = bestValue(card, d), bestMask: boolean[] | null = null;
  for (let m = 0; m < 31; m++) {
    const held = d.map((_, i) => !!(m & (1 << i)));
    let sum = 0;
    for (let s = 0; s < samples; s++) sum += bestValue(card, d.map((x, i) => (held[i] ? x : rand6())));
    const avg = sum / samples;
    if (avg > bestAvg + 0.01) { bestAvg = avg; bestMask = held; }
  }
  return bestMask;
}
