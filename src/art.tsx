import type { ReactElement } from 'react';
import { PixelArt } from './Sprite';

/* ---------- chess pieces: 12×12, o=outline a=body h=highlight s=shade ---------- */
export const PIECES: Record<string, string[]> = {
  p: ['............', '............', '....oooo....', '...ohaaso...', '...oaaaso...', '....oaso....', '...ohaaso...', '..ohaaaaso..', '..oaaaaaaso.', '.ohaaaaaaaso', '.oaaaaaaaaso', '.oooooooooo.'],
  r: ['............', '.ooo.oo.ooo.', '.ohaoaaoaaso', '.ohaaaaaaaso', '..ohaaaaaso.', '...ohaaaso..', '...ohaaaso..', '...ohaaaso..', '..ohaaaaaso.', '.ohaaaaaaaso', '.oaaaaaaaaso', '.oooooooooo.'],
  n: ['............', '...oo.......', '..ohho......', '.ohaaaoo....', 'ohaaaaaaoo..', 'oohoaaaaaso.', '.oo.oaaaaso.', '.....ohaaaso', '....ohaaaaso', '...ohaaaaaso', '..oaaaaaaaso', '..oooooooooo'],
  b: ['............', '.....oo.....', '....ohao....', '...ohaaso...', '...ohaaso...', '....oaaso...', '.....ooo....', '....ohaso...', '...ohaaaso..', '..ohaaaaaso.', '.oaaaaaaaaso', '.oooooooooo.'],
  q: ['............', '.o...oo...o.', '.oo.ohao.oo.', '..ohaaaaaso.', '...ohaaaso..', '....ohaso...', '...ohaaaso..', '..ohaaaaaso.', '..ohaaaaaso.', '.ohaaaaaaaso', '.oaaaaaaaaso', '.oooooooooo.'],
  k: ['.....oo.....', '...oohaoo...', '.....oo.....', '..ohaaaaaso.', '..ohaaaaaso.', '...ohaaaso..', '....ohaso...', '...ohaaaso..', '..ohaaaaaso.', '.ohaaaaaaaso', '.oaaaaaaaaso', '.oooooooooo.'],
};
export const SIDE = {
  w: { o: '#2f1a0b', a: '#fff4d6', h: '#ffffff', s: '#d4b87c' },
  b: { o: '#14301c', a: '#3f8f4a', h: '#8fd45a', s: '#25643a' },
};
export const Piece = ({ side, type, px = 4 }: { side: 'w' | 'b'; type: string; px?: number }) => (
  <PixelArt rows={PIECES[type]} palette={SIDE[side]} px={px} />
);

/* ---------- checkers: 10×10 shaded discs; k = gold crown mark ---------- */
const DISC = ['..oooooo..', '.ohhhaaao.', 'ohhaaaaaso', 'ohaaaaaaso', 'oaaaaaaaso', 'oaaaaaaaso', 'oaaaaassso', 'oaasssssso', '.osssssso.', '..oooooo..'];
const KING = ['..oooooo..', '.ohhhaaao.', 'ohhaaaaaso', 'ohakakakso', 'oaakkkaaso', 'oaakkkaaso', 'oaaaaassso', 'oaasssssso', '.osssssso.', '..oooooo..'];
const CHECK_SIDE = {
  0: { o: '#2f1a0b', a: '#d4475a', h: '#f27a8a', s: '#9a2a40', k: '#f2b632' },
  1: { o: '#2f1a0b', a: '#fff4d6', h: '#ffffff', s: '#d4b87c', k: '#c27a00' },
};
export const Disc = ({ side, king, px = 4 }: { side: 0 | 1; king?: boolean; px?: number }) => (
  <PixelArt rows={king ? KING : DISC} palette={CHECK_SIDE[side]} px={px} />
);
export const ConnectDisc = ({ px = 4 }: { px?: number }) => (
  <PixelArt rows={DISC} palette={{ o: '#2f1a0b', a: '#f2b632', h: '#fff0a0', s: '#c27a00' }} px={px} />
);

