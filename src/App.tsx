import { useState } from 'react';
import Chess from './games/Chess';
import Yahtzee from './games/Yahtzee';
import PlayNine from './games/PlayNine';
import Checkers from './games/Checkers';
import Connect4 from './games/Connect4';
import { Pine } from './Sprite';
import { Scenery, Piece, Disc, ConnectDisc, DieArt, FlagArt } from './art';
import { isMuted, setMuted, sfx } from './lib/sfx';

const GAMES = [
  { id: 'chess', name: 'Chess', icon: <Piece side="w" type="n" px={6} />, blurb: 'Classic kings & pawns. Legal moves glow.', C: Chess },
  { id: 'checkers', name: 'Checkers', icon: <Disc side={0} king px={7} />, blurb: 'Jump, crown, conquer. Captures forced.', C: Checkers },
  { id: 'connect4', name: 'Connect 4', icon: <ConnectDisc px={7} />, blurb: 'Drop discs. Four in a row wins.', C: Connect4 },
  { id: 'yahtzee', name: 'Yahtzee', icon: <DieArt px={7} />, blurb: 'Roll, hold, score. 13 rounds.', C: Yahtzee },
  { id: 'playnine', name: 'Play Nine', icon: <FlagArt px={6} />, blurb: 'Card golf. We deal. Low score wins.', C: PlayNine },
] as const;

export default function App() {
  const [muted, setM] = useState(isMuted());
  const [id, setId] = useState<string | null>(() => location.hash.slice(1) || null);
  const go = (next: string | null) => {
    sfx.click();
    setId(next);
    location.hash = next ?? '';
  };
  const game = GAMES.find((g) => g.id === id);

  if (game) {
    return (
      <div className="shell">
        <Scenery />
        <header className="topbar">
          <button className="btn ghost" onClick={() => go(null)}>← Games</button>
          <h1>{game.name}</h1>
          <button className="btn ghost right" onClick={() => { setMuted(!muted); setM(!muted); }}>{muted ? 'SND OFF' : 'SND ON'}</button>
        </header>
        <game.C />
      </div>
    );
  }
  return (
    <div className="shell">
      <Scenery />
      <div className="hero"><Pine px={6} /><h1 className="title">GAME<br />NIGHT</h1><Pine px={6} /></div>
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
      <p className="credit"><span>2 players · 1 screen · pass the iPad</span></p>
    </div>
  );
}
