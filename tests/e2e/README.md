# E2E Test Infrastructure Guide

## Overview

This directory contains end-to-end tests for the Recruiting Compass web application using Playwright. Tests are organized by tier and include comprehensive seeding infrastructure for reproducible test data.

## Quick Start

### 1. Setup Test Database

Create a dedicated Supabase project for testing or use an existing one:

```bash
# Copy the environment template
cp .env.test.example .env.test

# Edit .env.test with your test Supabase credentials
nano .env.test
```

Required environment variables:

- `NUXT_PUBLIC_SUPABASE_URL` - Test Supabase project URL
- `NUXT_PUBLIC_SUPABASE_ANON_KEY` - Test Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Test Supabase service role key (for seeding)

### 2. Seed Test Database

```bash
# Seed with test data (schools, coaches, accounts)
npm run db:seed:test

# Reset database to clean state
npm run db:reset:test
```

### 3. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- tests/e2e/tier1-critical/auth.spec.ts

# Run tests matching pattern
npm run test:e2e -- --grep "should create a coach"

# Run single browser (default: chromium only, add Firefox/WebKit with FULL_TESTS=1)
npm run test:e2e -- --project=chromium
```

## Directory Structure

```
tests/e2e/
├── config/                          # Test configuration
│   └── test-accounts.ts             # Pre-seeded test account credentials
├── seed/                            # Database seeding infrastructure
│   ├── helpers/
│   │   └── supabase-admin.ts        # Supabase admin client & account creation
│   ├── sql/
│   │   └── 001-reset-tables.sql     # Database reset script
│   ├── seed.ts                      # Main seeding script
│   └── reset.ts                     # Database cleanup script
├── fixtures/                        # Reusable test utilities
│   ├── auth.fixture.ts              # Auth helpers (login, signup, logout)
│   ├── coaches.fixture.ts           # Coach test data and helpers
│   ├── schools.fixture.ts           # School test data and helpers
│   └── testData.ts                  # Static test data
├── pages/                           # Page Object Model (POM)
│   ├── BasePage.ts                  # Base page class
│   ├── AuthPage.ts                  # Auth pages
│   ├── DashboardPage.ts             # Dashboard page
│   ├── CoachesPage.ts               # Coaches list/management
│   ├── SchoolsPage.ts               # Schools list/management
│   └── ...                          # Other page objects
├── tier1-critical/                  # Critical functionality tests (22 files)
│   ├── auth.spec.ts
│   ├── coaches-crud.spec.ts
│   ├── schools-crud.spec.ts
│   └── ...
├── tier2-important/                 # Important features (6 files)
├── tier3-nice-to-have/              # Enhancement features (2 files)
├── global-setup.ts                  # Playwright global setup (seeding)
└── README.md                        # This file
```

## Test Accounts

Pre-seeded test accounts (created during database seeding):

| Role   | Email             | Password       | Use Case                     |
| ------ | ----------------- | -------------- | ---------------------------- |
| Player | `player@test.com` | `TestPass123!` | Athlete/player workflows     |
| Parent | `parent@test.com` | `TestPass123!` | Parent account linking       |
| Admin  | `admin@test.com`  | `TestPass123!` | Admin operations (if needed) |

### Using Pre-Seeded Accounts

```typescript
import { authFixture } from "../fixtures/auth.fixture";

test("player workflow", async ({ page }) => {
  // Fast login with pre-seeded account (< 1 second)
  await authFixture.loginFast(page, "player");

  // Test logic...
});

test("parent workflow", async ({ page }) => {
  // Login as parent
  await authFixture.loginFast(page, "parent");

  // Test logic...
});
```

### Legacy: Creating Dynamic Test Users

For tests that need unique users per run:

```typescript
import { authFixture } from "../fixtures/auth.fixture";

test("unique user workflow", async ({ page }) => {
  // Creates fresh user with timestamp-based email
  const { email, password, displayName } =
    await authFixture.signupNewUser(page);

  // Test logic...
});
```

## Seeding Strategy

### Database Seed Data

When `npm run db:seed:test` runs, it:

1. **Resets tables** - Clears all user-generated data while preserving schema
2. **Creates test accounts** - 3 pre-verified accounts (player, parent, admin)
3. **Seeds schools** - 5 sample schools across divisions (D1, D2, D3)
4. **Seeds coaches** - 5-10 sample coaches distributed across schools

### Initial Data

**Schools (5 total):**

- Duke University (D1, ACC, researching)
- Boston College (D1, ACC, interested)
- University of Florida (D1, SEC, researching)
- Vanderbilt University (D1, SEC, contacted)
- University of Arizona (D1, Pac-12, interested)

**Coaches (5 total):**

- Distributed across schools
- Various roles: Head Coach, Assistant Coach, Recruiting Coordinator

### Seeding Workflow

```
1. Global Setup (playwright.config.ts)
   ↓
   Check: Is CI=true or E2E_SEED=true?
   ↓
   Yes → Run npm run db:seed:test
         ├─ Delete existing test data
         ├─ Create test accounts
         ├─ Seed schools
         └─ Seed coaches
   ↓
