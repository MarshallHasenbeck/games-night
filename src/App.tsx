import { useState } from 'react';
import Chess from './games/Chess';
import Yahtzee from './games/Yahtzee';
import PlayNine from './games/PlayNine';
import Sprite from './Sprite';
import { isMuted, setMuted, sfx } from './lib/sfx';

const GAMES = [
  { id: 'chess', name: 'Chess', icon: <Sprite name="n" fill="#ffd84a" outline="#14122b" size={64} />, blurb: 'Classic kings & pawns. Legal moves glow.', C: Chess },
  { id: 'yahtzee', name: 'Yahtzee', icon: <Sprite name="die" fill="#ff5c8a" outline="#14122b" size={64} />, blurb: 'Roll, hold, score. 13 rounds.', C: Yahtzee },
  { id: 'playnine', name: 'Play Nine', icon: <Sprite name="flag" fill="#5ce07a" outline="#14122b" size={64} />, blurb: 'Card golf. We deal. Low score wins.', C: PlayNine },
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
      <h1 className="title">GAME<br />NIGHT</h1>
      <p className="sub blink">PRESS A GAME TO START</p>
      <div className="menu">
        {GAMES.map((g) => (
          <button key={g.id} className="tile" onClick={() => go(g.id)}>
            <span className="tile-icon">{g.icon}</span>
            <span className="tile-name">{g.name}</span>
            <span className="tile-blurb">{g.blurb}</span>
          </button>
        ))}
      </div>
      <p className="credit">2 PLAYERS · 1 SCREEN · ♥</p>
    </div>
  );
}
