# Admin Support Tooling (#1) — Design Spec

**Date:** 2026-08-17
**Status:** Approved (design), pending implementation plan
**Author:** Chris + Claude
**Subsystem:** Spec B of 4 (Foundation → **#1 Support** → #2 Ops → #3 Growth)
**Builds on:** `docs/superpowers/specs/2026-08-17-admin-foundation-design.md` (shipped to develop)

## Context

With the admin foundation shipped (route-based shell, audit backbone, shared
primitives), the highest-leverage solo-founder win is support tooling: find any
user and see their full recruiting picture **read-only** to reproduce a support
issue — no impersonation, no writes, every view audited.

Codebase findings that shaped this (from exploration):
- The admin users list (`server/api/admin/users.get.ts`) has pagination but **no
  search** and **no per-user detail endpoint** — both net-new here.
- Nearly all user data is scoped by `family_unit_id`, resolved via
  `family_members (user_id → family_unit_id)`.
- Auth model is **service-role + app-level checks** (`useSupabaseAdmin()` bypasses
  RLS); admin endpoints already use it. The safe read-only view-as is therefore
  service-role SELECT filtered to the target's `family_unit_id` — **not** borrowing
  the target's session/JWT.
- `logAdminAction` (foundation) already has a `view_as.start` action and reads the
  actor from `event.context.adminUserId` (set by `requireAdmin`).
- A parent→player read-only view precedent exists (`ViewIndicator.vue`,
  `parent_view_log`, `middleware/viewLogging.global.ts`) — reuse its banner styling.

## Decisions (locked with Chris)

| Fork | Decision |
|---|---|
| Email delivery log | **Deferred to Spec B2** (full net-new stack: Resend webhook + svix verify + `email_events` + messageId persistence + dashboard config). Out of scope here. |
| View-as mechanism | **Dedicated admin read-only snapshot page** at `/admin/users/[id]` aggregating the target's `family_unit_id` data. NOT impersonating real app pages. |
| Support write-actions | **None this spec** — read-only. Grant/revoke admin, resend invite, etc. → later spec. (Delete already lives on the users list.) |
| View-as audit | **One `view_as.start` row per detail-page open** (admin, target, family_unit_id). No `view_as.stop` — a snapshot page has no session to end. |

## Scope

### 1. User search (extend `server/api/admin/users.get.ts`)

- Add optional `search` query param. When present, filter by
  `email ILIKE %q% OR full_name ILIKE %q%`. Preserve existing pagination
  (`limit` ≤ 100, `offset`, `count: exact`, `created_at desc`).
- Add a debounced (~300ms) search box to `pages/admin/users.vue`, wired through
  `useAdminUsers` (extend its fetch to pass `search`). Keep it additive — do not
  regress the existing list/pagination behavior.

### 2. User detail endpoint (net-new: `server/api/admin/users/[id].get.ts`)

`requireAdmin(event)` first. Service-role (`useSupabaseAdmin()`), **SELECT-only**.

Steps:
1. Read `[id]` param (validate it's a uuid via Zod; 400 on malformed).
2. Fetch the account row from `users` with an explicit **safe-column allowlist**
   (see below). 404 if not found.
3. Resolve `family_unit_id` via `family_members` where `user_id = [id]`. A user may
   have **no** family unit → the family/recruiting sections come back empty; do NOT
   500.
4. If a family unit exists, aggregate (each capped, most-recent-first):
   - **Family**: `family_units` row, `family_members` (all members + their
     role/relationship), pending `family_invitations`.
   - **Athletes**: `player_profiles` for the family unit.
   - **Recruiting** (counts + a capped recent slice, e.g. 10 each): `schools`,
     `coaches`, `interactions`, `offers`, `events`, `athlete_messages`.
5. `logAdminAction(event, { action: "view_as.start", targetUserId: id, meta: { family_unit_id } })`
   — fire-and-forget, never blocks the response.
6. Return a single typed aggregate object (see Interfaces).

**Safe-column allowlist for the account section** (never select secret/auth
columns — no password hashes, tokens, reset secrets):
`id, email, full_name, role, is_admin, created_at, graduation_year`
(implementer: verify these column names against the live `users` schema; if a
listed column doesn't exist, omit it — never widen to `select('*')`).

### 3. User detail page (net-new: `pages/admin/users/[id].vue`)

- `definePageMeta({ layout: "admin", middleware: ["auth", "admin"] })`.
- `composables/useAdminUserDetail(id)` → `{ data, loading, error, fetchDetail }`,
  attaches admin auth headers (`useAdminAuthHeaders`), calls the detail endpoint.
- Renders the aggregate read-only:
  - A persistent **red banner**: "Read-only admin view — you are viewing
    {email}'s data." Reuse `ViewIndicator.vue`'s styling/tokens (brand tokens, no
    raw hex).
  - An `AdminStatTile` row for the counts (schools / coaches / interactions /
    offers / events / athletes).
  - `AdminDataTable` sections for family members, athletes, and the recent
    recruiting rows.
  - **No write controls** anywhere on the page.
- The users list (`pages/admin/users.vue`) links each row to
  `/admin/users/{id}`.

### 4. Types / interfaces

```ts
interface AdminUserDetail {
  account: {
    id: string; email: string; full_name: string | null;
    role: string; is_admin: boolean; created_at: string;
    graduation_year: number | null;
  };
  familyUnitId: string | null;
  family: { unit: FamilyUnitRow | null; members: FamilyMemberRow[]; pendingInvitations: FamilyInvitationRow[] };
  athletes: PlayerProfileRow[];
  recruiting: {
    counts: { schools: number; coaches: number; interactions: number; offers: number; events: number; messages: number };
    recentInteractions: InteractionRow[];
    recentOffers: OfferRow[];
    recentEvents: EventRow[];
    recentMessages: AthleteMessageRow[];
  };
}
```

(Row types reuse existing app types where they exist; otherwise define minimal
shapes for the fields the page renders.)

## Security

- `requireAdmin` gates the detail endpoint before any query.
- Service-role client is **SELECT-only** in this endpoint — no insert/update/delete
  code path exists.
- **Safe-column allowlist** on the account section — explicit column list, never
  `select('*')`, so password/token/secret columns cannot leak.
- uuid validation on `[id]` (Zod) — reject malformed ids with 400.
- The read is **admin-global by design** (admins may view any user), same trust
  model as the audit log; no per-caller scoping needed beyond `requireAdmin`.
- Every detail view writes a `view_as.start` audit row — the audit log is the
  accountability record for admin access to user data.

## Error handling

- Malformed uuid → 400. User not found → 404. DB error → 500 with a generic
  message (no raw Postgres text), per `claude/logging.md`.
- `logAdminAction` never throws upstream (foundation guarantee) — a failed audit
  insert must not break the view, but is logged server-side.
- Composable: `{ data, loading, error }`, try/catch, user-friendly error string.

## Testing

- **Unit (Vitest):**
  - Detail endpoint: aggregation shape; family-unit **present** and **absent**
    paths; `view_as.start` audit call fired with correct actor/target/meta;
    **safe-columns-only** — assert the account object contains only allowlisted
    keys and no sensitive column even if the row has more.
  - Users list search: `search` filters by email/name; absent `search` preserves
    existing behavior.
  - `useAdminUserDetail` composable: loads, error path.
- **Component:** detail page renders each section; red read-only banner present;
  **no write controls** rendered.
- **E2E (Playwright):** admin opens `/admin/users/{id}` and sees the snapshot;
  non-admin is redirected; an audit row is written. Run with
  `NUXT_PUBLIC_ADMIN_HOST=localhost:3003` (admin-host redirect otherwise bounces
  local `/admin` to prod — see foundation notes / memory).

## Reuse (from foundation, do not rebuild)

`logAdminAction` + `view_as.start` action; `AdminDataTable`, `AdminStatTile`;
`layouts/admin.vue`; `useAdminAuthHeaders`; existing `users.get.ts` + `useAdminUsers`.

## NOT in scope (YAGNI)

- Any write/support action (grant/revoke admin, resend invite, reset onboarding).
- Email delivery log (Spec B2).
- Impersonating real app pages / session borrowing.
- Billing/subscription data (no billing tables exist yet).

## Open items

- Confirm exact `users` column names for the safe allowlist against the live
  schema during implementation (omit any that don't exist; never widen).
- Row-type reuse: check `types/` for existing Interaction/Offer/Event/PlayerProfile
  types before defining new minimal shapes.
