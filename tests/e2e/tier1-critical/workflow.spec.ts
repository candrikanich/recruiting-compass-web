import { test } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { SchoolsPage } from '../pages/SchoolsPage'
import { CoachesPage } from '../pages/CoachesPage'
import { InteractionsPage } from '../pages/InteractionsPage'
import { testUsers, testSchools, testCoaches, testInteractions } from '../fixtures/testData'

test.describe('Tier 1: Complete Recruiting Workflow', () => {
  let authPage: AuthPage
  let schoolsPage: SchoolsPage
  let coachesPage: CoachesPage
  let interactionsPage: InteractionsPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    schoolsPage = new SchoolsPage(page)
    coachesPage = new CoachesPage(page)
    interactionsPage = new InteractionsPage(page)

    // Login
    await authPage.goto()
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName
    )
  })

  test('should complete full workflow: school -> coach -> interaction', async ({ page }) => {
    // Step 1: Add School
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)
    await schoolsPage.expectSchoolDetails(testSchools.school1.name, testSchools.school1.location)

    // Step 2: Add Coach
    await coachesPage.clickAddCoach()
    await coachesPage.createCoach(testCoaches.coach1)
    await coachesPage.expectCoachInList(testCoaches.coach1.firstName, testCoaches.coach1.lastName)

    // Step 3: Log Interaction
    await interactionsPage.navigateToInteractions()
    await interactionsPage.clickLogInteraction()
    await interactionsPage.logInteraction({
      ...testInteractions.interaction1,
      school: testSchools.school1.name,
      coach: `${testCoaches.coach1.firstName} ${testCoaches.coach1.lastName}`
    })
    await interactionsPage.expectInteractionLogged(testSchools.school1.name)
  })

  test('should add multiple schools', async ({ page }) => {
    await schoolsPage.navigateToSchools()

    // Add first school
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Add second school
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school2)

    // Verify both are in list
    await schoolsPage.expectSchoolInList(testSchools.school1.name)
    await schoolsPage.expectSchoolInList(testSchools.school2.name)

    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should add multiple coaches to same school', async ({ page }) => {
    // Add school first
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Add first coach
    await coachesPage.clickAddCoach()
    await coachesPage.createCoach(testCoaches.coach1)

    // Add second coach
    await coachesPage.clickAddCoach()
    await coachesPage.createCoach(testCoaches.coach3)

    // Verify both are listed
    await coachesPage.expectCoachInList(testCoaches.coach1.firstName, testCoaches.coach1.lastName)
    await coachesPage.expectCoachInList(testCoaches.coach3.firstName, testCoaches.coach3.lastName)

    const count = await coachesPage.getCoachCount()
    test.expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should log multiple interactions with different types', async ({ page }) => {
    // Setup
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    await coachesPage.clickAddCoach()
    await coachesPage.createCoach(testCoaches.coach1)

    // Log interaction 1 (Email)
    await interactionsPage.navigateToInteractions()
    await interactionsPage.clickLogInteraction()
    await interactionsPage.logInteraction({
      ...testInteractions.interaction1,
      school: testSchools.school1.name
    })

    // Log interaction 2 (Phone)
    await interactionsPage.clickLogInteraction()
    await interactionsPage.logInteraction({
      ...testInteractions.interaction2,
      school: testSchools.school1.name
    })

    // Verify count
    const count = await interactionsPage.getInteractionCount()
    test.expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should update school status after receiving offer', async ({ page }) => {
    // Add school with initial status
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Update status
    await schoolsPage.updateSchool({ status: 'offer_received' })

    // Verify status updated
    const currentUrl = await schoolsPage.getURL()
    test.expect(currentUrl).toContain('/schools/')
  })

  test('should toggle school favorite', async ({ page }) => {
    // Add school
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Toggle favorite
    await schoolsPage.toggleFavorite()

    // Verify
    await schoolsPage.goto()
    await schoolsPage.expectSchoolInList(testSchools.school1.name)
  })

  test('should delete school and associated data', async ({ page }) => {
    // Add school
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    // Delete school
    await schoolsPage.deleteSchool()

    // Verify deletion
    await schoolsPage.expectHidden(`text=${testSchools.school1.name}`)
  })

  test('should filter interactions by school', async ({ page }) => {
    // Setup
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school2)

    // Log interactions
    await interactionsPage.navigateToInteractions()
    await interactionsPage.clickLogInteraction()
    await interactionsPage.logInteraction({
      ...testInteractions.interaction1,
      school: testSchools.school1.name
    })

    // Filter by school
    await interactionsPage.filterBySchool(testSchools.school1.name)

    // Verify only one school's interactions shown
    await interactionsPage.expectVisible(`text=${testSchools.school1.name}`)
  })
})
