# Test Coverage Review: Add School, Add Coach, Add Interaction Pages

**Review Date:** February 10, 2026
**Reviewer:** Claude Code
**Scope:** Test coverage analysis for `pages/schools/new.vue`, `pages/coaches/new.vue`, and `pages/interactions/add.vue`

---

## Executive Summary

All three "add" pages have **solid E2E test coverage** ensuring critical user flows work end-to-end. However, there are **gaps in component-level unit tests** and **no page-level unit tests** for the pages themselves.

### Coverage Grade by Page

| Page                | E2E Tests    | Component Tests              | Page Unit Tests | Overall Grade |
| ------------------- | ------------ | ---------------------------- | --------------- | ------------- |
| **Add School**      | ✅ Excellent | ✅ Good (SchoolForm)         | ❌ Missing      | **B+**        |
| **Add Coach**       | ✅ Excellent | ❌ Missing (CoachForm)       | ❌ Missing      | **C+**        |
| **Add Interaction** | ✅ Good      | ✅ Good (InteractionAddForm) | ❌ Missing      | **B**         |

---

## 1. Add School Page (`pages/schools/new.vue`)

### ✅ What's Well Tested

#### E2E Tests (`tests/e2e/tier1-critical/schools-crud.spec.ts`)

**Coverage: Excellent (522 lines)**

- **CREATE operations:** 8 comprehensive test scenarios
  - Minimal school creation (required fields only)
  - Complete school with all fields
  - Different divisions (D1, D2, D3, JUCO)
  - Different statuses (researching, contacted, interested, offer_received, declined, committed)
  - Pros and cons addition
  - Special character handling
  - Unicode character support

- **Form validation:** 4 test scenarios
  - Required field validation
  - URL format validation
  - Social media handle format validation

- **Accessibility:** 3 test scenarios
  - Keyboard navigation
  - Form labels and ARIA attributes
  - Screen reader announcements

#### Component Tests (`tests/unit/components/School/SchoolForm.spec.ts`)

**Coverage: Good (32 tests)**

- Form field rendering
- Validation integration
- Data binding
- Auto-fill functionality
- Error handling

#### Supporting Component Tests

- `SchoolAutocomplete.spec.ts` (22 tests) - College search functionality
- `DuplicateSchoolDialog.spec.ts` (12 tests) - Duplicate detection

### ❌ What's Missing

1. **Page-level unit tests** - No tests for `pages/schools/new.vue` itself
   - College Scorecard data fetching logic not unit tested
   - NCAA lookup integration not tested in isolation
   - State management (selectedCollege, autoFilledFields) not tested
   - Error handling for parallel API calls not tested

2. **Component tests for child components:**
   - `SchoolSelect.vue` - No dedicated test file
   - `FormPageLayout.vue` - No dedicated test file

3. **Edge cases not covered:**
   - Network timeout during NCAA/College Scorecard lookups
   - Partial data success (one API succeeds, another fails)
   - Logo loading failures
   - Map coordinate validation

### 🎯 Recommendations

**Priority: LOW** - E2E tests provide sufficient coverage for critical paths

1. Add page-level unit tests for:

   ```typescript
   // tests/unit/pages/schools-new.spec.ts
   - handleCollegeSelect() parallel API logic
   - clearSelection() state reset
   - createSchoolWithData() academic_info mapping
   - Error state handling
   ```

2. Consider adding component test for `SchoolSelect.vue` if reused elsewhere

---

## 2. Add Coach Page (`pages/coaches/new.vue`)

### ✅ What's Well Tested

#### E2E Tests (`tests/e2e/tier1-critical/coaches-crud.spec.ts`)

**Coverage: Excellent (427 lines)**

- **CREATE operations:** 6 comprehensive test scenarios
  - Minimal coach creation
  - Complete coach with all fields
  - Multiple coaches per school
  - Different roles (head, assistant, recruiting)
  - Special character handling
  - XSS prevention (security test)

- **School association:** Tests verify coach-school relationship

### ❌ What's Missing

1. **Component test for CoachForm** - **CRITICAL GAP**
   - No `tests/unit/components/Coach/CoachForm.spec.ts` file exists
   - Form validation not unit tested
   - Field rendering not tested
   - Submit/cancel event emission not tested

