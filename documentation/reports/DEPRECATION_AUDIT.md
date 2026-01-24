# Deprecation Audit Report: Phase 4

**Date:** January 21, 2026  
**Status:** Audit Complete  
**Total Deprecated Composables Found:** 8  
**Total Usage Locations:** 25 matches

---

## 📋 Executive Summary

This audit identifies all remaining uses of deprecated composables that should be migrated to their Phase 3 consolidated replacements.

### Deprecated Composables

| Composable              | Status     | Replacement                | Usages  | Priority |
| ----------------------- | ---------- | -------------------------- | ------- | -------- |
| `useDocuments`          | DEPRECATED | `useDocumentsConsolidated` | 3       | HIGH     |
| `useDocumentFetch`      | DEPRECATED | `useDocumentsConsolidated` | 2       | HIGH     |
| `useDocumentUpload`     | DEPRECATED | `useDocumentsConsolidated` | 2       | HIGH     |
| `useDocumentSharing`    | DEPRECATED | `useDocumentsConsolidated` | 2       | HIGH     |
| `useDocumentValidation` | DEPRECATED | `useFormValidation`        | 1 (ref) | MEDIUM   |
| `useSearch`             | DEPRECATED | `useSearchConsolidated`    | 3       | HIGH     |
| `useSearchFilters`      | DEPRECATED | `useSearchConsolidated`    | 1 (ref) | MEDIUM   |
| `useEntitySearch`       | DEPRECATED | `useSearchConsolidated`    | 2       | HIGH     |

---

## 🔍 Detailed Usage Analysis

### 1. useDocuments (Wrapper Composable)

**Status:** DEPRECATED - Replace with `useDocumentsConsolidated`  
**Usages Found:** 3

#### Location 1: pages/schools/[id]/index.vue (Line 429)

```typescript
const { documents, fetchDocuments } = useDocuments();
```

**Migration Path:**

```typescript
// OLD
const { documents, fetchDocuments } = useDocuments();

// NEW
const { documents, fetchDocuments } = useDocumentsConsolidated();
```

**Priority:** HIGH - User-facing page

#### Location 2: pages/dashboard.vue (Line 157)

```typescript
const documentsComposable = useDocuments();
```

**Migration Path:**

```typescript
// OLD
const documentsComposable = useDocuments();

// NEW
const {
  documents,
  uploadDocument,
  shareDocument,
  // ... other methods
} = useDocumentsConsolidated();
```

**Priority:** HIGH - Dashboard component

#### Location 3: components/Dashboard/RecentDocuments.vue (Line 66)

```typescript
documentsComposable = useDocuments();
```

**Migration Path:** Same as above  
**Priority:** HIGH - User-facing component

---

### 2. useDocumentFetch

**Status:** DEPRECATED - Use `useDocumentsConsolidated.fetchDocuments()`  
**Usages Found:** 2

#### Location 1: composables/useDocuments.ts (Line 37)

```typescript
const fetch = useDocumentFetch();
```

**Context:** This is the wrapper composable that uses the deprecated method
**Migration Path:**

```typescript
// OLD (in useDocuments.ts)
const fetch = useDocumentFetch();

// This file should be deprecated, migrate callers to useDocumentsConsolidated
```

**Priority:** HIGH - This is internal to deprecated wrapper

#### Location 2: tests/unit/composables/useDocuments.spec.ts

```typescript
// Multiple test references to useDocuments which internally uses useDocumentFetch
```

**Migration Path:** Update tests to use `useDocumentsConsolidated`  
**Priority:** MEDIUM - Test file only

---

### 3. useDocumentUpload

**Status:** DEPRECATED - Use `useDocumentsConsolidated.uploadDocument()`  
**Usages Found:** 2

#### Location 1: composables/useDocuments.ts (Line 38)

```typescript
const upload = useDocumentUpload();
```

**Context:** Internal to deprecated wrapper  
**Priority:** HIGH

#### Location 2: tests/unit/composables/useDocuments.spec.ts

```typescript
// Test references
```

**Priority:** MEDIUM - Test only

---

### 4. useDocumentSharing

**Status:** DEPRECATED - Use `useDocumentsConsolidated.shareDocument()`  
**Usages Found:** 2

#### Location 1: composables/useDocuments.ts (Line 39)

```typescript
const sharing = useDocumentSharing();
```

**Context:** Internal to deprecated wrapper  
**Priority:** HIGH

#### Location 2: tests/unit/composables/useDocuments.spec.ts

```typescript
// Test references
```

**Priority:** MEDIUM - Test only

---

### 5. useDocumentValidation

**Status:** DEPRECATED - Use `useFormValidation` instead  
**Usages Found:** 1 (reference only)

#### Location: composables/useFormValidation.ts (Line 9)

```typescript
 * - useDocumentValidation() for file uploads
```

**Context:** Documentation comment mentioning the old method  
**Migration Path:**

