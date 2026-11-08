# Pugdoku for iOS (iPhone + iPad)

Solo-only, offline, paid-up-front app. It is the Pugdoku game from Game Night, packaged with Capacitor. Lives in `apps/pugdoku/` (an npm workspace),
sharing puzzle logic, pixel art, sounds and styles with the web version in `src/`. The Game Night website is unaffected.

## Working on it
```bash
npm install                                  # at repo root (workspaces)
cd apps/pugdoku && npm run dev               # browser dev server
npm run build && npx vite preview --port 4174  # production web build, then: node tools/pugapp.cjs [outdir]  (layout at 11 iPhone/iPad sizes + a play-through)
npm run sync                                 # build + copy into the Xcode project
npm run open                                 # opens Xcode (needs a Mac)
npx tsx tools/tests/pugdoku-bank.ts          # every bank puzzle has exactly one answer
npx tsx tools/tests/pugdoku-logic.ts         # every bank puzzle is solvable by logic; live generator respects difficulty bands
npx tsx tools/tests/pugdoku-app.ts           # moves, undo, hints, save merging
```
`.github/workflows/pugdoku-ios.yml` compiles the Xcode project on a macOS runner for every push to a `claude/**` branch.

## Puzzle quality
- Every puzzle has exactly **one** answer (checked by exhaustive solver before it is ever shown).
- Every puzzle is **solvable by logic** (`src/lib/pugdoku-logic.ts`): no guessing, ever. The solver rates each puzzle 1-5 by the hardest technique it needs
  (1 last spot, 2 colour fits one row/col, 3-4 groups of 2-3, 5 "what if"). Tiers: relaxed 1-2, easy 1-3 (5x5), medium 2-4 (7x7), hard 3-5 (9x9).
- 789 pre-verified puzzles ship in the app, each playable in 8 orientations with shuffled colours; a Web Worker builds fresh ones in the background.
- HINT is the same solver: it finds the next real deduction, explains it, and does it.

## Saves and iCloud
- The puzzle in progress + stats autosave to the device (Capacitor Preferences = UserDefaults) after each move, and when the app is backgrounded.
- iCloud (Settings toggle, on by default): mirrors the save to **iCloud key-value storage** (`NSUbiquitousKeyValueStore`, native plugin in
  `ios/App/App/ICloudStorePlugin.swift`). Merge rules (`src/merge.ts`): the newest puzzle-in-progress wins; stats are kept per device and summed, so
  two devices never overwrite each other. Not signed in to iCloud? The app silently keeps working locally.
- Limit: the key-value store is for small data (1 MB total); a save is a few KB.

## Before the App Store (needs a Mac + Apple Developer Program, $99/yr)
1. `npm run sync && npm run open`. In Xcode: App target > Signing & Capabilities: pick your Team. Bundle id is `com.marshallhasenbeck.pugdoku` (change in
   `capacitor.config.ts` AND the Xcode project if you want another). Confirm the **iCloud** capability shows "Key-value storage" (entitlement already in `App.entitlements`).
2. App Store Connect: new app, price **$2.99 (Tier/price point for USD 2.99)**, availability worldwide. A paid-up-front app needs **no in-app purchase code**.
3. Privacy: "Data Not Collected". Age rating: 4+. Export compliance is pre-answered (`ITSAppUsesNonExemptEncryption = false`). The privacy manifest is `PrivacyInfo.xcprivacy`.
4. Screenshots: required 6.9" iPhone and 13" iPad sets (take them in the simulator: iPhone 16 Pro Max, iPad Pro 13"). Also a support URL and a privacy policy URL (a one-paragraph "we collect nothing" page is enough).
5. Archive (Product > Archive) > upload > TestFlight on your own iPhone and iPad first. Check iCloud sync with both signed into the same Apple ID.
6. Bump `MARKETING_VERSION` / build number for each upload.

## Known gaps / ideas
- Not yet run on a real device or the iOS simulator (this was built on Linux): do a TestFlight pass for layout, haptics and sync before submitting.
- The app icon is a placeholder made from the pug picture; replace `AppIcon-512@2x.png` with final art. Splash is Capacitor's default over a green background.
- Ideas: daily puzzle (seeded), Game Center, an Expert 10x10 tier (bank already has 99 such puzzles), colour-blind patterns.