2. Tests Run
   ↓
   Each test uses pre-seeded data:
   - Tests can login with @test.com accounts
   - Schools and coaches are available
   - No test pollution between tests
```

## Test Tiers

### Tier 1: Critical (22 files)

Core functionality that must work:

- Authentication (login, signup, logout)
- CRUD operations (coaches, schools, interactions)
- Critical user workflows
- Document management
- Communication templates

**Examples:**

- `auth.spec.ts` - Login/signup flows
- `coaches-crud.spec.ts` - Create, read, update, delete coaches
- `schools-crud.spec.ts` - Create, read, update, delete schools

### Tier 2: Important (6 files)

Important features with good coverage:

- Filtering and search
- Analytics and performance
- Communication workflows
- User preferences

**Examples:**

- `search-and-filters.spec.ts`
- `analytics.spec.ts`
- `coaches-communication.spec.ts`

### Tier 3: Nice-to-Have (2 files)

Enhancement features:

- Error recovery
- Edge cases
- Performance optimization

**Examples:**

- `error-recovery.spec.ts`
- `documents-events.spec.ts`

## Page Object Model (POM)

Tests use the Page Object Model pattern for maintainability:

```typescript
import { DashboardPage } from "../pages/DashboardPage";

test("dashboard displays stats", async ({ page }) => {
  const dashboard = new DashboardPage(page);

  await dashboard.goto();
  const stats = await dashboard.getStats();

  expect(stats.coaches).toBeGreaterThan(0);
});
```

**Page classes provide:**

- Consistent selectors (data-testid prioritized)
- Common element interactions
- URL validation
- Wait strategies

## Selector Strategy

Tests use a three-tier selector hierarchy for reliability:

### Tier 1: data-testid (Most Reliable)

```typescript
await page.click('[data-testid="add-coach-button"]');
```

### Tier 2: aria-label or Semantic HTML

```typescript
await page.click('button[aria-label*="email"]');
```

### Tier 3: Text/Placeholder (Fallback)

```typescript
await page.click('button:has-text("Create School")');
```

## Component Selectors Added

Phase 1 completed - data-testid attributes added to:

✅ **Task Management** (`pages/tasks/index.vue`)

- `data-testid="task-item"` - Task list item container
- `data-testid="task-checkbox-{id}"` - Task completion checkbox
- `data-testid="task-title-{id}"` - Task title button

✅ **Player Details** (`pages/settings/player-details.vue`)

- `data-testid="gpa-input"` - GPA input field
- `data-testid="save-player-details-button"` - Save button

✅ **Coaching Philosophy** (`components/School/CoachingPhilosophy.vue`)

- `data-testid="coaching-philosophy-section"` - Section container
- `data-testid="coaching-philosophy-edit-btn"` - Edit button
- `data-testid="coaching-style-textarea"` - Coaching style textarea
- `data-testid="recruiting-approach-textarea"` - Recruiting approach textarea
- `data-testid="communication-style-textarea"` - Communication style textarea
- `data-testid="success-metrics-textarea"` - Success metrics textarea
- `data-testid="overall-philosophy-textarea"` - Overall philosophy textarea
- `data-testid="save-philosophy-btn"` - Save button

## CI/CD Integration

### GitLab CI/CD Configuration

Tests run automatically on every commit to `main` or merge request:

```yaml
stages:
  - install # Install dependencies and browsers
  - lint # ESLint and type checking
  - test # Unit tests and E2E tests
  - build # Production build
