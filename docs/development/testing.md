# Testing Strategy

**Target coverage:** 80%+ (unit/integration), 75%+ automated threshold in CI

---

## Test Types

| Type | Tool | Location | When |
|---|---|---|---|
| Unit | Vitest | `tests/unit/` | Functions, composables, utils |
| Integration | Vitest | `tests/unit/` | Store + composable interactions |
| E2E | Playwright | `tests/e2e/` | Critical user flows |

---

## Running Tests

```bash
npm run test              # Vitest (watch mode off)
npm run test:ui           # Vitest interactive UI
npm run test:coverage     # With coverage report
npm run test:e2e          # Playwright (requires dev server)
npm run test:e2e:ui       # Playwright interactive UI
```

---

## Writing Tests

### Unit test (Vitest)

```typescript
import { describe, it, expect } from 'vitest'
import { calculateFitScore } from '~/utils/fitScore'

describe('calculateFitScore', () => {
  it('returns a score between 1 and 10', () => {
    const score = calculateFitScore(mockUser, mockSchool)
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
  })
})
```

### Composable test (with Pinia)

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useCoaches } from '~/composables/useCoaches'

describe('useCoaches', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates a coach and updates the store', async () => {
    const { createCoach } = useCoaches()
    await createCoach(schoolId, coachData)
    // assert store state
  })
})
```

### E2E test (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('creates and views a coach', async ({ page }) => {
  await page.goto('/coaches')
  await page.fill('[data-testid="coach-name"]', 'John Smith')
  await page.click('[data-testid="create-btn"]')
  await expect(page.locator('text=John Smith')).toBeVisible()
})
```

---

## TDD Cycle

1. **RED** — Write a failing test for the new behavior
2. **GREEN** — Write minimal code to make it pass
3. **REFACTOR** — Clean up, verify tests still pass

Never skip the failing test step.

---

## Coverage Thresholds (vitest.config.ts)

```typescript
coverage: {
  lines: 75,
  functions: 75,
  statements: 75,
  branches: 70,
}
```

---

## Reference

- [Test Suite Index](../testing/TEST_SUITE_INDEX.md)
- [E2E Tests Summary](../testing/E2E_TESTS_SUMMARY.md)
- [Test Coverage Report](../testing/TEST_COVERAGE_COMPLETION_REPORT.md)
