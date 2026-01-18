import { test, expect } from '@playwright/test'

test.describe('Schools Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Login")')
    await page.waitForURL('/dashboard')
  })

  test('should navigate to schools list from dashboard', async ({ page }) => {
    await page.click('text=Schools')
    await expect(page).toHaveURL('/schools')
    await expect(page.locator('h1')).toContainText('Schools')
  })

  test('should display empty state when no schools exist', async ({ page }) => {
    await page.goto('/schools')
    await expect(page.locator('text=No schools found')).toBeVisible()
  })

  test('should create a new school', async ({ page }) => {
    await page.goto('/schools')
    await page.click('button:has-text("Add School")')
    await expect(page).toHaveURL('/schools/new')

    // Fill form
    await page.fill('input[placeholder*="name"]', 'Duke Blue Devils')
    await page.fill('input[placeholder*="location"]', 'Durham, NC')
    await page.selectOption('select', 'D1')
    await page.selectOption('select', 'Interested')

    // Submit
    await page.click('button:has-text("Create School")')
    await page.waitForURL(/\/schools\/[a-f0-9-]+/)

    // Verify school details page
    await expect(page.locator('h1')).toContainText('Duke Blue Devils')
    await expect(page.locator('text=Durham, NC')).toBeVisible()
  })

  test('should display school in list after creation', async ({ page }) => {
    await page.goto('/schools')
    await page.click('button:has-text("Add School")')
    await page.fill('input[placeholder*="name"]', 'Test School')
    await page.fill('input[placeholder*="location"]', 'Test City')
    await page.selectOption('select', 'D1')
    await page.selectOption('select', 'Researching')
    await page.click('button:has-text("Create School")')

    // Go back to list
    await page.goto('/schools')
    await expect(page.locator('text=Test School')).toBeVisible()
  })

  test('should toggle school favorite status', async ({ page }) => {
    // Create a school first
    await page.goto('/schools/new')
    await page.fill('input[placeholder*="name"]', 'Favorite Test')
    await page.fill('input[placeholder*="location"]', 'Test City')
    await page.selectOption('select', 'D1')
    await page.selectOption('select', 'Interested')
    await page.click('button:has-text("Create School")')

    // Toggle favorite
    await page.click('button:has-text("⭐")')
    await expect(page.locator('button:has-text("⭐")')).toHaveClass(/text-yellow/)
  })

  test('should delete a school', async ({ page }) => {
    // Create a school
    await page.goto('/schools/new')
    await page.fill('input[placeholder*="name"]', 'Delete Test')
    await page.fill('input[placeholder*="location"]', 'Test City')
    await page.selectOption('select', 'D1')
    await page.selectOption('select', 'Researching')
    await page.click('button:has-text("Create School")')

    // Delete school
    await page.click('button:has-text("Delete")')
    await page.click('button:has-text("Confirm")')

    // Should redirect to schools list
    await expect(page).toHaveURL('/schools')
    await expect(page.locator('text=Delete Test')).not.toBeVisible()
  })
})
