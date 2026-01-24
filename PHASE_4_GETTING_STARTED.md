# Phase 4 Testing - Getting Started Guide

## 🚀 Quick Start

Phase 4 testing is now ready to begin! Here's what's been set up:

### What's Complete ✅

1. **Phase 4 Testing Plan** (`PHASE_4_TESTING.md`)
   - Comprehensive testing strategy
   - 3 priority areas: Unit Tests, E2E Tests, Deprecation Audit
   - 25-30 hours of detailed implementation guidance

2. **Test Fixtures** (`tests/fixtures/`)
   - ✅ `documents.fixture.ts` - Mock documents, versions, shares, files
   - ✅ `search.fixture.ts` - Mock search results, filters, state
   - ✅ `index.ts` - Centralized fixture exports

3. **Test Directories** (`tests/`)
   - ✅ `tests/unit/composables/` - Ready for composable tests
   - ✅ `tests/integration/` - Ready for component integration tests
   - ✅ `tests/fixtures/` - All mock data factories

### What's Next 🎯

Choose your starting point:

**Option A: Start with Unit Tests (Recommended)**

```bash
# Create useDocumentsConsolidated tests first
touch tests/unit/composables/useDocumentsConsolidated.spec.ts

# Reference the template in PHASE_4_TESTING.md Section 3.2
# Expected: 25-30 test cases covering CRUD, file ops, sharing, errors
# Time: 2-3 hours
```

**Option B: Start with E2E Tests**

```bash
# Create document CRUD E2E tests
touch tests/e2e/documents-crud.spec.ts

# Reference the template in PHASE_4_TESTING.md Section 2.1
# Expected: 8-10 test scenarios
# Time: 1.5-2 hours
```

**Option C: Start with Deprecation Audit**

```bash
# Run the deprecation audit
grep -r "useDocuments()" composables/ pages/ components/ --include="*.ts" --include="*.vue" | grep -v "useDocumentsConsolidated"

# Reference the audit guide in PHASE_4_TESTING.md Section 3.1
# Time: 2-3 hours
```

---

## 📊 Test Structure Overview

```
tests/
├── fixtures/                    ✅ READY
│   ├── documents.fixture.ts     ✅ Document factories
│   ├── search.fixture.ts        ✅ Search factories
│   └── index.ts                 ✅ Centralized exports
│
├── unit/
│   └── composables/             ✅ READY
│       ├── useDocumentsConsolidated.spec.ts    ⏳ CREATE
│       └── useSearchConsolidated.spec.ts       ⏳ CREATE
│
├── integration/                 ✅ READY
│   └── document-components.spec.ts             ⏳ CREATE
│
└── e2e/
    ├── documents-crud.spec.ts                  ⏳ CREATE
    ├── documents-sharing.spec.ts               ⏳ CREATE
    └── search-workflows.spec.ts                ⏳ CREATE
```

---

## 🔧 Using Test Fixtures

**Import fixtures in your tests:**

```typescript
import {
  createMockDocument,
  createMockDocuments,
  createMockDocumentVersion,
  createMockDocumentShare,
  createMockFile,
  createMockSearchResult,
  createMockSearchResults,
} from "~/tests/fixtures";

describe("My Test", () => {
  it("should work with mock data", () => {
    // Create single document
    const doc = createMockDocument({ title: "Custom Title" });

    // Create multiple documents
    const docs = createMockDocuments(5);

    // Create mock file for upload tests
    const file = createMockFile("PDF content", "test.pdf");

    // Create search results
    const results = createMockSearchResults(10);
  });
});
```

---

## 📋 Phase 4 Checklist

### Unit Tests

- [ ] useDocumentsConsolidated tests (25-30 tests)
- [ ] useSearchConsolidated tests (20-25 tests)
- [ ] Component integration tests (15-20 tests)
- [ ] Achieve 80%+ coverage

### E2E Tests

- [ ] Document CRUD workflows (8-10 tests)
- [ ] Document sharing workflows (5-7 tests)
- [ ] Search workflows (5-8 tests)

### Deprecation Audit

- [ ] Audit deprecated composables
- [ ] Create deprecation warnings
- [ ] Document DEPRECATION_AUDIT.md

### Final Verification

- [ ] All tests passing
- [ ] Coverage reports generated
- [ ] No TypeScript errors
- [ ] No linting errors

---

## 🛠️ Test Commands

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/composables/useDocumentsConsolidated.spec.ts

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run E2E tests (requires dev server on port 3003)
npm run dev &
npm run test:e2e

# Run single E2E file
npm run test:e2e -- tests/e2e/documents-crud.spec.ts

# Interactive E2E debugging
npm run test:e2e:ui
```

---

## 📖 Documentation

**Main Reference:** [PHASE_4_TESTING.md](./PHASE_4_TESTING.md)

**Sections:**

1. **Phase 4 Overview** - Goals and scope
2. **Test Implementation Priority** - 3 priority areas
3. **Test Implementation Steps** - Step-by-step guide
4. **Testing Metrics** - Coverage targets and measurement
5. **Completion Checklist** - Success criteria
6. **Next Steps** - Phase 5 planning

---

## 💡 Pro Tips

1. **Start Small:** Begin with one test file and expand from there
2. **Use Fixtures:** Always use mock data factories for consistency
3. **Test in Isolation:** Each test should be independent
4. **Check Coverage:** Run `npm run test:coverage` to see gaps
5. **Debug with UI:** Use `npm run test:ui` for interactive debugging
6. **Commit Often:** Save progress with meaningful commits

---

## ⚠️ Common Issues & Solutions

**Issue: "Cannot find module" when importing fixtures**

```
Solution: Ensure import path is correct
✅ import { createMockDocument } from '~/tests/fixtures'
❌ import { createMockDocument } from '../../../tests/fixtures'
```

**Issue: Tests timeout on E2E**

```
Solution: Increase timeout or check dev server is running
npm run dev    # Start on port 3003
npm run test:e2e:ui  # Use UI mode to debug
```

**Issue: Coverage not meeting targets**

```
Solution: Run coverage report and identify gaps
npm run test:coverage
# Check report at coverage/index.html
```

---

## 🎯 Next Phase (Phase 5)

Once Phase 4 testing is complete:

1. **Full Deprecation Removal**
   - Delete old composables entirely
   - Migrate any remaining uses
   - Update all imports

2. **Final Documentation**
   - Update testing guide with new patterns
   - Create migration guide for v2.0.0
   - Generate final coverage report

3. **Release Preparation**
   - Tag v2.0.0-beta
   - Prepare release notes
   - Set up CI/CD automation

---

## 📞 Need Help?

- Check [PHASE_4_TESTING.md](./PHASE_4_TESTING.md) for detailed examples
- Review existing test files for patterns
- Use `npm run test:ui` for interactive debugging
- Check test coverage reports for areas needing attention

---

**Status:** Phase 4 Testing Ready to Begin
**Start Date:** January 21, 2026
**Fixtures Created:** ✅ Complete
**Next Step:** Create first test file (useDocumentsConsolidated)
