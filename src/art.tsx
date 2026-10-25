import { useEffect, useMemo, type ReactElement } from 'react';
import { PixelArt } from './Sprite';
import { useTime, type Resolved } from './lib/theme';

/* ================= procedural pixel art ================= */
type Pt = [number, number];
type Shape =
  | { t: 'poly'; p: Pt[]; cut?: boolean }
  | { t: 'circ'; c: Pt; r: number; cut?: boolean; mark?: string }
  | { t: 'ell'; c: Pt; rx: number; ry: number; cut?: boolean };

function inside(sh: Shape, x: number, y: number): boolean {
  if (sh.t === 'circ') return (x - sh.c[0]) ** 2 + (y - sh.c[1]) ** 2 <= sh.r * sh.r;
  if (sh.t === 'ell') return ((x - sh.c[0]) / sh.rx) ** 2 + ((y - sh.c[1]) / sh.ry) ** 2 <= 1;
  let ins = false;
  const p = sh.p;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) ins = !ins;
  }
  return ins;
}

/** Rasterise shapes on an N×N grid with 4-tone cylinder shading (h,a,m,s) and a 1px outline (o). */
function rasterize(shapes: Shape[], N = 16): string[] {
  const on: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = false;
    for (const sh of shapes) {
      if ((sh as { mark?: string }).mark) continue;
      if (inside(sh, x + 0.5, y + 0.5)) v = !sh.cut;
    }
    on[y][x] = v;
  }
  const g: string[][] = Array.from({ length: N + 2 }, () => Array(N + 2).fill('.'));
  for (let y = 0; y < N; y++) {
    const xs = on[y].map((v, x) => (v ? x : -1)).filter((x) => x >= 0);
    if (!xs.length) continue;
    const lo = xs[0], hi = xs[xs.length - 1];
    xs.forEach((x) => {
      const t = (x - lo + 0.5) / (hi - lo + 1);
      g[y + 1][x + 1] = t < 0.25 ? 'h' : t < 0.5 ? 'a' : t < 0.75 ? 'm' : 's';
    });
  }
  for (let y = 0; y < N + 2; y++) for (let x = 0; x < N + 2; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.' && g[y + dy][x + dx] !== 'o')) g[y][x] = 'o';
  }
  for (const sh of shapes) {
    if (!(sh as { mark?: string }).mark) continue;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(sh, x + 0.5, y + 0.5) && on[y][x]) g[y + 1][x + 1] = (sh as { mark: string }).mark;
  }
  return g.map((r) => r.join(''));
}

