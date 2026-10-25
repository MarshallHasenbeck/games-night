import { useEffect, useRef, useState } from 'react';
import {
  CATS, LABEL, UPPER, LOWER, emptyCard, scoreFor, upperSum, upperBonus, total, isYahtzee, cpuHolds, cpuCategory, type Cat, type Card,
} from '../lib/yahtzee';
import { sfx } from '../lib/sfx';
import { Celebrate, ModeBar, useOpponent } from '../ui';
import { recordResult } from '../lib/stats';

const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand6 = () => 1 + Math.floor(Math.random() * 6);

function Die({ v, held, onClick, rolling, disabled }: { v: number; held: boolean; onClick: () => void; rolling: boolean; disabled: boolean }) {
  return (
    <button className={`die ${held ? 'held' : ''} ${rolling ? 'rolling' : ''}`} onClick={onClick} disabled={disabled || !v}>
      {v ? <span className="face">{Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[v].includes(i) ? 'pip' : ''} />)}</span> : '?'}
      {held && <em>HOLD</em>}
    </button>
  );
}

type S = {
  cards: [Card, Card]; bonus: [number, number]; turn: 0 | 1; dice: number[]; held: boolean[]; rolls: number;
  lastPick: { p: 0 | 1; cat: Cat; n: number } | null;
};
const fresh = (): S => ({
  cards: [emptyCard(), emptyCard()], bonus: [0, 0], turn: 0, dice: [0, 0, 0, 0, 0], held: Array(5).fill(false), rolls: 3, lastPick: null,
});