/* ---------- menu / misc art ---------- */
const DIE = ['oooooooooo', 'ohhhhhhhso', 'ohkhhhhkso', 'ohhhhhhhso', 'ohhhkkhhso', 'ohhhkkhhso', 'ohhhhhhhso', 'ohkhhhhkso', 'ossssssswo', 'oooooooooo'];
export const DieArt = ({ px = 6 }: { px?: number }) => (
  <PixelArt rows={DIE.map((r) => r.replace('w', 's'))} palette={{ o: '#2f1a0b', h: '#fff4d6', s: '#d4b87c', k: '#4a2a10' }} px={px} />
);
const FLAG = ['..o.........', '..ooo.......', '..oggoo.....', '..ogggggo...', '..oggoo.....', '..ooo.......', '..o.........', '..o.........', '..o.........', '.ooo........', 'ooooo.......', '............'];
export const FlagArt = ({ px = 5, fill = '#6fbf4a' }: { px?: number; fill?: string }) => (
  <PixelArt rows={FLAG} palette={{ o: '#2f1a0b', g: fill }} px={px} />
);
const LEAF = ['...ll..', '..llll.', '.lllll.', 'llllll.', '.lllbl.', '..lbl..', '..b....'];
export const Leaf = ({ color, px = 2 }: { color: string; px?: number }) => (
  <PixelArt rows={LEAF} palette={{ l: color, b: '#5b3716' }} px={px} />
);

/* ---------- card back: 15×21 woodland design ---------- */
function cardBackRows(): string[] {
  const W = 15, H = 21;
  const g: string[][] = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (d === 0) return 'o';
    if (d === 1) return 'p';
    if (d === 2) return 'd';
    // diamond lattice
    return (x + y) % 4 === 0 || (x - y + 40) % 4 === 0 ? 'l' : (x + y) % 2 === 0 ? 'g' : 'm';
  }));
  // medallion: dark disc with a golden acorn-leaf motif
  const cx = 7, cy = 10;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= 20) g[y][x] = 'd';
    if (dx * dx + dy * dy >= 17 && dx * dx + dy * dy <= 20) g[y][x] = 'o';
  }
  const motif = ['...y...', '..yyy..', '.yyhyy.', 'yyhhhyy', '.yyhyy.', '..yyy..', '...y...'];
  motif.forEach((row, my) => [...row].forEach((ch, mx) => { if (ch !== '.') g[cy - 3 + my][cx - 3 + mx] = ch; }));
  // corner sprouts
  [[3, 3], [11, 3], [3, 17], [11, 17]].forEach(([x, y]) => { g[y][x] = 'y'; });
  return g.map((r) => r.join(''));
}
const CARD_BACK = cardBackRows();
const CARD_PAL = { o: '#2f1a0b', p: '#f6dca0', d: '#1f5a35', g: '#3f8f4a', m: '#2d7a40', l: '#6fbf4a', y: '#f2b632', h: '#fff0a0' };
export function CardBack() {
  return (
    <svg className="cardart" viewBox="0 0 15 21" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden>
      {CARD_BACK.flatMap((row, y) => {
        const out: ReactElement[] = [];
        let x = 0;
        while (x < row.length) {
          let n = 1;
          while (row[x + n] === row[x]) n++;
          out.push(<rect key={`${x},${y}`} x={x} y={y} width={n} height="1" fill={CARD_PAL[row[x] as keyof typeof CARD_PAL]} />);
          x += n;
        }
        return out;
      })}
    </svg>
  );
}

/* ---------- landscape ---------- */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const PINE = ['.....l.....', '....lgg....', '....lggG...', '...lggggG..', '...lgggggG.', '..lgggggggG', '..lggggggGG', '.lggggggggG', '.lgggggggGG', 'lgggggggggG', '....bbB....', '....bbB....', '....bbB....'];
const PALS = {
  far: { l: '#b4dcc0', g: '#8cc4a0', G: '#6aa58a', b: '#7f9a86', B: '#628072' },
  mid: { l: '#8fd45a', g: '#4a9a4a', G: '#2f7040', b: '#8a5a2e', B: '#5b3716' },
  fall: { l: '#ffd36b', g: '#e8963a', G: '#b8582a', b: '#8a5a2e', B: '#5b3716' },
  near: { l: '#a6e36a', g: '#3f8f4a', G: '#25643a', b: '#8a5a2e', B: '#5b3716' },
};
function tree(key: string, x: number, baseY: number, scale: number, pal: Record<string, string>) {
  const rects: ReactElement[] = [];
  PINE.forEach((row, y) => {
    let cx = 0;
    while (cx < row.length) {
      if (row[cx] === '.') { cx++; continue; }
      let n = 1;
      while (row[cx + n] === row[cx]) n++;
      rects.push(<rect key={`${cx},${y}`} x={cx * scale} y={y * scale} width={n * scale} height={scale} fill={pal[row[cx]]} />);
      cx += n;
    }
  });
  return <g key={key} transform={`translate(${x} ${baseY - PINE.length * scale})`}>{rects}</g>;
}
function ridge(key: string, seed: number, base: number, amp: number, color: string, shade: string) {
  const r = rng(seed);
  const cols: ReactElement[] = [];
  let h = base;
  for (let x = 0; x < 192; x++) {
    if (x % 4 === 0) h = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x / 17 + seed)) - r() * 3);
    cols.push(<rect key={x} x={x} y={h} width="1" height={72 - h} fill={color} />);
    cols.push(<rect key={`s${x}`} x={x} y={h} width="1" height="1" fill={shade} />);
  }
  return <g key={key}>{cols}</g>;
}

