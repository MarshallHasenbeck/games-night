import { useSyncExternalStore, type ReactNode } from 'react';
import { Overlay } from '../../../src/ui';
import { DIFFS, type Diff } from '../../../src/lib/pugdoku';
import { useTime } from '../../../src/lib/theme';
import { sfx } from '../../../src/lib/sfx';
import { iCloud } from './icloud';
import { store } from './store';

export const fmt = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Overlay>
      <div className="rules-overlay" onClick={onClose} role="dialog" aria-label={title}>
        <div className="rules pdk-modal" onClick={(e) => e.stopPropagation()}>
          <div className="rules-head"><h2>{title}</h2><button className="btn small" onClick={onClose}>CLOSE ✕</button></div>
          <div className="rules-body">{children}</div>
        </div>
      </div>
    </Overlay>
  );
}

export function Rules() {
  return (
    <>
      <p className="goal"><b>GOAL</b> Find where every pug is hiding: one pug in every row, every column and every colour. Pugs never touch, not even corners.</p>
      <section><h3>The rules</h3><ul>
        <li>Exactly one pug in each row, each column and each colour area.</li>
        <li>No two pugs may touch, not side by side and not diagonally.</li>
        <li>Every puzzle has exactly one answer and can always be worked out by thinking. No guessing needed!</li>
        <li>Some puzzles start with a pug already placed (it has a cream ring and stays put). A colour with just one tile must hold a pug.</li>
      </ul></section>
      <section><h3>Playing</h3><ul>
        <li>Tap a tile once to mark it with an X (no pug here). Tap an X again, slowly, to take it back off. To place a pug, double-tap quickly.</li>
        <li>Drag your finger across tiles to X lots of them at once. Start the drag on an X to clear them instead.</li>
        <li>You have 3 treats. A pug in the wrong spot costs a treat and leaves a red X that stays for the rest of the puzzle. Lose all three and you can try the same puzzle again.</li>
        <li>RELAXED has no treats to lose: a wrong pug just glows red until you fix it.</li>
        <li>A correct pug locks in place, so it can't be taken back. UNDO takes back your last X marks (it can't undo a mistake). CLEAR X wipes your X marks.</li>
        <li>HINT works out the next step in the logic for you, tells you why, and does it. You get 3 per puzzle.</li>
      </ul></section>
      <section><h3>Saving</h3><ul>
        <li>The puzzle you are on saves itself, so you can leave any time and pick it up later. Everything works offline.</li>
        <li>Turn on iCloud in Settings and your puzzle and stats follow you between your iPhone and iPad.</li>
      </ul></section>
    </>
  );
}

const SYNC_TEXT: Record<string, string> = {
  unsupported: 'Only on iPhone and iPad.',
  off: 'Off. Progress stays on this device.',
  signedout: 'Sign in to iCloud in the Settings app to sync.',
  syncing: 'Syncing…',
  synced: 'On. Your puzzle and stats follow you between devices.',
};

export function Settings({ onSound, onTime }: { onSound: (on: boolean) => void; onTime: () => void }) {
  useSyncExternalStore(store.subscribe, () => store.sync + JSON.stringify(store.settings));
  const { mode, resolved } = useTime();
  const s = store.settings;
  const Row = ({ label, children, note }: { label: string; children: ReactNode; note?: string }) => (
    <div className="pdk-row"><div><b>{label}</b>{note && <small>{note}</small>}</div>{children}</div>
  );
  const Tog = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
    <button className={`pdk-tog ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => { sfx.click(); set(!on); }}><i /></button>
  );
  return (
    <>
      <Row label="Sound"><Tog on={s.sound} set={onSound} /></Row>
      <Row label="Vibration"><Tog on={s.haptics} set={(v) => store.setSettings({ haptics: v })} /></Row>
      <Row label="Time of day"><button className="btn small" onClick={onTime}>{mode === 'auto' ? `AUTO · ${resolved.toUpperCase()}` : mode.toUpperCase()}</button></Row>
      {iCloud.supported && <Row label="iCloud sync" note={SYNC_TEXT[store.sync]}><Tog on={s.icloud} set={(v) => store.setSettings({ icloud: v })} /></Row>}
      <Row label="Reset stats" note="Clears solved counts and best times on every synced device."><button className="btn small" onClick={() => { if (confirm('Reset all stats?')) store.resetStats(); }}>RESET</button></Row>
      <p className="pdk-fine">Pugdoku works fully offline. No ads, no accounts, no tracking: nothing leaves your device except your own iCloud sync, if you turn it on.</p>
    </>
  );
}

export function Stats() {
  useSyncExternalStore(store.subscribe, () => JSON.stringify(store.stats));
  const t = store.stats;
  const rows = (Object.keys(DIFFS) as Diff[]).map((d) => ({ d, ...t[d] }));
  const all = rows.reduce((a, r) => ({ w: a.w + r.w, s: a.s + r.s }), { w: 0, s: 0 });
  return (
    <>
      <table className="pdk-stats">
        <thead><tr><th /><th>SOLVED</th><th>POINTS</th><th>BEST</th></tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.d}><th>{DIFFS[r.d].label}</th><td>{r.w}</td><td>{r.s}</td><td>{r.b !== undefined ? fmt(r.b) : '–'}</td></tr>)}
          <tr className="total"><th>ALL</th><td>{all.w}</td><td>{all.s}</td><td /></tr>
        </tbody>
      </table>
    </>
  );
}
