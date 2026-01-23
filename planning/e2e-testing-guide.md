# E2E Testing Guide

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in interactive UI mode (recommended for debugging)
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- tests/e2e/example.spec.ts

# Run tests matching a pattern
npm run test:e2e -- --grep "schools"
```

## Available Tools

### 1. Auth Fixture (`tests/e2e/fixtures/auth.fixture.ts`)

Handles authentication workflows:

```typescript
import { authFixture } from './fixtures/auth.fixture'

test.beforeEach(async ({ page }) => {
  // Clear auth state before each test
  await authFixture.clearAuthState(page)

  // Option A: Signup fresh user for this test
  const user = await authFixture.signupNewUser(page)
  // Returns: { email, password, displayName }

  // Option B: Login with existing credentials
  await authFixture.loginAsTestUser(page)

  // Option C: Ensure user is logged in (login if needed)
  await authFixture.ensureLoggedIn(page, email, password, displayName)
})

test('example', async ({ page }) => {
  // Logout
  await authFixture.logout(page)

  // Check if logged in
  const isLoggedIn = await authFixture.isLoggedIn(page)
})
```

### 2. Page Objects

Use page objects for better maintainability:

**AuthPage:**
```typescript
import { AuthPage } from './pages/AuthPage'

const authPage = new AuthPage(page)
await authPage.goto()                              // Go to /login
await authPage.login(email, password)              // Login
await authPage.signup(email, password, displayName) // Signup
await authPage.logout()                            // Logout
await authPage.expectLoginPage()                   // Assert on login page
await authPage.expectDashboard()                   // Assert on dashboard
await authPage.expectError(message)                // Assert error message
```

**BasePage (inherited by all page objects):**
```typescript
import { BasePage } from './pages/BasePage'

const page = new BasePage(page)
await page.goto(path)                    // Navigate
await page.click(selector)                // Click element
await page.clickByText(text)              // Click element by text
await page.clickWhenEnabled(selector)     // Wait for enabled then click
await page.fillInput(selector, value)     // Fill input
await page.fillAndValidate(selector, value) // Fill and trigger validation
await page.selectOption(selector, value)  // Select dropdown option
await page.getText(selector)              // Get text content
await page.isVisible(selector)            // Check visibility
await page.waitForElement(selector)       // Wait for element
await page.getURL()                       // Get current URL
await page.expectURL(url)                 // Assert URL
await page.expectVisible(selector)        // Assert visible
await page.expectHidden(selector)         // Assert hidden
await page.expectText(selector, text)     // Assert text content
await page.getCount(selector)             // Count matching elements
await page.reloadPage()                   // Reload page
await page.goBack()                       // Go back
```

### 3. Test Data Fixtures (`tests/e2e/fixtures/testData.ts`)

Pre-built test data:

```typescript
import { testUsers, testSchools, testCoaches, testInteractions, testOffers } from './fixtures/testData'

// Test users - automatically create unique emails
testUsers.newUser          // { email: test-${timestamp}@example.com, password, displayName }
testUsers.existingUser     // Pre-defined user
testUsers.collaborator     // Pre-defined collaborator