export function Landscape() {
  const r = rng(7);
  const far = Array.from({ length: 22 }, (_, i) => tree(`f${i}`, i * 9 + r() * 5 - 4, 50, 1, PALS.far));
  const mid = Array.from({ length: 15 }, (_, i) => tree(`m${i}`, i * 13.5 + r() * 6 - 3, 58, 1, i % 5 === 3 ? PALS.fall : PALS.mid));
  const near = [[-6, 72, PALS.near], [14, 74, PALS.fall], [150, 73, PALS.near], [172, 72, PALS.mid]].map(([x, y, p], i) => tree(`n${i}`, x as number, y as number, 2, p as Record<string, string>));
  const flowers: ReactElement[] = [];
  const fr = rng(21);
  const cols = ['#ff7aa8', '#fff4d6', '#f2b632', '#a98bff'];
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(fr() * 192), y = 62 + Math.floor(fr() * 9);
    flowers.push(<rect key={`fl${i}`} x={x} y={y} width="1" height="1" fill={cols[i % 4]} />);
    if (i % 3 === 0) flowers.push(<rect key={`st${i}`} x={x} y={y + 1} width="1" height="1" fill="#2d7a3a" />);
  }
  const tufts = Array.from({ length: 40 }, (_, i) => {
    const x = Math.floor(fr() * 190), y = 61 + Math.floor(fr() * 10);
    return <path key={`t${i}`} d={`M${x} ${y + 1}v-1M${x + 1} ${y + 1}v-2M${x + 2} ${y + 1}v-1`} stroke="#2d6e2d" strokeWidth="1" fill="none" />;
  });
  return (
    <svg className="landscape" viewBox="0 0 192 72" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      {ridge('r1', 3, 40, 14, '#9ccdb8', '#b7dfcb')}
      {ridge('r2', 11, 46, 10, '#6fb08c', '#8cc7a3')}
      {far}
      {ridge('r3', 19, 55, 7, '#4f9a5a', '#6fbf4a')}
      {mid}
      <rect x="0" y="60" width="192" height="12" fill="#4a9a3a" />
      <rect x="0" y="60" width="192" height="1" fill="#8fd45a" />
      <rect x="0" y="61" width="192" height="1" fill="#6fbf4a" />
      <rect x="0" y="68" width="192" height="4" fill="#3b8530" />
      {tufts}
      {flowers}
      {near}
    </svg>
  );
}

const CLOUD = ['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'ssssssssssss'];
export function Sky() {
  const sun = [] as ReactElement[];
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
    const d = x * x + y * y;
    if (d <= 36) sun.push(<rect key={`${x},${y}`} x={160 + x} y={14 + y} width="1" height="1" fill={d <= 22 ? '#fff0a0' : '#ffd84a'} />);
    else if (d <= 56) sun.push(<rect key={`${x},${y}`} x={160 + x} y={14 + y} width="1" height="1" fill="#ffe27a33" />);
  }
  return (
    <svg className="sky" viewBox="0 0 192 48" preserveAspectRatio="xMidYMin slice" shapeRendering="crispEdges" aria-hidden>
      {sun}
      {[[14, 12, 40, 0], [88, 24, 52, 14], [132, 6, 46, 6], [60, 4, 36, 22]].map(([x, y, dur, delay], i) => (
        <g key={i} className="cloud" style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
          <g transform={`translate(${x} ${y})`}>
            <PixelArtRects rows={CLOUD} palette={{ w: '#ffffff', s: '#cfe3f2' }} />
          </g>
        </g>
      ))}
    </svg>
  );
}
function PixelArtRects({ rows, palette }: { rows: string[]; palette: Record<string, string> }) {
  return <>{rows.flatMap((row, y) => [...row].map((ch, x) => ch === '.' ? null : <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={palette[ch]} />))}</>;
}

export function Scenery() {
  return (
    <div className="scenery" aria-hidden>
      <Sky />
      <Landscape />
      {Array.from({ length: 7 }, (_, i) => <i key={i} className={`leaf l${i}`} />)}
    </div>
  );
}
