import { useEffect, useRef, useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { PixelArt } from '../../../src/Sprite';
import { Overlay } from '../../../src/ui';
import { sfx } from '../../../src/lib/sfx';
import { DIFFS, type Diff } from '../../../src/lib/pugdoku';
import { PugWin } from '../../../src/games/Pugdoku';
import pugUrl from '../../../src/assets/pug.png';
import { clearX, hint, isRelaxed, locked, MAX_LIVES, paint, pugCount, restart, tap, undo, wrongPug, type Fx, type GState } from './game';
import { store } from './store';
import { fmt } from './Modals';

const X_ROWS = ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'];
const BONE_ROWS = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];

const buzz = (kind: 'light' | 'bad' | 'good') => {
  if (!store.settings.haptics) return;
  try {
    if (kind === 'light') void Haptics.impact({ style: ImpactStyle.Light });
    else void Haptics.notification({ type: kind === 'bad' ? NotificationType.Error : NotificationType.Success });
  } catch { /* no haptics (web / iPad without a Taptic Engine) */ }
};
const play = (fx: Fx) => {
  if (fx === 'x' || fx === 'unx' || fx === 'unpug') { sfx.click(); }
  else if (fx === 'pug' || fx === 'hint') { sfx.score(); buzz('light'); }
  else if (fx === 'wrong') { sfx.capture(); buzz('bad'); }
};

