# E2E Testing Guide

Read this before writing a new E2E test.

## Quick Start

Every test browser starts pre-authenticated as `player@test.com` via Playwright storageState.
You do NOT need to log in in `beforeEach`.

```typescript
import { test, expect } from "@playwright/test";

test("should create a school", async ({ page }) => {
  // Browser is already logged in — go straight to the feature
  await page.goto("/schools");
  await page.click('[data-testid="add-school-button"]');
  // ... test the feature
});
```

## Auth Accounts

Two pre-seeded accounts are available:

- **`player@test.com` / `TestPass123!`** — default (player role, completed onboarding)
- **`parent@test.com` / `TestPass123!`** — parent role

To use the parent account, override storageState at the describe level:

```typescript
import { resolve } from "path";
const AUTH_DIR = resolve(process.cwd(), "tests/e2e/.auth");

test.describe("Parent features", () => {
  test.use({ storageState: `${AUTH_DIR}/parent.json` });

  test("parent can view fit score", async ({ page }) => {
    await page.goto("/dashboard");
    // ...
  });
});
```

## Testing Auth Flows (login, signup, password reset)

These tests must start logged OUT. Use `test.use({ storageState: { cookies: [], origins: [] } })` — **not** `storageState: undefined`, which falls back to the global default (`player.json`) when that file exists (it always does in CI after global setup):

```typescript
test.describe("Login flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // explicitly clear all auth state

  test("rejects wrong password", async ({ page }) => {
    await page.goto("/login");
    // ...
  });
});
```

## Creating Unique Test Accounts

Only when the test is specifically about account creation. Never use `testUsers.newUser` (deprecated).

```typescript
import { makeTestUser } from "../fixtures/testData";

test.describe("Signup creates account", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signup creates a new account", async ({ page }) => {
    const user = makeTestUser("signup-test"); // unique email per call
    // ... use user.email, user.password, user.displayName
  });
});
```

## Assertions: Specific > Generic

BAD (always passes, provides no confidence):

```typescript
expect(url).toMatch(/\/(login|dashboard)/); // both are "valid"
expect(count).toBeLessThanOrEqual(3); // passes when 0
expect(isLoaded).toBe(true); // page has any text
```

GOOD (fails if the feature is broken):

```typescript
await expect(page).toHaveURL("/dashboard");
expect(count).toBeGreaterThanOrEqual(1);
await expect(page.locator("h1")).toContainText("Schools");
```

## No waitForTimeout

```typescript
// BAD — arbitrary sleep, slow and flaky
await page.waitForTimeout(2000);
await expect(page.locator(".result")).toBeVisible();

// GOOD — wait for the specific condition
await expect(page.locator(".result")).toBeVisible({ timeout: 10000 });
await page.waitForURL("/dashboard");
await page.waitForResponse((url) => url.includes("/api/schools"));
```

## No console.log in Tests

Tests assert. If you need to debug, run with `--headed` and add `await page.pause()`.
Remove all `console.log` before committing.

## Test Isolation

Each test should be independent. If your test creates DB records, clean them up:

```typescript
import { getSupabaseAdmin } from "../seed/helpers/supabase-admin";

test.afterEach(async () => {
  const supabase = getSupabaseAdmin();
  await supabase.from("schools").delete().like("name", "Test-%-School");
});
```

## File Location

| Directory             | Tests                                                   |
| --------------------- | ------------------------------------------------------- |
| `tier1-critical/`     | Core flows: CRUD, auth, primary user journeys           |
| `tier2-important/`    | Secondary flows: filtering, search, settings, analytics |
| `tier3-nice-to-have/` | Edge cases, error recovery                              |
| `a11y/`               | Accessibility (WCAG)                                    |
| Root level            | Quick smoke tests for specific behaviors                |
