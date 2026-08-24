# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Standing Preferences (do not archive)

- **Output format by reader, not by default**: For artifacts Chris will read once on a phone or share with someone non-technical — session recaps, status overviews, weekly summaries, "where are we on X" snapshots — invoke the `visual-explainer` skill to produce self-contained HTML. For artifacts that future-Claude or Chris will edit (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, lesson files, plans) — stay markdown. When unsure: read = HTML, edit = markdown.

## Current Session (2026-08-24 — Unified missing-info step MERGED to develop)

**Status:** ✅ DONE + MERGED. #2 feature (unified missing-info compose step) shipped to develop.
**PR #459** MERGED @ `272fde6e` (fast-forward, branch `feat/unified-missing-info-step` deleted). All CI green (lint/types, unit, GitGuardian, Vercel). Now **live on QA only — NOT promoted to main.** Chris testing on QA, will promote to main himself.
**Tests (pre-merge):** full suite **7998 pass**. Lint/type-check/audit:tokens PASS. E2E staged flow PASS live (chromium).
**Handoff:** `planning/handoff-2026-08-24-unified-missing-info-step.md`

**Gated migration — APPLIED LIVE this session** via Supabase MCP to prod DB `xpxzhqghxecsjhvklsqg` (serves prod+QA): `20260905000000_intended_major_template_var.sql` — `intendedMajor` template var registered (source `pref:player.intended_major`, sort 34) + `intro-standard` body "planning to study" clause. **Live-confirmed:** demo player1 (no intended_major) → composer "Complete your info" step renders the "Intended major — What do you plan to study?" row. Migration file rode in on #459, so prod sees the var immediately on promote.

**Refactor PRs shipped to develop earlier this arc (Chris merged):** #439 CommunicationPanel split (1318→275), #440 registry-derived player schema + drift guard, #441 performance page split (847→612), #445 recovered stranded trend fix + a live lint error someone `--no-verify`'d onto develop, #446 SMS cap 160→480 (iOS parity), #448 template resolver decompose (173→40), #449 player-details form split (450→310), #450 ALL_SPORTS derive + coach refresh dedup, #451 registryCache→Pinia.

**SDD workspace deleted** (`.superpowers/sdd/2026-08-23-unified-missing-info-step-plan/`) post-merge — git is the record.

**Open on develop base (Chris updating in GitHub):** dependabot #454–#458, refactor/docs #449–#452.

## Current Session (2026-08-22 — E2E suite GREEN + shipped to develop)

