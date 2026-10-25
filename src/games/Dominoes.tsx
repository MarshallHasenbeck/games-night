import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { newRound, ends, sidesFor, playable, play, draw, pass, mustDraw, mustPass, cpuPlay, pips, TARGET, type DState, type Side, type Tile as DTile } from '../lib/dominoes';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const PIPS: Record<number, number[]> = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Half({ n }: { n: number }) {
  return <span className="dhalf">{Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[n].includes(i) ? 'pip' : ''} />)}</span>;
}
function TileView({ t, back, dim, glow, selected, onClick, vertical }: { t?: DTile; back?: boolean; dim?: boolean; glow?: boolean; selected?: boolean; onClick?: () => void; vertical?: boolean }) {
  return (
    <button className={`dtile ${back ? 'back' : ''} ${dim ? 'dim' : ''} ${glow ? 'glow' : ''} ${selected ? 'selected' : ''} ${vertical ? 'vert' : ''}`} onClick={onClick} disabled={!onClick}>
      {!back && t && (<><Half n={t[0]} /><span className="dsplit" /><Half n={t[1]} /></>)}
    </button>
  );
}

export default function Dominoes() {
  const opp = useOpponent('dominoes');
  const [ds, setDs] = useState<DState>(() => newRound(0));
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [applied, setApplied] = useState(false);
  const [round, setRound] = useState(1);
  const [sel, setSel] = useState<number | null>(null);
  const [handoff, setHandoff] = useState(false);
  const recorded = useRef(false);
  const names = ['P1', opp.cpu ? 'CPU' : 'P2'];
  const cpuTurn = opp.cpu && ds.turn === 1 && ds.phase === 'play';
  const gameOver = ds.phase === 'roundOver' && applied && (scores[0] >= TARGET || scores[1] >= TARGET);
  const gameWinner: 0 | 1 = scores[0] >= scores[1] ? 0 : 1;

  useEffect(() => {
    if (ds.phase !== 'roundOver' || applied) return;
    setApplied(true);
    const w = ds.result!.winner;
    if (w !== 'draw') setScores((sc) => (w === 0 ? [sc[0] + ds.result!.points, sc[1]] : [sc[0], sc[1] + ds.result!.points]));
    sfx.score();
  }, [ds, applied]);
  useEffect(() => {
    if (!gameOver) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('dominoes', gameWinner);
    setTimeout(sfx.win, 300);
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterTurnChange = (before: DState, after: DState) => {
    if (!opp.cpu && after.phase === 'play' && after.turn !== before.turn) setHandoff(true);
  };
  const doPlay = (idx: number, side: Side) => {
    sfx.move();
    const next = play(ds, idx, side);
    afterTurnChange(ds, next);
    setSel(null);
    setDs(next);
  };
  const doDraw = () => { sfx.flip(); setDs(draw(ds)); };
  const doPass = () => { const next = pass(ds); afterTurnChange(ds, next); setDs(next); };

  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => {
      if (mustDraw(ds)) { sfx.flip(); setDs(draw(ds)); }
      else if (mustPass(ds)) setDs(pass(ds));
      else { const a = cpuPlay(ds, opp.level); sfx.move(); setDs(play(ds, a.idx, a.side)); }
    }, 900);
    return () => clearTimeout(id);
  }, [ds, cpuTurn, opp.level]); // eslint-disable-line react-hooks/exhaustive-deps

  const clickTile = (idx: number) => {
    if (cpuTurn || ds.phase !== 'play') return;
    const sides = sidesFor(ds.hands[ds.turn][idx], ds.chain);
    if (!sides.length) return;
    if (sides.length === 1) return doPlay(idx, sides[0]);
    sfx.click();
    setSel(sel === idx ? null : idx);
  };
  const nextRound = () => {
    sfx.click();
    setRound(round + 1); setApplied(false); setSel(null);
    const starter = (round % 2) as 0 | 1;
    setDs(newRound(starter));
    setHandoff(!opp.cpu);
  };
  const reset = () => { setDs(newRound(0)); setScores([0, 0]); setApplied(false); setRound(1); setSel(null); setHandoff(false); };

  const cur = ds.turn;
  const top: 0 | 1 = opp.cpu || cur === 0 ? 1 : 0;
  const bottom: 0 | 1 = top === 1 ? 0 : 1;
  const e = ends(ds.chain);
  const ok = new Set(ds.phase === 'play' && !cpuTurn ? playable(ds, cur) : []);
  const selSides = sel !== null ? sidesFor(ds.hands[cur][sel], ds.chain) : [];
  const hiddenHand = (p: 0 | 1) => opp.cpu ? p === 1 : p !== cur;
  const showHandoff = handoff && !opp.cpu && ds.phase === 'play';
  const status = ds.phase === 'roundOver'
    ? ds.result!.winner === 'draw' ? 'ROUND DRAWN' : `${names[ds.result!.winner]} TAKES THE ROUND +${ds.result!.points}`
    : cpuTurn ? 'CPU IS THINKING...'
    : mustDraw(ds) ? `${names[cur]}: NO MATCH - DRAW A TILE`
    : mustPass(ds) ? `${names[cur]}: NO MOVES - PASS`
    : `${names[cur]}: PLAY A TILE`;

  const hand = (p: 0 | 1) => (
    <div className={`dhand ${p === cur && ds.phase === 'play' ? 'turn' : ''}`}>
      <div className="pname">{names[p]} <span>{scores[p]}</span> <b>{ds.hands[p].length} tiles</b></div>
      <div className="tiles">
        {ds.hands[p].map((t, i) => {
          const hide = hiddenHand(p) && ds.phase === 'play';
          const mine = p === cur && !hide;
          return (
            <TileView key={`${t[0]}${t[1]}`} t={t} back={hide} dim={mine && !ok.has(i) && ds.phase === 'play' && !cpuTurn}
              glow={mine && ok.has(i)} selected={mine && sel === i} onClick={mine && ok.has(i) ? () => clickTile(i) : undefined} />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="dominoes">
      <ModeBar opp={opp} onChange={reset} />
      <div className="status">{status}</div>
      <div className="captures">ROUND {round} · FIRST TO {TARGET} · {names[0]} {scores[0]} · {names[1]} {scores[1]}</div>
      {hand(top)}
      <div className="chainbox">
        {ds.chain.length ? (
          <div className="chain">
            {ds.chain.map((t, i) => <TileView key={i} t={t} vertical={t[0] === t[1]} />)}
          </div>
        ) : <p className="hint">Play any tile to start the line</p>}
      </div>
      {sel !== null && selSides.length === 2 && e && (
        <div className="row">
          <button className="btn primary" onClick={() => doPlay(sel, 'L')}>◀ LEFT END ({e[0]})</button>
          <button className="btn primary" onClick={() => doPlay(sel, 'R')}>RIGHT END ({e[1]}) ▶</button>
        </div>
      )}
      <div className="row">
        <button className="btn" onClick={doDraw} disabled={!mustDraw(ds) || cpuTurn}>DRAW ({ds.yard.length})</button>
        <button className="btn" onClick={doPass} disabled={!mustPass(ds) || cpuTurn}>PASS</button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      {hand(bottom)}
      {ds.phase === 'roundOver' && !gameOver && (
        <>
          <div className="dhand reveal"><div className="pname">{names[0]} left: {pips(ds.hands[0])} pips · {names[1]} left: {pips(ds.hands[1])} pips</div></div>
          <div className="row"><button className="btn primary" onClick={nextRound}>NEXT ROUND</button></div>
        </>
      )}
      <p className="hint">Match the open ends. First to {TARGET} points wins; the round winner scores the pips left in the other hand.</p>
      {showHandoff && (
        <div className="handoff">
          <div className="banner">
            <h2>PASS TO {names[cur]}</h2>
            <p>Hand the screen over, then tap when ready.</p>
            <button className="btn primary" onClick={() => setHandoff(false)}>I'M {names[cur]} - SHOW MY TILES</button>
          </div>
        </div>
      )}
      {gameOver && <Celebrate title={`${names[gameWinner]} WINS!`} sub={`${scores[0]} to ${scores[1]}`} onAgain={reset} />}
    </div>
  );
}
