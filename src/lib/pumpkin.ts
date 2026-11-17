/**
 * Giant Pumpkin - pure rules, no React.
 * A 4x4 garden. Swipe and every crop slides as far as it can; two of the same crop merge into the next one up.
 * Seed -> sprout -> radish -> carrot -> potato -> corn -> tomato -> eggplant -> cabbage -> melon -> pumpkin -> GIANT PUMPKIN (the win),
 * and then it keeps going: ribbon, golden, crystal, moon, sun, rainbow, starlit, legend, mythic pumpkins.
 * In the rocks mode, stones (never more than two at a time) sit in the garden and never move. They crack when a merge happens right next to them, and break on the second crack.
 * Every few merges you earn a farm tool: hoe (pull up one crop or stone), watering can (grow one crop a step), swap (trade two crops).
 */
export const SIZE = 4;
export const TOP = 11; // Giant Pumpkin: reaching it wins, but the garden keeps growing past it
export const MAXT = 20; // Mythic Pumpkin: the last step (a worth of 2 million points per tile; effectively endless)
export const CROPS = ['Seed', 'Sprout', 'Radish', 'Carrot', 'Potato', 'Corn', 'Tomato', 'Eggplant', 'Cabbage', 'Melon', 'Pumpkin', 'Giant Pumpkin',
  'Ribbon', 'Golden', 'Crystal', 'Moon', 'Sun', 'Rainbow', 'Starlit', 'Legend', 'Mythic'];
export type Crop = { kind: 'crop'; id: number; t: number };   // t: 0..TOP (index into CROPS)
export type Stone = { kind: 'stone'; id: number; hp: number }; // hp 2 -> cracked 1 -> gone
export type Tile = Crop | Stone | null;
export type Grid = Tile[][];
export type Tool = 'hoe' | 'can' | 'swap';
export const TOOLS: Tool[] = ['hoe', 'can', 'swap'];
export type State = {
  grid: Grid; score: number; moves: number; merges: number; nextId: number;
  tools: Record<Tool, number>; toolTurn: number; // which tool is earned next (index into TOOLS)
  rocks: boolean; // this garden has stones in it (the "no rocks" mode never does)
  won: boolean;   // reached the Giant Pumpkin at some point
  over: boolean;  // nothing can move and no tools left
  stuck: boolean; // nothing can move (a tool might still help)
};
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Result = {
  state: State; moved: boolean;
  slid: { id: number; r: number; c: number }[];                        // tiles that travelled (ending cell)
  consumed: { id: number; r: number; c: number }[];                    // tiles that merged away (cell they slid into)
  made: { id: number; r: number; c: number; t: number }[];             // merge results
  spawned: { id: number; r: number; c: number; t: number }[];          // new seeds / stones
  cracked: { r: number; c: number }[]; broken: { r: number; c: number }[];
  earned: Tool | null; newlyWon: boolean;
};

type Rng = () => number;
const EARN_EVERY = 8, TOOL_CAP = 3, STONE_EVERY = 14;
export const STONE_MAX = 2; // never more than two stones in the garden at once
export const value = (t: number) => 2 ** (t + 1); // seed = 2 ... giant pumpkin = 4096

const emptyGrid = (): Grid => Array.from({ length: SIZE }, () => Array<Tile>(SIZE).fill(null));
const clone = (s: State): State => ({ ...s, grid: s.grid.map((row) => row.map((t) => (t ? { ...t } : null))), tools: { ...s.tools } });
const emptyCells = (g: Grid) => { const o: [number, number][] = []; g.forEach((row, r) => row.forEach((t, c) => { if (!t) o.push([r, c]); })); return o; };

export function newGame(rng: Rng = Math.random, rocks = true): State {
  const s: State = { grid: emptyGrid(), score: 0, moves: 0, merges: 0, nextId: 1, tools: { hoe: 0, can: 0, swap: 0 }, toolTurn: 0, rocks, won: false, over: false, stuck: false };
  const cells = emptyCells(s.grid).sort(() => rng() - 0.5);
  for (let i = 0; i < 2; i++) { const [r, c] = cells.pop()!; s.grid[r][c] = { kind: 'crop', id: s.nextId++, t: 0 }; }
  if (rocks) for (let i = 0; i < STONE_MAX; i++) { const [r, c] = cells.pop()!; s.grid[r][c] = { kind: 'stone', id: s.nextId++, hp: 2 }; }
  return s;
}

export const canMove = (g: Grid): boolean => {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const a = g[r][c];
    if (!a) return true;
    if (a.kind !== 'crop' || a.t >= MAXT) continue;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const b = g[r + dr]?.[c + dc];
      if (b && b.kind === 'crop' && b.t === a.t) return true;
    }
  }
  return false;
};
const totalTools = (s: State) => s.tools.hoe + s.tools.can + s.tools.swap;
const settle = (s: State) => { s.stuck = !canMove(s.grid); s.over = s.stuck && totalTools(s) === 0; };

/** the 4 cells of line i, ordered so index 0 is the side tiles slide toward */
function line(dir: Dir, i: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < SIZE; k++) {
    if (dir === 'left') out.push([i, k]); else if (dir === 'right') out.push([i, SIZE - 1 - k]);
    else if (dir === 'up') out.push([k, i]); else out.push([SIZE - 1 - k, i]);
  }
  return out;
}

