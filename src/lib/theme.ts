import { useSyncExternalStore } from 'react';

export type TimeMode = 'auto' | 'day' | 'dusk' | 'night';
export type Resolved = 'day' | 'dusk' | 'night';
const KEY = 'gn-time';
const ORDER: TimeMode[] = ['auto', 'day', 'dusk', 'night'];

let mode: TimeMode = (() => { try { const v = localStorage.getItem(KEY); return ORDER.includes(v as TimeMode) ? (v as TimeMode) : 'auto'; } catch { return 'auto'; } })();
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function resolve(m: TimeMode, hour = new Date().getHours()): Resolved {
  if (m !== 'auto') return m;
  if (hour >= 8 && hour < 17) return 'day';
  if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 20)) return 'dusk';
  return 'night';
}
export function cycleTime() {
  mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export function useTime() {
  const m = useSyncExternalStore(subscribe, () => mode);
  return { mode: m, resolved: resolve(m) };
}
