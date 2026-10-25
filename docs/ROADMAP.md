# Roadmap

## Saved for later: 2-player on separate devices (online play)

**Goal:** each player uses their own phone/iPad. One creates a game and gets a 4-letter room code (or a share link),
the other joins with it. Moves sync live. Pass-the-iPad curtains are no longer needed in this mode.

### Rough plan
1. **Rooms:** "Play online" toggle next to 2 PLAYERS / VS CPU in every game → Create room / Join with code.
2. **Sync layer** (pick one):
   - **Supabase Realtime** (recommended): a `rooms` table (code, game, state JSON, turn, players) + Realtime channel.
     Free tier is plenty. Needs one small project + anonymous auth; no server code to maintain.
   - **WebRTC peer-to-peer** (e.g. PeerJS): no database, but needs a signaling server and can fail on some networks.
3. **Shared game state:** every game is already a pure state machine in `src/lib/*.ts`
   (`apply(state, move) -> state`), so online play = send the move, both devices apply it. Add a `mySeat: 0 | 1`
   so each device only lets its own player act.
4. **Hidden information** (needs care so the other player can't peek):
   - Dominoes hands and Battleship fleets: keep each player's secret part private (only send the *result* of a move,
     e.g. "hit / miss / sunk"), never the whole state.
   - Play Nine face-down cards and the deck order: dealt by one side, only revealed cards sent.
   - Chess, Checkers, Connect 4, Backgammon, Mancala, Yahtzee have no hidden info (Backgammon/Yahtzee dice must be
     rolled by one authority so both players see the same roll).
5. **Polish:** reconnect on refresh (store room code + seat in localStorage), "waiting for opponent…", rematch,
   resign/leave, and a simple presence indicator.

### Suggested order
Connect 4 → Checkers → Chess → Mancala (simplest, no hidden info) → Backgammon → Yahtzee → Play Nine →
Dominoes → Battleship (most hidden information).

## Other ideas
- Custom player names and colors
- Cribbage, Go Fish, Uno-style card game
- Daily puzzle / achievements
