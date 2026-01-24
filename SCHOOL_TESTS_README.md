# School Functionality Testing Suite

## Overview

This document provides a quick reference for implementing comprehensive unit and integration tests for school functionality in the Baseball Recruiting Tracker application.

**Target Coverage:** 80% overall with 90%+ on critical paths
**Status:** Phase 1 Complete - Ready for implementation
**Primary Documentation:** See `SCHOOL_TESTING_PLAN.md` for detailed specifications

---

## Files Included

### Documentation

1. **SCHOOL_TESTING_PLAN.md** (400+ lines)
   - Complete test specifications for all areas
   - 80+ specific test case descriptions
   - Example tests with implementation patterns
   - CI/CD integration guidance
   - Troubleshooting guide

2. **SCHOOL_TESTING_IMPLEMENTATION.md** (300+ lines)
   - Summary of what's been delivered
   - Quick start guide for Chris
   - Implementation roadmap with time estimates
   - Test metrics and coverage targets

3. **SCHOOL_TESTS_README.md** (this file)
   - Quick reference and navigation guide

### Test Code

1. **tests/fixtures/schools.fixture.ts** (283 lines)
   - 20+ factory functions for consistent mock data
   - Profiles: Elite, Mid-tier, Accessible schools
   - Divisions: D1, D2, D3, JUCO
   - Conferences: SEC, Big Ten, ACC, Big 12, AAC, Sun Belt, Mountain West
   - Statuses: Researching, Contacted, Offer Received, Committed
   - Sizes: Small, Medium, Large, Very Large
   - Regions: Northeast, Southeast, West
   - Features: With pros/cons, detailed schools, batch operations

2. **tests/unit/composables/useSchoolMatching.spec.ts** (630 lines)
   - **85 comprehensive test cases**
   - calcul Match Score: 12 tests (weighting, dealbreakers, edge cases)
   - evaluatePreference: 40 tests (division, conference, academics, size, region, state)
   - getAcademicRating: 9 tests (rate bands, defaults, boundaries)
   - getMatchBadge: 8 tests (thresholds, icons, classes)
   - Edge Cases: 16 tests (nulls, missing data, case sensitivity)

---

## Quick Start

### 1. Understand the Architecture

**Three layers of testing:**

```
Unit Tests (Isolated)
├── Composables (useSchools, useSchoolMatching, useSchoolLogos)
├── Stores (useSchoolStore - Pinia)
├── Components (SchoolCard, SchoolLogo, SchoolForm)
├── Utilities (schoolSize, sanitization)
└── API Endpoints (fit-score endpoints)

Integration Tests (Cross-layer)
└── Composable + Store sync

E2E Tests (User workflows)
└── Full school CRUD, matching, filtering
```

### 2. Use Test Fixtures

Instead of creating mock data in each test, use factories:

```typescript
// Import fixtures
import {
  createMockSchool,
  createEliteSchool,
  createSmallSchool,
  createNortheastSchools,
} from "~/tests/fixtures/schools.fixture";

describe("My School Test", () => {
  it("should handle elite schools", () => {
    const school = createEliteSchool();
    expect(school.academic_info?.admission_rate).toBeLessThan(0.15);
  });

  it("should handle multiple regions", () => {
    const schools = createNortheastSchools();
    expect(schools).toHaveLength(3);
  });

  it("should work with custom overrides", () => {
    const school = createMockSchool({
      name: "Custom University",
      division: "D2",
    });
    expect(school.name).toBe("Custom University");
  });
});
```

### 3. Follow Test Patterns from useSchoolMatching

**Pattern 1: Weighted Scoring**

```typescript
it("should calculate weighted score by priority", () => {
  mockSchoolPreferences.preferences = [
    { type: "division", value: ["D1"], priority: 1 }, // weight=10, match
    { type: "division", value: ["D2"], priority: 2 }, // weight=9, miss
  ];
  const result = calculateMatchScore(school);
  expect(result.score).toBe(53); // (10) / (10+9) ≈ 53%
});
```

**Pattern 2: Enumeration Matching**

```typescript
it("should identify Power 4 conferences", () => {
  const power4 = ["SEC", "Big Ten", "Big 12", "ACC"];
  power4.forEach((conf) => {
    const school = createMockSchool({ conference: conf });
    expect(evaluatePreference(school, pref)).toBe(true);
  });
});
```

