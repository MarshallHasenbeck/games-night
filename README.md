# Game Night — forest edition

Seven two-player, one-screen games in a cozy 16-bit forest: **Chess**, **Checkers**, **Connect 4**, **Yahtzee**,
**Play Nine** (card golf), **Backgammon**, and **Dominoes**. Pass-and-play on one device, or play **vs CPU**
(Easy / Medium / Hard) in every game. The app rolls, deals, and scores for you.

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
