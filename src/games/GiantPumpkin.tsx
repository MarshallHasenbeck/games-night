import { useEffect, useRef, useState } from 'react';
import { sfx, sfx2 } from '../lib/sfx';
import { Celebrate, DuelBar, Overlay } from '../ui';
import { makeRng, newSeed, useDuelMode, type DuelMode } from '../lib/duel';
import { cropUrl, stoneUrl } from '../lib/cropart';
import { CROPS, SIZES, TOP, MAXT, TOOLS, newGame, move, cpuStep, DUEL_MOVES, useHoe, useCan, useSwap, type State, type Dir, type Tool, type Tile } from '../lib/pumpkin';

const bestKey = (rocks: boolean, size: number) => `gn-pumpkin-best-${rocks ? 'rocks' : 'calm'}-${size}`;
const readBest = (rocks: boolean, size: number) => { try { return +(localStorage.getItem(bestKey(rocks, size)) || 0) || 0; } catch { return 0; } };
const saveBest = (rocks: boolean, size: number, v: number) => { try { localStorage.setItem(bestKey(rocks, size), String(v)); } catch { /* private mode */ } };
const SIZE_KEY = 'gn-pumpkin-size';
const readSize = () => { try { const v = +(localStorage.getItem(SIZE_KEY) || 4); return (SIZES as readonly number[]).includes(v) ? v : 4; } catch { return 4; } };
const MODE_KEY = 'gn-pumpkin-rocks';
const readRocks = () => { try { return localStorage.getItem(MODE_KEY) !== '0'; } catch { return true; } };
const SIZE_NOTE: Record<number, string> = {
  4: '4x4 CLASSIC: tight and tricky. Bigger gardens are easier!',
  5: '5x5 ROOMY: more space to work in, a friendlier climb.',
  6: '6x6 RELAXED: lots of room, great for growing the big crops.',
};
const TOOL_NAME: Record<Tool, string> = { hoe: 'HOE', can: 'WATER', swap: 'SWAP' };
const TOOL_HELP: Record<Tool, string> = { hoe: 'Tap a crop or stone to pull it up', can: 'Tap a crop to grow it one step', swap: 'Tap two crops to trade places' };
const TINT = ['#e9d6a8', '#d4ebb0', '#f6c4c4', '#ffd7a8', '#e9d0a4', '#fbe9a0', '#f9bcb0', '#d9bff0', '#cdeebd', '#c6e8b4', '#ffd09a', '#ffe28a', '#bcd8f6', '#ffe9a0', '#c8f0f6', '#e0e4f6', '#ffe28a', '#e8d0f6', '#d6b8f0', '#ffd0a0', '#ffc8d0'];
const cropLabel = (t: number) => (t >= 12 ? `${CROPS[t]} Pumpkin` : CROPS[t]);
const maxCrop = (g: (Tile)[][]) => g.flat().reduce((m, t) => (t?.kind === 'crop' ? Math.max(m, t.t) : m), 0);

type Ghost = { id: number; t: number; r: number; c: number; dx: number; dy: number };

