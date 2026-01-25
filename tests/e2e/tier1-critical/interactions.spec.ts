import { test, expect } from "@playwright/test";

// User Story 5.1: Parent Logs Interactions
// Test comprehensive interaction logging workflows for parents
test.describe("User Story 5.1: Parent Logs Interactions", () => {
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Login as parent user (using test credentials)
    // Assuming there's an auth flow
    await page.fill('input[type="email"]', "test.parent@example.com");
    await page.fill('input[type="password"]', "TestPassword123");
    await page.click('button:has-text("Login")');

    // Wait for dashboard to load
    await page.waitForURL("**/dashboard");

    // Navigate to a school to access interactions
    await page.goto("/schools");
    await page.click("a:first-child"); // Click first school
    await page.waitForURL("**/schools/**");
    schoolId = page.url().split("/").pop() || "";

    // Navigate to interactions tab
    await page.click('a:has-text("Interactions")');
    await page.waitForURL("**/interactions");
  });

  // Scenario 1: Parent logs an email interaction
  test("Scenario 1: Parent logs an email interaction", async ({ page }) => {
    // Click "Log Interaction" button
    await page.click('button:has-text("Log Interaction")');

    // Verify form appears
    await expect(page.locator('form')).toBeVisible();

    // Select type: Email
    await page.selectOption('select[id="type"]', "email");

    // Select direction: Outbound
    await page.selectOption('select[id="direction"]', "outbound");

    // Fill content
    await page.fill(
      'textarea[id="content"]',
      "Sent highlight video and expressed interest in the program"
    );

    // Set date/time
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T14:30`);

    // Submit form
    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Verify success
    await expect(page.locator("text=Email")).toBeVisible();
    await expect(page.locator("text=Outbound")).toBeVisible();
    await expect(
      page.locator(
        "text=Sent highlight video and expressed interest in the program"
      )
    ).toBeVisible();
  });

  // Scenario 2: Parent logs a phone call interaction
  test("Scenario 2: Parent logs a phone call interaction", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    // Select type: Phone Call
    await page.selectOption('select[id="type"]', "phone_call");

    // Select direction: Inbound
    await page.selectOption('select[id="direction"]', "inbound");

    // Fill content
    await page.fill(
      'textarea[id="content"]',
      "Coach called to discuss scholarship opportunities and academic requirements"
    );

    // Set date
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T10:00`);

    // Set sentiment
    await page.selectOption('select[id="sentiment"]', "very_positive");

    // Submit
    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Verify phone call appears in timeline
    await expect(page.locator("text=Phone Call")).toBeVisible();
    await expect(page.locator("text=Inbound")).toBeVisible();
    await expect(page.locator("text=Very Positive")).toBeVisible();
  });

  // Scenario 3: Parent logs a camp attendance
  test("Scenario 3: Parent logs a camp attendance", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    // Select type: Camp
    await page.selectOption('select[id="type"]', "camp");

    // Select direction
    await page.selectOption('select[id="direction"]', "inbound");

    // Fill content
    await page.fill(
      'textarea[id="content"]',
      "Great coaching at camp. Athlete received individual instruction from head coach. Positive feedback on mechanics."
    );

    // Set date
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T09:00`);

    // Submit
    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Verify camp interaction appears
    await expect(page.locator("text=Camp")).toBeVisible();
  });

  // Scenario 4: Parent sets a follow-up reminder during logging
  test("Scenario 4: Parent sets a follow-up reminder during logging", async ({
    page,
  }) => {
    await page.click('button:has-text("Log Interaction")');

    // Fill basic interaction
    await page.selectOption('select[id="type"]', "email");
    await page.selectOption('select[id="direction"]', "outbound");
    await page.fill('textarea[id="content"]', "Sent additional highlights video");

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T15:00`);

    // Enable reminder
    await page.check('input[id="reminder-enabled"]');

    // Set reminder date (2 weeks from now)
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 14);
    const reminderDateStr = reminderDate.toISOString().split("T")[0];
    await page.fill('input[id="reminder-date"]', reminderDateStr);

    // Select reminder type
    await page.selectOption('select[id="reminder-type"]', "email");

    // Submit
    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Verify interaction is logged
    await expect(page.locator("text=Email")).toBeVisible();

    // Navigate to reminders page to verify reminder was created
    // (This would require navigating to a reminders page)
    // For now, we verify the interaction was logged successfully
  });

  // Scenario 5: Quick interaction logging after an event
  test("Scenario 5: Quick interaction logging after an event", async ({
    page,
  }) => {
    // Navigate to events
    await page.goto("/events");

    // Find an upcoming event
    const eventCard = page.locator("a").first();
    await eventCard.click();
    await page.waitForURL("**/events/**");

    // Click "Mark as Attended" button
    const markAttendedBtn = page.locator(
      'button:has-text("Mark Attended"), button:has-text("✓ Mark Attended")'
    );
    await markAttendedBtn.click();

    // Verify quick log modal appears
    const modal = page.locator("text=Did you have any coaching interactions");
    await expect(modal).toBeVisible();

    // Fill quick form
    await page.selectOption('select', "in_person_visit", { force: true });
    await page.fill(
      'textarea[placeholder*="discussed"]',
      "Great conversation about my stats and recruiting timeline"
    );

    // Submit quick log
    await page.click('button:has-text("Log Interaction")');

    // Verify success
    await expect(modal).not.toBeVisible();
  });

  // Acceptance Criteria Tests
  test("Acceptance: Interaction logged in under 1 minute", async ({ page }) => {
    const startTime = Date.now();

    // Log a complete interaction
    await page.click('button:has-text("Log Interaction")');
    await page.selectOption('select[id="type"]', "email");
    await page.selectOption('select[id="direction"]', "outbound");
    await page.fill('textarea[id="content"]', "Quick test interaction");

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T14:00`);

    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Wait for success
    await expect(page.locator("text=Email")).toBeVisible();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    expect(duration).toBeLessThan(60);
  });

  test("Acceptance: All interaction types available", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    const typeSelect = page.locator('select[id="type"]');

    const expectedTypes = [
      "Email",
      "Text Message",
      "Phone Call",
      "In-Person Visit",
      "Virtual Meeting",
      "Camp",
      "Showcase",
      "Game",
      "Unofficial Visit",
      "Official Visit",
      "Other",
    ];

    for (const type of expectedTypes) {
      // Check if option exists in select
      const option = typeSelect.locator(`option:has-text("${type}")`);
      await expect(option).toBeVisible();
    }
  });

  test("Acceptance: Can specify interaction direction", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    const directionSelect = page.locator('select[id="direction"]');

    // Check both options available
    await expect(directionSelect.locator('option:has-text("Outbound")')).toBeVisible();
    await expect(directionSelect.locator('option:has-text("Inbound")')).toBeVisible();

    // Test switching between directions
    await page.selectOption('select[id="direction"]', "outbound");
    await expect(directionSelect).toHaveValue("outbound");

    await page.selectOption('select[id="direction"]', "inbound");
    await expect(directionSelect).toHaveValue("inbound");
  });

  test("Acceptance: Can specify sentiment level", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    const sentimentSelect = page.locator('select[id="sentiment"]');

    const sentimentLevels = [
      "Very Positive",
      "Positive",
      "Neutral",
      "Negative",
    ];

    for (const level of sentimentLevels) {
      const option = sentimentSelect.locator(`option:has-text("${level}")`);
      await expect(option).toBeVisible();
    }
  });

  test("Acceptance: Interactions are timestamped with date and time", async ({
    page,
  }) => {
    await page.click('button:has-text("Log Interaction")');

    // Fill required fields
    await page.selectOption('select[id="type"]', "email");
    await page.selectOption('select[id="direction"]', "outbound");
    await page.fill('textarea[id="content"]', "Test timestamp interaction");

    // Set specific date and time
    const specificDateTime = "2024-02-15T14:30";
    await page.fill('input[id="occurred_at"]', specificDateTime);

    // Submit
    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Verify timestamp appears with both date and time
    // The display should show something like "Feb 15, 2024, 02:30 PM"
    await expect(page.locator("text=/Feb.*2024.*02:30|14:30/")).toBeVisible();
  });

  test("Acceptance: Can optionally attach files", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    // Verify file input exists
    const fileInput = page.locator('input[id="attachments"]');
    await expect(fileInput).toBeVisible();

    // Verify helper text about file types
    await expect(
      page.locator("text=/PDF|images|documents|10MB/")
    ).toBeVisible();
  });

  test("Acceptance: Parent user can create interactions", async ({ page }) => {
    // This test verifies the RLS policy change - parents should be able to log
    await page.click('button:has-text("Log Interaction")');

    // Fill and submit form
    await page.selectOption('select[id="type"]', "phone_call");
    await page.selectOption('select[id="direction"]', "inbound");
    await page.fill('textarea[id="content"]', "Parent-logged interaction");

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T11:00`);

    // Submit should succeed without permission errors
    await page.click('button[type="submit"]:has-text("Log Interaction")');

    // Verify interaction appears (no permission error)
    await expect(page.locator("text=Phone Call")).toBeVisible();
    await expect(page.locator("text=Parent-logged interaction")).toBeVisible();
  });

  test("Acceptance: Content field accepts up to 5,000 characters", async ({
    page,
  }) => {
    await page.click('button:has-text("Log Interaction")');

    const contentField = page.locator('textarea[id="content"]');

    // Test empty (should fail required validation)
    await expect(contentField).toHaveAttribute("required");

    // Test with 5000 character content
    const longContent = "a".repeat(5000);
    await contentField.fill(longContent);

    // Should accept without error
    const value = await contentField.inputValue();
    expect(value).toHaveLength(5000);
  });

  test("Acceptance: Form submission shows loading state", async ({ page }) => {
    await page.click('button:has-text("Log Interaction")');

    // Fill form
    await page.selectOption('select[id="type"]', "email");
    await page.selectOption('select[id="direction"]', "outbound");
    await page.fill('textarea[id="content"]', "Loading test");

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurred_at"]', `${today}T12:00`);

    // Submit
    const submitBtn = page.locator('button[type="submit"]:has-text("Log Interaction")');
    await submitBtn.click();

    // Verify loading state appears
    // Button text should change to "Logging..."
    await expect(page.locator('button[type="submit"]:has-text("Logging")')).toBeVisible({
      timeout: 1000,
    });
  });
});
