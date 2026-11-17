# Game Night — developer guide (for working on it from your iMac)

A personal, pixel-art "forest" web app of pass-and-play board and card games for iPad / iPhone / desktop.
Live site: **https://marshallhasenbeck.github.io/games-night/** · Repo: **github.com/MarshallHasenbeck/games-night** (public, deploys on every push to `main`).

It is completely separate from the `gettoit-app` repo — don't mix them.

---

## 1. Get it running on the iMac

```bash
git clone https://github.com/MarshallHasenbeck/games-night.git
cd games-night
npm install
npm run dev          # http://localhost:5173 ; also reachable from your phone/iPad on the same Wi-Fi (--host)
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build (http://localhost:4173)
```

Needs Node 20+ (any recent LTS). To test on your iPad/iPhone: run `npm run dev`, then open `http://<iMac-IP>:5173` on the device.
**Deploy = `git push origin main`** (GitHub Actions publishes to Pages in ~30 s; see `.github/workflows/pages.yml`). Reload / close the tab on iOS afterwards — Safari caches hard.

### Working with Claude Code on the iMac
1. Install Claude Code (https://docs.claude.com/claude-code), then run `claude` inside the `games-night` folder.
2. `CLAUDE.md` in the repo root points it at this guide, so it starts with the right context.
3. Useful asks: "read docs/DEV-GUIDE.md", "run tools/noscroll.cjs and tell me which games scroll", "add X to Y and test it at iPad + iPhone sizes".
4. Screenshots help a lot: iPad/iPhone photos or screen recordings of what looks wrong, plus the `?debug` overlay (see §6).

---

## 2. Tech stack
- **Vite + React 19 + TypeScript** single-page app, **hash routing** (`#chess`, `#acorn` …), no router library, `base: './'` for GitHub Pages.
- `chess.js` for chess rules. Everything else is hand-written.
- **No images checked in** for the art: pieces, cards, boards, landscape, icons are **drawn procedurally** (canvas → data URL, or SVG rects) in pixel-art style.
- Sounds are generated with WebAudio (`src/lib/sfx.ts`), no audio files.
- State is local React state; scores/settings live in `localStorage` (`gn-*` keys).

## 3. Project map
```
src/
  main.tsx            mounts App; viewport/size system (--app-w/--app-h/data-fit, auto-fit, scroll pinning, ?debug overlay)
  App.tsx             menu, day/dusk/night toggle, sound toggle, rules auto-open, GAMES list (add new games here)
  styles.css          ALL styling, in layers (base → per game → phone/landscape rules → later fixes). Later rules win.
  rules.ts            "How to play" text for every game (RulesModal in ui.tsx shows it)
  ui.tsx              ModeBar (2P/CPU), SeatPicker (2-4 seats), Celebrate (win screen), Overlay (portal), RulesModal
  art.tsx / Sprite.tsx / racers.tsx / boardart.ts   pixel art: pieces, scenery, farm animals, acorn & mushroom pawns, board textures
  games/*.tsx         one UI component per game
  lib/*.ts            pure game logic (state machines) — no React; easy to test with tsx
  lib/seats.ts, stats.ts, sfx.ts, theme.ts
tools/                Playwright checks + logic tests (see §7)
docs/ROADMAP.md       saved ideas (online play etc.)
```

### The 11 games
| Game | Logic | CPU | Notes |
|---|---|---|---|
| Chess | chess.js | `cpu` in `chessAI` | undo, flip board, auto-rotate |
| Checkers | `lib/checkers.ts` | `checkersAI` | forced captures |
| Connect 4 | `lib/connect4.ts` | `connect4AI` | |
| Yahtzee | `lib/yahtzee.ts` | in lib | scorecard |
| Play Nine | `lib/playnine.ts` | `cpuDecide` | 9 holes, tap-to-place/flip, flying-card animation, official scoring (-5 pairs, four-of-a-kind bonus) |
| Backgammon | `lib/backgammon.ts` | in lib | |
| Mancala (Kalah) | `lib/mancala.ts` | minimax | stones hop between pits (Web Animations) |
| Battleship | `lib/battleship.ts` | in lib | pass-the-iPad curtain, ponds laid out absolutely (Safari bug) |
| Dominoes | `lib/dominoes.ts` | in lib | hidden hands + hand-off screen |
| **Acorn Pop** | `lib/acorn.ts` | in lib | Trouble-style dice race, 2–4 players, per-seat HUMAN/CPU |
| **Slide & Swap** | `lib/slide.ts` | in lib | Sorry!-style card race, slides, swap, 7-split, 2–4 players |

### Adding a new game (checklist)
1. `src/lib/<game>.ts` — pure state + legal-move functions (+ simple CPU). Write a quick `tools/tests/*.ts` that plays hundreds of random games and asserts invariants.
2. `src/games/<Game>.tsx` — default-export component using `ModeBar`/`useOpponent` (2 players) or `SeatPicker`/`useSeatCfg` (2-4), `Celebrate` for the win, `recordResult('<id>', 0|1|'draw')`.
3. Register it in `App.tsx` (`GAMES`) and add a section to `rules.ts`.
4. Layout: wrap in `<div className="game <id>">` with `.head` / `.main` / `.foot`; size boards with a `--bs`-style CSS variable derived from `--app-h` / `--app-w` (never raw `vh`/`vw`, see §5). Add `[data-fit="phone"]` and `[data-fit="land"]` rules.
5. Run `tools/noscroll.cjs` and `tools/iph.cjs` (see §7) — nothing may scroll or overflow at iPad/iPhone sizes.

---

## 4. Look & feel rules
- Palette tokens are CSS variables at the top of `styles.css` (`--wood`, `--parch`, `--berry`, …). Fonts: *Pixelify Sans* (UI) and *Fredoka* (numerals).
- Players are **P1 / P2 / P3 / P4** (`CPU n` when a seat is CPU) — colours red, blue, green, yellow (`PLAYER_COLORS`). Don't invent themed names.
- Style goal: "Stardew-ish 12-bit" — pixel art, but softened. Keep the background landscape as is; add to it rather than changing it.
- Everything should animate a little: dealing, flipping, hopping, bumping, bursts (`FxLayer` in `racers.tsx`), idle bobbing.
- Don't make buttons for things a tap on the piece/card can do. Keep layouts **stable** (nothing shifts when text changes — reserve space).

## 5. Hard-won iOS / layout lessons (read before touching layout!)
These all caused real bugs on the iPad Air 13" / iPhone 14 Pro Max:
- **Never size from `vh`/`vw`/`window.innerWidth`.** iOS leaves them stale after rotation and `100vh` ≠ visible height. Use `var(--app-h)` / `var(--app-w)`, which `main.tsx` measures from an invisible fixed "probe" element (+ `ResizeObserver`). All old `vw` units were converted to `calc(var(--app-w) * N / 100)`.
- `data-fit="phone" | "land"` is set on `<html>` for small screens; it must be **absent** (not empty) on iPad, because `[data-fit]` matches an empty attribute.
- **Game screens never scroll.** `main.tsx` pins the page (`html[data-fitted] body {position:fixed}`) and, if content is taller than the screen, scales the `.shell` down (transform) to fit. iOS ignores `overflow:hidden` on body, hence `position:fixed`, `scrollTo(0,0)` resets, and a snap-back listener.
- The home menu may scroll — so opening a game resets the scroll several times (stale scroll offsets pushed games off-screen on iPad).
- `viewport-fit=cover` is only enabled on phones (JS in `main.tsx`); iPads use the plain viewport.
- The background (`.scenery`) is `position: fixed` and sized from `--app-h`; the landscape/farm animals sit on the *visible* bottom; the page colour (html) is grass-green and **body must stay transparent** (a painted body covers the z-index:-1 scenery).
- A transformed ancestor breaks `position: fixed` → popups are rendered through `Overlay` (portal to `<body>`).
- Class-name collisions bit us several times (`.ring`, `.mid`, `.critters`, `.peg`): use game-specific prefixes (`.apc`, `.slc`, `.pnmid`, …).
- Percent `padding` is relative to the container *width* — don't use it inside pieces.
- Safari quirks: `aspect-ratio` + grid rows (Battleship ponds are laid out with absolute positioning instead), buttons stretch grid rows, `container-type` is fine.
- Bobbing/animated elements fail Playwright "not stable" clicks → use `{ force: true }` in tests.

## 6. Debugging on the device
Open the site with **`?debug`** (e.g. `…/games-night/?debug#acorn`) → a green overlay shows build stamp, probe size, inner size, screen size, scroll, fit/scale. Screenshots of that overlay are the fastest way to diagnose iPad/iPhone layout bugs.

## 7. Tests / checks (`tools/`)
Browser checks need Playwright (`npm i -D playwright && npx playwright install chromium`) and `npm run build && npm run preview` running on port 4173.
```bash
node tools/noscroll.cjs     # every game × 11 iPad/iPhone sizes: nothing scrolls/overflows (prints @0.9 where auto-fit had to shrink)
node tools/iph.cjs          # same for real iPhone Safari sizes (portrait + landscape)
node tools/flow.cjs         # Play Nine play-through (16 assertions: controls, turn banner, skip, next hole, new game)
node tools/prompt.cjs       # Play Nine layout is identical while drawing / taking discard / flipping
node tools/stale.cjs <outdir>   # rotation with stale innerWidth/innerHeight (the iOS bug) still lays out right
npx tsx tools/tests/playnine-scoring.ts   # scoring vs reference on 50k deals
npx tsx tools/tests/acorn-engine.ts       # 400 simulated games, invariants
npx tsx tools/tests/slide-engine.ts       # 300 simulated games
npx tsx tools/tests/slide-rules.ts        # slide / sorry / swap / 7-split cases
```
Scripts take an optional output folder for screenshots as `argv[2]`.

## 8. Rules sources / decisions worth remembering
- **Play Nine** official scoring: matched column = 0; **two −5 cards in a column do NOT cancel** (−10); two columns matching the same number ("four of a kind") = −10 bonus (−15 / −20 for 3 / 4 columns). The official rulebook text wasn't found directly (sources: Kingpanda/Geeky Hobbies guides) — treat the −15/−20 as the least certain.
  Skip rule: with one face-down card you may draw and skip. 108-card deck (0–12 ×8 plus four −5).
- **Acorn Pop** (Trouble-like): 32 squares, 6 to leave the pen (3 tries if nothing is out), 6 = roll again, bump = back to pen, exact count into 4 home slots.
- **Slide & Swap** (Sorry!-like): 60 squares, cards 1,2,3,4(back),5,7(split),8,10,11(swap),12,Sorry!; slides of other colours bump everyone on them; safe zone + exact home.

## 9. Known open items / ideas
- **Online play on separate devices** — decided: Supabase Realtime in a *new* project (not the gettoit one); not set up yet. Battleship + Play Nine first, then the rest; sync layer must support up to 4 seats (see `docs/ROADMAP.md`).
- Verify on real devices after each layout change: iPad Air 13" (Safari, landscape + portrait) and iPhone 14 Pro Max (portrait, landscape, rotating between them). Rotation/viewport handling was the most fragile area.
- Mancala in iPhone portrait is small — idea: lay the board out vertically.
- Play Nine: user once reported both players scoring −3 in a hole; couldn't reproduce (scoring matches a reference implementation). If it happens again, get a screenshot of both grids.
- Ideas: custom player names/colours, more games (Cribbage, Go Fish, Uno-style), achievements.

## 10. Working style notes (from the owner)
- Wants honest reporting: say what was tested vs. only built; no overclaiming.
- Mostly plays on an **iPad Air 13" (M4)** in Safari/home-screen mode and an **iPhone 14 Pro Max** — those are the targets that matter.
- Prefers few clarifying questions; likes cute/animated polish; wants nothing to scroll or shift on game screens.
- Deploys happen by pushing to `main` once they say so.