```typescript
// OLD (in docs)
 * - useDocumentValidation() for file uploads

// NEW (in docs)
 * - useFormValidation().validateFile() for file uploads
```

**Priority:** LOW - Documentation only

---

### 6. useSearch

**Status:** DEPRECATED - Replace with `useSearchConsolidated`  
**Usages Found:** 3

#### Location 1: composables/useSearch.ts (Lines 13, 18, 19)

```typescript
 * const { performSearch, filters, clearFilters } = useSearch()

export const useSearch = () => {
  const entitySearch = useEntitySearch()
  const filterMgmt = useSearchFilters()
```

**Context:** This is the wrapper composable  
**Migration Path:** Deprecated wrapper - callers should use `useSearchConsolidated` directly  
**Priority:** HIGH - Wrapper composable

#### Location 2: composables/useCachedSearch.ts (Line 9)

```typescript
const searchComposable = useSearch();
```

**Migration Path:**

```typescript
// OLD
const searchComposable = useSearch();

// NEW
const searchComposable = useSearchConsolidated();
```

**Priority:** HIGH - Used by caching composable

#### Location 3: tests/integration/phase4.integration.spec.ts

```typescript
const search = useSearch();
```

**Priority:** MEDIUM - Test file

---

### 7. useSearchFilters

**Status:** DEPRECATED - Use `useSearchConsolidated.filters` and methods  
**Usages Found:** 1 (reference only)

#### Location: composables/useSearchFilters.ts (Line 11)

```typescript
 * const { filters, applyFilter, clearFilters, isFiltering } = useSearchFilters()
```

**Context:** Documentation/reference in the deprecated file itself  
**Migration Path:**

```typescript
// OLD
const { filters, applyFilter, clearFilters } = useSearchFilters();

// NEW
const { filters, applyFilter, clearFilters } = useSearchConsolidated();
```

**Priority:** LOW - File is deprecated anyway

---

### 8. useEntitySearch

**Status:** DEPRECATED - Use `useSearchConsolidated` for multi-entity search  
**Usages Found:** 2

#### Location 1: composables/useSearch.ts (Line 18)

```typescript
const entitySearch = useEntitySearch();
```

**Context:** Internal to deprecated wrapper  
**Priority:** HIGH

#### Location 2: composables/useEntitySearch.ts (Line 15)

```typescript
 * const { performSearch, schoolResults, isSearching } = useEntitySearch()
```

**Context:** Documentation reference in the file itself  
**Priority:** LOW - Documentation only

---

## 📊 Migration Summary by Location

### Pages (2 HIGH Priority)

- `pages/schools/[id]/index.vue` - Line 429
- `pages/dashboard.vue` - Line 157

### Components (1 HIGH Priority)

- `components/Dashboard/RecentDocuments.vue` - Line 66

### Composables (6 HIGH Priority)

- `composables/useDocuments.ts` - Lines 15, 37-39 (wrapper composable - deprecate)
- `composables/useSearch.ts` - Lines 13, 18-19 (wrapper composable - deprecate)
- `composables/useCachedSearch.ts` - Line 9
- `composables/useEntitySearch.ts` - File itself (deprecate)
- `composables/useSearchFilters.ts` - File itself (deprecate)

### Tests (4 MEDIUM Priority)

- `tests/unit/composables/useDocuments.spec.ts` - Multiple lines
- `tests/unit/composables/useSearch.spec.ts` - Line 8
- `tests/integration/phase4.integration.spec.ts` - Lines 175, 382

---

## 🛠️ Migration Plan

### Phase 1: Update Pages (Immediate)

**Files to Update:**

1. `pages/schools/[id]/index.vue` - Replace `useDocuments()` with `useDocumentsConsolidated()`
2. `pages/dashboard.vue` - Replace `useDocuments()` with `useDocumentsConsolidated()`
3. `components/Dashboard/RecentDocuments.vue` - Replace `useDocuments()` with `useDocumentsConsolidated()`

**Time Estimate:** 15-20 minutes

### Phase 2: Update Composables (Immediate)

**Files to Update:**

1. `composables/useCachedSearch.ts` - Replace `useSearch()` with `useSearchConsolidated()`

**Files to Deprecate:**

1. `composables/useDocuments.ts` - Mark as deprecated, add warning
2. `composables/useSearch.ts` - Mark as deprecated, add warning
3. `composables/useEntitySearch.ts` - Mark as deprecated, add warning
4. `composables/useSearchFilters.ts` - Mark as deprecated, add warning
5. `composables/useDocumentFetch.ts` - Mark as deprecated, add warning
6. `composables/useDocumentUpload.ts` - Mark as deprecated, add warning
7. `composables/useDocumentSharing.ts` - Mark as deprecated, add warning
8. `composables/useDocumentValidation.ts` - Mark as deprecated (consolidated into useFormValidation)

**Time Estimate:** 20-25 minutes

### Phase 3: Update Tests (Follow-up)

