/** 8×8 pixel-art sprites drawn as crisp SVG rects. */
export const SPRITES: Record<string, string[]> = {
  p: ['........', '...##...', '..####..', '...##...', '..####..', '...##...', '.######.', '.######.'],
  r: ['.#.##.#.', '.######.', '..####..', '..####..', '..####..', '..####..', '.######.', '.######.'],
  n: ['..##....', '.####...', '######..', '#.####..', '..####..', '..####..', '.######.', '.######.'],
  b: ['...##...', '..####..', '.##.###.', '..####..', '...##...', '..####..', '.######.', '.######.'],
  q: ['#..##..#', '#.####.#', '.######.', '..####..', '..####..', '..####..', '.######.', '.######.'],
  k: ['...##...', '.######.', '...##...', '..####..', '.######.', '..####..', '.######.', '.######.'],
  flag: ['.#......', '.###....', '.#####..', '.###....', '.#......', '.#......', '.#......', '###.....'],
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
