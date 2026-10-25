import type { ReactElement } from 'react';
/** 8×8 pixel-art sprites drawn as crisp SVG rects. */
export const SPRITES: Record<string, string[]> = {
  p: ['........', '...##...', '..####..', '...##...', '..####..', '...##...', '.######.', '.######.'],
  r: ['.#.##.#.', '.######.', '..####..', '..####..', '..####..', '..####..', '.######.', '.######.'],
  n: ['..##....', '.####...', '######..', '#.####..', '..####..', '..####..', '.######.', '.######.'],
  b: ['...##...', '..####..', '.##.###.', '..####..', '...##...', '..####..', '.######.', '.######.'],
  q: ['#..##..#', '#.####.#', '.######.', '..####..', '..####..', '..####..', '.######.', '.######.'],
  k: ['...##...', '.######.', '...##...', '..####..', '.######.', '..####..', '.######.', '.######.'],
  flag: ['.#......', '.###....', '.#####..', '.###....', '.#......', '.#......', '.#......', '###.....'],
  disc: ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'],
  kdisc: ['..####..', '.######.', '##.##.##', '###..###', '########', '########', '.######.', '..####..'],
  die: ['########', '#......#', '#.#..#.#', '#......#', '#......#', '#.#..#.#', '#......#', '########'],
};

export default function Sprite({ name, fill = '#fff', outline = '#000', size = 48 }: { name: string; fill?: string; outline?: string; size?: number }) {
  const rows = SPRITES[name];
  const cells: [number, number][] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push([x, y]); }));
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const edge: [number, number][] = [];
  for (let y = -1; y <= 8; y++) for (let x = -1; x <= 8; x++) {
    if (set.has(`${x},${y}`)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => set.has(`${x + dx},${y + dy}`))) edge.push([x, y]);
  }
  return (
    <svg width={size} height={size} viewBox="-1 -1 10 10" shapeRendering="crispEdges" aria-hidden>
      {edge.map(([x, y]) => <rect key={`o${x},${y}`} x={x} y={y} width="1" height="1" fill={outline} />)}
      {cells.map(([x, y]) => <rect key={`f${x},${y}`} x={x} y={y} width="1" height="1" fill={fill} />)}
    </svg>
  );
}

/** Multi-colour pixel art: rows of palette characters ('.' = transparent). */
export function PixelArt({ rows, palette, px = 4 }: { rows: string[]; palette: Record<string, string>; px?: number }) {
  const rects: ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let n = 1;
      while (row[x + n] === ch) n++;
      rects.push(<rect key={`${x},${y}`} x={x} y={y} width={n} height="1" fill={palette[ch]} />);
      x += n;
    }
  });
  return (
    <svg width={rows[0].length * px} height={rows.length * px} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" aria-hidden>
      {rects}
    </svg>
  );
}

const PINE = ['.....l.....', '....lgg....', '....lggG...', '...lggggG..', '...lgggggG.', '..lgggggggG', '..lggggggGG', '.lggggggggG', '.lgggggggGG', 'lgggggggggG', '....bbB....', '....bbB....', '....bbB....'];
const MUSH = ['..rrrrr..', '.rrwrrrr.', 'rrrrrwrrr', 'rwrrrrrrr', 'rrrrrrrrr', '..sssss..', '...sss...', '...ssS...'];
const PAL = { l: '#8fd45a', g: '#3f8f4a', G: '#25643a', b: '#8a5a2e', B: '#5b3716', r: '#d4475a', w: '#fff4d6', s: '#f1dfb0', S: '#cfae72' };

export const Pine = ({ px = 5 }: { px?: number }) => <PixelArt rows={PINE} palette={PAL} px={px} />;
export const Mushroom = ({ px = 4 }: { px?: number }) => <PixelArt rows={MUSH} palette={PAL} px={px} />;
