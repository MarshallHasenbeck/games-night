import { useEffect, useState } from 'react';
import { sfx } from '../lib/sfx';

const R = 6, C = 7;
const NAMES = ['PINK', 'GOLD'];
type Grid = (0 | 1 | null)[][];
const empty = (): Grid => Array.from({ length: R }, () => Array(C).fill(null));

function findWin(g: Grid): [number, number][] | null {
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

export default function Connect4() {
  const [g, setG] = useState<Grid>(empty);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [last, setLast] = useState<[number, number] | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const win = findWin(g);
  const full = g[0].every((x) => x !== null);
  const over = !!win || full;
  const winSet = new Set((win ?? []).map((x) => x.join(',')));

  useEffect(() => {
    if (win) { sfx.win(); setScore((s) => (g[win[0][0]][win[0][1]] === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1])); }
  }, [!!win]); // eslint-disable-line react-hooks/exhaustive-deps

  const drop = (c: number) => {
    if (over) return;
    const r = [...Array(R).keys()].reverse().find((rr) => g[rr][c] === null);
    if (r === undefined) return;
    const ng = g.map((row) => [...row]);
    ng[r][c] = turn;
    sfx.move();
    setG(ng); setLast([r, c]); setTurn(turn === 0 ? 1 : 0);
  };
  const again = () => { setG(empty()); setLast(null); setTurn(0); };

  const status = win ? `${NAMES[g[win[0][0]][win[0][1]]!]} WINS!` : full ? 'DRAW!' : `${NAMES[turn]} TO DROP`;

  return (
    <div className="connect4">
      <div className="status">{status}</div>
      <div className="captures">PINK {score[0]} · GOLD {score[1]}</div>
      <div className="c4board">
        {Array.from({ length: C }, (_, c) => (
          <button key={c} className={`c4col ${over ? '' : `t${turn}`}`} onClick={() => drop(c)} aria-label={`column ${c + 1}`}>
            {Array.from({ length: R }, (_, r) => {
              const v = g[r][c];
              const isLast = last && last[0] === r && last[1] === c;
              return (
                <span key={r} className="c4cell">
                  {v !== null && <i className={`chip p${v} ${winSet.has(`${r},${c}`) ? 'win' : ''} ${isLast && !win ? 'drop' : ''}`} />}
                </span>
              );
            })}
          </button>
        ))}
      </div>
      <div className="row">
        <button className={`btn ${over ? 'primary' : ''}`} onClick={again}>{over ? 'PLAY AGAIN' : 'RESTART'}</button>
        <button className="btn" onClick={() => { again(); setScore([0, 0]); }}>RESET SCORE</button>
      </div>
      <p className="hint">Tap a column to drop a disc. Four in a row wins.</p>
    </div>
  );
}
