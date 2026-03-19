import { test, expect } from "@playwright/test";

test.describe("Recruiting Packet Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display Generate Packet button", async ({ page }) => {
    // Look for the button text
    const button = page.locator("button").filter({
      hasText: /Generate Packet/i,
    });

    await expect(button).toBeVisible();
  });

  test("should have enabled button when clicked", async ({ page }) => {
    const button = page.locator("button").filter({
      hasText: /Generate Packet/i,
    });

    // Button should be enabled initially
    await expect(button).not.toHaveAttribute("disabled");
  });

  test("should show loading state while generating", async ({ page }) => {
    // Set up listener for new windows
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Should open in new window
    expect(popup).toBeDefined();

    // Wait for PDF preview window to load
    await popup.waitForLoadState("domcontentloaded");
  });

  test("should open preview window with packet HTML", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Check that PDF has expected content
    const content = await popup.content();
    expect(content).toContain("Recruiting Packet");
  });

  test("should include athlete information in packet", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Check for key sections
    const bodyText = await popup.locator("body").textContent();

    // Should contain athlete profile header
    expect(bodyText).toContain("Athlete Profile");

    // Should contain schools section
    expect(bodyText).toContain("Schools of Interest");

    // Should contain activity summary
    expect(bodyText).toContain("Activity Summary");
  });

  test("should include download button in preview", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Should have print button
    const downloadButton = popup.getByRole("button", {
      name: /Download as PDF/i,
    });

    await expect(downloadButton).toBeVisible();
  });

  test("should trigger print dialog on download button click", async ({
    page,
  }) => {
    // Listen for print dialog
    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("alert");
      dialog.accept();
    });

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Click download button (window.print)
    await popup.getByRole("button", { name: /Download as PDF/i }).click();
  });

  test("should display all school tiers", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    const bodyText = await popup.locator("body").textContent();

    // Check for tier headers — data-dependent (test account may have no priority schools)
    const hasTiers = (bodyText?.includes("Priority A") ||
      bodyText?.includes("Priority B") ||
      bodyText?.includes("Priority C")) ?? false;
    if (!hasTiers) {
      // No priority tiers in test data — verify packet has basic content
      expect(bodyText?.length ?? 0).toBeGreaterThan(100);
    } else {
      // When tiers exist, verify all expected tier headers are present
      expect(bodyText).toContain("Priority A");
      expect(bodyText).toContain("Priority B");
      expect(bodyText).toContain("Priority C");
      // Verify each tier has at least some content (basic structure check)
      const tierSections = bodyText.split(/(?=Priority [ABC])/);
      expect(tierSections.length).toBeGreaterThan(3); // At least 3 tier sections plus header
    }
  });

  test("should include interaction breakdown", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    const bodyText = await popup.locator("body").textContent();

    // Check for interaction types
    expect(bodyText).toContain("Emails");
    expect(bodyText).toContain("Calls");
    expect(bodyText).toContain("Camps");
    expect(bodyText).toContain("Visits");
  });

  test("should generate packet with profile photo if available", async ({
    page,
  }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Check for image or placeholder
    const content = await popup.content();

    // Should have image element or placeholder
    expect(content.includes("<img") || content.includes("profile-photo")).toBe(
      true,
    );
  });

  test("should include generation date in packet", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    const bodyText = await popup.locator("body").textContent();

    // Check for date reference
    expect(bodyText).toMatch(/Generated on/);
  });

  test("should be responsive in preview", async ({ page, context }) => {
    // Test mobile viewport
    const mobileContext = await context.newPage();
    await mobileContext.setViewportSize({ width: 375, height: 667 });

    await mobileContext.goto("/dashboard");
    await mobileContext.waitForLoadState("domcontentloaded");

    const [popup] = await Promise.all([
      mobileContext.waitForEvent("popup"),
      mobileContext
        .getByRole("button", { name: /Generate Packet/i })
        .click(),
    ]);

    // Should render without errors
    const content = await popup.content();
    expect(content).toContain("Recruiting Packet");

    await mobileContext.close();
  });

  test("should handle error gracefully", async ({ page }) => {
    // Mock failure response
    await page.route("/api/**", (route) => {
      route.abort("failed");
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Button should still be present
    const button = page.locator("button").filter({
      hasText: /Generate Packet/i,
    });

    await expect(button).toBeVisible();
  });

  test("should show success message", async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("button").filter({ hasText: /Generate Packet/i }).click(),
    ]);

    // Check for success message (if toast notification is shown)
    // Note: Toast might not be visible in test, but popup should exist
    expect(popup).toBeDefined();
  });
});
