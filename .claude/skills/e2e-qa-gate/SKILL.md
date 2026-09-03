---
name: e2e-qa-gate
description: Pre-merge QA gate for E2E specs. Checks selector fragility, hard-coded credentials, implementation bleed-through, and fixture reuse. Run before committing new or modified E2E test files.
---

# E2E QA Gate

Run this review on any new or modified file under `tests/e2e/`. Do NOT skip steps.

## 1. Selector Fragility Scan

Check every locator in the diff for fragility. Flag and fix:

| Pattern | Verdict | Fix |
|---------|---------|-----|
| `data-testid="..."` | ✅ Stable | — |
| `getByRole(...)` | ✅ Stable | — |
| `getByLabel(...)` | ✅ Stable | — |
| `getByText(...)` on user-visible copy | ✅ OK | — |
| `.class-name` (Tailwind utility or CSS module) | ❌ Fragile | Replace with `data-testid` or role locator |
| `#auto-generated-id` | ❌ Fragile | Replace with stable `data-testid` |
| `nth-child`, `nth-of-type` | ⚠️ Brittle | Accept only when list order is semantically guaranteed |
| `[placeholder="..."]` | ⚠️ Brittle | Prefer `getByLabel` or `data-testid` |
| Deeply nested CSS path (3+ combinators) | ❌ Fragile | Flatten to `data-testid` |

**Implementation bleed-through check:** If a selector references a component internal (Vue `ref` name, Pinia store key, CSS module hash, scoped class), flag it. E2E tests observe the UI, not the implementation. The test must still pass after a refactor that preserves the UI.

## 2. Hard-Coded Credential Scan

Grep the diff for:

```
password|secret|token|apiKey|api_key|credential|auth.*header
```

Any match that is a literal string value (not a reference to `testData`, `test-accounts.ts`, or `process.env`) is a **merge blocker**. Move to `tests/e2e/config/test-accounts.ts` or environment variables.

Acceptable patterns:
- `testAccounts.player.password` ✅
- `process.env.TEST_PASSWORD` ✅
- `"DemoPass123!"` inline ❌ (even if it's the demo password — reference the constant)

## 3. Fixture & Helper Reuse

Before the spec invents a new helper, check whether it already exists:

| Need | Check first |
|------|-------------|
| Login / auth state | `auth.fixture.ts` → `loginFast`, `ensureLoggedIn`, `loginAsTestUser` |
| Create school | `schools.fixture.ts` → `schoolHelpers.createSchool` |
| Create coach | `coaches.fixture.ts` → `coachHelpers.createCoach` |
| Upload document | `documents.fixture.ts` → `documentHelpers.uploadDocument` |
| Navigate + wait | `BasePage.goto()` or fixture helper |
| Fill + trigger validation | `BasePage.fillAndValidate()` |
| Selector map | Check existing `*Selectors` exports before defining new selectors inline |

Flag any spec that reinvents an existing helper. Fix by importing the existing one.

## 4. Data Isolation Check

- Every `test.describe` that seeds data MUST clean up in `afterAll` or use `RUN_ID`-scoped names
- No spec should rely on data created by a different spec file (see [[e2e-test-account-school-leak]])
- `beforeAll` seeds must be idempotent (upsert, not insert-or-fail)
- Shared test accounts (`player@test.com`) must not accumulate unbounded data

## 5. Wait Strategy Check

Flag and fix:
- `page.waitForTimeout(N)` where N > 1000 → replace with explicit element/network wait
- Missing `waitFor` before assertion on dynamic content → add `waitFor({ state: 'visible' })`
- `networkidle` used as a hydration gate → prefer `waitForSelector` on a known post-hydration element

## 6. Black-Box Integrity (new specs only)

For NEW spec files, verify the test could pass without reading component source:

1. Every assertion checks user-visible output (text, URL, element visibility, aria state)
2. No assertion checks internal state (store values, component data, emitted events)
3. Selectors come from the rendered DOM, not from reading `.vue` template source

If a selector was chosen because the agent read the component file, flag it with:
> ⚠️ Implementation-derived selector: `[selector]` — verify this is stable across refactors

## Output

Report as a checklist:

```
## E2E QA Gate — [spec file]

- [ ] Selector fragility: N fragile / N total
- [ ] Credentials: clean | N hard-coded (BLOCKER)
- [ ] Fixture reuse: N reinvented helpers
- [ ] Data isolation: clean | N leaks
- [ ] Wait strategy: N bare timeouts
- [ ] Black-box integrity: clean | N implementation-derived selectors

Verdict: PASS | PASS WITH WARNINGS | FAIL (blockers found)
```

Fix all blockers before commit. Warnings get a comment explaining why they're acceptable.