const rect = (x0: number, y0: number, x1: number, y1: number): Shape => ({ t: 'poly', p: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
const BASE: Shape[] = [rect(3, 13.2, 13, 15.6), { t: 'poly', p: [[4.2, 12], [11.8, 12], [12.2, 13.2], [3.8, 13.2]] }];
const SHAPES: Record<string, Shape[]> = {
  p: [{ t: 'circ', c: [8, 4.4], r: 2.7 }, { t: 'poly', p: [[6.6, 6.4], [9.4, 6.4], [10, 9], [6, 9]] }, rect(5.2, 8.6, 10.8, 9.8), { t: 'poly', p: [[6, 9.8], [10, 9.8], [11.6, 12], [4.4, 12]] }, ...BASE],
  r: [rect(4, 2.2, 12, 4.6), { t: 'poly', p: [[6.2, 2], [7.4, 2], [7.4, 3.4], [6.2, 3.4]], cut: true }, { t: 'poly', p: [[8.6, 2], [9.8, 2], [9.8, 3.4], [8.6, 3.4]], cut: true },
    rect(4.4, 4.6, 11.6, 5.8), { t: 'poly', p: [[5.4, 5.8], [10.6, 5.8], [11, 12], [5, 12]] }, ...BASE],
  b: [{ t: 'ell', c: [8, 5.4], rx: 2.6, ry: 3.6 }, { t: 'circ', c: [8, 1.7], r: 1 }, { t: 'poly', p: [[8.3, 3], [9.2, 3], [10, 5.6], [9.1, 5.6]], cut: true },
    rect(5.6, 8.6, 10.4, 9.7), { t: 'poly', p: [[6.2, 9.7], [9.8, 9.7], [11.4, 12], [4.6, 12]] }, ...BASE],
  q: [{ t: 'poly', p: [[4, 3.4], [5.6, 6.4], [6.6, 2.8], [8, 6.2], [9.4, 2.8], [10.4, 6.4], [12, 3.4], [11.2, 9], [4.8, 9]] },
    { t: 'circ', c: [4, 2.7], r: 0.9 }, { t: 'circ', c: [6.6, 2.1], r: 0.9 }, { t: 'circ', c: [9.4, 2.1], r: 0.9 }, { t: 'circ', c: [12, 2.7], r: 0.9 },
    rect(4.6, 8.6, 11.4, 9.8), { t: 'poly', p: [[5, 9.8], [11, 9.8], [11.8, 12], [4.2, 12]] }, ...BASE],
  k: [rect(7.2, 0.6, 8.8, 4.8), rect(5.8, 1.9, 10.2, 3.3), { t: 'ell', c: [8, 6.5], rx: 3.4, ry: 2.3 },
    rect(5, 8.4, 11, 9.6), { t: 'poly', p: [[5.4, 9.6], [10.6, 9.6], [11.8, 12], [4.2, 12]] }, ...BASE],
  n: [{ t: 'poly', p: [[3.6, 12.2], [4.6, 8.6], [5, 6.8], [3.8, 6.8], [2.2, 7.8], [1.6, 6.6], [3.8, 3.8], [5.2, 1.6], [6.6, 2.7], [8, 1.7], [10.4, 3.6], [12, 7.4], [12.4, 12.2]] },
    { t: 'circ', c: [5.8, 4.6], r: 0.55, mark: 'o' }, { t: 'circ', c: [2.5, 7.1], r: 0.45, mark: 'o' }, ...BASE],
};
const PIECE_ROWS: Record<string, string[]> = Object.fromEntries(Object.entries(SHAPES).map(([k, v]) => [k, rasterize(v)]));

export const SIDE = {
  w: { o: '#3a2410', h: '#ffffff', a: '#fff4d6', m: '#ecd9a8', s: '#c4a468' },
  b: { o: '#102a18', h: '#a6e86e', a: '#5fb356', m: '#3f8f4a', s: '#25643a' },
};
export const Piece = ({ side, type, px = 4 }: { side: 'w' | 'b'; type: string; px?: number }) => (
  <PixelArt rows={PIECE_ROWS[type]} palette={SIDE[side]} px={px} />
);

/* discs: radial-lit 14×14 */
function discRows(N: number, king: boolean): string[] {
  const g: string[][] = Array.from({ length: N + 2 }, () => Array(N + 2).fill('.'));
  const c = N / 2, R = N / 2 - 0.2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x + 0.5 - c) / R, dy = (y + 0.5 - c) / R, d = Math.hypot(dx, dy);
    if (d > 1) continue;
    const l = -(dx * 0.5 + dy * 0.6);
    let ch = l > 0.5 ? 'h' : l > 0.0 ? 'a' : l > -0.45 ? 'm' : 's';
    if (d > 0.58 && d < 0.7) ch = ch === 'h' ? 'a' : ch === 'a' ? 'm' : ch;
    g[y + 1][x + 1] = ch;
  }
  for (let y = 0; y < N + 2; y++) for (let x = 0; x < N + 2; x++) {
    if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.' && g[y + dy][x + dx] !== 'o')) g[y][x] = 'o';
  }
  if (king) {
    const crown = ['k.k.k', 'kkkkk', 'kkkkk'];
    const ox = Math.floor((N + 2 - 5) / 2), oy = Math.floor((N + 2 - 3) / 2);
    crown.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'k') g[oy + y][ox + x] = 'k'; }));
  }
  return g.map((r) => r.join(''));
}
const DISC = discRows(14, false), KING = discRows(14, true);
const CHECK_SIDE = {
  0: { o: '#3a1218', h: '#ff9aa8', a: '#e0556a', m: '#b83048', s: '#821e34', k: '#ffd84a' },
  1: { o: '#3a2410', h: '#ffffff', a: '#fff4d6', m: '#e8d49c', s: '#bfa062', k: '#c27a00' },
};
export const Disc = ({ side, king, px = 4 }: { side: 0 | 1; king?: boolean; px?: number }) => (
  <PixelArt rows={king ? KING : DISC} palette={CHECK_SIDE[side]} px={px} />
);
export const ConnectDisc = ({ px = 4, side = 1 as 0 | 1 }: { px?: number; side?: 0 | 1 }) => (
  <PixelArt rows={DISC} palette={side === 1 ? { o: '#3a2410', h: '#fff2a0', a: '#ffd54a', m: '#e9a91c', s: '#b87a08' } : CHECK_SIDE[0]} px={px} />
);