**Pattern 3: Boundary Testing**

```typescript
it("should handle boundaries correctly", () => {
  expect(getCarnegieSize(999)).toBe("Very Small"); // < 1000
  expect(getCarnegieSize(1000)).toBe("Small"); // >= 1000
  expect(getCarnegieSize(4999)).toBe("Small"); // < 5000
  expect(getCarnegieSize(5000)).toBe("Medium"); // >= 5000
});
```

**Pattern 4: Null/Undefined Safety**

```typescript
it("should handle missing data gracefully", () => {
  const school = createMockSchool({
    academic_info: { enrollment: 10000 }, // no admission_rate
  });
  expect(getAcademicRating(school)).toBe(3); // default
});
```

---

## Implementation Roadmap

### Phase 1 (Now) - COMPLETE ✅

- [x] Comprehensive test plan (SCHOOL_TESTING_PLAN.md)
- [x] Test fixtures (schools.fixture.ts)
- [x] useSchoolMatching tests (85 tests, 630 lines)
- [x] Implementation guide (SCHOOL_TESTING_IMPLEMENTATION.md)

### Phase 2 (Week 1) - PENDING

**Priority: HIGH**

- [ ] **useSchoolLogos.spec.ts** (~150 lines)
  - Cache TTL management
  - Domain extraction
  - Fetch from DB vs API
  - Concurrent fetch prevention

- [ ] **SchoolCard.spec.ts** (~120 lines)
  - Props rendering
  - Click and toggle events
  - Fit score badge coloring
  - Favorite star toggle

- [ ] **SchoolLogo.spec.ts** (~150 lines)
  - Size variants (xs-xl)
  - Loading spinner states
  - Image error fallbacks
  - Icon extraction

- [ ] **schoolSize.spec.ts** (~80 lines)
  - Carnegie size categories
  - Color class mapping
  - Boundary values

**Estimated Time:** 8-10 hours

### Phase 3 (Week 2) - PENDING

**Priority: HIGH**

- [ ] **useSchoolStore.spec.ts** (~200 lines)
  - fetchSchools guard (isFetched)
  - CRUD actions
  - Sanitization on create/update
  - Getters (selectedSchool, filteredSchools)

- [ ] **schools-fit-score.spec.ts** (~150 lines)
  - GET/POST endpoints
  - Authorization & ownership checks
  - Input validation
  - Score calculation & persistence

- [ ] **SchoolForm.spec.ts** (~150 lines)
  - Field rendering
  - Validation errors
  - Auto-fill integration
  - Form submission

**Estimated Time:** 10-12 hours

### Phase 4 (Week 3) - PENDING

**Priority: MEDIUM**

- [ ] **Integration tests** (~200 lines)
  - useSchools + useSchoolStore sync
  - Create → Store sync → UI update
  - Fetch + Filter + Update flows

- [ ] **E2E tests** (~200 lines)
  - Full school CRUD workflows
  - Matching with preferences
  - Batch operations
  - Error recovery

**Estimated Time:** 8-10 hours

**Total Estimated Time:** 26-32 hours for 80%+ coverage

---

## Coverage Targets

### By Component (Priority Order)

| Component         | Lines | Tests  | Target | Status            |
| ----------------- | ----- | ------ | ------ | ----------------- |
| useSchoolMatching | 305   | **85** | 90%    | ✅ COMPLETE       |
| useSchools        | 287   | 40+    | 85%    | EXISTING - Expand |
| useSchoolLogos    | 262   | TBD    | 85%    | PENDING           |
| useSchoolStore    | 420   | TBD    | 85%    | PENDING           |
| schoolSize.ts     | 43    | 15+    | 90%    | PENDING           |
| SchoolCard.vue    | 137   | 15+    | 75%    | PENDING           |
| SchoolLogo.vue    | 205   | 15+    | 75%    | PENDING           |
| SchoolForm.vue    | TBD   | 15+    | 75%    | PENDING           |
| API endpoints     | TBD   | 20+    | 85%    | PENDING           |

### Overall Coverage Goal

```
Phase 1 (Now):      0% → 15% (fixtures + matching done)
Phase 2 (Week 1):   15% → 40% (logos, cards, utilities)
Phase 3 (Week 2):   40% → 65% (store, forms, endpoints)
Phase 4 (Week 3):   65% → 80%+ (integration, E2E, refinement)
```

