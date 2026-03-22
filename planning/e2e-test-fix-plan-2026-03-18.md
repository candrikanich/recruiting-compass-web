# E2E Test Fix Plan — 2026-03-18

## Overview

Full suite run: ~261 test failures across 33 spec files (240 pass, 114 skip, 22 did not run).
Root causes are concentrated in 5 systemic issues — fixing them will resolve the vast majority.

---

## Root Cause Analysis

### RC-1 — `waitForLoadState("networkidle")` never resolves
**Impact: ~150 tests | Priority: CRITICAL**

`networkidle` waits for 500ms of zero HTTP requests. Nuxt pages with Supabase realtime subscriptions, polling composables, or continuous fetching never satisfy this. Tests timeout (30–120s) before any assertions run.

**Affected files:**
- `tests/e2e/tier1-critical/fixtures/schools.fixture.ts` — lines 109, 118 (navigateToSchools, navigateToSchool)
- `tests/e2e/fixtures/schools.fixture.ts` — lines 372, 381, 445, 469, 478, 486, 510
- `tests/e2e/fixtures/coaches.fixture.ts` — lines 320, 334, 428, 452
- `tests/e2e/fixtures/documents.fixture.ts` — line 86
- `tests/e2e/pages/DashboardPage.ts` — lines 14, 191
- `tests/e2e/pages/OffersPage.ts` — lines 54, 111
- `tests/e2e/pages/AnalyticsPage.ts` — line 147
- `tests/e2e/pages/PerformancePage.ts` — line 37
- Plus 207 uses in 33 spec files (see full grep list)

**Spec files with most failures from RC-1:**
- `tier1-critical/schools-crud.spec.ts` — ALL tests fail (fixture gates on networkidle)
- `tier1-critical/coaches-crud.spec.ts` — ALL tests fail (fixture gates on networkidle)
- `tier1-critical/coaches-detail.spec.ts` — ALL tests (networkidle + loginViaForm, see RC-2)
- `tier1-critical/documents-crud.spec.ts` — ALL tests
- `tier1-critical/documents-sharing.spec.ts` — ALL tests
- `tier1-critical/interaction-detail.spec.ts` — most tests
- `user-stories/dashboard-8-1.spec.ts` — most tests (via DashboardPage.waitForDashboardLoad)
- `schools-30-warning.spec.ts`, `schools-status-tracking.spec.ts`, `schools-fit-score-display.spec.ts`, etc.

**Fix strategy:**
Replace `waitForLoadState("networkidle")` with the appropriate alternative:

```typescript
// BEFORE (breaks on pages with any ongoing requests)
await page.waitForLoadState("networkidle");

// AFTER — option A: domcontentloaded (fast, sufficient for static page renders)
await page.waitForLoadState("domcontentloaded");

// AFTER — option B: wait for specific UI element (most reliable)
await page.waitForSelector('[data-testid="schools-list"], [data-testid="empty-state"]');

// AFTER — option C: wait for URL + domcontentloaded (for navigation scenarios)
await page.waitForURL("/schools");
await page.waitForLoadState("domcontentloaded");
```

**Implementation plan:**
1. In `tests/e2e/tier1-critical/fixtures/schools.fixture.ts`:
   - `navigateToSchools`: replace networkidle with `waitForURL("/schools")` + `waitForLoadState("domcontentloaded")`
   - `navigateToSchool`: replace networkidle with `waitForURL(/\/schools\//)` + element waiter

2. In `tests/e2e/fixtures/schools.fixture.ts` (shared fixture): same pattern

3. In `tests/e2e/fixtures/coaches.fixture.ts`: replace with `waitForURL` + domcontentloaded

4. In `tests/e2e/fixtures/documents.fixture.ts`: same

5. In `tests/e2e/pages/DashboardPage.ts`:
   - `waitForDashboardLoad()`: replace networkidle with `waitForSelector("h1:has-text('Dashboard')")`
   - `waitForNetworkIdle()`: rename to `waitForPageLoad()`, use domcontentloaded

6. In `tests/e2e/pages/OffersPage.ts`, `AnalyticsPage.ts`, `PerformancePage.ts`: same pattern

7. In all 33 spec files: replace inline `waitForLoadState("networkidle")` with domcontentloaded or element-based waiters

---

### RC-2 — `loginViaForm` in `beforeEach` exceeds 30s timeout
**Impact: ~50 tests | Priority: HIGH**

Several specs call `loginViaForm(page, "player@test.com", ...)` in every `beforeEach`. This does full UI login (navigate → fill form → submit → wait for dashboard) for every single test. Under parallel load (4 workers), this frequently exceeds the 30s test timeout.

The global setup already captures `storageState` (player.json, parent.json, admin.json) — these should be used instead.

