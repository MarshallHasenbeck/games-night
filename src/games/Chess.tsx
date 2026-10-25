import { useMemo, useState } from 'react';
import { Chess as Engine, type Square } from 'chess.js';
import { Piece } from '../art';
import { sfx } from '../lib/sfx';

const piece = (color: string, type: string, px = 4) => <Piece side={color as 'w' | 'b'} type={type} px={px} />;
const FILES = 'abcdefgh';

export default function Chess() {
  const [game, setGame] = useState(() => new Engine());
  const [, bump] = useState(0);
  const [sel, setSel] = useState<Square | null>(null);
  const [flip, setFlip] = useState(false);
  const [autoFlip, setAutoFlip] = useState(true);

  const board = game.board();
  const targets = useMemo(
    () => new Set(sel ? game.moves({ square: sel, verbose: true }).map((m) => m.to) : []),
    [sel, game, board],
  );
  const last = game.history({ verbose: true }).at(-1);
  const turn = game.turn();
  const inCheck = game.inCheck();

  let status = `${turn === 'w' ? 'WHITE' : 'BLACK'} TO MOVE${inCheck ? ' - CHECK!' : ''}`;
  if (game.isCheckmate()) status = `CHECKMATE! ${turn === 'w' ? 'BLACK' : 'WHITE'} WINS`;
  else if (game.isStalemate()) status = 'STALEMATE - DRAW';
  else if (game.isThreefoldRepetition()) status = 'DRAW BY REPETITION';
  else if (game.isInsufficientMaterial()) status = 'DRAW - NO MATERIAL';
  else if (game.isDraw()) status = 'DRAW';

  const click = (sq: Square) => {
    if (game.isGameOver()) return;
    const piece = game.get(sq);
    if (sel && targets.has(sq)) {
      const m = game.move({ from: sel, to: sq, promotion: 'q' });
      if (m.captured) sfx.capture(); else sfx.move();
      if (game.isCheckmate()) setTimeout(sfx.win, 250);
      setSel(null);
      bump((n) => n + 1);
      if (autoFlip) setFlip(game.turn() === 'b');
    } else if (piece && piece.color === turn) { sfx.click(); setSel(sq); }
    else setSel(null);
  };

  const undo = () => {
    game.undo();
    setSel(null);
    bump((n) => n + 1);
    if (autoFlip) setFlip(game.turn() === 'b');
  };
  const reset = () => {
    setGame(new Engine());
    setSel(null);
    setFlip(false);
  };

  const rows = flip ? [...board].reverse() : board;
  const captured = (color: 'w' | 'b') => {
    const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const have: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    board.flat().forEach((s) => s && s.color === color && s.type !== 'k' && have[s.type]++);
    return Object.entries(start).flatMap(([t, n]) => Array.from({ length: Math.max(0, n - have[t]) }, (_, i) => <span key={t + i}>{piece(color, t, 2)}</span>));
  };

  return (
    <div className="chess">
      <div className="status">{status}</div>
      <div className="captures">BLACK LOST {captured('b')}</div>
      <div className="board">
        {rows.map((row, r) =>
          (flip ? [...row].reverse() : row).map((_, c) => {
            const rank = flip ? r + 1 : 8 - r;
            const file = flip ? 7 - c : c;
            const sq = `${FILES[file]}${rank}` as Square;
            const p = game.get(sq);
            const dark = (file + rank) % 2 === 0;
            const cls = [
              'sq', dark ? 'dark' : 'light',
              sel === sq && 'sel',
              last && (last.from === sq || last.to === sq) && 'last',
              inCheck && p?.type === 'k' && p.color === turn && 'check',
            ].filter(Boolean).join(' ');
            return (
              <button key={sq} className={cls} onClick={() => click(sq)} aria-label={sq}>
                {p && <span className="piece">{piece(p.color, p.type, 4)}</span>}
                {targets.has(sq) && <span className={p ? 'ring' : 'dot'} />}
                {c === 0 && <i className="coord rk">{rank}</i>}
                {r === 7 && <i className="coord fl">{FILES[file]}</i>}
              </button>
            );
          }),
        )}
      </div>
      <div className="captures">WHITE LOST {captured('w')}</div>
      <div className="row">
        <button className="btn" onClick={undo} disabled={!game.history().length}>UNDO</button>
        <button className="btn" onClick={() => setFlip(!flip)}>FLIP</button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      <label className="check-label">
        <input type="checkbox" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
        Auto-rotate each turn
      </label>
      <p className="hint">Pawns promote to queens.</p>
    </div>
  );
}
