import { useEffect, useState } from 'react';
import {
  CATS, LABEL, UPPER, LOWER, emptyCard, scoreFor, upperSum, upperBonus, total, isYahtzee, type Cat, type Card,
} from '../lib/yahtzee';
import { sfx } from '../lib/sfx';

const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Die({ v, held, onClick, rolling }: { v: number; held: boolean; onClick: () => void; rolling: boolean }) {
  return (
    <button className={`die ${held ? 'held' : ''} ${rolling ? 'rolling' : ''}`} onClick={onClick} disabled={!v}>
      {v ? <span className="face">{Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[v].includes(i) ? 'pip' : ''} />)}</span> : '?'}
      {held && <em>HOLD</em>}
    </button>
  );
}

type S = { cards: [Card, Card]; bonus: [number, number]; turn: 0 | 1; dice: number[]; held: boolean[]; rolls: number };
const fresh = (): S => ({
  cards: [emptyCard(), emptyCard()], bonus: [0, 0], turn: 0, dice: [0, 0, 0, 0, 0], held: Array(5).fill(false), rolls: 3,
});

export default function Yahtzee() {
  const [s, setS] = useState<S>(fresh);
  const [rolling, setRolling] = useState(false);
  const names = ['P1', 'P2'];
  const rolled = s.rolls < 3;
  const done = s.cards.every((c) => CATS.every((k) => c[k] !== null));
  useEffect(() => { if (done) sfx.win(); }, [done]);

  const roll = () => {
    if (s.rolls === 0 || done) return;
    sfx.roll();
    setRolling(true);
    setTimeout(() => setRolling(false), 350);
    setS((p) => ({
      ...p,
      dice: p.dice.map((d, i) => (p.held[i] ? d : 1 + Math.floor(Math.random() * 6))),
      rolls: p.rolls - 1,
    }));
  };
  const toggle = (i: number) => rolled && (sfx.click(), setS((p) => ({ ...p, held: p.held.map((h, j) => (j === i ? !h : h)) })));

  const me = s.cards[s.turn];
  const joker = rolled && isYahtzee(s.dice) && me.yahtzee === 50 && me[UPPER[s.dice[0] - 1]] !== null;

  const pick = (cat: Cat) => {
    if (!rolled || me[cat] !== null) return;
    if (joker && me[UPPER[s.dice[0] - 1]] === null && cat !== UPPER[s.dice[0] - 1]) return; // joker: must use matching upper box if open
    sfx.score();
    setS((p) => {
      const cards: [Card, Card] = [{ ...p.cards[0] }, { ...p.cards[1] }];
      const bonus: [number, number] = [...p.bonus];
      const jk = isYahtzee(p.dice) && cards[p.turn].yahtzee === 50;
      if (jk) bonus[p.turn]++;
      cards[p.turn][cat] = scoreFor(cat, p.dice, jk && cards[p.turn][UPPER[p.dice[0] - 1]] !== null);
      return { ...p, cards, bonus, turn: p.turn === 0 ? 1 : 0, dice: [0, 0, 0, 0, 0], held: Array(5).fill(false), rolls: 3 };
    });
  };

  const t = [total(s.cards[0], s.bonus[0]), total(s.cards[1], s.bonus[1])];
  const row = (cat: Cat) => (
    <tr key={cat}>
      <th>{LABEL[cat]}</th>
      {[0, 1].map((p) => {
        const val = s.cards[p][cat];
        const can = p === s.turn && rolled && val === null && !done;
        const pot = can ? scoreFor(cat, s.dice, joker && s.cards[p][UPPER[s.dice[0] - 1]] !== null) : null;
        return (
          <td key={p} className={`${can ? 'can' : ''} ${p === s.turn ? 'cur' : ''}`} onClick={() => p === s.turn && pick(cat)}>
            {val ?? (pot !== null ? <span className="pot">{pot}</span> : '')}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="yahtzee">
      <div className="status">
        {done
          ? t[0] === t[1] ? `TIE AT ${t[0]}!` : `${names[t[0] > t[1] ? 0 : 1]} WINS ${Math.max(...t)}-${Math.min(...t)}!`
          : `${names[s.turn]} TURN · ${s.rolls} ROLL${s.rolls === 1 ? '' : 'S'} LEFT`}
      </div>
      <div className="dice">
        {s.dice.map((d, i) => <Die key={i} v={d} held={s.held[i]} rolling={rolling && !s.held[i]} onClick={() => toggle(i)} />)}
      </div>
      <div className="row">
        <button className="btn primary" onClick={roll} disabled={s.rolls === 0 || done}>
          {s.rolls === 3 ? 'ROLL' : s.rolls ? 'ROLL AGAIN' : 'PICK A BOX'}
        </button>
        <button className="btn" onClick={() => setS(fresh())}>NEW GAME</button>
      </div>
      {rolled && !done && <p className="hint">Tap dice to HOLD. Tap a glowing box to score.{joker ? ' YAHTZEE BONUS +100!' : ''}</p>}
      <table className="score">
        <thead><tr><th /><th className={s.turn === 0 ? 'cur' : ''}>P1</th><th className={s.turn === 1 ? 'cur' : ''}>P2</th></tr></thead>
        <tbody>
          {UPPER.map(row)}
          <tr className="subrow"><th>Upper 63=+35</th>{[0, 1].map((p) => <td key={p}>{upperSum(s.cards[p])}{upperBonus(s.cards[p]) ? ' +35' : ''}</td>)}</tr>
          {LOWER.map(row)}
          <tr className="subrow"><th>Yahtzee bonus</th>{[0, 1].map((p) => <td key={p}>{s.bonus[p] ? `+${s.bonus[p] * 100}` : ''}</td>)}</tr>
          <tr className="total"><th>Total</th><td>{t[0]}</td><td>{t[1]}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
