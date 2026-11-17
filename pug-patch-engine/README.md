# Pug Patch engine (reference implementation, TypeScript)

The puzzle brain of Pug Patch (formerly Pugdoku), extracted so it can be ported to Swift. Self-contained: no React, no browser APIs.
It is a "Queens"-style puzzle: an N×N board split into N coloured regions; place **one pug in every row, every column and every colour region, and no two pugs may touch (not even diagonally)**.

```bash
npm install && npm test        # tests/bank.ts + tests/logic.ts (about 30 s; the live hard-puzzle build is the slow part)
```

## Files
| File | What it is |
|---|---|
| `src/pugdoku.ts` | Board types, bank decoding, the 8 symmetries, the exhaustive solver `solveAll`, and the random puzzle builder `makePuzzle` |
| `src/pugdoku-logic.ts` | **Human-style deduction solver**: `Logic` (candidate grid), `nextStep`, `applyStep`, `grade`, `hintFor` |
| `src/pugdoku-gen.ts` | Difficulty `TIERS`, `fits`, `buildPuzzle` (live), `pickFromBank`, `verified` |
| `src/pugdoku-bank.ts` | 789 pre-verified puzzles as data (sizes 5-10) |
| `snapshot/bank-grades.json` | Expected `[bankIndex, level, steps, counts level 1-5]` for all 789 puzzles (regenerate with `npx tsx tests/snapshot.ts`): the port must match it |
| `tests/` | `bank.ts` (every puzzle, in all 8 orientations, has exactly one answer), `logic.ts` (all puzzles logic-solvable, grade histogram, live generator respects tiers) |

## Data model
- `Grid` = `number[][]`, region id (0..N-1) per cell. `Puzzle = { g: Grid, p: number[] }` where `p[row]` = column of that row's pug (the solution).
- Bank row = `[regions as N*N digits, solution as N digits]`, e.g. `["0001122211222312223342233","24130"]` for N=5. (Digit encoding works up to N=10 because region ids are 0-9.)
- Cell state in the app (not in this package): 0 empty, 1 ✕ (player's "no pug here" mark), 2 pug.

## 1. Uniqueness (hard guarantee)
`solveAll(n, g, limit)`: row-by-row backtracking; reject a column if already used, if the cell's region is already used, or if it is within 1 column of the previous row's pug (touching). `limit = 2` is enough to prove uniqueness (`length === 1`).
**No puzzle is ever shown unless this returns exactly one solution equal to the stored one.** A rotated/flipped/recoloured puzzle keeps its single answer, so every bank puzzle plays in 8 orientations (`transformPuzzle`, t = 0..7) with a shuffled colour palette.

## 2. Logic solver / grader (`pugdoku-logic.ts`)
`Logic` holds `cand[r][c]` (is a pug still possible here?) and the placed pugs. `place(r,c)` removes the cell's row, column, region and the 8 neighbours from candidates.
`nextStep(L)` returns the **first applicable** deduction, tried in this order (that order defines the level):

| Level | Technique |
|---|---|
| 1 | **Single**: a row/column/region has exactly one candidate left, so place the pug |
| 2 | **Touch-all**: a cell adjacent to *every* remaining candidate of some unit (2-4 candidates) cannot hold a pug |
| 2 | **Confinement k=1**: one unit's candidates all lie in a single line of another kind (e.g. a colour sits wholly in one row), so remove other candidates from that line |
| 3 | **Confinement k=2**: any 2 units whose candidates fit within exactly 2 lines of another kind use those lines up |
| 4 | **Confinement k=3,4** (k ≤ N/2) |
| 5 | **Trial**: put a pug on a candidate, propagate with Level-1 singles only; if some unit ends with no candidates (or the placement conflicts), eliminate the cell |

"Units" come in three kinds: rows (0), columns (1), regions (2). Confinement is generic over every ordered pair (A, B) of different kinds and every subset of k units of kind A: if the union of their candidate lines of kind B has size exactly k, every *other* candidate in those B-lines is eliminated.
- `grade(n, g, given)` repeatedly applies steps until solved. Returns `{ solvable, level (hardest step used), steps, counts }`. `solvable:false` means it got stuck (would need guessing beyond Level 5).
- `hintFor(n, g, pugs, marked)` replays the deductions from the player's placed pugs and returns the first step that still has something to tell them: a `place` step, or an `elim` step with at least one cell the player hasn't ✕-marked yet. Each step carries a plain-English `why` and `focus` cells to highlight. Returns null if the player's pugs are contradictory (a wrong pug allowed in Relaxed mode); the app then falls back to revealing a true pug.

## 3. Generator and tiers (`pugdoku-gen.ts`)
`makePuzzle(n, accept?)` (in `pugdoku.ts`): pick a random valid solution (`randomSolution`, no shared column, no touching) → grow N connected regions from the pug cells, with a bias toward small regions (`growRegions`, BIAS 0.3) → `repair`: while `solveAll` finds a second solution, move a border cell of the alternate solution into a neighbouring region (keeping regions connected, size > 1) → accept only if exactly one solution, then `accept(pz)`; otherwise rebuild.
`fits(pz, tier)` = `grade` is solvable and its level is within the tier's `[min, max]`.

| Tier | N | Level band | Starter pugs (app) |
|---|---|---|---|
| relaxed | 5 | 1-2 | 1-2 (no treats to lose) |
| easy | 5 | 1-3 | 1-2 |
| medium | 7 | 2-4 | 0-1 |
| hard | 9 | 3-5 | 0-1 |

(An unused 10×10 expert tier is possible: the bank has 99 size-10 puzzles.)

## Measured results (Node, laptop-class CPU)
- Bank grades (levels 1-5) by size, **0 puzzles need guessing**: 5×5: 60 (1:1, 2:44, 3:7, 5:8) · 6×6: 120 · 7×7: 150 (2:52, 3:54, 4:8, 5:36) · 8×8: 180 · 9×9: 180 (2:44, 3:54, 4:43, 5:39) · 10×10: 99 (2:13, 3:32, 4:26, 5:28).
- `grade` takes about 1-8 ms per puzzle (N=5 to 10). Live building: 5×5 and 7×7 in tens of ms; **9×9 hard ≈ 3-5 s each**, so build them in the background and ship the bank for instant starts (136 hard puzzles are level ≥3).
- 132 bank puzzles across all sizes were fully solved using only `hint` repeatedly (app tests), and no hint ever placed a wrong pug.

## Porting notes for Swift
- Keep `solveAll` and `grade` as separate pure functions, with no UI types. Make the RNG injectable (seed it) so tests and a future daily puzzle are deterministic.
- Use bitmasks per row for the candidate grid (N ≤ 10 fits in `UInt16`): a unit's candidate set becomes cheap to union. The confinement subset search is the hot loop; it only needs subsets up to k = N/2.
- Do the live generator on a background `Task`/actor, never the main thread. On a phone, budget several seconds for 9×9 and prefer the bank.
- Never trust the generator's own `p` blindly: always run `solveAll(limit: 2)` and compare before presenting a puzzle (`verified`).
- Cross-check the port against this package: run the TS `grade` over the bank and compare against `snapshot/bank-grades.json` (level, steps, per-level counts) and assert the Swift grader reproduces it exactly. Also snapshot the first `hintFor` result for a few positions.
- Wording in `why` strings is user-facing copy; rewrite freely, keep the `focus` highlighting.
