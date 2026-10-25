export const N = 10;
export type Ship = { id: number; len: number; r: number; c: number; vert: boolean };
export type Shot = 'm' | 'h' | null;
export type Fleet = { ships: Ship[]; shots: Shot[][] };

export const FLEET = [
  { id: 0, len: 5, name: 'Carrier' },
  { id: 1, len: 4, name: 'Battleship' },
  { id: 2, len: 3, name: 'Cruiser' },
  { id: 3, len: 3, name: 'Submarine' },
  { id: 4, len: 2, name: 'Destroyer' },
] as const;

export const emptyShots = (): Shot[][] => Array.from({ length: N }, () => Array<Shot>(N).fill(null));
export const newFleet = (ships: Ship[] = []): Fleet => ({ ships, shots: emptyShots() });
export const cells = (s: Ship): [number, number][] => Array.from({ length: s.len }, (_, k) => (s.vert ? [s.r + k, s.c] : [s.r, s.c + k]) as [number, number]);
export const fits = (s: Ship) => cells(s).every(([r, c]) => r >= 0 && r < N && c >= 0 && c < N);
export const overlaps = (s: Ship, others: Ship[]) => {
  const occ = new Set(others.filter((o) => o.id !== s.id).flatMap(cells).map(([r, c]) => r * N + c));
  return cells(s).some(([r, c]) => occ.has(r * N + c));
};
export const canPlace = (s: Ship, others: Ship[]) => fits(s) && !overlaps(s, others);

export function randomFleet(): Ship[] {
  for (;;) {
    const ships: Ship[] = [];
    let ok = true;
    for (const f of FLEET) {
      let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        const s: Ship = { id: f.id, len: f.len, vert: Math.random() < 0.5, r: Math.floor(Math.random() * N), c: Math.floor(Math.random() * N) };
        if (canPlace(s, ships)) { ships.push(s); placed = true; }
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return ships;
  }
}

export const shipAt = (f: Fleet, r: number, c: number) => f.ships.find((s) => cells(s).some(([a, b]) => a === r && b === c));
export const isSunk = (f: Fleet, s: Ship) => cells(s).every(([r, c]) => f.shots[r][c] === 'h');
export const allSunk = (f: Fleet) => f.ships.length > 0 && f.ships.every((s) => isSunk(f, s));

export type FireResult = { fleet: Fleet; hit: boolean; sunk: Ship | null; repeat: boolean };
export function fire(f: Fleet, r: number, c: number): FireResult {
  if (f.shots[r][c]) return { fleet: f, hit: false, sunk: null, repeat: true };
  const shots = f.shots.map((row) => [...row]);
  const s = shipAt(f, r, c);
  shots[r][c] = s ? 'h' : 'm';
  const fleet = { ...f, shots };
  return { fleet, hit: !!s, sunk: s && isSunk(fleet, s) ? s : null, repeat: false };
}

/* ---------- computer player ---------- */
/** Choose a cell to shoot at on `f` (looking only at what the shooter could know: shots + which ships are sunk). */
export function cpuShot(f: Fleet, level: 1 | 2 | 3): [number, number] {
  const sunkIds = new Set(f.ships.filter((s) => isSunk(f, s)).map((s) => s.id));
  const sunkCells = new Set(f.ships.filter((s) => sunkIds.has(s.id)).flatMap(cells).map(([r, c]) => r * N + c));
  const unresolved: [number, number][] = [];
  const open: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (f.shots[r][c] === 'h' && !sunkCells.has(r * N + c)) unresolved.push([r, c]);
    if (!f.shots[r][c]) open.push([r, c]);
  }
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const adj = (r: number, c: number) => [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < N && b >= 0 && b < N && !f.shots[a][b]) as [number, number][];

  if (level === 1) {
    if (unresolved.length && Math.random() < 0.5) { const t = pick(unresolved.flatMap(([r, c]) => adj(r, c))); if (t) return t; }
    return pick(open);
  }
  if (level === 2) {
    if (unresolved.length) {
      // continue along a line if two hits line up
      const inline = unresolved.flatMap(([r, c]) => adj(r, c).filter(([a, b]) => unresolved.some(([x, y]) => (x === a && Math.abs(y - b) === 1) || (y === b && Math.abs(x - a) === 1))));
      const t = pick(inline.length ? inline : unresolved.flatMap(([r, c]) => adj(r, c)));
      if (t) return t;
    }
    const parity = open.filter(([r, c]) => (r + c) % 2 === 0);
    return pick(parity.length ? parity : open);
  }
  // level 3: probability density over every placement still possible for the remaining ships
  const remaining = f.ships.filter((s) => !sunkIds.has(s.id)).map((s) => s.len);
  const score = Array.from({ length: N }, () => Array(N).fill(0));
  const hitSet = new Set(unresolved.map(([r, c]) => r * N + c));
  for (const len of remaining) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const vert of [false, true]) {
      const cs = cells({ id: 0, len, r, c, vert });
      if (!cs.every(([a, b]) => a < N && b < N && f.shots[a][b] !== 'm' && !sunkCells.has(a * N + b))) continue;
      const covers = cs.filter(([a, b]) => hitSet.has(a * N + b)).length;
      const w = covers ? 30 * covers : 1;
      cs.forEach(([a, b]) => { if (!f.shots[a][b]) score[a][b] += w; });
    }
  }
  let best = -1; let bestCells: [number, number][] = [];
  open.forEach(([r, c]) => { const v = score[r][c] + ((r + c) % 2 === 0 ? 0.01 : 0); if (v > best + 1e-9) { best = v; bestCells = [[r, c]]; } else if (Math.abs(v - best) < 1e-9) bestCells.push([r, c]); });
  return pick(bestCells);
}
