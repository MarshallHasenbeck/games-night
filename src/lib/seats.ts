/** Seats for the 2-4 player race games. Seat ids are board sides (0 top, 1 right, 2 bottom, 3 left); players are numbered in seat order. */
export type SeatCfg = { n: 2 | 3 | 4; cpu: [boolean, boolean, boolean, boolean]; level: 1 | 2 | 3 };

export const seatsFor = (n: number): number[] => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
/** Colour per player order (P1 red, P2 blue, P3 green, P4 yellow). */
export const PLAYER_COLORS = [
  { main: '#d4475a', light: '#ff8a9a', dark: '#8f2a3c' },
  { main: '#3a8fd6', light: '#8fd0ff', dark: '#1f5a94' },
  { main: '#4aa84a', light: '#9be08a', dark: '#2a6a2a' },
  { main: '#f2b632', light: '#ffe48a', dark: '#a5760e' },
] as const;
export const playerName = (cfg: SeatCfg, order: number) => (cfg.cpu[order] ? `CPU ${order + 1}` : `P${order + 1}`);
