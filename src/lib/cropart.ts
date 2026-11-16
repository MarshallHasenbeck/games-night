/** Pixel-art crops for Giant Pumpkin: drawn smooth, then pixelated (same recipe as the menu icons). Cached data URLs. */
const O = '#24140a';
type C = CanvasRenderingContext2D;
const lin = (c: C, x0: number, y0: number, x1: number, y1: number, st: string[]) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach((s, i) => g.addColorStop(i / (st.length - 1), s)); return g; };
const path = (c: C, fn: (c: C) => void, fill: string | CanvasGradient, lw = 3.2) => { c.beginPath(); fn(c); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = O; c.stroke(); };
const ell = (c: C, x: number, y: number, rx: number, ry: number, rot = 0) => (p: C) => p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
const gloss = (c: C, fn: (c: C) => void, a = 0.55) => { c.beginPath(); fn(c); c.fillStyle = `rgba(255,255,255,${a})`; c.fill(); };
const leaf = (c: C, x: number, y: number, len: number, rot: number, col = ['#9be06a', '#3f9a3a']) => {
  c.save(); c.translate(x, y); c.rotate(rot);
  path(c, (p) => { p.moveTo(0, 0); p.quadraticCurveTo(len * 0.35, -len * 0.3, len, 0); p.quadraticCurveTo(len * 0.35, len * 0.3, 0, 0); }, lin(c, 0, -len * 0.3, 0, len * 0.3, col), 2.4);
  c.restore();
};
const star = (c: C, x: number, y: number, r: number, col: string) => { c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = col; c.fill(); };

