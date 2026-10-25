import { useEffect, useState } from 'react';
import {
  HOLES, deal, flipSetup, drawDeck, takeDiscard, swapSlot, discardDrawn, flipAfterDiscard,
  visibleScore, finalScore, type Round, type Slot,
} from '../lib/playnine';
import { sfx } from '../lib/sfx';
import Sprite from '../Sprite';

const label = (v: number) => (v === -5 ? <><Sprite name="flag" fill="#fff" outline="#0c4a2b" size={22} /><br />-5</> : String(v));
const tone = (v: number) => (v < 0 ? 'ace' : v === 0 ? 'zero' : v <= 4 ? 'low' : v <= 8 ? 'mid' : 'high');

function Card({ v, up, onClick, active, small }: { v?: number; up: boolean; onClick?: () => void; active?: boolean; small?: boolean }) {
  return (
    <button
      className={`pcard ${up ? `up ${tone(v!)}` : 'down'} ${active ? 'active' : ''} ${small ? 'small' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      {up ? label(v!) : ''}
    </button>
  );
}

export default function PlayNine() {
  const [hole, setHole] = useState(1);
  const [round, setRound] = useState<Round>(() => deal(0));
  const [totals, setTotals] = useState<[number[], number[]]>([[], []]);
  const names = ['P1', 'P2'];
  const r = round;
  const over = hole > HOLES;
  useEffect(() => { if (over) sfx.win(); }, [over]);
  const go = (next: Round) => { sfx.flip(); setRound(next); };

  const finishRound = () => {
    const next: [number[], number[]] = [[...totals[0], finalScore(r.grids[0])], [...totals[1], finalScore(r.grids[1])]];
    setTotals(next);
    if (hole < HOLES) {
      setHole(hole + 1);
      setRound(deal(hole % 2 === 0 ? 0 : 1));
    } else setHole(HOLES + 1);
  };
  const reset = () => { setHole(1); setTotals([[], []]); setRound(deal(0)); };
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  if (hole > HOLES) {
    const [a, b] = [sum(totals[0]), sum(totals[1])];
    return (
      <div className="playnine">
        <div className="status">{a === b ? `TIE AT ${a}!` : `${names[a < b ? 0 : 1]} WINS ${Math.min(a, b)} TO ${Math.max(a, b)}!`}</div>
        <Scoreboard totals={totals} names={names} />
        <button className="btn primary" onClick={reset}>PLAY AGAIN</button>
      </div>
    );
  }

  const can = (phase: Round['phase']) => r.phase === phase;
  const prompt =
    r.phase === 'setup' ? `${names[r.turn]}: FLIP 2 CARDS (${2 - r.setupFlips[r.turn]} TO GO)`
    : r.phase === 'draw' ? `${names[r.turn]}: DRAW OR TAKE DISCARD`
    : r.phase === 'place' ? `${names[r.turn]}: SWAP A CARD${r.drawn?.from === 'deck' ? ' OR DISCARD' : ''}`
    : r.phase === 'flip' ? `${names[r.turn]}: FLIP A HIDDEN CARD`
    : 'HOLE COMPLETE!';

  const clickSlot = (p: number, i: number): (() => void) | undefined => {
    if (p !== r.turn) return undefined;
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
      <div className="cells">
        {r.grids[p].map((s, i) => (
          <Card key={i} v={s.v} up={s.up} onClick={clickSlot(p, i)} active={!!clickSlot(p, i)} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="playnine">
      <div className="status">HOLE {hole} OF {HOLES}</div>
      <p className="hint prompt">{prompt}</p>
      {grid(0)}
      <div className="center">
        <div className="pile">
          <Card up={false} small onClick={can('draw') ? () => go(drawDeck(r)) : undefined} active={can('draw')} />
          <span>DECK {r.deck.length}</span>
        </div>
        <div className="pile">
          {r.drawn ? <Card v={r.drawn.v} up small /> : <span className="slot" />}
          <span>{r.drawn ? 'IN HAND' : ''}</span>
        </div>
        <div className="pile">
          <Card
            v={r.discard.at(-1)} up small
            onClick={can('draw') ? () => go(takeDiscard(r)) : can('place') && r.drawn?.from === 'deck' ? () => go(discardDrawn(r)) : undefined}
            active={can('draw') || (can('place') && r.drawn?.from === 'deck')}
          />
          <span>{can('place') && r.drawn?.from === 'deck' ? 'DISCARD IT' : 'DISCARD'}</span>
        </div>
      </div>
      {grid(1)}
      {r.phase === 'roundOver' && (
        <button className="btn primary" onClick={finishRound}>{hole < HOLES ? 'NEXT HOLE' : 'FINAL SCORE'}</button>
      )}
      <Scoreboard totals={totals} names={names} />
      <div className="row"><button className="btn" onClick={reset}>NEW GAME</button></div>
      <p className="hint">Matching columns = 0. Flag = -5. Lowest total after 9 holes wins. When someone flips their last card, the other player gets one last turn.</p>
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
