# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Standing Preferences (do not archive)

- **Output format by reader, not by default**: For artifacts Chris will read once on a phone or share with someone non-technical — session recaps, status overviews, weekly summaries, "where are we on X" snapshots — invoke the `visual-explainer` skill to produce self-contained HTML. For artifacts that future-Claude or Chris will edit (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, lesson files, plans) — stay markdown. When unsure: read = HTML, edit = markdown.

## Current Session (2026-08-02 — RLS deferrals: Phases 4-5 implemented, plan complete)

**Status:** Phase 4 + Phase 5 both applied live, verified, committed+pushed to develop (Phase 4: `93ba96b6`; Phase 5: pending commit). Chris ruling: skipped the "soak a few days" pacing from the plan for both — no live users yet, risk accepted. Only Phase 6 (audit + docs, no schema change) remains.
**Tests:** unit 7785 PASS; type-check 0; lint 0; RLS integration 25/25 GREEN live (18 Phase 1/3 + 5 Phase 4 + 2 new Phase 5); Phase 5 RED→GREEN flip confirmed (account_links-only access worked pre-apply, denied post-apply). Full E2E in progress/pending for Phase 5 (Phase 4's passed 0 failed after retries).
**DB verify (Phase 5):** 0 NULL family_unit_id on coaches/documents/performance_metrics/social_media_posts/recommendation_letters; 43 legacy policies dropped; **audit exit criterion met — exactly 1 permissive policy per verb per table, all 5 tables (20/20 rows checked)**. Migration `20260815000000` recorded both as MCP timestamp and repo filename in schema_migrations.
**Plan:** `planning/rls-family-consolidation-plan.md` — Phases 1-5 all complete. Phase 6 (re-run exit-criterion query, update claude/database.md + plans/audit-remediation.md, file deferred tickets, copy plan to planning/) is the only remaining item.
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
