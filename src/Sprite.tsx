import type { ReactElement } from 'react';

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
