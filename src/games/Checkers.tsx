import { useEffect, useState } from 'react';
import Sprite from '../Sprite';
import { sfx } from '../lib/sfx';
import { apply, fresh, legalMoves } from '../lib/checkers';

const NAMES = ['PINK', 'CREAM'];
const FILL = ['#e0457b', '#fff3c4'];

export default function Checkers() {
  const [s, setS] = useState(fresh);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [flip, setFlip] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);

  const moves = s.winner === null ? legalMoves(s.board, s.turn, s.chain) : [];
  const movable = new Set(moves.map((m) => m.from.join(',')));
  const targets = sel ? moves.filter((m) => m.from[0] === sel[0] && m.from[1] === sel[1]) : [];
  const counts = [0, 1].map((c) => s.board.flat().filter((p) => p?.c === c).length);
  useEffect(() => { if (s.winner !== null) sfx.win(); }, [s.winner]);
  useEffect(() => { if (s.chain) setSel(s.chain); }, [s.chain]);

  const click = (r: number, c: number) => {
    if (s.winner !== null) return;
    const m = targets.find((t) => t.to[0] === r && t.to[1] === c);
    if (m) {
      const next = apply(s, m);
      m.cap ? sfx.capture() : sfx.move();
      setS(next);
      if (!next.chain) {
        setSel(null);
        if (autoFlip) setFlip(next.turn === 1);
      }
    } else if (!s.chain && movable.has(`${r},${c}`)) {
      sfx.click();
      setSel([r, c]);
    }
  };

  const reset = () => { setS(fresh()); setSel(null); setFlip(false); };
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  const rs = flip ? [...order].reverse() : order;

  const status = s.winner !== null ? `${NAMES[s.winner]} WINS!`
    : s.chain ? `${NAMES[s.turn]}: JUMP AGAIN!`
    : moves.some((m) => m.cap) ? `${NAMES[s.turn]} TO MOVE · MUST JUMP` : `${NAMES[s.turn]} TO MOVE`;

  return (
    <div className="checkers">
      <div className="status">{status}</div>
      <div className="captures">CREAM {counts[1]} · PINK {counts[0]}</div>
      <div className="board">
        {rs.map((r) => rs.map((c) => {
          const p = s.board[r][c];
          const dark = (r + c) % 2 === 1;
          const t = targets.find((m) => m.to[0] === r && m.to[1] === c);
          const isSel = sel && sel[0] === r && sel[1] === c;
          return (
            <button key={`${r}${c}`} className={`sq ${dark ? 'dark' : 'light'} ${isSel ? 'sel' : ''}`} onClick={() => click(r, c)} aria-label={`${r},${c}`}>
              {p && <span className={`piece ${!isSel && movable.has(`${r},${c}`) ? 'bob' : ''}`}><Sprite name={p.k ? 'kdisc' : 'disc'} fill={FILL[p.c]} outline="#14122b" size={100} /></span>}
              {t && <span className="dot" />}
            </button>
          );
        }))}
      </div>
      <div className="row">
        <button className="btn" onClick={() => setFlip(!flip)}>FLIP</button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      <label className="check-label">
        <input type="checkbox" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
        Auto-rotate each turn
      </label>
      <p className="hint">Pink starts at the bottom. Jumps are forced; reach the far row to crown a king.</p>
    </div>
  );
}
