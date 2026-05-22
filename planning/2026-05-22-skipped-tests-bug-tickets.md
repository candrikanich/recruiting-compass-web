# Bug Tickets — Unblock Skipped E2E Tests

**Source:** `planning/2026-05-22-skipped-tests-triage.md`
**Status as of 2026-05-22:** 232 tests still skipped (down from 330). Quick-wins done, OBSOLETE files deleted. Remaining work falls into 7 tickets below.

Each ticket: blockers, affected specs, scope, estimate. Pick up in any order — none block each other.

---

## #1 — Seed & Environment Infrastructure for Smart Inputs

**Blocks:** 3 `describe.skip` blocks, ~15 tests
**Affected:**
- `tests/e2e/smart-inputs.spec.ts:22` (High School Search, 8 tests)
- `tests/e2e/smart-inputs.spec.ts:88` (Address Autocomplete)
- `tests/e2e/smart-inputs.spec.ts:140` (Social Handle Normalization)

**What's missing:**
- `nces_schools` table needs a seed script (currently empty in test DB)
- `NUXT_RADAR_API_KEY` env var not set in CI/test environments
- Test docs don't reference Radar.io setup steps

**Scope:**
1. Add `tests/e2e/seed/nces-schools.ts` — insert ~50 representative NCES records
2. Document `NUXT_RADAR_API_KEY` in `tests/e2e/README.md`
3. Wire seed into `e2e-global-setup.ts` behind `E2E_SEED=true`
4. Remove `describe.skip` once seed reliable

**Estimate:** 2 days

---

## #2 — Analytics Dashboard UI Rewrite

**Blocks:** ~20 tests
**Affected:** `tests/e2e/tier2-important/analytics.spec.ts:7` (whole suite)

**What's broken:** Page structure drifted from spec; 19/20 tests fail on selectors.

**Scope:**
1. Audit current `/analytics` route against test expectations
2. Either rewrite page to match spec OR rewrite tests against current page
3. Establish `data-testid` contract for stat cards, charts, filter controls

**Estimate:** 3 days

---

## #3 — Performance Tracking Feature

**Blocks:** ~11 tests
**Affected:** `tests/e2e/tier2-important/performance.spec.ts:7` (whole suite)

**What's missing:** Performance-tracking UI likely unfinished — 11/11 fail on selector lookup. Need to confirm whether feature exists in product roadmap.

**Scope:**
1. Product decision: ship feature, defer, or kill spec
2. If shipping: complete UI, add testids, rewrite spec against final design
3. If killing: delete spec file

**Estimate:** 5 days (feature build) OR 30 min (delete)

---

## #4 — Settings Page Restructuring

**Blocks:** ~22 tests
**Affected:** `tests/e2e/tier2-important/settings.spec.ts:6` (whole suite)

**What's broken:** Settings is now multi-route (`/settings/profile`, `/settings/notifications`, `/settings/social-sync`, etc.) but test still assumes single page.

**Scope:**
1. Split test file by route (one spec per sub-page, mirroring `medium-priority-pages.spec.ts` pattern)
2. Cover navigation between sub-routes
3. Delete original monolithic file

**Estimate:** 2 days

---

## #5 — Documents Page Rewrite

**Blocks:** ~22 tests + ~22 from search-and-filters (overlapping)
**Affected:**
- `tests/e2e/tier2-important/search-and-filters.spec.ts:7` (~22 tests)
- Any remaining documents-* selectors elsewhere

**What's missing:** `data-testid="documents-search"`, `document-card`, `filter-type` don't exist on current `/documents` page.

**Scope:**
1. Add testids to documents list page
2. Rewrite search-and-filters spec against current selectors
3. Consider merging with documents-crud-atomic if scope overlaps

**Estimate:** 3 days

---

## #6 — Password Reset Mock Token Plumbing

**Blocks:** ~14 tests
**Affected:** `tests/e2e/tier1-critical/password-reset.spec.ts` (multiple `test.skip`)

**What's broken:** Mock tokens always trigger `invalidToken` state in Supabase auth. Tests skip when they need a real password-reset session.

**Scope (pick one):**
- **Option A:** Use Supabase admin API to mint a real recovery token in beforeAll
- **Option B:** Add `E2E_BYPASS_TOKEN_VALIDATION=true` env flag (dev-only) that accepts mock tokens
- Option A safer; Option B faster

**Estimate:** 1 day (Option A), 2 hours (Option B)

---

## #8 — Notes Don't Refresh After Save (App Bug)

**Blocks:** 2 tests
**Affected:**
- `tests/e2e/school-detail-notes.spec.ts:37` (edit and save shared notes)
- `tests/e2e/school-detail-notes.spec.ts:109` (special characters in notes)
- Also affects `CoachNotesEditor` (same pattern)

**What's broken:** Save persists to DB, but UI doesn't reflect new value until reload. Worse: reload reads stale data (likely cache not invalidated).

**Scope:**
1. After successful save in `SchoolNotesEditor` / `CoachNotesEditor`: trigger refetch of notes from server
2. Verify Pinia store / composable invalidates cache on save
3. Un-skip tests

**Estimate:** 4 hours

---

## #7 — User Preferences Server Migration

**Blocks:** 3 tests
**Affected:** `tests/e2e/tier2-important/user-preferences.spec.ts:86,92,100`

**What's missing:** Server-side preference storage incomplete. Composable falls back to localStorage; tests for cross-session persistence + offline sync fail.

**Scope:**
1. Finish migration of preferences from localStorage to `user_preferences` table
2. Update composable to read/write through API with localStorage fallback
3. Un-skip tests

**Estimate:** 3 days

---

## Summary

| # | Ticket | Tests Unblocked | Estimate |
|---|---|---|---|
| 1 | Smart Inputs seed + env | ~15 | 2d |
| 2 | Analytics rewrite | ~20 | 3d |
| 3 | Performance tracking | ~11 | 5d or 30m |
| 4 | Settings split | ~22 | 2d |
| 5 | Documents rewrite | ~22 | 3d |
| 6 | Password reset mock | ~14 | 1d |
| 7 | User prefs migration | 3 | 3d |
| 8 | Notes refresh after save | 2 | 4h |
| **Total** | | **~109 tests** | **~19.5 days** |

Remaining ~125 skipped tests are CONDITIONAL-DATA-GUARD that resolve when seed data lands (dashboard-8-x, family-invite-flow, coaching-philosophy, bulk-delete-users, etc.) — track separately as seed infrastructure work.
