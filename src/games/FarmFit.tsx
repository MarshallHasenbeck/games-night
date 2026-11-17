import { useEffect, useRef, useState } from 'react';
import { sfx, sfx2 } from '../lib/sfx';
import { Celebrate, DuelBar, Overlay } from '../ui';
import { N, DUEL_HANDS, newGame, place, canPlace, completes, cpuMove, type State, type Shape } from '../lib/farmfit';
import { newSeed, useDuelMode, type DuelMode } from '../lib/duel';

const BEST_KEY = 'gn-farmfit-best';
const readBest = () => { try { return +(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { return 0; } };
const saveBest = (v: number) => { try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* private mode */ } };
const PRAISE = ['', 'NICE!', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'MEGA!'];

/** a little block shape: used in the tray (small) and in the floating drag ghost (full size) */
function Blocks({ s, size, gap }: { s: Shape; size?: string; gap?: string }) {
  const on = new Set(s.cells.map(([r, c]) => `${r},${c}`));
  const style = size ? { ['--tc' as string]: size, ['--tg' as string]: gap ?? '2px' } : undefined;
  return (
    <div className="ffmini" style={{ gridTemplateColumns: `repeat(${s.w}, var(--tc))`, gridTemplateRows: `repeat(${s.h}, var(--tc))`, ...style }}>
      {Array.from({ length: s.w * s.h }, (_, i) => {
        const r = Math.floor(i / s.w), c = i % s.w;
        return on.has(`${r},${c}`) ? <i key={i} className={`ffc c${s.color}`} /> : <i key={i} />;
      })}
    </div>
  );
}

type Drag = { slot: number; x: number; y: number; touch: boolean };
type Geo = { left: number; top: number; size: number; px: number; py: number };

export default function FarmFit() {
  const [s, setS] = useState<State>(() => newGame());
  const [best, setBest] = useState(readBest);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [burst, setBurst] = useState<{ id: number; r: number; c: number; color: number }[]>([]);
  const [toast, setToast] = useState<{ k: number; text: string } | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const duel = useDuelMode('farmfit');
  const mode = duel.mode;
  const [seed, setSeed] = useState(() => newSeed());
  const [turn, setTurn] = useState<0 | 1>(0);
  const [scores, setScores] = useState<[number | null, number | null]>([null, null]);
  const [cpuS, setCpuS] = useState<State | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [result, setResult] = useState<{ title: string; sub: string } | null>(null);
  const [pendingMode, setPendingMode] = useState<DuelMode | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const uid = useRef(0);

  const geo = (): Geo | null => {
    const b = boardRef.current;
    const a = b?.querySelector('[data-rc="0-0"]') as HTMLElement | null, c1 = b?.querySelector('[data-rc="0-1"]') as HTMLElement | null, c2 = b?.querySelector('[data-rc="1-0"]') as HTMLElement | null;
    if (!a || !c1 || !c2) return null;
    const ra = a.getBoundingClientRect();
    return { left: ra.left, top: ra.top, size: ra.width, px: c1.getBoundingClientRect().left - ra.left, py: c2.getBoundingClientRect().top - ra.top };
  };
  /** where would the block being dragged land? (top-left cell) */
  const anchorOf = (d: Drag, sh: Shape, g: Geo) => {
    const lift = d.touch ? g.py * 1.1 + (sh.h * g.py) / 2 : g.py * 0.2; // lifted clear of the finger
    const left = d.x - (sh.w * g.px - (g.px - g.size)) / 2, top = d.y - lift - (sh.h * g.py - (g.py - g.size)) / 2;
    return { r: Math.round((top - g.top) / g.py), c: Math.round((left - g.left) / g.px), left, top };
  };

  const g = drag ? geo() : null;
  const dsh = drag ? s.tray[drag.slot] : null;
  const anc = drag && g && dsh ? anchorOf(drag, dsh, g) : null;
  const ok = !!(anc && dsh && canPlace(s.grid, dsh, anc.r, anc.c));
  const pv = new Map<string, number>();
  let willR: number[] = [], willC: number[] = [];
  if (ok && anc && dsh) {
    dsh.cells.forEach(([dr, dc]) => pv.set(`${anc.r + dr},${anc.c + dc}`, dsh.color));
    const w = completes(s.grid, dsh, anc.r, anc.c); willR = w.rows; willC = w.cols;
  }

  const doPlace = (slot: number, r: number, c: number) => {
    const res = place(s, slot, r, c);
    if (!res) return;
    const lines = res.rows.length + res.cols.length;
    if (lines) { sfx.capture(); setTimeout(() => sfx.score(), 120); } else sfx.move();
    if (res.cleared.length) {
      const ids = res.cleared.map((x) => ({ id: ++uid.current, r: x.r, c: x.c, color: x.color }));
      setBurst((b) => [...b, ...ids]);
      setTimeout(() => setBurst((b) => b.filter((x) => !ids.some((y) => y.id === x.id))), 520);
    }
    if (lines) setToast({ k: ++uid.current, text: `${PRAISE[Math.min(lines, 5)]} +${res.points}` });
    setS(res.state);
    // the computer plays the same deal alongside you, one block for every block you place
    let cpu = cpuS;
    if (mode === 'cpu' && cpu && !cpu.over) {
      const m = cpuMove(cpu, duel.level, Math.random);
      const p = m ? place(cpu, m.slot, m.r, m.c) : null;
      cpu = p ? p.state : { ...cpu, over: true };
      setCpuS(cpu);
    }
    if (res.state.over) {
      if (mode === 'solo') {
        const nb = res.state.score > best;
        if (nb) { saveBest(res.state.score); setBest(res.state.score); }
        setNewBest(nb);
        setTimeout(sfx.win, 400);
      } else if (mode === 'two') {
        if (turn === 0) { setScores([res.state.score, null]); setTimeout(() => setHandoff(true), 500); }
        else finish(scores[0] ?? 0, res.state.score);
      } else if (cpu) {
        let c: State = cpu;
        while (!c.over) { const m = cpuMove(c, duel.level, Math.random); const q = m ? place(c, m.slot, m.r, m.c) : null; c = q ? q.state : { ...c, over: true }; }
        setCpuS(c); finish(res.state.score, c.score);
      }
    }
  };
  /** the final scores of a duel: who won? */
  const finish = (a: number, b: number) => {
    const names: [string, string] = mode === 'cpu' ? ['YOU', 'CPU'] : ['P1', 'P2'];
    const title = a === b ? "IT'S A TIE!" : a > b ? (mode === 'cpu' ? 'YOU WIN!' : `${names[0]} WINS!`) : (mode === 'cpu' ? 'CPU WINS!' : `${names[1]} WINS!`);
    setScores([a, b]);
    setTimeout(() => { setResult({ title, sub: `${names[0]} ${a}  -  ${names[1]} ${b}` }); sfx.win(); }, 500);
  };

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1100); return () => clearTimeout(t); }, [toast]);

  const down = (e: React.PointerEvent, slot: number) => {
    if (s.over || !s.tray[slot]) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sfx.click();
    setDrag({ slot, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' });
  };
  const move = (e: React.PointerEvent) => { if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY }); };
  const up = () => {
    if (drag && anc && ok) doPlace(drag.slot, anc.r, anc.c);
    else if (drag && anc) sfx2.hit();
    setDrag(null);
  };

  /** start a fresh game; in the duel modes both players are dealt the same blocks from a new seed */
  const reset = (m: DuelMode = mode) => {
    const sd = newSeed(); setSeed(sd);
    setS(m === 'solo' ? newGame() : newGame(Math.random, sd));
    setCpuS(m === 'cpu' ? newGame(Math.random, sd) : null);
    setTurn(0); setScores([null, null]); setHandoff(false); setResult(null); setPendingMode(null);
    setBurst([]); setToast(null); setConfirmNew(false); setNewBest(false); setDrag(null);
  };
  const startSecond = () => { setS(newGame(Math.random, seed)); setTurn(1); setHandoff(false); setBurst([]); setToast(null); };
  useEffect(() => { reset(duel.mode); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [duel.mode]);
  const pickMode = (m: DuelMode) => { if (m === mode) return; if (s.moves && !result) setPendingMode(m); else duel.setMode(m); };
  const handNo = Math.min(DUEL_HANDS, (s.hand ?? 0) + 1);

  const will = (r: number, c: number) => willR.includes(r) || willC.includes(c);

  return (
    <div className="game ff">
      <div className="head">
        <DuelBar mode={mode} level={duel.level} setMode={pickMode} setLevel={(l) => { duel.setLevel(l); reset(mode); }} />
        {mode === 'solo' && <div className="status ffscore"><span>SCORE <b>{s.score}</b></span><span>BEST <b>{Math.max(best, s.score)}</b></span></div>}
        {mode === 'two' && <div className="status ffscore"><span className={turn === 0 ? 'me' : ''}>P1 <b>{turn === 0 ? s.score : scores[0] ?? 0}</b></span><span className={turn === 1 ? 'me' : ''}>P2 <b>{turn === 1 ? s.score : '-'}</b></span><span className="hand">HAND {handNo}/{DUEL_HANDS}</span></div>}
        {mode === 'cpu' && <div className="status ffscore"><span className="me">YOU <b>{s.score}</b></span><span>CPU <b>{cpuS?.score ?? 0}</b></span><span className="hand">HAND {handNo}/{DUEL_HANDS}</span></div>}
        <p className="hint prompt">{mode === 'solo' ? 'Drag a block onto the field. Fill a whole row or column to clear it!' : `${mode === 'two' ? `P${turn + 1}'S TURN - ` : ''}HAND ${handNo} OF ${DUEL_HANDS}. Same blocks for both players. Highest score wins!`}</p>
      </div>

      <div className="main ffwrap">
        <div className="ffframe">
          <div className="ffboard" ref={boardRef}>
            {Array.from({ length: N * N }, (_, i) => {
              const r = Math.floor(i / N), c = i % N, v = s.grid[r][c], p = pv.get(`${r},${c}`);
              const b = burst.find((x) => x.r === r && x.c === c);
              return (
                <div key={i} data-rc={`${r}-${c}`} className={`ffcell${(r + c) % 2 ? ' alt' : ''}${v ? ` ffc c${v}` : ''}${p ? ` ffc ffpv c${p}` : ''}${ok && will(r, c) && (v || p) ? ' ffwill' : ''}`}>
                  {b && <span className={`ffburst ffc c${b.color}`} />}
                </div>
              );
            })}
          </div>
          {toast && <div className="fftoast" key={toast.k}>{toast.text}</div>}
        </div>

        <div className="fftray">
          {s.tray.map((sh, i) => (
            <div key={i} className={`ffslot${sh ? '' : ' empty'}${drag?.slot === i ? ' lifted' : ''}`}
              onPointerDown={(e) => down(e, i)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} onContextMenu={(e) => e.preventDefault()}>
              {sh && <Blocks s={sh} />}
            </div>
          ))}
        </div>
      </div>

      <div className="foot">
        <div className="row"><button className="btn" onClick={() => (s.moves && !result ? setConfirmNew(true) : reset())}>↺ NEW GAME</button></div>
      </div>

      {drag && dsh && g && anc && (
        <Overlay>
          <div className="ffghost" style={{ left: anc.left, top: anc.top }}>
            <Blocks s={dsh} size={`${g.size}px`} gap={`${g.px - g.size}px`} />
          </div>
        </Overlay>
      )}
      {confirmNew && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>START A NEW GAME?</h2><p>This ends the game you're playing.</p>
          <div className="row"><button className="btn primary" onClick={() => setConfirmNew(false)}>KEEP PLAYING</button><button className="btn" onClick={() => reset()}>YES, START OVER</button></div>
        </div></div></Overlay>
      )}
      {pendingMode && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>SWITCH MODE?</h2><p>This ends the game you're playing and starts a new one.</p>
          <div className="row"><button className="btn primary" onClick={() => setPendingMode(null)}>KEEP PLAYING</button><button className="btn" onClick={() => { const m = pendingMode; setPendingMode(null); duel.setMode(m); }}>SWITCH</button></div>
        </div></div></Overlay>
      )}
      {handoff && (
        <Overlay><div className="handoff"><div className="banner">
          <h2>PASS TO P2</h2><p>P1 scored {scores[0]}. P2 gets the very same blocks in the very same order. Beat it!</p>
          <button className="btn primary" onClick={startSecond}>I'M P2 - START</button>
        </div></div></Overlay>
      )}
      {mode === 'solo' && s.over && <Celebrate title="NO MORE ROOM!" sub={`Score ${s.score}${newBest ? ' · NEW BEST!' : ` · Best ${best}`}`} onAgain={() => reset()} />}
      {result && <Celebrate title={result.title} sub={result.sub} onAgain={() => reset()} />}
    </div>
  );
}