export default function Yahtzee() {
  const opp = useOpponent('yahtzee');
  const [s, setS] = useState<S>(fresh);
  const [tumble, setTumble] = useState<number[] | null>(null);
  const busy = useRef(false);
  const recorded = useRef(false);
  const names = ['P1', opp.cpu ? 'CPU' : 'P2'];
  const rolled = s.rolls < 3;
  const done = s.cards.every((c) => CATS.every((k) => c[k] !== null));
  const cpuTurn = opp.cpu && s.turn === 1 && !done;
  const t = [total(s.cards[0], s.bonus[0]), total(s.cards[1], s.bonus[1])];

  useEffect(() => {
    if (!done) { recorded.current = false; return; }
    if (recorded.current) return;
    recorded.current = true;
    recordResult('yahtzee', t[0] === t[1] ? 'draw' : t[0] > t[1] ? 0 : 1);
    setTimeout(sfx.win, 300);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const rollDice = (cur: number[], held: boolean[]) => new Promise<number[]>((res) => {
    sfx.roll();
    const fin = cur.map((d, i) => (held[i] ? d : rand6()));
    let n = 0;
    const id = setInterval(() => {
      if (++n >= 9) { clearInterval(id); setTumble(null); res(fin); }
      else setTumble(cur.map((d, i) => (held[i] ? d : rand6())));
    }, 70);
  });

  const roll = async () => {
    if (busy.current || s.rolls === 0 || done || cpuTurn) return;
    busy.current = true;
    const fin = await rollDice(s.dice, s.held);
    setS((p) => ({ ...p, dice: fin, rolls: p.rolls - 1 }));
    busy.current = false;
  };
  const toggle = (i: number) => {
    if (!rolled || tumble || cpuTurn) return;
    sfx.click();
    setS((p) => ({ ...p, held: p.held.map((h, j) => (j === i ? !h : h)) }));
  };

  const me = s.cards[s.turn];
  const joker = rolled && isYahtzee(s.dice) && me.yahtzee === 50 && me[UPPER[s.dice[0] - 1]] !== null;

  const commit = (cat: Cat) => {
    sfx.score();
    setS((p) => {
      const cards: [Card, Card] = [{ ...p.cards[0] }, { ...p.cards[1] }];
      const bonus: [number, number] = [...p.bonus];
      const jk = isYahtzee(p.dice) && cards[p.turn].yahtzee === 50;
      if (jk) bonus[p.turn]++;
      cards[p.turn][cat] = scoreFor(cat, p.dice, jk && cards[p.turn][UPPER[p.dice[0] - 1]] !== null);
      return { ...p, cards, bonus, turn: p.turn === 0 ? 1 : 0, dice: [0, 0, 0, 0, 0], held: Array(5).fill(false), rolls: 3, lastPick: { p: p.turn, cat, n: (p.lastPick?.n ?? 0) + 1 } };
    });
  };
  const pick = (cat: Cat) => {
    if (!rolled || tumble || cpuTurn || me[cat] !== null) return;
    if (joker && me[UPPER[s.dice[0] - 1]] === null && cat !== UPPER[s.dice[0] - 1]) return; // joker must use the matching open upper box
    commit(cat);
  };

  // computer player takes its whole turn with pauses so you can follow along
  useEffect(() => {
    if (!cpuTurn) return;
    let dead = false;
    const card = s.cards[1];
    (async () => {
      busy.current = true;
      await sleep(800);
      let dice = [0, 0, 0, 0, 0], rolls = 3, held = Array(5).fill(false) as boolean[];
      dice = await rollDice(dice, held); rolls--;
      if (dead) return;
      setS((p) => ({ ...p, dice, rolls }));
      while (rolls > 0 && !dead) {
        await sleep(800);
        const hm = cpuHolds(card, dice, opp.level);
        if (!hm || dead) break;
        held = hm;
        setS((p) => ({ ...p, held: hm }));
        await sleep(900);
        dice = await rollDice(dice, held); rolls--;
        if (dead) return;
        setS((p) => ({ ...p, dice, rolls }));
      }
      if (dead) return;
      await sleep(900);
      if (dead) return;
      commit(cpuCategory(card, dice));
      busy.current = false;
    })();
    return () => { dead = true; busy.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, s.turn]);

  const reset = () => { setS(fresh()); setTumble(null); busy.current = false; };
  const shown = tumble ?? s.dice;

  const row = (cat: Cat) => (
    <tr key={cat}>
      <th>{LABEL[cat]}</th>
      {[0, 1].map((p) => {
        const val = s.cards[p][cat];
        const can = p === s.turn && rolled && val === null && !done && !tumble && !cpuTurn;
        const pot = can ? scoreFor(cat, s.dice, joker && s.cards[p][UPPER[s.dice[0] - 1]] !== null) : null;
        const popped = s.lastPick && s.lastPick.p === p && s.lastPick.cat === cat;
        return (
          <td key={p} className={`${can ? 'can' : ''} ${p === s.turn ? 'cur' : ''}`} onClick={() => p === s.turn && pick(cat)}>
            {val !== null ? <span key={popped ? s.lastPick!.n : 0} className={popped ? 'popnum' : ''}>{val}</span> : pot !== null ? <span className="pot">{pot}</span> : ''}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="game split rev yahtzee">
      <div className="head">
      <ModeBar opp={opp} levels onChange={reset} />
      <div className="status">
        {done
          ? t[0] === t[1] ? `TIE AT ${t[0]}!` : `${names[t[0] > t[1] ? 0 : 1]} WINS ${Math.max(...t)}-${Math.min(...t)}!`
          : `${names[s.turn]} TURN · ${s.rolls} ROLL${s.rolls === 1 ? '' : 'S'} LEFT`}
      </div>
      <div className="dice">
        {shown.map((d, i) => <Die key={i} v={d} held={s.held[i]} rolling={!!tumble && !s.held[i]} disabled={cpuTurn || !!tumble} onClick={() => toggle(i)} />)}
      </div>
      <div className="row">
        <button className="btn primary" onClick={roll} disabled={s.rolls === 0 || done || cpuTurn || !!tumble}>
          {cpuTurn ? 'CPU PLAYING...' : s.rolls === 3 ? 'ROLL' : s.rolls ? 'ROLL AGAIN' : 'PICK A BOX'}
        </button>
        <button className="btn" onClick={reset}>NEW GAME</button>
      </div>
      <p className="hint">{rolled && !done && !cpuTurn ? <>Tap dice to HOLD. Tap a glowing box to score.{joker ? ' YAHTZEE BONUS +100!' : ''}</> : 'Roll up to 3 times, then fill one box.'}</p>
      </div>
      <table className="main score">
        <thead><tr><th /><th className={s.turn === 0 ? 'cur' : ''}>{names[0]}</th><th className={s.turn === 1 ? 'cur' : ''}>{names[1]}</th></tr></thead>
        <tbody>
          {UPPER.map(row)}
          <tr className="subrow"><th>Upper 63=+35</th>{[0, 1].map((p) => <td key={p}>{upperSum(s.cards[p])}{upperBonus(s.cards[p]) ? ' +35' : ''}</td>)}</tr>
          {LOWER.map(row)}
          <tr className="subrow"><th>Yahtzee bonus</th>{[0, 1].map((p) => <td key={p}>{s.bonus[p] ? `+${s.bonus[p] * 100}` : ''}</td>)}</tr>
          <tr className="total"><th>Total</th><td>{t[0]}</td><td>{t[1]}</td></tr>
        </tbody>
      </table>
      <div className="foot" />
      {done && <Celebrate title={t[0] === t[1] ? 'IT\'S A TIE!' : `${names[t[0] > t[1] ? 0 : 1]} WINS!`} sub={`${t[0]} to ${t[1]}`} onAgain={reset} />}
    </div>
  );
}
