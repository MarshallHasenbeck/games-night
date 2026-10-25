import { useEffect, useRef, useState } from 'react';
import {
  HOLES, deal, flipSetup, drawDeck, takeDiscard, swapSlot, discardDrawn, flipAfterDiscard,
  visibleScore, finalScore, putBackDiscard, skipFlip, downCount, cpuDecide, applyAction, type Round, type Slot,
} from '../lib/playnine';
import { sfx } from '../lib/sfx';
import { CardBack, FlagArt, Leaf } from '../art';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const tone = (v: number) => (v < 0 ? 'ace' : v === 0 ? 'zero' : v <= 4 ? 'low' : v <= 8 ? 'mid' : 'high');
const TONE_HEX: Record<string, string> = { ace: '#ffffff', zero: '#1f8a3e', low: '#1f5fc0', mid: '#c06a00', high: '#c01f1f' };

function Card({ v, up, onClick, active, small, i }: { v?: number; up: boolean; onClick?: () => void; active?: boolean; small?: boolean; i?: number }) {
  const t = v === undefined ? '' : tone(v);
  return (
    <button
      className={`pcard ${up ? 'up' : ''} ${t} ${active ? 'active' : ''} ${small ? 'small' : ''} ${i !== undefined ? 'dealt' : ''}`}
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

  const go = (next: Round) => { sfx.flip(); setRound(next); };
  const finishRound = () => {
    const next: [number[], number[]] = [[...totals[0], finalScore(r.grids[0])], [...totals[1], finalScore(r.grids[1])]];
    setTotals(next);
    sfx.click();
    if (hole < HOLES) { setHole(hole + 1); setRound(deal(hole % 2 === 0 ? 0 : 1)); } else setHole(HOLES + 1);
  };
  const reset = () => { setHole(1); setTotals([[], []]); setRound(deal(0)); };

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
  const prompt =
    cpuTurn ? 'CPU IS PLAYING...'
    : r.phase === 'setup' ? `${names[r.turn]}: FLIP ANY 2 CARDS (${2 - r.setupFlips[r.turn]} TO GO)`
    : r.phase === 'draw' ? `${names[r.turn]} · STEP 1: DRAW A CARD OR TAKE THE DISCARD`
    : r.phase === 'place' ? (fromDeck
        ? `${names[r.turn]} · STEP 2: SWAP IT INTO YOUR GRID OR DISCARD & FLIP`
        : `${names[r.turn]} · STEP 2: SWAP IT INTO YOUR GRID OR PUT IT BACK`)
    : r.phase === 'flip' ? (lastOne
        ? `${names[r.turn]} · STEP 3: FLIP YOUR LAST CARD (ENDS ROUND) OR SKIP`
        : `${names[r.turn]} · STEP 3: FLIP A FACE-DOWN CARD`)
    : 'HOLE COMPLETE!';

  const clickSlot = (p: number, i: number): (() => void) | undefined => {
    if (p !== r.turn || cpuTurn) return undefined;
    const s: Slot = r.grids[p][i];
    if (can('setup') && !s.up) return () => go(flipSetup(r, i));
    if (can('place')) return () => go(swapSlot(r, i));
    if (can('flip') && !s.up) return () => go(flipAfterDiscard(r, i));
    return undefined;
  };

  const grid = (p: number) => (
    <div className={`pgrid ${p === r.turn && r.phase !== 'roundOver' ? 'turn' : ''}`}>
      <div className="pname">
        {names[p]} <span>{r.phase === 'roundOver' ? finalScore(r.grids[p]) : visibleScore(r.grids[p])}</span>
        {r.finisher === p && <b> OUT!</b>}
      </div>
      <div className="cells" key={`${hole}-${p}`}>
        {r.grids[p].map((s, i) => (
          <Card key={i} v={s.v} up={s.up} onClick={clickSlot(p, i)} active={!!clickSlot(p, i)} i={i + p * 8} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="game playnine">
      <div className="head">
        <ModeBar opp={opp} onChange={reset} />
        <div className="status">HOLE {hole} OF {HOLES}</div>
        <p className="hint prompt">{prompt}</p>
      </div>
      <div className="main pnboard">
        <div className="area p1">{grid(0)}</div>
        <div className="area pnmid">
          <div className="piles">
            <div className="pile">
              <Card up={false} small onClick={can('draw') ? () => go(drawDeck(r)) : undefined} active={can('draw')} />
              <span>{can('draw') ? 'DRAW NEW' : `DECK ${r.deck.length}`}</span>
            </div>
            <div className="pile">
              {r.drawn ? <Card v={r.drawn.v} up small /> : <span className="slot" />}
              <span>{r.drawn ? 'YOUR CARD' : ''}</span>
            </div>
            <div className="pile">
              <Card
                v={r.discard.at(-1)} up small
                onClick={can('draw') ? () => go(takeDiscard(r)) : undefined}
                active={can('draw')}
              />
              <span>{can('draw') ? 'TAKE THIS' : 'DISCARD'}</span>
            </div>
          </div>
        </div>
        <div className="area p2">{grid(1)}</div>
        <div className="area choice">
          {can('flip') && lastOne ? (
            <div className="choice2">
              <div className="opt"><b>FLIP IT</b><span>tap your last face-down card - ends your round</span></div>
              <span className="or">OR</span>
              <button className="btn primary discardbtn" onClick={() => go(skipFlip(r))}>SKIP - KEEP IT FACE DOWN</button>
            </div>
          ) : can('place') ? (
            <div className="choice2">
              <div className="opt"><b>USE IT</b><span>tap a card in your grid to swap</span></div>
              <span className="or">OR</span>
              {fromDeck
                ? <button className="btn primary discardbtn" onClick={() => go(discardDrawn(r))}>{lastOne ? 'DISCARD IT' : 'DISCARD IT & FLIP A CARD'}</button>
                : <button className="btn discardbtn" onClick={() => go(putBackDiscard(r))}>↩ PUT IT BACK</button>}
            </div>
          ) : (
            <div className="choice2 idle" aria-hidden>
              <div className="opt"><b>USE IT</b><span>tap a card in your grid to swap</span></div>
              <span className="or">OR</span>
              <button className="btn discardbtn" tabIndex={-1}>DISCARD IT &amp; FLIP A CARD</button>
            </div>
          )}
        </div>
      </div>
      <div className="foot">
        {r.phase === 'roundOver' && (
          <button className="btn primary" onClick={finishRound}>{hole < HOLES ? 'NEXT HOLE' : 'FINAL SCORE'}</button>
        )}
        <HoleStrip totals={totals} names={names} hole={hole} />
        <div className="row"><button className="btn" onClick={reset}>NEW GAME</button></div>
      </div>
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
