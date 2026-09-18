# Scoring, Stars & Level Progression

## Overview

Level completion is verified server-side by the Cloudflare Worker (`syncron-worker`). The client posts the move sequence; the worker replays it deterministically and commits the result. The client cannot self-report scores.

---

## Star Calculation (Worker)

Stars are computed in `syncron-worker/src/solutions.ts → computeStars()`:

| Condition | Stars |
|---|---|
| No prior solutions exist **or** `moves ≤ bestMoveCount` | ★★★ (3) |
| `moves ≤ floor(bestMoveCount × 1.2)` | ★★ (2) |
| Everything else | ★ (1) |

`bestMoveCount` is read via `getSolutionStats()` **before** the batch write, so the pioneer who first solves a level always earns 3 stars regardless of move count.

---

## Score Delta (Re-completion)

Stars and `totalScore` reflect **best-ever** performance:

- `existingStars` = previously stored star count (0 if first completion)
- `newStars` = stars earned this run
- `scoreDelta = max(0, newStars − existingStars)` — only the improvement is added
- `totalScore` in `users/{uid}` is incremented by `scoreDelta`
- `completedCount` in `users/{uid}` is incremented only on **first** completion
- `playedLevels/{levelId}.stars` and `.moveCount` always store the personal best (never regress)

---

## Solution Ranking Badges

Computed in `index.ts` from `solutionStats` (read before the batch write):

| Flag | Condition | Badge shown | Color |
|---|---|---|---|
| `isNewBestSolution` | `bestMoveCount === null` (first ever) or `moves < bestMoveCount` | **New Best** | Emerald `#00ff88` |
| `isBestSolution` | `moves === bestMoveCount` (ties global best) | **Best** | Sky `#00c4ff` |
| `isGoodSolution` | not best/new-best AND (`worstTopMoveCount === null` OR `moves ≤ worstTopMoveCount`) | **Good** | Purple `#9333ea` |

`worstTopMoveCount === null` means fewer than 3 solutions exist — any solution qualifies as "Good".
The three flags are mutually exclusive.

---

## Hints (04 — rewarded hint)

Hints are **computed only on the worker**. The client sends its move history
(`u/d/l/r/s`), never a game state; the worker loads the level from Firestore,
replays the moves and runs the solver (`services/hint`). A hint shows the number
of steps left and the next ≤5 steps (or "undo N" / "restart" first when the
current state is unsolvable).

| Rule | Where |
|---|---|
| `POST /rewards/prepare` computes and stores the hint (`reward_grants`, `status='prepared'`) and returns **no content**. | `routes/rewards.ts`, `services/rewards/rewardService.ts` |
| `POST /rewards/claim` checks access on the server (per-level free quota, ad-free entitlement) and only then returns the content (`status='delivered'`). Re-claiming returns the same content. | `rewardService.claimReward` |
| Every step is written to `audit_logs` (`category='reward'`), archived to R2. | `rewardService.logEvent` |
| `/complete-level` treats the run as **hinted** if there is any delivered, unconsumed hint for `(uid, levelId)` **or** the client sends `hintsUsed > 0`. The client value can only lower the result. | `services/hintScoring.ts → resolveHintUsage` |
| Hinted run: stars capped at **2** (`capStarsForHint`). | `hintScoring.ts` |
| Hinted run: not written to `levels/{id}/infos/solutions`; `isNewBestSolution/isBestSolution/isGoodSolution` are all `false`; leaderboard world-record logic sees no new best. | `routes/game.ts` step 9 |
| Hinted run: personal best `move_count` is not improved (first completion still stores its move count). | `personalBestMoveCount` |
| Hints read at the start are closed (`consumed_at`) only **after** `played_levels` is saved. They never expire. | `finalizeHintUsage` |
| Abuse caps: 10 new hint computations per uid per minute, 200 per 24h. | `services/hint/hintAction.ts → rule` |

Because `totalScore` only grows by `max(0, newStars − existingStars)`, a hinted
re-play can never lower a previously earned 3★.

Response gains `"hintUsed": true | false`; the win overlay shows a *HINT · MAX 2★* badge.

Telemetry: `level_telemetry.hints_used` (per session); admin analytics exposes
`total_hints` and `hinted_attempts` (migration `0011_reward_grants.sql`).

