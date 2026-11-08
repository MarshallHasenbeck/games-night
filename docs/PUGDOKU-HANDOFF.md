# Pugdoku iOS app: handoff (cloud session → desktop session)

Branch: `claude/sharp-planck-syrpbf` on `MarshallHasenbeck/games-night` (pushed; not merged to `main`, no PR opened).
Goal from Marshall: turn Pugdoku into an **iPhone + iPad app**, **solo only**, **offline**, **one-time purchase $2.99**, solid puzzle generation, **local saves + iCloud save sync**.
Next step: Marshall starts a desktop Claude Code session in `~/Desktop/pugdoku` (a folder he made) to continue. `~/Desktop/pug-puzzle` is a separate, older folder (the original puzzle tooling) — not touched.

## IMPORTANT: web app must stay as-is
Marshall wants the **web version of Games Night / Pugdoku (2-player co-op, deployed on GitHub Pages) kept untouched.**
This session already made small edits to shared web files *before* he said so. They should not change web behaviour, but they should be **reverted** and the app made self-contained:

| File | What I changed | Revert to |
|---|---|---|
| `src/games/Pugdoku.tsx` | `export` added to `function PugWin` | `main` |
| `src/lib/pugdoku.ts` | `makePuzzle(n, accept?)` — optional filter param | `main` |
| `src/lib/pugdoku.worker.ts` | also accepts `{diff}` messages (number messages still work) | `main` |
| `package.json` / `package-lock.json` | added `"workspaces": ["apps/*"]` + Capacitor deps hoisted into root lockfile | `main` |
| `docs/DEV-GUIDE.md` | one line pointing at the iOS doc | `main` |
| `.github/workflows/pugdoku-ios.yml` | new (macOS build check + logic tests) | keep or move into the standalone project |

