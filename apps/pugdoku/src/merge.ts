/** How two copies of the save (this device and iCloud) become one. Pure, no Capacitor, so it can be tested with tsx.
 *
 *  - The puzzle in progress: whichever copy was changed last wins (the record carries a timestamp; `g: null` = "no puzzle in progress", so
 *    finishing a puzzle on one device properly replaces the half-played copy on another).
 *  - Stats are kept PER DEVICE (each device only ever writes its own entry), and the totals are the sum. Two devices that each solved
 *    puzzles while offline therefore add up instead of one overwriting the other. Best times take the minimum. */
import type { Diff } from '../../../src/lib/pugdoku';
import type { GState } from './game';

export type DiffStat = { w: number; s: number; b?: number };      // solved, points, best time (seconds)
export type DeviceStats = { u: number; d: Record<Diff, DiffStat> };
export type Cloud = {
  v: 1;
  game: { u: number; g: GState | null };
  stats: Record<string, DeviceStats>;
};

export const DIFF_KEYS: Diff[] = ['relaxed', 'easy', 'medium', 'hard'];
export const emptyDiffs = (): Record<Diff, DiffStat> => ({ relaxed: { w: 0, s: 0 }, easy: { w: 0, s: 0 }, medium: { w: 0, s: 0 }, hard: { w: 0, s: 0 } });
export const emptyCloud = (): Cloud => ({ v: 1, game: { u: 0, g: null }, stats: {} });

/** Defensive: whatever came out of iCloud may be from an older/newer app version or damaged. */
export function parseCloud(raw: string | null | undefined): Cloud | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<Cloud>;
    if (!o || o.v !== 1 || typeof o.game?.u !== 'number' || typeof o.stats !== 'object' || !o.stats) return null;
    const g = o.game.g;
    if (g && (g.v !== 1 || !Array.isArray(g.st) || !Array.isArray(g.g) || !Array.isArray(g.p) || g.p.length !== g.n || g.st.length !== g.n)) return { v: 1, game: { u: o.game.u, g: null }, stats: o.stats };
    return o as Cloud;
  } catch { return null; }
}

export function mergeCloud(a: Cloud, b: Cloud): Cloud {
  const game = b.game.u > a.game.u ? b.game : a.game;
  const stats: Record<string, DeviceStats> = { ...a.stats };
  for (const [id, ds] of Object.entries(b.stats)) if (!stats[id] || ds.u > stats[id].u) stats[id] = ds;
  return { v: 1, game, stats };
}

export function totals(c: Cloud): Record<Diff, DiffStat> {
  const out = emptyDiffs();
  for (const ds of Object.values(c.stats)) for (const k of DIFF_KEYS) {
    const x = ds.d[k]; if (!x) continue;
    out[k].w += x.w; out[k].s += x.s;
    if (x.b !== undefined && (out[k].b === undefined || x.b < out[k].b!)) out[k].b = x.b;
  }
  return out;
}

/** Equal regardless of the order devices happen to be listed in. */
const canon = (c: Cloud) => JSON.stringify({ v: c.v, game: c.game, stats: Object.keys(c.stats).sort().map((k) => [k, c.stats[k]]) });
export const sameCloud = (a: Cloud, b: Cloud) => canon(a) === canon(b);