**Files to Update:**

1. `tests/unit/composables/useDocuments.spec.ts` - Update or remove (deprecated composable)
2. `tests/unit/composables/useSearch.spec.ts` - Update to test `useSearchConsolidated`
3. `tests/integration/phase4.integration.spec.ts` - Update to use new composables

**Time Estimate:** 15-20 minutes

### Phase 4: Add Deprecation Warnings (Final)

Add console.warn() to deprecated composables with migration guidance

**Time Estimate:** 10-15 minutes

---

## 📋 Deprecation Implementation Checklist

### Step 1: Add Deprecation Warnings to Composables

- [ ] `composables/useDocuments.ts` - Add warning with migration path
- [ ] `composables/useSearch.ts` - Add warning with migration path
- [ ] `composables/useEntitySearch.ts` - Add warning
- [ ] `composables/useSearchFilters.ts` - Add warning
- [ ] `composables/useDocumentFetch.ts` - Add warning
- [ ] `composables/useDocumentUpload.ts` - Add warning
- [ ] `composables/useDocumentSharing.ts` - Add warning

### Step 2: Update Production Code (Pages/Components)

- [ ] `pages/schools/[id]/index.vue` - Migrate to `useDocumentsConsolidated`
- [ ] `pages/dashboard.vue` - Migrate to `useDocumentsConsolidated`
- [ ] `components/Dashboard/RecentDocuments.vue` - Migrate to `useDocumentsConsolidated`
- [ ] `composables/useCachedSearch.ts` - Migrate to `useSearchConsolidated`

### Step 3: Update Tests

- [ ] `tests/unit/composables/useDocuments.spec.ts` - Update for deprecated composable
- [ ] `tests/unit/composables/useSearch.spec.ts` - Update to use new composable
- [ ] `tests/integration/phase4.integration.spec.ts` - Update to use new composables

### Step 4: Documentation

- [ ] Update PHASE_3_IMPLEMENTATION.md with deprecation notice
- [ ] Create migration guide document
- [ ] Update code comments

---

## 🎯 Migration Code Examples

### Example 1: Page Update (useDocuments → useDocumentsConsolidated)

**Before:**

```typescript
import { useDocuments } from "#app";

const { documents, fetchDocuments } = useDocuments();

onMounted(() => {
  fetchDocuments();
});
```

**After:**

```typescript
import { useDocumentsConsolidated } from "#app";

const { documents, fetchDocuments } = useDocumentsConsolidated();

onMounted(() => {
  fetchDocuments();
});
```

### Example 2: Composable Update (useSearch → useSearchConsolidated)

**Before:**

```typescript
import { useSearch } from "#app";

export const useCachedSearch = () => {
  const { performSearch, filters } = useSearch();

  return { performSearch, filters };
};
```

**After:**

```typescript
import { useSearchConsolidated } from "#app";

export const useCachedSearch = () => {
  const { performSearch, filters } = useSearchConsolidated();

  return { performSearch, filters };
};
```

### Example 3: Deprecation Warning

**Add to deprecated composables:**

```typescript
export const useDocuments = () => {
  console.warn(
    "[DEPRECATED] useDocuments is deprecated as of Phase 4. " +
      "Use useDocumentsConsolidated() instead. " +
      "Migration guide: docs/phase-4/DEPRECATION_GUIDE.md",
  );

  // ... rest of implementation
};
```

---

## 📊 Risk Assessment

### High Risk Changes

- Pages: 3 locations (user-facing, high impact)
- Core composables: 2 wrapper files

**Mitigation:** Run E2E tests after changes to verify

### Medium Risk Changes

- Caching composable: 1 location (used in search)
- Tests: 4 locations

**Mitigation:** Update tests alongside code changes

### Low Risk Changes

- Documentation references: 2 locations
- Comments: 1 location

**Mitigation:** Update during code review

---

## ✅ Deprecation Timeline

| Phase     | Task                     | Time          | Status    |
| --------- | ------------------------ | ------------- | --------- |
| 1         | Add deprecation warnings | 10-15 min     | READY     |
| 2         | Update production code   | 20-25 min     | READY     |
| 3         | Update tests             | 15-20 min     | READY     |
| 4         | Final verification       | 10-15 min     | READY     |
| **TOTAL** | **All Tasks**            | **55-75 min** | **READY** |

---

## 📝 Summary

**Total Deprecated Composables:** 8
**Total Usage Locations:** 25 matches
**Migration Complexity:** LOW (mostly direct replacements)
**Estimated Migration Time:** 1-1.5 hours
**Risk Level:** LOW (well-tested replacements exist)

**Ready to proceed with:**

1. Adding deprecation warnings
2. Updating production code
3. Updating tests
4. Final verification

---

**Audit Date:** January 21, 2026  
**Audit Status:** ✅ COMPLETE  
**Migration Status:** Ready to implement  
**Next Steps:** Execute deprecation warnings and code updates
