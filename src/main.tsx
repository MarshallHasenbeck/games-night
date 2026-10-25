import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Real visible height in px: works on every Safari, including the iPad address-bar / home-screen cases
const setAppHeight = () => {
  const el = document.documentElement, w = window.innerWidth, h = window.innerHeight;
  el.style.setProperty('--app-h', `${h}px`);
  // 'land' = phone held sideways (short), 'phone' = narrow portrait; anything bigger keeps the roomy iPad layouts
  const fit = w > h && h < 560 ? 'land' : w < 600 ? 'phone' : '';
  if (fit) el.dataset.fit = fit; else delete el.dataset.fit; // an empty data-fit would still match [data-fit] in CSS
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 250));

// Never scroll on a game screen: if the table is taller than the visible area, shrink it to fit (rarely needed -
// the layouts are already sized to the viewport; this is the safety net for odd Safari toolbar heights).
let fitQueued = false;
let fittedGame: Element | null = null;
const fitGame = () => {
  fitQueued = false;
  fittedGame = document.querySelector('.game');
  const shell = document.querySelector<HTMLElement>('.shell');
  const root = document.documentElement;
  if (!shell) return;
  shell.style.transform = ''; shell.style.height = '';
  if (!shell.querySelector('.game')) { delete root.dataset.fitted; return; }
  window.scrollTo(0, 0); // Safari restores the old scroll position on refresh, which hid the top of the table
  const avail = Math.min(window.innerHeight, window.visualViewport?.height ?? Infinity), need = shell.offsetHeight;
  if (need > avail + 1) {
    const s = Math.max(0.55, avail / need);
    shell.style.transformOrigin = 'top center';
    shell.style.transform = `scale(${s})`;
    shell.style.height = `${avail / s}px`; // keeps the page itself exactly one screen tall
    root.dataset.fitted = '1';
  } else root.dataset.fitted = '1'; // game screens never scroll
};
const queueFit = () => { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fitGame); } };
// re-fit when a different game screen appears (not on every tap, so the table never twitches mid-game)
new MutationObserver(() => { if (document.querySelector('.game') !== fittedGame) queueFit(); }).observe(document.getElementById('root')!, { childList: true, subtree: true });
window.addEventListener('resize', queueFit);
window.visualViewport?.addEventListener('resize', queueFit);
window.addEventListener('pageshow', queueFit);
try { history.scrollRestoration = 'manual'; } catch { /* ignore */ }
window.addEventListener('orientationchange', () => setTimeout(queueFit, 300));
document.fonts?.ready.then(queueFit);

// A game screen is exactly one screen tall, so anything that nudges the page (restored scroll, focus, rubber-banding) snaps back.
const snapTop = () => { if (document.documentElement.dataset.fitted && (window.scrollY || window.scrollX)) window.scrollTo(0, 0); };
window.addEventListener('scroll', snapTop, { passive: true });
window.visualViewport?.addEventListener('scroll', snapTop);
document.addEventListener('focusin', () => requestAnimationFrame(snapTop));
