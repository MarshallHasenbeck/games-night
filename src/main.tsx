import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// What the page really has to lay out in. window.innerWidth/innerHeight (and vw/vh) can be left stale by iOS after rotating,
// but an element sized 100% of the fixed viewport is always the true layout size, and ResizeObserver reports real changes.
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none;z-index:-1';
document.body.appendChild(probe);
const view = () => {
  const r = probe.getBoundingClientRect(), pw = Math.round(r.width), ph = Math.round(r.height), iw = window.innerWidth, ih = window.innerHeight;
  if (!pw || !ph) return { w: iw, h: ih };
  // normally innerHeight is the visible height (a bit shorter than the fixed box when toolbars show); after a rotation it can be stale
  const fresh = iw > ih === pw > ph && Math.abs(iw - pw) < 40;
  return { w: pw, h: fresh ? Math.min(ph, ih) : ph };
};

// ---- The stage -------------------------------------------------------------------------------------------------
// Game layouts are written against --app-w x --app-h. Instead of letting those become whatever odd size a phone's toolbars leave,
// a game screen gets a *virtual* viewport: the real size divided by a scale S (S = 1 on anything roomy, like an iPad). S only drops
// when the real screen is smaller than the design minimum, so a layout never sees a cramped size; the shell is then scaled by S to
// fill the real screen exactly (same aspect, so no bars). The scenery stays real-size behind it (--real-w / --real-h).
const MIN_PORTRAIT = { w: 390, h: 700 }, MIN_LANDSCAPE = { w: 932, h: 390 };
const stage = { s: 1, vw: 0, vh: 0, w: 0, h: 0 };
const insetProbe = document.createElement('div');
insetProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.body.appendChild(insetProbe);

let onResized: () => void = () => {};
let lastKey = '';
const setAppHeight = () => {
  const el = document.documentElement, vv = window.visualViewport, { w, h } = view();
  const inGame = !!document.querySelector('.game');
  const min = w > h ? MIN_LANDSCAPE : MIN_PORTRAIT;
  const s = inGame ? Math.min(1, w / min.w, h / min.h) : 1;
  const vw = Math.round(w / s), vh = Math.round(h / s);
  Object.assign(stage, { s, vw, vh, w, h });
  const key = `${w}x${h}@${s.toFixed(3)}`;
  if (key !== lastKey) {
    lastKey = key;
    const st = el.style, ins = getComputedStyle(insetProbe);
    st.setProperty('--real-w', `${w}px`); st.setProperty('--real-h', `${h}px`); // the scenery is always the real size
    st.setProperty('--app-w', `${vw}px`); st.setProperty('--app-h', `${vh}px`); // layouts use the virtual size
    st.setProperty('--stage-s', String(s));
    // safe areas in virtual px (the shell is scaled by s, so env() would come out too small)
    // Chrome on iPhone already keeps the page clear of the notch in landscape (the page is narrower than the screen) but still reports
    // the notch as a safe area, so honouring it would pad the left edge a second time and push the board off the right
    const screenW = w > h ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const sideBaked = w < screenW - 1;
    st.setProperty('--sat', `${parseFloat(ins.paddingTop) / s}px`); st.setProperty('--sar', sideBaked ? '0px' : `${parseFloat(ins.paddingRight) / s}px`);
    st.setProperty('--sab', `${parseFloat(ins.paddingBottom) / s}px`); st.setProperty('--sal', sideBaked ? '0px' : `${parseFloat(ins.paddingLeft) / s}px`);
    onResized();
  }
  const top = `${Math.max(0, Math.round(vv?.offsetTop ?? 0))}px`;
  if (el.style.getPropertyValue('--vv-top') !== top) el.style.setProperty('--vv-top', top); // pin to what is really visible
  // 'land' = phone held sideways (short), 'phone' = narrow portrait; anything bigger keeps the roomy iPad layouts
  const fit = vw > vh && vh < 560 ? 'land' : vw < 600 ? 'phone' : '';
  if (fit) { if (el.dataset.fit !== fit) el.dataset.fit = fit; } else delete el.dataset.fit; // an empty data-fit would still match [data-fit] in CSS
};
setAppHeight();
setInterval(setAppHeight, 500); // iPad Safari can leave the viewport nudged (e.g. after the keyboard closes) without firing an event
document.addEventListener('focusout', () => setTimeout(setAppHeight, 300));
window.addEventListener('resize', setAppHeight);
new ResizeObserver(setAppHeight).observe(probe);
window.visualViewport?.addEventListener('resize', setAppHeight);
window.visualViewport?.addEventListener('scroll', setAppHeight);
window.addEventListener('orientationchange', () => [0, 120, 300, 700].forEach((ms) => setTimeout(setAppHeight, ms)));
// viewport-fit=cover is fixed in index.html (switching it on from JS is unreliable on iOS and left a green strip beside the notch after rotating);
// the layouts pad for the safe areas themselves.

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
  shell.style.transform = ''; shell.style.height = ''; shell.style.width = ''; shell.style.maxWidth = ''; shell.style.margin = '';
  if (!shell.querySelector('.game')) { delete root.dataset.fitted; return; }
  window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; // Safari restores the old scroll position on refresh, which hid the top of the table
  const { s: S, w: W, h: H } = stage;
  if (S < 1) { shell.style.width = `${W / S}px`; shell.style.maxWidth = 'none'; shell.style.margin = '0'; } // lay out at the virtual width
  const avail = H / S, need = shell.offsetHeight;
  const s2 = need > avail + 1 ? Math.max(0.55, avail / need) : 1; // safety net: still too tall for the virtual screen, shrink a little more
  const total = S * s2;
  if (total < 1) {
    shell.style.transformOrigin = S < 1 ? 'top left' : 'top center';
    shell.style.transform = `scale(${total})`;
    shell.style.height = `${H / total}px`; // keeps the page itself exactly one screen tall
    if (S < 1) shell.style.width = `${W / total}px`;
  }
  root.dataset.fitted = '1'; // game screens never scroll
};
const queueFit = () => { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fitGame); setTimeout(() => { if (fitQueued) fitGame(); }, 80); } }; // rAF is paused in background tabs, so a timer backs it up
onResized = () => { queueFit(); setTimeout(queueFit, 150); setTimeout(queueFit, 500); }; // again once the new layout has settled
// re-fit when a different game screen appears (not on every tap, so the table never twitches mid-game)
new MutationObserver(() => { if (document.querySelector('.game') !== fittedGame) { setAppHeight(); queueFit(); } }).observe(document.getElementById('root')!, { childList: true, subtree: true });
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

