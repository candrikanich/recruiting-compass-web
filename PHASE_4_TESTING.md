# Phase 4: Comprehensive Testing Implementation

**Date:** January 21, 2026
**Status:** In Progress
**Objective:** Unit testing, E2E testing, and deprecation audit for Phase 3 refactoring
**Estimated Duration:** 8-12 hours total
**Target Coverage:** 80%+ for consolidated composables, 70%+ for integrations

---

## 🎯 Phase 4 Overview

Phase 4 builds on the Phase 3 refactoring by implementing comprehensive test coverage for:

1. **New Consolidated Composables** (2 composables)
   - `useDocumentsConsolidated()`
   - `useSearchConsolidated()`

2. **Migrated Pages** (4 pages)
   - `/pages/documents/index.vue`
   - `/pages/documents/[id].vue`
   - `/pages/documents/view.vue`
   - `/pages/search/index.vue`

3. **Deprecation Audit**
   - Identify remaining uses of deprecated composables
   - Create deprecation warnings
   - Plan Phase 5 migration

---

## 📋 Test Implementation Priority

### Priority 1: Unit Tests (4-6 hours)
**Coverage Target: 80%+**

#### 1.1 useDocumentsConsolidated() Tests
**File:** `tests/unit/composables/useDocumentsConsolidated.spec.ts`

**Test Scope (25-30 tests):**

| Test Category | Test Cases | Priority |
|---|---|---|
| **CRUD Operations (8 tests)** | createDocument, fetchDocuments, updateDocument, deleteDocument, getDocument, restoreVersion, duplicateDocument, batchDelete | HIGH |
| **File Operations (6 tests)** | uploadFile, validateFileType, validateFileSize, getFileMetadata, deleteFileFromStorage, batchUpload | HIGH |
| **Sharing & Permissions (5 tests)** | shareDocument, revokeAccess, updatePermission, getDocumentAccess, listSharedWith | HIGH |
| **Search & Filtering (3 tests)** | searchDocuments, filterByType, filterByDate | MEDIUM |
| **Error Handling (3 tests)** | handleAuthError, handleStorageError, handleValidationError | HIGH |

**Example Test Structure:**
```typescript
describe('useDocumentsConsolidated', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('CRUD Operations', () => {
    it('should create document with sanitized data')
    it('should fetch documents for current user')
    it('should update document fields')
    it('should delete document and clean up storage')
    // ... more tests
  })

  describe('File Operations', () => {
    it('should validate file type before upload')
    it('should validate file size against limits')
    it('should handle large file uploads')
    it('should extract file metadata')
    // ... more tests
  })

  describe('Sharing & Permissions', () => {
    it('should share document with specific user')
    it('should revoke user access')
    it('should update permission level')
    // ... more tests
  })
})
```

#### 1.2 useSearchConsolidated() Tests
**File:** `tests/unit/composables/useSearchConsolidated.spec.ts`

**Test Scope (20-25 tests):**

| Test Category | Test Cases | Priority |
|---|---|---|
| **Search Operations (6 tests)** | performSearch, searchByEntity, fuzzySearch, getCachedResults, clearCache, resetSearch | HIGH |
| **Filtering (5 tests)** | applyFilter, removeFilter, resetFilters, chainFilters, validateFilterCriteria | HIGH |
| **Result Formatting (3 tests)** | formatResults, highlightMatches, paginateResults | MEDIUM |
| **Performance (3 tests)** | debounceSearch, cacheHit, cacheMiss, cacheTTL | MEDIUM |
| **Error Handling (3 tests)** | handleEmptyResults, handleSearchError, handleFilterError | MEDIUM |

#### 1.3 Component Integration Tests
**File:** `tests/integration/document-components.spec.ts`

**Test Scope (15-20 tests):**

| Component | Test Cases | Priority |
|---|---|---|
| **DocumentList** | mount & render, handle upload, handle delete, pagination | HIGH |
| **DocumentDetail** | display metadata, manage versions, handle sharing, edit document | HIGH |
| **SearchBar** | input handling, debounced search, results display, filter integration | MEDIUM |
| **PermissionModal** | display current permissions, add user, remove user, save changes | MEDIUM |

---

### Priority 2: E2E Tests (3-4 hours)
**Coverage Target: Critical workflows only**

#### 2.1 Document CRUD Workflows
**File:** `tests/e2e/documents-crud.spec.ts`

**Workflows (8-10 tests):**

