import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '../lib/sfx';
import { PLAYER_COLORS, playerName, seatsFor } from '../lib/seats';
import { HOME, PEN, RING_RC, HOME_RC, cellOf, newAcorn, legalMoves, applyMove, noMove, cpuMove, ringIdx, onRing, type AState, type AMove } from '../lib/acorn';
import { Celebrate, Overlay, SeatPicker, useSeatCfg } from '../ui';
import { AcornPiece, FxLayer, useFx } from '../racers';
import { makeBoardTexture } from '../boardart';
import { recordResult } from '../lib/stats';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const pct = (n: number) => `${(n * 100) / 9}%`;

export default function AcornPop() {
  const [cfg, setCfg] = useSeatCfg('acorn');
  const seats = seatsFor(cfg.n);
  const order = (seat: number) => seats.indexOf(seat);
  const nameOf = (seat: number) => playerName(cfg, order(seat));
  const [g, setG] = useState<AState>(() => newAcorn(seats));
  const [die, setDie] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [view, setView] = useState<number[][] | null>(null);   // positions while an acorn is hopping
  const [hop, setHop] = useState<{ seat: number; peg: number; n: number } | null>(null);
  const [pending, setPending] = useState<AMove[] | null>(null);  // moves a human can pick from
  const [msg, setMsg] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);
  const [fx, addFx] = useFx();
  const [flying, setFlying] = useState<Set<string>>(new Set());
  const [pops, setPops] = useState(0);
  const busy = useRef(false);
  const [lock, setLock] = useState(false);              // mirrors busy so the buttons re-render
  const setBusy = (v: boolean) => { busy.current = v; setLock(v); };
  const gRef = useRef(g); gRef.current = g;
  const recorded = useRef(false);

  const texture = useMemo(() => {
    const used = new Set<string>(), path = new Set<string>(RING_RC.map(([a, b]) => `${a},${b}`));
    seats.forEach((st) => { HOME_RC[st].forEach(([a, b]) => used.add(`${a},${b}`)); [0, 1, 2, 3].forEach((k) => { const [a, b] = cellOf(st, k, PEN); used.add(`${a},${b}`); }); });
    return makeBoardTexture(9, 14, used, path, 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.n]);
  const cpuTurn = cfg.cpu[order(g.turn)] && g.winner === null;
  const pegs = view ?? g.pegs;

  useEffect(() => { reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cfg.n]);
  useEffect(() => {
    if (g.winner === null) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('acorn', order(g.winner) === 0 ? 0 : 1);
    setTimeout(sfx.win, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.winner]);

  const reset = () => {
    setBusy(false);
    setG(newAcorn(seatsFor(cfg.n))); setDie(null); setView(null); setHop(null); setPending(null); setMsg(''); setConfirmNew(false); setRolling(false);
  };

  const doMove = async (m: AMove, d: number) => {
    setBusy(true); setPending(null);
    const cur = gRef.current, seat = cur.turn, from = cur.pegs[seat][m.peg];
    const v = cur.pegs.map((a) => [...a]);
    if (from === PEN) { v[seat][m.peg] = m.to; setView(v); setHop({ seat, peg: m.peg, n: 1 }); sfx.move(); await sleep(300); }
    else for (let q = from + 1; q <= m.to; q++) { v[seat][m.peg] = q; setView(v.map((a) => [...a])); setHop({ seat, peg: m.peg, n: q }); sfx.move(); await sleep(150); const [fr, fc] = cellOf(seat, m.peg, q); addFx(fr, fc, 'dust'); }
    const { state, bumped } = applyMove(cur, m, d);
    const [lr, lc] = cellOf(seat, m.peg, m.to);
    if (from === PEN) addFx(lr, lc, 'dust');
    if (bumped.length) { addFx(lr, lc, 'bump', 'BUMP!'); setFlying(new Set(bumped.map((b) => `${b.seat}-${b.peg}`))); setTimeout(() => setFlying(new Set()), 900); sfx.capture(); setMsg(`${nameOf(seat)} BUMPED ${bumped.length > 1 ? bumped.length + ' ACORNS' : nameOf(bumped[0].seat) + "'S ACORN"} BACK TO THE PEN!`); await sleep(400); }
    else if (m.to >= HOME) { addFx(lr, lc, 'home', 'HOME!'); sfx.score(); setMsg(`${nameOf(seat)} GOT ONE HOME!`); }
    else if (d === 6) setMsg(`${nameOf(seat)} ROLLS AGAIN!`); else setMsg('');
    setView(null); setHop(null); setG(state); setDie(null);
    setBusy(false);
  };

  const pop = async () => {
    if (busy.current || gRef.current.winner !== null) return;
    setBusy(true); setMsg(''); setRolling(true); setPops((n) => n + 1); sfx.roll();
    const d = 1 + Math.floor(Math.random() * 6);
    for (let k = 0; k < 7; k++) { setDie(1 + Math.floor(Math.random() * 6)); await sleep(95); }
    setRolling(false); setDie(d);
    const cur = { ...gRef.current, roll: d };
    setG(cur);
    const moves = legalMoves(cur, d);
    await sleep(450);
    if (!moves.length) {
      setMsg(d === 6 || cur.tries <= 1 ? `${nameOf(cur.turn)} CAN'T MOVE` : `${nameOf(cur.turn)} CAN'T MOVE - ROLL AGAIN`);
      await sleep(900);
      setG(noMove(cur)); setDie(null); setBusy(false);
      return;
    }
    if (moves.length === 1 || cfg.cpu[order(cur.turn)]) {
      const m = cfg.cpu[order(cur.turn)] ? cpuMove(cur, d, moves, cfg.level) : moves[0];
      if (!cfg.cpu[order(cur.turn)]) setMsg('ONLY ONE MOVE!');
      await sleep(350);
      setBusy(false);
      await doMove(m, d);
      return;
    }
    setPending(moves); setBusy(false);
  };

  // the computer rolls by itself
  useEffect(() => {
    if (!cpuTurn || busy.current || pending) return;
    const id = setTimeout(() => { if (!busy.current) pop(); }, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, cpuTurn, pending]);

  const canPop = !cpuTurn && g.winner === null && !pending && !lock && !rolling;
  const movable = new Map(pending?.map((m) => [m.peg, m]) ?? []);
  const targets = new Set((pending ?? []).map((m) => (onRing(m.to) ? `r${ringIdx(g.turn, m.to)}` : `h${g.turn}-${m.to - HOME}`)));
  const color = (seat: number) => PLAYER_COLORS[order(seat)].main;
  const status = g.winner !== null ? `${nameOf(g.winner)} WINS!`
    : cpuTurn ? `${nameOf(g.turn)} IS PLAYING...`
    : pending ? `${nameOf(g.turn)}: TAP AN ACORN TO MOVE ${g.roll}`
    : `${nameOf(g.turn)}: POP THE DICE!`;
  const homeCount = (seat: number) => g.pegs[seat].filter((p) => p >= HOME).length;

  const cell = (rc: [number, number], cls: string, key: string, style?: CSSProperties) => (
    <i key={key} className={`apc ${cls}`} style={{ left: pct(rc[1]), top: pct(rc[0]), ...style }} />
  );

  return (
    <div className="game acorn">
      <div className="head">
        <SeatPicker cfg={cfg} set={setCfg} />
        <div className={`status turnbar ${g.winner !== null ? 'done' : ''}`} style={g.winner === null ? { background: `linear-gradient(${PLAYER_COLORS[order(g.turn)].light}, ${color(g.turn)})`, color: '#fff' } : undefined}>{status}</div>
        <div className="captures">{msg || (g.tries > 1 && !g.pegs[g.turn].some(onRingOnly) && g.winner === null ? 'NO ACORNS OUT YET - YOU GET 3 TRIES AT A 6' : 'ROLL A 6 TO LEAVE THE PEN')}</div>
      </div>
      <div className="main apmain">
        <div className="apboard" style={{ backgroundImage: `url(${texture})` }}>
          <FxLayer fx={fx} n={9} />
          {RING_RC.map((rc, i) => cell(rc, `track ${targets.has(`r${i}`) ? 'tgt' : ''} ${seats.some((s) => ringIdx(s, 0) === i) ? 'startsq' : ''} ${seats.find((s) => ringIdx(s, 0) === i) === g.turn && g.winner === null ? 'mine' : ''}`, `r${i}`,
            seats.some((s) => ringIdx(s, 0) === i) ? { ['--pc' as string]: color(seats.find((s) => ringIdx(s, 0) === i)!) } : undefined))}
          {seats.map((s) => <i key={`lane${s}`} className="apblock lane" style={{ ...box([...HOME_RC[s]]), ['--pc' as string]: color(s) } as CSSProperties} />)}
          {seats.map((s) => <i key={`log${s}`} className="apblock log" style={{ ...box([0, 1, 2, 3].map((k) => cellOf(s, k, PEN))), ['--pc' as string]: color(s) } as CSSProperties} />)}
          {seats.map((s) => HOME_RC[s].map((rc, k) => cell(rc, `home ${targets.has(`h${s}-${k}`) ? 'tgt' : ''}`, `h${s}${k}`, { ['--pc' as string]: color(s) })))}
          {seats.map((s) => [0, 1, 2, 3].map((k) => cell(cellOf(s, k, PEN), 'penhole', `p${s}${k}`, { ['--pc' as string]: color(s) })))}
          {seats.flatMap((s) => g.pegs[s].map((_, k) => {
            const p = pegs[s][k], rc = cellOf(s, k, p), mv = s === g.turn ? movable.get(k) : undefined;
            const hopping = hop && hop.seat === s && hop.peg === k;
            return (
              <button key={`${s}-${k}`} className={`peg ${mv ? 'can' : ''} ${hopping ? 'hopping' : ''} ${flying.has(`${s}-${k}`) ? 'flying' : ''} ${p >= HOME ? 'done' : ''}`} disabled={!mv}
                style={{ left: pct(rc[1]), top: pct(rc[0]), transitionDuration: hopping ? '.14s' : '.65s', ['--d' as string]: `${-((s * 4 + k) * 0.37)}s` }} onClick={() => mv && doMove(mv, g.roll!)} aria-label={`${nameOf(s)} acorn ${k + 1}`}>
                <span key={hopping ? hop!.n : 0} className="pegbob"><AcornPiece color={order(s)} /></span>
              </button>
            );
          }))}
        </div>
        <div className="appanel">
          <button className={`popper ${rolling ? 'popping' : ''}`} disabled={!canPop} onClick={() => { sfx.click(); pop(); }} aria-label="Pop the dice">
            <span className="dome">
              {rolling && <span className="sparks" key={pops} aria-hidden>{Array.from({ length: 10 }, (_, k) => <s key={k} style={{ ['--a' as string]: `${k * 36}deg` }} />)}</span>}
              <span key={rolling ? 'r' : die} className={`die small ${rolling ? 'rolling' : die ? 'landed' : ''}`}>
                {die ? <span className="face">{Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[die].includes(i) ? 'pip' : ''} />)}</span> : <span className="face qm">?</span>}
              </span>
            </span>
            <em>{canPop ? 'TAP TO POP!' : rolling ? 'POP!' : ' '}</em>
          </button>
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
        <p className="hint">Roll a 6 to leave the pen. Land on someone else to bump them home. Get all 4 acorns into your home row!</p>
        <button className="btn ghost newgame" onClick={() => setConfirmNew(true)}>↺ NEW GAME</button>
      </div>
      {confirmNew && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>START A NEW GAME?</h2><p>This ends the game you're playing.</p>
          <div className="row"><button className="btn primary" onClick={() => setConfirmNew(false)}>KEEP PLAYING</button><button className="btn" onClick={reset}>YES, START OVER</button></div>
        </div></div></Overlay>
      )}
      {g.winner !== null && <Celebrate title={`${nameOf(g.winner)} WINS!`} sub="All four acorns made it home!" onAgain={reset} />}
    </div>
  );
}
const box = (cells: [number, number][]) => {
  const rs = cells.map((c) => c[0]), cs = cells.map((c) => c[1]), r0 = Math.min(...rs), c0 = Math.min(...cs);
  return { left: pct(c0), top: pct(r0), width: pct(Math.max(...cs) - c0 + 1), height: pct(Math.max(...rs) - r0 + 1) };
};
const onRingOnly = (p: number) => p >= 0 && p < 32;
