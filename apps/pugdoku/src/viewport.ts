/** Layout size, measured the way the web version does it (see docs/DEV-GUIDE.md §5): never from vh/vw/innerWidth, which iOS can leave stale
 *  after a rotation. A fixed, invisible 100%x100% probe is always the true layout size, and a second one reads the notch / home-bar insets.
 *  Sets --app-w/--app-h (+ --real-w/--real-h), safe areas in px (--sat/--sar/--sab/--sal and --rs* for pop-ups) and html[data-fit]. */
export function startViewport() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none;z-index:-1';
  const inset = document.createElement('div');
  inset.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(probe, inset);
  const el = document.documentElement;
  let last = '';
  const update = () => {
    const r = probe.getBoundingClientRect(), w = Math.round(r.width) || window.innerWidth, h = Math.round(r.height) || window.innerHeight;
    const ins = getComputedStyle(inset);
    const key = `${w}x${h}/${ins.paddingTop}/${ins.paddingRight}/${ins.paddingBottom}/${ins.paddingLeft}`;
    if (key === last) return;
    last = key;
    const st = el.style, px = (v: string) => `${parseFloat(v) || 0}px`;
    st.setProperty('--app-w', `${w}px`); st.setProperty('--app-h', `${h}px`);
    st.setProperty('--real-w', `${w}px`); st.setProperty('--real-h', `${h}px`);
    st.setProperty('--sat', px(ins.paddingTop)); st.setProperty('--sar', px(ins.paddingRight)); st.setProperty('--sab', px(ins.paddingBottom)); st.setProperty('--sal', px(ins.paddingLeft));
    st.setProperty('--rsat', px(ins.paddingTop)); st.setProperty('--rsar', px(ins.paddingRight)); st.setProperty('--rsab', px(ins.paddingBottom)); st.setProperty('--rsal', px(ins.paddingLeft));
    const fit = w > h && h < 560 ? 'land' : w < 600 ? 'phone' : '';
    if (fit) el.dataset.fit = fit; else delete el.dataset.fit;   // an empty data-fit would still match [data-fit]
  };
  update();
  new ResizeObserver(update).observe(probe);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => [0, 120, 300, 700].forEach((ms) => setTimeout(update, ms)));
  setInterval(update, 800);   // belt and braces: some rotations fire no event
}