```

**Required GitLab CI/CD Variables:**

Set these as protected variables in **Settings > CI/CD > Variables**:

```
TEST_SUPABASE_URL          = https://your-test-project.supabase.co
TEST_SUPABASE_ANON_KEY     = eyJhbG...
SUPABASE_SERVICE_ROLE_KEY  = eyJhbG...
```

### Pipeline Stages

1. **Install** (Playwright image)
   - `npm ci` - Install dependencies
   - `npx playwright install --with-deps chromium`

2. **Lint** (Node image)
   - `npm run lint` - ESLint
   - `npm run type-check` - TypeScript

3. **Unit Tests** (Node image)
   - `npm run test -- --run --coverage`

4. **E2E Tests** (Playwright image)
   - `npm run db:seed:test` - Seed database
   - `npm run dev &` - Start dev server
   - `npm run test:e2e` - Run Playwright tests

5. **Build** (Node image)
   - `npm run build` - Production build

## Local Development

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure test environment
cp .env.test.example .env.test
# Edit .env.test with your test database credentials

# 3. Seed test database
npm run db:seed:test

# 4. Start dev server
npm run dev
```

### Running Tests Locally

```bash
# Run all tests
npm run test:e2e

# Run in UI mode (interactive, great for debugging)
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- tests/e2e/tier1-critical/auth.spec.ts

# Run with debug logging
npm run test:e2e -- --debug

# Run with headed browser (see what's happening)
npm run test:e2e -- --headed

# Run in slow-motion (helpful for debugging flaky tests)
npm run test:e2e -- --headed --slow-mo=1000
```

### Debugging Failed Tests

```bash
# 1. Check test output
npm run test:e2e -- tests/e2e/tier1-critical/auth.spec.ts

# 2. If failed, check generated trace
# Traces are saved in playwright-report/
open playwright-report/index.html

# 3. Run with debug mode
PWDEBUG=1 npm run test:e2e

# 4. Use UI mode for step-by-step execution
npm run test:e2e:ui
```

## Troubleshooting

### Database Seeding Fails

```bash
# 1. Verify environment variables
echo $NUXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 2. Test Supabase connection
curl https://your-supabase.supabase.co/rest/v1/schools

# 3. Check Supabase project status
# Visit https://supabase.com/dashboard and verify project is active

# 4. Reset and try again
npm run db:reset:test
npm run db:seed:test
```

### Fast Login Fails (Falls Back to UI)

```bash
# Check browser console for auth errors
npm run test:e2e:ui

# Fallback behavior:
# - Fast login attempts via Supabase client
# - If fails, uses standard UI login
# - Tests continue normally (just slower)
```

### Flaky Tests

```bash
# 1. Run test multiple times to identify flakiness
npm run test:e2e -- --repeat-each=3 tests/e2e/path/to/test.spec.ts

# 2. Check for timing issues
# - Use explicit waits instead of fixed timeouts
# - Wait for elements to be visible/enabled
# - Use page.waitForLoadState('networkidle')

# 3. Increase timeouts in playwright.config.ts if needed
```

### Tests Pass Locally but Fail in CI

```bash
# 1. Check CI environment variables are set correctly
# 2. Verify test database is accessible from CI runner
# 3. Check network connectivity to Supabase
# 4. Review CI logs for specific errors
# 5. Test with same Node version as CI (currently node:20-alpine)
```

## Best Practices

### Do's ✅

- Use page objects for consistency
- Prioritize `data-testid` selectors
- Create isolated, independent tests
- Use pre-seeded accounts for speed
- Wait for network/elements explicitly
- Reset state between tests

### Don'ts ❌

- Don't depend on test execution order
- Don't use flaky CSS selectors
- Don't hardcode delays (use explicit waits)
- Don't create users in UI if seeded accounts exist
- Don't leave test data in production
- Don't skip tests without documenting why

## Performance Metrics

### Target Times

- **Fast login with pre-seeded account:** < 1 second
- **Database seeding:** < 10 seconds
- **Single test execution:** 5-30 seconds (depends on test)
- **Full E2E suite:** < 10 minutes (with all tiers)
- **CI/CD pipeline total time:** < 20 minutes

### Optimization Strategies

1. **Parallel execution** - Tests run in parallel locally
2. **Browser reuse** - Browsers are cached between tests
3. **Fast login** - Pre-seeded accounts avoid signup flow
4. **Selective seeding** - Only seed when needed (`E2E_SEED=true`)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Supabase Admin API](https://supabase.com/docs/reference/admin-api)
- [Best Practices for E2E Tests](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

## Contributing

When adding new tests:

1. Use appropriate tier (1 for critical, 2 for important, 3 for nice-to-have)
2. Add `data-testid` attributes to components being tested
3. Use page objects for consistency
4. Document complex test logic with comments
5. Ensure tests are independent and can run in any order
6. Add tests to the corresponding test file or create new file
7. Run locally before pushing: `npm run test:e2e`

## Contact

For questions about E2E test infrastructure:

- Check this README
- Review existing tests for patterns
- Ask in team chat or GitHub issues