```typescript
test('should create document from upload', async ({ page }) => {
  // Navigate to documents
  // Upload file
  // Verify in list
  // Verify metadata correct
})

test('should edit document details', async ({ page }) => {
  // Open document
  // Edit title, description, tags
  // Save changes
  // Verify changes persist
})

test('should delete document and restore', async ({ page }) => {
  // Delete document
  // Verify in trash
  // Restore from trash
  // Verify back in main list
})

test('should version control document', async ({ page }) => {
  // Upload initial version
  // Replace file (version 2)
  // Replace file (version 3)
  // View version history
  // Restore to version 1
})
```

#### 2.2 Document Sharing Workflows
**File:** `tests/e2e/documents-sharing.spec.ts`

**Workflows (5-7 tests):**

```typescript
test('should share document with user', async ({ page }) => {
  // Open document
  // Click "Share"
  // Enter email/user
  // Set permission (view/edit)
  // Send
  // Verify shared
})

test('should revoke user access', async ({ page }) => {
  // Open shared document
  // View sharing list
  // Click revoke for user
  // Confirm
  // Verify removed
})

test('should view as shared user', async ({ page: page2 }) => {
  // As shared user
  // Access shared document
  // Verify can view (or edit if permission)
  // Verify cannot delete
})
```

#### 2.3 Search Workflows
**File:** `tests/e2e/search-workflows.spec.ts`

**Workflows (5-8 tests):**

```typescript
test('should search across documents', async ({ page }) => {
  // Navigate to search
  // Type search term
  // Verify results display
  // Verify filtering options available
})

test('should filter search results', async ({ page }) => {
  // Perform search
  // Apply document type filter
  // Apply date range filter
  // Verify results narrow correctly
})

test('should navigate from search to document', async ({ page }) => {
  // Search and find document
  // Click result
  // Verify navigates to detail page
  // Verify back button returns to search
})
```

---

### Priority 3: Deprecation Audit (2-3 hours)
**Target:** Identify all remaining deprecated code

#### 3.1 Audit Deprecated Composables

**Old Composables (Replaced):**
- ❌ `useDocuments()` → ✅ `useDocumentsConsolidated()`
- ❌ `useDocumentFetch()` → ✅ `useDocumentsConsolidated()`
- ❌ `useDocumentUpload()` → ✅ `useDocumentsConsolidated()`
- ❌ `useDocumentSharing()` → ✅ `useDocumentsConsolidated()`
- ❌ `useDocumentValidation()` → ✅ `useFormValidation()`
- ❌ `useSearch()` → ✅ `useSearchConsolidated()`
- ❌ `useSearchFilters()` → ✅ `useSearchConsolidated()`
- ❌ `useEntitySearch()` → ✅ `useSearchConsolidated()`

**Audit Process:**
```bash
# Find remaining uses of deprecated composables
grep -r "useDocuments()" composables/ --include="*.ts" --include="*.vue" | grep -v "useDocumentsConsolidated"
grep -r "useDocumentFetch()" composables/ --include="*.ts" --include="*.vue"
grep -r "useDocumentUpload()" composables/ --include="*.ts" --include="*.vue"
grep -r "useSearch()" pages/ components/ --include="*.ts" --include="*.vue" | grep -v "useSearchConsolidated"
grep -r "useSearchFilters()" pages/ components/ --include="*.ts" --include="*.vue" | grep -v "useSearchConsolidated"
```

#### 3.2 Create Deprecation Warnings

**File:** `composables/deprecated.ts` (NEW)

```typescript
// Log deprecation warnings when old composables are used
export function warnDeprecated(
  oldName: string,
  newName: string,
  removalVersion: string = 'v2.0.0'
) {
  console.warn(
    `⚠️ DEPRECATED: ${oldName} is deprecated. Use ${newName} instead. ` +
    `Will be removed in ${removalVersion}. ` +
    `See PHASE_5_MIGRATION.md for migration guide.`
  )
}
```

#### 3.3 Deprecation Summary Report

**Create:** `DEPRECATION_AUDIT.md`

```markdown
# Deprecation Audit Report - Phase 4

## Deprecated Composables Status

| Old Composable | New Replacement | Pages Using | Status | Phase 5 Action |
|---|---|---|---|---|
| useDocuments() | useDocumentsConsolidated() | [list] | Ready to remove | Full migration |
| useDocumentFetch() | useDocumentsConsolidated() | [list] | Ready to remove | Full migration |
| useDocumentUpload() | useDocumentsConsolidated() | [list] | Ready to remove | Full migration |
| ... | ... | ... | ... | ... |

## Removal Timeline

- Phase 4 (Now): Add deprecation warnings, create migration guide
- Phase 5: Migrate remaining uses
- v2.0.0: Remove deprecated composables
```

---

## 🛠️ Test Implementation Steps