/** menu icon */
export function FarmFitIcon() {
  const b = (x: number, y: number, c: string, d: string) => <g key={`${x}${y}`}><rect x={x} y={y} width="11" height="11" rx="2" fill={c} stroke="#3a2410" strokeWidth="1.6" /><rect x={x + 2} y={y + 2} width="7" height="2.4" rx="1" fill="#fff" opacity=".45" /><rect x={x} y={y + 8} width="11" height="3" rx="1.5" fill={d} opacity=".5" /></g>;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ imageRendering: 'pixelated' }}>
      {[b(6, 6, '#4aa3df', '#14294a'), b(6, 18, '#4aa3df', '#14294a'), b(6, 30, '#4aa3df', '#14294a'),
        b(20, 30, '#ee8a3a', '#7a3a1e'), b(32, 30, '#ee8a3a', '#7a3a1e'), b(32, 18, '#ee8a3a', '#7a3a1e'),
        b(20, 46, '#f2b632', '#7a5a0e'), b(32, 46, '#f2b632', '#7a5a0e'), b(44, 46, '#d4475a', '#5a1020'), b(44, 34, '#d4475a', '#5a1020'),
        b(44, 6, '#5cb84a', '#1f4d1c'), b(32, 6, '#5cb84a', '#1f4d1c')]}
    </svg>
  );
}