---

## Skipped Levels (05 — rewarded level skip)

A stuck player can watch a rewarded ad to skip a campaign level. A skip **only
unlocks progression**: it is not a completion.

| Rule | Where |
|---|---|
| Skips live in their own table `skipped_levels` (no stars/score/moves). Nothing is written to `played_levels`, `user_period_scores`, world records, badges, XP or Firestore solutions — `/complete-level` is untouched. | migration `0012_skipped_levels.sql`, `services/skipLevel/` |
| Skip goes through the shared reward flow (`action: 'skip-level'`): `prepare` validates, the ad is shown, `claim` writes the skip row via the handler's idempotent `onDelivered` hook. No free path (`freePerLevel: 0`); web/Electron don't offer it. | `skipLevelAction.ts`, `rewardService.ts` |
| The level must be in the given part (`levelParts/{partId}.order`), not already solved, and not the part's last level (`SKIP_LEVEL_POLICY.allowChapterEnd = false`). | `skipLevelPolicy.ts → evaluateSkip` |
| Abuse limit: at most **3 open skips** (skipped and not yet solved) per user. Re-skipping an already skipped level does not count. Caps: 5/min, 50/24h. | `SKIP_LEVEL_POLICY.maxOpenSkips`, `skipLevelAction.rule` |
| Solving a skipped level later is a normal first completion (full stars/score/XP). The skip row stays; "completed" wins in the UI. | `/complete-level` (unchanged) |
| Sync: `GET /played-levels` returns `skippedLevels[]` with the same `since` cursor; Dexie table `skippedLevels` (v11). Admin level delete and anonymous cleanup remove skip rows. | `routes/playedLevels.ts`, `services/sync/applySkippedLevels.ts` |

Telemetry: a session that ends with a skip is sent with `outcome='skip'`; admin
analytics exposes `total_skips` per level version (counted from `skipped_levels`).

---

## Daily Puzzle (06)

The daily puzzle has its **own** completion endpoint and tables; campaign scoring
(`/complete-level`, `played_levels`, period scores, world records, badges) is untouched.
Full flow and admin usage: `docs/daily-puzzle.md`.

| Rule | Where |
|---|---|
| `POST /daily/complete` replays moves with the same `verifyMoves`. Stars are relative to the puzzle's **par**: `≤ par → 3`, `≤ floor(par × 1.2) → 2`, else 1; hinted runs are capped at 2 (`capStarsForHint`). | `services/daily/completeDaily.ts`, `dailyPolicy.ts` |
| Only the first verified completion **on that UTC date** is official (`daily_results` PK `(uid, date)`, `INSERT OR IGNORE`). Replays and archive plays are verified but write nothing. | `dailyResults.ts` |
| Reward is **XP only**: 50 for an official completion, 25 if hinted. It is tied to the streak day actually being recorded (atomic, idempotent) so a retry after a partial failure completes it, but never twice. | `dailyStreaks.recordStreakDay`, `dailyXp.ts` |
| Hints use the shared reward flow with `levelId = 'daily:<puzzleId>'`; `resolveHintUsage` / `finalizeHintUsage` apply as in the campaign. Hinted results rank after all unhinted ones. | `hintScoring.ts`, `dailyResults.getDailyLeaderboard` |
| `timeSpent` is client-reported (seconds) and only breaks ties on equal move counts; it is clamped to 24h. | `DAILY_POLICY.maxTimeSpentSeconds` |
| Par is set on save: the admin browser's solver (or the admin's own test-mode solution) is replayed on the worker; par = its length. `par_source='admin'` marks a possibly non-optimal par. | `puzzleValidation.ts` |

---

## Firestore Data Shape

`users/{uid}/playedLevels/{levelId}`:
```
stars:      1 | 2 | 3    ← best-ever star rating
score:      1 | 2 | 3    ← mirrors stars (legacy compat)
moveCount:  number        ← best-ever move count
timeSpent:  number        ← most recent time (seconds)
completedAt: timestamp    ← first completion timestamp (preserved)
updatedAt:  timestamp     ← last update
```

`levels/{levelId}/infos/solutions`:
```
solutions: [
  { uid, moves: string[], moveCount: number, solvedAt: number },
  ...  // top-3 shortest, one entry per uid, sorted by moveCount asc
]
```

