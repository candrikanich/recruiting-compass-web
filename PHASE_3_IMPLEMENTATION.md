# Phase 3 Implementation: Component Migration & Testing

**Status**: 🚀 In Progress  
**Branch**: `refactor/phase-1-query-validation-layer`  
**Target Duration**: 3-5 days  
**Implementation Date**: January 21-26, 2026

---

## 📋 Overview

Phase 3 focuses on **migrating high-traffic components** from Phase 1/2 legacy composables to the new consolidated composables created in Phase 2, along with comprehensive unit testing.

### High Priority Tasks

1. **Migrate Documents Pages** → `useDocumentsConsolidated`
   - `/pages/documents/index.vue` - List & upload
   - `/pages/documents/[id].vue` - Detail view
   - `/pages/documents/view.vue` - Sharing view

2. **Migrate Search Pages** → `useSearchConsolidated`
   - `/pages/search/index.vue` - Advanced search with filters

3. **Add Unit Tests**
   - `tests/unit/composables/useDocumentsConsolidated.spec.ts`
   - `tests/unit/composables/useSearchConsolidated.spec.ts`

4. **Audit & Document** old composables for removal

---

## 🎯 Phase 3 Tasks Breakdown

### Task 1: Migrate `/pages/documents/index.vue`

**Current State**: Uses `useDocuments()` wrapper  
**Target**: Replace with `useDocumentsConsolidated()`

**Changes**:
- Import `useDocumentsConsolidated` instead of `useDocuments`
- Update composable destructuring
- Adjust method/state names to match new API
- Remove deprecated wrapper logic

**Estimated Time**: 30 minutes  
**Priority**: HIGH

---

### Task 2: Migrate `/pages/documents/[id].vue`

**Current State**: Document detail page  
**Target**: Use `useDocumentsConsolidated`

**Changes**:
- Import consolidated composable
- Fetch document by ID
- Handle versioning
- Update sharing interface

**Estimated Time**: 30 minutes  
**Priority**: HIGH

---

### Task 3: Migrate `/pages/documents/view.vue`

**Current State**: Document sharing/viewing page  
**Target**: Use `useDocumentsConsolidated` sharing methods

**Changes**:
- Use `shareDocument` and `revokeAccess` from consolidated composable
- Update permission UI bindings
- Simplify sharing logic

**Estimated Time**: 20 minutes  
**Priority**: HIGH

---

### Task 4: Migrate `/pages/search/index.vue`

**Current State**: Uses multiple old search composables  
**Target**: Replace with `useSearchConsolidated`

**Changes**:
- Import `useSearchConsolidated` (replaces 3 old ones)
- Update search/filter bindings
- Simplify result handling
- Remove old filter management logic

**Estimated Time**: 45 minutes  
**Priority**: HIGH

---

### Task 5: Create Unit Tests for `useDocumentsConsolidated`

**File**: `tests/unit/composables/useDocumentsConsolidated.spec.ts`

**Test Coverage**:
- [ ] Fetch documents (with filters, ordering)
- [ ] Create document (with file upload)
- [ ] Update document (metadata, versioning)
- [ ] Delete document (cleanup)
- [ ] Share document (permissions)
- [ ] Revoke access
- [ ] Document versioning
- [ ] Error handling

**Estimated Time**: 1-2 hours  
**Priority**: MEDIUM

---

### Task 6: Create Unit Tests for `useSearchConsolidated`

**File**: `tests/unit/composables/useSearchConsolidated.spec.ts`

**Test Coverage**:
- [ ] Search all entity types
- [ ] Apply filters (by division, date range, etc.)
- [ ] Fuzzy search functionality
- [ ] Cache management
- [ ] Debouncing
- [ ] Get suggestions (schools, coaches)
- [ ] Error handling
- [ ] Empty results

**Estimated Time**: 1-2 hours  
**Priority**: MEDIUM

---

### Task 7: Audit Old Composables

