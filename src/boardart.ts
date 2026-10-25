import { PALS, pine, rng } from './art';

/**
 * A pixel-art meadow for the race boards (canvas -> data URL, drawn once). `cell` px per board cell.
 * `path` cells get a worn dirt track under them; free cells (not in `used`) get flowers, mushrooms, rocks and pines.
 */
export function makeBoardTexture(n: number, cell: number, used: Set<string>, path: Set<string>, seed: number, pond?: { r: number; c: number; rad: number }, overlay?: (ctx: CanvasRenderingContext2D, rand: () => number) => void): string {
  const S = n * cell, cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d')!, r = rng(seed);
  const R = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const key = (a: number, b: number) => `${a},${b}`;
  // meadow
  R(0, 0, S, S, '#5aa844');
  for (let i = 0; i < S * S * 0.22; i++) R(r() * S, r() * S, 1, 1, r() < 0.55 ? '#68b64f' : '#4c9a3c');
  for (let i = 0; i < n * n * 0.7; i++) { const x = r() * S, y = r() * S, w = 4 + r() * 8; R(x, y, w, 2, '#6cba52'); R(x + 1, y + 2, w - 2, 1, '#4f9b3d'); }
  // dirt track under the ring
  path.forEach((k) => {
    const [pr, pc] = k.split(',').map(Number), x = pc * cell, y = pr * cell;
    R(x, y, cell, cell, '#dcc08a');
    for (let i = 0; i < cell * 2; i++) R(x + r() * cell, y + r() * cell, 1, 1, r() < 0.5 ? '#c9a870' : '#ecd5a4');
    if (!path.has(key(pr - 1, pc))) R(x, y, cell, 1, '#a07a45');
    if (!path.has(key(pr + 1, pc))) R(x, y + cell - 1, cell, 1, '#a07a45');
    if (!path.has(key(pr, pc - 1))) R(x, y, 1, cell, '#a07a45');
    if (!path.has(key(pr, pc + 1))) R(x + cell - 1, y, 1, cell, '#a07a45');
  });
  // pond
  if (pond) {
    const cx = (pond.c + 0.5) * cell, cy = (pond.r + 0.5) * cell, rx = pond.rad * cell, ry = pond.rad * cell * 0.82;
    for (let y = -ry - 2; y <= ry + 2; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
      if (half <= 0) continue;
      R(cx - half - 1, cy + y, half * 2 + 2, 1, '#2d6f9a');
      R(cx - half, cy + y, half * 2, 1, y < -ry * 0.35 ? '#9adcf0' : y < ry * 0.3 ? '#62b8e0' : '#3f94c8');
    }
    for (let i = 0; i < 16; i++) R(cx - rx * 0.7 + r() * rx * 1.4, cy - ry * 0.6 + r() * ry * 1.2, 3, 1, '#e8f8ff');
    [[-0.45, 0.3], [0.3, -0.35], [0.5, 0.35]].forEach(([dx, dy]) => { R(cx + dx * rx, cy + dy * ry, 6, 3, '#4aa84a'); R(cx + dx * rx + 1, cy + dy * ry, 1, 1, '#ff9ec0'); });
  }
  const inPond = (a: number, b: number) => !!pond && Math.hypot(b - pond.c, a - pond.r) <= pond.rad + 0.6;
  const free = (a: number, b: number) => a >= 0 && b >= 0 && a < n && b < n && !used.has(key(a, b)) && !path.has(key(a, b)) && !inPond(a, b);
  // decorations
  const flowers = ['#ff7aa8', '#fff4d6', '#ffd54a', '#b394ff'];
  const trees: [number, number, number][] = [];
  const claimed = new Set<string>();
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (!free(a, b) || claimed.has(key(a, b))) continue;
    const x = b * cell, y = a * cell, roll = r();
    if (roll < 0.16 && free(a + 1, b) && free(a, b + 1) && free(a + 1, b + 1) && !claimed.has(key(a + 1, b)) && !claimed.has(key(a, b + 1))) {
      [key(a, b), key(a + 1, b), key(a, b + 1), key(a + 1, b + 1)].forEach((k) => claimed.add(k));
      trees.push([x + cell, y + cell * 2 - 1, cell * 1.9 + r() * cell * 0.4]);
    } else if (roll < 0.42) {
      for (let i = 0; i < 4; i++) { const fx = x + 2 + r() * (cell - 4), fy = y + 3 + r() * (cell - 5), col = flowers[Math.floor(r() * 4)]; R(fx, fy + 1, 1, 2, '#2d7a3a'); R(fx, fy, 1, 1, col); if (r() < 0.5) { R(fx - 1, fy, 1, 1, col); R(fx + 1, fy, 1, 1, col); R(fx, fy - 1, 1, 1, col); R(fx, fy, 1, 1, '#ffd54a'); } }
    } else if (roll < 0.5) {
      const mx = x + 3 + r() * (cell - 8), my = y + 4 + r() * (cell - 9);
      R(mx - 2, my, 5, 2, '#d4475a'); R(mx - 1, my - 1, 3, 1, '#d4475a'); R(mx, my, 1, 1, '#fff4d6'); R(mx - 1, my + 2, 3, 2, '#f1dfb0');
    } else if (roll < 0.58) {
      const sx = x + 3 + r() * (cell - 8), sy = y + 4 + r() * (cell - 8);
      R(sx, sy, 5, 3, '#8a8f98'); R(sx + 1, sy - 1, 3, 1, '#a9aeb7'); R(sx, sy + 2, 5, 1, '#6a6f78'); R(sx + 1, sy, 1, 1, '#c9ced6');
    } else if (roll < 0.8) {
      for (let i = 0; i < 3; i++) { const tx = x + 2 + r() * (cell - 4), ty = y + 3 + r() * (cell - 6); R(tx, ty, 1, 3, '#2d6e2d'); R(tx + 1, ty + 1, 1, 2, '#3b8a35'); R(tx - 1, ty + 1, 1, 2, '#3b8a35'); }
    }
  }
  trees.sort((p, q) => p[1] - q[1]).forEach(([x, base, h]) => {
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(Math.round(x - h * 0.28), base - 1, Math.round(h * 0.56), 2);
    pine(ctx, r, x, base, Math.round(h), PALS[r() < 0.3 ? 'fall' : 'near']);
  });
  overlay?.(ctx, r);
  return cv.toDataURL('image/png');
}

