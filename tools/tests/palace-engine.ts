import { newGame, play, playBlind, pickUp, swap, setReady, legalRanks, need, canPlayRank, cpuAction, cpuSwap, apply, totalCards, active, type PState, type PCard } from '../../src/lib/palace';

let nid = 1000;
const c = (r: number): PCard => ({ id: nid++, r });
const fail = (m: string): never => { throw new Error(m); };
const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };

/** a play-phase state with chosen hands/pile; extra filler so nobody is out */
function mk(n: number, hands: number[][], pile: number[] = [], opts: { deck?: number; up?: number[][]; down?: number[][]; turn?: number } = {}): PState {
  const s = newGame(n, () => 0.5);
  s.phase = 'play'; s.ready = Array(n).fill(true); s.turn = opts.turn ?? 0;
  s.players.forEach((p, i) => {
    p.hand = (hands[i] ?? [9, 9, 9]).map(c);
    p.up = (opts.up?.[i] ?? [9, 9]).map(c);
    p.down = (opts.down?.[i] ?? [9, 9]).map(c);
  });
  s.pile = pile.map(c);
  s.deck = Array.from({ length: opts.deck ?? 10 }, () => c(5));
  return s;
}
const ids = (s: PState, p: number, r: number, n = 99) => s.players[p].hand.filter((x) => x.r === r).slice(0, n).map((x) => x.id);

