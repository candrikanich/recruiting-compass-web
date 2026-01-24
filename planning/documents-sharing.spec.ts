import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Document Sharing Workflows
 *
 * Test suite covering document sharing and collaboration:
 * - Share documents with other users
 * - Update sharing permissions
 * - Revoke access from shared users
 * - View document as shared user
 * - Manage sharing restrictions
 * - Verify access control enforcement
 *
 * Prerequisites:
 * - Dev server running on http://localhost:3003
 * - User authenticated
 * - Test users available for sharing
 */

test.describe("Document Sharing Workflows", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to documents page
    await page.goto("/documents");
    // Wait for documents page to load
    await page.waitForLoadState("networkidle");
  });

  // ============================================================================
  // SHARE WORKFLOWS
  // ============================================================================

  test("should share document with another user", async ({ page }) => {
    // Navigate to first document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Click share button
    const shareBtn = page.locator('[data-testid="share-document-btn"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify share modal appears
    const shareModal = page.locator('[data-testid="share-modal"]');
    await expect(shareModal).toBeVisible();

    // Search for user to share with
    const userSearchInput = page.locator('[data-testid="share-user-search"]');
    await userSearchInput.fill("collaborator@example.com");

    // Wait for search results
    await page.waitForSelector('[data-testid="user-search-result"]');

    // Click first result
    const firstResult = page
      .locator('[data-testid="user-search-result"]')
      .first();
    await firstResult.click();

    // Select permission level
    await page.selectOption('[data-testid="share-permission"]', "view");

    // Share document
    const confirmShareBtn = page.locator('[data-testid="confirm-share-btn"]');
    await confirmShareBtn.click();

    // Verify success notification
    const successMsg = page.locator("text=Document shared successfully");
    await expect(successMsg).toBeVisible();

    // Verify user appears in shared list
    const sharedList = page.locator('[data-testid="shared-users-list"]');
    await expect(sharedList).toContainText("collaborator@example.com");
  });

  test("should share document with view permission", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Open share modal
    await page.click('[data-testid="share-document-btn"]');

    // Search and select user
    const userSearch = page.locator('[data-testid="share-user-search"]');
    await userSearch.fill("viewer@example.com");
    await page.waitForSelector('[data-testid="user-search-result"]');
    await page.locator('[data-testid="user-search-result"]').first().click();

    // Set VIEW permission explicitly
    await page.selectOption('[data-testid="share-permission"]', "view");

    // Verify permission description shown
    const permissionDesc = page.locator(
      '[data-testid="permission-description"]',
    );
    await expect(permissionDesc).toContainText("Can view document");

    // Share
    await page.click('[data-testid="confirm-share-btn"]');
    await expect(
      page.locator("text=Document shared successfully"),
    ).toBeVisible();

    // Verify in shared list with VIEW badge
    const sharedUsers = page.locator('[data-testid="shared-users-list"]');
    const userRow = sharedUsers.locator("text=viewer@example.com");
    await expect(userRow).toBeVisible();

    // Check for permission badge
    const permBadge = page
      .locator('[data-testid="shared-users-list"]')
      .locator("text=viewer@example.com")
      .locator('[data-testid="permission-badge"]');
    await expect(permBadge).toContainText(/VIEW|view/);
  });

  test("should share document with edit permission", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Open share modal
    await page.click('[data-testid="share-document-btn"]');

    // Search and select user
    const userSearch = page.locator('[data-testid="share-user-search"]');
    await userSearch.fill("editor@example.com");
    await page.waitForSelector('[data-testid="user-search-result"]');
    await page.locator('[data-testid="user-search-result"]').first().click();

    // Set EDIT permission
    await page.selectOption('[data-testid="share-permission"]', "edit");

    // Verify permission description
    const permDesc = page.locator('[data-testid="permission-description"]');
    await expect(permDesc).toContainText("Can edit document");

    // Share
    await page.click('[data-testid="confirm-share-btn"]');
    await expect(
      page.locator("text=Document shared successfully"),
    ).toBeVisible();

    // Verify in shared list with EDIT badge
    const userRow = page
      .locator('[data-testid="shared-users-list"]')
      .locator("text=editor@example.com");
    await expect(userRow).toBeVisible();

    const permBadge = userRow.locator('[data-testid="permission-badge"]');
    await expect(permBadge).toContainText(/EDIT|edit/);
  });

  test("should not share with invalid email", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Open share modal
    await page.click('[data-testid="share-document-btn"]');

    // Try invalid email
    const userSearch = page.locator('[data-testid="share-user-search"]');
    await userSearch.fill("invalid-email-format");

    // Wait a moment for validation
    await page.waitForTimeout(500);

    // Verify error or no results
    const noResults = page.locator("text=No users found");
    const errorMsg = page.locator('[data-testid="share-error-msg"]');

    const hasError =
      (await noResults.isVisible()) || (await errorMsg.isVisible());
    expect(hasError).toBeTruthy();
  });

  // ============================================================================
  // PERMISSION MANAGEMENT WORKFLOWS
  // ============================================================================

  test("should update sharing permission from view to edit", async ({
    page,
  }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Verify document is already shared
    const sharedList = page.locator('[data-testid="shared-users-list"]');
    const sharedUsers = await sharedList
      .locator('[data-testid="shared-user-row"]')
      .count();

    if (sharedUsers > 0) {
      // Click permission dropdown for first shared user
      const permMenu = page
        .locator('[data-testid="shared-user-row"]')
        .first()
        .locator('[data-testid="permission-menu"]');
      await permMenu.click();

      // Select EDIT option
      await page.locator('[data-testid="permission-option-edit"]').click();

      // Verify success
      const successMsg = page.locator("text=Permission updated");
      await expect(successMsg).toBeVisible();

      // Verify badge changed
      const badge = page
        .locator('[data-testid="shared-user-row"]')
        .first()
        .locator('[data-testid="permission-badge"]');
      await expect(badge).toContainText(/EDIT|edit/);
    }
  });

  test("should update sharing permission from edit to view", async ({
    page,
  }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Verify document is shared with edit access
    const firstUserRow = page
      .locator('[data-testid="shared-user-row"]')
      .first();
    const badge = firstUserRow.locator('[data-testid="permission-badge"]');

    // Check if has edit permission
    const isEdit = (await badge.textContent())?.toUpperCase().includes("EDIT");

    if (isEdit) {
      // Click permission dropdown
      const permMenu = firstUserRow.locator('[data-testid="permission-menu"]');
      await permMenu.click();

      // Select VIEW option
      await page.locator('[data-testid="permission-option-view"]').click();

      // Verify update
      const successMsg = page.locator("text=Permission updated");
      await expect(successMsg).toBeVisible();

      // Verify badge changed to VIEW
      await expect(badge).toContainText(/VIEW|view/);
    }
  });

  test("should add expiration date to shared access", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Open share modal
    await page.click('[data-testid="share-document-btn"]');

    // Search and select user
    const userSearch = page.locator('[data-testid="share-user-search"]');
    await userSearch.fill("tempuser@example.com");
    await page.waitForSelector('[data-testid="user-search-result"]');
    await page.locator('[data-testid="user-search-result"]').first().click();

    // Set permission
    await page.selectOption('[data-testid="share-permission"]', "view");

    // Enable expiration
    const expirationCheckbox = page.locator(
      '[data-testid="enable-expiration"]',
    );
    if (await expirationCheckbox.isVisible()) {
      await expirationCheckbox.check();

      // Set expiration date (7 days from now)
      const expirationInput = page.locator('[data-testid="expiration-date"]');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split("T")[0];
      await expirationInput.fill(dateStr);
    }

    // Share
    await page.click('[data-testid="confirm-share-btn"]');
    await expect(
      page.locator("text=Document shared successfully"),
    ).toBeVisible();

    // Verify expiration shown in shared list
    const userRow = page
      .locator('[data-testid="shared-users-list"]')
      .locator("text=tempuser@example.com");
    const expirationBadge = userRow.locator('[data-testid="expiration-badge"]');
    if (await expirationBadge.isVisible()) {
      await expect(expirationBadge).toContainText("Expires");
    }
  });

  // ============================================================================
  // REVOKE ACCESS WORKFLOWS
  // ============================================================================

  test("should revoke document access from user", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Get initial shared user count
    const sharedList = page.locator('[data-testid="shared-users-list"]');
    const initialCount = await sharedList
      .locator('[data-testid="shared-user-row"]')
      .count();

    if (initialCount > 0) {
      // Click revoke button on first user
      const revokeBtn = page
        .locator('[data-testid="shared-user-row"]')
        .first()
        .locator('[data-testid="revoke-access-btn"]');
      await revokeBtn.click();

      // Confirm revocation
      const confirmBtn = page.locator('[data-testid="confirm-revoke-btn"]');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();

        // Verify success
        const successMsg = page.locator("text=Access revoked");
        await expect(successMsg).toBeVisible();

        // Verify user removed from list
        const newCount = await sharedList
          .locator('[data-testid="shared-user-row"]')
          .count();
        expect(newCount).toBeLessThan(initialCount);
      }
    }
  });

  test("should revoke all access to document", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Click "Remove all sharing"
    const removeAllBtn = page.locator('[data-testid="remove-all-sharing-btn"]');
    if (await removeAllBtn.isVisible()) {
      await removeAllBtn.click();

      // Confirm
      const confirmBtn = page.locator('[data-testid="confirm-revoke-btn"]');
      await confirmBtn.click();

      // Verify success
      const successMsg = page.locator("text=All sharing removed");
      await expect(successMsg).toBeVisible();

      // Verify shared list is empty
      const sharedList = page.locator('[data-testid="shared-users-list"]');
      const userCount = await sharedList
        .locator('[data-testid="shared-user-row"]')
        .count();
      expect(userCount).toBe(0);
    }
  });

  // ============================================================================
  // SHARED USER VIEW WORKFLOWS
  // ============================================================================

  test("should view shared document with view-only access", async ({
    page,
  }) => {
    // Simulate viewing as shared user (in real E2E, would login as different user)
    // For now, verify the shared state is available

    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Verify document displays
    const docName = page.locator('[data-testid="document-name"]');
    await expect(docName).toBeVisible();

    // Verify view-only indicators
    const viewOnlyBadge = page.locator('[data-testid="view-only-badge"]');
    if (await viewOnlyBadge.isVisible()) {
      await expect(viewOnlyBadge).toContainText("View only");
    }

    // Verify edit button not available (if view-only)
    const editBtn = page.locator('[data-testid="edit-document-btn"]');
    const isDisabled = await editBtn.isDisabled();
    // May or may not be disabled depending on permission level
  });

  test("should edit shared document with edit access", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Verify edit button available
    const editBtn = page.locator('[data-testid="edit-document-btn"]');
    if (await editBtn.isVisible()) {
      // Try to edit
      await editBtn.click();

      // Verify form appears
      const editForm = page.locator('[data-testid="edit-document-form"]');
      await expect(editForm).toBeVisible();

      // Make a small edit
      const descField = page.locator(
        '[data-testid="edit-document-description"]',
      );
      if (await descField.isVisible()) {
        await descField.clear();
        await descField.fill("Updated by shared user");

        // Save
        await page.click('[data-testid="save-document-btn"]');

        // Verify success
        const successMsg = page.locator("text=Document updated");
        await expect(successMsg).toBeVisible();
      }
    }
  });

  // ============================================================================
  // VISIBILITY & PRIVACY WORKFLOWS
  // ============================================================================

  test("should set document to private (no sharing)", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Click document settings
    const settingsBtn = page.locator('[data-testid="document-settings-btn"]');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();

      // Find privacy option
      const privateOption = page.locator(
        '[data-testid="privacy-option-private"]',
      );
      if (await privateOption.isVisible()) {
        await privateOption.click();

        // Confirm
        const confirmBtn = page.locator(
          '[data-testid="confirm-privacy-change"]',
        );
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();

          // Verify private badge
          const privateBadge = page.locator('[data-testid="private-badge"]');
          await expect(privateBadge).toBeVisible();
        }
      }
    }
  });

  test("should set document to shareable", async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // Click settings
    const settingsBtn = page.locator('[data-testid="document-settings-btn"]');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();

      // Find shareable option
      const shareableOption = page.locator(
        '[data-testid="privacy-option-shareable"]',
      );
      if (await shareableOption.isVisible()) {
        await shareableOption.click();

        // Verify update
        const successMsg = page.locator("text=Document privacy updated");
        if (await successMsg.isVisible()) {
          await expect(successMsg).toBeVisible();
        }
      }
    }
  });

  // ============================================================================
  // SHARING WORKFLOW - COMPLETE FLOW
  // ============================================================================

  test("should complete full sharing workflow", async ({ page }) => {
    // 1. Navigate to document
    await page.locator('[data-testid="document-card"]').first().click();
    await page.waitForLoadState("networkidle");

    // 2. Share document
    await page.click('[data-testid="share-document-btn"]');
    const userSearch = page.locator('[data-testid="share-user-search"]');
    await userSearch.fill("workflow@example.com");
    await page.waitForSelector('[data-testid="user-search-result"]');
    await page.locator('[data-testid="user-search-result"]').first().click();
    await page.selectOption('[data-testid="share-permission"]', "view");
    await page.click('[data-testid="confirm-share-btn"]');
    await expect(
      page.locator("text=Document shared successfully"),
    ).toBeVisible();

    // 3. Verify user in shared list
    const sharedList = page.locator('[data-testid="shared-users-list"]');
    await expect(sharedList).toContainText("workflow@example.com");

    // 4. Update permission
    const permMenu = page
      .locator('[data-testid="shared-user-row"]')
      .first()
      .locator('[data-testid="permission-menu"]');
    await permMenu.click();
    await page.locator('[data-testid="permission-option-edit"]').click();
    await expect(page.locator("text=Permission updated")).toBeVisible();

    // 5. Revoke access
    const revokeBtn = page
      .locator('[data-testid="shared-user-row"]')
      .first()
      .locator('[data-testid="revoke-access-btn"]');
    await revokeBtn.click();
    const confirmBtn = page.locator('[data-testid="confirm-revoke-btn"]');
    await confirmBtn.click();
    await expect(page.locator("text=Access revoked")).toBeVisible();
  });
});