/* ---------- hand-drawn game parts (stumps, nests, logs, cobbles, ramps, flower beds, crates) ---------- */
type RC = [number, number];
const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const disc = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number, col: string) => {
  ctx.fillStyle = col;
  for (let y = -Math.ceil(rad); y <= Math.ceil(rad); y++) for (let x = -Math.ceil(rad); x <= Math.ceil(rad); x++) if (x * x + y * y <= rad * rad) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
};
const circle = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number, col: string) => {
  ctx.fillStyle = col;
  for (let a = 0; a < 360; a += 4) ctx.fillRect(Math.round(cx + Math.cos((a * Math.PI) / 180) * rad), Math.round(cy + Math.sin((a * Math.PI) / 180) * rad), 1, 1);
};
const mid = (c: RC, cell: number) => [(c[1] + 0.5) * cell, (c[0] + 0.5) * cell] as const;
export type Tone = { main: string; light: string; dark: string };

function stump(ctx: CanvasRenderingContext2D, cell: number, c: RC, tone?: Tone) {
  const [cx, cy] = mid(c, cell), R = cell * 0.44;
  disc(ctx, cx + 1, cy + 2, R, 'rgba(0,0,0,.3)');
  disc(ctx, cx, cy, R, tone ? tone.dark : '#6a3f18');
  disc(ctx, cx, cy, R - 1.2, tone ? tone.main : '#a8743a');
  disc(ctx, cx, cy, R - 2.4, '#d5a566');
  circle(ctx, cx, cy, R * 0.62, '#b9843f'); circle(ctx, cx, cy, R * 0.34, '#b9843f');
  disc(ctx, cx, cy, 1.1, '#8a5a2e');
  for (let a = 200; a < 290; a += 5) px(ctx, cx + Math.cos((a * Math.PI) / 180) * (R - 2.6), cy + Math.sin((a * Math.PI) / 180) * (R - 2.6), 1, 1, '#f4dca6');
  if (tone) { circle(ctx, cx, cy, R + 0.6, '#fff8'); px(ctx, cx + R * 0.25, cy - R - 3, 1, 5, '#4a2a10'); px(ctx, cx + R * 0.25 + 1, cy - R - 3, 4, 3, tone.main); px(ctx, cx + R * 0.25 + 1, cy - R - 3, 4, 1, tone.light); }
}
function nest(ctx: CanvasRenderingContext2D, cell: number, c: RC, tone: Tone, rand: () => number) {
  const [cx, cy] = mid(c, cell), R = cell * 0.44;
  disc(ctx, cx + 1, cy + 2, R, 'rgba(0,0,0,.28)');
  disc(ctx, cx, cy, R, tone.dark); disc(ctx, cx, cy, R - 1.2, tone.main);
  disc(ctx, cx, cy, R - 2.8, '#6a4220'); disc(ctx, cx, cy + 1, R - 4, '#4a2a10');
  for (let i = 0; i < 14; i++) { const a = rand() * 6.28, d = R - 2 + rand() * 0.6; px(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2, 1, rand() < 0.5 ? '#e8c88a' : '#c9a35e'); }
}
function dashed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  for (let i = 0; i < w; i += 4) { px(ctx, x + i, y, 2, 1, col); px(ctx, x + i, y + h - 1, 2, 1, col); }
  for (let j = 0; j < h; j += 4) { px(ctx, x, y + j, 1, 2, col); px(ctx, x + w - 1, y + j, 1, 2, col); }
}
function box(cells: RC[], cell: number) {
  const rs = cells.map((c) => c[0]), cs = cells.map((c) => c[1]);
  return { x: Math.min(...cs) * cell, y: Math.min(...rs) * cell, w: (Math.max(...cs) - Math.min(...cs) + 1) * cell, h: (Math.max(...rs) - Math.min(...rs) + 1) * cell };
}
function log(ctx: CanvasRenderingContext2D, cell: number, cells: RC[], tone: Tone, holes: boolean, rand: () => number) {
  const b = box(cells, cell), x = b.x + 1, y = b.y + 1, w = b.w - 2, h = b.h - 2;
  px(ctx, x + 1, y + 3, w, h, 'rgba(0,0,0,.3)');
  px(ctx, x, y, w, h, '#4a2a10'); px(ctx, x + 1, y + 1, w - 2, h - 2, '#9a6a34');
  for (let yy = y + 3; yy < y + h - 2; yy += 3) px(ctx, x + 2, yy, w - 4, 1, '#84582b');
  for (let i = 0; i < w * h * 0.04; i++) px(ctx, x + 2 + rand() * (w - 4), y + 2 + rand() * (h - 4), 1, 1, '#b98a4e');
  px(ctx, x + 3, y + 3, w - 6, 1, tone.main); px(ctx, x + 3, y + h - 4, w - 6, 1, tone.main); px(ctx, x + 3, y + 3, 1, h - 6, tone.main); px(ctx, x + w - 4, y + 3, 1, h - 6, tone.main);
  px(ctx, x + 4, y + 4, w - 8, 1, tone.light);
  if (holes) cells.forEach((c) => { const [cx, cy] = mid(c, cell); disc(ctx, cx, cy, cell * 0.36, '#2f1a08'); disc(ctx, cx, cy + 1, cell * 0.3, '#47280d'); });
}

