import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Real visible height in px: works on every Safari, including the iPad address-bar / home-screen cases
const setAppHeight = () => {
  const el = document.documentElement, vv = window.visualViewport, w = window.innerWidth, h = Math.round(Math.min(window.innerHeight, vv?.height ?? Infinity));
  el.style.setProperty('--app-h', `${h}px`);
  el.style.setProperty('--vv-top', `${Math.max(0, Math.round(vv?.offsetTop ?? 0))}px`); // pin to what is really visible
  // 'land' = phone held sideways (short), 'phone' = narrow portrait; anything bigger keeps the roomy iPad layouts
  const fit = w > h && h < 560 ? 'land' : w < 600 ? 'phone' : '';
  if (fit) el.dataset.fit = fit; else delete el.dataset.fit; // an empty data-fit would still match [data-fit] in CSS
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.visualViewport?.addEventListener('resize', setAppHeight);
window.visualViewport?.addEventListener('scroll', setAppHeight);
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

// Add ?debug to the address to see what the browser reports (for chasing iPad Safari layout quirks)
if (location.search.includes('debug')) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:9999;margin:0;padding:6px 8px;background:#000c;color:#9f9;font:11px/1.3 monospace;border-radius:6px;pointer-events:none;white-space:pre';
  document.body.appendChild(box);
  const upd = () => {
    const vv = window.visualViewport, sh = document.querySelector('.shell')?.getBoundingClientRect(), bd = document.body.getBoundingClientRect();
    box.textContent = [
      `inner ${innerWidth}x${innerHeight}  outer ${outerWidth}x${outerHeight}  screen ${screen.width}x${screen.height}  dpr ${devicePixelRatio}`,
      `vv ${Math.round(vv?.width ?? 0)}x${Math.round(vv?.height ?? 0)} off ${Math.round(vv?.offsetLeft ?? 0)},${Math.round(vv?.offsetTop ?? 0)} page ${Math.round(vv?.pageLeft ?? 0)},${Math.round(vv?.pageTop ?? 0)} scale ${vv?.scale}`,
      `scrollY ${Math.round(scrollY)}  docH ${document.documentElement.scrollHeight}  appH ${getComputedStyle(document.documentElement).getPropertyValue('--app-h')}`,
      `shell top ${Math.round(sh?.top ?? 0)} bottom ${Math.round(sh?.bottom ?? 0)}  body top ${Math.round(bd.top)} bottom ${Math.round(bd.bottom)}`,
      `fitted ${document.documentElement.dataset.fitted ?? '-'}  fit ${document.documentElement.dataset.fit ?? '-'}  scale ${(document.querySelector('.shell') as HTMLElement | null)?.style.transform || '1'}`,
    ].join('\n');
  };
  setInterval(upd, 400); upd();
}
