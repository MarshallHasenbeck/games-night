import { Component, useEffect, useState, type ReactNode } from 'react';
import { clearLog, getLog, logIssue, logReport, onLogChange } from './lib/flightlog';

/** Number of logged issues, kept up to date. */
export function useLogCount() {
  const [n, setN] = useState(() => getLog().length);
  useEffect(() => onLogChange(() => setN(getLog().length)), []);
  return n;
}

/** If a game screen crashes while drawing, show a way back instead of a blank page, and log it. */
export class GameGuard extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    logIssue('crash', error.message || String(error), `${error.stack ?? ''}\n${info.componentStack ?? ''}`.trim());
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="rules" style={{ margin: '40px auto', maxWidth: 520 }}>
        <div className="rules-head"><h2>OOPS - THIS GAME HIT A SNAG</h2></div>
        <div className="rules-body"><p>It's been written to the log. Head back to the games and try again.</p></div>
        <div className="row"><button className="btn primary" onClick={this.props.onExit}>← BACK TO GAMES</button></div>
      </div>
    );
  }
}

const KIND_LABEL: Record<string, string> = { error: 'ERROR', rejection: 'ERROR', crash: 'CRASH', stall: 'FREEZE', 'lost-session': 'FROZE / CLOSED', console: 'WARNING' };

export function LogModal({ onClose }: { onClose: () => void }) {
  const [log, setLog] = useState(getLog);
  const [copied, setCopied] = useState(false);
  useEffect(() => onLogChange(() => setLog(getLog())), []);
  const copy = async () => {
    const text = logReport();
    try { await navigator.clipboard.writeText(text); }
    catch { // older Safari: fall back to a hidden text box
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rules-overlay" onClick={onClose} role="dialog" aria-label="Problem log">
      <div className="rules" onClick={(e) => e.stopPropagation()}>
        <div className="rules-head">
          <h2>PROBLEM LOG · {log.length}</h2>
          <button className="btn small" onClick={onClose}>CLOSE ✕</button>
        </div>
        <div className="rules-body">
          {!log.length && <p>Nothing logged. Everything has been running normally.</p>}
          {[...log].reverse().map((e, i) => (
            <section key={i}>
              <h3>{KIND_LABEL[e.kind] ?? e.kind} · {new Date(e.t).toLocaleString()} · {e.screen}</h3>
              <p>{e.msg}</p>
              {!!e.trail?.length && <p style={{ fontSize: '0.8em', opacity: 0.75 }}>Before: {e.trail.slice(-6).map((s) => s.slice(9)).join(' → ')}</p>}
            </section>
          ))}
        </div>
        <div className="row">
          {!!log.length && <button className="btn primary" onClick={copy}>{copied ? 'COPIED ✓' : 'COPY FULL LOG'}</button>}
          {!!log.length && <button className="btn" onClick={() => { clearLog(); }}>CLEAR</button>}
        </div>
      </div>
    </div>
  );
}
