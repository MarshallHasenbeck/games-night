import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { newGame, sow, legalPits, cpuPit, type MState } from '../lib/mancala';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const COLORS = ['#e0556a', '#ffd54a', '#6fbf4a', '#5ab0e8', '#fff4d6', '#b394ff'];

/** Stones laid out on a golden-angle spiral so they look scattered but never overlap much. */
function Stones({ n, seed, store }: { n: number; seed: number; store?: boolean }) {
  const shown = Math.min(n, store ? 28 : 16);
  return (
    <>
      {Array.from({ length: shown }, (_, k) => {
        const r = Math.sqrt((k + 0.6) / (store ? 28 : 16)) * (store ? 0.42 : 0.36);
        const a = k * 2.399 + seed * 1.7;
        const x = 50 + r * Math.cos(a) * 100 * (store ? 0.7 : 1), y = 50 + r * Math.sin(a) * 100 * (store ? 1.5 : 1);
        return <i key={k} className="stone" style={{ left: `${x}%`, top: `${y}%`, ['--c' as string]: COLORS[(k + seed) % COLORS.length] }} />;
      })}
    </>
  );
}

export default function Mancala() {
  const opp = useOpponent('mancala');
  const [s, setS] = useState<MState>(newGame);
  const [view, setView] = useState<number[] | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const busy = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);
  const names = ['P1', opp.cpu ? 'CPU' : 'P2'];
  const pits = view ?? s.pits;
  const cpuTurn = opp.cpu && s.turn === 1 && s.winner === null;
  const legal = new Set(legalPits(s));

  useEffect(() => {
    if (s.winner === null) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('mancala', s.winner);
    setTimeout(sfx.win, 300);
  }, [s.winner]);

  /** A stone hops in an arc from one pit/store to another (Web Animations, laid over the board). */
  const fly = (from: number, to: number, color: string, dur: number) => new Promise<void>((done) => {
    const board = boardRef.current, layer = layerRef.current;
    const a = board?.querySelector<HTMLElement>(`[data-pit="${from}"]`), z = board?.querySelector<HTMLElement>(`[data-pit="${to}"]`);
    if (!board || !layer || !a || !z || !layer.animate) { done(); return; }
    const br = board.getBoundingClientRect(), sc = br.width / board.offsetWidth || 1;
    const ar = a.getBoundingClientRect(), zr = z.getBoundingClientRect();
    const ax = (ar.left + ar.width / 2 - br.left) / sc, ay = (ar.top + ar.height / 2 - br.top) / sc;
    const dx = (zr.left + zr.width / 2 - ar.left - ar.width / 2) / sc, dy = (zr.top + zr.height / 2 - ar.top - ar.height / 2) / sc;
    const st = document.createElement('i');
    st.className = 'stone flystone';
    st.style.cssText = `--c:${color};width:${Math.max(12, (Math.min(ar.width, ar.height) / sc) * 0.2)}px;left:${ax}px;top:${ay}px`;
    layer.appendChild(st);
    const lift = Math.max(26, Math.hypot(dx, dy) * 0.32);
    const t = (x: number, y: number, k: number) => `translate(-50%,-50%) translate(${x}px,${y}px) scale(${k})`;
    const an = st.animate([{ transform: t(0, 0, 1) }, { transform: t(dx / 2, dy / 2 - lift, 1.7), offset: 0.5 }, { transform: t(dx, dy, 1) }], { duration: dur, easing: 'cubic-bezier(.4,0,.6,1)' });
    an.onfinish = an.oncancel = () => { st.remove(); done(); };
  });

  const play = async (i: number) => {
    if (busy.current || s.winner !== null) return;
    busy.current = true;
    setMsg('');
    const r = sow(s, i);
    const cur = [...s.pits];
    setView([...cur]); setHot(i);
    const mv = async (from: number, to: number, k: number, dur: number) => {
      cur[from]--; setView([...cur]);                      // the stone leaves its pit...
      await fly(from, to, COLORS[k % COLORS.length], dur);
      cur[to]++; setView([...cur]); setHot(to); sfx.move(); // ...and drops into the next one
    };
    for (const [k, idx] of r.steps.entries()) { await mv(i, idx, k, 300); await sleep(30); }
    await sleep(260);
    const last = r.steps[r.steps.length - 1], me = s.turn;
    if (r.captured) {
      sfx.capture(); setMsg(`${names[s.turn]} CAPTURED ${r.captured}!`);
      const opp = 12 - last, store = me === 0 ? 6 : 13, jobs: Promise<void>[] = [];
      const n = cur[opp];
      for (let k = 0; k < n; k++) jobs.push(sleep(k * 70).then(() => mv(opp, store, k + 2, 520)));
      jobs.push(sleep(n * 70).then(() => mv(last, store, 1, 520)));
      await Promise.all(jobs); await sleep(200);
    } else if (r.extra) { sfx.score(); setMsg(`${names[s.turn]} GETS ANOTHER TURN!`); setHot(me === 0 ? 6 : 13); await sleep(500); }
    else if (r.swept) {
      setMsg('ONE SIDE IS EMPTY - COUNTING UP...');
      const jobs: Promise<void>[] = []; let q = 0;
      for (const [pits, store] of [[[0, 1, 2, 3, 4, 5], 6], [[7, 8, 9, 10, 11, 12], 13]] as const)
        for (const k of pits) for (let m = cur[k]; m > 0; m--) jobs.push(sleep(q++ * 80).then(() => mv(k, store, q, 480)));
      await Promise.all(jobs); await sleep(250);
    }
    setView(r.final.pits);
    await sleep(r.captured || r.swept ? 500 : 150);
    setView(null); setHot(null); setS(r.final);
    busy.current = false;
  };

  useEffect(() => {
    if (!cpuTurn || busy.current) return;
    const id = setTimeout(() => play(cpuPit(s, opp.level)), 950);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, cpuTurn, opp.level]);

  const reset = () => { busy.current = false; setS(newGame()); setView(null); setHot(null); setMsg(''); };
  const click = (i: number) => { if (!cpuTurn && legal.has(i) && !busy.current) { sfx.click(); play(i); } };

  const pit = (i: number) => (
    <button key={i} data-pit={i} className={`pit ${legal.has(i) && !cpuTurn && !view ? 'src' : ''} ${hot === i ? 'hot' : ''}`} onClick={() => click(i)} aria-label={`pit ${i + 1}, ${pits[i]} stones`} disabled={!legal.has(i) || cpuTurn || !!view}>
      <Stones n={pits[i]} seed={i} />
      {pits[i] > 0 && <b className="pcount">{pits[i]}</b>}
    </button>
  );
  const store = (i: 6 | 13) => (
    <div data-pit={i} className={`mstore ${hot === i ? 'hot' : ''}`} aria-label={`${names[i === 6 ? 0 : 1]} store`}>
      <Stones n={pits[i]} seed={i} store />
      <b className="bigcount">{pits[i]}</b>
    </div>
  );

  const status = s.winner !== null
    ? s.winner === 'draw' ? 'IT\'S A DRAW!' : `${names[s.winner]} WINS ${Math.max(s.pits[6], s.pits[13])} TO ${Math.min(s.pits[6], s.pits[13])}!`
    : cpuTurn ? 'CPU IS THINKING...' : view ? 'SOWING...' : `${names[s.turn]}: TAP ONE OF YOUR PITS`;
  const title = s.winner === 'draw' ? 'DRAW!' : s.winner !== null ? `${names[s.winner]} WINS!` : '';

  return (
    <div className="game mancala">
      <div className="head">
        <ModeBar opp={opp} onChange={reset} />
        <div className="status">{status}</div>
        <div className="captures">{msg || `${names[1]} (top) ${pits[13]}  ·  ${names[0]} (bottom) ${pits[6]}`}</div>
      </div>
      <div className="main mboard" ref={boardRef}>
        <div className="flylayer" ref={layerRef} aria-hidden />
        {store(13)}
        <div className="mrows">
          <div className="mrow">{[12, 11, 10, 9, 8, 7].map(pit)}</div>
          <div className="mrow">{[0, 1, 2, 3, 4, 5].map(pit)}</div>
        </div>
        {store(6)}
      </div>
      <div className="foot">
        <div className="row"><button className="btn" onClick={reset}>NEW GAME</button></div>
        <p className="hint">Sow stones counter-clockwise. End in your store for another turn!</p>
      </div>
      {s.winner !== null && <Celebrate title={title} sub={`${s.pits[6]} to ${s.pits[13]}`} onAgain={reset} />}
    </div>
  );
}
