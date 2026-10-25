import { useEffect, useRef, useState } from 'react';
import { Disc } from '../art';
import { sfx } from '../lib/sfx';
import { apply, fresh, legalMoves, type Move } from '../lib/checkers';
import { bestCheckersMove } from '../cpu/checkersAI';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const NAMES = ['BERRY', 'CREAM'];

export default function Checkers() {
  const opp = useOpponent('checkers');
  const [s, setS] = useState(fresh);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [flip, setFlip] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);
  const [last, setLast] = useState<{ from: [number, number]; to: [number, number]; n: number } | null>(null);
  const recorded = useRef(false);

  const cpuTurn = opp.cpu && s.turn === 1 && s.winner === null;
  const moves = s.winner === null ? legalMoves(s.board, s.turn, s.chain) : [];
  const movable = new Set(moves.map((m) => m.from.join(',')));
  const targets = sel ? moves.filter((m) => m.from[0] === sel[0] && m.from[1] === sel[1]) : [];
  const counts = [0, 1].map((c) => s.board.flat().filter((p) => p?.c === c).length);

  useEffect(() => {
    if (s.winner === null) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('checkers', s.winner);
    setTimeout(sfx.win, 300);
  }, [s.winner]);
  useEffect(() => { if (s.chain) setSel(s.chain); }, [s.chain]);

  const doMove = (m: Move) => {
    const next = apply(s, m);
    if (m.cap) sfx.capture(); else sfx.move();
    setS(next);
    setLast({ from: m.from, to: m.to, n: (last?.n ?? 0) + 1 });
    if (!next.chain) {
      setSel(null);
      if (autoFlip && !opp.cpu) setFlip(next.turn === 1);
    }
  };

  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => doMove(bestCheckersMove(s, opp.level)), s.chain ? 450 : 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, cpuTurn, opp.level]);

  const click = (r: number, c: number) => {
    if (s.winner !== null || cpuTurn) return;
    const m = targets.find((t) => t.to[0] === r && t.to[1] === c);
    if (m) doMove(m);
    else if (!s.chain && movable.has(`${r},${c}`)) { sfx.click(); setSel([r, c]); }
  };

  const reset = () => { setS(fresh()); setSel(null); setFlip(false); setLast(null); };
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  const rs = flip ? [...order].reverse() : order;
  const dRow = (r: number) => (flip ? 7 - r : r), dCol = (c: number) => (flip ? 7 - c : c);

  const status = s.winner !== null ? `${NAMES[s.winner]} WINS!`
    : cpuTurn ? 'CPU IS THINKING...'
    : s.chain ? `${NAMES[s.turn]}: JUMP AGAIN!`
    : moves.some((m) => m.cap) ? `${NAMES[s.turn]} TO MOVE · MUST JUMP` : `${NAMES[s.turn]} TO MOVE`;

  return (
    <div className="game split checkers">
      <div className="head">
        <ModeBar opp={opp} />
        <div className="status">{status}</div>
        <div className="captures">CREAM {counts[1]} · BERRY {counts[0]}</div>
      </div>
      <div className="main board">
        {rs.map((r) => rs.map((c) => {
          const p = s.board[r][c];
          const dark = (r + c) % 2 === 1;
          const t = targets.find((m) => m.to[0] === r && m.to[1] === c);
          const isSel = sel && sel[0] === r && sel[1] === c;
          const sliding = last && last.to[0] === r && last.to[1] === c;
          const style = sliding
            ? { ['--dx' as string]: `${(dCol(last.from[1]) - dCol(c)) * 116}%`, ['--dy' as string]: `${(dRow(last.from[0]) - dRow(r)) * 116}%` }
            : undefined;
          return (
            <button key={`${r}${c}`} className={`sq ${dark ? 'dark' : 'light'} ${isSel ? 'sel' : ''}`} onClick={() => click(r, c)} aria-label={`${r},${c}`}>
              {p && (
                <span key={sliding ? `s${last.n}` : 'p'} className={`piece ${sliding ? 'slide' : ''} ${!isSel && !cpuTurn && movable.has(`${r},${c}`) ? 'bob' : ''}`} style={style}>
                  <Disc side={p.c} king={p.k} px={4} />
                </span>
              )}
              {t && <span className="dot" />}
            </button>
          );
        }))}
      </div>
      <div className="foot">
      <div className="row">
        <button className="btn" onClick={() => setFlip(!flip)}>FLIP</button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      {!opp.cpu && (
        <label className="check-label">
          <input type="checkbox" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
          Auto-rotate each turn
        </label>
      )}
      <p className="hint">Berry starts at the bottom. Jumps are forced; reach the far row to crown a king.</p>
      </div>
      {s.winner !== null && <Celebrate title={`${NAMES[s.winner]} WINS!`} sub={opp.cpu ? (s.winner === 0 ? 'You beat the CPU!' : 'The CPU got you this time') : undefined} onAgain={reset} />}
    </div>
  );
}