---

## Key Decision Points

### 1. Fixture Strategy

**Decision:** Centralized mock factories in `schools.fixture.ts`
**Rationale:**

- Eliminates 50%+ of test boilerplate
- Consistent data across all tests
- Easy to maintain and update
- Reusable across phases

**Usage:**

```typescript
// Good: Use fixture factories
const school = createEliteSchool();
const schools = createNortheastSchools();

// Avoid: Inline mock data
const school = { name: "Test", academic_info: { admission_rate: 0.05 } };
```

### 2. Mock Supabase Queries

**Decision:** Mock at test level, not in setup.ts
**Rationale:**

- More control per test
- Clearer test intent
- Easier to test error states
- Avoid global mock pollution

**Pattern:**

```typescript
mockQuery.select.mockResolvedValue({ data: schoolData, error: null });
// For errors:
mockQuery.select.mockResolvedValue({
  data: null,
  error: new Error("Not found"),
});
```

### 3. Test Organization

**Decision:** Mirror source code structure
**Rationale:**

- Easy to locate tests
- Matches user's mental model
- Supports parallel development

**Structure:**

```
Source:     composables/useSchoolMatching.ts
Test:       tests/unit/composables/useSchoolMatching.spec.ts

Source:     components/School/SchoolCard.vue
Test:       tests/unit/components/School/SchoolCard.spec.ts

Source:     server/api/schools/[id]/fit-score.post.ts
Test:       tests/unit/api/schools-fit-score.spec.ts
```

---

## Running Tests

### Development

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- tests/unit/composables/useSchoolMatching.spec.ts

# Run with UI (interactive debugging)
npm run test:ui

# Watch mode (re-run on changes)
npm run test -- --watch

# Run specific test (by name)
npm run test -- --grep "calculateMatchScore"
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### CI/CD

```bash
# Run full test suite (what CI does)
npm run type-check
npm run lint
npm run test -- --run
npm run test:e2e
```

---

## Common Testing Patterns

### Mock Pinia Store

```typescript
beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
  userStore = useUserStore();
  userStore.user = { id: "user-123", email: "test@example.com" };
});
```

### Mock Supabase Query Chain

```typescript
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: school, error: null }),
};
mockSupabase.from.mockReturnValue(mockQuery);
```

### Test Reactive Updates in Components

```typescript
const wrapper = mount(SchoolCard, { props: { school } });
expect(wrapper.text()).toContain("Old Name");

await wrapper.setProps({ school: { ...school, name: "New Name" } });
await wrapper.vm.$nextTick();

expect(wrapper.text()).toContain("New Name");
```

### Test Emitted Events

```typescript
const wrapper = mount(SchoolCard, { props: { school } });

wrapper.find('[data-testid="favorite-btn"]').trigger("click");

expect(wrapper.emitted("toggle")).toBeTruthy();
expect(wrapper.emitted("toggle")).toHaveLength(1);
```

### Batch Testing with describe.each

```typescript
describe.each([
  { size: "xs", pixels: "24px" },
  { size: "sm", pixels: "32px" },
  { size: "md", pixels: "48px" },
])("SchoolLogo sizes", ({ size, pixels }) => {
  it(`should render ${size} variant with ${pixels}`, () => {
    const wrapper = mount(SchoolLogo, { props: { size } });
    expect(wrapper.vm.sizePixels).toBe(pixels);
  });
});
```

---

## Troubleshooting

### Issue: Tests Not Found

```
Error: No test files found, exiting with code 1
```

**Solution:** Check vitest.config.ts exclude/include patterns. useSchools.spec.ts is excluded in current config.

### Issue: Mock Not Working

```
TypeError: Cannot read property 'from' of undefined
```

**Solution:** Ensure beforeEach sets up mocks. Call `vi.clearAllMocks()` in afterEach.

### Issue: Async State Not Updated

```
AssertionError: expected [] to have length 1
```

**Solution:** Call `await wrapper.vm.$nextTick()` after state changes or use `await expect().resolves.toContain()`.

### Issue: Flaky Concurrent Tests

```
Random test failures intermittently
```

**Solution:** Check for shared state. Use beforeEach to reset. Mock Date/timers if using timestamps.