### Step 1: Create Test Fixtures
**Time:** 30 minutes

**File:** `tests/fixtures/documents.fixture.ts`

```typescript
export function createMockDocument(overrides = {}) {
  return {
    id: 'doc-123',
    user_id: 'user-456',
    title: 'Test Document',
    description: 'Test description',
    type: 'pdf',
    size: 1024,
    url: 'https://example.com/doc.pdf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockDocumentVersion(overrides = {}) {
  return {
    id: 'version-123',
    document_id: 'doc-123',
    version_number: 1,
    url: 'https://example.com/doc-v1.pdf',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockSearchResult(overrides = {}) {
  return {
    id: 'result-123',
    type: 'document',
    title: 'Test Result',
    excerpt: 'Test excerpt...',
    relevance: 0.95,
    ...overrides,
  }
}
```

**File:** `tests/fixtures/index.ts`

```typescript
export * from './documents.fixture'
export * from './search.fixture'
```

### Step 2: Implement Unit Tests - useDocumentsConsolidated
**Time:** 2-3 hours

Start with this structure in `tests/unit/composables/useDocumentsConsolidated.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDocumentsConsolidated } from '~/composables/useDocumentsConsolidated'
import { useUserStore } from '~/stores/user'
import { createMockDocument } from '../../fixtures/documents.fixture'

describe('useDocumentsConsolidated', () => {
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    userStore = useUserStore()
    userStore.user = { id: 'user-123', email: 'test@example.com' }
    vi.clearAllMocks()
  })

  describe('CRUD Operations', () => {
    it('should create document with sanitized data', async () => {
      const { createDocument } = useDocumentsConsolidated()
      const mockData = {
        title: 'Test Doc',
        description: '<script>alert("xss")</script>Test',
      }

      // Mock and test
      const result = await createDocument(mockData)
      expect(result.description).not.toContain('<script>')
    })

    // More tests...
  })

  describe('File Operations', () => {
    it('should validate file type before upload', async () => {
      const { uploadFile } = useDocumentsConsolidated()
      const file = new File(['content'], 'test.exe')

      // Should throw for invalid type
      await expect(uploadFile(file)).rejects.toThrow()
    })

    // More tests...
  })

  describe('Error Handling', () => {
    it('should handle auth errors gracefully', async () => {
      const { fetchDocuments } = useDocumentsConsolidated()
      
      // Mock auth error
      vi.mock('~/composables/useSupabase', () => ({
        useSupabase: () => ({
          from: () => ({ select: () => ({ error: 'Unauthorized' }) })
        })
      }))

      // Test error handling
      const result = await fetchDocuments()
      expect(result.error).toBeDefined()
    })

    // More tests...
  })
})
```

### Step 3: Implement Unit Tests - useSearchConsolidated
**Time:** 1.5-2 hours

**File:** `tests/unit/composables/useSearchConsolidated.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchConsolidated } from '~/composables/useSearchConsolidated'
import { createMockSearchResult } from '../../fixtures/search.fixture'

describe('useSearchConsolidated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Search Operations', () => {
    it('should perform search with debounce', async () => {
      const { performSearch, results } = useSearchConsolidated()
      
      await performSearch('test query')
      
      expect(results.value).toBeDefined()
      expect(results.value.length).toBeGreaterThan(0)
    })

    it('should cache search results', async () => {
      const { performSearch } = useSearchConsolidated()
      
      await performSearch('test')
      const firstCallTime = Date.now()
      
      await performSearch('test')
      const secondCallTime = Date.now()
      
      // Second call should be faster (from cache)
      expect(secondCallTime - firstCallTime).toBeLessThan(50)
    })

    // More tests...
  })

  describe('Filtering', () => {
    it('should apply filter to results', async () => {
      const { performSearch, applyFilter, filteredResults } = useSearchConsolidated()
      
      await performSearch('test')
      await applyFilter('type', 'document')
      
      expect(filteredResults.value).toBeDefined()
    })

    // More tests...
  })
})
```

### Step 4: Implement Integration Tests
**Time:** 1-1.5 hours

**File:** `tests/integration/document-components.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DocumentList from '~/pages/documents/index.vue'
import { useDocumentsConsolidated } from '~/composables/useDocumentsConsolidated'
import { createMockDocument } from '../fixtures/documents.fixture'

describe('Document Components Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should mount DocumentList and fetch documents', async () => {
    const wrapper = mount(DocumentList, {
      global: {
        stubs: ['NuxtLink', 'Icon']
      }
    })

    expect(wrapper.exists()).toBe(true)
    
    // Verify composable integration
    const { documents } = useDocumentsConsolidated()
    expect(documents.value).toBeDefined()
  })

  // More tests...
})
```

