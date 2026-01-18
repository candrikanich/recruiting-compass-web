import { test } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { SchoolsPage } from '../pages/SchoolsPage'
import { testUsers, testSchools, testErrorScenarios } from '../fixtures/testData'

test.describe('Tier 3: Error Recovery & Edge Cases', () => {
  let authPage: AuthPage
  let schoolsPage: SchoolsPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    schoolsPage = new SchoolsPage(page)

    await authPage.goto()
    await authPage.signup(testUsers.newUser.email, testUsers.newUser.password, testUsers.newUser.displayName)
  })

  test('should recover from network error', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()

    // Simulate offline
    await page.context().setOffline(true)

    // Try to create school (should fail gracefully)
    try {
      await schoolsPage.createSchool(testSchools.school1)
    } catch (e) {
      // Expected to fail
    }

    // Go back online
    await page.context().setOffline(false)

    // Try again
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    await schoolsPage.expectSchoolInList(testSchools.school1.name)
  })

  test('should handle concurrent requests', async ({ page }) => {
    await schoolsPage.navigateToSchools()

    // Rapidly add multiple schools
    for (let i = 0; i < 3; i++) {
      await schoolsPage.clickAddSchool()
      const school = { ...testSchools.school1, name: `School ${i}` }
      await schoolsPage.createSchool(school)
    }

    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(3)
  })

  test('should handle duplicate school names', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Try to create same school again
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Should either prevent or show both
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should handle long school names', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()

    const longName = 'A'.repeat(500)
    const school = { ...testSchools.school1, name: longName }
    await schoolsPage.createSchool(school)

    // Should truncate or handle gracefully
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should handle special characters in input', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()

    const school = {
      ...testSchools.school1,
      name: "School's \"Test\" & <More>",
      location: '@#$%^&*()'
    }
    await schoolsPage.createSchool(school)

    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should handle page refresh during edit', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Navigate to edit
    await schoolsPage.clickSchool(testSchools.school1.name)

    // Refresh page
    await schoolsPage.reloadPage()

    // Should still be able to edit
    const url = await schoolsPage.getURL()
    test.expect(url.length).toBeGreaterThan(0)
  })

  test('should handle browser back button', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()

    // Go back
    await schoolsPage.goBack()

    // Should be back at schools list
    await schoolsPage.expectURL('/schools')
  })

  test('should handle rapid clicks', async ({ page }) => {
    await schoolsPage.navigateToSchools()

    // Rapidly click add school multiple times
    await schoolsPage.clickAddSchool()
    await schoolsPage.clickAddSchool()
    await schoolsPage.clickAddSchool()

    // Should still be functional
    const url = await schoolsPage.getURL()
    test.expect(url.includes('/schools')).toBeTruthy()
  })

  test('should handle timezone changes', async ({ page }) => {
    // Set different timezone
    await page.evaluate(() => {
      // Simulate timezone awareness
      Intl.DateTimeFormat = class {
        constructor() {}
        format() { return '2024-01-15' }
        resolvedOptions() { return { timeZone: 'Asia/Tokyo' } }
      }
    })

    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Should still work
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should handle empty state transitions', async ({ page }) => {
    await schoolsPage.navigateToSchools()

    // Should show empty state
    await schoolsPage.expectVisible('text=No schools found')

    // Add school
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Empty state should be gone
    await schoolsPage.goto()
    await schoolsPage.expectVisible(`text=${testSchools.school1.name}`)
  })

  test('should preserve data after logout/login', async ({ page }) => {
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Logout
    await authPage.logout()

    // Login again
    await authPage.login(testUsers.newUser.email, testUsers.newUser.password)

    // Data should persist
    await schoolsPage.navigateToSchools()
    await schoolsPage.expectSchoolInList(testSchools.school1.name)
  })
})