### Issue: TypeScript Errors in Tests

```
Property 'mockResolvedValue' does not exist
```

**Solution:** Ensure `vi.fn()` is typed correctly or use `as any` temporarily. Import types from vitest.

---

## Files Summary

### Delivered

| File                                             | Size      | Purpose                        |
| ------------------------------------------------ | --------- | ------------------------------ |
| SCHOOL_TESTING_PLAN.md                           | 400 lines | Complete test specification    |
| SCHOOL_TESTING_IMPLEMENTATION.md                 | 300 lines | Implementation guide & roadmap |
| SCHOOL_TESTS_README.md                           | 400 lines | This quick reference           |
| tests/fixtures/schools.fixture.ts                | 283 lines | 20+ mock factories             |
| tests/unit/composables/useSchoolMatching.spec.ts | 630 lines | 85 comprehensive tests         |

**Total:** 2,000+ lines of test documentation and code

### Next Implementation

- [ ] useSchoolLogos tests (~150 lines)
- [ ] SchoolCard tests (~120 lines)
- [ ] SchoolLogo tests (~150 lines)
- [ ] schoolSize tests (~80 lines)
- [ ] useSchoolStore tests (~200 lines)
- [ ] API endpoint tests (~150 lines)
- [ ] SchoolForm tests (~150 lines)
- [ ] Integration tests (~200 lines)
- [ ] E2E tests (~200 lines)

**Estimated Total:** 1,200+ lines of new tests

---

## References

### Test Files

- **Plan:** Read `SCHOOL_TESTING_PLAN.md` section 2-6 for detailed specs
- **Implementation:** Reference `tests/unit/composables/useSchoolMatching.spec.ts` for patterns
- **Fixtures:** Use factories from `tests/fixtures/schools.fixture.ts`

### Code References

- **useSchoolMatching:** `composables/useSchoolMatching.ts` (305 lines)
- **useSchools:** `composables/useSchools.ts` (287 lines)
- **useSchoolLogos:** `composables/useSchoolLogos.ts` (262 lines)
- **useSchoolStore:** `stores/schools.ts` (420 lines)
- **SchoolCard:** `components/School/SchoolCard.vue` (137 lines)
- **SchoolLogo:** `components/School/SchoolLogo.vue` (205 lines)

### External Resources

- Vitest: https://vitest.dev
- Vue Test Utils: https://test-utils.vuejs.org
- Pinia Testing: https://pinia.vuejs.org/cookbook/testing.html

---

## Support & Questions

### For Implementation Questions

1. Check the relevant section in `SCHOOL_TESTING_PLAN.md`
2. Reference similar tests in `useSchoolMatching.spec.ts`
3. Use fixture factories from `schools.fixture.ts`
4. Review existing tests in `tests/unit/composables/useSchools.spec.ts`

### For Setup/Config Issues

1. Verify vitest.config.ts includes test directory
2. Check that mocks are set up in beforeEach()
3. Ensure tests are isolated and don't share state

### For Failures/Blockers

1. Run test in isolation: `npm run test -- --grep "specific test name"`
2. Check error message for clues (mock not called? Wrong value?)
3. Add console.log to debug state
4. Run with `--reporter=verbose` for detailed output

---

## Success Criteria

- [x] Test plan complete and comprehensive
- [x] Fixture factories ready for use
- [x] useSchoolMatching tests complete (85 tests)
- [x] Documentation clear and actionable
- [ ] All unit test suites implemented
- [ ] Coverage ≥ 80%
- [ ] All tests passing in CI
- [ ] No flaky tests

---

## Next Action Items

1. **Review Documentation** (30 min)
   - Read SCHOOL_TESTING_PLAN.md (overview)
   - Skim SCHOOL_TESTING_IMPLEMENTATION.md (roadmap)

2. **Examine Existing Tests** (30 min)
   - Run `npm run test:ui`
   - Browse useSchoolMatching tests
   - Check fixture factories

3. **Implement Phase 2** (8-10 hours)
   - Start with useSchoolLogos
   - Follow patterns from useSchoolMatching
   - Use fixtures liberally
   - Run tests continuously

4. **Track Progress**
   - Update this file with completion status
   - Monitor coverage growth
   - Flag any blockers early

---

**Ready to test school functionality comprehensively!**
