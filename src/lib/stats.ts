export type Winner = 0 | 1 | 'draw';
export type Rec = { p1: number; p2: number; draws: number };
const KEY = 'gn-stats-v1';

export function getStats(): Record<string, Rec> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
export function recordResult(game: string, w: Winner) {
  const all = getStats();
  const r = all[game] ?? { p1: 0, p2: 0, draws: 0 };
  if (w === 'draw') r.draws++; else if (w === 0) r.p1++; else r.p2++;
  all[game] = r;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private mode */ }
}
export function resetStats() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
