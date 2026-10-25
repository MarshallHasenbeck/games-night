import { PALS, pine, rng } from './art';

/**
 * A pixel-art meadow for the race boards (canvas -> data URL, drawn once). `cell` px per board cell.
 * `path` cells get a worn dirt track under them; free cells (not in `used`) get flowers, mushrooms, rocks and pines.
 */
export function makeBoardTexture(n: number, cell: number, used: Set<string>, path: Set<string>, seed: number, pond?: { r: number; c: number; rad: number }): string {
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
  return cv.toDataURL('image/png');
}