**Affected spec files:**
- `tier1-critical/interaction-detail.spec.ts` — beforeEach loginViaForm + multiple inline loginViaForm calls
- `tier1-critical/coaches-crud.spec.ts` — beforeEach loginViaForm
- `tier1-critical/coaches-detail.spec.ts` — beforeEach loginViaForm
- `tier1-critical/coaches-workflow.spec.ts` — beforeEach loginViaForm
- `tier2-important/coaches-communication.spec.ts` — beforeEach loginViaForm
- `tier2-important/coaches-filtering.spec.ts` — beforeEach loginViaForm
- `user-stories/athlete-interactions.spec.ts` — beforeEach loginViaForm
- `tier1-critical/interactions.spec.ts` — beforeEach loginViaForm
- `family-invite-flow.spec.ts` — loginViaForm calls
- `parent-tasks.spec.ts` — loginViaForm calls

**Fix strategy:**

```typescript
// BEFORE: slow UI login per test
test.beforeEach(async ({ page }) => {
  await loginViaForm(page, "player@test.com", "TestPass123!", /\/dashboard/);
  await page.goto("/interactions");
  ...
});

// AFTER: use pre-authenticated storageState (already set globally)
// The global playwright.config.ts already sets storageState: player.json for all tests.
// Simply REMOVE loginViaForm calls from beforeEach.
// If the spec needs a different role, override at describe level:
test.use({ storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json") });
```

**Implementation plan:**
1. Remove `loginViaForm` from `beforeEach` in all affected spec files
2. For tests that need a specific role (not the default player), add `test.use({ storageState: ... })` at the describe block level
3. Only keep `loginViaForm` in tests that EXPLICITLY test the login flow (e.g., `auth.spec.ts`)

---

### RC-3 — Password reset button `aria-label` mismatch
**Impact: 25 tests | Priority: HIGH**

