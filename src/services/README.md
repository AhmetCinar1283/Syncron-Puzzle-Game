# services/

UI (`src/app`, `src/components`, `src/hooks`, `src/contexts`) never calls `fetch`,
Firestore/Functions SDKs, or Dexie directly — everything goes through a module here.

## api/ — Cloudflare Worker (D1-backed) HTTP clients
- `workerClient.ts` — shared `workerFetch` helper + ID-token retrieval. All other `api/*` clients build on this.
- `adminClient.ts` — admin-only worker endpoints: bans, `/admin/level-analytics` fetch.
- `friendsClient.ts` — friends/requests/search/block endpoints (D1 `friendships`).
- `badgesClient.ts` — badge data (D1 `badges`).
- `leaderboardClient.ts` — leaderboard/period scores (D1 `user_period_scores`, `creator_scores`).
- `gameClient.ts` — gameplay telemetry, feedback, and `/complete-level` score verification (D1 `played_levels`, `level_telemetry`, `level_feedback`).
- `supportClient.ts` — `/create-ticket` worker endpoint (ticket row itself lives in Firestore).

## firebase/ — Firebase Auth/Firestore/Functions
- `config.ts` — Firebase app init; exports `auth`, `db`, `storage`, `functions`.
- `firestore.ts` — `users/{uid}` doc creation/sync, `levelRequests` (community submissions).
- `users.ts` — user tag data + `requestNewTag` Cloud Function, display name updates, generic profile doc read.
- `support.ts` / `supportTypes.ts` — `supportTickets` collection (user + admin ticket CRUD, live subscriptions).
- `admin.ts` (barrel), `adminLevels.ts`, `adminParts.ts`, `adminRequests.ts`, `adminTypes.ts` — Firestore-hosted level/level-part/level-request admin CRUD (`levels`, `levelParts`, `metadata/levelsState`, `levelRequests`).
- `adminUsers.ts` — admin user directory search/pagination (`users` collection).
- `adminLevelAnalytics.ts` — `settings/levelAnalyticsAlerts` doc (alert rule config; the analytics numbers themselves come from the Worker/D1 via `api/adminClient.ts`).
- `sync.ts` — Firestore → Dexie level metadata/content sync (`syncLevelsMeta`, `fetchAndCacheLevel`).

## db/ — Dexie (IndexedDB), local-only cache
- `schema.ts` — `KnowAndConquerDB` (Dexie) definition + version history; `getDB()` singleton.
- `levelsOps.ts` — user-authored levels (`levels` table) CRUD + `localClear`.
- `levelOrderOps.ts` — `levelOrder` table (display ordering of user levels).
- `presetLevelsOps.ts` — campaign/preset levels (`presetLevels` table): dedup listing, by-id lookup, delete.
- `playedLevelsOps.ts` — local played-level cache (`playedLevels` table): get/put/list.

## sync/ — cross-backend synchronization
- `playedLevels.ts` — pulls `played_levels` from the Worker/D1 into Dexie `playedLevels` (delta sync via `syncMeta` cursor), and clears local played-level state on user switch.

## monetization/ — reklam adaptör katmanı
- Reklam/platform olayları için platformdan bağımsız tek arayüz (`AdProvider`), yetenek nesnesi (`getCapabilities`) ve saf reklam sıklığı politikası. Hiçbir `features` modülünü import etmez; React erişimi `src/contexts/MonetizationContext.tsx` üzerinden (`useAds`/`useCapabilities`). Detaylar `services/monetization/README.md`.

## lib/ (outside services/, for reference)
- `userStorage.ts` — localStorage key/value helpers (per-user namespaced), not a backend.
- `i18n/` — static translation strings, not a backend.

## Ownership summary
| Data | Backend | Module(s) |
|---|---|---|
| Level content (grid/edges/targets/...) | Firestore (`levels`, `levelParts`, `levelRequests`) + Dexie cache | `firebase/adminLevels.ts`, `firebase/adminParts.ts`, `firebase/firestore.ts`, `db/levelsOps.ts`, `db/presetLevelsOps.ts` |
| Played-level results/stars/moves | Worker/D1 (`played_levels`) + Dexie cache | `api/gameClient.ts` (write via `/complete-level`), `sync/playedLevels.ts` (D1→Dexie), `db/playedLevelsOps.ts` (local read/write) |
| Telemetry / feedback | Worker/D1 (`level_telemetry`, `level_feedback`) | `api/gameClient.ts` |
| Support tickets | Firestore (`supportTickets`) + Worker (`/create-ticket`) | `firebase/support.ts`, `api/supportClient.ts` |
| User profile (role/score/xp/tag) | Firestore (`users/{uid}`) | `firebase/firestore.ts`, `firebase/users.ts`, `firebase/adminUsers.ts` |
| Friends/badges/leaderboard | Worker/D1 | `api/friendsClient.ts`, `api/badgesClient.ts`, `api/leaderboardClient.ts` |
| Bans | Worker/D1 (`user_bans`) | `api/adminClient.ts` |
| Level analytics numbers | Worker/D1 (`level_telemetry`/`level_feedback` aggregates) | `api/adminClient.ts` (`getLevelAnalyticsData`) |
| Level analytics alert rules | Firestore (`settings/levelAnalyticsAlerts`) | `firebase/adminLevelAnalytics.ts` |
| Editor clipboard, session, prefs | `localStorage` (not a service) | n/a — see `docs/database.md` |
