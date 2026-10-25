# Game Night — forest edition

Eleven pass-and-play games for one screen in a cozy pixel-art forest: **Chess**, **Checkers**, **Connect 4**, **Yahtzee**,
**Play Nine** (card golf), **Backgammon**, **Mancala**, **Battleship**, **Dominoes**, plus the 2-4 player race games
**Acorn Pop** (dice) and **Slide & Swap** (cards). Play against a friend on the same device, or **vs CPU**
(Easy / Medium / Hard). The app rolls, deals, and scores for you.

**Developing it? Start with [`docs/DEV-GUIDE.md`](docs/DEV-GUIDE.md).**

- Animated pieces, tumbling dice, flipping and dealt cards, dropping discs, and confetti wins
- Day / dusk / night landscape (auto from your clock, or tap the toggle), with falling leaves and fireflies
- All-time scoreboard saved on the device (localStorage)
- Dominoes has a "pass the iPad" screen so hidden hands stay hidden

```
npm install
npm run dev      # local, also reachable from your iPad on the same Wi-Fi
npm run build    # static site in dist/
```

Deploys to GitHub Pages on every push to `main` (see `.github/workflows/pages.yml`).
On iPad: Share → Add to Home Screen for a full-screen app.