/* small hand-drawn icons */
const DIE = ['oooooooooo', 'ohhhhhhhso', 'ohkhhhhkso', 'ohhhhhhhso', 'ohhhkkhhso', 'ohhhkkhhso', 'ohhhhhhhso', 'ohkhhhhkso', 'osssssssso', 'oooooooooo'];
export const DieArt = ({ px = 6 }: { px?: number }) => (
  <PixelArt rows={DIE} palette={{ o: '#3a2410', h: '#fff4d6', s: '#d4b87c', k: '#4a2a10' }} px={px} />
);
const FLAG = ['..o.........', '..ooo.......', '..oggoo.....', '..ogggggo...', '..oggoo.....', '..ooo.......', '..o.........', '..o.........', '..o.........', '.ooo........', 'ooooo.......', '............'];
export const FlagArt = ({ px = 5, fill = '#6fbf4a' }: { px?: number; fill?: string }) => (
  <PixelArt rows={FLAG} palette={{ o: '#3a2410', g: fill }} px={px} />
);
const LEAF = ['...ll..', '..llll.', '.lllll.', 'llllll.', '.lllbl.', '..lbl..', '..b....'];
export const Leaf = ({ color, px = 2 }: { color: string; px?: number }) => (
  <PixelArt rows={LEAF} palette={{ l: color, b: '#5b3716' }} px={px} />
);
const TRI = ['.........', '.ooooooo.', '.ohhhhhso', '..ohhhso.', '...ohso..', '....oo...'];
export const BoardIcon = ({ px = 6 }: { px?: number }) => (
  <PixelArt rows={TRI.concat(TRI.slice().reverse())} palette={{ o: '#3a2410', h: '#e0556a', s: '#b83048' }} px={px} />
);