**Composables to Review**:
- `useDocumentFetch.ts` → Replaced by `useDocumentsConsolidated`
- `useDocumentUpload.ts` → Replaced by `useDocumentsConsolidated`
- `useDocumentSharing.ts` → Replaced by `useDocumentsConsolidated`
- `useEntitySearch.ts` → Replaced by `useSearchConsolidated`
- `useSearchFilters.ts` → Replaced by `useSearchConsolidated`
- `useCachedSearch.ts` → Replaced by `useSearchConsolidated`

**Action**: Mark for deprecation after full migration

**Estimated Time**: 30 minutes  
**Priority**: LOW

---

## 📊 Implementation Checklist

### Phase 3 Milestones

- [ ] **Milestone 1 (Day 1)**: Migrate document pages
  - [ ] `/pages/documents/index.vue`
  - [ ] `/pages/documents/[id].vue`
  - [ ] `/pages/documents/view.vue`
  - [ ] Manual testing (create, read, update, delete, share documents)

- [ ] **Milestone 2 (Day 1-2)**: Migrate search pages
  - [ ] `/pages/search/index.vue`
  - [ ] Test all search types (schools, coaches, interactions, metrics)
  - [ ] Test filters and fuzzy search
  - [ ] Test suggestions (autocomplete)

- [ ] **Milestone 3 (Day 2-3)**: Add comprehensive tests
  - [ ] `useDocumentsConsolidated.spec.ts` (80% coverage)
  - [ ] `useSearchConsolidated.spec.ts` (80% coverage)
  - [ ] All tests passing (`npm run test`)

- [ ] **Milestone 4 (Day 4)**: Validation & Documentation
  - [ ] Manual QA on all migrated pages
  - [ ] Update copilot instructions with new patterns
  - [ ] Document any breaking changes (none expected)
  - [ ] Type-check passes (`npm run type-check`)
  - [ ] No ESLint errors (`npm run lint`)

- [ ] **Milestone 5 (Day 5)**: Final Review
  - [ ] Code review of all changes
  - [ ] Performance comparison (no regressions)
  - [ ] Remove old composables if fully migrated
  - [ ] Merge to main

---

## 🧪 Testing Strategy

### Unit Tests

**Target Coverage**: 80% overall, 90% on critical paths

```
useDocumentsConsolidated.spec.ts:
├── State Management
│   ├── Initial state
│   ├── Loading states
│   └── Error states
├── CRUD Operations
│   ├── Fetch documents
│   ├── Create document
│   ├── Update document
│   └── Delete document
├── Versioning
│   ├── Create version
│   ├── Fetch versions
│   └── Archive old version
├── Sharing
│   ├── Share document
│   ├── Revoke access
│   └── Permission checks
└── File Handling
    ├── File validation
    ├── Upload progress
    └── Error on invalid files

useSearchConsolidated.spec.ts:
├── Search Operations
│   ├── Search schools
│   ├── Search coaches
│   ├── Search interactions
│   └── Search metrics
├── Filtering
│   ├── Filter by type
│   ├── Filter by date range
│   ├── Filter by value range
│   └── Multiple filters
├── Fuzzy Search
│   ├── Fuzzy matching
│   └── Relevance ranking
├── Caching
│   ├── Cache hit
│   ├── Cache miss
│   └── Cache TTL
└── Suggestions
    ├── School suggestions
    └── Coach suggestions
```

### Manual E2E Tests

- [ ] Document upload workflow (with different file types)
- [ ] Document sharing workflow (add/revoke permissions)
- [ ] Search workflow (search → filter → view results)
- [ ] Multi-entity search results
- [ ] Autocomplete suggestions

---

## 🔄 Migration Path Example

### Before (Documents Page - using old composables)

