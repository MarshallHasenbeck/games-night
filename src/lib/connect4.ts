export const R = 6, C = 7;
export type Grid = (0 | 1 | null)[][];
export const empty = (): Grid => Array.from({ length: R }, () => Array(C).fill(null));

export function findWin(g: Grid): [number, number][] | null {
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const v = g[r][c];
    if (v === null) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line: [number, number][] = [];
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= R || cc < 0 || cc >= C || g[rr][cc] !== v) break;
        line.push([rr, cc]);
      }
      if (line.length === 4) return line;
    }
  }
  return null;
}
export const landingRow = (g: Grid, c: number) => {
  for (let r = R - 1; r >= 0; r--) if (g[r][c] === null) return r;
  return -1;
};
