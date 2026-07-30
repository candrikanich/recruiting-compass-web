# Handoff: Audit Fast-Follow + Phase 10a Prod Apply + E2E Repair
**Date:** 2026-07-30
**Branch:** develop (in sync with origin — all pushed through `abf6d141`)
**Status:** COMPLETE — this session's scope is done; outstanding issues below are queued follow-ups

## Completed This Session
- **social/sync 403 fix**: re-throw guard so parent rejection surfaces as 403 not 500 — commit `0b7a72ab`
- **Zod v4 `.errors`→`.issues`** in 5 endpoints (recruiting-packet/email, confirm-password-reset, preferences history/[category]/player-details) + regression tests for all 5 — commit `6683f579`
- **Phase 10a prod pre-flight**: ran read-only against live DB (`xpxzhqghxecsjhvklsqg` — single DB serves prod AND non-prod, Chris confirmed). FAILED: 482 NULL `family_unit_id` schools + 1 dead self-link — documented `b60464e3`
- **Data repair migration** `20260727000004_phase10a_preflight_data_repair.sql` (idempotent backfill + dead-link delete), executed live — commit `e26a702a`
- **All six pending migrations applied to live DB** (`20260727000000`→`20260728000000`, incl. `rls_security_hotfix_phase1`) via MCP, transaction-wrapped, versions recorded in `schema_migrations`, post-verified. Found+fixed anon EXECUTE grant on `family_unit_created_by` (Supabase default-privilege gap), patched into migration file — commit `53c5d393`. Full record: `claude/database.md` "Phase 10a prod pre-flight" section
- **E2E seed/reset rewrite** — commit `697f8111`:
  - `seed.ts` stamps `family_unit_id` on seeded schools/coaches (required post-phase10a; RLS-verified via SQL impersonation)
  - Defused two data-loss landmines: `reset.ts` unscoped `.neq(id, zero-uuid)` deletes (would have wiped 8 tables for ALL users in shared DB) and seed's TRUNCATE-everything SQL — all deletes now scoped to TEST_ACCOUNTS; `001-reset-tables.sql` deleted
  - Swept ~600 re-accumulated leaked schools off player@test.com (645→40 total rows)
- **Parent-view family-context bug** (real UX bug): singleton created in `viewLogging.global.ts` middleware (parents only, first navigation) got `undefined` from vue-router's `useRoute()`; `route.query` threw after fetch and the catch wiped `parentAccessibleFamilies` → no athlete switcher on /tasks, enabled checkboxes. Fixed with optional route access + narrowed try scope, RED→GREEN regression test — commit `2c4b68f4`
- **events/offers atomic specs** updated for June's ConfirmDialog change (native `confirm()` gone since `9991c79e`/`9c72fc04`) — commit `abf6d141`

## In Progress (Uncommitted)
None — working tree clean.

## Known Issues / Blockers (= the outstanding backlog, in priority order)

1. **Prod app deploy pending.** The API bug fixes (403-masking, Zod crashes) + parent-view fix are on develop only. Prod (myrecruitingcompass.com, deploys from `main`) still runs all three bugs. DB side is fully migrated; server code ships on next main promote.
2. **E2E session-revocation cascade** (only remaining suite noise): a global `signOut` mid-parallel-run (suspects: `tier1-critical/cross-account-logout.spec.ts`, `schools.spec.ts`) revokes the shared test-account session, randomly failing ~8–11 sibling tests per full run — all pass in isolation. Fix options (pick one): dedicated throwaway account for logout specs, `signOut({ scope: "local" })`, or serialize logout specs last.
3. **Two specs leak schools without teardown**: `school-detail-status-history.spec.ts`, `documents-sharing.spec.ts`. Seed's per-run clear + global-setup purge sweep them, but own teardown is cleaner.
4. **Seed-infra project** (~92 conditional-data-guard skips) — `planning/seed-infrastructure-plan.md`.
5. **Advisor WARNs pass** (pre-existing): SECURITY DEFINER functions anon-callable (`create_audit_log`, `handle_new_user`, etc. — `family_unit_created_by` already fixed), function `search_path` hygiene, leaked-password protection off, `pg_trgm` in public schema.
6. **Known flakes** (pre-existing): coaching-philosophy `:34`, smart-inputs `:76`.
7. **RLS deferrals** unchanged: coaches/documents/performance_metrics/social_media_posts/recommendation_letters + DELETE gaps — preconditions in `claude/database.md`.

## Test Status
- Unit tests: PASS (7669, full run this session; 2037 composables re-verified after parent-view fix)
- Type check: PASS
- Lint: PASS (0 errors on all changed files)
- E2E full suite: 421 passed / 0 reproducible failures. 8 failures in last full run = session-revocation cascade only (7 explicit "session has expired" snapshots, 1 bounced upload); all 8 passed isolated rerun (24.7s)

## Resume Command
> "Fix the E2E session-revocation cascade: cross-account-logout.spec.ts (and any global signOut) revokes the shared test-account session mid-parallel-run. See planning/handoff-2026-07-30-audit-fastfollow-prod-migrations.md item 2."

Or for the deploy: promote develop → main (all 3 live prod bugs are fixed on develop; DB already migrated).

## Next Steps (in order)
1. Promote develop → main → prod deploy (ships the 3 user-facing bug fixes; DB already ready)
2. Fix session-revocation cascade (item 2 above) — should bring full-suite runs to consistent 0 failed
3. Add teardown to the two leaking specs (item 3)
4. Advisor WARNs pass (item 5) — small security-hygiene migration
5. Seed-infra project (item 4) — the big bucket
