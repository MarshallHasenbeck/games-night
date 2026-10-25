import { useEffect, useRef, useState } from 'react';
import {
  HOLES, deal, flipSetup, drawDeck, takeDiscard, swapSlot, flipAfterDiscard, discardAndFlip, skipDrawn,
  visibleScore, finalScore, putBackDiscard, downCount, cpuDecide, applyAction, type Round, type Slot,
} from '../lib/playnine';
import { sfx } from '../lib/sfx';
import { CardBack, FlagArt, Leaf } from '../art';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const tone = (v: number) => (v < 0 ? 'ace' : v === 0 ? 'zero' : v <= 4 ? 'low' : v <= 8 ? 'mid' : 'high');
const TONE_HEX: Record<string, string> = { ace: '#ffffff', zero: '#1f8a3e', low: '#1f5fc0', mid: '#c06a00', high: '#c01f1f' };

function Card({ v, up, onClick, active, small, i, mode }: { v?: number; up: boolean; onClick?: () => void; active?: boolean; small?: boolean; i?: number; mode?: 'swap' | 'flip' }) {
  const t = v === undefined ? '' : tone(v);
  return (
    <button
      className={`pcard ${up ? 'up' : ''} ${t} ${active ? 'active' : ''} ${active && mode ? `m-${mode}` : ''} ${small ? 'small' : ''} ${i !== undefined ? 'dealt' : ''}`}
      style={i !== undefined ? { ['--i' as string]: i } : undefined}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="flip">
        <span className="face back"><CardBack /></span>
        <span className="face front">
          {v !== undefined && (
            <>
              <span className="cn tl">{v}</span>
              <span className="cn br">{v}</span>
              <span className="cmid">
                {v === -5 ? <FlagArt px={small ? 2 : 3} fill="#fff" /> : <Leaf color={TONE_HEX[t]} px={small ? 2 : 3} />}
                <b>{v}</b>
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

export default function PlayNine() {
  const opp = useOpponent('playnine');
  const [hole, setHole] = useState(1);
  const [round, setRound] = useState<Round>(() => deal(0));
  const [totals, setTotals] = useState<[number[], number[]]>([[], []]);
  const [armed, setArmed] = useState(false);            // 'place it on a face-down card' mode
  const [confirmNew, setConfirmNew] = useState(false);
  const recorded = useRef(false);
  const names = ['P1', opp.cpu ? 'CPU' : 'P2'];
  const r = round;
  const over = hole > HOLES;
  const cpuTurn = opp.cpu && r.turn === 1 && r.phase !== 'roundOver' && !over;
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  useEffect(() => {
    if (!over) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    const [a, b] = [sum(totals[0]), sum(totals[1])];
    recordResult('playnine', a === b ? 'draw' : a < b ? 0 : 1);
    setTimeout(sfx.win, 300);
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => { sfx.flip(); setRound((cur) => applyAction(cur, cpuDecide(cur, opp.level))); }, r.phase === 'setup' ? 650 : 950);
    return () => clearTimeout(id);
  }, [round, cpuTurn, opp.level]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (next: Round) => { sfx.flip(); setArmed(false); setRound(next); };
  useEffect(() => { setArmed(false); }, [round.drawn, round.phase, round.turn]);
  const finishRound = () => {
    const next: [number[], number[]] = [[...totals[0], finalScore(r.grids[0])], [...totals[1], finalScore(r.grids[1])]];
    setTotals(next);
    sfx.click();
    if (hole < HOLES) { setHole(hole + 1); setRound(deal(hole % 2 === 0 ? 0 : 1)); } else setHole(HOLES + 1);
  };
  const reset = () => { setHole(1); setTotals([[], []]); setRound(deal(0)); setArmed(false); setConfirmNew(false); };

  if (over) {
    const [a, b] = [sum(totals[0]), sum(totals[1])];
    const title = a === b ? `TIE AT ${a}!` : `${names[a < b ? 0 : 1]} WINS!`;
    return (
      <div className="game playnine">
        <ModeBar opp={opp} onChange={reset} />
        <div className="status">{title} {a === b ? '' : `${Math.min(a, b)} TO ${Math.max(a, b)}`}</div>
        <Scoreboard totals={totals} names={names} />
        <button className="btn primary" onClick={reset}>PLAY AGAIN</button>
        <Celebrate title={title} sub={`${a} to ${b}`} onAgain={reset} />
      </div>
    );
  }

  const can = (phase: Round['phase']) => r.phase === phase && !cpuTurn;
  const fromDeck = r.drawn?.from === 'deck';
  const lastOne = downCount(r.grids[r.turn]) === 1;
  const n = names[r.turn];
  const prompt =
    cpuTurn ? 'CPU IS PLAYING...'
    : r.phase === 'setup' ? `${n}: FLIP ANY 2 CARDS (${2 - r.setupFlips[r.turn]} TO GO)`
    : r.phase === 'draw' ? `${n} · STEP 1: DRAW A CARD OR TAKE THE DISCARD`
    : r.phase === 'place' ? (!fromDeck ? `${n} · STEP 2: TAP ANY CARD TO SWAP IT IN - OR TAP DISCARD TO PUT IT BACK`
        : armed ? `${n} · TAP ANY CARD TO PUT YOUR CARD THERE`
        : lastOne ? `${n} · STEP 2: FLIP YOUR LAST CARD (ENDS ROUND) OR SKIP`
        : `${n} · STEP 2: TAP A FACE-DOWN CARD TO FLIP IT, A FACE-UP ONE TO SWAP`)
    : r.phase === 'flip' ? `${n} · TAP A FACE-DOWN CARD TO FLIP IT`
    : 'HOLE COMPLETE!';

  // what tapping a card in your grid does right now
  const tapMode = (s: Slot): 'swap' | 'flip' | null => {
    if (can('setup')) return s.up ? null : 'flip';
    if (can('place')) return fromDeck && !armed && !s.up ? 'flip' : 'swap';
    if (can('flip')) return s.up ? null : 'flip';
    return null;
  };
  const clickSlot = (p: number, i: number): (() => void) | undefined => {
    if (p !== r.turn || cpuTurn) return undefined;
    const s: Slot = r.grids[p][i];
    const m = tapMode(s);
    if (!m) return undefined;
    if (can('setup')) return () => go(flipSetup(r, i));
    if (can('place')) return m === 'flip' ? () => go(discardAndFlip(r, i)) : () => go(swapSlot(r, i));
    return () => go(flipAfterDiscard(r, i));
  };

  const live = r.phase !== 'roundOver';
  const grid = (p: number) => (
    <div className={`pgrid pc${p} ${p === r.turn && live ? 'turn' : ''}`}>
      <div className="pname">
        {names[p]} <span>{r.phase === 'roundOver' ? finalScore(r.grids[p]) : visibleScore(r.grids[p])}</span>
        {r.finisher === p && <b> OUT!</b>}
      </div>
      <div className="cells" key={`${hole}-${p}`}>
        {r.grids[p].map((s, i) => {
          const click = clickSlot(p, i);
          return <Card key={i} v={s.v} up={s.up} onClick={click} active={!!click} mode={click ? tapMode(s) ?? undefined : undefined} i={i + p * 8} />;
        })}
      </div>
    </div>
  );

  const t0 = finalScore(r.grids[0]), t1 = finalScore(r.grids[1]);
  return (
    <div className="game playnine">
      <div className="head">
        <ModeBar opp={opp} onChange={reset} />
        <div className={`status turnbar t${r.turn} ${live ? '' : 'done'}`}>
          {live ? <>▶ {n}'S TURN</> : <>HOLE {hole} COMPLETE</>} <small>HOLE {hole} OF {HOLES}</small>
        </div>
        <p className="hint prompt">{prompt}</p>
      </div>
      <div className={`main pnboard ${live ? 'live' : ''}`}>
        <div className="area p1">{grid(0)}</div>
        <div className="area pnmid">
          {live ? (
            <div className="piles">
              <div className="pile">
                <Card up={false} small onClick={can('draw') ? () => go(drawDeck(r)) : undefined} active={can('draw')} />
                <span>{can('draw') ? 'DRAW NEW' : `DECK ${r.deck.length}`}</span>
              </div>
              <div className="pile">
                {r.drawn
                  ? <Card v={r.drawn.v} up small onClick={can('place') && fromDeck ? () => { sfx.click(); setArmed((a) => !a); } : undefined} active={can('place') && fromDeck && !armed} />
                  : <span className="slot" />}
                <span>{r.drawn ? (can('place') && fromDeck ? (armed ? 'PLACING...' : 'YOUR CARD') : 'YOUR CARD') : ''}</span>
              </div>
              <div className="pile">
                <Card
                  v={r.discard.at(-1)} up small
                  onClick={can('draw') ? () => go(takeDiscard(r)) : can('place') && !fromDeck ? () => go(putBackDiscard(r)) : undefined}
                  active={can('draw') || (can('place') && !fromDeck)}
                />
                <span>{can('draw') ? 'TAKE THIS' : can('place') && !fromDeck ? 'PUT BACK' : 'DISCARD'}</span>
              </div>
            </div>
          ) : (
            <div className="holedone">
              <b>HOLE {hole} DONE</b>
              <span>{names[0]} {t0}</span><span>{names[1]} {t1}</span>
              <button className="btn primary big" onClick={finishRound}>{hole < HOLES ? 'NEXT HOLE ▶' : 'FINAL SCORE ▶'}</button>
            </div>
          )}
        </div>
        <div className="area p2">{grid(1)}</div>
        <div className="area choice">
          {can('place') && fromDeck ? (
            <div className="choice2">
              <span className="tip">{armed ? 'Tap YOUR CARD again to cancel.' : 'Want it on a face-down card? Tap YOUR CARD first, then the spot.'}</span>
              {lastOne && !armed && <button className="btn primary skipbtn" onClick={() => go(skipDrawn(r))}>SKIP - KEEP IT HIDDEN</button>}
            </div>
          ) : can('place') ? (
            <div className="choice2"><span className="tip">You took the discard - place it on any card, or put it back.</span></div>
          ) : (
            <div className="choice2 idle" aria-hidden><span className="tip">Want it on a face-down card? Tap YOUR CARD first, then the spot.</span></div>
          )}
        </div>
      </div>
      <div className="foot">
        <HoleStrip totals={totals} names={names} hole={hole} />
        <button className="btn ghost newgame" onClick={() => setConfirmNew(true)}>↺ NEW GAME</button>
      </div>
      {confirmNew && (
        <div className="celebrate" role="dialog">
          <div className="banner">
            <h2>START A NEW GAME?</h2>
            <p>This ends the game you're playing.</p>
            <div className="row">
              <button className="btn primary" onClick={() => setConfirmNew(false)}>KEEP PLAYING</button>
              <button className="btn" onClick={reset}>YES, START OVER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HoleStrip({ totals, names, hole }: { totals: [number[], number[]]; names: string[]; hole: number }) {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const t = [sum(totals[0]), sum(totals[1])];
  const done = totals[0].length;
  return (
    <div className="holestrip" aria-label="Scorecard">
      <div className="hs-row hs-head"><span />{Array.from({ length: HOLES }, (_, i) => <span key={i} className={i + 1 === hole ? 'now' : ''}>{i + 1}</span>)}<b>TOT</b></div>
      {[0, 1].map((p) => (
        <div className="hs-row" key={p}>
          <span className="hs-name">{names[p]}</span>
          {Array.from({ length: HOLES }, (_, i) => <span key={i} className={`${i + 1 === hole ? 'now' : ''} ${i < done ? 'done' : ''}`}>{i < done ? totals[p][i] : ''}</span>)}
          <b className={done && t[p] < t[p === 0 ? 1 : 0] ? 'lead' : ''}>{done ? t[p] : 0}</b>
        </div>
      ))}
    </div>
  );
}

function Scoreboard({ totals, names }: { totals: [number[], number[]]; names: string[] }) {
  if (!totals[0].length) return null;
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return (
    <table className="score">
      <thead><tr><th>HOLE</th><th>{names[0]}</th><th>{names[1]}</th></tr></thead>
      <tbody>
        {totals[0].map((_, i) => <tr key={i}><th>{i + 1}</th><td>{totals[0][i]}</td><td>{totals[1][i]}</td></tr>)}
        <tr className="total"><th>TOTAL</th><td>{sum(totals[0])}</td><td>{sum(totals[1])}</td></tr>
      </tbody>
    </table>
  );
}
