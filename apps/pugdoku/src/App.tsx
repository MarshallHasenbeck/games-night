import { useEffect, useState, useSyncExternalStore } from 'react';
import { Scenery } from '../../../src/art';
import { DIFFS, type Diff } from '../../../src/lib/pugdoku';
import { cycleTime, useTime } from '../../../src/lib/theme';
import { setMuted, sfx } from '../../../src/lib/sfx';
import { newGame, pugCount, type GState } from './game';
import { store } from './store';
import { supply } from './supply';
import Play from './Play';
import { Modal, Rules, Settings, Stats, fmt } from './Modals';
import pugUrl from '../../../src/assets/pug.png';

const ORDER: Diff[] = ['relaxed', 'easy', 'medium', 'hard'];
const BLURB: Record<Diff, string> = {
  relaxed: 'Easy-size board, no treats to lose. Wrong pugs just glow red.',
  easy: 'A gentle 5x5 warm-up.',
  medium: 'A proper 7x7 think.',
  hard: 'Nine pugs, nowhere to hide.',
};

export default function App() {
  const [game, setGame] = useState<GState | null>(null);
  const [modal, setModal] = useState<null | 'rules' | 'settings' | 'stats'>(null);
  useSyncExternalStore(store.subscribe, () => store.sync + JSON.stringify(store.settings) + store.game?.id);
  useTime();

  // first launch: explain the game once
  useEffect(() => { if (!store.settings.seenRules) setModal('rules'); }, []);

  const start = (diff: Diff) => {
    sfx.click();
    store.setSettings({ diff });
    const g = newGame(diff, supply.take(diff));
    store.saveGame(g);
    setGame(g);
  };
  const saved = store.game && !store.game.over ? store.game : null;
  const stats = store.stats;

  if (game) {
    return (
      <>
        <Scenery />
        <Play
          key={game.id}
          initial={game}
          onExit={() => { setGame(null); }}
          onNew={(d) => start(d)}
        />
      </>
    );
  }

  return (
    <>
      <Scenery />
      <div className="pdk-home">
        <div className="pdk-hero">
          <img className="pdk-logo" src={pugUrl} alt="" draggable={false} />
          <h1 className="pdk-title">PUGDOKU</h1>
          <p className="pdk-tag">One pug in every row, column and colour.<br />No two may touch.</p>
        </div>

        {saved && (
          <button className="pdk-continue" onClick={() => { sfx.click(); setGame(saved); }}>
            <b>CONTINUE</b>
            <span>{DIFFS[saved.diff].label} · {pugCount(saved)}/{saved.n} pugs · {fmt(saved.secs)}</span>
          </button>
        )}

        <div className="pdk-diffs">
          {ORDER.map((d) => (
            <button key={d} className={`pdk-diff ${store.settings.diff === d ? 'last' : ''}`} onClick={() => start(d)}>
              <span className="pdk-dname">{DIFFS[d].label}<i>{DIFFS[d].n}×{DIFFS[d].n}</i></span>
              <span className="pdk-dblurb">{BLURB[d]}</span>
              <span className="pdk-dstat">{stats[d].w ? `SOLVED ${stats[d].w}${stats[d].b !== undefined ? ` · BEST ${fmt(stats[d].b!)}` : ''}` : 'NEW'}</span>
            </button>
          ))}
        </div>

        <div className="pdk-links">
          <button className="btn ghost" onClick={() => { sfx.click(); setModal('rules'); }}>? HOW TO PLAY</button>
          <button className="btn ghost" onClick={() => { sfx.click(); setModal('stats'); }}>STATS</button>
          <button className="btn ghost" onClick={() => { sfx.click(); setModal('settings'); }}>SETTINGS</button>
        </div>
      </div>

      {modal === 'rules' && <Modal title="HOW TO PLAY" onClose={() => { store.setSettings({ seenRules: true }); setModal(null); }}><Rules /></Modal>}
      {modal === 'stats' && <Modal title="STATS" onClose={() => setModal(null)}><Stats /></Modal>}
      {modal === 'settings' && (
        <Modal title="SETTINGS" onClose={() => setModal(null)}>
          <Settings onSound={(on) => { setMuted(!on); store.setSettings({ sound: on }); }} onTime={cycleTime} />
        </Modal>
      )}
    </>
  );
}
