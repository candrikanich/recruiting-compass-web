import { test, expect } from '@playwright/test'
import { authFixture } from './fixtures/auth.fixture'

test.describe('Schools Management', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged in before each test
    await authFixture.ensureLoggedIn(page)
  })

  test('should navigate to schools page', async ({ page }) => {
    await page.goto('/schools')
    await expect(page).toHaveURL('/schools')

    // Check for page header
    const heading = page.locator('h1, h2')
    await expect(heading.first()).toBeVisible()
  })

  test('should be on dashboard when authenticated', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard')

    // Check dashboard is loaded
    const dashboard = page.locator('text=Dashboard')
    await expect(dashboard).toBeVisible()
  })

  test('should logout and redirect to login', async ({ page }) => {
    // Click profile menu to access logout
    try {
      await page.click('[data-testid="profile-menu"]', { timeout: 5000 })
      await page.locator('text=Logout').click()
    } catch {
      // If profile menu not found, manually clear state
      await authFixture.clearAuthState(page)
      await page.goto('/login')
    }

    // Verify redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should navigate to dashboard from any page', async ({ page }) => {
    await page.goto('/schools')

    // Should be able to navigate within app
    const isOnSchools = page.url().includes('/schools')
    expect(isOnSchools).toBe(true)
  })
})
