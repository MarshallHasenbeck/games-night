import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess as Engine, type Square } from 'chess.js';
import { Piece } from '../art';
import { sfx } from '../lib/sfx';
import { bestChessMove } from '../cpu/chessAI';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const FILES = 'abcdefgh';
const piece = (color: string, type: string, px = 4) => <Piece side={color as 'w' | 'b'} type={type} px={px} />;

export default function Chess() {
  const opp = useOpponent('chess');
  const [game, setGame] = useState(() => new Engine());
  const [ver, setVer] = useState(0);
  const [sel, setSel] = useState<Square | null>(null);
  const [flip, setFlip] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);
  const [thinking, setThinking] = useState(false);
  const recorded = useRef(false);

  const board = game.board();
  const targets = useMemo(
    () => new Set(sel ? game.moves({ square: sel, verbose: true }).map((m) => m.to) : []),
    [sel, game, ver],
  );
  const hist = game.history({ verbose: true });
  const last = hist.at(-1);
  const turn = game.turn();
  const inCheck = game.inCheck();
  const over = game.isGameOver();
  const cpuTurn = opp.cpu && turn === 'b';

  const afterMove = (captured?: string) => {
    if (captured) sfx.capture(); else sfx.move();
    setSel(null);
    setVer((v) => v + 1);
    if (autoFlip && !opp.cpu) setFlip(game.turn() === 'b');
  };

  // computer plays black
  useEffect(() => {
    if (!cpuTurn || over) return;
    setThinking(true);
    const id = setTimeout(() => {
      const mv = bestChessMove(game.fen(), opp.level);
      const played = game.move(mv);
      setThinking(false);
      afterMove(played.captured);
    }, 500);
    return () => { clearTimeout(id); setThinking(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver, cpuTurn, over, opp.level, game]);

  // record result once
  useEffect(() => {
    if (!over) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    if (game.isCheckmate()) { recordResult('chess', game.turn() === 'w' ? 1 : 0); setTimeout(sfx.win, 300); }
    else recordResult('chess', 'draw');
  }, [over, game, ver]);

  let status = `${turn === 'w' ? 'WHITE' : 'BLACK'} TO MOVE${inCheck ? ' - CHECK!' : ''}`;
  if (thinking) status = 'CPU IS THINKING...';
  let title = '', sub = '';
  if (game.isCheckmate()) { status = `CHECKMATE! ${turn === 'w' ? 'BLACK' : 'WHITE'} WINS`; title = `${turn === 'w' ? 'BLACK' : 'WHITE'} WINS!`; sub = 'Checkmate'; }
  else if (game.isStalemate()) { status = 'STALEMATE - DRAW'; title = 'DRAW'; sub = 'Stalemate'; }
  else if (game.isThreefoldRepetition()) { status = 'DRAW BY REPETITION'; title = 'DRAW'; sub = 'Repetition'; }
  else if (game.isInsufficientMaterial()) { status = 'DRAW - NO MATERIAL'; title = 'DRAW'; sub = 'Not enough pieces'; }
  else if (game.isDraw()) { status = 'DRAW'; title = 'DRAW'; }

  const click = (sq: Square) => {
    if (over || cpuTurn) return;
    const p = game.get(sq);
    if (sel && targets.has(sq)) {
      const m = game.move({ from: sel, to: sq, promotion: 'q' });
      afterMove(m.captured);
    } else if (p && p.color === turn) { sfx.click(); setSel(sq); }
    else setSel(null);
  };

  const undo = () => {
    game.undo();
    if (opp.cpu && game.turn() === 'b') game.undo();
    setSel(null);
    setVer((v) => v + 1);
    if (autoFlip && !opp.cpu) setFlip(game.turn() === 'b');
  };
  const reset = () => { setGame(new Engine()); setSel(null); setFlip(false); setVer(0); };

  const rows = flip ? [...board].reverse() : board;
  const dispCol = (sq: string) => (flip ? 7 - FILES.indexOf(sq[0]) : FILES.indexOf(sq[0]));
  const dispRow = (sq: string) => (flip ? Number(sq[1]) - 1 : 8 - Number(sq[1]));
  const captured = (color: 'w' | 'b') => {
    const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const have: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    board.flat().forEach((s) => s && s.color === color && s.type !== 'k' && have[s.type]++);
    return Object.entries(start).flatMap(([t, n]) => Array.from({ length: Math.max(0, n - have[t]) }, (_, i) => <span key={t + i}>{piece(color, t, 2)}</span>));
  };

  return (
    <div className="game split chess">
      <div className="head">
        <ModeBar opp={opp} />
        <div className="status">{status}</div>
        <div className="captures">BLACK LOST {captured('b')}</div>
      </div>
      <div className="main board">
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
            const sliding = last && last.to === sq;
            const style = sliding
              ? { ['--dx' as string]: `${(dispCol(last.from) - dispCol(sq)) * 116}%`, ['--dy' as string]: `${(dispRow(last.from) - dispRow(sq)) * 116}%` }
              : undefined;
            return (
              <button key={sq} className={cls} onClick={() => click(sq)} aria-label={sq}>
                {p && <span key={sliding ? `s${hist.length}` : 'p'} className={`piece ${sliding ? 'slide' : ''}`} style={style}>{piece(p.color, p.type, 4)}</span>}
                {sliding && last.captured && <i key={`b${hist.length}`} className="burst" />}
                {targets.has(sq) && <span className={p ? 'ring' : 'dot'} />}
                {c === 0 && <i className="coord rk">{rank}</i>}
                {r === 7 && <i className="coord fl">{FILES[file]}</i>}
              </button>
            );
          }),
        )}
      </div>
      <div className="foot">
      <div className="captures">WHITE LOST {captured('w')}</div>
      <div className="row">
        <button className="btn" onClick={undo} disabled={!hist.length || thinking}>UNDO</button>
        <button className="btn" onClick={() => setFlip(!flip)}>FLIP</button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      {!opp.cpu && (
        <label className="check-label">
          <input type="checkbox" checked={autoFlip} onChange={(e) => { setAutoFlip(e.target.checked); setFlip(e.target.checked && game.turn() === 'b'); }} />
          Auto-rotate each turn
        </label>
      )}
      <p className="hint">Pawns promote to queens. {opp.cpu ? 'You are White.' : ''}</p>
      </div>
      {over && <Celebrate title={title} sub={sub} onAgain={reset} />}
    </div>
  );
}
