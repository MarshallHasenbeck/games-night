import { N, SHAPES, newGame, place, canPlace, fitsAnywhere, completes, lineBonus, handFor, cpuMove, type State, type Shape } from '../../src/lib/farmfit';

const fail = (m: string): never => { throw new Error(m); };
const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
const byId = (id: string) => SHAPES.find((s) => s.id === id)!;
const blank = (): State => ({ grid: Array.from({ length: N }, () => Array(N).fill(0)), tray: [byId('I4h'), byId('O'), byId('T0')], score: 0, over: false, lines: 0, moves: 0 });

// shapes: no duplicates cells, tight bounding boxes, every colour used
{
  for (const s of SHAPES) {
    eq(new Set(s.cells.map((c) => c.join())).size, s.cells.length, `${s.id} unique cells`);
    eq([Math.max(...s.cells.map((c) => c[0])) + 1, Math.max(...s.cells.map((c) => c[1])) + 1], [s.h, s.w], `${s.id} box`);
  }
  eq(new Set(SHAPES.map((s) => s.color)).size, 10, 'ten colours');
  eq(byId('ONE').cells.length, 1, 'a single block exists');
}
// bonus table
eq([1, 2, 3, 4, 5].map(lineBonus), [10, 30, 60, 100, 150], 'line bonus grows with every extra line');
// placing scores its cells; bounds and overlap rejected
{
  let s = blank();
  const p = place(s, 0, 0, 0)!;
  eq(p.points, 4, 'four cells = 4 points');
  eq(place(s, 0, 0, 8), null, 'off the right edge is rejected');
  eq(place(s, 0, 10, 0), null, 'off the bottom is rejected');
  s = p.state;
  eq(canPlace(s.grid, byId('I4h'), 0, 2), false, 'overlap rejected');
  eq(s.tray[0], null, 'used block leaves the tray');
}
// one row clears, scores bonus, and an untouched cell above stays
{
  const s = blank();
  for (let c = 0; c < 6; c++) s.grid[5][c] = 3; // 6 filled, I4h fills the rest
  const p = place(s, 0, 5, 6)!;
  eq(p.rows, [5], 'row 5 cleared'); eq(p.state.grid[5].every((v) => v === 0), true, 'row emptied');
  eq(p.points, 4 + 10, '4 cells + 1 line bonus');
}
// two lines at once (a row and a column) earn the two-line bonus
{
  const s = blank();
  for (let c = 0; c < N; c++) if (c !== 2) s.grid[0][c] = 2;
  for (let r = 2; r < N; r++) s.grid[r][2] = 2;
  // cells (0,2) and (1,2) are missing: a vertical domino there completes row 0 and column 2 together
  s.tray = [byId('I2v'), byId('O'), byId('T0')];
  for (let c = 0; c < N; c++) if (c !== 2) s.grid[1][c] = 0;
  const p = place(s, 0, 0, 2)!;
  eq([p.rows, p.cols], [[0], [2]], 'a row and a column in one drop');
  eq(p.bonus, lineBonus(2), 'two lines, two-line bonus');
  eq(p.state.grid[0].every((v) => v === 0) && p.state.grid.every((r) => r[2] === 0), true, 'both lines gone');
}
// refill after the third block, fitsAnywhere and game over
{
  let s = blank();
  s.tray = [byId('O'), null, null];
  const p = place(s, 0, 0, 0)!;
  eq(p.state.tray.every(Boolean), true, 'three new blocks arrive after the last is used');
  const full = blank();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) full.grid[r][c] = 4; // checkerboard: nothing bigger than 1 cell fits
  eq(fitsAnywhere(full.grid, byId('I2h')), false, 'checkerboard blocks a domino');
}
// simulate random games: invariants + termination
{
  let seed = 4242; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let games = 0, moves = 0, lines = 0, topScore = 0, multi = 0;
  for (let g = 0; g < 400; g++) {
    let s = newGame(rng); let safety = 0;
    while (!s.over && safety++ < 5000) {
      const opts: { slot: number; r: number; c: number }[] = [];
      s.tray.forEach((sh: Shape | null, slot) => { if (sh) for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.w; c++) if (canPlace(s.grid, sh, r, c)) opts.push({ slot, r, c }); });
      if (!opts.length) fail('state not over but no moves exist');
      const o = opts[Math.floor(rng() * opts.length)];
      const p = place(s, o.slot, o.r, o.c, rng)!;
      if (!p) fail('legal move rejected');
      if (p.rows.length + p.cols.length > 1) multi++;
      // no full line may remain after a move
      for (let y = 0; y < N; y++) if (p.state.grid[y].every(Boolean)) fail('full row left behind');
      for (let x = 0; x < N; x++) if (p.state.grid.every((row) => row[x])) fail('full column left behind');
      s = p.state; moves++;
    }
    if (!s.over) fail('game did not finish');
    games++; lines += s.lines; topScore = Math.max(topScore, s.score);
  }
  console.log('random games ok', { games, avgMoves: Math.round(moves / games), avgLines: Math.round(lines / games), multiLineClears: multi, bestScore: topScore });
}
// duel: the same seed deals the same hands to everybody, whatever is on their board
{
  const a = newGame(Math.random, 4242), b = newGame(() => 0.123, 4242);
  eq(a.tray.map((s) => s!.id), b.tray.map((s) => s!.id), 'same seed, same first hand');
  eq(handFor(4242, 5).map((s) => s.id), handFor(4242, 5).map((s) => s.id), 'hands repeat');
  eq(handFor(1, 0).map((s) => s.id) === handFor(2, 0).map((s) => s.id), false, 'different seeds differ');
  // two different boards still get the same second hand
  let x = a, y = b; const seen = (st: State) => st.tray.map((s) => s?.id).join();
  for (let i = 0; i < 3; i++) { const mx = cpuMove(x, 2, Math.random)!; x = place(x, mx.slot, mx.r, mx.c)!.state; }
  for (let i = 0; i < 3; i++) { const o = [0, 1, 2].map((slot) => ({ slot })).filter((m) => y.tray[m.slot]); let done = false; for (const m of o) { const sh = y.tray[m.slot]!; for (let r = N - sh.h; r >= 0 && !done; r--) for (let c = N - sh.w; c >= 0 && !done; c--) if (canPlace(y.grid, sh, r, c)) { y = place(y, m.slot, r, c)!.state; done = true; } if (done) break; } }
  eq(seen(x), seen(y), 'after three blocks each, both are on the same next hand');
}
// computer player: legal moves, finishes, and harder levels score more on average
{
  let seed = 31; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const avg: number[] = [];
  for (const level of [1, 2, 3] as const) {
    let tot = 0; const G = level === 3 ? 12 : 25;
    for (let g = 0; g < G; g++) {
      let s = newGame(rng, 1000 + g), n = 0;
      while (!s.over && n++ < 4000) { const m = cpuMove(s, level, rng); if (!m) break; const p = place(s, m.slot, m.r, m.c, rng); if (!p) fail('cpu chose an illegal move'); s = p.state; }
      tot += s.score;
    }
    avg.push(Math.round(tot / G));
  }
  console.log('cpu average scores (easy, medium, hard)', avg);
  if (!(avg[1] > avg[0] && avg[2] > avg[1])) fail('computer levels are not ordered: ' + avg.join(', '));
}
console.log('farmfit rule cases ok');
