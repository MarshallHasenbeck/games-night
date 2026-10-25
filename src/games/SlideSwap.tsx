import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '../lib/sfx';
import { PLAYER_COLORS, playerName, seatsFor } from '../lib/seats';
import {
  HOME, PEN, SAFE, SLIDES, RING_RC, ringOf, progOf, newSlide, draw, legalMoves, play, skipTurn, cpuChoose, cellOf, homeRC, penRC, safeRC,
  type SState, type SMove,
} from '../lib/slide';
import { Celebrate, Overlay, SeatPicker, useSeatCfg } from '../ui';
import { CardBack, DuckArt } from '../art';
import { FxLayer, MushroomPiece, useFx } from '../racers';
import { makeBoardTexture } from '../boardart';
import { recordResult } from '../lib/stats';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (n: number) => `${(n * 100) / 16}%`;
const CARD_TEXT: Record<number, string> = {
  0: 'SORRY! Take a pawn from START and bump any opponent.', 1: 'Start a pawn, or move 1.', 2: 'Start a pawn, or move 2. Then draw again!',
  3: 'Move 3.', 4: 'Move BACKWARD 4.', 5: 'Move 5.', 7: 'Move 7, or split it between two pawns.', 8: 'Move 8.',
  10: 'Move 10, or go back 1.', 11: 'Move 11, or SWAP with an opponent.', 12: 'Move 12.',
};
const angle = (idx: number) => {
  const a = RING_RC[idx], b = RING_RC[(idx + 1) % 60];
  return b[1] > a[1] ? 0 : b[0] > a[0] ? 90 : b[1] < a[1] ? 180 : 270;
};

function Face({ v, flip }: { v: number; flip?: boolean }) {
  return (
    <span className={`scard ${v === 0 ? 'sorry' : v === 4 ? 'back' : ''} ${flip ? 'flipin' : ''}`}>
      <b>{v === 0 ? 'SORRY!' : v}</b>
      <small>{CARD_TEXT[v]}</small>
    </span>
  );
}

