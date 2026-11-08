/** Everything the app remembers. Lives on the device (UserDefaults via Capacitor Preferences, localStorage on the web) and, if the
 *  player turns it on, is mirrored to their iCloud so a second iPhone/iPad picks up where they left off. Offline-first: the app never
 *  waits for the network, and iCloud trouble can only ever mean "this device keeps its own copy". */
import { Preferences } from '@capacitor/preferences';
import { iCloud } from './icloud';
import { DIFF_KEYS, emptyCloud, emptyDiffs, mergeCloud, parseCloud, sameCloud, totals, type Cloud, type DiffStat } from './merge';
import type { GState } from './game';
import type { Diff } from '../../../src/lib/pugdoku';

export type Settings = { sound: boolean; haptics: boolean; icloud: boolean; diff: Diff; seenRules: boolean };
const DEFAULTS: Settings = { sound: true, haptics: true, icloud: true, diff: 'easy', seenRules: false };

const LOCAL_KEY = 'pugdoku.local.v1';
const CLOUD_KEY = 'pugdoku.save.v1';
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type Local = { device: string; settings: Settings; cloud: Cloud; used: Record<string, number[]> };

export type SyncState = 'off' | 'unsupported' | 'signedout' | 'synced' | 'syncing';

class Store {
  private local: Local = { device: newId(), settings: { ...DEFAULTS }, cloud: emptyCloud(), used: {} };
  private subs = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  sync: SyncState = 'unsupported';

  subscribe = (fn: () => void) => { this.subs.add(fn); return () => { this.subs.delete(fn); }; };
  private emit() { this.subs.forEach((f) => f()); }

  get settings() { return this.local.settings; }
  get game(): GState | null { return this.local.cloud.game.g; }
  get stats(): Record<Diff, DiffStat> { return totals(this.local.cloud); }
  usedFor(key: string): Set<number> { return new Set(this.local.used[key] ?? []); }

  async load() {
    try {
      const { value } = await Preferences.get({ key: LOCAL_KEY });
      if (value) {
        const o = JSON.parse(value) as Partial<Local>;
        const cloud = parseCloud(JSON.stringify(o.cloud ?? null)) ?? emptyCloud();
        this.local = { device: o.device ?? this.local.device, settings: { ...DEFAULTS, ...o.settings }, cloud, used: o.used ?? {} };
      }
    } catch { /* first launch or unreadable: start fresh */ }
    iCloud.onChange(() => { void this.pull(); });
    await this.refreshSync();
    void this.pull();
  }

  /* ---- writing ---- */
  private persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { void this.flush(); }, 400);
  }
  /** Write to disk right now (called when the app goes to the background). */
  async flush(leaving = false) {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    try { await Preferences.set({ key: LOCAL_KEY, value: JSON.stringify(this.local) }); } catch { /* disk full: nothing sensible to do */ }
    this.schedulePush(leaving ? 0 : 5000);   // iCloud batches anyway; no need to send every move
  }
  setSettings(p: Partial<Settings>) {
    this.local.settings = { ...this.local.settings, ...p };
    this.persist(); this.emit();
    if (p.icloud !== undefined) { void this.refreshSync().then(() => { if (this.local.settings.icloud) void this.pull(); }); }
  }
  /** Save (or clear, with null) the puzzle in progress. */
  saveGame(g: GState | null) {
    this.local.cloud = { ...this.local.cloud, game: { u: Date.now(), g } };
    this.persist();
  }
  recordWin(diff: Diff, pts: number, secs: number): boolean {
    const mine = this.local.cloud.stats[this.local.device] ?? { u: 0, d: emptyDiffs() };
    const d = { ...mine.d, [diff]: { ...mine.d[diff] } };
    const before = this.stats[diff].b;
    d[diff].w += 1; d[diff].s += pts;
    if (d[diff].b === undefined || secs < d[diff].b!) d[diff].b = secs;
    this.local.cloud = { ...this.local.cloud, stats: { ...this.local.cloud.stats, [this.local.device]: { u: Date.now(), d } } };
    this.persist(); this.emit();
    return before !== undefined && secs < before;
  }
  markUsed(key: string, idx: number) {
    const l = (this.local.used[key] ??= []);
    l.push(idx); if (l.length > 400) l.splice(0, l.length - 400);
    this.persist();
  }
  resetStats() {
    this.local.cloud = { ...this.local.cloud, stats: { [this.local.device]: { u: Date.now(), d: emptyDiffs() } } };
    // other devices' entries would otherwise come straight back: tombstone them as zeroed copies with a newer stamp
    for (const id of Object.keys(this.local.cloud.stats)) this.local.cloud.stats[id] = { u: Date.now(), d: emptyDiffs() };
    this.persist(); this.emit();
  }

  /* ---- iCloud ---- */
  async refreshSync() {
    if (!iCloud.supported) this.sync = 'unsupported';
    else if (!this.local.settings.icloud) this.sync = 'off';
    else this.sync = (await iCloud.signedIn()) ? 'synced' : 'signedout';
    this.emit();
  }
  /** Fetch the iCloud copy, merge, keep the result here, and send it back if it differs. */
  async pull() {
    if (this.sync !== 'synced' && this.sync !== 'syncing') return;
    this.sync = 'syncing'; this.emit();
    const remote = parseCloud(await iCloud.get(CLOUD_KEY));
    const merged = remote ? mergeCloud(this.local.cloud, remote) : this.local.cloud;
    const changed = !sameCloud(merged, this.local.cloud);
    this.local.cloud = merged;
    if (!remote || !sameCloud(merged, remote)) this.schedulePush(0);
    this.sync = 'synced';
    if (changed) this.persist();
    this.emit();
  }
  private schedulePush(ms = 5000) {
    if (this.sync === 'off' || this.sync === 'unsupported' || this.sync === 'signedout') return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => { void iCloud.set(CLOUD_KEY, JSON.stringify(this.local.cloud)); }, ms);
  }
}

export const store = new Store();
export { DIFF_KEYS };