**Status:** ✅ DONE. E2E suite **177 → 0**. PR #419 (debug/e2e-green → develop) MERGED @ `f186dad0`. Branch deleted. develop in sync.
**Final CI (run 32588335716):** Chromium 491 pass / 0 fail / 3 flaky; WebKit 493 pass / 0 fail / 1 flaky. Seed validated live in global-setup.
**Confirm-email toggle:** Chris disabled it on test project `ahpethltxopkjxxzwmmb` → cleared the 8 auth/signup fails.
**Shipped (3 commits on develop now):**
- `33392454` admin cron trigger → `useNitroApp().localFetch` (relative `$fetch` 502'd in CI node-server preset). Lesson in MEMORY: [[internal-fetch-use-localfetch]].
- `bfc1f796` WebKit specs: signup-a11y outline-longhand serialization + Space-select radio; session-timeout tolerant `goto`.
- `7f30ce81` seed codified — `tests/e2e/seed/reference-data.ts` (player Baseball pref, 8 nces e2e rows, task deadline_offset ×77 by slug, cron_runs). Idempotent; runs via `db:seed:test` (global-setup `shouldSeed = CI==='true'`).
**⚠️ Shared-checkout race hit again this session:** concurrent session `recruiting-compass-web-57` merged **PR #420** (`fix/template-optional-token-orphans` — template optional-token gating + dashboard stat layout) onto develop mid-session; the "Dashboard WIP" at session start was ITS work, not stray. develop tip now `0616f705` (#420 on top of #419). My local checkout got branch-switched under me. See [[shared-checkout-git-race]].

### NEXT (own effort — Chris queued): E2E test-isolation tech debt
Remaining flakes are the **school-leak** bucket: suites leak `schools` into the shared `player@test.com` account → dashboard-8-2 "No schools tracked yet" empty-state assertions see leaked `e2e-<runid>` schools; also `interaction-detail-wcag:300` context-close. Non-blocking (pass on retry) but real. See MEMORY [[e2e-test-account-school-leak]] + [[e2e-cross-worker-afterall-race]]. Fix direction: per-run RUN_ID-scoped school data + teardown, OR dedicated per-worker accounts. Separate branch off develop.

## Current Session (2026-08-17 — Admin Suite: ALL 4 SPECS DONE — A Foundation + B Support + C Ops + D Growth)

### Spec D — Growth analytics (#3) — COMPLETE, pending branch-finish
**Status:** DONE on `feat/admin-growth` (off develop, 7 commits + 2 fixes, **NOT merged/pushed**). SDD ledger `.superpowers/sdd/2026-08-17-admin-growth/`. Final review READY TO MERGE + 2 Important correctness fixes landed.
**Built:** `utils/growthAnalytics.ts` pure helpers (dailyActiveUsers/windowActiveCount/funnelWithDropoff/adoption) + `countByDay` field param. `server/api/admin/growth.get.ts` (requireAdmin, SELECT-only, activity-union DAU/WAU/MAU over interactions/athlete_messages/events/video_links/offers, funnel, adoption, graceful degrade, days clamp, **activity window floor max(days,30)**). `useAdminGrowth` + `types/adminGrowth.ts` + `pages/admin/growth.vue` (AdminTimeRange + funnel tiles w/ `formatDropoff` + DAU/WAU/MAU + trend line + adoption bar) + Growth nav link.
**Tests:** unit 7878/0 + fixes; admin E2E 2/2 (stable) w/ NUXT_PUBLIC_ADMIN_HOST=localhost:3003; type-check/lint/audit clean.
**Final-review bugs fixed:** MAU/WAU undercount on <30d windows (activity now floored to 30d, trend stays windowed); funnel drop-off double-dash render (Accounts>Accepted → negative; `formatDropoff` shows drop only when >0).
**Deferred (non-blocking):** dailyTrend first-bucket partial day; useAdminGrowth raw fetch style; countByDay field param unused-by-growth (guarded).
**Decisions:** active = write-activity union (not login-recency); cohorts → own spec; funnel/adoption all-time vs DAU/WAU/MAU windowed (intentional).
**Foreign commit:** `40af6791` (prettier-plugin-tailwindcss, concurrent session) interleaved on branch — config-only, left in place, surface at merge.

### Admin suite arc — remaining backlog after this session
Spec C2 (Sentry feed — needs SENTRY_AUTH_TOKEN issue:read), Spec B2 (email delivery log — Resend webhook + email_events), retention-cohorts spec (Growth follow-up). All 4 core subsystems (A/B/C/D) merged to develop, **develop NOT pushed** this session.

### Spec C — Ops health (#2) — MERGED to develop

### Spec C — Ops health (#2) — COMPLETE, pending branch-finish
**Status:** DONE on `feat/admin-ops` (off develop, 6 commits + forensics fix, **NOT merged/pushed**). SDD ledger `.superpowers/sdd/2026-08-17-admin-ops/`. Final review READY TO MERGE + fix landed.
**Built:** (1) cron dashboard upgrade — per-job sparklines + consecutive-failure badges + guarded **Run now** in `pages/admin/jobs.vue`; pure derivations in `utils/cronDashboard.ts`. (2) **Guarded cron trigger** `server/api/admin/cron/trigger.post.ts` — server-side allowlist (5 triggerable, orphaned-storage-sweep dryRun-forced, 3 destructive → 403), invokes cron via internal `$fetch` + `x-cron-secret`, audits success/blocked/failed via new `cron.trigger` action. (3) **DB health panel** `server/api/admin/ops/db-health.get.ts` + `useAdminDbHealth` + Health-tab section (row counts, storage buckets, orphaned dryRun preview; graceful degradation). `cron-runs.get.ts` recent slice 50→150.
**Tests:** unit 7870/0; admin E2E 3/3 (stable) w/ NUXT_PUBLIC_ADMIN_HOST=localhost:3003; type-check/lint/audit clean; LIVE-verified: `cron.trigger` audit rows + fresh `health-ping` cron_runs from E2E (full trigger→invoke→record→audit path works).
**Deferred (non-blocking):** no rate-limiting on manual trigger (admin-only, low risk); pg_database_size/slow-query metrics (need RPC); logAdminAction un-awaited (foundation pattern).
**Decisions:** Sentry feed → Spec C2 (needs SENTRY_AUTH_TOKEN issue:read; org/project hardcoded chris-andrikanich/javascript-nuxt); destructive jobs never UI-triggerable; enhance Jobs+Health tabs (no new /admin/ops page).
**Next arc:** Spec D (#3 Growth analytics — live-query funnel/DAU/adoption). Spec C2 (Sentry) + B2 (delivery log) whenever token/appetite.

### Spec B — Support tooling (#1) — MERGED to develop

### Spec B — Support tooling (#1) — COMPLETE, pending branch-finish
**Status:** DONE on `feat/admin-support` (off develop, 7 commits, **NOT merged/pushed**). SDD ledger `.superpowers/sdd/2026-08-17-admin-support/`. Final review READY TO MERGE + polish fix landed.
**Built:** read-only user detail — `server/api/admin/users/[id].get.ts` (requireAdmin, service-role SELECT-only, safe-column allowlist NO PII, family_unit_id-scoped aggregate, `view_as.start` audit both paths, member emails joined) + `useAdminUserDetail` + `types/adminUserDetail.ts` + `pages/admin/users/[id].vue` (red read-only banner, no write controls) + users list→detail row link. Renamed `pages/admin/users.vue`→`users/index.vue` (nested-route fix).
**Tests:** unit 7859/0 (+member-email test); admin E2E green (admin-user-detail + admin-routes regression) w/ NUXT_PUBLIC_ADMIN_HOST=localhost:3003; type-check/lint/audit clean; `view_as.start` audit row confirmed LIVE.
**Deferred (non-blocking):** logAdminAction not awaited (pre-existing foundation pattern — harden with event.waitUntil if audit reliability matters).
**Decisions:** delivery log → Spec B2 (Resend webhook + email_events + msgId persist, all net-new); view-as = dedicated snapshot page (not app-page impersonation); read-only only (write actions → later spec).
**Next arc:** Spec C (#2 Ops: cron upgrade + Sentry API feed + DB health; needs SENTRY_API_TOKEN issue:read) → Spec D (#3 Growth analytics, live-query). Spec B2 (delivery log) whenever.

### Spec A — Admin Foundation — MERGED to develop
**Status:** COMPLETE + merged to develop @312c456d (**NOT pushed**). SDD ledger deleted (git is record). Built via subagent-driven-development. Final whole-branch review + branch-finish decision pending.
**Branch:** `feat/admin-suite-foundation` (off main @29eedb47). 20 commits incl. 1 FOREIGN (see below).
**Tests:** unit 7849 passed / 0 failed / 63 skip; admin E2E 18/18 live (needs `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`); type-check 0, lint 0, audit:tokens 0.

### What shipped (Spec A — shared admin rails)
- `admin_audit_log` table (**APPLIED LIVE** via MCP, migration `020_admin_audit_log.sql`, RLS no-policy/service-role) + `server/utils/adminAudit.ts` `logAdminAction` (fire-and-forget, never throws) + `requireAdmin` now sets `event.context.adminUserId`.
- Audit endpoint `GET /api/admin/audit-log` + `useAdminAuditLog` + `pages/admin/audit.vue`.
- 4 primitives in `components/Admin/` (capital A): AdminChart (Chart.js), AdminStatTile, AdminTimeRange, AdminDataTable. `server/utils/adminQuery.ts` (dayBuckets/countByDay).
- `layouts/admin.vue` route-based shell; monolith `pages/admin/index.vue` split → per-route pages (index=Overview, users, invitations, health, jobs, tools). `signup.vue` deliberately NOT admin-gated.

### Gotchas found
- `nuxt.config.ts:210` adminHost defaults to prod subdomain when `NUXT_PUBLIC_ADMIN_HOST` unset → local `/admin` bounces to prod login; admin E2E needs `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`. Consider a `.env` line.
- **Shared-checkout race hit 3×** (concurrent agent + cron switching branches mid-task). Foreign commit `a2ab66e1` ("fix(rls): allow family members...create interactions", touches only a supabase migration) is interleaved on this branch — **decide at branch-finish: cherry-pick to own branch or keep**.
- Deferred minors (non-blocking): TS-type-regen to drop `as unknown` cast in adminAudit.ts; AdminDataTable hardcoded "No data"; AdminTimeRange thin coverage; no aria-current on nav.

### Next (this all-day arc)
Spec B (#1 Support: user lookup + read-only view-as + delivery log) → Spec C (#2 Ops: cron/Sentry/DB) → Spec D (#3 Growth analytics). #1 first step: verify Resend webhook→DB ingestion exists. #2 needs `SENTRY_API_TOKEN` (issue:read).

## Current Session (2026-08-08 — Coach Outreach: full build, Phases 0–6 DONE)

**Status:** ALL phases (0–6) DONE + committed on `feat/coach-outreach-templates` (**9 commits, NOT pushed**). Remaining = browser verify + full test/E2E + PR.
**Branch:** `feat/coach-outreach-templates` (9 ahead of develop, no upstream)
**Build:** not run this session
**Tests:** type-check PASS (0); coach-outreach unit 29 + contactWindow 15 + eventSchedule 10 = 54 PASS (resolver suite 44 all green); lint 0 err on changed files. Full `npm test` + E2E NOT run — do before PR.

### Phase 6 (eventSchedule) — commit `e940f824`
- Option A chosen (Chris): render existing `events` rows, NO new table.
- `utils/templateResolver`: pure `selectUpcomingEvents`/`renderEventSchedule`/`nextEvent` (upcoming-only, soonest-first, cap 5). `buildAthleteContext` queries events → `derived.eventSchedule`/`nextEventName`/`nextEventDates` (fail-open). Registry keys already seeded (computed→ctx.derived). Unblocks 5 schedule templates.
**Type-check:** PASS (exit 0)
**Handoff:** `planning/handoff-2026-08-08-coach-outreach-templates.md`
**DB (live, MCP apply_migration):** 20260816000000 (Phase0/1), 20260817000000 (Phase2 metrics), 20260818000000 (drop users.phone), 20260819000000 (athlete_messages), **20260820000000 (contact_window_rules — 8 rules seeded)**. Registry seeded; playerPhone/Email → pref:player.*.

### Phase 5 (contact-window auto-swap) — commit `127d92c1`
- `contact_window_rules` config table (RLS read-only) — silent intro-standard↔intro-pre-window swap. Baseball D1 Aug 1 pre-junior; softball/football Sept 1; default D1 Jun 15 post-soph; D2/D3/NAIA/JUCO unrestricted.
- **⚠️ Seed dates UNVERIFIED vs ncaa.org** — flagged in migration + code comments. Verify before launch (dates move yearly).
- `utils/contactWindow.ts` pure eval (grade-year math, fails OPEN on any missing input — never gates outreach) + `filterTemplatesByWindow`. `composables/useContactWindow.ts` module-cached loader. `CommunicationPanel` filters email/message lists by window; evaluated onMount + watch(school.division, activeAthleteId).
- Window inputs: `athleteCtx.derived.sport` + `users.graduation_year` + `props.school.division`.

**Next:** browser verify (player1@compassdemo.app, run `! npm run dev`) → full `npm test` + E2E → PR to develop. Phase 6 (event_slots for {{eventSchedule}}) optional. Verify NCAA dates before launch.

## Previous Session (2026-08-02 — RLS deferrals: Phases 4-6 implemented, plan COMPLETE)

**Status:** Phases 4, 5, 6 all done. Phase 4 (`93ba96b6`) + Phase 5 (`3e4e38f9`) applied live + pushed; Phase 6 is docs-only (no schema change), pending commit. Chris ruling: skipped the "soak a few days" pacing from the plan for both live-apply phases — no live users yet, risk accepted. `planning/rls-family-consolidation-plan.md` Phases 1-6 all complete.
**Tests:** unit 7785 PASS; type-check 0; lint 0; RLS integration 25/25 GREEN live (18 Phase 1/3 + 5 Phase 4 + 2 Phase 5); Phase 4 and Phase 5 both RED→GREEN confirmed pre/post apply. Full E2E passed both times (0 failed, one retry-converged run each).
**DB verify (Phase 5):** 0 NULL family_unit_id on coaches/documents/performance_metrics/social_media_posts/recommendation_letters; 43 legacy policies dropped; audit exit criterion met for this plan's scope — exactly 1 permissive policy per verb per table (20/20 checked).
**Phase 6 finding:** full-schema audit query (beyond this plan's scope) found `schools` INSERT/SELECT and `events` INSERT/SELECT/UPDATE still carry a redundant non-account_links permissive policy alongside the family one — not a security hole, just unconsolidated. Documented as a deferred item in `claude/database.md`, NOT fixed (out of this plan's scope). `plans/audit-remediation.md` Phase 10's "exactly one permissive policy" checkbox left unchecked with a note — partial, not fully repo-wide.
**Note:** `npx supabase db push` fails locally (`LegacyDbPushMissingLocalError`) due to schema_migrations dual-recording drift (MCP timestamp vs repo filename) — use Supabase MCP `apply_migration` directly for all remaining/future migrations on this DB.

### Session facts (durable)
- Phase 1: `20260805000000` — family_unit_id columns (social_media_posts, recommendation_letters) + generic BEFORE INSERT OR UPDATE `derive_family_unit_id()` trigger on 7 tables (silent derive, never RAISEs) + idempotent backfills.
- Phase 2: app stamping on all deferral write paths (coaches store, documents ×2 composables, performance ×2, social, rec letters) + fit-score endpoint authz union (family parents no longer 404).
- Phase 3: `20260808000000` — additive family policies (DELETE gaps schools/coaches/documents/performance_metrics; full family CRUD social/rec letters). Legacy account_links policies untouched, still load-bearing.
- Phase 4: `20260812000000` — WITH CHECK hardening on all 7 family UPDATE policies + interactions cutover (Deferral B resolved) + schools DELETE cutover.
- Phase 5: `20260815000000` — dropped all 43 remaining legacy policies (coaches 17, documents 6, performance_metrics 6, recommendation_letters 5, social_media_posts 9 incl. coach-join SELECT). Deferral A resolved. **All deferrals A/B/C now closed.**
- Phase 4: `20260812000000` — WITH CHECK hardening on all 7 family UPDATE policies + interactions cutover (Deferral B resolved) + schools DELETE cutover (part of Deferral C). Deferral A (coaches/documents/performance_metrics/social_media_posts/recommendation_letters legacy drops) still open — Phase 5.
- Phase 5-6 (Deferral A legacy drops + audit) NOT started.

## Previous Session (2026-08-01 — Sentry triage: favicon N+1 + phase 500s)

**Status:** COMPLETE — both Sentry issues fixed, pushed to develop
**Branch:** develop, pushed through `e0f31430`
**Tests:** unit 7742 PASS; type-check PASS; lint PASS
**Commits:** `fea486ad` (favicon batch endpoint + SSRF hardening), `e0f31430` (phase endpoints `.maybeSingle()`)

### Session facts
- Sentry JAVASCRIPT-NUXT-K + -M (favicon N+1 on /schools) + -V (phase 500) all root-caused real, fixed, Chris resolving in Sentry. Dev/E2E events but prod-reachable code paths.
- New batch endpoint `POST /api/schools/favicons`; shared lookup in `server/utils/faviconLookup.ts` with SSRF hardening (DNS pre-resolution gate, `redirect: "manual"`, IP-literals rejected). Residual: DNS-rebinding TOCTOU accepted (documented in file header).
- Schools without websites no longer get fabricated `${slug}.edu` favicon lookups; negatives cached in localStorage 24h.
- `phase.get` missing users row → grade-derived fallback; `phase/advance` → 404 (was silent-no-op risk).
- **Parallel session active during this one** editing E2E specs (serial-mode pins, password-reset un-quarantine) — left ALL `tests/e2e/**` changes unstaged/untouched.
- Known small residual: `SchoolLogo.vue` per-instance in-flight dedup → possible duplicate favicon lookups on first-ever visit before batch lands (pre-existing, low sev).

## Previous Session (2026-07-30 — audit fast-follow + phase10a prod apply + E2E repair)

**Status:** COMPLETE — session scope done; follow-ups queued in handoff
**Branch:** develop (in sync with origin, pushed through `abf6d141`)
**Build:** not run this session (type-check + tests used as gates)
**Tests:** unit 7669 PASS; E2E 421 passed / 0 reproducible failures (8 last-run failures = session-revocation cascade, all pass isolated)
**Lint:** PASS (0 errors on changed files)
**Type-check:** PASS
**Handoff:** `planning/handoff-2026-07-30-audit-fastfollow-prod-migrations.md`

### Key session facts (durable)
- **Single Supabase DB serves prod AND non-prod** (`xpxzhqghxecsjhvklsqg`) — every write is a prod write. E2E runs against it.
- **All six 202607* migrations now applied to the live DB** (incl. `rls_security_hotfix_phase1` + phase10a) — record in `claude/database.md`.
- Fixed live bugs on develop (NOT yet on prod/main): sync 403-masking, Zod v4 `.issues` (5 endpoints), parent-view family-context wipe (athlete switcher missing on /tasks).
- E2E seed/reset rewritten: `family_unit_id` stamped, all deletes scoped to test accounts (two data-loss landmines removed).

## Action Required

1. **Promote develop → main** — ships 3 user-facing bug fixes; DB already migrated.
2. **E2E session-revocation cascade** — global signOut in logout specs revokes shared session mid-run (~8-11 random sibling failures/run). Handoff item 2 has fix options.
3. **Seed infrastructure project** — remaining ~92 conditional-data-guard skips (the big bucket).
4. **2 known flakes** — coaching-philosophy `:34` (session-expired race), smart-inputs `:76` (heavy parallel load).

## Environment Notes

- **Flaky local DNS** — router resolver `192.168.4.1` intermittently drops `api.github.com`. `git`/`gh` time out at random; pinned-IP curl works. Workaround: retry. NOT a GitHub outage.
- **Autonomous "agent checkpoint" cron** committing WIP to develop (`wip: agent checkpoint HH:MM`). Sweeps uncommitted edits — fold into proper commits when reviewing.

See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history (CI/PR cleanup, family invite flow, E2E fixes archived there).
