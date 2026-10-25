# Game Night — forest edition

Two-player, one-screen 8-bit board games: **Chess**, **Checkers**, **Connect 4**, **Yahtzee**, and **Play Nine** (card golf).
Pass-and-play — the app rolls, deals and scores. Built with Vite + React + TypeScript; chess rules via `chess.js`.

```
npm install
npm run dev      # local, also reachable from your iPad on the same Wi-Fi
npm run build    # static site in dist/
```

Deploys to GitHub Pages on every push to `main` (see `.github/workflows/pages.yml`).
Enable it once under Settings → Pages → Source: **GitHub Actions**.
On iPad: Share → Add to Home Screen for a full-screen app.