Plan agreed in principle (Marshall hasn't explicitly said "go" to the revert): make `apps/pugdoku/` **fully self-contained** — copy in the shared files it imports (`src/lib/pugdoku*.ts`, `pugdoku-bank.ts`, `pugdoku-logic.ts`, `pugdoku-gen.ts`, `pugdoku.worker.ts`, `src/art.tsx`, `src/Sprite.tsx`, `src/ui.tsx`, `src/styles.css`, `src/lib/{sfx,theme,seats}.ts`, `src/assets/pug.png`, the `PugWin` component), give it its own `package.json` (no workspace), fix import paths (they currently use `../../../src/...`), then `git checkout main -- <web files above>`. Cost: duplicated code.

## What was built
**Everything new is in `apps/pugdoku/` plus these shared files:** `src/lib/pugdoku-logic.ts`, `src/lib/pugdoku-gen.ts` (new), tests `tools/tests/pugdoku-logic.ts`, `tools/tests/pugdoku-app.ts`, `tools/pugapp.cjs`, docs `docs/PUGDOKU-IOS.md` (release checklist, read it).

### 1. Puzzle quality (`src/lib/pugdoku-logic.ts`, `pugdoku-gen.ts`)
- Existing generator proved *exactly one answer* but not that logic could reach it. Added a human-style **deduction solver** that rates puzzles 1–5: 1 last spot in a unit; 2 colour fits one row/col or "touches every remaining spot"; 3–4 groups of 2–3 units squeezed into as many lines; 5 "what if" single-step contradiction.
- Result on the shipped bank: **all 789 puzzles are solvable by logic alone** (0 need guessing). Ratings are spread, ~20% need level 5.
- Tiers (`TIERS`): relaxed 5×5 level 1–2, easy 5×5 1–3, medium 7×7 2–4, hard 9×9 3–5. Bank picks and the live Web Worker generator only serve puzzles in-band, verified unique.
- Live hard (9×9) generation ≈ 3 s/puzzle on the dev box (fine in a worker; the bank covers instant starts: 136 hard puzzles × 8 orientations × shuffled colours).
- **HINT** = same solver: finds next real deduction, explains it in words, applies it (places pug or fills ✕ marks). Falls back to revealing a pug if the board is contradictory (relaxed-mode wrong pug).

### 2. App (`apps/pugdoku/src`)
- `game.ts` pure, serialisable state: tap / double-tap-to-place, drag-paint ✕, undo (can't undo mistakes: red ✕ and lost treats stay), clear ✕, hint, win/lose, restart. 3 treats, **3 hints** (web has 2), relaxed = no treats.
- `Play.tsx` board screen (portrait = board over controls; landscape = board left, panel right), `App.tsx` home (Continue, 4 difficulties w/ solved/best, How to Play, Stats, Settings), `Modals.tsx`, `supply.ts` (bank + worker), `viewport.ts` (probe-based `--app-w/--app-h`, safe-area vars, `data-fit`; follows the repo's no-vh/vw rule), `app.css` (prefix `pdk-`). Reuses forest scenery, wood buttons, board CSS (`pgd*`), `PugWin` from the web code via imports.
- Fonts bundled (`@fontsource/pixelify-sans`, `@fontsource/fredoka`) — web version loads Google Fonts, which would break offline.

### 3. Saves + iCloud
- `store.ts`: local save in Capacitor Preferences (UserDefaults), debounced autosave per move + every 10 s of clock + on background (`visibilitychange` / Capacitor `pause`).
- iCloud via **`NSUbiquitousKeyValueStore`** (small saves, no CloudKit schema): native plugin `ios/App/App/ICloudStorePlugin.swift`, registered in `PugViewController.swift` (SceneDelegate uses it), JS wrapper `icloud.ts`. Entitlement `App.entitlements` (`com.apple.developer.ubiquity-kvstore-identifier`).
- `merge.ts` (pure, tested): newest puzzle-in-progress wins (`g:null` tombstone when a puzzle finishes); **stats are per-device and summed** so two offline devices never overwrite each other; best time = min; damaged cloud data is ignored. Push to iCloud debounced 5 s, immediate on background.

### 4. Native project (Capacitor 8, generated with `npx cap add ios` on Linux, hand-edited)
- bundle id `com.marshallhasenbeck.pugdoku` (in `capacitor.config.ts` and the Xcode project), `TARGETED_DEVICE_FAMILY = "1,2"` (iPhone+iPad), deployment target iOS 15, all orientations on iPad.
- Added by hand to `project.pbxproj`: the two Swift files, `App.entitlements` (CODE_SIGN_ENTITLEMENTS), `PrivacyInfo.xcprivacy` (UserDefaults reason CA92.1, no tracking, no data collected). Info.plist: `ITSAppUsesNonExemptEncryption=false`, `arm64`, light status bar.
- App icon: placeholder (pug on sky gradient, 1024², generated with PIL). Splash: Capacitor default.
- **$2.99 paid-up-front needs no in-app-purchase code** — it's an App Store Connect price setting.

## Verified vs NOT verified
Verified (on Linux):
- `npx tsx tools/tests/pugdoku-bank.ts` — bank unique-answer check (unchanged, still passes).
- `npx tsx tools/tests/pugdoku-logic.ts` — all 789 bank puzzles logic-solvable; live generator respects tier bands for all 4 tiers.
- `npx tsx tools/tests/pugdoku-app.ts` — moves, wrong guess/treats, relaxed, undo rules, drag, **hints alone solve 132 bank puzzles across every size**, merge (order-independent, idempotent, tombstones, bad data rejected).
- `tsc` for the app, `npm run build` for both app and root web build.
- `node tools/pugapp.cjs [outdir]` (needs `cd apps/pugdoku && npm run build && npx vite preview --port 4174`): 11 iPhone/iPad sizes × 4 difficulties — no overflow/overlap; play-through (place ✕, undo, hint, leave→Continue→reload restores, win, stats recorded, finished game cleared). Short landscape iPhones: Home screen scrolls slightly (allowed; game screens don't).

**NOT verified — needs the Mac:**
- Nothing has been compiled by Xcode or run in the iOS Simulator / on a device. The Swift plugin and the hand-edited `project.pbxproj` are untested (the macOS GitHub workflow was added but has not been seen running).
- iCloud sync between two real devices, haptics, WKWebView module-worker support (should be fine iOS 15+; the app falls back to the bank if the worker fails), Capacitor `confirm()` dialog, safe-area/notch layout (simulated only with Chromium).
- Pop-up (`rules-overlay`) styling and the win screen in landscape on small phones weren't screenshotted.

## Suggested next steps (desktop session)
1. `git clone -b claude/sharp-planck-syrpbf https://github.com/MarshallHasenbeck/games-night.git` (or fetch into the desktop folder), `npm install`, run the three `tools/tests` scripts to confirm the same results.
2. Do the self-contained split + revert web files (table above); re-run `tsc`, build, tests, `tools/pugapp.cjs`; make sure `main`'s web build is identical.
3. On the iMac: `cd apps/pugdoku && npm run sync && npm run open`; set Team in Signing & Capabilities; confirm iCloud → Key-value storage; build to Simulator (iPhone + iPad), fix any compile errors in `ICloudStorePlugin.swift` / pbxproj.
4. Real devices via TestFlight: layout, haptics, iCloud sync with two devices on one Apple ID.
5. Polish before submission: final icon + launch screen, App Store screenshots (6.9" iPhone, 13" iPad), privacy policy + support URL, App Store Connect price point $2.99, "Data Not Collected", age 4+. Full checklist in `docs/PUGDOKU-IOS.md`.
6. Ideas parked: daily seeded puzzle, Game Center, Expert 10×10 tier (bank has 99 such puzzles), colour-blind patterns.

## Repo rules to remember (from `CLAUDE.md` / `docs/DEV-GUIDE.md`)
Never size from `vh/vw/innerWidth` (use `--app-h/--app-w`); players are P1–P4, never themed colour names; don't touch the separate `gettoit-app` repo; deploy = push to `main` (so do **not** merge this branch to `main` until the web app is confirmed unchanged); be honest about what was tested vs only built.
