# Admin Foundation — Design Spec

**Date:** 2026-08-17
**Status:** Approved (design), pending implementation plan
**Author:** Chris + Claude
**Subsystem:** Spec A of 4 (Foundation → #1 Support → #2 Ops → #3 Growth)

## Context

The admin area (`admin.myrecruitingcompass.com`) currently lives in one ~850-line
`pages/admin/index.vue` that rolls its own in-page tab bar. We are about to add
three sizable subsystems on top of it:

1. **Support tooling** — user lookup/detail, read-only view-as, delivery log
2. **Ops health** — cron dashboard upgrade, in-app Sentry feed, DB health
3. **Growth analytics** — signup funnel, DAU/WAU/MAU, feature adoption

Building those on the current monolith would push a single file past 2000 lines
and duplicate chart/table/query plumbing three times. This spec lays the shared
rails **once**, behavior-preserving for everything that exists today.

Foundation is intentionally thin: it lays rails, it does not build features.
Impersonation belongs to #1, the Sentry API to #2, analytics queries to #3.

## Decisions (locked with Chris)

| Fork | Decision |
|---|---|
| Impersonation level | Read-only view-as, audit-logged (built in #1, not here) |
| Admin shell | Route-based tabs + dedicated `layouts/admin.vue` (full migration, not hybrid) |
| Analytics infra | Query live from existing tables, no `analytics_events` table |
| Audit trail | One new `admin_audit_log` table (governance backbone) |
| Sentry feed | Live embed via Sentry API + new `SENTRY_API_TOKEN` secret (built in #2) |

## Existing patterns to follow (do not reinvent)

- Each admin feature = `composables/useAdmin*.ts` (client) + `requireAdmin`-gated
  `server/api/admin/*` endpoint (server). Keep this pairing.
- Admin auth: client `middleware/admin.ts` (redirect non-admin) + server
  `requireAdmin(event)` in `server/utils/auth.ts:215` (403 on non-admin, re-checks
  `is_admin` in DB). Both stay load-bearing.
- Service-role-only tables use RLS **no-policy** (like `cron_runs`); server writes
  via `useSupabaseAdmin()`.
- Empty/loading/error UI = existing `DesignSystem*` components, never inline.
- Chart configs needing raw hex carry `// audit-ignore` (per `npm run audit:tokens`).

## Scope

### 1. Admin shell → routes + layout

**New:** `layouts/admin.vue` — the nav shell (sidebar or top tab bar), with the
admin gate applied once via `definePageMeta`/layout-level `middleware: ["auth","admin"]`.
Active-route highlighting. All admin pages set `layout: "admin"`.

**Migrate** the current `pages/admin/index.vue` in-page tabs into route pages,
**1:1 behavior-preserving** (a v-if block becomes a route page; its
`useAdmin*` composable and `server/api/admin/*` endpoint are untouched):

| Current tab (v-if in index.vue) | New route/page | Data source (unchanged) |
|---|---|---|
| Overview | `pages/admin/index.vue` (trimmed to Overview) | `useAdminStats` / `stats.get.ts` |
| Users | `pages/admin/users.vue` | `users.get.ts`, delete/bulk-delete |
| Pending invitations | `pages/admin/invitations.vue` | `pending-invitations.get.ts` |
| Health | `pages/admin/health.vue` | `useAdminHealthCheck` / `health.get.ts` |
| Jobs | `pages/admin/jobs.vue` | `useAdminCronRuns` / `cron-runs.get.ts` |
| Tools | `pages/admin/tools.vue` | static links |

Existing standalone utility pages (`batch-fetch-logos.vue`, `migrate-school-sizes.vue`,
`notifications/broadcast.vue`, `signup.vue`) adopt `layout: "admin"`; otherwise
unchanged. `signup.vue` keeps its token-gate (it is reachable pre-admin, so it must
NOT require the admin middleware — verify it still works unauthenticated).

**Risk:** this is the largest chunk of foundation work and the main regression
surface. Mitigation = E2E regression guard (below) proving every migrated route
still renders and loads its data.

### 2. Audit backbone (new table + helper + view)

**Migration** (`admin_audit_log`):

```sql
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
-- No policies: service-role only (matches cron_runs pattern).
create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_admin_id);
create index admin_audit_log_target_idx on public.admin_audit_log (target_user_id);
```

Apply live via Supabase MCP `apply_migration` (repo `npx supabase db push` is
broken on this project — schema_migrations drift, per CLAUDE.local.md).

**Helper** `server/utils/adminAudit.ts`:

```ts
export async function logAdminAction(
  event: H3Event,
  entry: { action: string; targetUserId?: string; meta?: Record<string, unknown> }
): Promise<void>
```

- Reads actor id from the already-required admin session.
- Fire-and-forget: wraps its own insert in try/catch, logs failures via
  `useLogger`, **never throws upstream** — auditing must never break the audited
  action.
- Action strings are a documented enum-ish set: `view_as.start`, `view_as.stop`,
  `user.delete`, `user.bulk_delete`, `admin.grant`, `admin.revoke`, `invite.resend`.

**View** `pages/admin/audit.vue` + `server/api/admin/audit-log.get.ts`:
- Paginated (cursor or offset on `created_at desc`), optional filter by `action`
  and `actor_admin_id`.
- Renders via `AdminDataTable` (below). Read-only.

### 3. Shared client primitives (`components/admin/`)

- **`AdminChart.vue`** — thin Chart.js wrapper. Props: `type` (line|bar|sparkline),
  `data`, `options?`. Theme-token colors resolved to hex in config with
  `// audit-ignore`. Destroys chart instance on unmount. Consumed by #2 + #3.
- **`AdminStatTile.vue`** — label, value, optional trend arrow (delta vs prior
  period), optional inline sparkline. Consumed by Overview, #2, #3.
- **`AdminTimeRange.vue`** — 7d/14d/30d/90d segmented control; `v-model` a
  `{ days: number }` (or from/to). Shared by ops + analytics.
- **`AdminDataTable.vue`** — sortable, paginated table. Slots for cell rendering.
  Delegates empty/loading/error to `DesignSystem*`. Consumed by audit log, user
  lists, delivery log.

### 4. Shared server helper (`server/utils/adminQuery.ts`)

Seeded minimal; grows with #2/#3. Initial contents:
- Date-bucketing helper (day/week buckets over a range) for time-series endpoints.
- Thin `useSupabaseAdmin()` COUNT / GROUP-BY wrappers so analytics endpoints stay
  declarative. No feature queries yet — those arrive with their subsystem.

## Data flow

```
Admin route page (layout: admin)
  → useAdmin* composable
    → $fetch('/api/admin/*')  [requireAdmin gate]
      → useSupabaseAdmin() / adminQuery helpers
      → logAdminAction() on sensitive writes  → admin_audit_log
```

## Error handling

- Server endpoints: `requireAdmin` throws 403 before any work. Wrap DB calls;
  return user-friendly errors (per `claude/logging.md`).
- `logAdminAction` swallows its own errors (never blocks the audited action).
- Client composables: `{ data, loading, error, fetch* }` shape, try/catch,
  friendly messages.

## Testing

- **Unit (Vitest):**
  - `adminAudit` — correct row shape; never throws even when insert fails (mock
    a failing client).
  - `adminQuery` — bucketing boundaries (inclusive/exclusive, tz correctness).
  - `AdminChart` / `AdminStatTile` / `AdminTimeRange` / `AdminDataTable` — render,
    props, emits, empty/loading/error delegation.
- **Migration RED→GREEN:** service-role insert succeeds; non-service-role read is
  blocked (no policy).
- **E2E (Playwright) — refactor regression guard:**
  - non-admin hitting any `/admin/*` route → redirected to `/`.
  - each migrated route (`index`, `users`, `invitations`, `health`, `jobs`,
    `tools`, `audit`) renders and loads its data without console errors.
  - `signup.vue` still reachable via token pre-admin (not gated by admin mw).

## Explicitly NOT in foundation (YAGNI)

- Impersonation / view-as logic → Spec B (#1).
- Sentry API integration → Spec C (#2).
- Analytics feature queries (funnel, DAU, adoption) → Spec D (#3).
- No `analytics_events` table (decided: live-query).

## Open items to resolve in later specs

- **#1 (Support):** delivery log needs Resend **webhook → DB** ingestion. Unknown
  whether it exists today. Verify at the start of Spec B; if absent, add a webhook
  endpoint + delivery-status storage there — NOT in foundation.
- **#2 (Ops):** `SENTRY_API_TOKEN` provisioning (scope `issue:read`); note the
  existing build-plugin token 403s on issues (per memory `sentry-setup`).

## Build order

Foundation ships first and merges before #1 starts, so #1/#2/#3 build on stable
rails. Within foundation, suggested sequence: audit table + helper → shared
primitives → shell/route migration (biggest, do last with the regression guard
green).
