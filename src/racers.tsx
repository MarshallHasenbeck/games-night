import { PixelArt } from './Sprite';
import { PLAYER_COLORS } from './lib/seats';

const ACORN = [
  '....k....',
  '..ooooo..',
  '.ohhpppo.',
  'ohpppppqo',
  'oqqqqqqqo',
  '.ottttto.',
  'ottttttso',
  'ottttttso',
  '.otttsso.',
  '..ooooo..',
];
const MUSHROOM = [
  '..ooooo..',
  '.ohhpppo.',
  'ohwwpppwo',
  'ophpppppo',
  'opppwwppo',
  'oqqqqqqqo',
  '.oossoo..',
  '...ottso.',
  '...ooooo.',
];

const pal = (i: number) => {
  const c = PLAYER_COLORS[i];
  return { o: '#2f2418', p: c.main, h: c.light, q: c.dark, t: '#f0c98a', s: '#c4944f', k: '#6a4020', w: '#fff4d6' };
};
/** A little acorn game piece in a player's colour (scales to its box). */
export const AcornPiece = ({ color }: { color: number }) => <span className="piece-art"><PixelArt rows={ACORN} palette={pal(color)} px={1} /></span>;
/** A little mushroom pawn in a player's colour. */
export const MushroomPiece = ({ color }: { color: number }) => <span className="piece-art"><PixelArt rows={MUSHROOM} palette={pal(color)} px={1} /></span>;
