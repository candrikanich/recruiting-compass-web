import { test } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { PerformancePage } from '../pages/PerformancePage'
import { testUsers, testPerformanceMetrics } from '../fixtures/testData'

test.describe('Tier 2: Performance Tracking & Analytics', () => {
  let authPage: AuthPage
  let performancePage: PerformancePage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    performancePage = new PerformancePage(page)

    await authPage.goto()
    await authPage.signup(testUsers.newUser.email, testUsers.newUser.password, testUsers.newUser.displayName)
  })

  test('should log performance metrics', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.expectMetricLogged(testPerformanceMetrics.metric1.type, testPerformanceMetrics.metric1.value.toString())
  })

  test('should view performance trends', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.clickAddMetric()
    await performancePage.logMetric({ ...testPerformanceMetrics.metric1, value: 93 })

    const trend = await performancePage.getTrend('Velocity')
    test.expect(trend.length).toBeGreaterThan(0)
  })

  test('should display peak velocity', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    const peak = await performancePage.getPeakVelocity()
    test.expect(peak.length).toBeGreaterThan(0)
  })

  test('should calculate average velocity', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    const avg = await performancePage.getAverageVelocity()
    test.expect(avg.length).toBeGreaterThan(0)
  })

  test('should filter metrics by type', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.filterByMetricType('Velocity')
    const count = await performancePage.getMetricCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should filter metrics by date range', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    const today = new Date().toISOString().split('T')[0]
    await performancePage.filterByDateRange(today, today)

    const count = await performancePage.getMetricCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should compare performance periods', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.comparePerformance()
    await performancePage.expectURL(/performance\/compare/)
  })

  test('should view analytics dashboard', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.viewAnalyticsDashboard()
    await performancePage.expectVisible('[data-testid="velocity-chart"]')
  })

  test('should export performance data', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.exportPerformanceData('CSV')
  })

  test('should log multiple metric types', async () => {
    await performancePage.navigateToPerformance()

    for (const metric of [testPerformanceMetrics.metric1, testPerformanceMetrics.metric2, testPerformanceMetrics.metric3]) {
      await performancePage.clickAddMetric()
      await performancePage.logMetric(metric)
    }

    const count = await performancePage.getMetricCount()
    test.expect(count).toBeGreaterThanOrEqual(3)
  })

  test('should delete performance metric', async () => {
    await performancePage.navigateToPerformance()
    await performancePage.clickAddMetric()
    await performancePage.logMetric(testPerformanceMetrics.metric1)

    await performancePage.deleteMetric('Velocity')
  })
})