**Update rule:** `updateSolutions` only writes when the new submission is **strictly better** (fewer moves) than the uid's existing entry. Equal or worse submissions are ignored.

---

## Level Lock / Unlock Progression

### Firestore Rule (`firestore.rules → canReadLevel()`)

Reads of `levels/{levelId}` are gated server-side:
- **Admin/moderator**: always allowed
- **First level of a part** (`prevLevelId` field absent or null): requires `users/{uid}.totalScore ≥ levelParts/{partId}.unlockRequirement`
- **Subsequent levels** (`prevLevelId` set): requires `users/{uid}/playedLevels/{prevLevelId}` to exist

### `prevLevelId` field on level documents

Set at publish time in `adminLevels.ts → publishLevel()` and `adminRequests.ts → approveLevelRequest()`:
- Null → first level in the part
- Non-null → Firestore ID of the immediately preceding level by position

**Staleness caveat:** `prevLevelId` becomes stale when levels are reordered via `moveLevelsInPart`. The `/levels` UI uses in-memory order data for lock calculation (immune to staleness); the Firestore rule is a security backstop only. An admin can repair by re-publishing or manually patching the field.

**Chain repair on delete:** `deleteFirestoreLevel` patches the successor level's `prevLevelId` to skip the deleted level (non-fatal on failure).

### UI Lock Calculation (`app/levels/page.tsx → lockedSet`)

Computed client-side (`features/levels/lib/progression.ts → computeLockedSet`) from `partsMap` (full `LevelPart` objects) + `playedMap` and `skippedLevels` (Dexie) + `totalScore` (Redux `userSlice`). A level unlocks when the previous one is **solved or skipped**. Uses position-adjacent ordering — no extra network calls. Moderators see all levels as unlocked. The exit portal to the next part requires every level to be solved or skipped (the last level cannot be skipped).

---

## Worker Endpoint

**POST** `${NEXT_PUBLIC_WORKER_URL}/complete-level`

`NEXT_PUBLIC_WORKER_URL` must NOT have a trailing slash (double-slash causes 404).

Request:
```json
{ "levelId": "<firestoreId>", "moves": ["u","d","r","l",...], "timeSpent": 42, "hintsUsed": 0 }
```

Response (`CompleteLevelResponse`):
```json
{
  "success": true,
  "isFirstCompletion": true,
  "isNewBestSolution": false,
  "isBestSolution": false,
  "isGoodSolution": true,
  "stars": 3,
  "scoreDelta": 3
}
```

Valid move values: `"u"`, `"d"`, `"r"`, `"l"` — max 500 moves. Worker verifies by full replay using `initialStateFromLevel` + `processMoveStep`.

---

## Client Flow (GameShell)

1. Player wins → `GameShell` awaits worker response (no longer fire-and-forget)
2. On success: immediately writes to Dexie `playedLevels` (so levels page is up-to-date without waiting for next sync)
3. Sets `workerResult` state → `WinOverlay` shows animated gold stars + badges
4. WinOverlay shows grey ★★★ + bouncing dots while waiting, then stars animate gold one-by-one with neon glow

---

## WinOverlay Animation

- **Loading state**: ✦ icon pulses, grey stars fade in, 3 bouncing dots below
- **On result**: each lit star bursts gold sequentially (220 ms stagger) with `drop-shadow` neon glow
- **Badges** (appear after stars settle): `+N PTS` pop-in, then `New Best` / `Best` / `Good` fade-in

---

## Worker Local Dev Setup

1. `syncron-worker/.dev.vars` — paste real service account JSON (single line):
   ```
   GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```
2. `.env.local` — no trailing slash:
   ```
   NEXT_PUBLIC_WORKER_URL=http://localhost:8787
   ```
3. Run: `cd syncron-worker && npx wrangler dev`

For production: `npx wrangler secret put GOOGLE_SERVICE_ACCOUNT` then `npx wrangler deploy`.

---

## Dexie Schema

Version 9 (current): added `stars?: 1 | 2 | 3` to `StoredPlayedLevel`.

`syncPlayedLevels` in `sync.ts` maps `stars` and `moveCount` from Firestore → Dexie on every sync.
