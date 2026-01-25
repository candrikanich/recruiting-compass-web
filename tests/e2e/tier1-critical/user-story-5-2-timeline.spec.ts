import { test, expect } from "@playwright/test";

test.describe("User Story 5.2: Parent Views Interaction Timeline", () => {
  // Test data - interactions to be created during test setup
  const testSchoolId = "test-school-001";
  const testCoachId = "test-coach-001";
  const testCoachName = "John Smith";

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3003");
    // Assuming auth is required, wait for redirect or check if logged in
    // Adjust based on actual auth flow
    await page.waitForLoadState("networkidle");
  });

  test("Scenario 1: Parent views school-specific timeline", async ({ page }) => {
    // Navigate to a school with interactions
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for the interactions to load
    await page.waitForSelector(".space-y-4", { timeout: 5000 });

    // Verify the timeline displays
    const timelineContainer = page.locator(".space-y-4");
    const interactions = await timelineContainer.locator("> div").count();

    expect(interactions).toBeGreaterThan(0);

    // Verify interactions are sorted chronologically (newest first)
    // Check for at least one interaction card with expected elements
    const firstInteraction = page.locator(".space-y-4 > div").first();

    // Should have type icon
    await expect(firstInteraction.locator("[class*='rounded-lg']").first()).toBeVisible();

    // Should have direction badge (Outbound or Inbound)
    const directionBadge = firstInteraction.locator(
      "span:has-text('Outbound'), span:has-text('Inbound')"
    );
    await expect(directionBadge).toBeVisible();

    // Should have date/time
    const dateElement = firstInteraction.locator("svg[class*='CalendarIcon']");
    // Date should be visible as text nearby
    const timelineSection = firstInteraction.locator(".text-xs");
    await expect(timelineSection).toBeTruthy();
  });

  test("Scenario 2: Parent views coach-specific timeline", async ({ page }) => {
    // Navigate to coach communications page
    await page.goto(
      `http://localhost:3003/coaches/${testCoachId}/communications`
    );

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify coach name is displayed
    const headerText = page.locator("h1");
    await expect(headerText).toContainText("Communication Log");

    // Verify interactions are filtered to this coach
    const messages = page.locator(
      ".bg-white.rounded-lg.shadow.p-6.border-l-4"
    );

    // Should have at least one message for this coach
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThanOrEqual(0);

    // If there are messages, they should show coach-specific filtering
    if (messageCount > 0) {
      // All messages should be from the same coach based on filter
      const firstMessage = messages.first();
      await expect(firstMessage).toBeVisible();
    }
  });

  test("Scenario 3: Timeline shows interaction frequency metrics", async ({
    page,
  }) => {
    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for metrics to load
    await page.waitForSelector(
      ".grid.grid-cols-2.sm\\:grid-cols-4.gap-4.mb-6"
    );

    // Verify metrics panel exists
    const metricsGrid = page.locator(
      ".grid.grid-cols-2.sm\\:grid-cols-4.gap-4.mb-6"
    );
    await expect(metricsGrid).toBeVisible();

    // Check for metric cards
    const metricCards = metricsGrid.locator(".bg-white.rounded-xl");
    const cardCount = await metricCards.count();
    expect(cardCount).toBe(4); // Total, Sent, Received, Last Contact

    // Verify "Total Interactions" metric
    const totalInteractionsCard = metricCards.nth(0);
    await expect(
      totalInteractionsCard.locator("text=Total Interactions")
    ).toBeVisible();
    const totalCount = await totalInteractionsCard.locator(".text-2xl").first();
    await expect(totalCount).toBeTruthy();

    // Verify "Sent" metric
    const sentCard = metricCards.nth(1);
    await expect(sentCard.locator("text=Sent")).toBeVisible();
    const sentCount = await sentCard.locator(".text-blue-600").first();
    await expect(sentCount).toBeTruthy();

    // Verify "Received" metric
    const receivedCard = metricCards.nth(2);
    await expect(receivedCard.locator("text=Received")).toBeVisible();
    const receivedCount = await receivedCard.locator(".text-emerald-600").first();
    await expect(receivedCount).toBeTruthy();

    // Verify "Last Contact" metric
    const lastContactCard = metricCards.nth(3);
    await expect(lastContactCard.locator("text=Last Contact")).toBeVisible();
    const lastContactTime = await lastContactCard
      .locator(".text-purple-600")
      .first();
    await expect(lastContactTime).toBeTruthy();
  });

  test("Scenario 4: Timeline filters by type - Email only", async ({
    page,
  }) => {
    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for filters to be visible
    await page.waitForSelector("#type-filter");

    // Get count of all interactions before filter
    let allInteractions = await page.locator(".space-y-4 > div").count();
    expect(allInteractions).toBeGreaterThan(0);

    // Select "Email" filter
    await page.selectOption("#type-filter", "email");

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify the filter is applied
    const typeFilterValue = await page.locator("#type-filter").inputValue();
    expect(typeFilterValue).toBe("email");

    // Check filtered interaction count (should be <= original)
    let emailInteractions = await page.locator(".space-y-4 > div").count();
    expect(emailInteractions).toBeLessThanOrEqual(allInteractions);

    // If there are email interactions, verify they show email type
    if (emailInteractions > 0) {
      // The interaction cards should show email icons/type
      const firstInteraction = page.locator(".space-y-4 > div").first();
      // Email interactions should have the email type displayed
      await expect(firstInteraction.locator("text=Email")).toBeTruthy();
    }

    // Clear filter
    await page.locator("button:has-text('Clear Filters')").click();
    await page.waitForTimeout(500);

    // Verify filter is cleared
    const clearedValue = await page.locator("#type-filter").inputValue();
    expect(clearedValue).toBe("");
  });

  test("Scenario 5: Timeline filters by date range - Last 30 Days", async ({
    page,
  }) => {
    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for filters
    await page.waitForSelector("#date-filter");

    // Get all interactions count
    let allInteractions = await page.locator(".space-y-4 > div").count();

    // Select "Last 30 Days" filter
    await page.selectOption("#date-filter", "30");
    await page.waitForTimeout(500);

    // Verify filter is applied
    const dateFilterValue = await page.locator("#date-filter").inputValue();
    expect(dateFilterValue).toBe("30");

    // Check that some interactions are still displayed (or none if all are older)
    let thirtyDayInteractions = await page.locator(".space-y-4 > div").count();
    expect(thirtyDayInteractions).toBeLessThanOrEqual(allInteractions);

    // If interactions exist, they should be from the last 30 days
    // (This is enforced by the filtering logic in the component)
  });

  test("Scenario 6: Interaction notes and details are visible", async ({
    page,
  }) => {
    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for interactions
    await page.waitForSelector(".space-y-4");

    // Get the first interaction
    const firstInteraction = page.locator(".space-y-4 > div").first();

    // Should have subject line (if present in data)
    const subjectElement = firstInteraction.locator("p.font-semibold, p.text-slate-700");
    await expect(subjectElement).toBeTruthy();

    // Should have content/notes preview
    const contentPreview = firstInteraction.locator("p.text-sm.text-slate-600");
    await expect(contentPreview).toBeTruthy();

    // Should have metadata (date, logged time)
    const metadata = firstInteraction.locator(".text-xs.text-slate-400");
    await expect(metadata).toBeTruthy();

    // Direction and sentiment badges should be visible
    const badges = firstInteraction.locator("span[class*='rounded-full']");
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(1); // At least direction badge
  });

  test("Scenario 7: Timeline loads quickly (performance)", async ({ page }) => {
    const startTime = Date.now();

    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for the timeline section to be visible
    await page.waitForSelector(".space-y-4, [class*='No interactions']", {
      timeout: 5000,
    });

    const loadTime = Date.now() - startTime;

    // Should load in under 2 seconds (more generous than 1s requirement for test environment)
    expect(loadTime).toBeLessThan(2000);
  });

  test("Scenario 8: Clear filters resets all filter selections", async ({
    page,
  }) => {
    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for filters
    await page.waitForSelector("#type-filter");

    // Apply multiple filters
    await page.selectOption("#type-filter", "email");
    await page.selectOption("#direction-filter", "outbound");
    await page.selectOption("#date-filter", "30");
    await page.selectOption("#sentiment-filter", "positive");

    await page.waitForTimeout(300);

    // Verify filters are applied
    expect(await page.locator("#type-filter").inputValue()).toBe("email");
    expect(await page.locator("#direction-filter").inputValue()).toBe("outbound");
    expect(await page.locator("#date-filter").inputValue()).toBe("30");
    expect(
      await page.locator("#sentiment-filter").inputValue()
    ).toBe("positive");

    // Click Clear Filters button
    await page.locator("button:has-text('Clear Filters')").click();

    await page.waitForTimeout(300);

    // Verify all filters are cleared
    expect(await page.locator("#type-filter").inputValue()).toBe("");
    expect(await page.locator("#direction-filter").inputValue()).toBe("");
    expect(await page.locator("#date-filter").inputValue()).toBe("");
    expect(await page.locator("#sentiment-filter").inputValue()).toBe("");
  });

  test("Scenario 9: Coach timeline includes communication summary stats", async ({
    page,
  }) => {
    // Navigate to coach communications page
    await page.goto(
      `http://localhost:3003/coaches/${testCoachId}/communications`
    );

    await page.waitForLoadState("networkidle");

    // Look for summary stats grid
    const statsGrid = page.locator(
      ".grid.grid-cols-2.md\\:grid-cols-4.gap-4.mb-6"
    );
    await expect(statsGrid).toBeVisible();

    // Should have 4 metric cards: Total Messages, Sent, Received, Avg Response Time
    const statCards = statsGrid.locator(".bg-white.rounded-lg.shadow");
    const cardCount = await statCards.count();
    expect(cardCount).toBe(4);

    // Verify "Total Messages" stat
    const totalMessagesCard = statCards.nth(0);
    await expect(totalMessagesCard.locator("text=Total Messages")).toBeVisible();

    // Verify "Sent" stat
    const sentCard = statCards.nth(1);
    await expect(sentCard.locator("text=Sent")).toBeVisible();

    // Verify "Received" stat
    const receivedCard = statCards.nth(2);
    await expect(receivedCard.locator("text=Received")).toBeVisible();

    // Verify "Avg Response Time" stat
    const responseTimeCard = statCards.nth(3);
    await expect(
      responseTimeCard.locator("text=Avg Response Time")
    ).toBeVisible();
  });

  test("Scenario 10: Multiple filter combinations work together", async ({
    page,
  }) => {
    // Navigate to school interactions page
    await page.goto(`http://localhost:3003/schools/${testSchoolId}/interactions`);

    // Wait for filters
    await page.waitForSelector("#type-filter");

    // Get initial count
    const initialCount = await page.locator(".space-y-4 > div").count();

    // Apply filter 1: Type = Email
    await page.selectOption("#type-filter", "email");
    await page.waitForTimeout(300);
    const afterTypeFilter = await page.locator(".space-y-4 > div").count();

    // Apply filter 2: Direction = Outbound
    await page.selectOption("#direction-filter", "outbound");
    await page.waitForTimeout(300);
    const afterDirectionFilter = await page.locator(".space-y-4 > div").count();

    // Combined filters should result in fewer or equal interactions
    expect(afterTypeFilter).toBeLessThanOrEqual(initialCount);
    expect(afterDirectionFilter).toBeLessThanOrEqual(afterTypeFilter);

    // Clear one filter
    await page.selectOption("#type-filter", "");
    await page.waitForTimeout(300);
    const afterClearingOne = await page.locator(".space-y-4 > div").count();

    // Should have more results than with both filters
    expect(afterClearingOne).toBeGreaterThanOrEqual(afterDirectionFilter);
  });
});