export default function GiantPumpkin() {
  const [rocks, setRocks] = useState(readRocks);
  const [size, setSize] = useState(readSize);
  const [s, setS] = useState<State>(() => newGame(Math.random, readRocks(), readSize()));
  const [best, setBest] = useState(() => readBest(readRocks(), readSize()));
  const [pendingMode, setPendingMode] = useState<{ rocks: boolean; size: number } | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [pops, setPops] = useState<Set<number>>(new Set());
  const [tool, setTool] = useState<Tool | null>(null);
  const [first, setFirst] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<{ k: number; text: string } | null>(null);
  const [tier, setTier] = useState(0);
  const [shake, setShake] = useState(0);
  const [winOpen, setWinOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [pulse, setPulse] = useState<Tool | null>(null);
  const duel = useDuelMode('pumpkin');
  const mode = duel.mode;
  const [seed, setSeed] = useState(() => newSeed());
  const [turn, setTurn] = useState<0 | 1>(0);
  const [scores, setScores] = useState<[number | null, number | null]>([null, null]);
  const [cpuS, setCpuS] = useState<State | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [result, setResult] = useState<{ title: string; sub: string } | null>(null);
  const [pendingDuel, setPendingDuel] = useState<DuelMode | null>(null);
  const cpuPick = useRef(makeRng(99));
  /** every swipe in a duel uses the same random numbers for both players, so both meet the same new crops */
  const spawnFor = (sd: number, moves: number) => makeRng(sd * 31 + moves * 7919 + 1);
  const uid = useRef(0);
  const sRef = useRef(s); sRef.current = s;
  const down = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const say = (text: string) => setToast({ k: ++uid.current, text });
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1300); return () => clearTimeout(t); }, [toast]);

  const finish = (n: State, cpu: State | null = cpuS) => {
    if (mode === 'solo') {
      if (n.score > best) { saveBest(rocks, size, n.score); setBest(n.score); }
      if (n.over) { setNewBest(n.score > best); setTimeout(sfx.win, 300); }
      return;
    }
    if (!(n.over || n.moves >= DUEL_MOVES)) return;
    if (mode === 'two') {
      if (turn === 0) { setScores([n.score, null]); setTimeout(() => setHandoff(true), 600); }
      else endDuel(scores[0] ?? 0, n.score);
    } else if (cpu) {
      let c: State = cpu; let guard = 0;
      while (!c.over && c.moves < DUEL_MOVES && guard++ < 1000) c = cpuStep(c, duel.level, cpuPick.current, spawnFor(seed, c.moves));
      setCpuS(c); endDuel(n.score, c.score);
    }
  };
  /** the final scores of a duel: who won? */
  const endDuel = (a: number, b: number) => {
    const names: [string, string] = mode === 'cpu' ? ['YOU', 'CPU'] : ['P1', 'P2'];
    const title = a === b ? "IT'S A TIE!" : a > b ? (mode === 'cpu' ? 'YOU WIN!' : `${names[0]} WINS!`) : (mode === 'cpu' ? 'CPU WINS!' : `${names[1]} WINS!`);
    setScores([a, b]);
    setTimeout(() => { setResult({ title, sub: `${names[0]} ${a}  -  ${names[1]} ${b}` }); sfx.win(); }, 600);
  };
  const stepCpu = (c: State): State => { const target = c.moves + 1; let n = c, g = 0; while (!n.over && n.moves < target && g++ < 6) n = cpuStep(n, duel.level, cpuPick.current, spawnFor(seed, n.moves)); return n; };

  const doMove = (dir: Dir) => {
    const cur = sRef.current;
    if (cur.over || winOpen || handoff || result || (mode !== 'solo' && cur.moves >= DUEL_MOVES)) return;
    setTool(null); setFirst(null);
    const r = move(cur, dir, mode === 'solo' ? Math.random : spawnFor(seed, cur.moves));
    if (!r.moved) { setShake((v) => v + 1); sfx2.hit(); return; }
    const where = new Map<number, [number, number]>();
    cur.grid.forEach((row, rr) => row.forEach((t, cc) => { if (t) where.set(t.id, [rr, cc]); }));
    const gs: Ghost[] = r.consumed.map((x) => { const [r0, c0] = where.get(x.id) ?? [x.r, x.c]; const t = (cur.grid[r0][c0] as { t: number }).t; return { id: x.id, t, r: x.r, c: x.c, dx: c0 - x.c, dy: r0 - x.r }; });
    setGhosts(gs); setTimeout(() => setGhosts([]), 260);
    const pp = new Set([...r.made.map((m) => m.id), ...r.spawned.map((m) => m.id)]);
    setPops(pp); setTimeout(() => setPops(new Set()), 420);
    if (r.made.length) { sfx.score(); if (r.made.some((m) => m.t >= 6)) setTimeout(sfx.capture, 90); } else sfx.move();
    if (r.broken.length) { sfx2.hit(); say('STONE BROKEN!'); }
    if (r.earned) { say(`NEW TOOL: ${TOOL_NAME[r.earned]}!`); setPulse(r.earned); setTimeout(() => setPulse(null), 1200); }
    const top = maxCrop(r.state.grid);
    if (top > tier) { setTier(top); if (!r.earned && !r.broken.length && top >= 2) say(`${cropLabel(top).toUpperCase()}!`); }
    if (r.newlyWon && mode === 'solo') { setTimeout(() => { setWinOpen(true); sfx.win(); }, 380); }
    let cpu = cpuS;
    if (mode === 'cpu' && cpu && !cpu.over && cpu.moves < DUEL_MOVES) { cpu = stepCpu(cpu); setCpuS(cpu); }
    setS(r.state); finish(r.state, cpu);
  };

  // keyboard (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
      const d = m[e.key]; if (d) { e.preventDefault(); doMove(d); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cellAt = (x: number, y: number): [number, number] | null => {
    const b = boardRef.current; if (!b) return null;
    const rc = b.getBoundingClientRect();
    const n = sRef.current.size;
    const c = Math.floor(((x - rc.left) / rc.width) * n), r = Math.floor(((y - rc.top) / rc.height) * n);
    return r >= 0 && c >= 0 && r < n && c < n ? [r, c] : null;
  };
  const useAt = (r: number, c: number) => {
    const cur = sRef.current; let n: State | null = null;
    if (tool === 'hoe') n = useHoe(cur, r, c);
    else if (tool === 'can') { n = useCan(cur, r, c); if (n && n.won && !cur.won && mode === 'solo') setTimeout(() => { setWinOpen(true); sfx.win(); }, 300); }
    else if (tool === 'swap') {
      const t = cur.grid[r][c];
      if (!t || t.kind !== 'crop') return;
      if (!first) { setFirst([r, c]); sfx.click(); return; }
      n = useSwap(cur, first, [r, c]);
    }
    if (!n) { sfx2.hit(); return; }
    sfx.flip(); setS(n); setFirst(null); setTool(null); setPops(new Set(n.grid.flat().filter((t) => t?.kind === 'crop').map((t) => t!.id))); setTimeout(() => setPops(new Set()), 420);
    const top = maxCrop(n.grid); if (top > tier) setTier(top);
    finish(n);
  };

  const onDown = (e: React.PointerEvent) => { down.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onUp = (e: React.PointerEvent) => {
    const d = down.current; down.current = null; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (tool) { const c = cellAt(e.clientX, e.clientY); if (c) useAt(c[0], c[1]); } return; }
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const reset = (rk: boolean = rocks, sz: number = size, dm: DuelMode = mode) => { if (rk !== rocks) { setRocks(rk); try { localStorage.setItem(MODE_KEY, rk ? '1' : '0'); } catch { /* private mode */ } } if (sz !== size) { setSize(sz); try { localStorage.setItem(SIZE_KEY, String(sz)); } catch { /* private mode */ } } setBest(readBest(rk, sz)); setPendingMode(null); const sd = newSeed(); setSeed(sd); cpuPick.current = makeRng(sd + 17); setS(dm === 'solo' ? newGame(Math.random, rk, sz) : newGame(makeRng(sd), rk, sz)); setCpuS(dm === 'cpu' ? newGame(makeRng(sd), rk, sz) : null); setTurn(0); setScores([null, null]); setHandoff(false); setResult(null); setPendingDuel(null); setGhosts([]); setPops(new Set()); setTool(null); setFirst(null); setToast(null); setTier(0); setWinOpen(false); setConfirmNew(false); setNewBest(false); };
  const pickMode = (m: boolean, sz: number = size) => { if (m === rocks && sz === size) return; sfx.click(); if (s.moves) setPendingMode({ rocks: m, size: sz }); else reset(m, sz); };
  const startSecond = () => { setS(newGame(makeRng(seed), rocks, size)); setTurn(1); setHandoff(false); setTier(0); setGhosts([]); setToast(null); setTool(null); setFirst(null); };
  useEffect(() => { reset(rocks, size, duel.mode); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [duel.mode]);
  const pickDuel = (m: DuelMode) => { if (m === mode) return; if (s.moves && !result) setPendingDuel(m); else duel.setMode(m); };
  const swipesLeft = Math.max(0, DUEL_MOVES - s.moves);
  const arm = (t: Tool) => { if (s.tools[t] < 1 || s.over && false) return; sfx.click(); setFirst(null); setTool(tool === t ? null : t); };

  const tiles: { id: number; r: number; c: number; tile: NonNullable<Tile> }[] = [];
  s.grid.forEach((row, r) => row.forEach((t, c) => { if (t) tiles.push({ id: t.id, r, c, tile: t }); }));

  const prompt = mode !== 'solo' ? `${mode === 'two' ? `P${turn + 1}'S TURN - ` : ''}${swipesLeft} SWIPES LEFT. Same garden and same new crops for both players. Highest score wins!` : s.over ? 'NO MORE ROOM!' : tool ? TOOL_HELP[tool] + (tool === 'swap' && first ? ' (pick the second)' : '') : s.stuck ? 'STUCK! USE A FARM TOOL TO KEEP GROWING' : s.moves === 0 ? `${SIZE_NOTE[s.size]} Swipe to start.` : 'Swipe to slide the crops. Match two to grow them!';

  return (
    <div className="game gp" data-duel={mode}>
      <div className="head">
        <div className="gpbars">
        <DuelBar mode={mode} level={duel.level} setMode={pickDuel} setLevel={(l) => { duel.setLevel(l); reset(rocks, size, mode); }} />
        <div className="modebar">
          <div className="seg">
            {SIZES.map((n) => <button key={n} className={size === n ? 'on' : ''} title={SIZE_NOTE[n]} onClick={() => pickMode(rocks, n)}>{n}x{n}</button>)}
          </div>
          <div className="seg">
            <button className={!rocks ? 'on' : ''} onClick={() => pickMode(false)}>NO ROCKS</button>
            <button className={rocks ? 'on' : ''} onClick={() => pickMode(true)}>ROCKS</button>
          </div>
        </div>
        </div>
        {mode === 'solo' && <div className="status ffscore"><span>SCORE <b>{s.score}</b></span><span>BEST <b>{Math.max(best, s.score)}</b></span></div>}
        {mode === 'two' && <div className="status ffscore"><span className={turn === 0 ? 'me' : ''}>P1 <b>{turn === 0 ? s.score : scores[0] ?? 0}</b></span><span className={turn === 1 ? 'me' : ''}>P2 <b>{turn === 1 ? s.score : '-'}</b></span><span className="hand">{swipesLeft} SWIPES</span></div>}
        {mode === 'cpu' && <div className="status ffscore"><span className="me">YOU <b>{s.score}</b></span><span>CPU <b>{cpuS?.score ?? 0}</b></span><span className="hand">{swipesLeft} SWIPES</span></div>}
        <div className="gpladder" aria-hidden>
          {CROPS.slice(0, Math.max(TOP, tier) + 1).map((n, t) => <img key={t} className={t <= tier ? 'lit' : ''} src={cropUrl(t)} alt={n} title={n} />)}
        </div>
        <p className="hint prompt">{prompt}</p>
      </div>

      <div className="main gpwrap">
        <div className="gpframe">
          <div className={`gpboard${tool ? ' armed' : ''}${s.size > 5 ? ' tiny' : ''}`} style={{ ['--n' as string]: s.size }} ref={boardRef} key={`b${shake % 2}`} data-shake={shake ? 1 : 0}
            onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { down.current = null; }} onContextMenu={(e) => e.preventDefault()}>
            {Array.from({ length: s.size * s.size }, (_, i) => <div key={i} className="gpcell" style={{ ['--r' as string]: Math.floor(i / s.size), ['--c' as string]: i % s.size }} />)}
            {ghosts.map((g) => (
              <div key={`g${g.id}`} className="gptile ghost" style={{ ['--r' as string]: g.r, ['--c' as string]: g.c, ['--dx' as string]: g.dx, ['--dy' as string]: g.dy, background: TINT[g.t] }}>
                <img src={cropUrl(g.t)} alt="" draggable={false} />
              </div>
            ))}
            {tiles.map(({ id, r, c, tile }) => tile.kind === 'stone' ? (
              <div key={id} className={`gptile gprock${pops.has(id) ? ' gpnew' : ''}${tool === 'hoe' ? ' target' : ''}`} style={{ ['--r' as string]: r, ['--c' as string]: c }}>
                <img src={stoneUrl(tile.hp)} alt="stone" draggable={false} />
              </div>
            ) : (
              <div key={id} className={`gptile${pops.has(id) ? ' pop' : ''}${first && first[0] === r && first[1] === c ? ' picked' : ''}${tool && (tool !== 'can' || tile.t < MAXT) ? ' target' : ''}${tile.t >= TOP ? ' giant' : ''}`} style={{ ['--r' as string]: r, ['--c' as string]: c, background: TINT[tile.t] }}>
                <img src={cropUrl(tile.t)} alt={CROPS[tile.t]} draggable={false} />
                <span className="gpname">{CROPS[tile.t]}</span>
              </div>
            ))}
          </div>
          {toast && <div className="fftoast gptoast" key={toast.k}>{toast.text}</div>}
        </div>

        <div className="gptools">
          {TOOLS.map((t) => (
            <button key={t} className={`gptool${tool === t ? ' on' : ''}${pulse === t ? ' pulse' : ''}`} disabled={s.tools[t] < 1} onClick={() => arm(t)}>
              <b>{TOOL_NAME[t]}</b><span>x{s.tools[t]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="foot">
        <div className="row"><button className="btn" onClick={() => (s.moves ? setConfirmNew(true) : reset())}>↺ NEW GAME</button></div>
      </div>

      {winOpen && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <div className="gpwin"><img src={cropUrl(TOP)} alt="" /></div>
          <h2>PUMPKIN!</h2><p>You grew it! Score {s.score}. Keep going: it keeps growing into Giant, Ribbon, Golden, Crystal and Moon pumpkins and beyond!</p>
          <div className="row"><button className="btn primary" onClick={() => setWinOpen(false)}>KEEP GROWING</button><button className="btn" onClick={() => reset()}>NEW GAME</button></div>
        </div></div></Overlay>
      )}
      {pendingMode !== null && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>SWITCH TO {pendingMode.size}x{pendingMode.size} {pendingMode.rocks ? 'WITH ROCKS' : 'NO ROCKS'}?</h2><p>This starts a fresh garden and ends the one you're growing.</p>
          <div className="row"><button className="btn primary" onClick={() => setPendingMode(null)}>KEEP PLAYING</button><button className="btn" onClick={() => reset(pendingMode.rocks, pendingMode.size)}>SWITCH</button></div>
        </div></div></Overlay>
      )}
      {confirmNew && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>START A NEW GAME?</h2><p>This ends the game you're playing.</p>
          <div className="row"><button className="btn primary" onClick={() => setConfirmNew(false)}>KEEP PLAYING</button><button className="btn" onClick={() => reset()}>YES, START OVER</button></div>
        </div></div></Overlay>
      )}
      {pendingDuel && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>SWITCH MODE?</h2><p>This ends the garden you're growing and starts a new one.</p>
          <div className="row"><button className="btn primary" onClick={() => setPendingDuel(null)}>KEEP PLAYING</button><button className="btn" onClick={() => { const m = pendingDuel; setPendingDuel(null); duel.setMode(m); }}>SWITCH</button></div>
        </div></div></Overlay>
      )}
      {handoff && (
        <Overlay><div className="handoff"><div className="banner">
          <h2>PASS TO P2</h2><p>P1 scored {scores[0]}. P2 gets the very same garden and the very same new crops. Beat it!</p>
          <button className="btn primary" onClick={startSecond}>I'M P2 - START</button>
        </div></div></Overlay>
      )}
      {mode === 'solo' && s.over && !winOpen && <Celebrate title="NO MORE ROOM!" sub={`Score ${s.score}${newBest ? ' · NEW BEST!' : ` · Best ${best}`} · grew a ${cropLabel(tier)}`} onAgain={() => reset()} />}
      {result && <Celebrate title={result.title} sub={result.sub} onAgain={() => reset()} />}
    </div>
  );
}

/** menu icon: a little pumpkin */
export function GiantPumpkinIcon() {
  return <img className="gicon" src={cropUrl(10)} alt="" draggable={false} />;
}