/* ================= landscape (canvas → image) ================= */
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Pal = { l: string; g: string; G: string; b: string; B: string };
export const PALS: Record<string, Pal> = {
  far: { l: '#c4e3d0', g: '#a4d0b6', G: '#86b79c', b: '#8aa595', B: '#6f8b7c' },
  mid: { l: '#a4de68', g: '#58a64e', G: '#33763f', b: '#8a5a2e', B: '#5b3716' },
  fall: { l: '#ffdc7a', g: '#ee9d3e', G: '#bd5a2c', b: '#8a5a2e', B: '#5b3716' },
  near: { l: '#b5ee72', g: '#4a9b4a', G: '#27693c', b: '#8a5a2e', B: '#5b3716' },
};
/** Draws a tiered pine; returns nothing, paints directly. (x = centre, base = ground y) */
export function pine(ctx: CanvasRenderingContext2D, rand: () => number, x: number, base: number, H: number, pal: Pal) {
  const trunk = Math.max(2, Math.round(H * 0.14)), crown = H - trunk, tiers = H > 40 ? 5 : 4;
  const halfMax = H * 0.3;
  ctx.fillStyle = pal.B; ctx.fillRect(Math.round(x - 1), base - trunk, 3, trunk);
  ctx.fillStyle = pal.b; ctx.fillRect(Math.round(x - 1), base - trunk, 1, trunk);
  for (let y = 0; y < crown; y++) {
    const t = y / crown, tier = Math.floor(t * tiers), p = (t * tiers) % 1;
    const half = Math.max(0.8, halfMax * (0.45 + 0.55 * (tier + 1) / tiers) * (0.25 + 0.75 * p));
    const x0 = Math.round(x - half), x1 = Math.round(x + half);
    for (let px = x0; px <= x1; px++) {
      const u = (px - x) / half;
      let col = u < -0.35 ? pal.l : u > 0.35 ? pal.G : pal.g;
      if (p < 0.1 && tier > 0) col = pal.G;
      else if (rand() < 0.1) col = col === pal.g ? pal.l : col === pal.G ? pal.g : col;
      ctx.fillStyle = col; ctx.fillRect(px, base - trunk - crown + y, 1, 1);
    }
  }
}
/* ================= card back: forest at dusk (canvas → image) ================= */
let CARD_BACK = '';
function makeCardBack(): string {
  const W = 50, H = 70;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const r = rng(77);
  const R = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  R(0, 0, W, H, '#3a2410'); R(1, 1, W - 2, H - 2, '#f6dca0'); R(2, 2, W - 4, H - 4, '#c98f3c'); R(3, 3, W - 6, H - 6, '#3a2410');
  const sx = 4, sy = 4, sw = W - 8, sh = H - 8;
  ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  const bands = ['#121a44', '#19235a', '#242d6e', '#383a80', '#554689', '#7a4f8d', '#a65b88', '#d2707a', '#f19068', '#ffbc78'];
  const skyH = Math.round(sh * 0.7);
  for (let y = 0; y < skyH; y++) R(sx, sy + y, sw, 1, bands[Math.min(bands.length - 1, Math.floor((y / skyH) * bands.length))]);
  for (let i = 0; i < 22; i++) { const x = sx + r() * sw, y = sy + r() * skyH * 0.55; R(x, y, 1, 1, r() < 0.3 ? '#ffffff' : '#c9d4ff'); }
  // moon
  const mx = sx + sw - 12, my = sy + 12;
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
    const d = x * x + y * y;
    if (d <= 30 && (x - 2) ** 2 + (y - 1) ** 2 > 22) R(mx + x, my + y, 1, 1, d < 16 ? '#fffbe0' : '#f4e7a8');
    else if (d <= 56 && d > 30) R(mx + x, my + y, 1, 1, '#ffffff12');
  }
  // far hills
  for (let x = 0; x < sw; x++) { const h = Math.round(sh * 0.72 - 6 * (0.5 + 0.5 * Math.sin(x / 7)) - 3 * Math.sin(x / 3)); R(sx + x, sy + h, 1, sh, '#3a3f78'); }
  const far: Pal = { l: '#5f6fa8', g: '#4a5a92', G: '#384675', b: '#2a3358', B: '#1e2544' };
  const mid: Pal = { l: '#3e8a6a', g: '#2c6b55', G: '#1e4a3d', b: '#4a3a2a', B: '#2e2218' };
  const near: Pal = { l: '#2a7a52', g: '#1b5a3f', G: '#103a2a', b: '#3a2c1e', B: '#241a10' };
  for (let i = 0; i < 6; i++) pine(ctx, r, sx + 3 + i * 8 + r() * 3, sy + sh * 0.76, 14 + r() * 5, far);
  R(sx, sy + sh * 0.76, sw, sh, '#233a4a');
  for (let i = 0; i < 5; i++) pine(ctx, r, sx + 2 + i * 10 + r() * 4, sy + sh * 0.86, 22 + r() * 6, mid);
  R(sx, sy + sh * 0.86, sw, sh, '#173a2c'); R(sx, sy + sh * 0.86, sw, 1, '#2d6a48');
  pine(ctx, r, sx + 6, sy + sh * 0.98, 40, near); pine(ctx, r, sx + sw - 7, sy + sh * 0.98, 36, near);
  R(sx, sy + sh * 0.93, sw, sh, '#10281e');
  // mushrooms + fireflies
  [[16, 0.92], [30, 0.95], [24, 0.97]].forEach(([x, y]) => { const px = sx + x, py = sy + sh * y; R(px - 2, py, 5, 2, '#e0475a'); R(px - 1, py - 1, 3, 1, '#e0475a'); R(px, py, 1, 1, '#fff4d6'); R(px, py + 2, 1, 2, '#f1dfb0'); });
  for (let i = 0; i < 9; i++) { const x = sx + r() * sw, y = sy + sh * (0.55 + r() * 0.35); R(x, y, 1, 1, '#fff7a0'); R(x - 1, y, 3, 1, '#fff7a044'); }
  ctx.restore();
  // gold corner studs
  [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]].forEach(([x, y]) => R(x, y, 1, 1, '#fff0a0'));
  return cv.toDataURL('image/png');
}
export function CardBack() {
  const url = useMemo(() => (CARD_BACK ||= makeCardBack()), []);
  return <span className="cardart" style={{ backgroundImage: `url(${url})` }} aria-hidden />;
}

