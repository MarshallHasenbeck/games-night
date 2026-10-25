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

  const play = async (i: number) => {
    if (busy.current || s.winner !== null) return;
    busy.current = true;
    setMsg('');
    const r = sow(s, i);
    const cur = [...s.pits];
    cur[i] = 0;
    setView([...cur]);
    for (const idx of r.steps) {
      await sleep(280);
      cur[idx]++;
      setView([...cur]); setHot(idx); sfx.move();
    }
    await sleep(380);
    if (r.captured) { sfx.capture(); setMsg(`${names[s.turn]} CAPTURED ${r.captured}!`); }
    else if (r.extra) { sfx.score(); setMsg(`${names[s.turn]} GETS ANOTHER TURN!`); }
    else if (r.swept) setMsg('ONE SIDE IS EMPTY - COUNTING UP...');
    setView(r.final.pits);
    await sleep(r.captured || r.swept ? 700 : 150);
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
    <button key={i} className={`pit ${legal.has(i) && !cpuTurn && !view ? 'src' : ''} ${hot === i ? 'hot' : ''}`} onClick={() => click(i)} aria-label={`pit ${i + 1}, ${pits[i]} stones`} disabled={!legal.has(i) || cpuTurn || !!view}>
      <Stones n={pits[i]} seed={i} />
      {pits[i] > 0 && <b className="pcount">{pits[i]}</b>}
    </button>
  );
  const store = (i: 6 | 13) => (
    <div className={`mstore ${hot === i ? 'hot' : ''}`} aria-label={`${names[i === 6 ? 0 : 1]} store`}>
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
      <div className="main mboard">
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