2. **Page-level unit tests** - No tests for `pages/coaches/new.vue` itself
   - School selection requirement not unit tested
   - Conditional rendering (form only shows after school selection) not tested
   - Error handling not tested

3. **Component tests for child components:**
   - `SchoolSelect.vue` - No dedicated test file (shared with schools/new)
   - `CoachForm.vue` - **Does not exist**

### 🎯 Recommendations

**Priority: HIGH** - Missing CoachForm component tests is a significant gap

1. **Create CoachForm component tests** (HIGH PRIORITY):

   ```typescript
   // tests/unit/components/Coach/CoachForm.spec.ts
   describe("CoachForm", () => {
     // Form rendering tests
     - should render all required fields (first_name, last_name, email)
     - should render optional fields (phone, title, role)
     - should display validation errors

     // Form validation tests
     - should validate required fields
     - should validate email format
     - should validate phone format (if applicable)

     // Form submission tests
     - should emit submit event with correct data
     - should emit cancel event
     - should disable submit button when loading

     // Edge cases
     - should handle empty initial data
     - should pre-fill form with initial data
     - should sanitize input (XSS prevention)
   });
   ```

2. Add page-level unit tests:
   ```typescript
   // tests/unit/pages/coaches-new.spec.ts
   - School selection requirement
   - Conditional form rendering
   - Navigation after successful creation
   - Error handling for createCoach failures
   ```

---

## 3. Add Interaction Page (`pages/interactions/add.vue`)

### ✅ What's Well Tested

#### E2E Tests

**Coverage: Good (multiple files, ~150+ relevant lines)**

Files covering interaction creation:

- `interaction-detail.spec.ts` - Creates test interactions in beforeEach (lines 36-48)
- `athlete-interactions.spec.ts` - Tests athlete logging interactions (lines 37-73, 93-125)

Test scenarios:

- Email interactions
- Phone call interactions
- In-person visits
- Virtual meetings
- Sentiment tracking
- Direction (inbound/outbound)
- Attachment handling (tested in detail page)
- Long content handling
- Special character escaping

#### Component Tests (`tests/unit/components/Interactions/InteractionAddForm.spec.ts`)

**Coverage: Good (17 tests, 230 lines)**

- **Form rendering:** All required and optional fields
- **Form validation:** Required fields (type, direction, content, occurred_at)
- **Reminder toggle:** Conditional field display
- **File attachments:** Multiple file support
- **Form submission:** Event emission, loading states
- **Coach selection:** Empty coaches handling

### ❌ What's Missing

1. **Page-level unit tests** - No tests for `pages/interactions/add.vue` itself
   - User role-specific title logic not tested (`pageTitle` computed property)
   - Datetime conversion (local → UTC) not unit tested
   - Error handling in handleSubmit not tested
   - Navigation after creation not tested

2. **Component test gaps in InteractionAddForm:**
   - Date picker validation (future dates, past dates)
   - Character limit enforcement (5000 chars for content)
   - File size validation
   - File type validation
   - Multiple attachment handling logic

3. **Edge cases not covered:**
   - Interaction creation with missing school
   - Interaction creation with deleted coach
   - Network timeout during submission
   - Attachment upload failure handling

### 🎯 Recommendations

**Priority: MEDIUM** - Good coverage exists, but page logic needs unit tests

1. Add page-level unit tests:

   ```typescript
   // tests/unit/pages/interactions-add.spec.ts
   describe("Interactions Add Page", () => {
     // User role tests
     - should show "Log My Interaction" for athletes
     - should show "Log Interaction" for parents

     // Datetime handling tests
     - should convert local datetime to UTC ISO string
     - should handle timezone edge cases

     // Form submission tests
     - should navigate to /interactions after success
     - should handle errors gracefully
     - should map sentiment enum correctly

     // Integration tests
     - should call createInteraction with correct data structure
     - should include attachments in creation payload
   });
   ```

2. Enhance InteractionAddForm tests:

   ```typescript
   // Add to existing tests/unit/components/Interactions/InteractionAddForm.spec.ts
   describe("Validation Edge Cases", () => {
     - should enforce 5000 character limit on content
     - should validate file size (if applicable)
     - should validate file types (if applicable)
     - should handle date picker validation
   });

   describe("Reminder Functionality", () => {
     - should validate reminder date is in future
     - should require reminder type when enabled
     - should clear reminder data when disabled
   });
   ```