function makeLandscape(): string {
  const W = 448, H = 168, GY = 138;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const r = rng(11);
  const R = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const ridge = (seed: number, base: number, amp: number, col: string, hi: string) => {
    for (let x = 0; x < W; x += 2) {
      const h = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x / 47 + seed)) - amp * 0.35 * Math.sin(x / 19 + seed * 2) - r() * 1.2);
      R(x, h, 2, GY - h, col); R(x, h, 2, 1, hi);
    }
  };
  ridge(3, 82, 30, '#a9cfc0', '#c9e6d6');
  for (let i = 0; i < 52; i++) pine(ctx, r, i * 8.8 + r() * 5, 122, 18 + r() * 8, PALS.far);
  ridge(11, 98, 22, '#7fb996', '#a0d1ae');
  for (let i = 0; i < 34; i++) pine(ctx, r, i * 13.4 + r() * 6, 134, 28 + r() * 10, r() < 0.16 ? PALS.fall : PALS.mid);
  ridge(19, 118, 10, '#58a064', '#7cc070');
  // ground
  R(0, GY, W, 2, '#9bdc62'); R(0, GY + 2, W, 5, '#74c04a'); R(0, GY + 7, W, 9, '#58a640'); R(0, GY + 16, W, H - GY - 16, '#3f8a34');
  for (let i = 0; i < 260; i++) { const x = r() * W, y = GY + 3 + r() * (H - GY - 4); R(x, y, 1, 1, r() < 0.5 ? '#86d150' : '#357a2c'); }
  // pond
  const pcx = 316, pcy = 152, prx = 46, pry = 8;
  for (let y = pcy - pry; y <= pcy + pry; y++) {
    const half = Math.round(prx * Math.sqrt(1 - ((y - pcy) / pry) ** 2));
    const col = y < pcy - 3 ? '#9adcf0' : y < pcy + 2 ? '#62b8e0' : '#3f94c8';
    R(pcx - half - 1, y, half * 2 + 2, 1, '#2d6f9a'); R(pcx - half, y, half * 2, 1, col);
  }
  for (let i = 0; i < 12; i++) R(pcx - 34 + r() * 68, pcy - 6 + r() * 11, 2, 1, '#e8f8ff');
  [[-18, 2], [8, 4], [24, -2]].forEach(([dx, dy]) => { R(pcx + dx, pcy + dy, 5, 2, '#4aa84a'); R(pcx + dx + 1, pcy + dy, 1, 1, '#ff9ec0'); });
  // fence
  for (let x = 120; x < 200; x += 13) {
    R(x, 148, 4, 15, '#7a4a22'); R(x, 148, 1, 15, '#b9813f'); R(x, 147, 4, 1, '#b9813f');
  }
  R(120, 151, 80, 2, '#9c6a38'); R(120, 151, 80, 1, '#c28a4c'); R(120, 157, 80, 2, '#9c6a38'); R(120, 157, 80, 1, '#c28a4c');
  // bushes with berries
  const bush = (bx: number, by: number, rr: number) => {
    for (let y = -rr; y <= rr; y++) for (let x = -rr * 1.4; x <= rr * 1.4; x++) {
      const d = Math.hypot(x / 1.4, y);
      if (d > rr) continue;
      const l = -(x * 0.3 + y * 0.6) / rr;
      R(bx + x, by + y, 1, 1, l > 0.35 ? '#7fd05a' : l > -0.15 ? '#4a9a46' : '#2f7438');
    }
    for (let i = 0; i < rr / 2; i++) R(bx - rr + r() * rr * 2, by - rr / 2 + r() * rr, 1, 1, '#e0405a');
  };
  [[40, 142, 7], [92, 146, 6], [236, 143, 7], [262, 146, 5], [372, 145, 8], [420, 143, 6]].forEach(([x, y, rr]) => bush(x, y, rr));
  // flowers and tufts
  const cols = ['#ff7aa8', '#fff4d6', '#ffd54a', '#b394ff'];
  for (let i = 0; i < 170; i++) {
    const x = Math.floor(r() * W), y = GY + 6 + Math.floor(r() * (H - GY - 8));
    if (x > pcx - prx - 3 && x < pcx + prx + 3 && y > pcy - pry - 2) continue;
    R(x, y + 1, 1, 2, '#2d7a3a'); R(x, y, 1, 1, cols[i % 4]);
    if (i % 3 === 0) { R(x - 1, y, 1, 1, cols[i % 4]); R(x + 1, y, 1, 1, cols[i % 4]); R(x, y - 1, 1, 1, cols[i % 4]); R(x, y, 1, 1, '#ffd54a'); }
  }
  for (let i = 0; i < 90; i++) { const x = r() * W, y = GY + 4 + r() * (H - GY - 6); R(x, y, 1, 3, '#2d6e2d'); R(x + 1, y + 1, 1, 2, '#3b8a35'); R(x - 1, y + 1, 1, 2, '#3b8a35'); }
  // mushrooms
  [[205, 160], [212, 162], [60, 158]].forEach(([x, y]) => { R(x - 2, y, 5, 2, '#d4475a'); R(x - 1, y - 1, 3, 1, '#d4475a'); R(x, y, 1, 1, '#fff4d6'); R(x, y + 2, 1, 2, '#f1dfb0'); });
  // framing trees
  [[18, 176, 100, 'near'], [66, 170, 70, 'fall'], [404, 176, 96, 'near'], [440, 172, 76, 'mid'], [372, 170, 60, 'fall']].forEach(([x, y, h, p]) => pine(ctx, r, x as number, y as number, h as number, PALS[p as string]));
  return cv.toDataURL('image/png');
}

