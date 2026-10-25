# Game Night

Pixel-art forest pass-and-play games (Vite + React 19 + TS). **Read `docs/DEV-GUIDE.md` first** — it has the project map, the iOS layout rules
(never use vh/vw/innerWidth; use `--app-h`/`--app-w`), how to add a game, and the checks in `tools/`.

- Deploy = push to `main` (GitHub Pages). Don't touch the separate `gettoit-app` repo.
- Before finishing layout work: `npm run build`, then `npm run preview` and run `node tools/noscroll.cjs` and `node tools/iph.cjs`.
- Players are P1–P4 (CPU n for computer seats), never themed colour names.
