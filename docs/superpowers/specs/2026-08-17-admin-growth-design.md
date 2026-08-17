# Admin Growth Analytics (#3) — Design Spec

**Date:** 2026-08-17
**Status:** Approved (design), pending implementation plan
**Author:** Chris + Claude
**Subsystem:** Spec D of 4 (Foundation → #1 Support → #2 Ops → **#3 Growth**)
**Builds on:** admin foundation (merged to develop) — `components/Admin/*`, `server/utils/adminQuery.ts`, `layouts/admin.vue`.

## Context

The final admin subsystem: growth analytics — signup funnel, DAU/WAU/MAU, and
feature adoption — so Chris can decide what to build next with data. **All
live-query, no new tables** (decided at foundation: no `analytics_events`).

Codebase findings that shaped this:
- **No last-seen infrastructure** in the `public` schema (`users` has
  `created_at`/`updated_at` only). `auth.users.last_sign_in_at` is reachable via
  `auth.admin.listUsers()` but is login-recency (paginated, one timestamp/user) —
  chosen OUT (write-union instead).
- Best **activity proxies** (per-row timestamp + user key): `interactions`
  (`occurred_at`/`created_at`, `logged_by`/`family_unit_id`), `athlete_messages`
  (`sent_at`, `user_id`), `events` (`created_at`, `user_id`), `video_links`
  (`created_at`, `user_id`), `offers` (`created_at`, `user_id`).
- **`countByDay` (`server/utils/adminQuery.ts`) hardcodes `created_at`** — the
  single biggest reuse gotcha; must be generalized for `occurred_at`/`sent_at`.
- **Funnel has two entry modes:** invite (`family_invitations`) + self-serve
  (`pages/join.vue`/`/signup`). `users` is the source of truth for accounts.
- `family_invitations`: `created_at`, `accepted_at` (nullable), `status`,
  `declined_at`, `expires_at`. `users`: `created_at`, `onboarding_completed`
  (boolean NOT NULL), `current_phase`, `status_label`.
- `server/api/admin/stats.get.ts` computes totals only (no time-series) — Growth
  needs a NEW endpoint, don't overload stats.
- Rails present: `AdminChart` (line/bar/sparkline), `AdminStatTile`,
  `AdminTimeRange` (7/14/30/90), `AdminDataTable`. Nav = `layouts/admin.vue` `links`.

## Decisions (locked with Chris)

| Fork | Decision |
|---|---|
| "Active" definition | **Write-activity union** — distinct user with ≥1 write across `interactions`/`athlete_messages`/`events`/`video_links`/`offers`, per 1/7/30-day window + a daily-active trend. (Approximate — misses read-only sessions.) |
| Login-recency gauge | **Out** (chose write-union only). `auth.users.last_sign_in_at` not used this spec. |
| Retention cohorts | **Deferred to its own spec** (heaviest piece; benefits from the activity-union being proven first). |
| Placement | New `pages/admin/growth.vue` + `server/api/admin/growth.get.ts` + a "Growth" nav link. |

## Scope

### 1. Generalize `adminQuery.countByDay` (prereq)

Add an optional timestamp-field parameter, default `"created_at"`, so it buckets
rows keyed on `occurred_at`/`sent_at` too. **Backward-compatible** — existing
callers (unchanged signature usage) keep working.

```ts
// signature becomes:
export function countByDay(
  rows: Record<string, unknown>[], from: Date, to: Date, field = "created_at"
): { day: string; count: number }[]
```

(Or a sibling `countByDayField`; the plan picks one. Existing `dayBuckets`
untouched.)

### 2. `server/api/admin/growth.get.ts` (requireAdmin, service-role, SELECT-only)

Query param `days` (default 30, from `AdminTimeRange`; clamp to e.g. ≤90).

- **Funnel** (counts, most as `count: exact, head: true`):
  - invites sent = `family_invitations` total (or within window).
  - accepted = `family_invitations` where `accepted_at IS NOT NULL` (or status accepted).
  - accounts created = `users` total.
  - onboarded = `users` where `onboarding_completed = true`.
  - active = distinct user in the activity union over the last 30d (§DAU logic).
  - Returns ordered stages + computed drop-off % between stages.
- **DAU/WAU/MAU**:
  - For each of the 5 activity tables, select `(user_id, <timestamp>)` over
    `[now-days, now]`, minimal columns only. (Note per-table timestamp: interactions
    `created_at` (or `occurred_at`), athlete_messages `sent_at`, events/video_links/
    offers `created_at`.)
  - Merge into one `{ user_id, day }` set; distinct-count users per day → the
    **daily-active trend**; distinct-count users over trailing 1/7/30-day windows →
    DAU/WAU/MAU tiles.
- **Adoption**: for each feature table (`athlete_messages`, `interactions`,
  `events`, `video_links`, `coaches`, `offers`, `performance_metrics`,
  `documents`) select `user_id`, dedupe in JS (supabase-js has no COUNT DISTINCT),
  count distinct users → `{ feature, users }`; include `totalUsers` (from `users`)
  so the page renders adoption %.

Return shape:
```ts
interface AdminGrowth {
  funnel: { stage: string; count: number; dropoffPct: number | null }[];
  activity: { dau: number; wau: number; mau: number; dailyTrend: { day: string; count: number }[] };
  adoption: { totalUsers: number; features: { feature: string; users: number }[] };
  windowDays: number;
}
```

### 3. `pages/admin/growth.vue` + `useAdminGrowth` + Growth nav

- `definePageMeta({ layout: "admin", middleware: ["auth", "admin"] })`.
- `composables/useAdminGrowth()` → `{ data, loading, error, fetchGrowth(days) }`
  (auth headers via `useAdminAuthHeaders`).
- Layout: `AdminTimeRange` up top (drives `fetchGrowth`); **Funnel** as
  `AdminStatTile` row with drop-off %; **DAU/WAU/MAU** tiles + a daily-active
  **line** `AdminChart`; **Adoption** as a **bar** `AdminChart` (or `AdminDataTable`)
  of % per feature.
- Add `{ to: "/admin/growth", label: "Growth" }` to `layouts/admin.vue` `links`.

## Security / performance

- `requireAdmin` before any query; service-role **SELECT/count only** — no mutation.
- Window-bounded queries, **minimal columns** (`user_id` + timestamps) — **no PII**
  leaves the endpoint, only counts + user_ids for dedup (user_ids not rendered).
- Activity-union = 5 bounded queries deduped in JS. Fine at current scale
  (< ~100k activity rows/window). **Perf ceiling noted** — if activity grows large,
  move distinct-counting to a Postgres RPC (deferred, same rationale as Ops pg-metrics).

## Error handling

- Per-section failures degrade gracefully (a failing feature count → that feature
  omitted/zero, not a 500 for the whole page), mirroring the DB-health pattern.
- Generic 500 message on hard failure (no raw Postgres text). Composable `{ data,
  loading, error }` with friendly message.

## Testing

- **Unit:** `countByDay` field param (buckets a non-`created_at` column correctly +
  default still works); funnel stage + drop-off math; activity-union distinct daily
  trend + 1/7/30 window counts (dedup across tables + across a user's multiple
  rows/day); adoption distinct-user counts + % ; graceful per-section failure.
- **Component:** page renders funnel tiles, DAU/WAU/MAU tiles + trend chart, adoption
  chart; `AdminTimeRange` refetches.
- **E2E:** admin sees `/admin/growth` with the three sections; non-admin redirected.
  Run with `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`.

## Reuse (from foundation)

`AdminChart` (line/bar), `AdminStatTile`, `AdminTimeRange`, `AdminDataTable`,
`adminQuery` (`dayBuckets` + generalized `countByDay`), `useAdminAuthHeaders`,
`layouts/admin.vue` nav.

## NOT in scope (YAGNI)

- Retention cohort grid (→ own spec).
- Login-recency gauge (`auth.users.last_sign_in_at`).
- Sport/division/geographic breakdowns (not among the 3 chosen views).
- No new tables; no event instrumentation.

## Open items

- Confirm the exact activity timestamp column to use per table during
  implementation (`interactions.occurred_at` vs `created_at`; the others
  `created_at`/`sent_at`) — pick the NOT NULL one that best represents "did a thing".
- Confirm `family_invitations` "accepted" predicate (`accepted_at IS NOT NULL` vs a
  `status` value) against the live column values.
