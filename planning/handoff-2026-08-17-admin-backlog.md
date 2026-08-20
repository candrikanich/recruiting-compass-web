# Admin Suite — Backlog Handoff

**Created:** 2026-08-17 (end of the 4-subsystem admin build session)
**Status of the suite:** Foundation (A) + Support (B) + Ops (C) + Growth (D) all merged to `develop`, promotion PR #399 (develop→main) open. This doc covers the **three items deferred by decision** during that session.

**How to run each item:** same loop the suite used — `superpowers:brainstorming` → design spec in `docs/superpowers/specs/` → `superpowers:writing-plans` → `superpowers:subagent-driven-development`. Each item is its own spec/plan/branch off `develop`.

**Reusable rails already on develop** (do not rebuild): `components/Admin/{AdminChart,AdminStatTile,AdminTimeRange,AdminDataTable}.vue`; `server/utils/adminAudit.ts` (`logAdminAction` + `AdminAuditAction` enum); `server/utils/adminQuery.ts` (`dayBuckets`, `countByDay(rows,from,to,field?)`); `utils/growthAnalytics.ts` (`ActivityRow`, `dailyActiveUsers`, `windowActiveCount`, `funnelWithDropoff`, `adoption`); `layouts/admin.vue` nav; `useAdminAuthHeaders`. Admin E2E needs `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`.

**Recommended order:** B2 (self-contained, high ops value, no external token) → cohorts (pure build on existing rails) → C2 (blocked on a token from Chris). Reorder freely.

---

## C2 — In-app Sentry issue feed

**Why deferred:** needs a new `SENTRY_AUTH_TOKEN` (issue:read scope) from Chris — external setup friction. Was carved out of Spec C (Ops).

### Recon (confirmed this session)
- Sentry is **SDK/capture-only**. `sentry.client.config.ts` + `sentry.server.config.ts` (`Sentry.init`, `beforeSend` drops 4xx); `server/plugins/sentry.ts` scopes + captures Nitro errors. Module `@sentry/nuxt/module` in `nuxt.config.ts:38`.
- **No issue-reading API client, no auth token anywhere.** Only env var is `NUXT_PUBLIC_SENTRY_DSN` (public runtimeConfig `sentryDsn`) + `SENTRY_DSN`.
- Org/project are **hardcoded literals**: `nuxt.config.ts:216-217` → `org: "chris-andrikanich"`, `project: "javascript-nuxt"`. Reuse these for API calls.
- Note: `build-plugin token can't resolve issues (403)` — the existing build token is NOT sufficient. Need a proper user/org auth token with `issue:read` (and `event:read` if drilling into events).
- This session has `mcp__claude_ai_Sentry__*` MCP tools available, but those are **not** wired into the app — the app needs its own server-side HTTP client.

### Prerequisites (Chris)
1. Create a Sentry auth token (Settings → Auth Tokens or an internal integration) with scope `issue:read` (+ `event:read` if needed).
2. Add `SENTRY_AUTH_TOKEN` to the env (local `.env`, Vercel prod + QA). Never expose it client-side.

