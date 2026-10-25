import { useEffect, useMemo, useRef, useState } from 'react';
import { Disc } from '../art';
import { sfx, sfx2 } from '../lib/sfx';
import { newGame, legalMoves, applyMove, rollDice, endTurn, cpuMove, type BG, type BMove } from '../lib/backgammon';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const TOP = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const BOT = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand6 = () => 1 + Math.floor(Math.random() * 6);

function Stack({ n, who, max = 5 }: { n: number; who: 0 | 1; max?: number }) {
  const shown = Math.min(n, max);
  return (
    <>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="chk">
          <Disc side={who} px={3} />
          {i === shown - 1 && n > max && <em>{n}</em>}
        </span>
      ))}
    </>
  );
}

function Die({ v, used }: { v: number; used?: boolean }) {
  return (
    <span className={`die small ${used ? 'used' : ''}`}>
      <span className="face">{Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[v]?.includes(i) ? 'pip' : ''} />)}</span>
    </span>
  );
}

export default function Backgammon() {
  const opp = useOpponent('backgammon');
  const NAMES = ['P1', opp.cpu ? 'CPU' : 'P2'];
  const [s, setS] = useState<BG>(newGame);
  const [sel, setSel] = useState<number | 'bar' | null>(null);
  const [tumble, setTumble] = useState<number[] | null>(null);
  const [lastHit, setLastHit] = useState(0);
  const busy = useRef(false);
  const recorded = useRef(false);

  const legal = useMemo(() => legalMoves(s), [s]);
  const cpuTurn = opp.cpu && s.turn === 1 && s.winner === null;
  const needsRoll = s.winner === null && s.dice.length === 0;
  const stuck = s.winner === null && s.dice.length > 0 && legal.length === 0;
  const dests = sel === null ? [] : legal.filter((m) => m.from === sel);

  useEffect(() => {
    if (s.winner === null) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('backgammon', s.winner);
    setTimeout(sfx.win, 300);
  }, [s.winner]);

  const doRoll = async () => {
    if (busy.current) return;
    busy.current = true;
    sfx.roll();
    for (let i = 0; i < 8; i++) { setTumble([rand6(), rand6()]); await sleep(75); }
    setTumble(null);
    setS((cur) => rollDice(cur));
    busy.current = false;
  };
  const doMove = (m: BMove) => {
    if (m.hit) { sfx2.hit(); setLastHit((n) => n + 1); } else sfx.move();
    setS((cur) => applyMove(cur, m));
    setSel(null);
  };

  // no legal moves: pause so the roll can be seen, then pass
  useEffect(() => {
    if (!stuck) return;
    const id = setTimeout(() => setS((cur) => endTurn(cur)), 1500);
    return () => clearTimeout(id);
  }, [stuck, s]);

  // computer player
  useEffect(() => {
    if (!cpuTurn || tumble) return;
    if (needsRoll) { const id = setTimeout(doRoll, 750); return () => clearTimeout(id); }
    if (legal.length) { const id = setTimeout(() => doMove(cpuMove(s, opp.level)), 800); return () => clearTimeout(id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, cpuTurn, tumble]);

  const sources = new Set(legal.map((m) => m.from));
  const clickPoint = (i: number) => {
    if (cpuTurn || s.winner !== null || needsRoll || tumble) return;
    const dm = dests.filter((m) => m.to === i).sort((a, b) => a.die - b.die)[0];
    if (dm) return doMove(dm);
    if (sources.has(i)) { sfx.click(); setSel(sel === i ? null : i); } else setSel(null);
  };
  const clickBar = () => {
    if (cpuTurn || s.winner !== null || needsRoll || tumble) return;
    if (sources.has('bar')) { sfx.click(); setSel(sel === 'bar' ? null : 'bar'); }
  };
  const clickOff = (who: 0 | 1) => {
    if (cpuTurn || who !== s.turn) return;
    const dm = dests.filter((m) => m.to === 'off').sort((a, b) => a.die - b.die)[0];
    if (dm) doMove(dm);
  };

  const reset = () => { setS(newGame()); setSel(null); setTumble(null); busy.current = false; };
  const remaining = [...s.dice];
  const rollShown = tumble ?? s.roll;
  const status = s.winner !== null ? `${NAMES[s.winner]} WINS!`
    : tumble ? 'ROLLING...'
    : cpuTurn ? (needsRoll ? 'CPU ROLLS...' : stuck ? 'NO LEGAL MOVES' : 'CPU IS THINKING...')
    : stuck ? 'NO LEGAL MOVES - PASSING' : needsRoll ? `${NAMES[s.turn]}: ROLL THE DICE` : s.bar[s.turn] ? `${NAMES[s.turn]}: ENTER FROM THE BAR` : `${NAMES[s.turn]} TO MOVE`;

  const point = (i: number, top: boolean) => {
    const v = s.pts[i], who: 0 | 1 = v > 0 ? 0 : 1, n = Math.abs(v);
    const isDest = dests.some((m) => m.to === i);
    const isSrc = !cpuTurn && !needsRoll && !tumble && sources.has(i);
    return (
      <button key={i} className={`pt ${top ? 'top' : 'bot'} ${(i + (top ? 1 : 0)) % 2 ? 'odd' : 'even'} ${sel === i ? 'sel' : ''} ${isDest ? 'dest' : ''} ${isSrc && sel === null ? 'src' : ''}`} onClick={() => clickPoint(i)} aria-label={`point ${i + 1}`}>
        <span className="stack">{n > 0 && <Stack n={n} who={who} />}</span>
        {isDest && <i className="mark" />}
      </button>
    );
  };

  return (
    <div className="game backgammon">
      <div className="head">
        <ModeBar opp={opp} onChange={reset} />
        <div className="status">{status}</div>
      </div>
      <div className="main bgwrap">
        <div className="bgboard" key={lastHit}>
          <div className="bgrow">
            {TOP.slice(0, 6).map((i) => point(i, true))}
            <div className="bgbar top"><div className="stack"><Stack n={s.bar[1]} who={1} /></div></div>
            {TOP.slice(6).map((i) => point(i, true))}
          </div>
          <div className="bgrow">
            {BOT.slice(0, 6).map((i) => point(i, false))}
            <button className={`bgbar bot ${sel === 'bar' ? 'sel' : ''} ${sources.has('bar') && !cpuTurn ? 'src' : ''}`} onClick={clickBar} aria-label="bar"><div className="stack"><Stack n={s.bar[0]} who={0} /></div></button>
            {BOT.slice(6).map((i) => point(i, false))}
          </div>
        </div>
        <div className="bgoff">
          <button className={`tray ${dests.some((m) => m.to === 'off') && s.turn === 1 ? 'dest' : ''}`} onClick={() => clickOff(1)} aria-label="cream off tray"><span className="trayn"><Disc side={1} px={2} /> {s.off[1]}</span></button>
          <button className={`tray ${dests.some((m) => m.to === 'off') && s.turn === 0 ? 'dest' : ''}`} onClick={() => clickOff(0)} aria-label="berry off tray"><span className="trayn"><Disc side={0} px={2} /> {s.off[0]}</span></button>
        </div>
      </div>
      <div className="foot">
      <div className="dicerow">
        {rollShown.length ? rollShown.map((d, i) => {
          let used = false;
          if (!tumble) { const k = remaining.indexOf(d); if (k >= 0) remaining.splice(k, 1); else used = true; }
          return <Die key={i} v={d} used={used} />;
        }) : <span className="hint">{cpuTurn ? '' : 'Tap ROLL to throw the dice'}</span>}
      </div>
      <div className="row">
        <button className="btn primary" onClick={doRoll} disabled={!needsRoll || cpuTurn || !!tumble}>ROLL</button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      <p className="hint">P1 (red) moves counter-clockwise to the bottom-right home. Hit lone blots, then bear off all 15.</p>
      </div>
      {s.winner !== null && <Celebrate title={`${NAMES[s.winner]} WINS!`} sub={opp.cpu ? (s.winner === 0 ? 'You beat the CPU!' : 'The CPU got you this time') : undefined} onAgain={reset} />}
    </div>
  );
}
