import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PixelArt } from '../Sprite';
import { Overlay } from '../ui';
import { sfx } from '../lib/sfx';
import { COLORS, DIFFS, decodePuzzle, pickGivens, rnd, shuf, transformPuzzle, type Diff, type Puzzle } from '../lib/pugdoku';
import pugUrl from '../assets/pug.png';

type Mode = 'solo' | 'coop';
type Bank = Record<number, [string, string][]>;
type GState = {
  n: number; g: number[][]; p: number[]; pal: string[];
  st: number[][];            // 0 empty, 1 X, 2 pug
  bad: boolean[][];          // X marks that came from a wrong guess (shown in red, can't be removed)
  given: boolean[];          // rows that started with a pug
  lives: number; hints: number; turn: 0 | 1; passes: number; msg: string;
  over: null | 'win' | 'lose'; pts: number;
  secs: number;              // seconds spent on this puzzle (counts while the page is visible)
  best: boolean;             // this solve beat the previous best time for the difficulty
};

const X_ROWS = ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'];
const BONE_ROWS = ['ww.....ww', 'wwwwwwwww', '.wwwwwww.', 'wwwwwwwww', 'ww.....ww'];

/** A round, knobby cartoon bone, rasterised from circles + a shaft (with outline, shade and a shine) instead of hand-typed boxes. */
const BIG_BONE: string[] = (() => {
  const W = 26, H = 12;
  const knobs: [number, number][] = [[4.2, 3.6], [4.2, 8.4], [21.8, 3.6], [21.8, 8.4]];
  const inside = (x: number, y: number) => {
    const px = x + 0.5, py = y + 0.5;
    return knobs.some(([cx, cy]) => (px - cx) ** 2 + (py - cy) ** 2 <= 3.5 ** 2) || (px >= 4 && px <= 22 && py >= 4.4 && py <= 7.6);
  };
  const g: string[][] = Array.from({ length: H + 2 }, () => Array(W + 2).fill('.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) g[y + 1][x + 1] = !inside(x, y + 1) ? 's' : !inside(x, y - 1) ? 'h' : 'w';
  const o = g.map((r) => [...r]);
  for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) {
    if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.')) o[y][x] = 'o';
  }
  return o.map((r) => r.join(''));
})();
const CONF = ['#f2b632', '#d4475a', '#6fbf4a', '#5ab0c8', '#fff4d6', '#b394ff', '#f08fb0'];
const SPARKS: [number, number, string][] = [[-80, -70, '#f2b632'], [0, -100, '#fff4d6'], [80, -70, '#f08fb0'], [-100, 0, '#6fbf4a'], [100, 0, '#5ab0c8'], [-70, 60, '#f2b632'], [70, 60, '#d4475a'], [0, 70, '#fff4d6']];

/** Win screen: a happy pug jumps up and catches a bone while confetti rains behind. */
export function PugWin({ title, sub, onNext }: { title: string; sub: string; onNext: () => void }) {
  const [open, setOpen] = useState(true);
  const bits = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 1.8, dur: 2.4 + Math.random() * 2, size: 6 + Math.floor(Math.random() * 8),
    color: CONF[i % CONF.length], sway: (Math.random() - 0.5) * 180, round: i % 3 === 0,
  })), []);
  useEffect(() => { const ts = [setTimeout(sfx.move, 100), setTimeout(sfx.score, 1000), setTimeout(sfx.win, 1100)]; return () => ts.forEach(clearTimeout); }, []);
  if (!open) return <button className="btn reopen" onClick={() => setOpen(true)}>RESULT</button>;
  return (
    <Overlay><div className="celebrate" role="dialog">
      <div className="confetti" aria-hidden>
        {bits.map((b, i) => (
          <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, borderRadius: b.round ? '50%' : 2, ['--sway' as string]: `${b.sway}px` }} />
        ))}
      </div>
      <div className="banner">
        <div className="pgdwin" aria-hidden>
          <div className="pgdhero">
            <img className="pgdhappy" src={pugUrl} alt="" draggable={false} />
            <div className="pgdbone"><PixelArt rows={BIG_BONE} palette={{ o: '#3a2410', w: '#fff4d6', s: '#d9bf86', h: '#ffffff' }} px={5} /></div>
            {SPARKS.map(([dx, dy, c], i) => <i key={i} className="pgdspark" style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, ['--c' as string]: c }} />)}
          </div>
        </div>
        <h2>{title}</h2>
        <p>{sub}</p>
        <div className="row">
          <button className="btn primary" onClick={onNext}>NEXT PUZZLE</button>
          <button className="btn" onClick={() => setOpen(false)}>VIEW BOARD</button>
        </div>
      </div>
    </div></Overlay>
  );
}