export default function SlideSwap() {
  const [cfg, setCfg] = useSeatCfg('slide');
  const seats = seatsFor(cfg.n);
  const order = (seat: number) => seats.indexOf(seat);
  const nameOf = (seat: number) => playerName(cfg, order(seat));
  const color = (seat: number) => PLAYER_COLORS[order(seat)].main;
  const [g, setG] = useState<SState>(() => newSlide(seats));
  const [view, setView] = useState<number[][] | null>(null);
  const [hop, setHop] = useState<{ seat: number; pawn: number; n: number } | null>(null);
  const [pending, setPending] = useState<SMove[] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [flip, setFlip] = useState(0);
  const [lock, setLock] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [fx, addFx] = useFx();
  const [flying, setFlying] = useState<Set<string>>(new Set());
  const busy = useRef(false);
  const gRef = useRef(g); gRef.current = g;
  const recorded = useRef(false);
  const setBusy = (v: boolean) => { busy.current = v; setLock(v); };

  const texture = useMemo(() => {
    const used = new Set<string>(), path = new Set<string>(RING_RC.map(([a, b]) => `${a},${b}`));
    seats.forEach((st) => { [0, 1, 2, 3, 4].forEach((i) => { const [a, b] = safeRC(st, i); used.add(`${a},${b}`); }); [0, 1, 2, 3].forEach((i) => { const [a, b] = homeRC(st, i), [c, d] = penRC(st, i); used.add(`${a},${b}`); used.add(`${c},${d}`); }); });
    return makeBoardTexture(16, 12, used, path, 11, { r: 7.5, c: 7.5, rad: 2.7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.n]);
  const cpuTurn = cfg.cpu[order(g.turn)] && g.winner === null;
  const pawns = view ?? g.pawns;

  useEffect(() => { reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cfg.n]);
  useEffect(() => {
    if (g.winner === null) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('slide', order(g.winner) === 0 ? 0 : 1);
    setTimeout(sfx.win, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.winner]);

  const reset = () => {
    setBusy(false);
    setG(newSlide(seatsFor(cfg.n))); setView(null); setHop(null); setPending(null); setSel(null); setMsg(''); setConfirmNew(false);
  };

  /** Look at the card on the table: nothing to do -> skip; computer -> choose; person -> wait for a tap. */
  const decide = async (s: SState) => {
    const moves = legalMoves(s);
    if (!moves.length) {
      setMsg(`${nameOf(s.turn)} HAS NO MOVE${s.card === 2 ? ' - DRAWS AGAIN' : ''}`);
      await sleep(1300);
      setG(skipTurn(s)); setBusy(false);
      return;
    }
    if (cfg.cpu[order(s.turn)]) {
      await sleep(900);
      await doPlay(cpuChoose(s, moves, cfg.level), s);
      return;
    }
    setPending(moves); setSel(null); setBusy(false);
    if (moves.length === 1) setMsg('ONLY ONE MOVE - TAP THE GLOWING PAWN');
  };

  const drawCard = async () => {
    if (busy.current || gRef.current.winner !== null || gRef.current.card !== null) return;
    setBusy(true); setMsg(''); sfx.flip();
    const s = draw(gRef.current);
    setG(s); setFlip((n) => n + 1);
    await sleep(900);
    await decide(s);
  };

  const doPlay = async (m: SMove, s: SState) => {
    setBusy(true); setPending(null); setSel(null);
    const t = s.turn, from = s.pawns[t][m.pawn];
    const { state, info } = play(s, m);
    const v = s.pawns.map((a) => [...a]);
    const show = (q: number, w = 1) => { v[t][m.pawn] = q; setView(v.map((a) => [...a])); setHop({ seat: t, pawn: m.pawn, n: q + w * 1000 }); };
    const at = (seat: number, pawn: number, q: number, all: number[]) => cellOf(seat, pawn, q, all);
    if (m.kind === 'move' && from !== PEN && m.to < SAFE + 6) {
      const dir = m.to >= from ? 1 : -1;
      for (let q = from + dir; dir > 0 ? q <= m.to : q >= m.to; q += dir) { show(q); sfx.move(); await sleep(130); const [fr, fc] = at(t, m.pawn, q, v[t]); addFx(fr, fc, 'dust'); }
    } else { show(m.to); sfx.move(); await sleep(350); }
    const [lr, lc] = at(t, m.pawn, m.to, v[t]);
    if (m.kind === 'enter') addFx(lr, lc, 'dust');
    if (m.target) {
      if (m.kind === 'sorry') addFx(lr, lc, 'sorry', 'SORRY!');
      else { const [or, oc] = at(m.target.seat, m.target.pawn, s.pawns[m.target.seat][m.target.pawn], s.pawns[m.target.seat]); addFx(or, oc, 'swap', 'SWAP!'); addFx(lr, lc, 'swap'); }
      setFlying(new Set([`${m.target.seat}-${m.target.pawn}`, `${t}-${m.pawn}`])); setTimeout(() => setFlying(new Set()), 900);
      v[m.target.seat][m.target.pawn] = m.kind === 'swap' ? m.oppTo! : PEN; setView(v.map((a) => [...a])); await sleep(450);
    }
    if (info.slide) {
      sfx.score(); setMsg('WHEEE! SLIDE!');
      const sl = SLIDES.find((x) => ringOf(t, m.to) === x.start && x.owner !== t)!;
      for (let i = (sl.start + 1) % 60; ; i = (i + 1) % 60) { show(progOf(t, i), 2); addFx(RING_RC[i][0], RING_RC[i][1], 'slide'); await sleep(90); if (i === sl.end) break; }
      addFx(RING_RC[sl.end][0], RING_RC[sl.end][1], 'bump', 'WHEEE!');
    }
    if (info.bumped.length) {
      sfx.capture();
      setFlying((f) => new Set([...f, ...info.bumped.map((b) => `${b.seat}-${b.pawn}`)])); setTimeout(() => setFlying(new Set()), 900);
      if (!info.slide) addFx(lr, lc, 'bump', 'BUMP!');
      setMsg(`${nameOf(t)} BUMPED ${info.bumped.length > 1 ? info.bumped.length + ' PAWNS' : nameOf(info.bumped[0].seat) + "'S PAWN"} BACK TO START!`);
      await sleep(500);
    } else if (m.to === HOME) { addFx(lr, lc, 'home', 'HOME!'); sfx.score(); setMsg(`${nameOf(t)} GOT A PAWN HOME!`); }
    else if (m.kind === 'swap') { sfx.flip(); setMsg('SWAPPED PLACES!'); }
    else if (!info.slide) setMsg('');
    setView(null); setHop(null); setG(state);
    if (state.winner !== null) { setBusy(false); return; }
    if (state.card !== null) { await decide(state); return; }   // second half of a 7
    setBusy(false);
  };

  // the computer draws by itself
  useEffect(() => {
    if (!cpuTurn || busy.current || g.card !== null) return;
    const id = setTimeout(() => { if (!busy.current) drawCard(); }, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, cpuTurn]);

  /* ---------- tapping ---------- */
  const mineMoves = (pawn: number) => (pending ?? []).filter((m) => m.pawn === pawn);
  const clickPawn = (seat: number, pawn: number) => {
    if (!pending || busy.current) return;
    if (seat === g.turn) {
      if (g.card === 0) return;                        // Sorry!: tap the opponent instead
      const ms = mineMoves(pawn);
      if (!ms.length) return;
      if (ms.length === 1) { doPlay(ms[0], g); return; }
      sfx.click(); setSel(sel === pawn ? null : pawn); return;
    }
    const ms = pending.filter((m) => m.target && m.target.seat === seat && m.target.pawn === pawn && (sel === null || m.pawn === sel));
    if (ms.length === 1) doPlay(ms[0], g);
    else if (ms.length > 1) setMsg('TAP YOUR OWN PAWN FIRST, THEN THEIRS');
  };
  const clickSquare = (key: string) => {
    if (!pending || sel === null) return;
    const m = mineMoves(sel).find((x) => !x.target && destKey(g.turn, x.to) === key);
    if (m) doPlay(m, g);
  };
  const destKey = (seat: number, q: number) => (q === HOME ? `h${seat}` : q >= SAFE ? `s${seat}-${q}` : `r${ringOf(seat, q)}`);
  const targets = new Set((pending ?? []).filter((m) => !m.target && m.pawn === sel).map((m) => destKey(g.turn, m.to)));
  const targetPawns = new Set((pending ?? []).filter((m) => m.target && (sel === null || m.pawn === sel)).map((m) => `${m.target!.seat}-${m.target!.pawn}`));
  const canPawn = (seat: number, pawn: number) => !!pending && !lock && (seat === g.turn ? g.card !== 0 && mineMoves(pawn).length > 0 : targetPawns.has(`${seat}-${pawn}`));

  const canDraw = !cpuTurn && g.winner === null && g.card === null && !lock;
  const top = g.discard.length ? g.discard[g.discard.length - 1] : null;
  const status = g.winner !== null ? `${nameOf(g.winner)} WINS!`
    : cpuTurn ? `${nameOf(g.turn)} IS PLAYING...`
    : g.card === null ? `${nameOf(g.turn)}: DRAW A CARD!`
    : g.remaining !== null ? `${nameOf(g.turn)}: MOVE ${g.remaining} WITH ANOTHER PAWN`
    : pending ? (sel !== null ? `${nameOf(g.turn)}: TAP WHERE TO GO` : `${nameOf(g.turn)}: TAP A GLOWING PAWN`) : `${nameOf(g.turn)}...`;
  const homeCount = (seat: number) => g.pawns[seat].filter((q) => q === HOME).length;

  const blk = (cells: [number, number][], cls: string, seat: number) => {
    const rs = cells.map((c) => c[0]), cs = cells.map((c) => c[1]);
    const r0 = Math.min(...rs), c0 = Math.min(...cs);
    return <i key={`${cls}${seat}`} className={`sblock ${cls}`} style={{ left: pct(c0), top: pct(r0), width: pct(Math.max(...cs) - c0 + 1), height: pct(Math.max(...rs) - r0 + 1), ['--pc' as string]: color(seat) } as CSSProperties} />;
  };
  const slideCells = SLIDES.flatMap((sl, si) => {
    const out: { idx: number; start: boolean; end: boolean; owner: number }[] = [];
    for (let i = sl.start; ; i = (i + 1) % 60) { out.push({ idx: i, start: i === sl.start, end: i === sl.end, owner: sl.owner }); if (i === sl.end) break; }
    return out.map((c) => ({ ...c, si }));
  });

  return (
    <div className="game slide">
      <div className="head">
        <SeatPicker cfg={cfg} set={setCfg} />
        <div className={`status turnbar ${g.winner !== null ? 'done' : ''}`} style={g.winner === null ? { background: `linear-gradient(${PLAYER_COLORS[order(g.turn)].light}, ${color(g.turn)})`, color: '#fff' } : undefined}>{status}</div>
        <div className="captures">{msg || 'DRAW A CARD, THEN MOVE A PAWN. LAND ON A TRIANGLE TO SLIDE!'}</div>
      </div>
      <div className="main slmain">
        <div className="slboard" style={{ backgroundImage: `url(${texture})` }}>
          <span className="sduck" aria-hidden><DuckArt px={3} /></span>
          <FxLayer fx={fx} n={16} />
          {seats.map((s) => blk([0, 1, 2, 3].map((i) => homeRC(s, i)), 'home', s))}
          {seats.map((s) => blk([0, 1, 2, 3].map((i) => penRC(s, i)), 'pen', s))}
          {seats.map((s) => [0, 1, 2, 3, 4].map((i) => {
            const rc = safeRC(s, i);
            return <i key={`sf${s}${i}`} className={`slc safe ${targets.has(`s${s}-${SAFE + i}`) ? 'tgt' : ''}`} style={{ left: pct(rc[1]), top: pct(rc[0]), ['--pc' as string]: color(s) } as CSSProperties} onClick={() => clickSquare(`s${s}-${SAFE + i}`)} />;
          }))}
          {RING_RC.map((rc, i) => <i key={`r${i}`} className={`slc track ${targets.has(`r${i}`) ? 'tgt' : ''}`} style={{ left: pct(rc[1]), top: pct(rc[0]) }} onClick={() => clickSquare(`r${i}`)} />)}
          {slideCells.map((c) => {
            const rc = RING_RC[c.idx], os = seats.includes(c.owner) ? color(c.owner) : '#9a8a70';
            return <i key={`sl${c.si}-${c.idx}`} className={`slc slide ${c.start ? 'sstart' : ''} ${c.end ? 'send' : ''}`} style={{ left: pct(rc[1]), top: pct(rc[0]), ['--pc' as string]: os, ['--ang' as string]: `${angle(c.idx)}deg` } as CSSProperties} />;
          })}
          {seats.map((s) => <i key={`hm${s}`} className={`slc homemark ${targets.has(`h${s}`) ? 'tgt' : ''}`} style={{ left: pct(homeRC(s, 0)[1]), top: pct(homeRC(s, 0)[0]), width: pct(2), height: pct(2), ['--pc' as string]: color(s) } as CSSProperties} onClick={() => clickSquare(`h${s}`)}>HOME</i>)}
          {seats.flatMap((s) => g.pawns[s].map((_, k) => {
            const q = pawns[s][k], rc = cellOf(s, k, q, pawns[s]), can = canPawn(s, k), hopping = hop && hop.seat === s && hop.pawn === k;
            return (
              <button key={`${s}-${k}`} className={`spawn ${can ? 'can' : ''} ${sel === k && s === g.turn ? 'sel' : ''} ${flying.has(`${s}-${k}`) ? 'flying' : ''} ${hopping ? 'hopping' : ''} ${s !== g.turn && can ? 'victim' : ''}`} disabled={!can}
                style={{ left: pct(rc[1]), top: pct(rc[0]), transitionDuration: hopping ? '.13s' : '.65s', ['--d' as string]: `${-((s * 4 + k) * 0.37)}s` }} onClick={() => clickPawn(s, k)} aria-label={`${nameOf(s)} pawn ${k + 1}`}>
                <span key={hopping ? hop!.n : 0} className="pegbob"><MushroomPiece color={order(s)} /></span>
              </button>
            );
          }))}
        </div>
        <div className="slpanel">
          <div className="slcards">
            <button className="slpile deck" disabled={!canDraw} onClick={() => { sfx.click(); drawCard(); }} aria-label="Draw a card">
              <span className="scard backface"><CardBack /></span>
              <em>{canDraw ? 'DRAW!' : `DECK ${g.deck.length}`}</em>
            </button>
            <div className="slpile">
              {g.card !== null ? <Face key={flip} v={g.card} flip /> : top !== null ? <Face v={top} /> : <span className="scard empty" />}
              <em>{g.card !== null ? 'YOUR CARD' : 'LAST CARD'}</em>
            </div>
          </div>
          <div className="apscore">
            {seats.map((s) => (
              <div key={s} className={`apchip ${s === g.turn && g.winner === null ? 'now' : ''}`} style={{ ['--pc' as string]: color(s) }}>
                <i />{nameOf(s)}<b>{homeCount(s)}/4 HOME</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="foot">
        <p className="hint">Land exactly on HOME. Bump opponents back to START. Triangles of other colours slide you forward - and bump everyone on the way!</p>
        <button className="btn ghost newgame" onClick={() => setConfirmNew(true)}>↺ NEW GAME</button>
      </div>
      {confirmNew && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>START A NEW GAME?</h2><p>This ends the game you're playing.</p>
          <div className="row"><button className="btn primary" onClick={() => setConfirmNew(false)}>KEEP PLAYING</button><button className="btn" onClick={reset}>YES, START OVER</button></div>
        </div></div></Overlay>
      )}
      {g.winner !== null && <Celebrate title={`${nameOf(g.winner)} WINS!`} sub="All four pawns made it home!" onAgain={reset} />}
    </div>
  );
}