export function move(prev: State, dir: Dir, rng: Rng = Math.random): Result {
  const s = clone(prev);
  const res: Result = { state: s, moved: false, slid: [], consumed: [], made: [], spawned: [], cracked: [], broken: [], earned: null, newlyWon: false };
  if (prev.over) return { ...res, state: prev };
  const mergedCells: [number, number][] = [];
  for (let i = 0; i < SIZE; i++) {
    const cells = line(dir, i);
    let start = 0;
    for (let k = 0; k <= SIZE; k++) {
      const atStone = k < SIZE && s.grid[cells[k][0]][cells[k][1]]?.kind === 'stone';
      if (k < SIZE && !atStone) continue;
      // segment = cells[start..k-1], stones are walls
      const seg = cells.slice(start, k);
      const tiles = seg.map(([r, c]) => s.grid[r][c] as Crop | null).filter((t): t is Crop => !!t);
      const out: { tile: Crop; from: [number, number]; eaten?: Crop }[] = [];
      const fromOf = new Map<number, [number, number]>();
      seg.forEach(([r, c]) => { const t = s.grid[r][c]; if (t) fromOf.set(t.id, [r, c]); });
      let j = 0;
      while (j < tiles.length) {
        const a = tiles[j], b = tiles[j + 1];
        if (b && a.t === b.t && a.t < MAXT) { out.push({ tile: a, from: fromOf.get(a.id)!, eaten: b }); j += 2; }
        else { out.push({ tile: a, from: fromOf.get(a.id)! }); j += 1; }
      }
      seg.forEach(([r, c]) => { s.grid[r][c] = null; });
      out.forEach((o, n) => {
        const [r, c] = seg[n];
        if (o.eaten) {
          const made: Crop = { kind: 'crop', id: s.nextId++, t: o.tile.t + 1 };
          s.grid[r][c] = made;
          res.consumed.push({ id: o.tile.id, r, c }, { id: o.eaten.id, r, c });
          res.made.push({ id: made.id, r, c, t: made.t });
          s.score += value(made.t); s.merges++; mergedCells.push([r, c]);
          if (made.t >= TOP && !prev.won) { res.newlyWon = true; s.won = true; }
        } else {
          s.grid[r][c] = o.tile;
          if (o.from[0] !== r || o.from[1] !== c) res.slid.push({ id: o.tile.id, r, c });
        }
      });
      start = k + 1;
    }
  }
  res.moved = res.slid.length > 0 || res.made.length > 0;
  if (!res.moved) return { ...res, state: prev };
  // stones next to a merge crack (once per move) and break on the second crack
  const hit = new Set<string>();
  for (const [r, c] of mergedCells) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const t = s.grid[r + dr]?.[c + dc];
    if (t && t.kind === 'stone' && !hit.has(`${r + dr},${c + dc}`)) {
      hit.add(`${r + dr},${c + dc}`);
      t.hp--;
      if (t.hp <= 0) { s.grid[r + dr][c + dc] = null; res.broken.push({ r: r + dr, c: c + dc }); } else res.cracked.push({ r: r + dr, c: c + dc });
    }
  }
  s.moves++;
  // earn a tool every few merges
  const prevEarned = Math.floor(prev.merges / EARN_EVERY), nowEarned = Math.floor(s.merges / EARN_EVERY);
  if (nowEarned > prevEarned) {
    const tool = TOOLS[s.toolTurn % TOOLS.length]; s.toolTurn++;
    if (s.tools[tool] < TOOL_CAP) { s.tools[tool]++; res.earned = tool; }
  }
  // new seed (sometimes a sprout), and every so often another stone
  let free = emptyCells(s.grid);
  if (free.length) {
    const [r, c] = free[Math.floor(rng() * free.length)];
    const t = rng() < 0.9 ? 0 : 1;
    const crop: Crop = { kind: 'crop', id: s.nextId++, t };
    s.grid[r][c] = crop; res.spawned.push({ id: crop.id, r, c, t });
  }
  free = emptyCells(s.grid);
  const stones = s.grid.flat().filter((t) => t?.kind === 'stone').length;
  if (s.rocks && s.moves % STONE_EVERY === 0 && stones < STONE_MAX && free.length > 3) {
    const [r, c] = free[Math.floor(rng() * free.length)];
    const st: Stone = { kind: 'stone', id: s.nextId++, hp: 2 };
    s.grid[r][c] = st; res.spawned.push({ id: st.id, r, c, t: -1 });
  }
  settle(s);
  return res;
}

/* ---------- farm tools ---------- */
export function useHoe(prev: State, r: number, c: number): State | null {
  if (prev.tools.hoe < 1 || !prev.grid[r]?.[c]) return null;
  const s = clone(prev); s.grid[r][c] = null; s.tools.hoe--; settle(s); return s;
}
export function useCan(prev: State, r: number, c: number): State | null {
  const t = prev.grid[r]?.[c];
  if (prev.tools.can < 1 || !t || t.kind !== 'crop' || t.t >= MAXT) return null;
  const s = clone(prev); const crop = s.grid[r][c] as Crop; crop.t++; s.tools.can--; s.score += value(crop.t);
  if (crop.t >= TOP) s.won = true;
  settle(s); return s;
}
export function useSwap(prev: State, a: [number, number], b: [number, number]): State | null {
  const ta = prev.grid[a[0]]?.[a[1]], tb = prev.grid[b[0]]?.[b[1]];
  if (prev.tools.swap < 1 || !ta || !tb || ta.kind !== 'crop' || tb.kind !== 'crop' || (a[0] === b[0] && a[1] === b[1])) return null;
  const s = clone(prev); [s.grid[a[0]][a[1]], s.grid[b[0]][b[1]]] = [s.grid[b[0]][b[1]], s.grid[a[0]][a[1]]]; s.tools.swap--; settle(s); return s;
}
