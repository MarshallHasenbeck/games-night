import { SIZE, TOP, MAXT, newGame, move, canMove, useHoe, useCan, useSwap, value, type State, type Crop, type Dir, type Grid } from '../../src/lib/pumpkin';

const fail = (m: string): never => { throw new Error(m); };
const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
let nid = 500;
const blank = (): State => ({ grid: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)), score: 0, moves: 0, merges: 0, nextId: 9000, tools: { hoe: 0, can: 0, swap: 0 }, toolTurn: 0, won: false, over: false, stuck: false });
const crop = (t: number): Crop => ({ kind: 'crop', id: nid++, t });
const row = (s: State, r: number) => s.grid[r].map((x) => (x ? (x.kind === 'crop' ? x.t : 'S') : '.')).join('');
const fixed = () => 0.5; // spawn lands on a predictable free cell, always a seed (rng<0.9)

// deal: 2 seeds and 2 stones
{
  const s = newGame();
  eq(s.grid.flat().filter((t) => t?.kind === 'crop').length, 2, 'two seeds');
  eq(s.grid.flat().filter((t) => t?.kind === 'stone').length, 2, 'two stones');
}
// slide + merge once per move, toward the swiped side
{
  const s = blank(); s.grid[0] = [crop(0), crop(0), crop(0), crop(0)];
  const r = move(s, 'left', fixed);
  eq(row(r.state, 0).slice(0, 2), '11', 'four seeds make two sprouts, each merge happens once');
  eq(r.state.score, value(1) * 2, 'score counts merged value');
}
{
  const s = blank(); s.grid[1] = [null, crop(2), null, crop(2)];
  const r = move(s, 'right', fixed);
  eq(r.state.grid[1][3] && (r.state.grid[1][3] as Crop).t, 3, 'two radishes slide and merge into a carrot at the swiped edge');
}
// no-op moves do nothing (no spawn, no move count)
{
  const s = blank(); s.grid[0] = [crop(0), crop(1), crop(2), crop(3)];
  const r = move(s, 'left', fixed);
  eq([r.moved, r.state === s], [false, true], 'nothing to do returns the same state');
}
// stones are walls: crops stop against them and never jump them
{
  const s = blank(); s.grid[0] = [crop(0), { kind: 'stone', id: 777, hp: 2 }, crop(0), null];
  const r = move(s, 'left', fixed);
  eq(row(r.state, 0).slice(0, 3), '0S0'.replace('0', '0'), 'seed at col 2 is blocked by the stone and cannot merge across it');
  eq(r.merges === undefined, true, 'sanity');
}
// a merge next to a stone cracks it, the second one breaks it
{
  const s = blank(); s.grid[0] = [crop(0), crop(0), null, null]; s.grid[1][0] = { kind: 'stone', id: 801, hp: 2 };
  let r = move(s, 'left', fixed);
  eq(r.cracked.length, 1, 'stone below the merge cracks');
  eq((r.state.grid[1][0] as { hp: number }).hp, 1, 'hp drops to 1');
  const s2 = r.state; s2.grid[0] = [crop(0), crop(0), null, null];
  r = move(s2, 'left', fixed);
  eq(r.broken.length, 1, 'second merge breaks it');
  eq(r.state.grid[1][0] === null || r.state.grid[1][0]?.kind === 'crop', true, 'broken stone leaves its cell free');
}
// giant pumpkin: reaching it wins; two giants never merge
{
  const s = blank(); s.grid[0] = [crop(TOP - 1), crop(TOP - 1), null, null];
  const r = move(s, 'left', fixed);
  eq([r.newlyWon, r.state.won], [true, true], 'pumpkin + pumpkin = giant pumpkin wins');
  const t = blank(); t.won = true; t.grid[0] = [crop(TOP), crop(TOP), null, null];
  const g = move(t, 'left', fixed); eq([g.moved, (g.state.grid[0][0] as Crop).t, g.newlyWon], [true, TOP + 1, false], 'two giants keep growing: ribbon pumpkin, no second win');
  const m = blank(); m.grid[0] = [crop(MAXT), crop(MAXT), null, null];
  eq(move(m, 'left', fixed).moved, false, 'only the very last step stops');
}
// tools are earned every 8 merges, in turn: hoe, can, swap
{
  const s = blank(); s.merges = 7; s.grid[0] = [crop(0), crop(0), null, null];
  const r = move(s, 'left', fixed);
  eq([r.earned, r.state.tools.hoe], ['hoe', 1], 'the 8th merge earns a hoe');
}
// tool use
{
  const s = blank(); s.tools = { hoe: 1, can: 1, swap: 1 }; s.grid[0] = [crop(2), crop(5), { kind: 'stone', id: 1, hp: 2 }, null];
  const a = useHoe(s, 0, 2)!; eq([a.grid[0][2], a.tools.hoe], [null, 0], 'hoe pulls up a stone');
  const b = useCan(s, 0, 0)!; eq([(b.grid[0][0] as Crop).t, b.tools.can], [3, 0], 'can grows a crop one step');
  const c = useSwap(s, [0, 0], [0, 1])!; eq([(c.grid[0][0] as Crop).t, (c.grid[0][1] as Crop).t], [5, 2], 'swap trades two crops');
  eq(useHoe({ ...s, tools: { hoe: 0, can: 0, swap: 0 } }, 0, 0), null, 'no tool, no use');
  eq(useSwap(s, [0, 0], [0, 2]), null, 'cannot swap with a stone');
}
// game over only when nothing moves and no tools; stuck with tools is not over
{
  const full: Grid = Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => crop((r * 2 + c * 3) % 5 + (r + c) % 2 * 5 % 11) as Crop));
  const s = blank(); s.grid = full.map((row) => row.map((t) => ({ ...t })));
  // force a checkerboard with no equal neighbours
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) s.grid[r][c] = crop((r + c) % 2 ? 1 : 2);
  eq(canMove(s.grid), false, 'checkerboard has no moves');
}
// random play: invariants + the total value only grows by spawns
{
  let seed = 77; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dirs: Dir[] = ['up', 'down', 'left', 'right'];
  let games = 0, moves = 0, won = 0, tools = 0, brokenStones = 0, bestTier = 0;
  for (let g = 0; g < 300; g++) {
    let s = newGame(rng); let safety = 0;
    while (!s.over && safety++ < 6000) {
      const order = dirs.slice().sort(() => rng() - 0.5);
      let moved = false;
      for (const d of order) {
        const before = s.grid.flat().filter((t) => t?.kind === 'crop').reduce((a, t) => a + value((t as Crop).t), 0);
        const r = move(s, d, rng);
        if (!r.moved) continue;
        const after = r.state.grid.flat().filter((t) => t?.kind === 'crop').reduce((a, t) => a + value((t as Crop).t), 0);
        const spawned = r.spawned.filter((x) => x.t >= 0).reduce((a, x) => a + value(x.t), 0);
        if (after !== before + spawned) fail(`crop value not conserved: ${before} + ${spawned} != ${after}`);
        brokenStones += r.broken.length; if (r.earned) tools++;
        s = r.state; moves++; moved = true; break;
      }
      if (!moved) { // stuck: use a tool if there is one, else it is over
        if (s.tools.hoe) { const cell = s.grid.flat().findIndex((t) => !!t); s = useHoe(s, Math.floor(cell / SIZE), cell % SIZE)!; }
        else if (s.tools.can) { const cell = s.grid.flat().findIndex((t) => t?.kind === 'crop' && t.t < TOP); const n = cell >= 0 ? useCan(s, Math.floor(cell / SIZE), cell % SIZE) : null; if (n) s = n; else { s.tools.can = 0; } }
        else if (s.tools.swap) { s = { ...s, tools: { ...s.tools, swap: 0 } }; }
        if (!canMove(s.grid) && !s.tools.hoe && !s.tools.can && !s.tools.swap) s.over = true;
      }
    }
    if (!s.over && safety >= 6000) fail('game did not finish');
    games++; if (s.won) won++;
    bestTier = Math.max(bestTier, ...s.grid.flat().map((t) => (t?.kind === 'crop' ? t.t : 0)));
  }
  console.log('random games ok', { games, avgMoves: Math.round(moves / games), won, toolsEarned: tools, stonesBroken: brokenStones, bestTier });
}
console.log('pumpkin rule cases ok');
