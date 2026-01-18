import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { testUsers } from '../fixtures/testData'

test.describe('Tier 1: Authentication - Critical User Flows', () => {
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    await authPage.goto()
  })

  test('should signup new user successfully', async ({ page }) => {
    authPage = new AuthPage(page)

    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName
    )

    await authPage.expectDashboard()
  })

  test('should login with valid credentials', async ({ page }) => {
    authPage = new AuthPage(page)

    // Signup first to create user
    await authPage.signup(
      testUsers.existingUser.email,
      testUsers.existingUser.password,
      testUsers.existingUser.displayName
    )

    // Logout
    await authPage.logout()
    await authPage.expectLoginPage()

    // Login again
    await authPage.login(testUsers.existingUser.email, testUsers.existingUser.password)
    await authPage.expectDashboard()
  })

  test('should reject invalid email format', async ({ page }) => {
    authPage = new AuthPage(page)
    await authPage.fillInvalidEmail('invalid-email')

    await authPage.expectError('valid email')
  })

  test('should reject weak password', async ({ page }) => {
    authPage = new AuthPage(page)
    await authPage.clickByText('Sign up')

    await authPage.fillInput('input[placeholder*="email"]', 'test@example.com')
    await authPage.fillInput('input[placeholder*="name"]', 'Test User')
    await authPage.fillInput('input[type="password"]', 'weak')

    await authPage.expectError('password')
  })

  test('should handle invalid credentials', async ({ page }) => {
    authPage = new AuthPage(page)
    await authPage.login('nonexistent@example.com', 'wrongpassword')

    await authPage.expectError('incorrect')
  })

  test('should maintain session after page reload', async ({ page }) => {
    authPage = new AuthPage(page)

    // Signup
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName
    )

    // Reload page
    await authPage.reloadPage()

    // Should still be on dashboard
    await authPage.expectDashboard()
  })

  test('should logout successfully', async ({ page }) => {
    authPage = new AuthPage(page)

    // Signup
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName
    )

    // Logout
    await authPage.logout()
    await authPage.expectLoginPage()
  })

  test('should prevent access to protected pages when logged out', async ({ page }) => {
    authPage = new AuthPage(page)

    // Try to access dashboard without login
    await authPage.goto()
    await authPage.page.goto('/dashboard')

    // Should redirect to login
    await authPage.expectLoginPage()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    authPage = new AuthPage(page)

    // Signup
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName
    )

    await authPage.expectURL('/dashboard')
  })
})