/* ================= sky ================= */
const CLOUD = ['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'ssssssssssss'];
function Cloud({ x, y, dur, delay, night }: { x: number; y: number; dur: number; delay: number; night: boolean }) {
  const pal = night ? { w: '#4b5a86', s: '#38466f' } : { w: '#ffffff', s: '#cfe3f2' };
  return (
    <g className="cloud" style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
      <g transform={`translate(${x} ${y}) scale(1.3)`}>
        {CLOUD.flatMap((row, cy) => [...row].map((ch, cx) => (ch === '.' ? null : <rect key={`${cx},${cy}`} x={cx} y={cy} width="1" height="1" fill={pal[ch as 'w' | 's']} />)))}
      </g>
    </g>
  );
}
const STARS = (() => { const r = rng(5); return Array.from({ length: 46 }, () => [r() * 384, r() * 70, r() < 0.2 ? 2 : 1, r() * 4] as const); })();

export function Sky({ time }: { time: Resolved }) {
  const body: ReactElement[] = [];
  if (time === 'night') {
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
      const d = x * x + y * y, d2 = (x - 4) ** 2 + (y - 2) ** 2;
      if (d <= 64 && d2 > 52) body.push(<rect key={`${x},${y}`} x={310 + x} y={26 + y} width="1" height="1" fill={d <= 30 ? '#fff8dc' : '#f0e6b8'} />);
    }
  } else {
    const [cx, cy] = time === 'dusk' ? [262, 104] : [326, 30];
    const core = time === 'dusk' ? '#ffb347' : '#fff0a0', edge = time === 'dusk' ? '#ff7a3a' : '#ffd84a';
    for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) {
      const d = x * x + y * y;
      if (d <= 100) body.push(<rect key={`${x},${y}`} x={cx + x} y={cy + y} width="1" height="1" fill={d <= 56 ? core : edge} />);
      else if (d <= 196) body.push(<rect key={`${x},${y}`} x={cx + x} y={cy + y} width="1" height="1" fill={time === 'dusk' ? '#ffb34722' : '#fff0a022'} />);
    }
  }
  return (
    <svg className="sky" viewBox="0 0 384 120" preserveAspectRatio="xMidYMin slice" shapeRendering="crispEdges" aria-hidden>
      {time === 'night' && STARS.map(([x, y, s, d], i) => <rect key={i} className="star" x={x} y={y} width={s} height={s} fill="#fff8dc" style={{ animationDelay: `-${d}s` }} />)}
      {body}
      {[[24, 20, 70, 0], [150, 46, 90, 22], [236, 8, 80, 12], [96, 6, 64, 40]].map(([x, y, dur, delay], i) => <Cloud key={i} x={x} y={y} dur={dur} delay={delay} night={time === 'night'} />)}
    </svg>
  );
}