### Step 5: Implement E2E Tests
**Time:** 1.5-2 hours

**File:** `tests/e2e/documents-crud.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Document CRUD Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/documents')
  })

  test('should create document from upload', async ({ page }) => {
    // Click upload button
    await page.click('[data-testid="upload-btn"]')

    // Set up file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/sample.pdf')

    // Fill metadata
    await page.fill('[data-testid="title"]', 'Test Document')
    await page.fill('[data-testid="description"]', 'Test description')

    // Submit
    await page.click('[data-testid="submit-btn"]')

    // Verify success
    await expect(page.locator('text=Test Document')).toBeVisible()
  })

  test('should edit document details', async ({ page }) => {
    // Click first document
    await page.click('[data-testid="document-card"]:first-child')

    // Edit title
    await page.fill('[data-testid="title"]', 'Updated Title')
    await page.click('[data-testid="save-btn"]')

    // Verify update
    await expect(page.locator('text=Updated Title')).toBeVisible()
  })

  // More tests...
})
```

---

## 📊 Testing Metrics & Coverage

### Target Coverage Breakdown

```
Overall Target: 80%+ for consolidated composables

useDocumentsConsolidated:
├── Statements: 85%+
├── Branches: 80%+
├── Functions: 85%+
└── Lines: 85%+

useSearchConsolidated:
├── Statements: 80%+
├── Branches: 75%+
├── Functions: 85%+
└── Lines: 80%+

Component Integration:
├── Statements: 70%+
├── Coverage: 70%+
└── Critical Paths: 85%+
```

### How to Run Tests

```bash
# Unit tests only
npm run test -- tests/unit/

# Unit tests for specific composable
npm run test -- tests/unit/composables/useDocumentsConsolidated.spec.ts

# Integration tests
npm run test -- tests/integration/

# E2E tests (requires dev server on port 3003)
npm run dev &
npm run test:e2e

# Generate coverage report
npm run test:coverage

# View coverage in UI
npm run test:coverage -- --reporter=html
```

---

## ✅ Phase 4 Completion Checklist

### Unit Tests
- [ ] Create test fixtures (documents.fixture.ts, search.fixture.ts)
- [ ] Implement useDocumentsConsolidated tests (25-30 tests)
- [ ] Implement useSearchConsolidated tests (20-25 tests)
- [ ] Implement component integration tests (15-20 tests)
- [ ] Achieve 80%+ coverage on consolidated composables
- [ ] All unit tests passing

### E2E Tests
- [ ] Create documents-crud.spec.ts (8-10 tests)
- [ ] Create documents-sharing.spec.ts (5-7 tests)
- [ ] Create search-workflows.spec.ts (5-8 tests)
- [ ] All E2E tests passing
- [ ] Manual smoke tests on key workflows

### Deprecation Audit
- [ ] Audit remaining uses of deprecated composables
- [ ] Create deprecation warnings
- [ ] Create DEPRECATION_AUDIT.md report
- [ ] Document migration path for Phase 5
- [ ] Update project documentation

### Documentation
- [ ] Update test organization in project docs
- [ ] Create test implementation guide for future developers
- [ ] Document coverage strategy
- [ ] Create troubleshooting guide for test issues

### Code Quality
- [ ] All tests passing locally
- [ ] No type errors (npm run type-check)
- [ ] No linting errors (npm run lint)
- [ ] 80%+ coverage achieved

---

## 🚀 Next Steps After Phase 4

Once Phase 4 testing is complete:

1. **Phase 5 (Final Migration)**
   - Remove deprecated composables entirely
   - Migrate any remaining uses in lower-priority pages
   - Full deprecation cleanup

2. **Documentation & Release**
   - Final test coverage report
   - Update README with new testing patterns
   - Tag v2.0.0-beta release
   - Prepare release notes

3. **Maintenance & Monitoring**
   - Set up CI/CD with test automation
   - Establish code coverage gates
   - Plan ongoing test maintenance

---

## 📝 Notes

- **Dev Server Port:** Tests expect dev server on port 3003 (already configured in playwright.config.ts)
- **Test Data:** Use fixtures to create consistent mock data across tests
- **Error Scenarios:** Prioritize testing error handling paths for reliability
- **Performance:** Some tests may need longer timeouts (E2E file uploads, etc.)
- **Isolation:** Each test should be independent; use beforeEach/afterEach for cleanup

---

**Phase 4 Start Date:** January 21, 2026
**Status:** Ready to Begin
**Estimated Completion:** January 24-25, 2026
