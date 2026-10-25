import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  HOLES, deal, flipSetup, drawDeck, takeDiscard, swapSlot, flipAfterDiscard, discardAndFlip, skipDrawn,
  visibleScore, finalScore, putBackDiscard, downCount, cpuDecide, applyAction, type Round, type Slot,
} from '../lib/playnine';
import { sfx } from '../lib/sfx';
import { CardBack, FlagArt, Leaf } from '../art';
import { Celebrate, ModeBar, Overlay, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const tone = (v: number) => (v < 0 ? 'ace' : v === 0 ? 'zero' : v <= 4 ? 'low' : v <= 8 ? 'mid' : 'high');
const TONE_HEX: Record<string, string> = { ace: '#ffffff', zero: '#1f8a3e', low: '#1f5fc0', mid: '#c06a00', high: '#c01f1f' };

function Card({ v, up, onClick, active, small, i, mode, slot, hide, sty }: { v?: number; up: boolean; onClick?: () => void; active?: boolean; small?: boolean; i?: number; mode?: 'swap' | 'flip'; slot?: string; hide?: boolean; sty?: CSSProperties }) {
  const t = v === undefined ? '' : tone(v);
  return (
    <button
      className={`pcard ${up ? 'up' : ''} ${t} ${active ? 'active' : ''} ${active && mode ? `m-${mode}` : ''} ${small ? 'small' : ''} ${i !== undefined ? 'dealt' : ''}`}
      style={{ ...(i !== undefined ? { ['--i' as string]: i } : {}), ...(hide ? { visibility: 'hidden' as const } : {}), ...sty }}
      data-slot={slot}
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


/* ---------- flying cards (deal from the deck, place, swap, discard) ---------- */
type Box = { x: number; y: number; w: number; h: number };
type Flight = { id: number; from: Box; to: Box; v: number; upFrom: boolean; upTo: boolean; hide: string[]; dur: number };
const boxOf = (key: string): Box | null => {
  const e = document.querySelector(`[data-slot="${key}"]`);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

function Ghost({ f, done }: { f: Flight; done: () => void }) {
  const [up, setUp] = useState(f.upFrom);
  const ref = (el: HTMLDivElement | null) => {
    if (!el || el.dataset.go) return;
    el.dataset.go = '1';
    const dx = f.to.x - f.from.x, dy = f.to.y - f.from.y, lift = Math.max(24, Math.hypot(dx, dy) * 0.18);
    const k = f.to.w / f.from.w;
    const an = el.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: `translate(${dx / 2}px,${dy / 2 - lift}px) scale(${(1 + k) / 2 * 1.18}) rotate(${dx > 0 ? 4 : -4}deg)`, offset: 0.5 },
      { transform: `translate(${dx}px,${dy}px) scale(${k}) rotate(0deg)` },
    ], { duration: f.dur, easing: 'cubic-bezier(.35,.1,.25,1)' });
    an.onfinish = an.oncancel = done;
    if (f.upTo !== f.upFrom) setTimeout(() => setUp(f.upTo), f.dur * 0.18);
  };
  return (
    <div ref={ref} className="ghostcard" style={{ left: f.from.x, top: f.from.y, width: f.from.w, height: f.from.h }}>
      <Card v={f.v} up={up} small={f.from.w < 100} sty={{ width: '100%', fontSize: f.from.w * 0.4 }} />
    </div>
  );
}

export default function PlayNine() {
  const opp = useOpponent('playnine');
  const [hole, setHole] = useState(1);
  const [round, setRound] = useState<Round>(() => deal(0));
  const [totals, setTotals] = useState<[number[], number[]]>([[], []]);
  const [useIt, setUseIt] = useState(true);            // drawn card: true = place it anywhere, false = discard it & flip a card
  const [confirmNew, setConfirmNew] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightId = useRef(0);
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
    const id = setTimeout(() => { sfx.flip(); const next = applyAction(round, cpuDecide(round, opp.level)); animate(round, next); setRound(next); }, r.phase === 'setup' ? 650 : 950);
    return () => clearTimeout(id);
  }, [round, cpuTurn, opp.level]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Work out which cards moved between two states and send a ghost card flying along each path. */
  const animate = (prev: Round, next: Round) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const out: Flight[] = [];
    const add = (fromKey: string, toKey: string, v: number, upFrom: boolean, upTo: boolean, hide: string[], dur = 520) => {
      const from = boxOf(fromKey), to = boxOf(toKey);
      if (from && to) out.push({ id: ++flightId.current, from, to, v, upFrom, upTo, hide, dur });
    };
    if (!prev.drawn && next.drawn) {
      add(next.drawn.from === 'deck' ? 'deck' : 'discard', 'drawn', next.drawn.v, next.drawn.from === 'discard', true, ['drawn']);
    } else if (prev.drawn && !next.drawn) {
      const g0 = prev.grids[prev.turn], g1 = next.grids[prev.turn];
      const i = g0.findIndex((c, k) => c.v !== g1[k].v || c.up !== g1[k].up);
      const key = `${prev.turn}-${i}`;
      if (i >= 0 && g0[i].v !== g1[i].v) {            // swapped in: the drawn card lands, the old card goes to the discard pile
        add('drawn', key, prev.drawn.v, true, true, [key]);
        add(key, 'discard', g0[i].v, g0[i].up, true, ['discard'], 480);
      } else add('drawn', 'discard', prev.drawn.v, true, true, ['discard']);   // discarded (flip, put back or skip)
    }
    if (out.length) setFlights((f) => [...f, ...out]);
  };
  const hidden = new Set(flights.flatMap((f) => f.hide));
  const landed = (id: number) => setFlights((f) => f.filter((x) => x.id !== id));
  const go = (next: Round) => { sfx.flip(); setUseIt(true); animate(r, next); setRound(next); };
  useEffect(() => { setUseIt(true); }, [round.drawn, round.phase, round.turn]);
  const finishRound = () => {
    const next: [number[], number[]] = [[...totals[0], finalScore(r.grids[0])], [...totals[1], finalScore(r.grids[1])]];
    setTotals(next);
    sfx.click();
    if (hole < HOLES) { setHole(hole + 1); setRound(deal(hole % 2 === 0 ? 0 : 1)); } else setHole(HOLES + 1);
  };
  const reset = () => { setHole(1); setTotals([[], []]); setRound(deal(0)); setUseIt(true); setConfirmNew(false); };

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
    : r.phase === 'place' ? (!fromDeck ? `${n} · TAP A CARD TO SWAP IT IN, OR TAP DISCARD TO PUT BACK`
        : useIt ? `${n} · STEP 2: TAP ANY CARD TO PLACE YOUR CARD THERE`
        : lastOne ? `${n} · TAP YOUR LAST CARD TO FLIP IT (ENDS ROUND) OR SKIP`
        : `${n} · STEP 2: TAP A FACE-DOWN CARD TO FLIP IT`)
    : r.phase === 'flip' ? `${n} · TAP A FACE-DOWN CARD TO FLIP IT`
    : 'HOLE COMPLETE!';

  // what tapping a card in your grid does right now
  const tapMode = (s: Slot): 'swap' | 'flip' | null => {
    if (can('setup')) return s.up ? null : 'flip';
    if (can('place')) return fromDeck && !useIt ? (s.up ? null : 'flip') : 'swap';
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
          return <Card key={i} v={s.v} up={s.up} onClick={click} active={!!click} mode={click ? tapMode(s) ?? undefined : undefined} i={i + p * 8} slot={`${p}-${i}`} hide={hidden.has(`${p}-${i}`)} />;
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
                <Card up={false} small slot="deck" onClick={can('draw') ? () => go(drawDeck(r)) : undefined} active={can('draw')} />
                <span>{can('draw') ? 'DRAW NEW' : `DECK ${r.deck.length}`}</span>
              </div>
              <div className="pile">
                {r.drawn
                  ? <Card v={r.drawn.v} up small slot="drawn" hide={hidden.has('drawn')} onClick={undefined} active={false} />
                  : <span className="slot" data-slot="drawn" />}
                <span>{r.drawn ? (can('place') && fromDeck ? 'YOUR CARD' : 'YOUR CARD') : ''}</span>
              </div>
              <div className="pile">
                <Card
                  v={r.discard.at(-1)} up small slot="discard" hide={hidden.has('discard')}
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
              <button className={`btn ${useIt ? '' : 'primary'}`} onClick={() => { sfx.click(); setUseIt(!useIt); }}>{useIt ? 'DISCARD IT & FLIP' : '✕ CANCEL DISCARD'}</button>
              {lastOne && <button className="btn skipbtn" onClick={() => go(skipDrawn(r))}>SKIP</button>}
            </div>
          ) : can('place') ? (
            <div className="choice2"><span className="tip">You took the discard - place it on any card, or put it back.</span></div>
          ) : (
            <div className="choice2 idle" aria-hidden><button className="btn">DISCARD IT &amp; FLIP</button></div>
          )}
        </div>
      </div>
      <div className="foot">
        <HoleStrip totals={totals} names={names} hole={hole} />
        <button className="btn ghost newgame" onClick={() => setConfirmNew(true)}>↺ NEW GAME</button>
      </div>
      {flights.length > 0 && <Overlay><div className="ghostlayer">{flights.map((f) => <Ghost key={f.id} f={f} done={() => landed(f.id)} />)}</div></Overlay>}
      {confirmNew && (
        <Overlay><div className="celebrate" role="dialog">
          <div className="banner">
            <h2>START A NEW GAME?</h2>
            <p>This ends the game you're playing.</p>
            <div className="row">
              <button className="btn primary" onClick={() => setConfirmNew(false)}>KEEP PLAYING</button>
              <button className="btn" onClick={reset}>YES, START OVER</button>
            </div>
          </div>
        </div></Overlay>
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
          {Array.from({ length: HOLES }, (_, i) => <span key={i} className={`${i + 1 === hole ? 'now' : ''} ${i < done ? 'done' : ''} ${i < done && totals[p][i] < 0 ? 'neg' : ''}`}>{i < done ? totals[p][i] : ''}</span>)}
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
