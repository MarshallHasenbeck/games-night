// Flight log: records anything that is not normal operation, so freezes and crashes can be looked at afterwards.
// Everything stays on this device (localStorage); the menu shows a LOG button when something has been recorded.
//
// What it catches:
// - JS errors and rejected promises that nothing handled, and React render crashes
// - stalls: the main thread stopped answering for STALL_MS or more while the app was on screen (logged once it recovers)
// - hard freezes: the app was closed or killed while frozen; the next launch notices the last session never finished
// Each issue comes with the last few screens and taps before it (the "trail").

declare const __BUILD__: string;

export type LogEntry = { t: number; kind: 'error' | 'rejection' | 'crash' | 'stall' | 'lost-session' | 'console'; msg: string; screen: string; detail?: string; trail?: string[] };

const LOG_KEY = 'gn-log', BEAT_KEY = 'gn-beat';
const MAX_ENTRIES = 100, MAX_TRAIL = 25;
const BEAT_MS = 500, STALL_MS = 2000;

const trail: string[] = [];
const listeners = new Set<() => void>();
let started = false;

const screen = () => location.hash.slice(1) || 'menu';
const stamp = (t = Date.now()) => new Date(t).toTimeString().slice(0, 8);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function getLog(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}
export function clearLog() {
  try { localStorage.removeItem(LOG_KEY); } catch { /* ignore */ }
  listeners.forEach((f) => f());
}
export function onLogChange(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

let lastMsg = '', lastAt = 0;
export function logIssue(kind: LogEntry['kind'], msg: string, detail?: string, extra?: Partial<LogEntry>) {
  // one bad loop can throw the same error every frame; keep one copy a second
  const now = Date.now();
  if (msg === lastMsg && now - lastAt < 1000) return;
  lastMsg = msg; lastAt = now;
  const entry: LogEntry = { t: now, kind, msg: clip(msg, 300), screen: screen(), detail: detail ? clip(detail, 1500) : undefined, trail: [...trail], ...extra };
  try {
    const log = getLog();
    log.push(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)));
  } catch { /* storage full or blocked: nothing more we can do */ }
  listeners.forEach((f) => f());
}

/** A plain-text copy of the log, for pasting into a message. */
export function logReport(): string {
  const head = `Game Night log · build ${__BUILD__} · ${navigator.userAgent}`;
  const lines = getLog().map((e) => {
    const d = new Date(e.t);
    const out = [`[${d.toLocaleDateString()} ${stamp(e.t)}] ${e.kind.toUpperCase()} on ${e.screen}: ${e.msg}`];
    if (e.detail) out.push(`  ${e.detail.replace(/\n/g, '\n  ')}`);
    if (e.trail?.length) out.push(`  before: ${e.trail.join(' → ')}`);
    return out.join('\n');
  });
  return [head, ...lines].join('\n\n');
}

function crumb(s: string) {
  trail.push(`${stamp()} ${s}`);
  if (trail.length > MAX_TRAIL) trail.shift();
}

export function startFlightLog() {
  if (started) return;
  started = true;

  // A previous session that was on screen and stopped beating without being hidden or closed ended in a freeze or a crash.
  try {
    const prev = JSON.parse(localStorage.getItem(BEAT_KEY) || 'null') as { t: number; screen: string; open: boolean; trail: string[] } | null;
    if (prev?.open) {
      logIssue('lost-session', `The last session stopped responding at ${stamp(prev.t)} and never recovered (closed or reloaded while frozen)`, undefined, { screen: prev.screen, trail: prev.trail, t: prev.t });
    }
  } catch { /* ignore */ }

  window.addEventListener('error', (e) => {
    // a script or image that failed to load reports here too, without a message
    const target = e.target as HTMLElement | null;
    if (target && target !== (window as unknown as HTMLElement) && 'tagName' in target) {
      logIssue('error', `Failed to load ${target.tagName.toLowerCase()} ${(target as HTMLImageElement).src || ''}`);
      return;
    }
    logIssue('error', e.message || 'Unknown error', e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`);
  }, true);
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    logIssue('rejection', r?.message || String(r), r?.stack);
  });
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origError(...args);
    logIssue('console', args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(' '));
  };

  // the trail: screen changes and taps
  crumb(`open ${screen()}`);
  window.addEventListener('hashchange', () => crumb(`screen ${screen()}`));
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement | null)?.closest('button, [role=button], .tile, [class*=cell], [class*=card]') as HTMLElement | null;
    const label = el ? (el.getAttribute('aria-label') || el.textContent || el.className).trim().replace(/\s+/g, ' ') : (e.target as HTMLElement | null)?.className;
    crumb(`tap ${clip(String(label || '?'), 40)}`);
  }, { capture: true, passive: true });

  // heartbeat: notices stalls, and leaves a marker so the next launch can tell a frozen session from a closed one
  let last = Date.now(), visible = document.visibilityState === 'visible';
  const save = (open: boolean) => {
    try { localStorage.setItem(BEAT_KEY, JSON.stringify({ t: Date.now(), screen: screen(), open, trail })); } catch { /* ignore */ }
  };
  setInterval(() => {
    const now = Date.now(), gap = now - last;
    last = now;
    // timers are paused or slowed while the app is in the background; only a gap while it was on screen counts
    if (visible && document.visibilityState === 'visible' && gap > STALL_MS) {
      logIssue('stall', `The app froze for ${(gap / 1000).toFixed(1)}s`);
    }
    save(visible);
  }, BEAT_MS);
  const onVis = () => {
    visible = document.visibilityState === 'visible';
    last = Date.now();
    crumb(visible ? 'back in app' : 'left app');
    save(visible);
  };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', () => save(false));
  window.addEventListener('pageshow', (e) => { if (e.persisted) onVis(); }); // only a page restored from the back/forward cache
  save(visible);
}
