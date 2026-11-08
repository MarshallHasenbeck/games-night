/** Where puzzles come from. The pre-verified bank gives an instant start; a background worker keeps a few freshly generated ones ready
 *  (also verified: unique answer, solvable by logic, right difficulty). Nothing here needs the network. */
import { rnd, type Diff, type Puzzle } from '../../../src/lib/pugdoku';
import { TIERS, buildPuzzle, fits, pickFromBank, verified } from '../../../src/lib/pugdoku-gen';
import { store } from './store';

type Bank = Record<number, [string, string][]>;

class Supply {
  private bank: Bank | null = null;
  private pool: Record<string, Puzzle[]> = {};
  private pending: Record<string, number> = {};
  private worker: Worker | null = null;

  async init() {
    try {
      this.worker = new Worker(new URL('../../../src/lib/pugdoku.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ diff: Diff; g: number[][]; p: number[] }>) => {
        const { diff, g, p } = e.data, pz = { g, p };
        if (diff && verified(pz, p.length) && fits(pz, TIERS[diff])) (this.pool[diff] ??= []).push(pz);
        this.pending[diff] = Math.max(0, (this.pending[diff] ?? 1) - 1);
        this.topUp(diff);
      };
    } catch { this.worker = null; }
    this.bank = (await import('../../../src/lib/pugdoku-bank')).BANK;
  }

  /** Keep two fresh puzzles per difficulty queued (one at a time, so the phone never gets hot). */
  topUp(diff: Diff) {
    if (!this.worker || document.hidden) return;
    if ((this.pool[diff]?.length ?? 0) + (this.pending[diff] ?? 0) < 2) { this.pending[diff] = (this.pending[diff] ?? 0) + 1; this.worker.postMessage({ diff }); }
  }
  warm(diff: Diff) { setTimeout(() => this.topUp(diff), 1500); }

  /** A puzzle for this difficulty, right now. */
  take(diff: Diff): Puzzle {
    const t = TIERS[diff], live = this.pool[diff] ?? [];
    if (live.length && rnd(2) === 0) { this.warm(diff); return live.shift()!; }
    const list = this.bank?.[t.n];
    if (list) {
      const pick = pickFromBank(list, t, store.usedFor(diff));
      if (pick && verified(pick.pz, t.n)) { store.markUsed(diff, pick.idx); this.warm(diff); return pick.pz; }
    }
    if (live.length) return live.shift()!;
    return buildPuzzle(t);   // last resort (the bank always covers every difficulty, so this should never run)
  }
}
export const supply = new Supply();