---

## Cross-Cutting Concerns

### Shared Components with Missing Tests

1. **SchoolSelect.vue** - Used by both add coach and potentially other pages
   - No dedicated test file
   - Recommendation: Create `tests/unit/components/SchoolSelect.spec.ts`

2. **FormPageLayout.vue** - Used by all three add pages
   - No dedicated test file
   - Recommendation: Create `tests/unit/components/FormPageLayout.spec.ts`

### Composables Well-Tested

- `useSchools.spec.ts` ✅ (covered)
- `useCoaches.spec.ts` ✅ (17 tests)
- `useInteractions.spec.ts` ✅ (54 tests + 46 advanced + 9 extended)

---

## Testing Best Practices Observed

### ✅ Strengths

1. **E2E First Approach:** All critical user flows have E2E coverage
2. **Security Testing:** XSS prevention tested in coaches-crud.spec.ts
3. **Accessibility Testing:** Keyboard navigation and ARIA attributes tested
4. **Edge Case Coverage:** Special characters, unicode, long content tested
5. **Fixtures and Helpers:** Good use of reusable test fixtures

### 🔄 Areas for Improvement

1. **Unit Test Coverage:** Page-level logic not unit tested
2. **Component Test Completeness:** CoachForm has no component tests
3. **Integration Tests:** Limited integration tests for composable interactions
4. **Error Scenario Coverage:** Network failures, timeout scenarios under-tested

---

## Action Items Priority Matrix

### 🔴 HIGH PRIORITY

1. **Create CoachForm component tests** - Critical missing component
   - Effort: 2-3 hours
   - Impact: Closes significant test gap
   - File: `tests/unit/components/Coach/CoachForm.spec.ts`

### 🟡 MEDIUM PRIORITY

2. **Add page-level unit tests for interactions/add.vue**
   - Effort: 1-2 hours
   - Impact: Validates datetime conversion and user role logic
   - File: `tests/unit/pages/interactions-add.spec.ts`

3. **Enhance InteractionAddForm validation tests**
   - Effort: 1 hour
   - Impact: Validates character limits and edge cases
   - File: Update existing `tests/unit/components/Interactions/InteractionAddForm.spec.ts`

### 🟢 LOW PRIORITY

4. **Add page-level unit tests for schools/new.vue**
   - Effort: 2 hours
   - Impact: Validates parallel API calls and error handling
   - File: `tests/unit/pages/schools-new.spec.ts`

5. **Add page-level unit tests for coaches/new.vue**
   - Effort: 1 hour
   - Impact: Validates conditional rendering logic
   - File: `tests/unit/pages/coaches-new.spec.ts`

6. **Create SchoolSelect component tests**
   - Effort: 1 hour
   - Impact: Validates shared component used across pages
   - File: `tests/unit/components/SchoolSelect.spec.ts`

7. **Create FormPageLayout component tests**
   - Effort: 30 minutes
   - Impact: Validates layout wrapper used across pages
   - File: `tests/unit/components/FormPageLayout.spec.ts`

---

## Overall Assessment

### Current State: **B Grade (80%)**

**Strengths:**

- Excellent E2E coverage ensures critical paths work
- Component tests exist for SchoolForm and InteractionAddForm
- Security and accessibility considerations tested
- Good use of fixtures and helper functions

**Weaknesses:**

- Missing CoachForm component tests (critical gap)
- No page-level unit tests for any add pages
- Limited integration testing
- Some edge cases and error scenarios under-tested

### Target State: **A- Grade (90%+)**

To achieve A- grade:

1. Complete HIGH priority items (CoachForm tests)
2. Complete MEDIUM priority items (page-level tests)
3. Add 2-3 LOW priority items (shared component tests)

**Estimated Effort:** 8-10 hours total

---

## Conclusion

The add pages have **solid E2E coverage** that validates critical user flows work correctly. The main gaps are at the **component and page unit test levels**, particularly for CoachForm.

**Immediate Action:** Create CoachForm component tests to close the most significant gap. Other improvements can be prioritized based on risk and development velocity.

**Risk Assessment:** LOW - E2E tests provide sufficient safety net for refactoring and feature changes.
