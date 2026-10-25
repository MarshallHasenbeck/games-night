/**
 * Backgammon. Points are indexed 0–23. Player 0 (berry) moves from high to low and
 * bears off past index 0 (home = 0–5); player 1 (cream) moves low to high (home = 18–23).
 * pts[i] > 0 → player 0 checkers, < 0 → player 1 checkers.
 */
export type BG = {
  pts: number[];
  bar: [number, number];
  off: [number, number];
  turn: 0 | 1;
  roll: number[];   // the dice as rolled (doubles → 4)
  dice: number[];   // dice still to play
  winner: 0 | 1 | null;
};
export type BMove = { from: number | 'bar'; to: number | 'off'; die: number; hit: boolean };

export function newGame(): BG {
  const pts = Array(24).fill(0);
  pts[23] = 2; pts[12] = 5; pts[7] = 3; pts[5] = 5;
  pts[0] = -2; pts[11] = -5; pts[16] = -3; pts[18] = -5;
  return { pts, bar: [0, 0], off: [0, 0], turn: 0, roll: [], dice: [], winner: null };
}

const sgn = (p: 0 | 1) => (p === 0 ? 1 : -1);
const mine = (s: BG, i: number, p: 0 | 1) => s.pts[i] * sgn(p) > 0;
const oppCount = (s: BG, i: number, p: 0 | 1) => Math.max(0, -s.pts[i] * sgn(p));
const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);

export function allHome(s: BG, p: 0 | 1) {
  if (s.bar[p] > 0) return false;
  for (let i = 0; i < 24; i++) if (mine(s, i, p) && (p === 0 ? i > 5 : i < 18)) return false;
  return true;
}

function singleMoves(s: BG, d: number): BMove[] {
  const p = s.turn, out: BMove[] = [];
  if (s.bar[p] > 0) {
    const t = p === 0 ? 24 - d : d - 1;
    if (oppCount(s, t, p) <= 1) out.push({ from: 'bar', to: t, die: d, hit: oppCount(s, t, p) === 1 });
    return out;
  }
  const home = allHome(s, p);
  for (let i = 0; i < 24; i++) {
    if (!mine(s, i, p)) continue;
    const t = p === 0 ? i - d : i + d;
    if (t >= 0 && t <= 23) {
      if (oppCount(s, t, p) <= 1) out.push({ from: i, to: t, die: d, hit: oppCount(s, t, p) === 1 });
    } else if (home) {
      const exact = p === 0 ? t === -1 : t === 24;
      let farther = false;
      for (let j = 0; j < 24; j++) if (mine(s, j, p) && (p === 0 ? j > i : j < i)) farther = true;
      if (exact || !farther) out.push({ from: i, to: 'off', die: d, hit: false });
    }
  }
  return out;
}

function rawMoves(s: BG): BMove[] {
  const out: BMove[] = [];
  for (const d of new Set(s.dice)) out.push(...singleMoves(s, d));
  return out;
}

function step(s: BG, m: BMove): BG {
  const p = s.turn;
  const n: BG = { ...s, pts: [...s.pts], bar: [...s.bar] as [number, number], off: [...s.off] as [number, number], dice: [...s.dice] };
  n.dice.splice(n.dice.indexOf(m.die), 1);
  if (m.from === 'bar') n.bar[p]--; else n.pts[m.from] -= sgn(p);
  if (m.to === 'off') n.off[p]++;
  else {
    if (m.hit) { n.pts[m.to] = 0; n.bar[other(p)]++; }
    n.pts[m.to] += sgn(p);
  }
  if (n.off[p] === 15) n.winner = p;
  return n;
}

function seqMax(s: BG): number {
  if (s.winner !== null) return 0;
  const moves = rawMoves(s);
  if (!moves.length) return 0;
  const seen = new Set<string>();
  let best = 0;
  for (const m of moves) {
    const k = `${m.from}>${m.to}/${m.die}`;
    if (seen.has(k)) continue;
    seen.add(k);
    best = Math.max(best, 1 + seqMax(step(s, m)));
    if (best === s.dice.length) break;
  }
  return best;
}

/** Legal next moves, enforcing "use as many dice as possible; if only one, the larger". */
export function legalMoves(s: BG): BMove[] {
  if (s.winner !== null || !s.dice.length) return [];
  const raw = rawMoves(s);
  if (!raw.length) return [];
  const best = seqMax(s);
  let ok = raw.filter((m) => 1 + seqMax(step(s, m)) === best);
  if (best === 1 && new Set(s.dice).size === 2) {
    const big = Math.max(...s.dice);
    if (ok.some((m) => m.die === big)) ok = ok.filter((m) => m.die === big);
  }
  return ok;
}

export function endTurn(s: BG): BG {
  return { ...s, turn: other(s.turn), dice: [], roll: [] };
}

export function rollDice(s: BG, d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6)): BG {
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  return { ...s, dice, roll: [...dice] };
}

export function applyMove(s: BG, m: BMove): BG {
  const t = step(s, m);
  if (t.winner !== null) return { ...t, dice: [] };
  if (!t.dice.length || !legalMoves(t).length) return endTurn(t);
  return t;
}

/* ---------- computer player ---------- */
export function cpuMove(s: BG, level: 1 | 2 | 3): BMove {
  const moves = legalMoves(s);
  const p = s.turn;
  const score = (m: BMove) => {
    let v = Math.random() * (level === 1 ? 40 : 3);
    if (m.from === 'bar') v += 30;
    if (m.hit) v += 30 + (m.to !== 'off' ? (p === 0 ? 23 - (m.to as number) : (m.to as number)) * 0.6 : 0);
    if (m.to === 'off') v += 28;
    else {
      const landed = Math.abs(s.pts[m.to]);
      if (landed >= 1 && mine(s, m.to, p)) v += 9; // make / stack a point
      else if (!m.hit) v -= 7;                      // lone blot
      v += m.die * 0.5;
    }
    if (m.from !== 'bar' && Math.abs(s.pts[m.from]) === 2) v -= 8; // breaking a point
    if (m.from !== 'bar' && Math.abs(s.pts[m.from]) === 1) v += 3; // clearing a blot
    return v;
  };
  return moves.map((m) => [score(m), m] as const).sort((a, b) => b[0] - a[0])[0][1];
}