```typescript
const { documents, loading, fetchDocuments, uploadDocument } = useDocuments()
const { uploadDocument: uploadFile } = useDocumentUpload()
const { shareDocument } = useDocumentSharing()

const handleUpload = async () => {
  await uploadFile(selectedFile.value, newDoc.type)
  await fetchDocuments()
}
```

### After (Documents Page - using consolidated composable)

```typescript
const { 
  documents, 
  loading, 
  isUploading,
  fetchDocuments, 
  uploadDocument,
  shareDocument 
} = useDocumentsConsolidated()

const handleUpload = async () => {
  const result = await uploadDocument(selectedFile.value, newDoc.type, newDoc.title)
  if (result.success) {
    // Document added to list automatically
  }
}
```

---

## 📝 Expected Outcomes

### Code Reduction

- **Before**: 6 separate composables (~695 lines)
- **After**: 1 unified composable (~632 lines) + 1 search composable (~588 lines)
- **Reduction**: ~30% total lines (consolidation simplifies usage)

### API Improvements

- Single import per feature (documents, search) vs. 3 per feature
- Consistent error handling
- Integrated validation
- Built-in caching/debouncing

### Testing Coverage

- 80%+ unit test coverage
- 100% critical path coverage
- Full E2E coverage of migration

---

## 🚀 Success Criteria

✅ Phase 3 is complete when:

1. **All migrations done**
   - Documents pages fully migrated
   - Search pages fully migrated
   - No references to old composables in components

2. **Tests passing**
   - `npm run type-check` → ✅
   - `npm run lint` → ✅
   - `npm run test` → ✅ (80%+ coverage)
   - `npm run test:e2e` → ✅ (manual E2E tests)

3. **Performance maintained**
   - No increase in bundle size
   - No performance regressions
   - Load times comparable or faster

4. **Documentation complete**
   - Copilot instructions updated
   - Migration guide documented
   - Breaking changes (none) documented

5. **Code quality**
   - Zero unhandled errors
   - All TypeScript types correct
   - No unused imports/code

---

## 📚 Reference Documentation

- [Phase 1 Refactoring](./PHASE_1_REFACTORING.md) - Query service layer
- [Phase 2 Refactoring](./PHASE_2_REFACTORING.md) - Composable consolidation  
- [API Documentation](./API_ENDPOINT_DOCUMENTATION.md) - Endpoint patterns
- [Copilot Instructions](/.github/copilot-instructions.md) - Architecture & patterns
- [School Testing Plan](./SCHOOL_TESTING_PLAN.md) - Test patterns reference

---

## 🎓 Key Learnings from Phase 1-2

1. **Query Service Layer** - All DB operations go through `querySelect`, `queryInsert`, etc.
2. **Error Handling** - Use `useErrorHandler()` for consistent logging
3. **Type Safety** - Leverage TypeScript strict mode; cast readonly arrays explicitly
4. **Null Handling** - Always account for null returns from query service
5. **Validation** - Use `useFormValidation()` for file validation

---

## 📞 Support & Questions

**Q: How do I know if I'm following the right pattern?**  
A: Reference the `useDocumentsConsolidated` and `useSearchConsolidated` implementations. If your code looks similar, you're on track.

**Q: What if a component uses multiple old composables?**  
A: Check which consolidated composable it should use (likely just one or two), then migrate all related logic together.

**Q: How do I handle breaking changes during migration?**  
A: There are none expected. Old composables remain available (backwards compatible). Migrate gradually.

**Q: Should I delete old composables immediately?**  
A: No. Remove them after confirming all components migrated and tests pass (end of Phase 3).

---

## 🎉 Phase 3 Goals

✅ **Primary**: Migrate high-traffic components to new consolidated composables  
✅ **Secondary**: Add comprehensive unit tests for new composables  
✅ **Tertiary**: Document migration patterns for future components  
✅ **Bonus**: Establish Phase 4 roadmap (if time permits)

---

**Created**: January 21, 2026  
**Status**: Starting Implementation  
**Next Review**: Daily progress check  