const DRAW: ((c: C) => void)[] = [
  // 0 seed
  (c) => { path(c, ell(c, 48, 54, 15, 23, 0.35), lin(c, 30, 30, 66, 78, ['#f1d9a0', '#c99a4c', '#7a4a20'])); c.strokeStyle = '#7a4a20'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(42, 38); c.quadraticCurveTo(50, 54, 55, 72); c.stroke(); gloss(c, ell(c, 41, 44, 3, 7, 0.35), 0.7); },
  // 1 sprout
  (c) => { path(c, ell(c, 48, 76, 28, 11), lin(c, 0, 66, 0, 88, ['#a56f35', '#5b3716'])); c.strokeStyle = O; c.lineWidth = 4.6; c.beginPath(); c.moveTo(48, 72); c.quadraticCurveTo(46, 56, 50, 42); c.stroke(); c.strokeStyle = '#4aa13a'; c.lineWidth = 2.6; c.stroke(); leaf(c, 49, 50, 30, -2.6); leaf(c, 50, 44, 30, -0.5); },
  // 2 radish
  (c) => { leaf(c, 46, 38, 26, -2.2); leaf(c, 48, 38, 28, -1.57); leaf(c, 50, 38, 26, -0.9); path(c, (p) => { p.moveTo(48, 90); p.lineTo(43, 70); p.lineTo(53, 70); p.closePath(); }, '#fff6e6', 2.4); path(c, ell(c, 48, 58, 23, 22), lin(c, 26, 38, 70, 80, ['#ff8d9c', '#d4475a', '#8f1d33'])); gloss(c, ell(c, 39, 49, 5, 3, -0.6), 0.6); },
  // 3 carrot
  (c) => { leaf(c, 42, 36, 28, -2.3); leaf(c, 48, 36, 30, -1.57); leaf(c, 54, 36, 28, -0.8); path(c, (p) => { p.moveTo(28, 38); p.quadraticCurveTo(48, 28, 68, 38); p.lineTo(52, 90); p.quadraticCurveTo(48, 94, 44, 90); p.closePath(); }, lin(c, 28, 30, 68, 90, ['#ffb15a', '#ee8a3a', '#b4601a'])); c.strokeStyle = 'rgba(122,58,14,.6)'; c.lineWidth = 2; [[36, 48, 48, 50], [40, 62, 52, 63], [44, 76, 52, 76]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }); gloss(c, ell(c, 38, 44, 3, 7, 0.2), 0.5); },
  // 4 potato
  (c) => { path(c, ell(c, 48, 56, 31, 22, -0.25), lin(c, 20, 34, 76, 80, ['#e8c58a', '#c19556', '#7d5428'])); c.fillStyle = '#6b4424'; [[38, 52], [58, 48], [52, 64], [34, 64]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 2.2, 1.6, 0, 0, 7); c.fill(); }); gloss(c, ell(c, 38, 44, 7, 3, -0.4), 0.5); },
  // 5 corn
  (c) => { leaf(c, 44, 92, 52, -1.9, ['#9be06a', '#3f9a3a']); leaf(c, 52, 92, 52, -1.25, ['#9be06a', '#3f9a3a']); path(c, ell(c, 48, 48, 14, 32), lin(c, 34, 16, 62, 80, ['#fff08a', '#f5c443', '#c98a10'])); c.fillStyle = 'rgba(160,96,10,.55)'; for (let y = 24; y < 70; y += 9) for (let x = 41; x < 58; x += 8) { c.beginPath(); c.arc(x + ((y / 9) % 2 ? 3 : 0), y, 2, 0, 7); c.fill(); } gloss(c, ell(c, 41, 36, 2.4, 9), 0.5); },
  // 6 tomato
  (c) => { path(c, ell(c, 48, 58, 27, 24), lin(c, 22, 34, 74, 82, ['#ff8d7a', '#e0402c', '#9a1f14'])); star(c, 48, 36, 16, '#4aa13a'); c.strokeStyle = O; c.lineWidth = 2; c.stroke(); gloss(c, ell(c, 36, 50, 6, 3.4, -0.6), 0.6); },
  // 7 eggplant
  (c) => { path(c, (p) => { p.moveTo(50, 30); p.bezierCurveTo(78, 34, 80, 76, 56, 88); p.bezierCurveTo(30, 96, 22, 64, 38, 44); p.closePath(); }, lin(c, 24, 30, 78, 90, ['#b77adf', '#7a3fa8', '#3f1a66'])); path(c, (p) => { p.moveTo(36, 40); p.lineTo(46, 24); p.lineTo(58, 28); p.lineTo(58, 42); p.lineTo(46, 38); p.closePath(); }, '#4aa13a', 2.4); gloss(c, ell(c, 56, 62, 3, 12, 0.25), 0.5); },
  // 8 cabbage
  (c) => { path(c, ell(c, 48, 56, 30, 28), lin(c, 22, 30, 74, 86, ['#cdf79a', '#7ad862', '#2f8a3a'])); c.strokeStyle = 'rgba(30,100,40,.7)'; c.lineWidth = 2.4; [[34, 76, 44, 40], [48, 82, 48, 34], [62, 76, 54, 40]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(a - 6, (b + e) / 2, d, e); c.stroke(); }); c.beginPath(); c.arc(48, 56, 15, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); gloss(c, ell(c, 36, 44, 6, 3, -0.6), 0.5); },
  // 9 melon
  (c) => { path(c, ell(c, 48, 56, 32, 26), lin(c, 18, 30, 78, 84, ['#a8e878', '#4aa13a', '#2a6d2b'])); c.strokeStyle = 'rgba(25,90,35,.75)'; c.lineWidth = 3; [-17, -6, 6, 17].forEach((dx) => { c.beginPath(); c.moveTo(48 + dx * 0.4, 30); c.quadraticCurveTo(48 + dx * 2.2, 56, 48 + dx * 0.4, 82); c.stroke(); }); gloss(c, ell(c, 34, 46, 7, 3, -0.6), 0.5); },
  // 10 pumpkin
  (c) => { path(c, (p) => { p.rect(45, 26, 7, 12); }, '#4aa13a', 2.4); path(c, ell(c, 48, 60, 32, 25), lin(c, 16, 36, 80, 86, ['#ffb15a', '#ee8a3a', '#b4601a'])); c.strokeStyle = 'rgba(140,60,10,.65)'; c.lineWidth = 2.6; [-18, -7, 7, 18].forEach((dx) => { c.beginPath(); c.moveTo(48 + dx * 0.45, 36); c.quadraticCurveTo(48 + dx * 1.9, 60, 48 + dx * 0.45, 84); c.stroke(); }); gloss(c, ell(c, 32, 50, 6, 3, -0.7), 0.5); },
  // 11 giant pumpkin
  (c) => { path(c, (p) => { p.rect(43, 14, 10, 14); }, '#4aa13a', 2.6); leaf(c, 54, 22, 20, -0.3); path(c, ell(c, 48, 58, 38, 31), lin(c, 8, 28, 88, 90, ['#ffc46a', '#f2902e', '#b4561a'])); c.strokeStyle = 'rgba(140,60,10,.7)'; c.lineWidth = 3; [-24, -10, 10, 24].forEach((dx) => { c.beginPath(); c.moveTo(48 + dx * 0.45, 28); c.quadraticCurveTo(48 + dx * 1.9, 58, 48 + dx * 0.45, 88); c.stroke(); }); gloss(c, ell(c, 28, 46, 7, 3, -0.7), 0.55); star(c, 78, 20, 9, '#fff6b0'); star(c, 16, 30, 6, '#ffe36a'); star(c, 84, 70, 5, '#fff6b0'); },
];