### Decisions to lock in brainstorm
- Scope: unresolved prod issues list (count, title, culprit, lastSeen, level, permalink) — probably a top-N + a "N unresolved" tile. Drill-in? (defer to permalink into Sentry UI, don't rebuild issue detail).
- Placement: Ops area — extend the Health tab or add a small "Errors" panel. (Suite convention = enhance existing tabs.)
- Env/region: Sentry API base is `https://sentry.io/api/0/` (or self-hosted host). Confirm.
- Caching: Sentry API rate limits — cache the response server-side briefly (e.g. 60s) to avoid hammering on every page load.

### Build sketch
- `server/utils/sentryApi.ts` — thin fetch client: `GET /api/0/projects/{org}/{project}/issues/?query=is:unresolved&statsPeriod=14d`, `Authorization: Bearer ${SENTRY_AUTH_TOKEN}`. Read org/project from the hardcoded config (or new `SENTRY_ORG`/`SENTRY_PROJECT` env). Handle 401/403/429 gracefully.
- `server/api/admin/ops/sentry-issues.get.ts` — `requireAdmin`, calls the client, returns a normalized issue list (no raw token, no PII). Graceful-degrade (missing token → empty + a "not configured" flag, not a 500).
- `composables/useAdminSentryIssues.ts` + a panel using `AdminDataTable` / `AdminStatTile`.
- Tests: client URL/headers, token never leaked, graceful no-token path; component renders issues + "not configured" state; E2E behind `requireAdmin`.

### Gotchas
- Token must be server-only. Do NOT read it in any `pages/`/`components/` code.
- `beforeSend` drops 4xx in capture — unrelated to the read API, but means the feed only shows what Sentry actually stored.
- Dev + E2E events pollute the Sentry dashboard (per memory `sentry-setup`) — the feed will show test noise in non-prod; consider an `environment:production` query filter.

---

## B2 — Email delivery log

**Why deferred:** it's a full net-new stack (webhook + table + send-path change + Resend dashboard config), heavier than the rest of Support combined. Carved out of Spec B.

### Recon (confirmed this session)
- **No Resend webhook exists** — no `server/api/webhooks/*`, no svix/signature verification, no delivered/bounced/complained handler.
- Email send is **fire-and-forget**: `server/utils/emailService.ts` `sendViaResend` returns `{success, messageId}` **in memory only** — nothing persisted. `sendEmail`/`sendInviteEmail`/`sendNotificationEmail` all call it; none write to a table. The `messageId` (the key to correlate webhook events) is **discarded**.
- **No delivery-status table** — `email_events`/`sent_emails`/`email_log` don't exist. `email_optouts` exists (unsubscribe suppression only). `athlete_messages` is a client-composed mailto/sms log — **not** Resend delivery, no status/messageId columns.

### Prerequisites (Chris)
1. Resend dashboard → add a webhook endpoint (points at `https://<prod-host>/api/webhooks/resend`), subscribe to `email.sent/delivered/bounced/complained/opened` events.
2. Resend gives a webhook **signing secret** → add `RESEND_WEBHOOK_SECRET` to env (prod + QA). Resend uses **svix** signatures — verify them.

### Decisions to lock in brainstorm
- Table shape: `email_events(id, message_id, event_type, email_to, template/tag, payload jsonb, occurred_at, created_at)`; RLS no-policy/service-role (matches `cron_runs`/`admin_audit_log`).
- Also persist the **outbound send** at send time (message_id, to, template, sent_at) so the log shows "sent" even before webhooks arrive, and so webhook events can join to a send.
- Admin view: an "Email log" panel/page (filter by status/recipient) — `AdminDataTable`. Bounce/complaint counts as `AdminStatTile`s.
- Scope opens/clicks? (probably yes for `delivered/bounced/complained`; opens optional).

### Build sketch (each ~a task in the plan)
1. Migration: `email_events` table (+ index on `message_id`, `occurred_at`). Apply live via Supabase MCP.
2. `server/api/webhooks/resend.post.ts` — verify svix signature with `RESEND_WEBHOOK_SECRET` (use the `svix` lib or manual HMAC), insert an `email_events` row per event. **Not** `requireAdmin` (it's Resend calling) — signature IS the auth. Reject unsigned/invalid → 401. Idempotent on Resend's event id.
3. `server/utils/emailService.ts` — persist the `messageId` + metadata to `email_events` (as a `sent` row) after `sendViaResend` succeeds (fire-and-forget, never block the send).
4. `server/api/admin/email-log.get.ts` (`requireAdmin`) + composable + admin panel.
5. Tests: signature verify (valid/invalid/replay), event→row mapping, send-time persistence, admin list; E2E for the admin panel.

### Gotchas
- Signature verification is the security boundary — get it right (svix has a verifier; don't roll your own carelessly). Reject on failure, never trust the body.
- Fire-and-forget the send-time persist — a DB hiccup must not break outbound email.
- Single shared DB is prod — the webhook will receive real prod events; the table fills immediately once live.
- Backfill isn't possible (past sends discarded the messageId) — the log starts empty and grows from deploy.

---

## Retention cohort grid (Growth follow-up)

**Why deferred:** heaviest analytics piece; benefits from the activity-union being proven first (it is, in Spec D). Carved out of Spec D.

### Recon
- Reuse Spec D's `utils/growthAnalytics.ts` activity union → `ActivityRow[]` (the same 5 tables: interactions `occurred_at`/`logged_by`, athlete_messages `sent_at`/`user_id`, events/video_links/offers `created_at`/`user_id`).
- Signup date = `users.created_at`. `family_invitations`/`family_members.added_at` also available.
- No new tables (live-query, consistent with Growth's decision).

### Decisions to lock in brainstorm
- Cohort unit: signup **week** (or month) × **weeks-since-signup** grid; cell = % of that cohort active (had ≥1 activity-union write) in week N. Confirm week vs month + how many periods (e.g. 8-12 weeks).
- "Active in week N" reuses `windowActiveCount`-style distinct logic per (cohort, week) — new pure helper `retentionCohorts(signups, activityRows, periods)` in `growthAnalytics.ts`, unit-tested.
- Render: heatmap-style `AdminDataTable` (color-scaled cells) or a small custom grid. Add to the Growth page (new section) or its own sub-tab.

### Build sketch
1. Pure helper `retentionCohorts(...)` in `utils/growthAnalytics.ts` + unit tests (cohort bucketing, week-N active %, empty cohorts).
2. Extend `server/api/admin/growth.get.ts` (or a new `growth-retention.get.ts`) to fetch signups + a **longer** activity window (cohorts need history back to the earliest cohort — mind the window; the Spec-D 30d floor is too short). `requireAdmin`, SELECT-only.
3. Growth page: cohort heatmap section + `AdminTimeRange`/cohort-count control.
4. E2E + gate.

### Gotchas — READ Spec D's final review
- **Window math bit us in Spec D** (MAU undercounted when the selected range < 30d, because activity was fetched only over the selected window). Cohorts fetch activity going back to the **oldest cohort start** — fetch the union over `[earliest_cohort_start, now]`, not the display window. Don't repeat the undercount bug.
- **Perf ceiling:** the activity union is 5 unbounded-ish queries deduped in JS. For a wide cohort range this could get heavy — if activity rows grow large, move distinct-counting to a **Postgres RPC** (the deferral rationale noted in both Ops and Growth specs). Bound the cohort range.
- Partial-period edges: the current (incomplete) week/cohort will read low — label it or exclude.

---

## Cross-cutting notes
- **Prod is a single shared DB** (`xpxzhqghxecsjhvklsqg`) — every migration/write is prod. Apply migrations via Supabase MCP `apply_migration` (repo `npx supabase db push` is broken here — schema_migrations drift). Record applies in `claude/database.md`.
- **Shared-checkout race is real** — a concurrent agent + a background formatter churned the tree repeatedly this session. Confirm `git branch --show-current` before every commit; prefer a git worktree for isolation if running alongside other sessions.
- **Admin E2E** always needs `NUXT_PUBLIC_ADMIN_HOST=localhost:3003` or `/admin` bounces to the prod subdomain login.
- Specs/plans convention: `docs/superpowers/{specs,plans}/YYYY-MM-DD-admin-<topic>-{design}.md`. This session's four are the template.