// Test schools, coaches, interactions, offers are also available
testSchools.school1
testCoaches.coach1
testInteractions.interaction1
testOffers.fullRide
```

## Best Practices

### 1. Auth State Management

**✅ DO: Clean auth state before each test**
```typescript
test.beforeEach(async ({ page }) => {
  await authFixture.clearAuthState(page)
  await authFixture.signupNewUser(page)
})
```

**❌ DON'T: Reuse logged-in state across tests**
Tests should be independent. Don't rely on previous test's login.

### 2. Form Filling

**✅ DO: Use fillAndValidate for proper timing**
```typescript
await page.fillAndValidate('#email', 'user@example.com')
```

**❌ DON'T: Quick fill without validation**
```typescript
await page.fill('#email', 'user@example.com')
await page.click('button') // May fail - button still disabled
```

### 3. Button Clicks

**✅ DO: Wait for enabled before clicking**
```typescript
await authPage.clickWhenEnabled('button:has-text("Sign In")')
```

**❌ DON'T: Click disabled buttons**
```typescript
await page.click('button:has-text("Sign In")') // May timeout
```

### 4. Error Handling

**✅ DO: Wrap auth calls in try/catch**
```typescript
try {
  await authPage.login(email, password)
} catch (error) {
  // Handle login failure
  console.error('Login failed:', error)
}
```

### 5. Wait Strategies

**✅ DO: Use explicit waits**
```typescript
await page.locator('.modal').waitFor({ state: 'visible', timeout: 10000 })
await page.waitForNavigation()
await authPage.waitForURL('/dashboard')
```

**❌ DON'T: Use arbitrary timeouts**
```typescript
await page.waitForTimeout(5000) // Last resort only!
```

## Common Issues & Solutions

### Issue: "Button timed out waiting to be clicked"

**Cause:** Button is disabled by validation rules

**Solution:** Use `fillAndValidate()` and `clickWhenEnabled()`

```typescript
await page.fillAndValidate('#email', 'test@example.com')
await page.fillAndValidate('#password', 'password123')
await authPage.clickWhenEnabled('button:has-text("Sign In")')
```

### Issue: "User stays logged in between tests"

**Cause:** Auth state not cleared before test

**Solution:** Add auth cleanup in `beforeEach`

```typescript
test.beforeEach(async ({ page }) => {
  await authFixture.clearAuthState(page)
  // ... rest of setup
})
```

### Issue: "Test timeout on login"

**Cause:** Wrong button text or selector

**Solution:** Verify button text matches UI:
- Login page: "Sign In" (not "Login")
- Signup link: "Create one now" (not "Sign up")
- Signup button: "Create Account" (not "Register")

### Issue: "Form fields not filling"

**Cause:** Field selectors wrong or timing issue

**Solution:** Use explicit IDs when available:
```typescript
await page.fillInput('#firstName', 'John')    // ✅ ID selector
await page.fillInput('[placeholder*="name"]', 'John') // ❌ Fragile
```

## Running Tests in Debug Mode

```bash
# Interactive UI mode - watch tests run
npm run test:e2e:ui

# In UI mode:
# 1. Click test to run it
# 2. Pause on failures
# 3. Step through test execution
# 4. Inspect elements in real-time
```

## Viewing Test Results

After tests run, HTML report is generated:

```bash
# Generated in: test-results/index.html
# Open in browser to see:
# - Pass/fail status
# - Screenshots on failure
# - Video recordings (if configured)
# - Error details with call logs
```

## Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test'
import { authFixture } from './fixtures/auth.fixture'
import { YourPage } from './pages/YourPage'

test.describe('Feature: Your Feature', () => {
  let page: YourPage

  test.beforeEach(async ({ page: playwright_page }) => {
    // Clear auth state
    await authFixture.clearAuthState(playwright_page)

    // Setup auth (create fresh user for this test)
    await authFixture.signupNewUser(playwright_page)

    // Initialize page object
    page = new YourPage(playwright_page)
  })

  test('should do something', async ({ page: playwright_page }) => {
    // Navigate
    await page.navigate()

    // Interact
    await page.clickButton()

    // Assert
    await expect(playwright_page.locator('text=Success')).toBeVisible()
  })

  test.afterEach(async ({ page: playwright_page }) => {
    // Optional: cleanup after test
    await authFixture.logout(playwright_page)
  })
})
```

## CI/CD Integration

Tests are configured to run in CI with:

```bash
npm run test:e2e
```

CI settings in `playwright.config.ts`:
- 2 retries for flaky tests
- 1 worker (sequential) for data consistency
- HTML reporting to `test-results/`
- Video on first retry

## Supabase Real Instance

⚠️ **Important:** Tests run against **real Supabase instance**

- Tests create actual users in Supabase Auth
- Tests create actual records in database
- Use test-specific emails: `test-${timestamp}@example.com`
- Tests clean up after themselves (auth fixture handles this)

### Optional: Use Supabase Test Mode

If available in your Supabase project, tests can use:
1. Isolated test database
2. Automatic cleanup on test end

Check Supabase docs for enabling test mode.

## Next Steps

1. **Run example tests:**
   ```bash
   npm run test:e2e -- tests/e2e/example.spec.ts
   ```

2. **Fix failing tests:**
   - Use interactive UI mode: `npm run test:e2e:ui`
   - Check error messages and call logs
   - Update selectors as needed

3. **Integrate into CI/CD:**
   - Add to GitHub Actions or other CI
   - Set webhook notifications

4. **Expand test coverage:**
   - Copy template from above
   - Add tests for new features
   - Maintain fixtures and page objects

## Support

For issues:
1. Check common issues section above
2. Review test-results HTML report
3. Run in UI mode to debug
4. Check Playwright docs: https://playwright.dev
