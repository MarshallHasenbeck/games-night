export type Tile = [number, number];
export type Side = 'L' | 'R';
export type DState = {
  hands: [Tile[], Tile[]];
  yard: Tile[];
  chain: Tile[];
  turn: 0 | 1;
  passes: number;
  phase: 'play' | 'roundOver';
  result: { winner: 0 | 1 | 'draw'; points: number } | null;
};
export const TARGET = 100;

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const pips = (h: Tile[]) => h.reduce((a, t) => a + t[0] + t[1], 0);

export function newRound(starter: 0 | 1): DState {
  const all: Tile[] = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]);
  const deck = shuffle(all);
  return { hands: [deck.splice(0, 7), deck.splice(0, 7)], yard: deck, chain: [], turn: starter, passes: 0, phase: 'play', result: null };
}

export const ends = (chain: Tile[]): [number, number] | null => (chain.length ? [chain[0][0], chain[chain.length - 1][1]] : null);

export function sidesFor(t: Tile, chain: Tile[]): Side[] {
  const e = ends(chain);
  if (!e) return ['R'];
  const out: Side[] = [];
  if (t[0] === e[0] || t[1] === e[0]) out.push('L');
  if (t[0] === e[1] || t[1] === e[1]) out.push('R');
  return out;
}
export const playable = (s: DState, p: 0 | 1) => s.hands[p].map((t, i) => (sidesFor(t, s.chain).length ? i : -1)).filter((i) => i >= 0);

function finish(s: DState, winner: 0 | 1 | 'draw', points: number): DState {
  return { ...s, phase: 'roundOver', result: { winner, points } };
}

export function play(s: DState, idx: number, side: Side): DState {
  const p = s.turn;
  const t = s.hands[p][idx];
  if (!sidesFor(t, s.chain).includes(side)) return s;
  const hand = s.hands[p].filter((_, i) => i !== idx);
  const chain = [...s.chain];
  if (!chain.length) chain.push(t);
  else if (side === 'L') chain.unshift(t[1] === chain[0][0] ? t : [t[1], t[0]]);
  else chain.push(t[0] === chain[chain.length - 1][1] ? t : [t[1], t[0]]);
  const hands: [Tile[], Tile[]] = p === 0 ? [hand, s.hands[1]] : [s.hands[0], hand];
  const n: DState = { ...s, hands, chain, passes: 0 };
  if (!hand.length) return finish(n, p, pips(hands[p === 0 ? 1 : 0]));
  return { ...n, turn: p === 0 ? 1 : 0 };
}

export function draw(s: DState): DState {
  if (!s.yard.length) return s;
  const yard = [...s.yard];
  const t = yard.pop()!;
  const p = s.turn;
  const hands: [Tile[], Tile[]] = p === 0 ? [[...s.hands[0], t], s.hands[1]] : [s.hands[0], [...s.hands[1], t]];
  return { ...s, yard, hands };
}

export function pass(s: DState): DState {
  const passes = s.passes + 1;
  if (passes >= 2) {
    const a = pips(s.hands[0]), b = pips(s.hands[1]);
    return finish({ ...s, passes }, a === b ? 'draw' : a < b ? 0 : 1, Math.abs(a - b));
  }
  return { ...s, passes, turn: s.turn === 0 ? 1 : 0 };
}

export const mustDraw = (s: DState) => s.phase === 'play' && !playable(s, s.turn).length && s.yard.length > 0;
export const mustPass = (s: DState) => s.phase === 'play' && !playable(s, s.turn).length && s.yard.length === 0;

export function cpuPlay(s: DState, level: 1 | 2 | 3): { idx: number; side: Side } {
  const opts: { idx: number; side: Side; v: number }[] = [];
  const e = ends(s.chain);
  s.hands[s.turn].forEach((t, idx) => sidesFor(t, s.chain).forEach((side) => {
    let v = t[0] + t[1] + (t[0] === t[1] ? 3 : 0);
    if (level >= 2 && e) {
      // prefer leaving ends we hold plenty of tiles for
      const open = side === 'L' ? (t[0] === e[0] ? t[1] : t[0]) : (t[1] === e[1] ? t[0] : t[1]);
      v += s.hands[s.turn].filter((x, j) => j !== idx && (x[0] === open || x[1] === open)).length * 2;
    }
    opts.push({ idx, side, v: v + Math.random() * (level === 1 ? 12 : 1) });
  }));
  return opts.sort((a, b) => b.v - a.v)[0];
}
