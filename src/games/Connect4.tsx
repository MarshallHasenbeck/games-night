import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { R, C, empty, findWin, landingRow, type Grid } from '../lib/connect4';
import { bestColumn } from '../cpu/connect4AI';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const NAMES = ['BERRY', 'SUN'];

export default function Connect4() {
  const opp = useOpponent('connect4');
  const [g, setG] = useState<Grid>(empty);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [last, setLast] = useState<[number, number, number] | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const recorded = useRef(false);
  const win = findWin(g);
  const full = g[0].every((x) => x !== null);
  const over = !!win || full;
  const winSet = new Set((win ?? []).map((x) => x.join(',')));
  const winner = win ? g[win[0][0]][win[0][1]]! : null;
  const cpuTurn = opp.cpu && turn === 1 && !over;

  useEffect(() => {
    if (!over) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('connect4', winner ?? 'draw');
    if (winner !== null) { setScore((s) => (winner === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1])); setTimeout(sfx.win, 350); }
  }, [over, winner]);

  const drop = (c: number, who: 0 | 1) => {
    const r = landingRow(g, c);
    if (r < 0) return;
    const ng = g.map((row) => [...row]);
    ng[r][c] = who;
    sfx.move();
    setG(ng); setLast([r, c, (last?.[2] ?? 0) + 1]); setTurn(who === 0 ? 1 : 0);
  };
  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => drop(bestColumn(g, 1, opp.level), 1), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, g, opp.level]);

  const again = () => { setG(empty()); setLast(null); setTurn(0); };
  const status = winner !== null ? `${NAMES[winner]} WINS!` : full ? 'DRAW!' : cpuTurn ? 'CPU IS THINKING...' : `${NAMES[turn]} TO DROP`;

  return (
    <div className="game split connect4">
      <div className="head">
        <ModeBar opp={opp} onChange={() => { again(); setScore([0, 0]); }} />
        <div className="status">{status}</div>
        <div className="captures">BERRY {score[0]} · SUN {score[1]}</div>
      </div>
      <div className="main c4board">
        {Array.from({ length: C }, (_, c) => (
          <button key={c} className={`c4col ${over || cpuTurn ? '' : `t${turn}`}`} onClick={() => !cpuTurn && !over && drop(c, turn)} aria-label={`column ${c + 1}`}>
            {Array.from({ length: R }, (_, r) => {
              const v = g[r][c];
              const isLast = last && last[0] === r && last[1] === c;
              return (
                <span key={r} className="c4cell">
                  {v !== null && (
                    <i
                      key={isLast ? `d${last![2]}` : 'c'}
                      className={`chip p${v} ${winSet.has(`${r},${c}`) ? 'win' : ''} ${isLast ? 'drop' : ''}`}
                      style={isLast ? { ['--rows' as string]: r + 1 } : undefined}
                    />
                  )}
                </span>
              );
            })}
          </button>
        ))}
      </div>
      <div className="foot">
      <div className="row">
        <button className={`btn ${over ? 'primary' : ''}`} onClick={again}>{over ? 'PLAY AGAIN' : 'RESTART'}</button>
        <button className="btn" onClick={() => { again(); setScore([0, 0]); }}>RESET SCORE</button>
      </div>
      <p className="hint">Tap a column to drop a disc. Four in a row wins.</p>
      </div>
      {over && <Celebrate title={winner !== null ? `${NAMES[winner]} WINS!` : 'DRAW!'} sub={opp.cpu && winner === 0 ? 'You beat the CPU!' : undefined} onAgain={again} />}
    </div>
  );
}
