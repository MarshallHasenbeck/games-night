/** Shared bits for the "duel" modes of the solo puzzle games: both players get the SAME deal, and the higher score wins. */
import { useEffect, useState } from 'react';

export type DuelMode = 'solo' | 'two' | 'cpu';
export type Level = 1 | 2 | 3;

/** small seeded random generator: the same seed always gives the same sequence */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const newSeed = () => Math.floor(Math.random() * 2147483647) + 1;

type Saved = { mode: DuelMode; level: Level };
export function useDuelMode(id: string) {
  const key = `gn-duel-${id}`;
  const [v, setV] = useState<Saved>(() => {
    try { return { mode: 'solo', level: 2, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { mode: 'solo', level: 2 }; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }, [key, v]);
  return { mode: v.mode, level: v.level, setMode: (mode: DuelMode) => setV((p) => ({ ...p, mode })), setLevel: (level: Level) => setV((p) => ({ ...p, level })) };
}
