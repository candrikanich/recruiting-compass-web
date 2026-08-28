# School Recommendation System

**Status:** MVP in code (PR #549). Schema applied live 2026-08-28 (`20260912000000_school_recommendations.sql`).
**Issue:** #121 (product), #529 (system design)

New users land on an empty school list. This system turns profile signals we already collect into a short, ranked set of NCAA programs they can add in one tap — without calling College Scorecard on every page view.

---

## Architecture (target)

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ Web / iOS   │────▶│ Nitro API        │────▶│ Ranker (pure)      │
│ empty state │     │ /schools/        │     │ catalog × signals  │
└─────────────┘     │ recommendations  │     └─────────┬──────────┘
                    └────────┬─────────┘               │
                             │                         ▼
                    ┌────────▼─────────┐     ┌────────────────────┐
                    │ Shared cache     │     │ NCAA catalog       │
                    │ L1 memory        │     │ (JSON today;       │
                    │ L2 Upstash Redis │     │  Postgres later)   │
                    │ L3 Postgres      │     └────────────────────┘
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Origin reads     │
                    │ prefs, schools,  │
                    │ dismissals, user │
                    └──────────────────┘
```

Scale-out path (not in this MVP):

1. **Catalog table** — `college_programs(name, state, division, sports[], scorecard_id)` replacing the JSON file, GIN on sports, btree on state+division.
2. **Feature store** — materialize athlete signals (home state, GPA bucket, sport) on profile save so ranking does not join `user_preferences` on every miss.
3. **Feedback** — dismissals + adds already persist; later a nightly job can reweight geography vs. division from aggregate add-rate.
4. **Sport filter** — College Scorecard does not expose NCAA sport sponsorship. A programs table (or NCAA API dump) is the prerequisite.

---

## Component structure

| Layer | File | Responsibility |
|---|---|---|
| Page | `pages/schools/index.vue` | Empty-state host; add uses existing `useSchools().createSchool` |
| UI | `components/School/RecommendedSchools.vue` | Presentational grid, add/dismiss emits |
| Composable | `composables/useSchoolRecommendations.ts` | Fetch + optimistic dismiss |
| Ranker | `utils/schoolRecommendations.ts` | Pure scoring, caps, draft mapping |
| Catalog | `utils/ncaaDatabase.ts` `getCatalogSchools()` | Flatten `data/ncaaSchools.json` |
| API | `GET /api/schools/recommendations` | Authz, cache, assemble |
| API | `POST /api/schools/recommendations/dismiss` | Persist dismissal, bust cache |
| Cache | `server/utils/sharedCache.ts` | L1/L2/L3 cache-aside |
| Assemble | `server/utils/assembleSchoolRecommendations.ts` | Load signals, call ranker |

---

## Data flow

```
Empty /schools
  → GET /api/schools/recommendations?athleteId=
      → requireAuth + resolveTargetAthleteId (parents)
      → L1/L2/L3 lookup keyed rec:v1:{athleteId} (TTL 120s)
      → miss: family + prefs + users + tracked schools + dismissals
      → rankSchoolRecommendations(catalog, homeState, gpa, excluded)
      → write-through cache
  → grid of ≤8 cards
Add → existing schools insert (RLS) + drop card locally
Dismiss → POST dismiss (upsert unique family+catalog_key) + deleteShared
```

---

## API

### `GET /api/schools/recommendations`

Auth required. Query: `athleteId` (uuid, optional, family-authorized), `limit` (1–12, default 8).

```json
{
  "recommendations": [
    {
      "catalogKey": "ohio state university",
      "name": "Ohio State University",
      "division": "D1",
      "conference": "Big Ten",
      "state": "OH",
      "website": "osu.edu",
      "athleticsUrl": null,
      "score": 70,
      "reasons": ["In OH", "Matches academic range"]
    }
  ],
  "signals": { "homeState": "OH", "gpa": 3.7, "excludedCount": 0 },
  "cache": "origin"
}
```

`cache` is `"memory" | "redis" | "postgres" | "origin"`.

### `POST /api/schools/recommendations/dismiss`

CSRF + auth. Body: `{ "catalogKey": "ohio state university", "athleteId": "<uuid?>" }`.

```json
{ "dismissed": true, "catalogKey": "ohio state university" }
```

---

## Database schema

`supabase/migrations/20260912000000_school_recommendations.sql`

**`response_cache`** — L3 for any Nitro handler. Service-role only, RLS forced, no anon/authenticated grants.

| Column | Type | Notes |
|---|---|---|
| cache_key | text pk | |
| payload | jsonb | |
| expires_at | timestamptz | btree index for later prune |
| created_at | timestamptz | |

**`school_recommendation_dismissals`** — family-scoped feedback.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| family_unit_id | uuid not null | fk family_units on delete cascade |
| athlete_user_id | uuid not null | fk users on delete cascade |
| catalog_key | text not null | unique with family_unit_id |
| created_at | timestamptz | |

RLS: family members SELECT/INSERT/DELETE. Nitro writes use the service role.

---

## Caching strategy

| Layer | Store | TTL | When it helps |
|---|---|---|---|
| L1 | in-process Map (`server/utils/cache.ts`) | 120s | Repeat hits on the same Vercel isolate |
| L2 | Upstash Redis (optional) | 120s | Shared across isolates when env is set |
| L3 | `response_cache` | 120s | Production default when Redis is missing |

Rules:

- Fail-open: a cache error never 500s the request.
- Stampede: in-flight promises are coalesced per isolate.
- Invalidation: dismiss calls `deleteShared(rec:v1:{athleteId})` on all three layers.
- Do not cache PII beyond the athlete's own ranked names/state/GPA already visible to that family.

---

## Ranking (MVP)

Signals, in order of impact:

1. Home state (`location.state` → `player.school_state` → `users.hometown_state`) — +50 same state, +22 adjacent.
2. GPA bucket — tilts D1 vs D2/D3 weights; does not hard-filter.
3. Exclude tracked school names and dismissed `catalog_key`s.
4. Conference cap 2, state cap 4, then fill remainder so the grid is not eight MAC schools.

Sport is **not** a filter yet. The NCAA JSON has no sport sponsorship; shipping a wrong-sport filter would be worse than geography-only. That is the first follow-up once a programs table exists.

---

## What this MVP is not

- Onboarding wizard step (surface is `/schools` empty state only).
- ML / collaborative filtering.
- College Scorecard round-trip per recommendation.
- Auto-adding schools.