export default function Play({ initial, onExit, onNew }: { initial: GState; onExit: () => void; onNew: (d: Diff) => void }) {
  const [s, setS] = useState(initial);
  const [best, setBest] = useState(false);
  const sRef = useRef(s); sRef.current = s;
  const lastTap = useRef<{ r: number; c: number; t: number } | null>(null);
  const drag = useRef<{ down: [number, number] | null; moved: boolean; last: [number, number] | null; mode: 'x' | 'erase' | null }>({ down: null, moved: false, last: null, mode: null });
  const recorded = useRef(false);

  const apply = (next: { s: GState; fx: Fx }) => {
    setS(next.s); play(next.fx);
    if (next.fx === 'win') { buzz('good'); setTimeout(sfx.win, 350); }
    if (next.fx === 'lose') buzz('bad');
  };

  /* ---- autosave: on every change to the board (not every second), plus every 10 s for the clock ---- */
  useEffect(() => { store.saveGame(s.over ? null : s); }, [s.st, s.bad, s.lives, s.hints, s.over, Math.floor(s.secs / 10)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const save = () => { if (document.hidden) { store.saveGame(sRef.current.over ? null : sRef.current); void store.flush(true); } };
    document.addEventListener('visibilitychange', save);
    return () => { document.removeEventListener('visibilitychange', save); store.saveGame(sRef.current.over ? null : sRef.current); void store.flush(); };
  }, []);

  /* ---- clock: counts each second the puzzle is on screen and unfinished ---- */
  useEffect(() => {
    const id = setInterval(() => setS((g) => (g.over || document.hidden ? g : { ...g, secs: g.secs + 1 })), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- record a win once ---- */
  useEffect(() => {
    if (s.over !== 'win' || recorded.current) return;
    recorded.current = true;
    setBest(store.recordWin(s.diff, s.pts, s.secs));
  }, [s.over]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- touch: tap = X / pug, drag = paint X (or clear X when the drag starts on an X) ---- */
  const cellAt = (x: number, y: number): [number, number] | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-pr]') as HTMLElement | null;
    return el ? [+el.dataset.pr!, +el.dataset.pc!] : null;
  };
  const onDown = (e: React.PointerEvent) => {
    const g = sRef.current; if (g.over) return;
    const p = cellAt(e.clientX, e.clientY); if (!p) return;
    const v = g.st[p[0]][p[1]];
    drag.current = { down: p, moved: false, last: p, mode: v === 0 ? 'x' : v === 1 ? 'erase' : null };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.down || !d.mode || sRef.current.over) return;
    const p = cellAt(e.clientX, e.clientY); if (!p || !d.last || (p[0] === d.last[0] && p[1] === d.last[1])) return;
    const cells: [number, number][] = [];
    if (!d.moved) cells.push(d.down);
    const steps = Math.max(Math.abs(p[0] - d.last[0]), Math.abs(p[1] - d.last[1]));
    for (let i = 1; i <= steps; i++) cells.push([Math.round(d.last[0] + (p[0] - d.last[0]) * i / steps), Math.round(d.last[1] + (p[1] - d.last[1]) * i / steps)]);
    setS((g) => paint(g, cells, d.mode!, !d.moved));
    if (!d.moved) sfx.click();
    d.moved = true; d.last = p;
  };
  const onUp = () => {
    const d = drag.current;
    if (d.down && !d.moved) {
      const [r, c] = d.down, g = sRef.current, now = Date.now(), lt = lastTap.current;
      const quick = !!lt && lt.r === r && lt.c === c && now - lt.t < 400;
      const res = tap(g, r, c, quick);
      lastTap.current = res.fx === 'x' ? { r, c, t: now } : null;
      if (res.s !== g) apply(res);
    }
    drag.current = { down: null, moved: false, last: null, mode: null };
  };

  const relaxed = isRelaxed(s);
  const pugs = pugCount(s);
  const hl = new Set(s.hl.map(([r, c]) => `${r},${c}`));

  return (
    <div className="pdk-play">
      <div className="pdk-bar">
        <button className="btn ghost" onClick={() => { sfx.click(); store.saveGame(s.over ? null : s); onExit(); }}>← MENU</button>
        <h1>{DIFFS[s.diff].label}</h1>
        <span className="pdk-time" aria-label="time">{fmt(s.secs)}</span>
      </div>

      <div className="pdk-boardwrap">
        <div className="pgdframe">
          <div className="pgdboard" style={{ gridTemplateColumns: `repeat(${s.n}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${s.n}, minmax(0, 1fr))` }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = { down: null, moved: false, last: null, mode: null }; }} onContextMenu={(e) => e.preventDefault()}>
            {s.g.map((row, r) => row.map((reg, c) => {
              const v = s.st[r][c];
              const cls = `pgdcell${s.given[r] && v === 2 ? ' given' : ''}${wrongPug(s, r, c) ? ' bad' : ''}${hl.has(`${r},${c}`) ? ' pdk-hl' : ''}`;
              return (
                <div key={`${r}-${c}`} data-pr={r} data-pc={c} className={cls} style={{ background: s.pal[reg] }} aria-label={locked(s, r, c) ? 'locked' : undefined}>
                  {v === 1 && <span className={`pgdx${s.bad[r][c] ? ' bad' : ''}`}><PixelArt rows={X_ROWS} palette={{ x: s.bad[r][c] ? '#ff2a2a' : '#3a2410a8' }} px={4} /></span>}
                  {v === 2 && <img className="pgdpug" src={pugUrl} alt="pug" draggable={false} />}
                </div>
              );
            }))}
          </div>
        </div>
      </div>

      <div className="pdk-panel">
        <div className="pdk-hud">
          <span className="pgdcount"><img src={pugUrl} alt="" />{pugs}/{s.n}</span>
          <span className="pgdbones" aria-label={relaxed ? 'no treats to lose' : `${s.lives} treats left`}>
            {[...Array(MAX_LIVES)].map((_, i) => <span key={i} className={!relaxed && i < s.lives ? '' : 'off'}><PixelArt rows={BONE_ROWS} palette={{ w: '#fff4d6' }} px={3} /></span>)}
          </span>
        </div>
        <p className="pdk-msg" aria-live="polite">{s.msg || 'Tap for ✕, double-tap for a pug. Drag to ✕ lots.'}</p>
        <div className="pdk-btns">
          <button className="btn" disabled={!!s.over || !s.hist.length} onClick={() => { const u = undo(s); if (u !== s) { sfx.click(); setS(u); } }}>↶ UNDO</button>
          <button className="btn" disabled={!!s.over || !s.hints} onClick={() => apply(hint(s))}>HINT ({s.hints})</button>
          <button className="btn" disabled={!!s.over} onClick={() => { const c = clearX(s); if (c !== s) { sfx.click(); setS(c); } }}>CLEAR ✕</button>
        </div>
      </div>

      {s.over === 'win' && <PugWin title="SOLVED!" sub={`+${s.pts} points · ${fmt(s.secs)}${best ? ' · NEW BEST!' : ''}`} onNext={() => onNew(s.diff)} />}
      {s.over === 'lose' && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>OUT OF TREATS!</h2><p>The pug lost patience. Try the same puzzle again?</p>
          <div className="row">
            <button className="btn primary" onClick={() => { const g = restart(s); store.saveGame(g); setS(g); }}>TRY AGAIN</button>
            <button className="btn" onClick={() => onNew(s.diff)}>NEW PUZZLE</button>
          </div>
        </div></div></Overlay>
      )}
    </div>
  );
}
