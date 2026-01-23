import { Page, expect } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { testUsers } from './testData'

/**
 * Auth fixture for E2E tests
 * Handles login, logout, and auth state cleanup
 */
export const authFixture = {
  /**
   * Clear all auth state from browser
   */
  async clearAuthState(page: Page) {
    // Navigate to a page first to establish context
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await page.evaluate(() => {
      // Clear all storage
      localStorage.clear()
      sessionStorage.clear()
    })

    // Clear cookies
    await page.context().clearCookies()
  },

  /**
   * Login with existing credentials (creates user if doesn't exist)
   */
  async loginOrSignup(page: Page, email: string, password: string, displayName: string) {
    const authPage = new AuthPage(page)

    // Go to login page
    await authPage.goto()

    // Try login first
    try {
      await authPage.login(email, password)
      return { email, password, displayName }
    } catch {
      // If login fails, try signup
      await authPage.goto()
      await authPage.signup(email, password, displayName)
      return { email, password, displayName }
    }
  },

  /**
   * Signup with fresh test user
   */
  async signupNewUser(page: Page) {
    const authPage = new AuthPage(page)
    const email = `test-${Date.now()}@example.com`
    const password = 'TestPassword123!'
    const displayName = 'Test User'

    await authPage.goto()
    await authPage.signup(email, password, displayName)

    return { email, password, displayName }
  },

  /**
   * Login with test user
   */
  async loginAsTestUser(page: Page) {
    const authPage = new AuthPage(page)

    await authPage.goto()
    await authPage.login(testUsers.newUser.email, testUsers.newUser.password)

    return testUsers.newUser
  },

  /**
   * Check if user is logged in
   */
  async isLoggedIn(page: Page): Promise<boolean> {
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' })
      return page.url().includes('/dashboard')
    } catch {
      return false
    }
  },

  /**
   * Ensure user is logged in (login if not already)
   */
  async ensureLoggedIn(page: Page, email?: string, password?: string, displayName?: string) {
    const isLoggedIn = await authFixture.isLoggedIn(page)

    if (!isLoggedIn) {
      if (email && password && displayName) {
        await authFixture.loginOrSignup(page, email, password, displayName)
      } else {
        await authFixture.signupNewUser(page)
      }
    }

    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard')
  },

  /**
   * Logout and verify redirect to login
   */
  async logout(page: Page) {
    const authPage = new AuthPage(page)

    try {
      await authPage.logout()
    } catch {
      // If logout UI fails, clear auth state manually
      await authFixture.clearAuthState(page)
      await page.goto('/login')
    }

    await authPage.expectLoginPage()
  }
}
