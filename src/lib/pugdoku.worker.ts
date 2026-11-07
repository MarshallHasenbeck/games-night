/** Builds fresh Pugdoku puzzles off the main thread so the game never stalls. Message in: board size. Message out: { n, g, p }. */
import { makePuzzle } from './pugdoku';

const ctx = self as unknown as { onmessage: ((e: MessageEvent<number>) => void) | null; postMessage: (m: unknown) => void };
ctx.onmessage = (e) => {
  const n = e.data;
  ctx.postMessage({ n, ...makePuzzle(n) });
};
