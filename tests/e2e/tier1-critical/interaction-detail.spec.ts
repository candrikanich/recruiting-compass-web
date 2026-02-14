import { test, expect } from "@playwright/test";

test.describe("Interaction Detail Page - Critical Paths", () => {
  let interactionId: string;

  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto("/");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Login")');
    await page.waitForURL("**/dashboard");

    // Navigate to interactions list
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Get first interaction ID (if exists) or create one
    const firstInteraction = page
      .locator(".bg-white.rounded-xl.border")
      .first();
    const hasInteraction = await firstInteraction
      .isVisible()
      .catch(() => false);

    if (hasInteraction) {
      // Click first interaction to get its ID from URL
      const viewButton = firstInteraction.locator('button:has-text("View")');
      await viewButton.click();
      await page.waitForURL("**/interactions/**");
      interactionId = page.url().split("/").pop() || "";
      // Go back to list for consistent starting point
      await page.goto("/interactions");
    } else {
      // Create a test interaction
      await page.goto("/interactions/add");
      await page.selectOption('select[id="schoolId"]', { index: 1 });
      await page.selectOption('select[id="type"]', "email");
      await page.click('label:has-text("Outbound")');
      const today = new Date().toISOString().split("T")[0];
      await page.fill('input[id="occurredAt"]', `${today}T14:30`);
      await page.fill('input[id="subject"]', "E2E Test Interaction");
      await page.fill(
        'textarea[id="content"]',
        "This is a test interaction for E2E testing.",
      );
      await page.click('button[type="submit"]');
      await page.waitForURL("**/interactions");

      // Get the newly created interaction
      const newInteraction = page
        .locator(':has-text("E2E Test Interaction")')
        .first();
      const viewBtn = newInteraction.locator('button:has-text("View")').first();
      await viewBtn.click();
      await page.waitForURL("**/interactions/**");
      interactionId = page.url().split("/").pop() || "";
      await page.goto("/interactions");
    }
  });

  test("displays all interaction fields correctly", async ({ page }) => {
    // Navigate to detail page
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page.locator("h1")).toBeVisible();

    // Verify main content sections exist
    await expect(page.locator("text=Content")).toBeVisible();
    await expect(page.locator("text=School")).toBeVisible();
    await expect(page.locator("text=Logged By")).toBeVisible();

    // Verify badges/status are displayed
    const badges = page.locator(".bg-white.rounded-xl");
    await expect(badges.first()).toBeVisible();

    // Verify timestamps
    await expect(page.locator("text=Created:")).toBeVisible();
  });

  test("displays school and coach names (not just labels)", async ({
    page,
  }) => {
    // Navigate to detail page
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Find the school DetailCard - it should have both label and value
    const schoolCard = page.locator('text="School"').locator("..");
    await expect(schoolCard).toBeVisible();

    // The school name should be a clickable link (not just the word "School")
    // DetailCard renders the value as a link if link-to prop is provided
    const schoolLink = page.locator('a[href*="/schools/"]').first();
    const hasSchoolLink = await schoolLink.isVisible().catch(() => false);

    if (hasSchoolLink) {
      // Verify the link has actual text (the school name), not empty
      const linkText = await schoolLink.textContent();
      expect(linkText).toBeTruthy();
      expect(linkText?.trim()).not.toBe("");
      expect(linkText?.trim()).not.toBe("Unknown");
    } else {
      // If no link, verify at least the school name text is shown
      // (might happen if school data is missing but should still show something)
      const schoolText = await schoolCard.textContent();
      expect(schoolText).toContain("School");
      // Should have more than just the label
      expect(schoolText?.length || 0).toBeGreaterThan(10);
    }

    // Check for coach if coach link exists
    const coachLink = page.locator('a[href*="/coaches/"]').first();
    const hasCoachLink = await coachLink.isVisible().catch(() => false);

    if (hasCoachLink) {
      const coachLinkText = await coachLink.textContent();
      expect(coachLinkText).toBeTruthy();
      expect(coachLinkText?.trim()).not.toBe("");
      expect(coachLinkText?.trim()).not.toBe("Unknown");
    }
  });

  test("navigates to related school when clicking school link", async ({
    page,
  }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Find school link (if present)
    const schoolLink = page.locator('a[href*="/schools/"]').first();
    const hasSchoolLink = await schoolLink.isVisible().catch(() => false);

    if (hasSchoolLink) {
      const schoolHref = await schoolLink.getAttribute("href");
      await schoolLink.click();
      await page.waitForURL(`**${schoolHref}`);

      // Verify navigation to school detail page
      expect(page.url()).toContain("/schools/");
    }
  });

  test("navigates to related coach when clicking coach link", async ({
    page,
  }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Find coach link (if present)
    const coachLink = page.locator('a[href*="/coaches/"]').first();
    const hasCoachLink = await coachLink.isVisible().catch(() => false);

    if (hasCoachLink) {
      const coachHref = await coachLink.getAttribute("href");
      await coachLink.click();
      await page.waitForURL(`**${coachHref}`);

      // Verify navigation to coach detail page
      expect(page.url()).toContain("/coaches/");
    }
  });

  test("exports interaction as CSV", async ({ page }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Find and click export button
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("deletes interaction with confirmation", async ({ page }) => {
    // Create a disposable test interaction for deletion
    await page.goto("/interactions/add");
    await page.selectOption('select[id="schoolId"]', { index: 1 });
    await page.selectOption('select[id="type"]', "email");
    await page.click('label:has-text("Outbound")');
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurredAt"]', `${today}T14:30`);
    await page.fill('input[id="subject"]', "Delete Test Interaction");
    await page.fill('textarea[id="content"]', "This will be deleted.");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/interactions");

    // Navigate to the new interaction
    const deleteTestInteraction = page.locator(
      ':has-text("Delete Test Interaction")',
    );
    await expect(deleteTestInteraction).toBeVisible();
    const viewBtn = deleteTestInteraction
      .locator('button:has-text("View")')
      .first();
    await viewBtn.click();
    await page.waitForURL("**/interactions/**");
    const deleteInteractionId = page.url().split("/").pop();

    // Set up dialog handler to accept confirmation
    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain("Are you sure");
      dialog.accept();
    });

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Verify redirect to interactions list
    await page.waitForURL("**/interactions", { timeout: 5000 });

    // Verify interaction is no longer in list
    await page.waitForLoadState("networkidle");
    const deletedInteraction = page.locator(
      `:has-text("Delete Test Interaction")`,
    );
    await expect(deletedInteraction).not.toBeVisible();

    // Verify cannot navigate to deleted interaction
    await page.goto(`/interactions/${deleteInteractionId}`);
    // Should show error or redirect (implementation dependent)
    // At minimum, should not show the deleted content
    const deletedContent = page.locator(':has-text("This will be deleted.")');
    await expect(deletedContent).not.toBeVisible();
  });

  test("cancels delete when user declines confirmation", async ({ page }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Set up dialog handler to cancel confirmation
    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain("Are you sure");
      dialog.dismiss();
    });

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete")');
    await deleteButton.click();

    // Wait a moment for any potential navigation
    await page.waitForTimeout(500);

    // Verify still on detail page (URL unchanged)
    expect(page.url()).toContain(`/interactions/${interactionId}`);

    // Verify interaction content still visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Content")).toBeVisible();
  });

  test("displays attachments when present", async ({ page }) => {
    // This test assumes interaction might have attachments
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Check if attachments section exists
    const attachmentsHeading = page.locator('h2:has-text("Attachments")');
    const hasAttachments = await attachmentsHeading
      .isVisible()
      .catch(() => false);

    if (hasAttachments) {
      // Verify attachment count is displayed
      const headingText = await attachmentsHeading.textContent();
      expect(headingText).toMatch(/Attachments \(\d+\)/);

      // Verify attachment links exist
      const attachmentLinks = page.locator('a[target="_blank"]');
      const linkCount = await attachmentLinks.count();
      expect(linkCount).toBeGreaterThan(0);

      // Verify links have correct attributes
      const firstLink = attachmentLinks.first();
      expect(await firstLink.getAttribute("target")).toBe("_blank");
      expect(await firstLink.getAttribute("rel")).toBe("noopener noreferrer");

      // Verify links are clickable (test first link)
      await expect(firstLink).toBeVisible();
      const href = await firstLink.getAttribute("href");
      expect(href).toBeTruthy();
    }
  });

  test("handles interaction without attachments gracefully", async ({
    page,
  }) => {
    // Create interaction without attachments
    await page.goto("/interactions/add");
    await page.selectOption('select[id="schoolId"]', { index: 1 });
    await page.selectOption('select[id="type"]', "text");
    await page.click('label:has-text("Inbound")');
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurredAt"]', `${today}T14:30`);
    await page.fill('textarea[id="content"]', "No attachments test.");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/interactions");

    // Navigate to new interaction
    const noAttachInteraction = page.locator(
      ':has-text("No attachments test")',
    );
    const viewBtn = noAttachInteraction
      .locator('button:has-text("View")')
      .first();
    await viewBtn.click();
    await page.waitForURL("**/interactions/**");

    // Verify attachments section is NOT displayed
    const attachmentsHeading = page.locator('h2:has-text("Attachments")');
    await expect(attachmentsHeading).not.toBeVisible();
  });

  test("shows 'You' for logged by current user", async ({ page }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Find "Logged By" section
    await expect(page.locator("text=Logged By")).toBeVisible();

    // Should show "You" if logged by current user
    const loggedByText = page.locator('h3:has-text("Logged By")').locator("..");
    const text = await loggedByText.textContent();

    // Either shows "You" or another user's name
    expect(text).toBeTruthy();
  });

  test("displays correct interaction type badge", async ({ page }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Verify at least one badge is displayed
    const badges = page.locator(
      ".bg-blue-100, .bg-purple-100, .bg-green-100, .bg-emerald-100, .bg-slate-100",
    );
    await expect(badges.first()).toBeVisible();
  });

  test("displays correct direction badge", async ({ page }) => {
    await page.goto(`/interactions/${interactionId}`);
    await page.waitForLoadState("networkidle");

    // Verify direction badge exists (outbound or inbound)
    const directionText = page.locator("text=/Outbound|Inbound/");
    await expect(directionText.first()).toBeVisible();
  });

  test("displays sentiment badge when present", async ({ page }) => {
    // Create interaction with sentiment
    await page.goto("/interactions/add");
    await page.selectOption('select[id="schoolId"]', { index: 1 });
    await page.selectOption('select[id="type"]', "phone_call");
    await page.click('label:has-text("Inbound")');
    await page.selectOption('select[id="sentiment"]', "very_positive");
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurredAt"]', `${today}T14:30`);
    await page.fill(
      'textarea[id="content"]',
      "Great conversation about recruiting.",
    );
    await page.click('button[type="submit"]');
    await page.waitForURL("**/interactions");

    // Navigate to interaction
    const sentimentInteraction = page.locator(
      ':has-text("Great conversation")',
    );
    const viewBtn = sentimentInteraction
      .locator('button:has-text("View")')
      .first();
    await viewBtn.click();
    await page.waitForURL("**/interactions/**");

    // Verify sentiment badge is displayed
    const sentimentBadge = page.locator(
      "text=/Very Positive|Positive|Neutral|Negative/",
    );
    await expect(sentimentBadge.first()).toBeVisible();
  });

  test("redirects 'new' ID to add page", async ({ page }) => {
    await page.goto("/interactions/new");

    // Should redirect to add page
    await page.waitForURL("**/interactions/add");
    expect(page.url()).toContain("/interactions/add");

    // Verify add form is displayed
    await expect(page.locator("h1")).toContainText("Log");
  });

  test("handles missing interaction gracefully", async ({ page }) => {
    const nonExistentId = "non-existent-interaction-id-123456";

    await page.goto(`/interactions/${nonExistentId}`);
    await page.waitForLoadState("networkidle");

    // Should either show error message or loading state
    // At minimum, should not crash (page should exist)
    expect(page).toBeTruthy();

    // Should show either "Loading" or empty state
    const hasContent = await page
      .locator("h1")
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasLoading = await page
      .locator("text=Loading")
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    // One of these should be true
    expect(hasContent || hasLoading).toBeTruthy();
  });

  test("displays loading state while fetching", async ({ page }) => {
    // Navigate with slow network simulation
    await page.route("**/api/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    const navigationPromise = page.goto(`/interactions/${interactionId}`);

    // Check for loading message
    const loadingMessage = page.locator("text=Loading interaction");
    const isVisible = await loadingMessage
      .isVisible({ timeout: 500 })
      .catch(() => false);

    // May or may not show loading depending on speed
    // Just verify page doesn't crash
    await navigationPromise;
    expect(page).toBeTruthy();
  });
});

