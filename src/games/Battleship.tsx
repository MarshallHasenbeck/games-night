import { useEffect, useMemo, useRef, useState } from 'react';
import { Boat, DuckArt, FishArt } from '../art';
import { sfx, sfx2, sfx3 } from '../lib/sfx';
import {
  N, FLEET, newFleet, randomFleet, canPlace, cells, fire, shipAt, isSunk, allSunk, cpuShot, type Fleet, type Ship,
} from '../lib/battleship';
import { Celebrate, ModeBar, Overlay, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LET = 'ABCDEFGHIJ';

type Phase = 'setup' | 'play' | 'over';

/** One 10×10 pond. `reveal` shows every boat; otherwise only sunk ones. */
function Pond({ fleet, reveal, onCell, target, small, preview, label, shake, lastShot }: {
  fleet: Fleet; reveal: boolean; onCell?: (r: number, c: number) => void; target?: [number, number] | null; small?: boolean;
  preview?: { ship: Ship; ok: boolean } | null; label: string; shake?: boolean; lastShot?: [number, number, number] | null;
}) {
  return (
    <div className={`pondwrap ${small ? 'small' : ''}`}>
      <div className="pondlabel">{label}</div>
      <div className={`pond ${shake ? 'shake' : ''}`}>
        <div className="cols">{Array.from({ length: N }, (_, c) => <i key={c}>{c + 1}</i>)}</div>
        <div className="rowsl">{Array.from({ length: N }, (_, r) => <i key={r}>{LET[r]}</i>)}</div>
        <div className="critters" aria-hidden>
          <span className="duck d1"><DuckArt px={3} /></span>
          {!small && <span className="duck d2"><DuckArt px={3} /></span>}
        </div>
        <div className="ships">
          {fleet.ships.map((s) => {
            const sunk = isSunk(fleet, s);
            if (!reveal && !sunk) return null;
            return (
              <span key={s.id} className={`ship ${s.vert ? 'v' : 'h'} ${sunk ? 'sunk' : ''}`} style={{ ['--r' as string]: s.r, ['--c' as string]: s.c, ['--len' as string]: s.len }}>
                <Boat len={s.len} id={s.id} sunk={sunk} vert={s.vert} />
              </span>
            );
          })}
          {preview && (
            <span className={`ship ghost ${preview.ship.vert ? 'v' : 'h'} ${preview.ok ? 'ok' : 'bad'}`} style={{ ['--r' as string]: preview.ship.r, ['--c' as string]: preview.ship.c, ['--len' as string]: preview.ship.len }}>
              <Boat len={preview.ship.len} id={preview.ship.id} vert={preview.ship.vert} />
            </span>
          )}
        </div>
        <div className="grid">
          {Array.from({ length: N * N }, (_, i) => {
            const r = Math.floor(i / N), c = i % N, sh = fleet.shots[r][c];
            const isT = target && target[0] === r && target[1] === c;
            return (
              <button key={i} className={`bbc ${sh ?? ''} ${isT ? 'target' : ''}`} onClick={onCell ? () => onCell(r, c) : undefined} disabled={!onCell} aria-label={`${LET[r]}${c + 1}`}>
                {sh === 'h' && <span className="boom"><i /><i /></span>}
                {sh === 'm' && <span className="ripple" />}
                {sh === 'm' && lastShot && lastShot[0] === r && lastShot[1] === c && <span key={lastShot[2]} className="fish"><FishArt px={3} /></span>}
                {isT && <span className="cross" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Battleship() {
  const opp = useOpponent('battleship');
  const [phase, setPhase] = useState<Phase>('setup');
  const [fleets, setFleets] = useState<[Fleet, Fleet]>([newFleet(), newFleet()]);
  const [placing, setPlacing] = useState<0 | 1>(0);          // whose fleet is being set up
  const [draft, setDraft] = useState<Ship[]>([]);
  const [sel, setSel] = useState<number | null>(0);
  const [vert, setVert] = useState(false);
  const [bad, setBad] = useState(0);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [target, setTarget] = useState<[number, number] | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [curtain, setCurtain] = useState<null | { to: 0 | 1; text: string; btn: string }>(null);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [lastHit, setLastHit] = useState(0);
  const [lastShot, setLastShot] = useState<[number, number, number] | null>(null);
  const shotN = useRef(0);
  const recorded = useRef(false);
  const names = ['P1', opp.cpu ? 'CPU' : 'P2'];

  const viewer: 0 | 1 = opp.cpu ? 0 : turn;      // whose screen it is right now
  const enemy: 0 | 1 = viewer === 0 ? 1 : 0;

  useEffect(() => { // opening curtain for P1 in two-player mode
    if (phase === 'setup' && placing === 0 && !opp.cpu && !curtain && draft.length === 0 && fleets[0].ships.length === 0 && !busy) {
      setCurtain({ to: 0, text: 'P2, LOOK AWAY!', btn: "I'M P1 - PLACE MY BOATS" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (winner === null) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('battleship', winner);
    setTimeout(sfx.win, 300);
  }, [winner]);

  /* ---------- setup ---------- */
  const nextToPlace = () => FLEET.find((f) => !draft.some((d) => d.id === f.id))?.id ?? null;
  const placeAt = (r: number, c: number) => {
    const picked = shipAt({ ships: draft, shots: fleets[0].shots }, r, c);
    if (picked && sel === null) { setDraft(draft.filter((d) => d.id !== picked.id)); setSel(picked.id); setVert(picked.vert); sfx.click(); return; }
    if (sel === null) { if (picked) { setDraft(draft.filter((d) => d.id !== picked.id)); setSel(picked.id); setVert(picked.vert); } return; }
    const def = FLEET.find((f) => f.id === sel)!;
    let ship: Ship = { id: def.id, len: def.len, r, c, vert };
    // nudge so it stays on the board
    if (ship.vert) ship = { ...ship, r: Math.min(ship.r, N - ship.len) }; else ship = { ...ship, c: Math.min(ship.c, N - ship.len) };
    const others = draft.filter((d) => d.id !== sel);
    if (!canPlace(ship, others)) { setBad((b) => b + 1); sfx.capture(); return; }
    sfx.move();
    const nd = [...others, ship];
    setDraft(nd);
    setSel(FLEET.find((f) => !nd.some((d) => d.id === f.id))?.id ?? null);
  };
  const shuffle = () => { sfx.roll(); setDraft(randomFleet()); setSel(null); };
  const clear = () => { sfx.click(); setDraft([]); setSel(0); };
  const rotate = () => { sfx.click(); setVert((v) => !v); };

  const finishSetup = () => {
    sfx.score();
    if (opp.cpu) {
      setFleets([newFleet(draft), newFleet(randomFleet())]);
      setPhase('play'); setTurn(0); setMsg('The CPU hid its boats. Fire away!');
      return;
    }
    if (placing === 0) {
      setFleets((f) => [newFleet(draft), f[1]]);
      setDraft([]); setSel(0); setVert(false); setPlacing(1);
      setCurtain({ to: 1, text: 'PASS TO P2', btn: "I'M P2 - PLACE MY BOATS" });
    } else {
      setFleets((f) => [f[0], newFleet(draft)]);
      setDraft([]); setPhase('play'); setTurn(0); setMsg('');
      setCurtain({ to: 0, text: 'PASS TO P1', btn: "I'M P1 - LET'S BATTLE!" });
    }
  };

  /* ---------- battle ---------- */
  const shoot = async (shooter: 0 | 1, r: number, c: number) => {
    const def: 0 | 1 = shooter === 0 ? 1 : 0;
    const res = fire(fleets[def], r, c);
    if (res.repeat) return false;
    setBusy(true); setTarget(null);
    const nf: [Fleet, Fleet] = shooter === 0 ? [fleets[0], res.fleet] : [res.fleet, fleets[1]];
    setFleets(nf);
    shotN.current++; setLastShot([r, c, shotN.current]);
    if (res.hit) { sfx2.hit(); setLastHit((n) => n + 1); } else sfx3.splash();
    const who = names[shooter];
    setMsg(res.sunk ? `${who} SUNK THE ${FLEET[res.sunk.id].name.toUpperCase()}!` : res.hit ? `BOOM! ${who} HIT A BOAT!` : `SPLASH! ${who} MISSED.`);
    if (res.sunk) { setTimeout(sfx.score, 250); setTimeout(sfx3.quack, 650); }
    if (allSunk(res.fleet)) { setWinner(shooter); setPhase('over'); setBusy(false); return true; }
    await sleep(res.sunk ? 1700 : 1300);
    if (!opp.cpu) {
      const next = def;
      setTurn(next);
      setCurtain({ to: next, text: `PASS TO ${names[next]}`, btn: `I'M ${names[next]} - MY TURN` });
    } else if (shooter === 0) setTurn(1);
    else setTurn(0);
    setBusy(false);
    return true;
  };

  const cpuTurn = opp.cpu && phase === 'play' && turn === 1 && !busy && winner === null;
  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => { const [r, c] = cpuShot(fleets[0], opp.level); shoot(1, r, c); }, 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, fleets]);

  const tap = (r: number, c: number) => {
    if (busy || curtain || (opp.cpu && turn !== 0) || phase !== 'play') return;
    if (fleets[enemy].shots[r][c]) return;
    sfx.click();
    if (target && target[0] === r && target[1] === c) shoot(viewer, r, c); else setTarget([r, c]);
  };
  const fireBtn = () => { if (target) shoot(viewer, target[0], target[1]); };

  const reset = () => {
    setPhase('setup'); setFleets([newFleet(), newFleet()]); setPlacing(0); setDraft([]); setSel(0); setVert(false); setTurn(0);
    setTarget(null); setMsg(''); setBusy(false); setWinner(null); setLastShot(null);
    setCurtain(opp.cpu ? null : { to: 0, text: 'P2, LOOK AWAY!', btn: "I'M P1 - PLACE MY BOATS" });
  };

  const preview = useMemo(() => null, []);
  const myFleet = phase === 'setup' ? newFleet(draft) : fleets[viewer];
  const enemyFleet = fleets[enemy];
  const remaining = (f: Fleet) => f.ships.filter((s) => !isSunk(f, s)).length;

  const status = phase === 'over' ? `${names[winner!]} SUNK THE WHOLE FLEET!`
    : phase === 'setup' ? `${names[placing]}: PLACE YOUR BOATS`
    : opp.cpu && turn === 1 ? 'CPU IS AIMING...'
    : target ? `${names[viewer]}: PRESS FIRE!` : `${names[viewer]}: TAP A SPOT TO AIM`;

  return (
    <div className="game battleship">
      <div className="head">
        <ModeBar opp={opp} onChange={reset} />
        <div className="status">{status}</div>
        {phase !== 'setup' && <div className="captures">{msg || `${names[enemy]} has ${remaining(enemyFleet)} boats left · you have ${remaining(myFleet)}`}</div>}
      </div>

      {phase === 'setup' ? (
        <div className="main setup">
          <Pond fleet={myFleet} reveal label={`${names[placing]}'S POND`} onCell={placeAt} shake={bad > 0} key={`s${bad}`} />
          <div className="tray">
            <p className="hint">Tap a boat, then tap the pond to place it. Tap a placed boat to pick it up.</p>
            {FLEET.map((f) => {
              const placed = draft.some((d) => d.id === f.id);
              return (
                <button key={f.id} className={`shipbtn ${sel === f.id ? 'on' : ''} ${placed ? 'done' : ''}`} onClick={() => { sfx.click(); if (placed) setDraft(draft.filter((d) => d.id !== f.id)); setSel(f.id); }}>
                  <span className="mini" style={{ width: f.len * 22 }}><Boat len={f.len} id={f.id} /></span>
                  <span className="nm">{f.name}</span>
                  <span className="st">{placed ? '✓' : `${f.len}`}</span>
                </button>
              );
            })}
            <div className="row">
              <button className="btn" onClick={rotate}>{vert ? 'UP/DOWN ↕' : 'SIDEWAYS ↔'}</button>
              <button className="btn" onClick={shuffle}>SHUFFLE</button>
              <button className="btn" onClick={clear}>CLEAR</button>
            </div>
            <button className="btn primary big" disabled={draft.length < FLEET.length} onClick={finishSetup}>
              {draft.length < FLEET.length ? `PLACE ${FLEET.length - draft.length} MORE` : opp.cpu ? 'READY - START!' : placing === 0 ? 'READY - PASS TO P2' : 'READY - BATTLE!'}
            </button>
          </div>
        </div>
      ) : (
        <div className="main boards" key={lastHit}>
          <Pond fleet={enemyFleet} reveal={false} label={`${names[enemy]}'S POND - AIM HERE`} onCell={tap} target={target} lastShot={lastShot} />
          <Pond fleet={myFleet} reveal small label={`YOUR BOATS`} lastShot={lastShot} />
        </div>
      )}

      <div className="foot">
        {phase === 'play' && (
          <div className="row">
            <button className="btn primary big" onClick={fireBtn} disabled={!target || busy || (opp.cpu && turn !== 0)}>FIRE!</button>
          </div>
        )}
        <div className="row"><button className="btn" onClick={reset}>NEW GAME</button></div>
        <p className="hint">Find and sink all 5 boats. Hits show a BOOM, misses make a ripple.</p>
      </div>

      {curtain && (
        <Overlay><div className="handoff">
          <div className="banner">
            <div className="curtainboat"><Boat len={4} id={curtain.to === 0 ? 0 : 3} /></div>
            <h2>{curtain.text}</h2>
            <p>{phase === 'setup' ? 'No peeking at the other pond!' : 'Hand over the iPad. Your boats stay secret.'}</p>
            <button className="btn primary" onClick={() => setCurtain(null)}>{curtain.btn}</button>
          </div>
        </div></Overlay>
      )}
      {phase === 'over' && winner !== null && (
        <Celebrate title={`${names[winner]} WINS!`} sub={opp.cpu ? (winner === 0 ? 'You sank the whole fleet!' : 'The CPU sank your fleet') : 'All boats sunk!'} onAgain={reset} />
      )}
    </div>
  );
}
