import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from './lib/sfx';

/** Full-screen popups render on <body> so the auto-fit scaling of the game can't displace them. */
export const Overlay = ({ children }: { children: ReactNode }) => createPortal(children, document.body);

/* ---------- opponent selection (2 players vs computer) ---------- */
export type Opp = { cpu: boolean; level: 1 | 2 | 3; setCpu: (v: boolean) => void; setLevel: (v: 1 | 2 | 3) => void };

export function useOpponent(id: string): Opp {
  const key = `gn-opp-${id}`;
  const [v, setV] = useState<{ cpu: boolean; level: 1 | 2 | 3 }>(() => {
    try { return { cpu: false, level: 2, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { cpu: false, level: 2 }; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return { cpu: v.cpu, level: v.level, setCpu: (cpu) => setV((p) => ({ ...p, cpu })), setLevel: (level) => setV((p) => ({ ...p, level })) };
}

export function ModeBar({ opp, onChange, levels = true }: { opp: Opp; onChange?: () => void; levels?: boolean }) {
  const set = (cpu: boolean) => { sfx.click(); opp.setCpu(cpu); onChange?.(); };
  return (
    <div className="modebar">
      <div className="seg">
        <button className={!opp.cpu ? 'on' : ''} onClick={() => set(false)}>2 PLAYERS</button>
        <button className={opp.cpu ? 'on' : ''} onClick={() => set(true)}>VS CPU</button>
      </div>
      {opp.cpu && levels && (
        <div className="seg small">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map((n, i) => (
            <button key={n} className={opp.level === i + 1 ? 'on' : ''} onClick={() => { sfx.click(); opp.setLevel((i + 1) as 1 | 2 | 3); }}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- win celebration ---------- */
const CONF = ['#f2b632', '#d4475a', '#6fbf4a', '#5ab0c8', '#fff4d6', '#b394ff'];
export function Celebrate({ title, sub, onAgain }: { title: string; sub?: string; onAgain: () => void }) {
  const [open, setOpen] = useState(true);
  const bits = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 1.6, dur: 2.4 + Math.random() * 2, size: 6 + Math.floor(Math.random() * 7),
    color: CONF[i % CONF.length], sway: (Math.random() - 0.5) * 160, round: i % 3 === 0,
  })), []);
  if (!open) return <button className="btn reopen" onClick={() => setOpen(true)}>RESULT</button>;
  return (
    <Overlay><div className="celebrate" role="dialog">
      <div className="confetti" aria-hidden>
        {bits.map((b, i) => (
          <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, borderRadius: b.round ? '50%' : 2, ['--sway' as string]: `${b.sway}px` }} />
        ))}
      </div>
      <div className="banner">
        <div className="trophy">★</div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
        <div className="row">
          <button className="btn primary" onClick={onAgain}>PLAY AGAIN</button>
          <button className="btn" onClick={() => setOpen(false)}>VIEW BOARD</button>
        </div>
      </div>
    </div></Overlay>
  );
}

export const Plaque = ({ children }: { children: ReactNode }) => <div className="status">{children}</div>;

/* ---------- how to play ---------- */
import { RULES } from './rules';

export function RulesModal({ game, onClose }: { game: string; onClose: () => void }) {
  const r = RULES[game];
  if (!r) return null;
  return (
    <div className="rules-overlay" onClick={onClose} role="dialog" aria-label={`How to play ${r.title}`}>
      <div className="rules" onClick={(e) => e.stopPropagation()}>
        <div className="rules-head">
          <h2>HOW TO PLAY · {r.title.toUpperCase()}</h2>
          <button className="btn small" onClick={onClose}>CLOSE ✕</button>
        </div>
        <div className="rules-body">
          <p className="goal"><b>GOAL</b> {r.goal}</p>
          {r.sections.map((s) => (
            <section key={s.h}>
              <h3>{s.h}</h3>
              <ul>{s.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </section>
          ))}
        </div>
        <div className="row"><button className="btn primary" onClick={onClose}>GOT IT - LET'S PLAY</button></div>
      </div>
    </div>
  );
}
