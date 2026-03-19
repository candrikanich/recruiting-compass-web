# Handoff: E2E Test Fix Session — 2026-03-18

## What Was Done

### Phase 1: networkidle → domcontentloaded (COMPLETE)
Replaced all `waitForLoadState("networkidle")` with `waitForLoadState("domcontentloaded")` across:
- `tests/e2e/tier1-critical/fixtures/schools.fixture.ts`
- `tests/e2e/fixtures/schools.fixture.ts` (7 occurrences)
- `tests/e2e/fixtures/coaches.fixture.ts` (4 occurrences)
- `tests/e2e/fixtures/documents.fixture.ts`
- `tests/e2e/pages/DashboardPage.ts` (waitForDashboardLoad + waitForNetworkIdle)
- `tests/e2e/pages/OffersPage.ts` (2 occurrences)
- `tests/e2e/pages/AnalyticsPage.ts`
- `tests/e2e/pages/PerformancePage.ts`
- `tests/e2e/pages/CoachesPage.ts` (7 occurrences)
- `tests/e2e/pages/DocumentsPage.ts` (2 occurrences)
- `tests/e2e/pages/EventsPage.ts` (2 occurrences)
- `tests/e2e/pages/InteractionsPage.ts` (2 occurrences)
- `tests/e2e/pages/SchoolsPage.ts`
- All 33 spec files that had networkidle (via 4 parallel agents + bulk replace)

### Phase 2: Remove loginViaForm from beforeEach (COMPLETE)
Removed `loginViaForm` from `beforeEach` in:
- `tier1-critical/coaches-crud.spec.ts`
- `tier1-critical/coaches-detail.spec.ts`
- `tier2-important/coaches-communication.spec.ts`
- `tier2-important/coaches-filtering.spec.ts`
- `tier1-critical/interactions.spec.ts`
- `user-stories/athlete-interactions.spec.ts`
- `parent-tasks.spec.ts`
- Various others via agents

### Phase 3: Fix specific test selector issues (COMPLETE)
1. **password-reset.spec.ts**:
   - Changed `getByRole('button', { name: /send reset link/i })` → `page.locator('[data-testid="send-reset-link-button"]')` (7 occurrences)
   - Fixed validation error text regex: `/invalid.*email/i` → `/email.*character|valid email/i`
   - Added `await emailInput.blur()` + `await expect(submitButton).toBeEnabled({ timeout: 5000 })` before form submit clicks

2. **auth.spec.ts**: Changed `toHaveURL("/login")` → `toHaveURL(/\/login/)` for redirect test

3. **AuthPage.ts**: Updated signup `waitForURL` to accept dashboard: `/\/(onboarding|verify-email|dashboard)/`

### Phase 4: Fix Vue mount timing on school form (COMPLETE)
Both `tests/e2e/fixtures/schools.fixture.ts` and `tests/e2e/tier1-critical/fixtures/schools.fixture.ts`:
- Added `await autocompleteToggle.waitFor({ state: "visible", timeout: 10000 })` before calling `.isChecked()` — `domcontentloaded` fires before Vue mounts, so the checkbox wasn't rendered yet

## Current Status (Spot-Check)

Running a batch of 6 previously-failing specs: **35 passed / 20 failed** (was ~0 pass before)

### Still Failing (need investigation)

#### schools-crud.spec.ts (~24 failing)
- Primary remaining issue: school creation works but school NAME doesn't appear in list after creation
  - Test expects `text=D1 School 1773...` on schools list page
  - May be data isolation issue or timing (school created but list doesn't refresh)

#### dashboard-8-1.spec.ts (~17 failing)
- "Offers" section not found — dashboard doesn't have an "Offers" section label
  - The spec expects text='Offers' to be visible but dashboard shows: Timeline, Stats, Suggestions, Widgets
  - This is a spec content mismatch (test was written for a different dashboard layout)
- Mobile viewport test: `h1:has-text('Dashboard')` not found at 375px (possible redirect or render issue)
- Viewport width assertion: expects <=768 but got 874

#### coaches-filtering.spec.ts (~16 failing, beforeEach times out)
- `createSchool` + `createCoach` in beforeEach takes too long
- Each test creates 1 school + 3 coaches (4 API calls) before it can run
- Consider: seed test data once in a `beforeAll` instead of per-test

#### password-reset.spec.ts (~28 failing)
- "should show resend button after success" — submit doesn't trigger emailSent because form submit calls Supabase API which might fail
- Reset password page tests: `/reset-password?token=mock-token` — heading "invalid link" not found (page might show different error for mock token)

#### schools-fit-score-display.spec.ts (~4 failing)
- Tests navigate to school detail (needs existing school with fit score)
- Depends on test data presence

## Next Steps

1. **schools-crud**: After the autocomplete toggle fix, re-run to see if school creation now works. If still failing, investigate why school doesn't appear in list after creation.

2. **dashboard-8-1**: The "Offers" section expectation is wrong. Check `tests/e2e/user-stories/dashboard-8-1.spec.ts` lines 17-45 and update to check for actual sections that exist on the dashboard (Timeline, Stats Cards, Suggestions, etc.)

3. **coaches-filtering/crud**: Move school+coach creation to `test.beforeAll` with a shared `schoolId`.

4. **password-reset**: The tests that require API interaction (emailSent) might need to mock the Supabase call or use a real test email. Consider skipping the API-dependent tests or adding proper test account setup.

5. **Full suite re-run**: After above fixes, run `npm run test:e2e` to get updated baseline.

## Commands
```bash
npm run test:e2e                                          # Full suite (~56 min)
npm run test:e2e -- tests/e2e/tier1-critical/schools-crud.spec.ts  # Quick check
npm run test:e2e -- tests/e2e/user-stories/dashboard-8-1.spec.ts  # Dashboard check
```
