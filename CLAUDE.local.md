# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Standing Preferences (do not archive)

- **Output format by reader, not by default**: For artifacts Chris will read once on a phone or share with someone non-technical — session recaps, status overviews, weekly summaries, "where are we on X" snapshots — invoke the `visual-explainer` skill to produce self-contained HTML. For artifacts that future-Claude or Chris will edit (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, lesson files, plans) — stay markdown. When unsure: read = HTML, edit = markdown.

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
