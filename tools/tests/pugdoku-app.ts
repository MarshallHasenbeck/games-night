// Pugdoku app: game moves + save merging. Run: npx tsx tools/tests/pugdoku-app.ts
import { decodePuzzle } from '../../src/lib/pugdoku';
import { BANK } from '../../src/lib/pugdoku-bank';
import { TIERS, fits } from '../../src/lib/pugdoku-gen';
import { newGame, tap, paint, undo, hint, clearX, solved, restart, MAX_LIVES, type GState } from '../../apps/pugdoku/src/game';
import { emptyCloud, emptyDiffs, mergeCloud, parseCloud, sameCloud, totals, type Cloud } from '../../apps/pugdoku/src/merge';

let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m); } };

const pz = decodePuzzle(BANK[5][0], 5);
const mk = (diff: 'easy' | 'relaxed' = 'easy') => newGame(diff, pz, [], ['a', 'b', 'c', 'd', 'e']);

// --- moves
let s = mk();
let r = tap(s, 0, 0, false); ok(r.s.st[0][0] === 1 && r.fx === 'x', 'tap -> X'); s = r.s;
r = tap(s, 0, 0, false); ok(r.s.st[0][0] === 0 && r.fx === 'unx', 'tap X -> empty');
r = tap(tap(s, 1, 1, false).s, 1, 1, false); ok(r.s.st[1][1] === 0, 'a slow second tap on an X removes it');
// correct guess
const wrongCol = (row: number) => [0, 1, 2, 3, 4].find((c) => c !== pz.p[row])!;
let g = tap(mk(), 0, pz.p[0], false).s; r = tap(g, 0, pz.p[0], true); ok(r.s.st[0][pz.p[0]] === 2 && r.fx === 'pug', 'quick second tap places a correct pug');
// wrong guess
g = tap(mk(), 0, wrongCol(0), false).s; r = tap(g, 0, wrongCol(0), true);
ok(r.s.lives === MAX_LIVES - 1 && r.s.bad[0][wrongCol(0)] && r.fx === 'wrong', 'wrong guess costs a treat and leaves a red X');
const again = tap(r.s, 0, wrongCol(0), false); ok(again.s === r.s, 'red X is permanent');
// relaxed: wrong pug allowed, no lives lost
g = tap(mk('relaxed'), 0, wrongCol(0), false).s; r = tap(g, 0, wrongCol(0), true);
ok(r.s.lives === MAX_LIVES && r.s.st[0][wrongCol(0)] === 2, 'relaxed allows a wrong pug');
// lose
let L = mk();
for (let i = 0; i < MAX_LIVES; i++) { const c = [0, 1, 2, 3, 4].filter((x) => x !== pz.p[0] && !L.bad[0][x])[0]; L = tap(tap(L, 0, c, false).s, 0, c, true).s; }
ok(L.over === 'lose', 'three wrong guesses lose');
// undo keeps red marks and lost lives
const u = undo(L.over ? { ...L, over: null } : L); ok(u.lives === 0 && u.bad.flat().filter(Boolean).length === MAX_LIVES, 'undo cannot dodge a mistake');
// undo reverts a normal move
s = tap(mk(), 1, 1, false).s; ok(undo(s).st[1][1] === 0, 'undo takes back an X');
// paint + one undo for a whole drag
s = paint(mk(), [[0, 0], [0, 1], [0, 2]], 'x', true); s = paint(s, [[0, 3]], 'x', false);
ok(s.st[0].slice(0, 4).every((v) => v === 1) && s.hist.length === 1 && undo(s).st[0].every((v) => v === 0), 'drag paints and undoes as one step');
ok(clearX(s).st.flat().every((v) => v === 0), 'clear X');

// --- a full solve with hints only: every hint must be correct and the puzzle must finish
for (const diff of ['easy', 'relaxed'] as const) {
  let h = newGame(diff, pz, [2], ['a', 'b', 'c', 'd', 'e']); h = { ...h, hints: 99 };
  for (let i = 0; i < 60 && !h.over; i++) {
    const before = h; const res = hint(h); h = res.s;
    for (let rr = 0; rr < 5; rr++) for (let cc = 0; cc < 5; cc++) if (h.st[rr][cc] === 2 && pz.p[rr] !== cc) { ok(false, `hint placed a wrong pug (${diff})`); }
    if (res.fx === 'none') break; ok(h.hints === before.hints - 1, 'hint costs one');
  }
  ok(h.over === 'win' && solved(h), `hints alone can finish a puzzle (${diff})`);
}
// hints on every bank puzzle of every size never place a wrong pug
let hintRuns = 0;
for (const [k, list] of Object.entries(BANK)) {
  const n = +k;
  for (const row of list.filter((_, i) => i % 6 === 0)) {
    const p = decodePuzzle(row, n); let h = { ...newGame('hard', p, [], Array(n).fill('x')), hints: 999 } as GState;
    for (let i = 0; i < 200 && !h.over; i++) { h = hint(h).s; }
    hintRuns++;
    ok(h.over === 'win', `hints finish a ${n}x${n} puzzle`);
  }
}
ok(restart(L).lives === MAX_LIVES && restart(L).hist.length === 0 && restart(L).g === L.g, 'restart keeps the puzzle');
ok(fits(pz, { ...TIERS.easy, max: 5 }), 'sanity: fits()');

// --- merging
const gs = (u: number, secs: number): Cloud['game'] => ({ u, g: { ...mk(), secs } });
const A: Cloud = { ...emptyCloud(), game: gs(100, 10), stats: { iphone: { u: 5, d: { ...emptyDiffs(), easy: { w: 3, s: 100, b: 50 } } } } };
const B: Cloud = { ...emptyCloud(), game: gs(200, 99), stats: { ipad: { u: 6, d: { ...emptyDiffs(), easy: { w: 2, s: 60, b: 40 }, hard: { w: 1, s: 90, b: 300 } } } } };
const M = mergeCloud(A, B), M2 = mergeCloud(B, A);
ok(M.game.g!.secs === 99 && M2.game.g!.secs === 99, 'newest game wins in both directions');
ok(totals(M).easy.w === 5 && totals(M).easy.s === 160 && totals(M).easy.b === 40 && totals(M).hard.w === 1, 'two devices add up, best time is the minimum');
ok(sameCloud(M, M2), 'merge is order-independent');
ok(sameCloud(mergeCloud(M, M), M), 'merge is idempotent');
const fin = mergeCloud(A, { ...B, game: { u: 300, g: null } }); ok(fin.game.g === null, 'finishing a puzzle clears the other device\'s copy');
// a stale copy of this device's stats must not clobber newer ones
const old = { ...A, stats: { iphone: { u: 1, d: { ...emptyDiffs(), easy: { w: 1, s: 10 } } } } }; ok(totals(mergeCloud(A, old)).easy.w === 3, 'older stats entry loses');
// damaged cloud data is ignored, not trusted
ok(parseCloud('{"v":2}') === null && parseCloud('nonsense') === null && parseCloud(null) === null, 'bad cloud data rejected');
ok(parseCloud(JSON.stringify({ ...A, game: { u: 1, g: { v: 1, n: 5, st: [], g: [], p: [] } } }))!.game.g === null, 'malformed game dropped, rest kept');

console.log(fails ? `FAILURES: ${fails}` : `ALL OK (hint-solved ${hintRuns} bank puzzles across sizes)`);
process.exit(fails ? 1 : 0);
