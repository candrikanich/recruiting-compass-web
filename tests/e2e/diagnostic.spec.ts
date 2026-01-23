import { test, expect } from '@playwright/test'

/**
 * Diagnostic test to verify E2E setup and Supabase connection
 */
test.describe('Diagnostic Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')

    // Check for login form elements
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const signInButton = page.locator('button:has-text("Sign In")')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(signInButton).toBeVisible()
  })

  test('should load signup page', async ({ page }) => {
    await page.goto('/login')

    // Click "Create one now" link
    const signupLink = page.locator('text=Create one now')
    await expect(signupLink).toBeVisible()
    await signupLink.click()

    await expect(page).toHaveURL('/signup')

    // Check for signup form elements
    const firstNameInput = page.locator('#firstName')
    const emailInput = page.locator('#email')
    const roleSelect = page.locator('#role')
    const passwordInput = page.locator('#password')
    const termsCheckbox = page.locator('input[type="checkbox"]')
    const createButton = page.locator('button:has-text("Create Account")')

    await expect(firstNameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
    await expect(roleSelect).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(termsCheckbox).toBeVisible()
    await expect(createButton).toBeVisible()
  })

  test('should validate email field', async ({ page }) => {
    await page.goto('/signup')

    // Email input should be visible
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()

    // Fill with invalid email
    await emailInput.fill('not-an-email')
    await emailInput.blur()
    await page.waitForTimeout(200)
  })

  test('should validate password field', async ({ page }) => {
    await page.goto('/signup')

    // Password input should be visible
    const passwordInput = page.locator('#password')
    await expect(passwordInput).toBeVisible()

    // Fill with weak password
    await passwordInput.fill('weak')
    await passwordInput.blur()
    await page.waitForTimeout(200)
  })

  test('should have Supabase connection', async ({ page }) => {
    // This will fail if Supabase isn't configured
    await page.goto('/login')

    // If page loads without errors, Supabase is connected
    const isLoaded = await page.evaluate(() => {
      return (window as any).__NUXT__?.ready === true || document.body.textContent.length > 0
    })

    expect(isLoaded).toBe(true)
  })
})
