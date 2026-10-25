import { useRef, useState } from 'react';
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

/* ---------- little burst effects (dust, bump, home sparkle, slide streak, sorry zap, swap swirl) ---------- */
export type FxKind = 'dust' | 'bump' | 'home' | 'slide' | 'sorry' | 'swap';
export type Fx = { id: number; r: number; c: number; kind: FxKind; text?: string };

export function useFx(): [Fx[], (r: number, c: number, kind: FxKind, text?: string) => void] {
  const [fx, setFx] = useState<Fx[]>([]);
  const id = useRef(0);
  const add = (r: number, c: number, kind: FxKind, text?: string) => {
    const n = ++id.current;
    setFx((f) => [...f, { id: n, r, c, kind, text }]);
    setTimeout(() => setFx((f) => f.filter((x) => x.id !== n)), 1100);
  };
  return [fx, add];
}

export function FxLayer({ fx, n }: { fx: Fx[]; n: number }) {
  return (
    <div className="fxlayer" style={{ ['--cs' as string]: `calc(100% / ${n})` }} aria-hidden>
      {fx.map((f) => (
        <i key={f.id} className={`fx fx-${f.kind}`} style={{ left: `${((f.c + 0.5) * 100) / n}%`, top: `${((f.r + 0.5) * 100) / n}%`, ['--n' as string]: n }}>
          <u />
          {Array.from({ length: 8 }, (_, k) => <s key={k} style={{ ['--a' as string]: `${k * 45}deg`, animationDelay: `${(k % 3) * 25}ms` }} />)}
          {f.text && <b>{f.text}</b>}
        </i>
      ))}
    </div>
  );
}