/* ================= farm critters (a separate layer over the grass; the landscape itself is untouched) ================= */
type Sprite = { rows: string[]; pal: Record<string, string> };
const SPRITES: Record<string, Sprite> = {
  cow: { pal: { w: '#fff4d6', k: '#3a3a44', p: '#f2a0a8', h: '#e8d8a0' }, rows: [
    '...........h.h.', '.wwwwkkwwwwwwww', '.wkkwwkkwwwwwkw', '.wkkwwwwwwwwwww', '.wwwwwwwwwwwppp',
    '.wwwwkkwwwwwppp', '.wwwwwwwww.....', '..w.w.....w.w..', '..k.k.....k.k..'] },
  sheep: { pal: { c: '#f6f1e4', d: '#5a463a', k: '#1f1710' }, rows: [
    '..cccccc......', '.cccccccc.dd..', 'cccccccccdddd.', 'cccccccccdkdd.', 'cccccccccc.dd.',
    '.cccccccccc...', '..d.d...d.d...', '..d.d...d.d...'] },
  pig: { pal: { p: '#f4a8b8', q: '#d97a92', k: '#3a2410' }, rows: [
    '...........p.p', '.pppppppppppp.', 'ppppppppppppkp', '.pppppppppppqq', '.pppppppppppqq',
    '..pppppppppp..', '..p.p....p.p..', '..q.q....q.q..'] },
  hen: { pal: { w: '#fff4d6', r: '#d4475a', y: '#f2b632', k: '#3a2410' }, rows: [
    '.....rr..', '....wkwy.', 'w..wwwww.', '.wwwwwww.', '..wwwww..', '...y.y...'] },
  farmer: { pal: { y: '#e8c060', Y: '#c9973a', s: '#f1c49a', k: '#3a2410', r: '#c8423f', b: '#3a6fb0', n: '#6a4020', g: '#9c6a38', m: '#b8bcc4' }, rows: [
    '...yyyy....m', '..yyyyyy...m', '.YYYYYYYY..g', '...ssss....g', '...skks....g', '...ssss....g', '..rrrrrr...g',
    '.srrbbrrss.g', '..rbbbbr...g', '..bbbbbb...g', '..bbbbbb...g', '..bb..bb...g', '..bb..bb...g', '..nn..nn...g', '.nnn..nnn..g'] },
};
/** pixel rows -> data URL with an automatic dark outline so each critter reads at a glance */
function spriteUrl({ rows, pal }: Sprite) {
  const w = rows[0].length, h = rows.length, cv = document.createElement('canvas');
  cv.width = w + 2; cv.height = h + 2;
  const ctx = cv.getContext('2d')!;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.';
  ctx.fillStyle = '#2f2418';
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++)
    if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) ctx.fillRect(x + 1, y + 1, 1, 1);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { ctx.fillStyle = pal[ch]; ctx.fillRect(x + 1, y + 1, 1, 1); } }));
  return { url: cv.toDataURL('image/png'), w: w + 2 };
}
/* [kind, left %, bottom % of the landscape box, walk distance px, seconds] - kept off the pond (x 60-80%) */
const CRITTERS: [string, number, number, number, number][] = [
  ['cow', 6, 9, 46, 38], ['sheep', 15, 4, 40, 30], ['hen', 24, 11, 22, 14], ['farmer', 30, 5, 0, 0],
  ['pig', 84, 7, 36, 34], ['hen', 91, 3, 18, 12], ['sheep', 95, 10, 30, 36], ['cow', 50, 2, 50, 44], ['hen', 43, 9, 20, 16],
];
function Critters() {
  const urls = useMemo(() => Object.fromEntries(Object.entries(SPRITES).map(([k, v]) => [k, spriteUrl(v)])), []);
  return (
    <div className="farm">
      {CRITTERS.map(([kind, left, bottom, dist, dur], i) => {
        const { url, w } = urls[kind];
        return (
          <div key={i} className={`critter ${kind}`} style={{ left: `${left}%`, bottom: `${bottom}%`, ['--walk' as string]: `${dist}px`, ['--dur' as string]: `${dur}s`, animationDelay: `-${(i * 7) % dur || 1}s` }}>
            <img className="cr-in" src={url} alt="" style={{ width: `calc(var(--k) * ${w})`, animationDelay: `-${(i * 7) % dur || 1}s` }} />
          </div>
        );
      })}
    </div>
  );
}

export function Scenery() {
  const { resolved } = useTime();
  const url = useMemo(makeLandscape, []);
  useEffect(() => { document.documentElement.dataset.time = resolved; }, [resolved]); // the page colour behind the scenery follows the sky
  return (
    <div className="scenery" data-time={resolved} aria-hidden>
      <Sky time={resolved} />
      <div className="landscape" style={{ backgroundImage: `url(${url})` }} />
      <Critters />
      <div className="tint" />
      {Array.from({ length: 7 }, (_, i) => <i key={`l${i}`} className={`leaf l${i}`} />)}
      {Array.from({ length: 14 }, (_, i) => <i key={`f${i}`} className={`firefly f${i}`} />)}
    </div>
  );
}

/* tree icon for the menu */
export function TreeIcon({ h = 34, px = 3 }: { h?: number; px?: number }) {
  const url = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = h; cv.height = h;
    const ctx = cv.getContext('2d')!;
    pine(ctx, rng(h), h / 2, h, h, PALS.mid);
    return cv.toDataURL('image/png');
  }, [h]);
  return <img src={url} width={h * px} height={h * px} alt="" style={{ imageRendering: 'pixelated' }} />;
}

/* domino icon (15×9) */
function dominoRows(): string[] {
  const g: string[][] = Array.from({ length: 9 }, (_, y) => Array.from({ length: 15 }, (_, x) => (y === 0 || y === 8 || x === 0 || x === 14 || x === 7 ? 'o' : y === 7 ? 's' : 'h')));
  [[2, 2], [5, 5], [9, 2], [12, 2], [9, 5], [12, 5]].forEach(([x, y]) => { g[y][x] = 'k'; });
  return g.map((r) => r.join(''));
}
const DOMINO = dominoRows();
export const DominoArt = ({ px = 5 }: { px?: number }) => (
  <PixelArt rows={DOMINO} palette={{ o: '#3a2410', h: '#fff4d6', s: '#d4b87c', k: '#4a2a10' }} px={px} />
);