const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) || 'null') as T | null; } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export default function Pugdoku() {
  const cfg0 = read<{ mode?: Mode; diff?: Diff; names?: [string, string]; named?: boolean }>('gn-pugdoku');
  const [mode, setModeState] = useState<Mode>(cfg0?.mode === 'coop' ? 'coop' : 'solo');
  const [diff, setDiffState] = useState<Diff>(cfg0?.diff && cfg0.diff in DIFFS ? cfg0.diff : 'easy');
  const [names, setNames] = useState<[string, string]>(cfg0?.names ?? ['P1', 'P2']);
  const [named, setNamed] = useState(!!cfg0?.named);
  const [namesOpen, setNamesOpen] = useState(false);
  const [draft, setDraft] = useState<[string, string]>(['', '']);
  const [, tick] = useReducer((x: number) => x + 1, 0);

  const G = useRef<GState | null>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const diffRef = useRef(diff); diffRef.current = diff;
  /** Puzzles solved + points per difficulty. Just for fun; nothing depends on it, so losing it costs nothing. */
  const prog = useRef<Record<Diff, { w: number; s: number; b?: number }>>({
    easy: { w: 0, s: 0 }, medium: { w: 0, s: 0 }, hard: { w: 0, s: 0 }, relaxed: { w: 0, s: 0 }, ...(read<Record<Diff, { w: number; s: number; b?: number }>>('gn-pugdoku-stats') ?? {}),
  });
  const bank = useRef<Bank | null>(null);
  const pool = useRef<Record<number, Puzzle[]>>({});
  const pending = useRef<Record<number, number>>({});
  const worker = useRef<Worker | null>(null);
  const used = useRef<string[]>(read<string[]>('gn-pugdoku-used') ?? []);
  const nm = (i: number) => names[i] || `P${i + 1}`;

  const saveCfg = (over: Partial<{ mode: Mode; diff: Diff; names: [string, string]; named: boolean }> = {}) =>
    write('gn-pugdoku', { mode, diff, names, named, ...over });
  const saveProg = () => write('gn-pugdoku-stats', prog.current);

  /* ---- where puzzles come from: the verified bank (instant) + fresh ones built in the background ---- */
  const ensure = (n: number) => {
    const w = worker.current;
    if (!w || document.hidden) return;
    const have = (pool.current[n]?.length ?? 0) + (pending.current[n] ?? 0);
    if (have < 2) { pending.current[n] = (pending.current[n] ?? 0) + 1; w.postMessage(n); }
  };
  const fromBank = (n: number): Puzzle | null => {
    const list = bank.current?.[n];
    if (!list?.length) return null;
    let free = list.map((_, i) => i).filter((i) => !used.current.includes(`${n}:${i}`));
    if (!free.length) { used.current = used.current.filter((k) => !k.startsWith(`${n}:`)); free = list.map((_, i) => i); }
    const i = free[rnd(free.length)];
    used.current.push(`${n}:${i}`);
    if (used.current.length > 600) used.current = used.current.slice(-600);
    write('gn-pugdoku-used', used.current);
    return transformPuzzle(decodePuzzle(list[i], n), n);
  };
  const nextPuzzle = (n: number): Puzzle | null => {
    const live = pool.current[n] ?? [];
    if (live.length && (rnd(2) === 0 || !bank.current?.[n])) return live.shift()!;
    return fromBank(n) ?? live.shift() ?? null;
  };

  const fresh = (n: number, pz: Puzzle, givenRows: number[], m: Mode, pal: string[]): GState => {
    const st = Array.from({ length: n }, () => Array(n).fill(0)) as number[][];
    const given: boolean[] = Array(n).fill(false);
    givenRows.forEach((r) => { st[r][pz.p[r]] = 2; given[r] = true; });
    return { n, g: pz.g, p: pz.p, pal, st, bad: Array.from({ length: n }, () => Array(n).fill(false)) as boolean[][], given, lives: 3, hints: 2, turn: m === 'coop' ? (prog.current[diffRef.current].w % 2) as 0 | 1 : 0, passes: 0, msg: '', over: null, pts: 0, secs: 0, best: false };
  };
  const givenRowsRef = useRef<number[]>([]);

  const startLevel = (m: Mode, d: Diff = diffRef.current) => {
    const n = DIFFS[d].n;
    const pz = nextPuzzle(n);
    if (!pz) { G.current = null; tick(); return; }
    givenRowsRef.current = pickGivens(n, d);
    G.current = fresh(n, pz, givenRowsRef.current, m, shuf(COLORS.slice(0, n)));
    tick();
    setTimeout(() => ensure(n), 1500);
  };
  const retry = () => {
    const s = G.current; if (!s) return;
    G.current = fresh(s.n, { g: s.g, p: s.p }, givenRowsRef.current, modeRef.current, s.pal);
    G.current.turn = s.turn;
    tick();
  };

  useEffect(() => {
    try {
      const w = new Worker(new URL('../lib/pugdoku.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ n: number; g: number[][]; p: number[] }>) => {
        const { n, g, p } = e.data;
        (pool.current[n] ??= []).push({ g, p });
        pending.current[n] = Math.max(0, (pending.current[n] ?? 1) - 1);
        if (!G.current) startLevel(modeRef.current); else ensure(n);
      };
      worker.current = w;
    } catch { worker.current = null; }
    let alive = true;
    import('../lib/pugdoku-bank').then((m) => { if (!alive) return; bank.current = m.BANK; startLevel(modeRef.current); if (modeRef.current === 'coop' && !cfg0?.named) openNames(); });
    return () => { alive = false; worker.current?.terminate(); worker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- timer: counts each second the puzzle is on screen and unfinished ---- */
  useEffect(() => {
    const id = setInterval(() => { const g = G.current; if (!g || g.over || document.hidden) return; g.secs += 1; tick(); }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- names ---- */
  function openNames() { setDraft([names[0] === 'P1' ? '' : names[0], names[1] === 'P2' ? '' : names[1]]); setNamesOpen(true); }
  const saveNames = () => {
    const nn: [string, string] = [(draft[0].trim() || 'P1').slice(0, 10), (draft[1].trim() || 'P2').slice(0, 10)];
    setNames(nn); setNamed(true); setNamesOpen(false); saveCfg({ names: nn, named: true });
  };

  /* ---- difficulty: stays what you picked until you change it ---- */
  const setDiff = (d: Diff) => {
    if (d === diff) return;
    sfx.click(); diffRef.current = d; setDiffState(d); saveCfg({ diff: d });
    startLevel(modeRef.current, d);
  };

  /* ---- mode ---- */
  const setMode = (m: Mode) => {
    if (m === mode) return;
    sfx.click(); modeRef.current = m; setModeState(m); saveCfg({ mode: m });
    startLevel(m);
    if (m === 'coop' && !named) openNames();
  };

  /* ---- game actions ---- */
  const endTurn = (s: GState, msg = '') => { s.turn = s.turn === 0 ? 1 : 0; s.msg = msg; sfx.move(); };
  const won = (s: GState) => { for (let r = 0; r < s.n; r++) if (s.st[r][s.p[r]] !== 2) return false; return s.st.flat().filter((v) => v === 2).length === s.n; };
  const check = (s: GState) => {
    if (!won(s)) return;
    s.over = 'win';
    s.pts = s.n * 10 + (diffRef.current === 'relaxed' ? 0 : s.lives * 10);
    const pr = prog.current[diffRef.current]; pr.s += s.pts; pr.w += 1;
    if (pr.b === undefined || s.secs < pr.b) { s.best = pr.b !== undefined; pr.b = s.secs; }
    saveProg();
    setTimeout(sfx.win, 350);
  };
  const tap = (r: number, c: number) => {
    const s = G.current; if (!s || s.over) return;
    if ((s.given[r] && s.st[r][c] === 2) || s.bad[r][c]) return;   // starter pugs and red X marks are permanent
    const v = s.st[r][c];
    const now = Date.now();
    const lt = lastTap.current;
    const quick = !!lt && lt.r === r && lt.c === c && now - lt.t < 400;   // a quick second tap = "I think the pug is here"
    let placed = false;
    if (v === 0) { s.st[r][c] = 1; sfx.click(); lastTap.current = { r, c, t: now }; }
    else if (v === 1) {
      if (!quick) { s.st[r][c] = 0; s.bad[r][c] = false; sfx.click(); lastTap.current = null; }   // a single tap on an X takes it back
      else {
        lastTap.current = null;
        if (diffRef.current !== 'relaxed' && s.p[r] !== c) {
          s.lives -= 1; s.bad[r][c] = true; sfx.capture();
          try { navigator.vibrate?.(60); } catch { /* not supported */ }
          s.msg = '';
          if (s.lives <= 0) s.over = 'lose';
          else if (modeRef.current === 'coop') { s.passes = 0; endTurn(s); }
          tick(); return;
        }
        s.st[r][c] = 2; placed = true; sfx.score();
      }
    } else { s.st[r][c] = 0; lastTap.current = null; }
    check(s);
    if (placed && modeRef.current === 'coop' && !s.over) { s.passes = 0; endTurn(s); }
    tick();
  };
  const reveal = (s: GState) => {
    const rows: number[] = [];
    for (let r = 0; r < s.n; r++) if (s.st[r][s.p[r]] !== 2) rows.push(r);
    if (!rows.length) return false;
    const r = rows[rnd(rows.length)];
    for (let c = 0; c < s.n; c++) if (s.st[r][c] === 2) s.st[r][c] = 0;
    s.st[r][s.p[r]] = 2;
    return true;
  };
  const hint = () => {
    const s = G.current; if (!s || s.over || !s.hints) return;
    if (!reveal(s)) return;
    s.hints -= 1; sfx.score(); check(s); tick();
  };
  const clearX = () => {
    const s = G.current; if (!s || s.over) return;
    s.st = s.st.map((row, r) => row.map((v, c) => (v === 1 && !s.bad[r][c] ? 0 : v))); sfx.click(); tick();
  };
  const pass = () => {
    const s = G.current; if (!s || s.over || modeRef.current !== 'coop') return;
    s.passes += 1;
    if (s.passes >= 2) {
      s.passes = 0;
      const ok = reveal(s); if (ok) { sfx.score(); check(s); }
      if (!s.over) endTurn(s, ok ? 'BOTH PASSED - FREE PUG!' : '');
    } else endTurn(s, `${nm(s.turn)} PASSED`);
    tick();
  };

  /* ---- touch: tap = X / pug, drag = paint X (or clear X when the drag starts on an X) ---- */
  const lastTap = useRef<{ r: number; c: number; t: number } | null>(null);
  const drag = useRef<{ down: [number, number] | null; moved: boolean; last: [number, number] | null; mode: 'x' | 'erase' | null }>({ down: null, moved: false, last: null, mode: null });
  const cellAt = (x: number, y: number): [number, number] | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-pr]') as HTMLElement | null;
    return el ? [+el.dataset.pr!, +el.dataset.pc!] : null;
  };
  const paintDrag = (r: number, c: number) => {
    const s = G.current; if (!s) return;
    const d = drag.current;
    if (d.mode === 'x' && s.st[r][c] === 0) s.st[r][c] = 1;
    else if (d.mode === 'erase' && s.st[r][c] === 1 && !s.bad[r][c]) s.st[r][c] = 0;
  };
  const onDown = (e: React.PointerEvent) => {
    const s = G.current; if (!s || s.over) return;
    const p = cellAt(e.clientX, e.clientY); if (!p) return;
    const v = s.st[p[0]][p[1]];
    drag.current = { down: p, moved: false, last: p, mode: v === 0 ? 'x' : v === 1 ? 'erase' : null };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, s = G.current; if (!d.down || !s || s.over) return;
    const p = cellAt(e.clientX, e.clientY); if (!p || !d.last || (p[0] === d.last[0] && p[1] === d.last[1])) return;
    if (!d.moved) { d.moved = true; paintDrag(d.down[0], d.down[1]); }
    const steps = Math.max(Math.abs(p[0] - d.last[0]), Math.abs(p[1] - d.last[1]));
    for (let i = 1; i <= steps; i++) paintDrag(Math.round(d.last[0] + (p[0] - d.last[0]) * i / steps), Math.round(d.last[1] + (p[1] - d.last[1]) * i / steps));
    d.last = p; tick();
  };
  const onUp = () => { const d = drag.current; if (d.down && !d.moved) tap(d.down[0], d.down[1]); drag.current = { down: null, moved: false, last: null, mode: null }; };

  /* ---- render ---- */
  const s = G.current;
  const pugs = s ? s.st.flat().filter((v) => v === 2).length : 0;
  const pr = prog.current[diff];
  const status = !s ? 'BUILDING A PUZZLE...' : `${DIFFS[diff].label} · SOLVED ${pr.w} · SCORE ${pr.s}`;
  const again = () => startLevel(mode);
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

  return (
    <div className="game split pgd">
      <div className="head">
        <div className="modebar">
          <div className="seg">
            <button className={mode === 'solo' ? 'on' : ''} onClick={() => setMode('solo')}>SOLO</button>
            <button className={mode === 'coop' ? 'on' : ''} onClick={() => setMode('coop')}>2 PLAYERS</button>
          </div>
          <div className="seg small">
            {(Object.keys(DIFFS) as Diff[]).map((d) => <button key={d} className={diff === d ? 'on' : ''} onClick={() => setDiff(d)}>{DIFFS[d].label}</button>)}
          </div>
        </div>
        <div className={`status pgdstatus ${mode === 'coop' && s ? `t${s.turn}` : ''}`}>
          {mode === 'coop' && s ? <><i className="pgdtag" onClick={openNames}>{nm(s.turn)}</i> YOUR TURN</> : status}
        </div>
        <div className="captures pgdhud">
          <span className="pgdcount"><img src={pugUrl} alt="" />{pugs}/{s?.n ?? 0}</span>
          <span className="pgdtime" aria-label="time">TIME {fmt(s?.secs ?? 0)}</span>
          {s && <span className="pgdbones">{[0, 1, 2].map((i) => <span key={i} className={diff !== 'relaxed' && i < s.lives ? '' : 'off'}><PixelArt rows={BONE_ROWS} palette={{ w: '#fff4d6' }} px={3} /></span>)}</span>}
          {mode === 'coop' && <span className="pgdscore">{DIFFS[diff].label} · SOLVED {pr.w}</span>}
        </div>
        {mode === 'coop' && s?.msg && <div className="hint pgdmsg">{s.msg}</div>}
      </div>

      <div className="main pgdframe">
        {s ? (
          <div className="pgdboard" style={{ gridTemplateColumns: `repeat(${s.n}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${s.n}, minmax(0, 1fr))` }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = { down: null, moved: false, last: null, mode: null }; }} onContextMenu={(e) => e.preventDefault()}>
            {s.g.map((row, r) => row.map((reg, c) => {
              const v = s.st[r][c];
              const isGiven = s.given[r] && v === 2;
              const wrong = v === 2 && diff === 'relaxed' && s.p[r] !== c;   // relaxed: a wrong pug is allowed but shown in red
              return (
                <div key={`${r}-${c}`} data-pr={r} data-pc={c} className={`pgdcell${isGiven ? ' given' : ''}${wrong ? ' bad' : ''}`} style={{ background: s.pal[reg] }}>
                  {v === 1 && <span className={`pgdx${s.bad[r][c] ? ' bad' : ''}`}><PixelArt rows={X_ROWS} palette={{ x: s.bad[r][c] ? '#ff2a2a' : '#3a2410a8' }} px={4} /></span>}
                  {v === 2 && <img className="pgdpug" src={pugUrl} alt="pug" draggable={false} />}
                </div>
              );
            }))}
          </div>
        ) : <div className="pgdboard pgdload">SNIFFING OUT A PUZZLE...</div>}
      </div>

      <div className="foot">
        <div className="row">
          <button className="btn" disabled={!s || !!s.over || !s.hints} onClick={hint}>HINT{s ? ` (${s.hints})` : ''}</button>
          <button className="btn" disabled={!s || !!s.over} onClick={clearX}>CLEAR ✕</button>
          {mode === 'coop' && <button className="btn primary" disabled={!s || !!s.over} onClick={pass}>PASS</button>}
        </div>
        <p className="hint">Tap for ✕, double-tap for a pug. Tap a ✕ again to remove it, or drag across tiles.</p>
      </div>

      {s?.over === 'win' && <PugWin title={mode === 'coop' ? 'SOLVED TOGETHER!' : 'SOLVED!'} sub={`${mode === 'coop' ? `${nm(0)} & ${nm(1)}: ` : ''}+${s.pts} points · ${fmt(s.secs)}${s.best ? ' · NEW BEST!' : ''}`} onNext={again} />}
      {s?.over === 'lose' && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner">
          <h2>OUT OF TREATS!</h2><p>The pug lost patience. Try the same puzzle again?</p>
          <div className="row"><button className="btn primary" onClick={retry}>TRY AGAIN</button><button className="btn" onClick={again}>NEW PUZZLE</button></div>
        </div></div></Overlay>
      )}
      {namesOpen && (
        <Overlay><div className="celebrate" role="dialog"><div className="banner pgdnames">
          <h2>WHO'S PLAYING?</h2><p>Enter names, or keep P1 and P2.</p>
          {[0, 1].map((i) => (
            <label key={i} className="pgdnm"><b className={`pgdtag t${i}`}>{i + 1}</b>
              <input value={draft[i]} maxLength={10} placeholder={`P${i + 1}`} autoComplete="off" autoCapitalize="words"
                onChange={(e) => setDraft((d) => (i === 0 ? [e.target.value, d[1]] : [d[0], e.target.value]))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (i === 0) (e.currentTarget.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement | null)?.focus(); else saveNames(); } }} />
            </label>
          ))}
          <div className="row"><button className="btn primary" onClick={saveNames}>LET'S PLAY</button></div>
        </div></div></Overlay>
      )}
    </div>
  );
}