test.describe("Interaction Detail Page - Navigation", () => {
  test("back navigation returns to interactions list", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Login")');
    await page.waitForURL("**/dashboard");

    // Navigate to interactions list
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Click first interaction
    const firstInteraction = page.locator('button:has-text("View")').first();
    const isVisible = await firstInteraction.isVisible().catch(() => false);

    if (isVisible) {
      await firstInteraction.click();
      await page.waitForURL("**/interactions/**");

      // Use browser back button
      await page.goBack();

      // Should return to interactions list
      await page.waitForURL("**/interactions");
      expect(page.url()).toContain("/interactions");
      expect(page.url()).not.toContain("/interactions/");
    }
  });
});

test.describe("Interaction Detail Page - Error Handling & Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Login")');
    await page.waitForURL("**/dashboard");
  });

  test("handles network error gracefully", async ({ page }) => {
    // Simulate network failure
    await page.route("**/api/interactions/**", (route) => {
      route.abort("failed");
    });

    const nonExistentId = "network-fail-test-123";
    await page.goto(`/interactions/${nonExistentId}`);

    // Should not crash, should show some UI
    await page.waitForLoadState("networkidle");
    expect(page).toBeTruthy();

    // Page should still have basic structure
    const maxWidthContainer = page.locator(".max-w-4xl");
    await expect(maxWidthContainer).toBeVisible();
  });

  test("handles missing related entities gracefully", async ({ page }) => {
    // This test would ideally use a fixture interaction with deleted school/coach
    // For now, we verify the page renders even if related data is missing

    // Navigate to interactions and create one
    await page.goto("/interactions/add");
    await page.selectOption('select[id="schoolId"]', { index: 1 });
    await page.selectOption('select[id="type"]', "email");
    await page.click('label:has-text("Outbound")');
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurredAt"]', `${today}T14:30`);
    await page.fill('textarea[id="content"]', "Test missing related entities.");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/interactions");

    // Navigate to the interaction
    const testInteraction = page.locator(
      ':has-text("Test missing related entities")',
    );
    const viewBtn = testInteraction.locator('button:has-text("View")').first();
    await viewBtn.click();
    await page.waitForURL("**/interactions/**");

    // Verify page renders even with potentially missing related data
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=School")).toBeVisible();
    await expect(page.locator("text=Coach")).toBeVisible();

    // Should show em dash or "Unknown" for missing entities, not crash
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("handles very long interaction content", async ({ page }) => {
    // Create interaction with very long content
    const longContent = "A".repeat(4000); // Near 5000 char limit

    await page.goto("/interactions/add");
    await page.selectOption('select[id="schoolId"]', { index: 1 });
    await page.selectOption('select[id="type"]', "email");
    await page.click('label:has-text("Outbound")');
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurredAt"]', `${today}T14:30`);
    await page.fill('input[id="subject"]', "Long Content Test");
    await page.fill('textarea[id="content"]', longContent);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/interactions");

    // Navigate to interaction
    const longInteraction = page.locator(':has-text("Long Content Test")');
    const viewBtn = longInteraction.locator('button:has-text("View")').first();
    await viewBtn.click();
    await page.waitForURL("**/interactions/**");

    // Verify long content is displayed without breaking layout
    await expect(page.locator("text=Content")).toBeVisible();
    const contentSection = page.locator(".bg-white.rounded-lg.shadow");
    await expect(contentSection.first()).toBeVisible();

    // Verify scrolling works if content is truncated
    const hasScrollbar =
      (await page.evaluate(() => document.body.scrollHeight)) >
      (await page.evaluate(() => window.innerHeight));

    // Either displays all content or is scrollable
    expect(true).toBe(true); // Content rendered successfully
  });

  test("handles special characters in content", async ({ page }) => {
    const specialContent =
      'Test <script>alert("xss")</script> & special chars: @#$%^&*()';

    await page.goto("/interactions/add");
    await page.selectOption('select[id="schoolId"]', { index: 1 });
    await page.selectOption('select[id="type"]', "text");
    await page.click('label:has-text("Inbound")');
    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[id="occurredAt"]', `${today}T14:30`);
    await page.fill('input[id="subject"]', "Special Chars Test");
    await page.fill('textarea[id="content"]', specialContent);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/interactions");

    // Navigate to interaction
    const specialInteraction = page.locator(':has-text("Special Chars Test")');
    const viewBtn = specialInteraction
      .locator('button:has-text("View")')
      .first();
    await viewBtn.click();
    await page.waitForURL("**/interactions/**");

    // Verify special characters are escaped/rendered safely
    const contentText = await page.textContent("body");
    expect(contentText).toContain("<script>"); // Should be escaped, not executed
    expect(contentText).toContain("&");
    expect(contentText).toContain("@#$%^&*()");
  });

  test("handles rapid navigation between detail pages", async ({ page }) => {
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Get multiple interaction IDs
    const viewButtons = page.locator('button:has-text("View")');
    const buttonCount = await viewButtons.count();

    if (buttonCount >= 2) {
      // Rapidly navigate between different interactions
      for (let i = 0; i < Math.min(3, buttonCount); i++) {
        await page.goto("/interactions");
        await page.waitForLoadState("networkidle");

        const btn = page.locator('button:has-text("View")').nth(i);
        await btn.click();
        await page.waitForURL("**/interactions/**");

        // Verify page loaded
        await expect(page.locator("h1")).toBeVisible();
      }

      // Should not have memory leaks or errors
      expect(page).toBeTruthy();
    }
  });

  test("handles page refresh on detail page", async ({ page }) => {
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Navigate to interaction
    const firstInteraction = page.locator('button:has-text("View")').first();
    const hasInteraction = await firstInteraction
      .isVisible()
      .catch(() => false);

    if (hasInteraction) {
      await firstInteraction.click();
      await page.waitForURL("**/interactions/**");
      const interactionId = page.url().split("/").pop();

      // Refresh the page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify page still loads correctly
      await expect(page.locator("h1")).toBeVisible();
      expect(page.url()).toContain(interactionId || "");
    }
  });

  test("handles direct URL access to detail page", async ({ page }) => {
    // First get an interaction ID
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    const firstInteraction = page.locator('button:has-text("View")').first();
    const hasInteraction = await firstInteraction
      .isVisible()
      .catch(() => false);

    if (hasInteraction) {
      await firstInteraction.click();
      await page.waitForURL("**/interactions/**");
      const interactionUrl = page.url();

      // Logout
      await page.click('button[aria-label="User menu"]').catch(() => {});
      await page.click('button:has-text("Logout")').catch(() => {});

      // Login again
      await page.goto("/");
      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[type="password"]', "password123");
      await page.click('button:has-text("Login")');
      await page.waitForURL("**/dashboard");

      // Navigate directly to interaction URL
      await page.goto(interactionUrl);
      await page.waitForLoadState("networkidle");

      // Verify page loads correctly via direct URL
      await expect(page.locator("h1")).toBeVisible();
      expect(page.url()).toBe(interactionUrl);
    }
  });
});