// Diagnostics for iPad Safari layout quirks (add ?debug to the address to show)
if (location.search.includes('debug')) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:9999;margin:0;padding:6px 8px;background:#000c;color:#9f9;font:11px/1.3 monospace;border-radius:6px;pointer-events:none;white-space:pre';
  document.body.appendChild(box);
  const upd = () => {
    const vv = window.visualViewport, sh = document.querySelector('.shell')?.getBoundingClientRect(), bd = document.body.getBoundingClientRect();
    const u = (v: string) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:0;top:0;width:0;height:${v};visibility:hidden`; document.body.appendChild(d); const h = Math.round(d.getBoundingClientRect().height); d.remove(); return h; };
    const sc = document.querySelector('.scenery')?.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    box.textContent = [
      `vh ${u('100vh')} svh ${u('100svh')} lvh ${u('100lvh')} dvh ${u('100dvh')}  clientH ${document.documentElement.clientHeight}`,
      `scenery top ${Math.round(sc?.top ?? 0)} bottom ${Math.round(sc?.bottom ?? 0)}  vvtop ${cs.getPropertyValue('--vv-top')}`,
      `build ${__BUILD__}  probe ${view().w}x${view().h}\n      inner ${innerWidth}x${innerHeight}  outer ${outerWidth}x${outerHeight}  screen ${screen.width}x${screen.height}  dpr ${devicePixelRatio}`,
      `vv ${Math.round(vv?.width ?? 0)}x${Math.round(vv?.height ?? 0)} off ${Math.round(vv?.offsetLeft ?? 0)},${Math.round(vv?.offsetTop ?? 0)} page ${Math.round(vv?.pageLeft ?? 0)},${Math.round(vv?.pageTop ?? 0)} scale ${vv?.scale}`,
      `scrollY ${Math.round(scrollY)}  docH ${document.documentElement.scrollHeight}  appH ${getComputedStyle(document.documentElement).getPropertyValue('--app-h')}`,
      `shell top ${Math.round(sh?.top ?? 0)} bottom ${Math.round(sh?.bottom ?? 0)}  body top ${Math.round(bd.top)} bottom ${Math.round(bd.bottom)}`,
      `fitted ${document.documentElement.dataset.fitted ?? '-'}  fit ${document.documentElement.dataset.fit ?? '-'}  scale ${(document.querySelector('.shell') as HTMLElement | null)?.style.transform || '1'}`,
    ].join('\n');
  };
  setInterval(upd, 400); upd();
}
