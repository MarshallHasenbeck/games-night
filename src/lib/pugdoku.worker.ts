/** Builds fresh Pugdoku puzzles off the main thread so the game never stalls.
 *  Message in: { diff } (a tier name) or a bare board size (older callers). Message out: { n, diff?, g, p }. */
import { makePuzzle, type Diff } from './pugdoku';
import { TIERS, buildPuzzle } from './pugdoku-gen';

const ctx = self as unknown as { onmessage: ((e: MessageEvent<number | { diff: Diff }>) => void) | null; postMessage: (m: unknown) => void };
ctx.onmessage = (e) => {
  if (typeof e.data === 'number') { ctx.postMessage({ n: e.data, ...makePuzzle(e.data) }); return; }
  const diff = e.data.diff, t = TIERS[diff];
  ctx.postMessage({ n: t.n, diff, ...buildPuzzle(t) });
};
