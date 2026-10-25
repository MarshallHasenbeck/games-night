import { useEffect, useState } from 'react';
import Chess from './games/Chess';
import Yahtzee from './games/Yahtzee';
import PlayNine from './games/PlayNine';
import Checkers from './games/Checkers';
import Connect4 from './games/Connect4';
import Backgammon from './games/Backgammon';
import Dominoes from './games/Dominoes';
import Mancala from './games/Mancala';
import Battleship from './games/Battleship';
import AcornPop from './games/AcornPop';
import SlideSwap from './games/SlideSwap';
import { AcornPiece, MushroomPiece } from './racers';
import { Scenery, Piece, Disc, ConnectDisc, DieArt, FlagArt, BoardIcon, DominoArt, TreeIcon, Boat } from './art';
import { isMuted, setMuted, sfx } from './lib/sfx';
import { cycleTime, useTime } from './lib/theme';
import { getStats, resetStats } from './lib/stats';
import { RulesModal } from './ui';

const GAMES = [
  { id: 'chess', name: 'Chess', icon: <Piece side="w" type="n" px={5} />, blurb: 'Classic kings & pawns. Legal moves glow.', C: Chess },
  { id: 'checkers', name: 'Checkers', icon: <Disc side={0} king px={5} />, blurb: 'Jump, crown, conquer. Captures forced.', C: Checkers },
  { id: 'connect4', name: 'Connect 4', icon: <ConnectDisc px={5} />, blurb: 'Drop discs. Four in a row wins.', C: Connect4 },
  { id: 'yahtzee', name: 'Yahtzee', icon: <DieArt px={7} />, blurb: 'Roll, hold, score. 13 rounds.', C: Yahtzee },
  { id: 'playnine', name: 'Play Nine', icon: <FlagArt px={6} />, blurb: 'Card golf. We deal. Low score wins.', C: PlayNine },
  { id: 'backgammon', name: 'Backgammon', icon: <BoardIcon px={5} />, blurb: 'Race, hit, and bear off. We roll.', C: Backgammon },
  { id: 'mancala', name: 'Mancala', icon: <span style={{ display: 'flex' }}><ConnectDisc px={3} side={0} /><ConnectDisc px={3} /></span>, blurb: 'Sow stones, capture pits, fill your store.', C: Mancala },
  { id: 'battleship', name: 'Battleship', icon: <span style={{ display: 'block', width: 70, height: 26 }}><Boat len={3} id={3} /></span>, blurb: 'Hunt the cute little boats. Pass-the-iPad secret!', C: Battleship },
  { id: 'acorn', name: 'Acorn Pop', icon: <span style={{ display: 'block', width: 45, height: 50 }}><AcornPiece color={0} /></span>, blurb: 'Pop the dice, race your acorns home. 2-4 players!', C: AcornPop },
  { id: 'slide', name: 'Slide & Swap', icon: <span style={{ display: 'block', width: 45, height: 45 }}><MushroomPiece color={1} /></span>, blurb: 'Draw cards, slide, bump, swap. A friendly race!', C: SlideSwap },
  { id: 'dominoes', name: 'Dominoes', icon: <DominoArt px={5} />, blurb: 'Match the ends. First to 100.', C: Dominoes },
] as const;

function Scoreboard() {
  const [stats, setStats] = useState(getStats);
  const rows = GAMES.filter((g) => stats[g.id]);
  if (!rows.length) return null;
  const tot = rows.reduce((a, g) => ({ p1: a.p1 + stats[g.id].p1, p2: a.p2 + stats[g.id].p2 }), { p1: 0, p2: 0 });
  return (
    <div className="board-card">
      <h3>SCOREBOARD</h3>
      <table>
        <thead><tr><th /><th>P1</th><th>P2</th><th>DRAWS</th></tr></thead>
        <tbody>
          {rows.map((g) => <tr key={g.id}><th>{g.name}</th><td className={stats[g.id].p1 > stats[g.id].p2 ? 'lead' : ''}>{stats[g.id].p1}</td><td className={stats[g.id].p2 > stats[g.id].p1 ? 'lead' : ''}>{stats[g.id].p2}</td><td>{stats[g.id].draws || ''}</td></tr>)}
          <tr className="total"><th>ALL GAMES</th><td>{tot.p1}</td><td>{tot.p2}</td><td /></tr>
        </tbody>
      </table>
      <button className="btn small" onClick={() => { resetStats(); setStats({}); }}>RESET SCORES</button>
    </div>
  );
}

export default function App() {
  const [muted, setM] = useState(isMuted());
  const { mode, resolved } = useTime();
  const [id, setId] = useState<string | null>(() => location.hash.slice(1) || null);
  const go = (next: string | null) => {
    sfx.click();
    setId(next);
    location.hash = next ?? '';
    window.scrollTo(0, 0);
  };
  const game = GAMES.find((g) => g.id === id);
  const [rulesOpen, setRulesOpen] = useState(false);
  // first time in each game, show how to play
  useEffect(() => {
    if (!id) return;
    try {
      if (!localStorage.getItem(`gn-rules-${id}`)) { localStorage.setItem(`gn-rules-${id}`, '1'); setRulesOpen(true); }
    } catch { /* ignore */ }
  }, [id]);
  const toggles = (
    <div className="toggles">
      {game && <button className="btn ghost help" onClick={() => { sfx.click(); setRulesOpen(true); }}>? RULES</button>}
      <button className="btn ghost" onClick={() => { cycleTime(); sfx.click(); }}>{mode === 'auto' ? `AUTO·${resolved.toUpperCase()}` : mode.toUpperCase()}</button>
      <button className="btn ghost" onClick={() => { setMuted(!muted); setM(!muted); }}>{muted ? 'SND OFF' : 'SND ON'}</button>
    </div>
  );

  if (game) {
    return (
      <>
        <Scenery />
        <div className="shell" key={game.id}>
        <header className="topbar">
          <button className="btn ghost" onClick={() => go(null)}>← Games</button>
          <h1>{game.name}</h1>
          {toggles}
        </header>
        <game.C />
        </div>
        {rulesOpen && <RulesModal game={game.id} onClose={() => setRulesOpen(false)} />}
      </>
    );
  }
  return (
    <>
    <Scenery />
    <div className="shell">
      <div className="menutop">{toggles}</div>
      <div className="hero"><TreeIcon h={34} px={3} /><h1 className="title">GAME{' '}<br />NIGHT</h1><TreeIcon h={34} px={3} /></div>
      <p className="sub blink"><span>Pick a game, grab a friend</span></p>
      <div className="menu">
        {GAMES.map((g) => (
          <button key={g.id} className="tile" onClick={() => go(g.id)}>
            <span className="tile-icon">{g.icon}</span>
            <span className="tile-name">{g.name}</span>
            <span className="tile-blurb">{g.blurb}</span>
          </button>
        ))}
      </div>
      <Scoreboard />
      <p className="credit"><span>2 players · or vs CPU · pass the iPad</span></p>
    </div>
    </>
  );
}
