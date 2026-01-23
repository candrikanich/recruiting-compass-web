import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Document CRUD Workflows
 *
 * Test suite covering complete document lifecycle:
 * - Create documents from file upload
 * - View document details
 * - Edit document metadata
 * - Delete documents
 * - Manage document versions
 * - Restore from version history
 *
 * Prerequisites:
 * - Dev server running on http://localhost:3003
 * - User authenticated
 * - Documents page accessible
 */

test.describe('Document CRUD Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to documents page
    await page.goto('/documents')
    // Wait for documents page to load
    await page.waitForLoadState('networkidle')
  })

  // ============================================================================
  // CREATE WORKFLOWS
  // ============================================================================

  test('should create a new document from file upload', async ({ page }) => {
    // Click "Upload Document" button
    const uploadBtn = page.locator('[data-testid="upload-document-btn"]')
    await expect(uploadBtn).toBeVisible()
    await uploadBtn.click()

    // Verify upload modal appears
    const modal = page.locator('[data-testid="upload-modal"]')
    await expect(modal).toBeVisible()

    // Fill document name
    await page.fill('[data-testid="document-name"]', 'Recruiting Highlight Video')

    // Select document type
    await page.selectOption('[data-testid="document-type"]', 'highlight_video')

    // Set category
    await page.selectOption('[data-testid="document-category"]', 'media')

    // Add description
    await page.fill(
      '[data-testid="document-description"]',
      'Showcase of athletic abilities and recruiting footage'
    )

    // Upload file (create a dummy file in tests)
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'highlight.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('dummy-video-content')
    })

    // Submit form
    await page.click('[data-testid="upload-submit"]')

    // Wait for success notification
    const successNotification = page.locator('text=Document uploaded successfully')
    await expect(successNotification).toBeVisible()

    // Verify document appears in list
    const documentCard = page.locator('text=Recruiting Highlight Video')
    await expect(documentCard).toBeVisible()
  })

  test('should create document with tags and metadata', async ({ page }) => {
    // Click upload
    await page.click('[data-testid="upload-document-btn"]')

    // Fill basic info
    await page.fill('[data-testid="document-name"]', 'Academic Transcript')
    await page.selectOption('[data-testid="document-type"]', 'transcript')
    await page.selectOption('[data-testid="document-category"]', 'academics')

    // Add tags
    const tagInput = page.locator('[data-testid="tag-input"]')
    await tagInput.click()
    await page.keyboard.type('gpa-3.8')
    await page.keyboard.press('Enter')
    await page.keyboard.type('honors')
    await page.keyboard.press('Enter')

    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'transcript.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy-pdf')
    })

    // Submit
    await page.click('[data-testid="upload-submit"]')

    // Wait for creation and verify tags display
    await page.waitForSelector('[data-testid="document-tags"]')
    const tags = page.locator('[data-testid="document-tags"]')
    await expect(tags).toContainText('gpa-3.8')
    await expect(tags).toContainText('honors')
  })

  test('should reject upload with invalid file type', async ({ page }) => {
    // Click upload
    await page.click('[data-testid="upload-document-btn"]')

    // Fill info
    await page.fill('[data-testid="document-name"]', 'Bad File')
    await page.selectOption('[data-testid="document-type"]', 'highlight_video')

    // Try to upload wrong file type (expecting video, uploading PDF)
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy-pdf')
    })

    // Expect validation error
    const errorMessage = page.locator('[data-testid="file-error"]')
    await expect(errorMessage).toContainText('Invalid file type')
  })

  // ============================================================================
  // READ WORKFLOWS
  // ============================================================================

  test('should view document details page', async ({ page }) => {
    // Wait for documents to load
    await page.waitForSelector('[data-testid="document-card"]')

    // Click first document
    await page.locator('[data-testid="document-card"]').first().click()

    // Verify detail page loads
    await page.waitForLoadState('networkidle')

    // Check all detail sections visible
    await expect(page.locator('[data-testid="document-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="document-type"]')).toBeVisible()
    await expect(page.locator('[data-testid="document-created-date"]')).toBeVisible()
    await expect(page.locator('[data-testid="document-size"]')).toBeVisible()

    // Verify preview section
    const preview = page.locator('[data-testid="document-preview"]')
    await expect(preview).toBeVisible()
  })

  test('should display document metadata and info', async ({ page }) => {
    // Navigate to first document
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Verify metadata displayed
    const metadata = page.locator('[data-testid="document-metadata"]')
    await expect(metadata).toBeVisible()

    // Check individual fields
    const nameField = page.locator('[data-testid="metadata-name"]')
    const typeField = page.locator('[data-testid="metadata-type"]')
    const sizeField = page.locator('[data-testid="metadata-size"]')

    await expect(nameField).not.toHaveValue('')
    await expect(typeField).toHaveText(/highlight_video|transcript|resume|rec_letter|stats_sheet/)
    await expect(sizeField).toMatch(/\d+\s(KB|MB)/)
  })

  test('should search within document list', async ({ page }) => {
    // Type in search box
    await page.fill('[data-testid="documents-search"]', 'highlight')

    // Wait for filtering
    await page.waitForTimeout(500)

    // Verify only matching documents shown
    const cards = page.locator('[data-testid="document-card"]')
    const cardCount = await cards.count()

    // If any results, they should contain search term
    if (cardCount > 0) {
      const firstCardText = await cards.first().textContent()
      expect(firstCardText?.toLowerCase()).toContain('highlight')
    }
  })

  // ============================================================================
  // UPDATE WORKFLOWS
  // ============================================================================

  test('should edit document name and description', async ({ page }) => {
    // Navigate to document detail
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Click edit button
    const editBtn = page.locator('[data-testid="edit-document-btn"]')
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Verify edit form appears
    const editForm = page.locator('[data-testid="edit-document-form"]')
    await expect(editForm).toBeVisible()

    // Update name
    const nameField = page.locator('[data-testid="edit-document-name"]')
    await nameField.clear()
    await nameField.fill('Updated Document Name')

    // Update description
    const descField = page.locator('[data-testid="edit-document-description"]')
    await descField.clear()
    await descField.fill('Updated description with more details')

    // Save changes
    await page.click('[data-testid="save-document-btn"]')

    // Wait for success
    const successMsg = page.locator('text=Document updated successfully')
    await expect(successMsg).toBeVisible()

    // Verify changes persisted
    const updatedName = page.locator('[data-testid="document-name"]')
    await expect(updatedName).toContainText('Updated Document Name')
  })

  test('should update document tags', async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Click edit button
    await page.click('[data-testid="edit-document-btn"]')

    // Add new tag
    const tagInput = page.locator('[data-testid="tag-input"]')
    await tagInput.click()
    await page.keyboard.type('new-tag')
    await page.keyboard.press('Enter')

    // Remove existing tag (if any)
    const removeTagBtn = page.locator('[data-testid="tag-remove"]').first()
    if (await removeTagBtn.isVisible()) {
      await removeTagBtn.click()
    }

    // Save
    await page.click('[data-testid="save-document-btn"]')

    // Verify success
    const successMsg = page.locator('text=Document updated successfully')
    await expect(successMsg).toBeVisible()

    // Verify tag appears in list
    const tags = page.locator('[data-testid="document-tags"]')
    await expect(tags).toContainText('new-tag')
  })

  // ============================================================================
  // DELETE WORKFLOWS
  // ============================================================================

  test('should delete a document with confirmation', async ({ page }) => {
    // Count initial documents
    let initialCount = await page.locator('[data-testid="document-card"]').count()

    // Click first document
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Click delete button
    const deleteBtn = page.locator('[data-testid="delete-document-btn"]')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Confirm deletion
    const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]')
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Wait for deletion
    const successMsg = page.locator('text=Document deleted successfully')
    await expect(successMsg).toBeVisible()

    // Verify redirected to list
    await page.waitForURL('/documents')

    // Verify count decreased
    const newCount = await page.locator('[data-testid="document-card"]').count()
    expect(newCount).toBeLessThan(initialCount)
  })

  test('should cancel document deletion', async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Store document name for verification
    const docNameElement = page.locator('[data-testid="document-name"]')
    const originalName = await docNameElement.textContent()

    // Click delete
    await page.click('[data-testid="delete-document-btn"]')

    // Click cancel instead of confirm
    const cancelBtn = page.locator('[data-testid="cancel-delete-btn"]')
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // Verify still on detail page
    await expect(docNameElement).toContainText(originalName || '')
  })

  // ============================================================================
  // VERSION MANAGEMENT WORKFLOWS
  // ============================================================================

  test('should view document version history', async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Click version history tab
    const versionTab = page.locator('[data-testid="version-history-tab"]')
    if (await versionTab.isVisible()) {
      await versionTab.click()

      // Verify version list appears
      const versionList = page.locator('[data-testid="version-list"]')
      await expect(versionList).toBeVisible()

      // Check for version entries
      const versionItems = page.locator('[data-testid="version-item"]')
      const itemCount = await versionItems.count()
      expect(itemCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('should restore document to previous version', async ({ page }) => {
    // Navigate to document
    await page.locator('[data-testid="document-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Open version history
    const versionTab = page.locator('[data-testid="version-history-tab"]')
    if (await versionTab.isVisible()) {
      await versionTab.click()

      // Find and click restore button on older version
      const restoreBtn = page.locator('[data-testid="restore-version-btn"]').first()
      if (await restoreBtn.isVisible()) {
        await restoreBtn.click()

        // Confirm restoration
        const confirmBtn = page.locator('[data-testid="confirm-restore-btn"]')
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click()

          // Verify success message
          const successMsg = page.locator('text=Document restored successfully')
          await expect(successMsg).toBeVisible()
        }
      }
    }
  })

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  test('should select multiple documents and bulk delete', async ({ page }) => {
    // Enable batch mode
    const batchToggle = page.locator('[data-testid="batch-mode-toggle"]')
    if (await batchToggle.isVisible()) {
      await batchToggle.click()

      // Select first two documents
      const checkboxes = page.locator('[data-testid="document-checkbox"]')
      const count = await checkboxes.count()

      if (count >= 2) {
        await checkboxes.nth(0).click()
        await checkboxes.nth(1).click()

        // Click bulk delete
        const bulkDeleteBtn = page.locator('[data-testid="bulk-delete-btn"]')
        if (await bulkDeleteBtn.isVisible()) {
          await bulkDeleteBtn.click()

          // Confirm
          const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]')
          await confirmBtn.click()

          // Verify success
          const successMsg = page.locator('text=Documents deleted')
          await expect(successMsg).toBeVisible()
        }
      }
    }
  })

  test('should complete document workflow from upload to sharing', async ({ page }) => {
    // 1. Upload document
    await page.click('[data-testid="upload-document-btn"]')
    await page.fill('[data-testid="document-name"]', 'Complete Workflow Test')
    await page.selectOption('[data-testid="document-type"]', 'resume')

    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy-pdf')
    })

    await page.click('[data-testid="upload-submit"]')
    await expect(page.locator('text=Document uploaded successfully')).toBeVisible()

    // 2. Navigate to document
    await page.click('text=Complete Workflow Test')
    await page.waitForLoadState('networkidle')

    // 3. Edit metadata
    await page.click('[data-testid="edit-document-btn"]')
    await page.fill('[data-testid="edit-document-description"]', 'Updated in workflow')
    await page.click('[data-testid="save-document-btn"]')
    await expect(page.locator('text=Document updated successfully')).toBeVisible()

    // 4. Verify changes
    const description = page.locator('[data-testid="document-description"]')
    await expect(description).toContainText('Updated in workflow')
  })
})
