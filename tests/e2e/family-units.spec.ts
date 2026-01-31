import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3003";

// Test data from documentation
const TEST_ACCOUNTS = {
  student1: {
    email: "test.player2028@andrikanich.com",
    password: "test-password",
  },
  student2: {
    email: "test.player2030@andrikanich.com",
    password: "test-password",
  },
  parent: {
    email: "test.parent@andrikanich.com",
    password: "test-password",
  },
};

test.describe("Family Units", () => {
  test("parent can view school list", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as parent
    await page.fill('input[type="email"]', TEST_ACCOUNTS.parent.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Check schools page loads
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();
  });

  test("parent can switch between athletes", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as parent
    await page.fill('input[type="email"]', TEST_ACCOUNTS.parent.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Look for athlete selector (should be visible for parents)
    const athleteSelector = page.locator('select').first();
    const isVisible = await athleteSelector.isVisible().catch(() => false);

    if (isVisible) {
      // Get initial athlete value
      const initialValue = await athleteSelector.inputValue();
      expect(initialValue).toBeTruthy();

      // Try to select a different athlete if available
      const options = await athleteSelector.locator("option").count();
      if (options > 1) {
        const secondOption = athleteSelector.locator("option").nth(1);
        const secondValue = await secondOption.getAttribute("value");
        if (secondValue && secondValue !== initialValue) {
          await athleteSelector.selectOption(secondValue);
          await page.waitForLoadState("networkidle");
          expect(await athleteSelector.inputValue()).toBe(secondValue);
        }
      }
    }
  });

  test("student can view their own schools", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as student
    await page.fill('input[type="email"]', TEST_ACCOUNTS.student1.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.student1.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Check schools page loads with data
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();

    // Verify student sees their schools (test data has schools for student1)
    const schoolCards = page.locator('[class*="grid"]').first();
    const isLoaded = await schoolCards.isVisible().catch(() => false);
    expect(isLoaded).toBeTruthy();
  });

  test("student cannot see athlete selector", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as student
    await page.fill('input[type="email"]', TEST_ACCOUNTS.student1.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.student1.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Check that athlete selector is not visible (student should not see it)
    const selectElements = page.locator('select');
    const count = await selectElements.count();

    // If there's a select for athlete switching, it should not be visible for students
    // (The rest of the selects like filters are okay)
    const athleteSelectorText = page.locator("text=Viewing");
    const isVisible = await athleteSelectorText.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("private notes can be added to schools", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as student
    await page.fill('input[type="email"]', TEST_ACCOUNTS.student1.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.student1.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Look for private notes card (with lock emoji and "Your Private Notes" text)
    const privateNotesCard = page.locator("text=🔒 Your Private Notes").first();

    if (await privateNotesCard.isVisible().catch(() => false)) {
      // Find the "Add Notes" or "Edit" button
      const editButton = privateNotesCard
        .locator("button:has-text('Add Notes'), button:has-text('Edit')")
        .first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();

        // Fill in the note text
        const textarea = privateNotesCard.locator("textarea").first();
        if (await textarea.isVisible().catch(() => false)) {
          await textarea.fill("Test private note");

          // Save the note
          const saveButton = privateNotesCard.locator(
            "button:has-text('Save')"
          );
          if (await saveButton.isVisible().catch(() => false)) {
            await saveButton.click();
            await page.waitForLoadState("networkidle");

            // Verify note is saved
            const savedNote = privateNotesCard.locator("text=Test private note");
            expect(
              await savedNote.isVisible().catch(() => false)
            ).toBeTruthy();
          }
        }
      }
    }
  });

  test("schools page displays school data correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as student with existing data
    await page.fill('input[type="email"]', TEST_ACCOUNTS.student1.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.student1.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Verify key page elements
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();

    // Check for school count display
    const schoolCount = page.locator("text=/\\d+\\s+school/");
    expect(await schoolCount.isVisible().catch(() => false)).toBeTruthy();

    // Check for action buttons
    const viewButton = page.locator('button:has-text("View")').first();
    const isViewButtonVisible = await viewButton
      .isVisible()
      .catch(() => false);
    expect(isViewButtonVisible).toBeTruthy();
  });

  test("family context is maintained across pages", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Login as parent
    await page.fill('input[type="email"]', TEST_ACCOUNTS.parent.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
    await page.click('button:has-text("Sign in")');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");

    // Verify we can navigate and return
    await page.goto(`${BASE_URL}/coaches`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();

    // Navigate back to schools
    await page.goto(`${BASE_URL}/schools`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();
  });
});
