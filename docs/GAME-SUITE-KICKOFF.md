# Paste this into a new Claude Code session on the iMac

Suggested thread title: **Game Suite Build - Name Pending**
Suggested folder: a fresh one on the Desktop (e.g. `~/Desktop/game-suite`), with the zip below unpacked next to it.

---

I'm building a native iPhone game suite from scratch (name pending; working titles "Cozy Table", likely "Game Cabin" later).

**Product**
- Free download with 3 unlocked games. The rest unlock by in-app purchase: $1.99 per game, or $9.99 for all the rest. Non-consumables, with Restore Purchases.
- Native app, NOT a Capacitor/web wrapper. iPhone first; keep SwiftUI layouts adaptive so iPad can be added later.
- Stack direction: Swift + SwiftUI (SpriteKit only where a game needs lots of moving sprites), StoreKit 2 for purchases, iCloud for save sync, and each game's rules in a pure-Swift package with no UI so it can be unit-tested. Pixel art exported from the existing procedural art into PNG sprite sheets.
- Games have been renamed (no trademarked names) and the paid ones have my own rule changes. Offline pass-and-play / solo only for now.
- Pug Patch (formerly Pugdoku) is one of the games.

**What already exists**
- Repo `MarshallHasenbeck/games-night`, branch `claude/sharp-planck-syrpbf`. DO NOT merge that branch to `main` (main auto-deploys my live web app, which must stay unchanged) and don't edit the web app.
- `pug-patch-engine/` (also `pug-patch-engine.zip` in that branch): standalone TypeScript reference for Pug Patch: unique-answer generator, human-style logic solver/grader (levels 1-5), hints, 789 pre-verified puzzles, tests, and `snapshot/bank-grades.json` to check a Swift port against. Read its README first.
- `apps/pugdoku/src/merge.ts` and `tools/tests/pugdoku-app.ts`: iCloud save-merge rules (newest puzzle-in-progress wins; stats kept per device and summed). Worth porting.
- Approved Pug Patch rules: 3 treats, 3 hints, correct pugs lock (no undo of them), a NEW button starts a fresh puzzle in the same difficulty.
- The web Game Night app (`src/`, `src/lib/*.ts` pure logic, tests in `tools/tests/`) is the reference for each game's rules.
- The Capacitor project in `apps/pugdoku/ios` is obsolete for this plan.

**First steps**
1. Ask me for the final game names and which 3 are free.
2. Set up a fresh repo with a Swift package layout: `Core` (catalog with free/locked flags, entitlements, saves + iCloud merge), one rules package per game, and the app target.
3. Port the Pug Patch engine first (validate against `snapshot/bank-grades.json`), then the other free games, then paid ones one at a time.
4. Build and run on the Simulator and my iPhone, and be honest about what was tested versus only built.

I prefer few clarifying questions. Players are P1-P4 (CPU n for computer seats), never themed colour names.
