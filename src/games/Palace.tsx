import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx, sfx2 } from '../lib/sfx';
import { PLAYER_COLORS, playerName } from '../lib/seats';
import {
  newGame, play, playBlind, pickUp, swap, setReady, legalRanks, need, canPlayRank, cpuAction, cpuSwap, apply, sourceOf, isWild,
  RANK_LABEL, SPECIAL, type PState, type PCard, type Action, type Ev,
} from '../lib/palace';
import { CardBack, Leaf } from '../art';
import { Celebrate, Overlay, SeatPicker, useSeatCfg } from '../ui';
import { recordResult } from '../lib/stats';

const TONE_HEX: Record<string, string> = { low: '#1f5fc0', mid: '#c06a00', high: '#c01f1f' };
const toneOf = (r: number) => (r <= 6 ? 'low' : r <= 10 ? 'mid' : 'high');

/* ---------- one card (face up, or back) ---------- */
function PCardView({ c, up = true, dim, legal, sel, onClick, small, hide, fresh, dense }: {
  c?: PCard; up?: boolean; dim?: boolean; legal?: boolean; sel?: boolean; onClick?: () => void; small?: boolean; hide?: boolean; fresh?: boolean; dense?: boolean;
}) {
  const t = c ? toneOf(c.r) : '';
  const label = c ? RANK_LABEL(c.r) : '';
  const badge = c ? SPECIAL[c.r] : undefined;
  return (
    <button
      className={`pcard pal ${up ? 'up' : ''} ${t} ${dim ? 'dim' : ''} ${legal ? 'legal' : ''} ${sel ? 'psel' : ''} ${small ? 'psmall' : ''} ${fresh ? 'fresh' : ''} ${dense ? 'dense' : ''}`}
      style={hide ? { visibility: 'hidden' } : undefined}
      data-cid={c?.id}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="flip">
        <span className="face back"><CardBack /></span>
        <span className="face front">
          {c && (
            <>
              <span className="cn tl">{label}</span>
              <span className="cn br">{label}</span>
              <span className="cmid"><Leaf color={TONE_HEX[t]} px={small ? 2 : 3} /><b>{label}</b></span>
              {badge && <span className="sbadge">{badge}</span>}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

/* ---------- a card flying between two places ---------- */
type Box = { x: number; y: number; w: number; h: number };
type Flight = { id: number; from: Box; to: Box; c?: PCard; upFrom: boolean; upTo: boolean; dur: number; delay: number; burn?: boolean; ids: number[]; land?: Ev[] };
const boxOf = (sel: string): Box | null => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
};

function Ghost({ f, done }: { f: Flight; done: (f: Flight) => void }) {
  const [up, setUp] = useState(f.upFrom);
  const ref = (el: HTMLDivElement | null) => {
    if (!el || el.dataset.go) return;
    el.dataset.go = '1';
    const dx = f.to.x + (f.to.w - f.from.w) / 2 - f.from.x, dy = f.to.y + (f.to.h - f.from.h) / 2 - f.from.y;
    const lift = Math.max(26, Math.hypot(dx, dy) * 0.16);
    const k = f.to.w / f.from.w;
    const an = el.animate([
      { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)' },
      { transform: `translate3d(${dx / 2}px,${dy / 2 - lift}px,0) scale(${(1 + k) / 2 * 1.16}) rotate(${dx > 0 ? 5 : -5}deg)`, offset: 0.5 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(${k}) rotate(0deg)` },
    ], { duration: f.dur, delay: f.delay, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'both' });
    if (f.upTo !== f.upFrom) setTimeout(() => setUp(f.upTo), f.delay + f.dur * 0.2);
    an.onfinish = () => {
      if (!f.burn) { done(f); return; }
      // burning card: flare up and fade out where it landed
      const b = el.animate([{ opacity: 1, filter: 'brightness(1)' }, { opacity: 1, filter: 'brightness(2.2) sepia(1) saturate(4)', offset: 0.4 }, { opacity: 0, filter: 'brightness(3) sepia(1) saturate(5)' }], { duration: 520, easing: 'ease-out', fill: 'forwards' });
      b.onfinish = () => done(f);
    };
    an.oncancel = () => done(f);
  };
  return (
    <div ref={ref} className="ghostcard" style={{ left: f.from.x, top: f.from.y, width: f.from.w, height: f.from.h }}>
      <PCardView c={f.c} up={up} small={f.from.w < 56} />
    </div>
  );
}

type Fx = { id: number; kind: 'burn' | 'reverse' | 'window' | 'quad'; box: Box };
const sleepless = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Palace() {
  const [cfg, setCfg] = useSeatCfg('palace');
  const n = cfg.n;
  const isCpu = (p: number) => cfg.cpu[p];
  const humans = useMemo(() => Array.from({ length: n }, (_, i) => i).filter((i) => !cfg.cpu[i]), [n, cfg.cpu]);
  const multiHuman = humans.length > 1;
  const name = (p: number) => playerName(cfg, p);

  const [s, setS] = useState<PState>(() => newGame(n));
  const [sel, setSel] = useState<number[]>([]);
  const [upSel, setUpSel] = useState<number | null>(null);        // swap phase: chosen face-up card
  const [swapSeat, setSwapSeat] = useState(0);
  const [shownFor, setShownFor] = useState<number | null>(null);   // whose hand is revealed on this device right now
  const [flights, setFlights] = useState<Flight[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [toast, setToast] = useState<{ k: number; text: string } | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const [spin, setSpin] = useState(0);
  const ids = useRef(0);
  const recorded = useRef(false);
  const sRef = useRef(s); sRef.current = s;

  const busy = flights.length > 0;
  const hiddenIds = useMemo(() => new Set(flights.flatMap((f) => f.ids)), [flights]);

  const reset = () => {
    setS(newGame(cfg.n)); setSel([]); setUpSel(null); setSwapSeat(0); setShownFor(null); setFlights([]); setFx([]); setToast(null); setConfirmNew(false); setFreshIds(new Set());
    recorded.current = false;
  };
  // new seat set-up = new game
  useEffect(() => { reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cfg.n, cfg.cpu.slice(0, cfg.n).join()]);

  /* who is shown at the bottom, and is their hand visible? */
  const me = s.phase === 'swap' ? swapSeat : humans.length === 1 ? humans[0] : !isCpu(s.turn) ? s.turn : (shownFor ?? humans[0] ?? 0);
  const handVisible = s.phase === 'swap' ? (multiHuman ? shownFor === swapSeat : true) : multiHuman ? shownFor === me && me === s.turn && s.phase === 'play' : true;
  const needHandoff = multiHuman && ((s.phase === 'swap' && !isCpu(swapSeat) && shownFor !== swapSeat && !s.ready[swapSeat]) || (s.phase === 'play' && !isCpu(s.turn) && shownFor !== s.turn));

  const cpuTurn = s.phase === 'play' && isCpu(s.turn);
  const myTurn = s.phase === 'play' && !isCpu(s.turn) && s.turn === me && !busy;
  const mine = s.players[me];
  const src = sourceOf(mine);
  const legal = useMemo(() => (myTurn ? new Set(legalRanks(s)) : new Set<number>()), [s, myTurn]);

  /* ---- flights, effects and toasts ---- */
  const say = (text: string) => setToast({ k: ++ids.current, text });
  const addFx = (kind: Fx['kind'], box: Box) => {
    const id = ++ids.current;
    setFx((f) => [...f, { id, kind, box }]);
    setTimeout(() => setFx((f) => f.filter((x) => x.id !== id)), kind === 'reverse' ? 1100 : 950);
  };
  const landed = (f: Flight) => {
    setFlights((fl) => fl.filter((x) => x.id !== f.id));
    if (f.land) for (const e of f.land) {
      const b = boxOf('[data-slot="pile"]') ?? f.to;
      if (e === 'burn') addFx('burn', b);
      if (e === 'reverse') addFx('reverse', b);
      if (e === 'window') addFx('window', b);
      if (e === 'quad') addFx('quad', b);
    }
  };

  /** capture where the cards are NOW, apply the action, then fly ghost cards along the way */
  const doAction = (a: Action) => {
    const before = sRef.current;
    const p = before.turn;
    const next = apply(before, a);
    if (next === before) return;
    const reduce = sleepless();
    const out: Flight[] = [];
    const pileBox = boxOf('[data-slot="pile"]');
    const seatBox = (q: number) => boxOf(`[data-hand="${q}"]`) ?? boxOf(`[data-seat="${q}"]`);
    const events = next.events;
    if (!reduce && pileBox) {
      if (a.t === 'pickup' || events.includes('pickup')) {
        const pile = before.pile.slice(-5);
        const to = q0(p) ?? pileBox;
        pile.forEach((c, i) => out.push({ id: ++ids.current, from: pileBox, to, c, upFrom: true, upTo: false, dur: 460, delay: i * 70, ids: [c.id], land: [] }));
      }
      if (a.t === 'play' || (a.t === 'blind' && !events.includes('blindfail'))) {
        const movedIds = next.moved;
        movedIds.forEach((id, i) => {
          const c = next.pile.find((x) => x.id === id) ?? before.players[p].hand.concat(before.players[p].up, before.players[p].down).find((x) => x.id === id);
          const from = boxOf(`[data-cid="${id}"]`) ?? seatBox(p);
          if (!from || !c) return;
          const last = i === movedIds.length - 1;
          const land: Ev[] = last ? (events.filter((e) => e === 'burn' || e === 'reverse' || e === 'window' || e === 'quad') as Ev[]) : [];
          out.push({ id: ++ids.current, from, to: pileBox, c, upFrom: !isCpu(p) && boxOf(`[data-cid="${id}"]`) !== null && handVisible, upTo: true, dur: 460, delay: i * 90, burn: last && events.includes('burn'), ids: [id], land });
        });
      }
      if (a.t === 'blind' && events.includes('blindfail')) {
        const id = next.moved[next.moved.length - 1];
        const from = boxOf(`[data-cid="${id}"]`);
        const c = before.players[p].down[(a as { idx: number }).idx];
        if (from && c) out.push({ id: ++ids.current, from, to: pileBox, c, upFrom: false, upTo: true, dur: 380, delay: 0, ids: [id], land: [] });
      }
    }
    // sounds + toasts
    if (events.includes('burn')) sfx.capture(); else if (events.includes('pickup')) sfx2.hit(); else if (a.t === 'blind') sfx.flip(); else sfx.move();
    const msgs: string[] = [];
    if (events.includes('out')) msgs.push(`${name(p)} IS OUT!`);
    if (events.includes('burn')) msgs.push('BURN!');
    if (events.includes('quad')) msgs.push('FOUR OF A KIND!');
    if (events.includes('reverse')) { msgs.push('REVERSE!'); setSpin((v) => v + 1); }
    if (events.includes('window')) msgs.push('WINDOW');
    if (events.includes('wild')) msgs.push('WILD');
    if (events.includes('blindfail')) msgs.push(`CAN'T PLAY - ${name(p)} PICKS UP`);
    else if (events.includes('pickup')) msgs.push(`${name(p)} PICKS UP THE PILE`);
    if (events.includes('again') && next.phase === 'play') msgs.push(`${name(p)} GOES AGAIN`);
    if (msgs.length) say(msgs.join(' · '));
    // cards that just arrived in a hand pop in
    const had = new Set(before.players.flatMap((pl) => pl.hand.map((c) => c.id)));
    const nowHand = next.players.flatMap((pl) => pl.hand).filter((c) => !had.has(c.id)).map((c) => c.id);
    if (nowHand.length) { setFreshIds(new Set(nowHand)); setTimeout(() => setFreshIds(new Set()), 700); if (!events.includes('pickup')) sfx2.draw(); }
    setSel([]);
    if (out.length) setFlights((f) => [...f, ...out]);
    setS(next);
    if (next.phase === 'over') setTimeout(sfx.win, 500);
  };
  function q0(p: number): Box | null { return boxOf(`[data-hand="${p}"]`) ?? boxOf(`[data-seat="${p}"]`); }

  /* ---- computer turns ---- */
  useEffect(() => {
    if (s.phase === 'swap') {
      // computers get their swaps done straight away
      if (isCpu(swapSeat) && !s.ready[swapSeat]) { const t = setTimeout(() => { setS((x) => cpuSwap(x, swapSeat)); setSwapSeat((v) => nextUnready(s, v)); }, 350); return () => clearTimeout(t); }
      return;
    }
    if (!cpuTurn || busy) return;
    const t = setTimeout(() => doAction(cpuAction(sRef.current, cfg.level)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, busy, swapSeat]);

  /* ---- finish ---- */
  useEffect(() => {
    if (s.phase !== 'over') { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('palace', s.finished[0] === 0 ? 0 : 1);
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- tapping ---- */
  const toggleCard = (c: PCard) => {
    if (!myTurn || src === 'down') return;
    sfx.click();
    setSel((cur) => {
      if (cur.includes(c.id)) return cur.filter((x) => x !== c.id);
      const first = mine[src].find((x) => x.id === cur[0]);
      return first && first.r === c.r ? [...cur, c.id] : [c.id];
    });
  };
  const selRank = sel.length ? mine[src === 'down' ? 'hand' : src].find((c) => c.id === sel[0])?.r : undefined;
  const canPlaySel = myTurn && sel.length > 0 && selRank !== undefined && canPlayRank(s.pile, selRank);
  const doPlay = () => { if (canPlaySel) doAction({ t: 'play', ids: sel }); };
  const doPick = () => { if (myTurn && s.pile.length) doAction({ t: 'pickup' }); };
  const doBlind = (idx: number) => { if (myTurn && src === 'down') doAction({ t: 'blind', idx }); };

  // swap phase
  const onUpTap = (i: number) => { if (s.phase !== 'swap' || !handVisible) return; sfx.click(); setUpSel(upSel === i ? null : i); };
  const onSwapHand = (i: number) => {
    if (s.phase !== 'swap' || !handVisible || upSel === null) return;
    sfx.flip(); setS(swap(s, swapSeat, upSel, i)); setUpSel(null);
  };
  const nextUnready = (st: PState, from: number) => { for (let k = 1; k <= st.n; k++) { const q = (from + k) % st.n; if (!st.ready[q] && q !== from) return q; } return from; };
  const doReady = () => {
    sfx.score();
    const ns = setReady(s, swapSeat);
    setS(ns); setUpSel(null); setShownFor(null);
    if (ns.phase === 'swap') setSwapSeat(nextUnready(ns, swapSeat));
    else say(`${name(ns.turn)} GOES FIRST`);
  };

  /* ---- text ---- */
  const nd = need(s.pile);
  const topIs8 = s.pile.length > 0 && s.pile[s.pile.length - 1].r === 8;
  const rule = !s.pile.length ? 'ANYTHING GOES' : nd === 0 ? 'ANYTHING GOES' : topIs8 ? `WINDOW: ${RANK_LABEL(nd)}+ OR A WILD` : `${RANK_LABEL(nd)} OR HIGHER`;
  const prompt =
    s.phase === 'swap' ? `${name(swapSeat)}: SWAP FACE-UP CARDS WITH YOUR HAND (OR NOT), THEN READY`
    : s.phase === 'over' ? 'GAME OVER'
    : cpuTurn ? `${name(s.turn)} IS THINKING...`
    : src === 'down' ? `${name(s.turn)}: TAP A FACE-DOWN CARD TO PLAY IT BLIND`
    : sel.length ? (canPlaySel ? `PLAY ${sel.length > 1 ? `THESE ${sel.length}` : 'IT'}?` : 'THAT CARD CAN\'T GO ON THE PILE')
    : `${name(s.turn)}: PLAY ${rule}, OR PICK UP`;

  const dense = mine.hand.length > 5;
  const showCount = s.deck.length;
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== me);

  const oppRow = (q: number) => {
    const pl = s.players[q];
    const out = s.finished.includes(q);
    return (
      <div key={q} className={`oppmat ${s.turn === q && s.phase === 'play' ? 'turn' : ''} ${out ? 'out' : ''}`} data-seat={q} style={{ ['--pcol' as string]: PLAYER_COLORS[q].main }}>
        <div className="pname"><span style={{ background: PLAYER_COLORS[q].main }}>{name(q)}</span>{out ? <b>OUT #{s.finished.indexOf(q) + 1}</b> : <b data-hand={q}>{pl.hand.length} IN HAND</b>}</div>
        {!out && (
          <div className="orow">
            {[0, 1].map((k) => (
              <span className="ostack" key={k}>
                {pl.down[k] ? <PCardView c={pl.down[k]} up={false} small hide={hiddenIds.has(pl.down[k].id)} /> : null}
                {pl.up[k] ? <span className="ontop"><PCardView c={pl.up[k]} small hide={hiddenIds.has(pl.up[k].id)} /></span> : null}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const pileShow = s.pile.filter((c) => !hiddenIds.has(c.id)).slice(-3);
  const turnCol = PLAYER_COLORS[s.turn]?.main;
  return (
    <div className="game palace">
      <div className="head">
        <SeatPicker cfg={cfg} set={setCfg} />
        <button className="btn ghost newgame-top" onClick={() => setConfirmNew(true)}>↺ NEW GAME</button>
        <div className={`status turnbar tc ${s.phase === 'over' ? 'done' : ''}`} style={{ ['--tc' as string]: turnCol }}>
          {s.phase === 'swap' ? <>SET UP · {name(swapSeat)}</> : s.phase === 'over' ? <>GAME OVER</> : <>▶ {name(s.turn)}'S TURN</>}
          <small>{s.dir === 1 ? '↻' : '↺'} ORDER</small>
        </div>
        <p className="hint prompt">{prompt}</p>
      </div>

      <div className="main palboard">
        <div className="opps">{others.map(oppRow)}</div>

        <div className="pmid">
          <div className="pdeck">
            <div className="pstack"><PCardView up={false} small />{showCount === 0 && <span className="empty">EMPTY</span>}</div>
            <span className="plab">DRAW {showCount}</span>
          </div>
          <div className="ppile" data-slot="pile">
            <div className="pilebox">
              {pileShow.length === 0 && <span className="pslot" />}
              {pileShow.map((c, i) => <span key={c.id} className="pplaced" style={{ ['--i' as string]: i - (pileShow.length - 1) }}><PCardView c={c} /></span>)}
              {fx.map((f) => <span key={f.id} className={`pfx ${f.kind}`} aria-hidden>{f.kind === 'burn' ? Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, r = 34 + (i % 3) * 14; return <i key={i} style={{ ['--dx' as string]: `${Math.cos(a) * r}px`, ['--dy' as string]: `${Math.sin(a) * r - 24}px`, animationDelay: `${(i % 4) * 40}ms` }} />; }) : f.kind === 'reverse' ? <b key={spin}>↻</b> : f.kind === 'quad' ? <b>x4</b> : <b />}</span>)}
            </div>
            <span className={`plab ${nd === 0 ? 'any' : ''}`}>{s.phase === 'play' ? rule : 'PILE'}{s.pile.length ? ` · ${s.pile.length}` : ''}</span>
          </div>
        </div>
        {toast && <div className="ptoast" key={toast.k}>{toast.text}</div>}

        <div className={`mymat ${myTurn || s.phase === 'swap' ? 'turn' : ''}`} style={{ ['--pcol' as string]: PLAYER_COLORS[me].main }} data-seat={me}>
          <div className="pname"><span style={{ background: PLAYER_COLORS[me].main }}>{name(me)}</span><b>{src === 'hand' ? 'HAND' : src === 'up' ? 'FACE-UP' : 'FACE-DOWN'}</b></div>
          <div className="myrow">
            {[0, 1].map((k) => {
              const dn = mine.down[k], up = mine.up[k];
              return (
                <span className="ostack big" key={k} data-down={k}>
                  {dn ? <PCardView c={dn} up={false} onClick={myTurn && src === 'down' ? () => doBlind(k) : undefined} legal={myTurn && src === 'down'} hide={hiddenIds.has(dn.id)} /> : <span className="pslot" />}
                  {up ? (
                    <span className="ontop">
                      <PCardView
                        c={up} hide={hiddenIds.has(up.id)}
                        sel={s.phase === 'swap' ? upSel === k : sel.includes(up.id)}
                        legal={myTurn && src === 'up' && legal.has(up.r)} dim={myTurn && src === 'up' && !legal.has(up.r)}
                        onClick={s.phase === 'swap' ? () => onUpTap(k) : myTurn && src === 'up' ? () => toggleCard(up) : undefined}
                      />
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
          <div className={`phand ${dense ? 'dense' : ''}`} style={{ ['--hn' as string]: mine.hand.length }}>
            {mine.hand.map((c) => (
              <PCardView
                key={c.id} c={c} up={handVisible} dense={dense} hide={hiddenIds.has(c.id)} fresh={freshIds.has(c.id)}
                sel={sel.includes(c.id)}
                legal={myTurn && src === 'hand' && legal.has(c.r)} dim={myTurn && src === 'hand' && !legal.has(c.r)}
                onClick={!handVisible ? undefined : s.phase === 'swap' ? () => onSwapHand(mine.hand.indexOf(c)) : myTurn && src === 'hand' ? () => toggleCard(c) : undefined}
              />
            ))}
            {!mine.hand.length && s.phase !== 'swap' && <span className="hint">no cards in hand</span>}
          </div>
        </div>

        <div className="area pchoice">
          {s.phase === 'swap' && handVisible ? (
            <div className="row"><button className="btn primary" onClick={doReady}>READY ▶</button></div>
          ) : (
            <div className={`row ${myTurn && handVisible ? '' : 'idle'}`}>
              <button className="btn primary" disabled={!canPlaySel || !handVisible} onClick={doPlay}>PLAY{sel.length > 1 ? ` ${sel.length}` : ''}</button>
              <button className="btn" disabled={!myTurn || !s.pile.length || !handVisible} onClick={doPick}>PICK UP</button>
            </div>
          )}
        </div>
      </div>

      {flights.length > 0 && <Overlay><div className="ghostlayer">{flights.map((f) => <Ghost key={f.id} f={f} done={landed} />)}</div></Overlay>}
      {needHandoff && s.phase !== 'over' && (
        <Overlay><div className="handoff">
          <div className="banner">
            <h2>PASS TO {name(s.phase === 'swap' ? swapSeat : s.turn)}</h2>
            <p>{s.phase === 'swap' ? 'Hand the screen over. Only you should see your cards.' : 'Hand the screen over, then tap when ready.'}</p>
            <button className="btn primary" onClick={() => setShownFor(s.phase === 'swap' ? swapSeat : s.turn)}>I'M {name(s.phase === 'swap' ? swapSeat : s.turn)} - SHOW MY CARDS</button>
          </div>
        </div></Overlay>
      )}
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
      {s.phase === 'over' && !busy && <Celebrate title={`${name(s.finished[0])} WINS!`} sub={s.loser !== null ? `${name(s.loser)} is stuck with the cards` : undefined} onAgain={reset} />}
    </div>
  );
}

// keep the helpers referenced so a future change can't silently drop them
void [isWild, play, playBlind, pickUp];