`password-reset.spec.ts` uses `getByRole('button', { name: /send reset link/i })`. Playwright's `getByRole` matches against the accessible name, which is the `aria-label` attribute. The button's `aria-label` is `"Send password reset link"` — not matching `/send reset link/i` because "send" is not immediately followed by "reset link" (there's "password" in between).

The button has `data-testid="send-reset-link-button"` and visible text "Send Reset Link".

**Fix strategy:**

```typescript
// BEFORE: doesn't match aria-label "Send password reset link"
getByRole('button', { name: /send reset link/i })

// AFTER option A: use data-testid
page.locator('[data-testid="send-reset-link-button"]')

// AFTER option B: fix regex to match actual aria-label
getByRole('button', { name: /send.*reset link/i })

// AFTER option C: match visible text (when aria-label is absent or bypassed)
getByRole('button', { name: 'Send Reset Link', exact: false })
```

**Implementation plan:**
1. Open `tests/e2e/tier1-critical/password-reset.spec.ts`
2. Find all occurrences of `getByRole('button', { name: /send reset link/i })`
3. Replace with `page.locator('[data-testid="send-reset-link-button"]')` (most reliable)
4. Similarly check for other button selectors that may have aria-label mismatches

---

### RC-4 — Auth redirect URL includes query parameter
**Impact: 2–4 tests | Priority: MEDIUM**

`auth.spec.ts` expects exact URL `/login` after navigating to a protected page, but middleware now redirects to `/login?redirect=/dashboard` (adding the `redirect` query param).

**Error:**
```
Expected: "http://localhost:3003/login"
Received: "http://localhost:3003/login?redirect=/dashboard"
```

**Fix strategy:**

```typescript
// BEFORE: exact URL match fails
await expect(page).toHaveURL("/login");

// AFTER: regex or partial match
await expect(page).toHaveURL(/\/login/);
// or
await expect(page).toHaveURL(/^http:\/\/localhost:3003\/login/);
```

**Implementation plan:**
1. `tests/e2e/tier1-critical/auth.spec.ts` line 165: change to `toHaveURL(/\/login/)`
2. Check other auth tests for similar exact URL assertions
3. Update `AuthPage.expectLoginPage()` if it does an exact URL match

---

### RC-5 — Signup flow redirect changed
**Impact: 3–4 tests | Priority: MEDIUM**

`AuthPage.signup()` in `tests/e2e/pages/AuthPage.ts:74` waits for `URL matching /\/(onboarding|verify-email)/` after signup. The signup flow now routes users differently (possibly directly to dashboard or a different intermediate page).

**Error:** `TimeoutError: page.waitForURL: Timeout 15000ms exceeded` — URL never matches `/(onboarding|verify-email)/`.

**Fix strategy:**
1. Determine the actual post-signup URL by navigating to `/signup` in the browser and completing the flow
2. Update `AuthPage.signup()` to wait for the current post-signup destination:
   ```typescript
   // Check what URL signup actually lands on:
   await page.waitForURL(/\/(onboarding|verify-email|dashboard)/, { timeout: 15000 });
   ```
3. Update `AuthPage.expectVerifyEmail()` if the verify-email page URL or content changed

---

## RC-6 — `recruiting-packet.spec.ts` (Pre-existing, known failures)
**Impact: 10 tests | Priority: LOW (known)**

These were already failing before this session per CLAUDE.local.md. Track separately.

---

## Execution Plan

### Phase 1 — Fix RC-1 (networkidle) in shared fixtures and page objects (highest leverage)
Files to update:
- `tests/e2e/tier1-critical/fixtures/schools.fixture.ts`
- `tests/e2e/fixtures/schools.fixture.ts`
- `tests/e2e/fixtures/coaches.fixture.ts`
- `tests/e2e/fixtures/documents.fixture.ts`
- `tests/e2e/pages/DashboardPage.ts`
- `tests/e2e/pages/OffersPage.ts`
- `tests/e2e/pages/AnalyticsPage.ts`
- `tests/e2e/pages/PerformancePage.ts`

These fixtures are shared by many specs — fixing them here cascades to all consuming specs.

### Phase 2 — Fix RC-2 (loginViaForm in beforeEach)
Remove per-test UI logins from beforeEach in the 10 affected spec files.

### Phase 3 — Fix RC-3 (password-reset button selector)
Update `password-reset.spec.ts` button locators.

### Phase 4 — Fix RC-4 and RC-5 (auth URL and signup redirect)
Small targeted fixes in `auth.spec.ts` and `AuthPage.ts`.

### Phase 5 — Fix remaining inline `networkidle` in spec files
After shared fixtures are fixed, audit remaining inline `waitForLoadState("networkidle")` calls in spec files and replace.

### Phase 6 — Verify
Run `npm run test:e2e` to confirm pass rate improvement. Target: >400 passing (from 240).

---

## Test Count Reference

| Spec | Status | Root Cause |
|------|--------|------------|
| `tier1-critical/schools-crud.spec.ts` | ~22 fail | RC-1 (fixture networkidle) |
| `tier1-critical/coaches-crud.spec.ts` | ~14 fail | RC-1 + RC-2 |
| `tier1-critical/coaches-detail.spec.ts` | ~21 fail | RC-1 + RC-2 |
| `tier1-critical/coaches-workflow.spec.ts` | ~3 fail | RC-2 (loginViaForm) |
| `tier1-critical/interaction-detail.spec.ts` | ~20 fail | RC-1 + RC-2 |
| `tier1-critical/interactions.spec.ts` | ~10 fail | RC-2 |
| `tier1-critical/documents-crud.spec.ts` | ~12 fail | RC-1 |
| `tier1-critical/documents-sharing.spec.ts` | ~13 fail | RC-1 |
| `tier1-critical/password-reset.spec.ts` | 25 fail | RC-3 |
| `tier1-critical/auth.spec.ts` | 3 fail | RC-4 + RC-5 |
| `user-stories/dashboard-8-1.spec.ts` | ~21 fail | RC-1 (DashboardPage) |
| `user-stories/dashboard-8-2.spec.ts` | ~4 fail | RC-1 (DashboardPage) |
| `user-stories/dashboard-8-3.spec.ts` | ~4 fail | RC-1 (inline networkidle) |
| `user-stories/athlete-interactions.spec.ts` | ~6 fail | RC-2 |
| `tier2-important/coaches-communication.spec.ts` | ~17 fail | RC-2 |
| `tier2-important/coaches-filtering.spec.ts` | ~16 fail | RC-2 |
| `tier2-important/search-workflows.spec.ts` | ~7 fail | RC-1 |
| `family-units.spec.ts` | 2 fail | RC-1 (inline networkidle) |
| `schools-status-tracking.spec.ts` | ~7 fail | RC-1 |
| `schools-fit-score-display.spec.ts` | ~7 fail | RC-1 |
| `schools-30-warning.spec.ts` | ~4 fail | RC-1 |
| `smart-inputs.spec.ts` | ~8 fail | RC-1 (page never loads for unauthenticated) |
| `tier1-critical/athlete-profile-creation.spec.ts` | ~16 fail | RC-1 |
| `tier1-critical/user-story-5-2-timeline.spec.ts` | ~19 fail | RC-1 |
| `tier1-critical/user-story-6-1.spec.ts` | ~12 fail | RC-1 |
| `recruiting-packet.spec.ts` | ~10 fail | Pre-existing |

---

## Quick Reference: Safe networkidle Replacements

```typescript
// Navigation to a known page:
await page.goto("/schools");
await page.waitForURL("/schools");
await page.waitForLoadState("domcontentloaded");

// After a form submission that navigates:
await page.waitForURL(/\/schools\/[a-f0-9-]+/);

// Wait for key element to appear (most reliable for data-dependent pages):
await page.waitForSelector('[data-testid="school-card"]:first-child, [data-testid="empty-state"]',
  { timeout: 10000 });

// For fixture setup (just need page reachable):
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(500); // small buffer for Vue reactivity if needed
```
