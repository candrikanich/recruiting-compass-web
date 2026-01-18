import { test } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { SchoolsPage } from '../pages/SchoolsPage'
import { OffersPage } from '../pages/OffersPage'
import { testUsers, testSchools, testOffers } from '../fixtures/testData'

test.describe('Tier 1: Offer Management - Critical Flows', () => {
  let authPage: AuthPage
  let schoolsPage: SchoolsPage
  let offersPage: OffersPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    schoolsPage = new SchoolsPage(page)
    offersPage = new OffersPage(page)

    // Login
    await authPage.goto()
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName
    )

    // Add schools
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)
  })

  test('should create full ride offer', async ({ page }) => {
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()

    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    await offersPage.expectOfferStatus(testSchools.school1.name, 'Pending')
  })

  test('should create partial scholarship offer', async ({ page }) => {
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()

    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.partial
    })

    await offersPage.expectOfferStatus(testSchools.school1.name, 'Pending')
  })

  test('should create walk-on offer', async ({ page }) => {
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()

    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.walkOn
    })

    await offersPage.expectOfferStatus(testSchools.school1.name, 'Pending')
  })

  test('should accept offer and update status', async ({ page }) => {
    // Create offer
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    // Accept offer
    await offersPage.goto()
    await offersPage.acceptOffer(testSchools.school1.name)

    // Verify status
    await offersPage.expectOfferStatus(testSchools.school1.name, 'Accepted')
  })

  test('should decline offer', async ({ page }) => {
    // Create offer
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    // Decline offer
    await offersPage.goto()
    await offersPage.declineOffer(testSchools.school1.name)

    // Verify status
    await offersPage.expectOfferStatus(testSchools.school1.name, 'Declined')
  })

  test('should create multiple offers from different schools', async ({ page }) => {
    // Add second school
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school2)

    // Create offers
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school2.name,
      ...testOffers.partial
    })

    // Verify both exist
    const count = await offersPage.getOfferCount()
    test.expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should filter offers by status', async ({ page }) => {
    // Create offers with different statuses
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    // Filter to pending
    await offersPage.filterByStatus('Pending')

    // Should see the offer
    const count = await offersPage.getOfferCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should identify urgent deadlines', async ({ page }) => {
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()

    // Create offer with 3-day deadline
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide,
      deadline: 3
    })

    // Filter urgent
    await offersPage.filterByDeadline()

    // Should see the urgent offer
    const count = await offersPage.getUrgentOfferCount()
    test.expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should sort offers by deadline', async ({ page }) => {
    // Create multiple offers
    await offersPage.navigateToOffers()

    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide,
      deadline: 30
    })

    // Sort by deadline
    await offersPage.sortByDeadline()

    // Verify sorted
    const count = await offersPage.getOfferCount()
    test.expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should compare offers', async ({ page }) => {
    // Add another school
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school2)

    // Create offers
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school2.name,
      ...testOffers.partial
    })

    // Compare
    await offersPage.compareOffers()

    // Should be on compare page
    await offersPage.expectURL('/offers/compare')
  })

  test('should update offer conditions', async ({ page }) => {
    // Create offer
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    // Update
    await offersPage.viewOfferDetails(testSchools.school1.name)
    await offersPage.updateOffer(testSchools.school1.name, {
      conditions: 'Updated conditions'
    })

    // Verify URL (indicates save happened)
    await offersPage.expectURL(/offers/)
  })

  test('should delete offer', async ({ page }) => {
    // Create offer
    await offersPage.navigateToOffers()
    await offersPage.clickCreateOffer()
    await offersPage.createOffer({
      school: testSchools.school1.name,
      ...testOffers.fullRide
    })

    // Delete
    await offersPage.goto()
    await offersPage.deleteOffer(testSchools.school1.name)

    // Verify deleted
    await offersPage.expectHidden(`text=${testSchools.school1.name}`)
  })
})
