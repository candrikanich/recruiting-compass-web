# Handoff: Skipped Tests Cleanup — Wrap-up & Followups
**Date:** 2026-05-25
**Branch:** develop (up to date with origin/develop)
**Status:** NEARLY DONE — 8 bug tickets closed, 4 followup buckets identified

## Completed This Session

Major triage + remediation of skipped E2E tests across the suite. Started at ~330 skipped, finished with zero static `describe.skip` and only conditional-data-guard `test.skip()` mid-test guards remaining (those auto-resolve when seed data lands).

**Quick-wins pass:**
- Un-skipped 16 tests across 8 specs — selectors already existed, tests were skipped under wrong assumptions

**Bulk delete pass (7 quarantined files):**
- `school-detail-documents.spec.ts` (redundant with tier1 docs-crud-atomic)
- `notes-history.spec.ts` (vacuous conditional pattern)
- `schools-status-tracking.spec.ts` (covered in schools-crud-atomic)
- `tier3-nice-to-have/error-recovery.spec.ts` (full selector drift)
- `tier2-important/coaches-communication.spec.ts` (browser-behavior tests)
- `tier2-important/search-workflows.spec.ts` (vacuous conditionals)
- `tier2-important/search.spec.ts` (overlapped with search-workflows)
- `tests/e2e/pages/SearchPage.ts` (orphaned POM)

**Bug ticket resolutions (commits in order):**
- `03ceedb3` fix(notes): await save before closing editor; refetch parent state — **ticket #8** + production bug (notes refresh)
- `37f67887` chore(lint): ignore generated playwright-report/ and test-results/
- `dd114873` fix(notes): widen useNotesEditor saveFn return type
- `7f66ad61` chore(e2e): delete stale performance tracking spec + POM — **ticket #3**
- `3e9d3f0f` fix(auth): render password requirements + unblock password-reset e2e — **ticket #6** + production bug (PasswordRequirements missing import)
- `070de783` test(e2e): rewrite settings spec per sub-route — **ticket #4**
- `0ee83039` test(e2e): delete misclassified spec + add documents-list smoke tests — **ticket #5**
- `05f2145b` fix(analytics): add missing auth middleware + rewrite e2e spec — **ticket #2** + production bug (missing /analytics auth middleware)
- `5658bb52` test(prefs): delete empty placeholder stubs from user-preferences spec — **ticket #7**
- `53bf294d` test(smart-inputs): un-skip all 3 describes — no seed work needed — **ticket #1**

**Production bugs fixed:**
1. `SchoolNotesCard` + `CoachNotesEditor` — sync emit closed edit mode before async save reached Supabase. Reload-after-save (or fast navigation) lost data. Now child awaits parent's save.
2. `pages/reset-password.vue` — referenced `<PasswordRequirements>` but Nuxt auto-imports it as `<AuthPasswordRequirements>` (path prefix from `components/Auth/`). Requirements checklist never rendered. Added explicit import.
3. `pages/analytics/index.vue` — missing `definePageMeta({ middleware: "auth" })`. Route in `PROTECTED_ROUTE_PREFIXES` but middleware only runs on opt-in. Page was publicly accessible.

**Triage + tickets docs:**
- `planning/2026-05-22-skipped-tests-triage.md` — full bucket breakdown
- `planning/2026-05-22-skipped-tests-bug-tickets.md` — all 8 tickets with resolution notes

## In Progress (Uncommitted)
None — tree clean, all work pushed.

## Known Issues / Blockers

- **Dependabot:** 1 moderate vulnerability flagged on default branch (`security/dependabot/99` on github.com/candrikanich/recruiting-compass-web). Not investigated this session.
- **Outstanding `CLAUDE.local.md` action items (carried over from earlier sessions, not addressed this session):**
  - `TEAMID` placeholder in `public/.well-known/apple-app-site-association` needs the real Apple TeamID.
  - Supabase `player_user_id` migration may still need verifying on remote.
- **Conditional-data-guard skips remain (~110 tests):** `dashboard-8-3` (14), `dashboard-8-2` (11), `user-story-6-1` (10), `family-invite-flow` (10), `coaching-philosophy` (10), `bulk-delete-users` (10), `notifications` (9), `user-story-9-1` (8), and a few smaller files. These are `test.skip()` calls mid-body that gate on missing seed data and will pass automatically once a seed-infrastructure project lands.

## Test Status

- Unit tests: UNKNOWN — not run this session.
- Type check: PASS (last verified after ticket #6, then again after #1).
- Lint: PASS (after `eslint.config.js` added `playwright-report/**` and `test-results/**` ignores in commit `37f67887`).
- E2E touched specs: every rewritten/un-skipped spec verified green in isolation when delivered. **Full E2E suite was not re-run end-to-end after the last several tickets — confirm next session.**

## Resume Command

Start a new session and run:
> Resume from `planning/handoff-2026-05-25-skipped-tests-cleanup.md`. All 8 bug tickets are closed and pushed. Tackle the 4 followups in this order: (1) run full E2E sweep to confirm overall green, (2) investigate dependabot vulnerability #99 and propose fix, (3) replace `TEAMID` placeholder in `public/.well-known/apple-app-site-association` with the real Apple TeamID (ask Chris for the value), (4) scope a seed-infrastructure project to unlock the ~110 conditional-data-guard skips listed in `planning/2026-05-22-skipped-tests-triage.md`.

## Next Steps (in order)

1. **Full E2E sweep.** `npx playwright test --reporter=line`. Confirm overall green; investigate any new failures. Compare against the last sweep recorded in CLAUDE.local.md (`294 pass / 232 skip / 2 flaky pre-existing`). Note: skip count should now be lower since several specs got rewritten or un-skipped.
2. **Dependabot vulnerability #99.** Pull advisory from GitHub: `gh api repos/candrikanich/recruiting-compass-web/dependabot/alerts/99 --jq '.security_advisory'`. Propose upgrade or workaround. Patch + commit.
3. **AASA `TEAMID` replacement.** Read `public/.well-known/apple-app-site-association`. Ask Chris for the Apple TeamID (it's a 10-char alphanumeric, looks like `ABCD123456`). Replace placeholder, commit, push.
4. **Seed-infrastructure project.** This is the largest remaining lift. Scope:
   - Audit which conditional `test.skip()` sites gate on seedable data (cross-ref `planning/2026-05-22-skipped-tests-triage.md` CONDITIONAL-DATA-GUARD bucket).
   - Identify minimum seed: schools (already have helper), interactions, offers, family-invitations, recent activity, coaching philosophy entries, tasks status for parent@test.com.
   - Build under `tests/e2e/seed/` behind `E2E_SEED=true` flag (`global-setup.ts` already gates on this).
   - Avoid touching test users — create dedicated `seed-*` users or scope to fixtures.
   - Run conditional-skip specs after seed lands; un-skip whichever now pass deterministically.

## Reference Docs

- `planning/2026-05-22-skipped-tests-triage.md` — bucket breakdown, current ~225-tests-skipped count needs refresh after this session's work
- `planning/2026-05-22-skipped-tests-bug-tickets.md` — all 8 tickets with resolution notes (all marked DONE)
- `CLAUDE.local.md` — Current Session section will be updated alongside this handoff