/* ================= cute boats (SVG, 10 units per cell) ================= */
export const BOAT_COLORS: Record<number, { hull: string; dark: string; flag: string }> = {
  0: { hull: '#ff9fb8', dark: '#e0708f', flag: '#fff4d6' },
  1: { hull: '#ffd76b', dark: '#e0a93a', flag: '#ff6b8a' },
  2: { hull: '#8fdca9', dark: '#55b27a', flag: '#fff4d6' },
  3: { hull: '#9fd2ff', dark: '#5fa6e6', flag: '#ffd76b' },
  4: { hull: '#c8aaff', dark: '#9a78e0', flag: '#fff4d6' },
};
/** A smiling little pixel boat that spans `len` cells. */
export function Boat({ len, id, sunk, vert }: { len: number; id: number; sunk?: boolean; vert?: boolean }) {
  const W = len * 10, col = BOAT_COLORS[id] ?? BOAT_COLORS[0];
  const O = '#3a2410', DECK = '#fff4d6', WIN = '#8fd0ff';
  const R = (x: number, y: number, w: number, h: number, f: string, k: string) => <rect key={k} x={x} y={y} width={w} height={h} fill={f} />;
  const out: ReactElement[] = [];
  const rows: [number, number][] = [[1, W - 1], [1, W - 1], [2, W - 2], [3, W - 3]];
  // outline + hull fill (rows y=6..9)
  rows.forEach(([a, b], i) => { const y = 6 + i; out.push(R(a - 1, y, 1, 1, O, `ol${y}`), R(b, y, 1, 1, O, `or${y}`), R(a, y, b - a, 1, i === 1 ? col.dark : col.hull, `h${y}`)); });
  out.push(R(3, 10, W - 6, 1, O, 'bot'), R(2, 9, 1, 1, O, 'cl'), R(W - 3, 9, 1, 1, O, 'cr'));
  // deck rail
  out.push(R(0, 5, W, 1, O, 'rail'), R(1, 5, W - 2, 1, DECK, 'deck'));
  // cabins
  const cabins = len === 2 ? [0] : len === 3 ? [1] : len === 4 ? [1, 2] : [1, 2, 3];
  cabins.forEach((k) => out.push(R(10 * k + 2, 2, 6, 3, O, `cabo${k}`), R(10 * k + 3, 2, 4, 3, DECK, `cab${k}`), R(10 * k + 4, 3, 2, 1, WIN, `win${k}`)));
  // flag pole at the stern
  out.push(R(2, 0, 1, 5, O, 'pole'), R(3, 0, 3, 2, col.flag, 'flag'), R(3, 0, 3, 1, O, 'flagtop'));
  // cute face on the hull, centred on the middle cell
  const cx = 10 * Math.floor((len - 1) / 2) + 5;
  out.push(R(cx - 2, 7, 1, 1, sunk ? '#7a5a3a' : O, 'eyeL'), R(cx + 1, 7, 1, 1, sunk ? '#7a5a3a' : O, 'eyeR'));
  out.push(R(cx - 3, 8, 1, 1, '#ff7a9a', 'blushL'), R(cx + 2, 8, 1, 1, '#ff7a9a', 'blushR'));
  if (sunk) out.push(R(cx - 1, 9, 2, 1, O, 'frown'));
  else out.push(R(cx - 1, 8, 2, 1, O, 'smile'));
  return (
    <svg className="boat" viewBox={vert ? `0 0 11 ${W}` : `0 0 ${W} 11`} shapeRendering="crispEdges" preserveAspectRatio="none" aria-hidden>
      {vert ? <g transform="translate(11 0) rotate(90)">{out}</g> : out}
    </svg>
  );
}
export const BoatIcon = ({ h = 40 }: { h?: number }) => (
  <span style={{ display: 'inline-block', width: h * 3.2, height: h, filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.25))' }}><Boat len={3} id={0} /></span>
);

/* ================= pond critters ================= */
const DUCK = ['...oooo.....', '..ohhyyo....', '..oyykyyoo..', '..oyyyyyBBo.', 'ooyyyyyyoo..', 'oyyyyyyyyo..', '.oyyyyyyyo..', '..ooooooo...'];
export const DuckArt = ({ px = 3 }: { px?: number }) => (
  <PixelArt rows={DUCK} palette={{ o: '#3a2410', y: '#ffd84a', h: '#fff4a8', k: '#3a2410', B: '#ff8a3d' }} px={px} />
);
const FISH = ['..ooo....', '.offfoo.o', 'offkfffoo', '.offfoo.o', '..ooo....'];
export const FishArt = ({ px = 3 }: { px?: number }) => (
  <PixelArt rows={FISH} palette={{ o: '#7a3a2a', f: '#ff9a5a', k: '#3a2410' }} px={px} />
);