// --- deal
{
  for (const n of [2, 3, 4]) {
    const s = newGame(n);
    eq(totalCards(s), 52, 'deck size');
    s.players.forEach((p) => { eq([p.down.length, p.up.length, p.hand.length], [2, 2, 3], 'deal shape'); });
    eq(s.phase, 'swap', 'starts in swap');
  }
}
// --- swap phase then ready starts the game
{
  let s = newGame(2);
  const before = s.players[0].up[0].id, hv = s.players[0].hand[1].id;
  s = swap(s, 0, 0, 1);
  eq([s.players[0].up[0].id, s.players[0].hand[1].id], [hv, before], 'swap exchanges cards');
  s = setReady(s, 0);
  eq(s.phase, 'swap', 'waits for everyone');
  eq(swap(s, 0, 0, 0), s, 'no swapping once ready');
  s = setReady(s, 1, () => 0.9);
  eq([s.phase, s.turn], ['play', 1], 'both ready -> play, random starter');
}
// --- higher / equal rule and wilds
{
  eq(canPlayRank(mk(2, []).pile, 3), true, 'empty pile: anything');
  const p = mk(2, [], [7].map((x) => x));
  eq(canPlayRank(p.pile, 6), false, '6 on 7 not allowed');
  eq(canPlayRank(p.pile, 7), true, '7 on 7 allowed (equal)');
  eq(canPlayRank(p.pile, 9), true, '9 on 7 allowed');
  for (const w of [2, 3, 8, 10]) eq(canPlayRank(p.pile, w), true, `wild ${w}`);
  eq(need([c(5), c(2)]), 0, 'after a 2 anything goes');
  eq(need([c(5), c(3)]), 0, 'after a 3 anything goes');
}
// --- window (8): next player must beat the card UNDER the 8, or play a wild
{
  let s = mk(2, [[8, 4, 4], [6, 5, 9]], [7]);
  s = play(s, ids(s, 0, 8));
  eq(need(s.pile), 7, 'window requires the card under the 8');
  eq(legalRanks(s), [9], 'only 9 (>= 7) is legal for P2 here');
  const s2 = mk(2, [[8], [6, 5, 2]], [7]); // wilds still work
  const t = play(s2, ids(s2, 0, 8));
  eq(legalRanks(t), [2], 'a wild answers a window');
  // two 8s stacked: still look under both
  const s3 = mk(2, [[8, 8, 4]], [9]);
  const t3 = play(s3, ids(s3, 0, 8));
  eq(need(t3.pile), 9, 'multiple 8s: need is the card under them');
  // window on an empty pile / on a wild: anything
  eq(need([c(8)]), 0, 'lone 8: anything');
  eq(need([c(2), c(8)]), 0, '8 on a 2: anything');
}
// --- 10 burns and the same player goes again
{
  let s = mk(2, [[10, 4, 5], [6, 6, 6]], [7, 7, 7], { turn: 0 });
  s = play(s, ids(s, 0, 10));
  eq([s.pile.length, s.burned, s.turn], [0, 3 + 1, 0], '10 burns pile (incl. the 10) and keeps the turn');
  eq(s.events.includes('burn') && s.events.includes('again'), true, 'burn + again events');
  eq(need(s.pile), 0, 'after a burn anything is playable');
}
// --- four of a kind: extra turn, NOT a burn
{
  let s = mk(2, [[6, 6, 6, 6], [9, 9, 9]], [5]);
  s.players[0].hand = [6, 6, 6, 6].map(c);
  s = play(s, s.players[0].hand.map((x) => x.id));
  eq([s.turn, s.pile.length], [0, 5], 'four of a kind: same player again, pile stays');
  eq(s.events.includes('quad'), true, 'quad event');
  // completed across turns counts too
  let t = mk(2, [[6, 4, 4], [9, 9, 9]], [6, 6, 6]);
  t = play(t, ids(t, 0, 6));
  eq(t.turn, 0, 'fourth six on top of three sixes gives another turn');
}
// --- multiples of one rank, rank must match and be legal
{
  const s = mk(2, [[7, 7, 9]], [5]);
  const two = ids(s, 0, 7);
  eq(play(s, two).pile.length, 3, 'two 7s play together');
  eq(play(s, [s.players[0].hand[0].id, s.players[0].hand[2].id]), s, 'mixed ranks rejected');
  const low = mk(2, [[4, 4, 9]], [8, 8, 11]);
  eq(play(low, ids(low, 0, 4)), low, 'too-low play rejected');
}
// --- 3: wild + reverse; with two players it is another turn
{
  let s = mk(3, [[3, 4, 4], [9, 9, 9], [9, 9, 9]], [12], { turn: 0 });
  s = play(s, ids(s, 0, 3));
  eq([s.dir, s.turn], [-1, 2], '3 reverses order of play (P1 -> P3)');
  eq(need(s.pile), 0, '3 is wild: anything next');
  let t = mk(2, [[3, 4, 4], [9, 9, 9]], [12], { turn: 0 });
  t = play(t, ids(t, 0, 3));
  eq(t.turn, 0, 'two players: reverse = go again');
}
// --- hand topped back up to 3 only while the draw pile lasts, never discards down
{
  let s = mk(2, [[5, 5, 9], [9, 9, 9]], [4], { deck: 5 });
  s = play(s, ids(s, 0, 5));
  eq([s.players[0].hand.length, s.deck.length], [3, 3], 'draws back to three');
  let t = mk(2, [[9, 9, 9, 6]], [4], { deck: 5 });
  t = play(t, ids(t, 0, 6));
  eq(t.players[0].hand.length, 3, 'hand of four plays one, no draw needed');
  let u = mk(2, [[9, 9, 9, 6, 6]], [4], { deck: 5 });
  u = play(u, ids(u, 0, 6, 1));
  eq([u.players[0].hand.length, u.deck.length], [4, 5], 'never draw if holding three or more');
  let e = mk(2, [[5, 9]], [4], { deck: 0 });
  e = play(e, ids(e, 0, 5));
  eq(e.players[0].hand.length, 1, 'no draw pile left: hand just shrinks');
}
// --- pick up takes the whole pile and passes the turn
{
  let s = mk(2, [[4, 4, 4], [9, 9, 9]], [8, 11, 12]);
  s = pickUp(s);
  eq([s.players[0].hand.length, s.pile.length, s.turn], [6, 0, 1], 'pick up takes pile, passes turn');
  eq(pickUp(s), s, 'cannot pick up an empty pile');
}
// --- face-up stage after the hand is empty, then blind face-down
{
  const s = mk(2, [[], [9, 9, 9]], [4], { deck: 0, up: [[8, 8], [9, 9]], down: [[3, 5], [9, 9]] });
  const t = s.players[0].up.map((x) => x.id);
  const r = play(s, t);
  eq(r.players[0].up.length, 0, 'face-up cards play once the hand is empty (and multiples together)');
  const b = mk(2, [[], [9, 9, 9]], [12], { deck: 0, up: [[], [9, 9]], down: [[3, 5], [9, 9]] });
  eq(legalRanks(b), [], 'no ranks to choose in the blind stage');
  const okB = playBlind(b, 0); // a 3 is wild: playable on a queen
  eq(okB.pile.length, 2, 'blind wild card is played');
  const badB = playBlind(b, 1); // a 5 on a queen: picked up with the pile
  eq([badB.pile.length, badB.players[0].hand.length, badB.turn], [0, 2, 1], 'bad blind card is picked up with the pile');
}
// --- going out: first out wins, last one loses (2 and 3+ players)
{
  let s = mk(2, [[9], [4, 4, 4]], [5], { deck: 0, up: [[], [9, 9]], down: [[], [9, 9]] });
  s = play(s, ids(s, 0, 9));
  eq([s.phase, s.finished, s.loser], ['over', [0], 1], 'two players: first out wins, other loses');
  let t = mk(3, [[9], [4, 4, 4], [4, 4, 4]], [5], { deck: 0, up: [[], [9, 9], [9, 9]], down: [[], [9, 9], [9, 9]] });
  t = play(t, ids(t, 0, 9));
  eq([t.phase, t.finished, t.turn], ['play', [0], 1], 'three players: play on after the first is out');
  eq(active(t), [1, 2], 'active list');
}
// --- random CPU-vs-CPU games: invariants + termination
{
  const stats = { games: 0, turns: 0, over: 0, burns: 0, pickups: 0, blind: 0 };
  let seed = 12345;
  const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let g = 0; g < 600; g++) {
    const n = 2 + (g % 3), level = (1 + (g % 3)) as 1 | 2 | 3;
    let s = newGame(n, rng);
    for (let p = 0; p < n; p++) s = cpuSwap(s, p, rng);
    if (s.phase !== 'play') fail('cpu swap should start the game');
    let t = 0;
    while (s.phase === 'play' && t < 4000) {
      t++;
      const a = cpuAction(s, level, rng);
      const before = s;
      s = apply(s, a);
      if (s === before) fail(`cpu produced an illegal action ${JSON.stringify(a)}`);
      if (totalCards(s) !== 52) fail('card count drifted ' + totalCards(s));
      if (s.events.includes('burn')) stats.burns++;
      if (s.events.includes('pickup')) stats.pickups++;
      if (s.events.includes('blindfail')) stats.blind++;
      for (const pl of s.players) if (pl.hand.length > 52) fail('absurd hand');
    }
    if (s.phase !== 'over') fail(`game ${g} did not finish in ${t} turns`);
    if (s.finished.length !== n - 1 || s.loser === null || s.finished.includes(s.loser)) fail('bad finish ' + JSON.stringify(s.finished));
    stats.games++; stats.turns += t; stats.over++;
  }
  console.log('random games ok', { ...stats, avgTurns: Math.round(stats.turns / stats.games) });
}
console.log('palace rule cases ok');