export type AcornParts = { track: RC[]; starts: { rc: RC; tone: Tone }[]; homes: { cells: RC[]; tone: Tone }[]; pens: { cells: RC[]; tone: Tone }[] };
export function drawAcornParts(ctx: CanvasRenderingContext2D, cell: number, parts: AcornParts, rand: () => number) {
  const startKeys = new Set(parts.starts.map((s) => s.rc.join(',')));
  parts.homes.forEach((h) => { const b = box(h.cells, cell); ctx.globalAlpha = 0.3; px(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, h.tone.main); ctx.globalAlpha = 1; dashed(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, h.tone.light); });
  parts.track.forEach((c) => { if (!startKeys.has(c.join(','))) stump(ctx, cell, c); });
  parts.starts.forEach((s) => stump(ctx, cell, s.rc, s.tone));
  parts.homes.forEach((h) => h.cells.forEach((c) => nest(ctx, cell, c, h.tone, rand)));
  parts.pens.forEach((p) => log(ctx, cell, p.cells, p.tone, true, rand));
}

export type SlideParts = {
  track: RC[]; slides: { cells: RC[]; tone: string; dir: number[] }[]; safes: { cells: RC[]; tone: Tone }[]; homes: { cells: RC[]; tone: Tone }[]; pens: { cells: RC[]; tone: Tone }[];
};
export function drawSlideParts(ctx: CanvasRenderingContext2D, cell: number, parts: SlideParts, rand: () => number) {
  parts.track.forEach((c, i) => {
    const x = c[1] * cell, y = c[0] * cell;
    px(ctx, x, y, cell, cell, '#b98a4e'); px(ctx, x + 1, y + 1, cell - 2, cell - 2, i % 2 ? '#f0dfb2' : '#e8d49d');
    px(ctx, x + 1, y + 1, cell - 2, 1, '#fff4d6'); px(ctx, x + 1, y + cell - 2, cell - 2, 1, '#d2b378');
    for (let k = 0; k < 4; k++) px(ctx, x + 3 + rand() * (cell - 7), y + 3 + rand() * (cell - 7), 2, 1, rand() < 0.5 ? '#cfb27a' : '#fff0c8');
  });
  parts.safes.forEach((sf) => sf.cells.forEach((c) => {
    const x = c[1] * cell, y = c[0] * cell;
    px(ctx, x, y, cell, cell, sf.tone.dark); px(ctx, x + 1, y + 1, cell - 2, cell - 2, '#4f9b3d');
    ctx.globalAlpha = 0.62; px(ctx, x + 1, y + 1, cell - 2, cell - 2, sf.tone.light); ctx.globalAlpha = 1;
    for (let k = 0; k < 6; k++) { const fx = x + 3 + rand() * (cell - 6), fy = y + 3 + rand() * (cell - 6); px(ctx, fx, fy + 1, 1, 2, '#2d7a3a'); px(ctx, fx - 1, fy, 3, 1, k % 2 ? '#ffffff' : '#ffe48a'); px(ctx, fx, fy - 1, 1, 3, k % 2 ? '#ffffff' : '#ffe48a'); px(ctx, fx, fy, 1, 1, '#ff9ec0'); }
  }));
  parts.slides.forEach((sl) => {
    const set = new Set(sl.cells.map((c) => c.join(',')));
    sl.cells.forEach((c, i) => {
      const x = c[1] * cell, y = c[0] * cell;
      px(ctx, x, y, cell, cell, '#fff');
      for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) px(ctx, x + xx, y + yy, 1, 1, ((xx + yy) >> 2) % 2 ? sl.tone : '#ffffffcc');
      const edge = (dr: number, dc: number) => !set.has(`${c[0] + dr},${c[1] + dc}`);
      if (edge(-1, 0)) px(ctx, x, y, cell, 2, '#3a2410'); if (edge(1, 0)) px(ctx, x, y + cell - 2, cell, 2, '#3a2410');
      if (edge(0, -1)) px(ctx, x, y, 2, cell, '#3a2410'); if (edge(0, 1)) px(ctx, x + cell - 2, y, 2, cell, '#3a2410');
      const [cx, cy] = mid(c, cell);
      if (i === 0) {
        const [dr, dc] = sl.dir;
        const tri = (len: number, col: string) => { for (let a = -len + 1; a <= len; a++) for (let q = -Math.floor((len - a) / 1.3); q <= Math.floor((len - a) / 1.3); q++) px(ctx, cx + a * dc + q * Math.abs(dr), cy + a * dr + q * Math.abs(dc), 1, 1, col); };
        tri(5, '#3a2410'); tri(4, '#fff');
      }
      if (i === sl.cells.length - 1) { disc(ctx, cx, cy, cell * 0.28, '#3a2410'); disc(ctx, cx, cy, cell * 0.2, '#fff'); }
    });
  });
  parts.homes.forEach((h) => { const b = box(h.cells, cell); ctx.globalAlpha = 0.28; px(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, h.tone.light); ctx.globalAlpha = 1; dashed(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, h.tone.main); h.cells.forEach((c) => nest(ctx, cell, c, h.tone, rand)); });
  parts.pens.forEach((p) => log(ctx, cell, p.cells, p.tone, false, rand));
}