function drawStone(c: C, hp: number) {
  path(c, (p) => { p.moveTo(16, 66); p.lineTo(22, 44); p.lineTo(40, 30); p.lineTo(64, 32); p.lineTo(80, 48); p.lineTo(82, 68); p.lineTo(66, 80); p.lineTo(30, 80); p.closePath(); }, lin(c, 16, 30, 82, 82, ['#d6dce2', '#a2abb6', '#6a7380']));
  gloss(c, (p) => { p.moveTo(26, 52); p.lineTo(40, 38); p.lineTo(58, 38); p.lineTo(40, 48); }, 0.55);
  c.strokeStyle = 'rgba(40,46,56,.55)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(60, 56); c.lineTo(72, 66); c.stroke();
  if (hp <= 1) { c.strokeStyle = O; c.lineWidth = 3.2; c.beginPath(); c.moveTo(50, 32); c.lineTo(44, 48); c.lineTo(54, 58); c.lineTo(46, 80); c.stroke(); c.beginPath(); c.moveTo(44, 48); c.lineTo(30, 56); c.stroke(); }
}

/** tiers past the Giant Pumpkin: the same big pumpkin in richer and richer finishes, with more sparkle each step */
const FINISH: string[][] = [
  ['#cfe6ff', '#4a8fe0', '#1f4f9a'],   // 12 ribbon (blue-ribbon winner)
  ['#fff3a0', '#f5c443', '#a8730f'],   // 13 golden
  ['#e0fbff', '#7fe0f0', '#2f9ab8'],   // 14 crystal
  ['#f4f6ff', '#c9ceea', '#7a82b4'],   // 15 moon
  ['#fffbc0', '#ffd23a', '#e8780a'],   // 16 sun
  ['#ff9aa8', '#9a7af0', '#3ab8e0'],   // 17 rainbow
  ['#ffe6ff', '#c06af0', '#4a2a9a'],   // 18 starlit
  ['#fff0b0', '#ff9a3a', '#c02a2a'],   // 19 legend
  ['#ffffff', '#ffd23a', '#d4475a'],   // 20 mythic
];
function drawFancy(c: C, k: number) {
  const f = FINISH[k];
  path(c, (p) => { p.rect(43, 14, 10, 14); }, '#4aa13a', 2.6);
  path(c, ell(c, 48, 58, 38, 31), lin(c, 8, 28, 88, 90, f));
  c.strokeStyle = 'rgba(40,20,60,.45)'; c.lineWidth = 3; [-24, -10, 10, 24].forEach((dx) => { c.beginPath(); c.moveTo(48 + dx * 0.45, 28); c.quadraticCurveTo(48 + dx * 1.9, 58, 48 + dx * 0.45, 88); c.stroke(); });
  gloss(c, ell(c, 28, 46, 7, 3, -0.7), 0.6);
  if (k === 0) { path(c, ell(c, 48, 62, 12, 12), '#4a8fe0', 2.4); star(c, 48, 62, 8, '#fff6b0'); path(c, (p) => { p.moveTo(42, 72); p.lineTo(38, 90); p.lineTo(46, 84); p.lineTo(50, 90); p.lineTo(52, 72); p.closePath(); }, '#2f6ad0', 2); }
  const spark: [number, number, number][] = [[78, 18, 9], [14, 30, 6], [84, 70, 5], [12, 74, 5], [60, 8, 5], [90, 44, 4], [30, 10, 4], [70, 86, 4], [6, 52, 4]];
  spark.slice(0, 2 + Math.min(k, 7)).forEach(([x, y, r]) => star(c, x, y, r, k % 2 ? '#fff6b0' : '#ffffff'));
}
FINISH.forEach((_, k) => DRAW.push((c) => drawFancy(c, k)));

const cache = new Map<string, string>();
function render(key: string, fn: (c: C) => void, N = 48, L = 34): string {
  const hit = cache.get(key); if (hit) return hit;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const x = cv.getContext('2d')!; x.scale(N / 96, N / 96); fn(x);
  const im = x.getImageData(0, 0, N, N), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] >= 120) { d[i + 3] = 255; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, Math.round(d[i + j] / L) * L); } else d[i + 3] = 0;
  }
  x.putImageData(im, 0, 0);
  // upscale with hard edges so the browser never smooths the pixels
  const big = document.createElement('canvas'); big.width = big.height = N * 4;
  const b = big.getContext('2d')!; b.imageSmoothingEnabled = false; b.drawImage(cv, 0, 0, N * 4, N * 4);
  const url = big.toDataURL('image/png'); cache.set(key, url); return url;
}
export const cropUrl = (t: number) => render(`c${t}`, DRAW[t]);
export const stoneUrl = (hp: number) => render(`s${hp}`, (c) => drawStone(c, hp));
