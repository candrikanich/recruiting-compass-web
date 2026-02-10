# E2E Test Coverage Review: School Detail Page

**Date:** 2026-02-09
**Page:** `/pages/schools/[id]/index.vue`
**Status:** ⚠️ Partial Coverage - Significant Gaps

---

## Executive Summary

The school detail page has **partial E2E test coverage** with solid testing of core CRUD operations, fit score display, status tracking, and coaching philosophy. However, **12+ major features lack E2E coverage**, including document management, status history, division recommendations, private notes, and several sidebar features.

**Coverage Estimate:** ~40% of features tested

---

## Features Covered ✅

### 1. CRUD Operations (`schools-crud.spec.ts`)

**Coverage:** Comprehensive (90%+)

**Tested Scenarios:**

- ✅ Creating schools with minimal/complete data
- ✅ Creating schools for different divisions (D1, D2, D3, JUCO)
- ✅ Creating schools with different statuses
- ✅ Adding pros and cons during creation
- ✅ Handling special characters and unicode in names
- ✅ Displaying school detail page with all information
- ✅ Navigation between schools list and detail pages
- ✅ Updating basic school information
- ✅ Updating division and status
- ✅ Adding and updating pros/cons
- ✅ Updating social media information
- ✅ Canceling edit operations
- ✅ Deleting schools with confirmation dialog
- ✅ Canceling delete operations
- ✅ Form validation (required fields, URL format, social media formats)
- ✅ Keyboard navigation
- ✅ Form labels and ARIA attributes
- ✅ Screen reader announcements

**Missing:**

- ❌ Edit mode for basic information (address, website) using "Edit" toggle
- ❌ College data lookup button functionality
- ❌ Cascade delete with related records (coaches, interactions)

---

### 2. Fit Score Display (`schools-fit-score-display.spec.ts`)

**Coverage:** Good (80%)

**Tested Scenarios:**

- ✅ Displaying fit score badges on list view
- ✅ Color coding (green ≥70, orange 50-69, red <50)
- ✅ Navigating to detail page to view fit analysis
- ✅ Showing fit score breakdown
- ✅ Expanding/collapsing breakdown
- ✅ Displaying all 4 fit dimensions (Athletic, Academic, Opportunity, Personal)
- ✅ Showing dimension scores with correct max values (40, 25, 20, 15)
- ✅ Displaying recommendation message based on tier

**Missing:**

- ❌ Verifying score calculation accuracy
- ❌ Testing score recalculation when preferences change

---

### 3. Status Tracking (`schools-status-tracking.spec.ts`)

**Coverage:** Good (85%)

**Tested Scenarios:**

- ✅ Displaying 9 recruiting status options
- ✅ Changing school status
- ✅ Recording status change timestamp
- ✅ Maintaining status and priority tier independently
- ✅ Supporting all status transitions
- ✅ Handling status changes with network latency
- ✅ Preventing concurrent status updates
- ✅ Handling status update errors gracefully

**Missing:**

- ❌ Verifying status history card displays all changes
- ❌ Testing status filter on schools list page

---

### 4. Coaching Philosophy (`coaching-philosophy.spec.ts`)

**Coverage:** Excellent (95%)

**Tested Scenarios:**

- ✅ Section presence on school detail page
- ✅ Edit button functionality
- ✅ Toggling edit mode
- ✅ Displaying Save and Cancel buttons in edit mode
- ✅ Canceling edits returns to view mode
- ✅ Accepting text input in fields
- ✅ Supporting special characters
- ✅ Supporting multiline text
- ✅ Correct section positioning on page
- ✅ Displaying field labels (Coaching Style, Recruiting Approach, etc.)

**Missing:**

- ❌ Saving coaching philosophy and persisting changes
- ❌ Validation of coaching philosophy fields

---

## Critical Gaps (Not Covered) ❌

### 5. Document Management (`SchoolDocumentsCard`)

**Coverage:** 0%

**Missing Tests:**

- Document upload functionality
- Document display/listing
- Document download
- Document deletion
- Document sharing with schools
- Document metadata display (name, size, upload date)
- Error handling (file too large, invalid format)

---

### 6. Status History (`SchoolStatusHistory`)

**Coverage:** 0%

**Missing Tests:**

- Displaying historical status changes
- Showing timestamps for each status change
- Showing who made each status change
- Filtering/sorting status history
- Empty state when no history exists

---

### 7. Division Recommendations (`DivisionRecommendationCard`)

**Coverage:** 0%

**Missing Tests:**

- Card appears when `shouldConsiderOtherDivisions` is true
- Displays recommended divisions based on fit score
- Provides rationale for recommendations
- Allows dismissing recommendations
- Links to filter schools by recommended divisions

---

### 8. Notes Management (`SchoolNotesCard`)

**Coverage:** Component tests only, no E2E

**Missing E2E Tests:**

- Editing shared notes (visible to all family members)
- Editing private notes (visible only to user)
- Toggling between shared and private notes
- Saving notes successfully
- Handling concurrent note edits
- Displaying note last updated timestamp
- Showing who last updated shared notes

---

### 9. School Sidebar Features (`SchoolSidebar`)

**Coverage:** Minimal (20%)

**Tested:**

- ✅ Delete button (in CRUD tests)

**Missing:**

- Displaying coaches list
- "Add Coach" button functionality
- "Contact Coach" functionality
- Email modal trigger
- Navigation to coaches tab
- Navigation to interactions tab
- Displaying school statistics (interactions count, coaches count)
- Quick actions (favorite, priority tier)

---

### 10. Favorite Toggle

**Coverage:** Partial (mentioned in CRUD test but not thoroughly tested)

**Missing Tests:**

- Toggling favorite on/off
- Favorite icon state changes
- Favorite persists across page reloads
- Favorite syncs across family members
- Filtering schools by favorite status

---

### 11. Priority Tier Management

**Coverage:** Minimal (mentioned in status tracking test)

**Missing Tests:**

- Setting priority tier (A, B, C, None)
- Priority tier badge display
- Priority tier persists across page reloads
- Changing priority tier updates school card in list view
- Filtering schools by priority tier

---

### 12. Basic Information Edit Mode

**Coverage:** 0%

**Missing Tests:**

- Toggling edit mode for basic info section
- Editing address field
- Editing website field
- "Lookup College Data" button functionality
- Auto-populating fields from college data API
- Saving basic information changes
- Canceling basic information edits
- Validation of address and website fields

---

### 13. Distance Display

**Coverage:** 0%

**Missing Tests:**

- Displaying distance from home location
- Distance calculation accuracy
- Handling missing home location
- Handling missing school coordinates
- Distance unit display (miles)

---

### 14. Navigation to Related Pages

**Coverage:** 0%

**Missing Tests:**

- "Coaches" tab navigation
- "Interactions" tab navigation
- "Back to Schools" link functionality
- Deep linking to school detail page
- Preserving scroll position when navigating back

---

### 15. Email Modal

**Coverage:** 0%

**Missing Tests:**

- Opening email modal from sidebar
- Pre-populating recipient email from first coach
- Pre-populating subject line
- Pre-populating body text
- Sending email
- Closing email modal
- Validation of email fields

---

### 16. Academic Information Display

**Coverage:** 0%

**Missing Tests:**

- Displaying student size (enrollment)
- Displaying Carnegie size classification
- Displaying admission rate
- Displaying tuition (in-state, out-of-state)
- Displaying GPA requirement
- Displaying location (city, state)
- Displaying coordinates

---

### 17. Social Media Links

**Coverage:** 0%

**Missing Tests:**

- Displaying Twitter link (if present)
- Displaying Instagram link (if present)
- Displaying website link
- Links open in new tab
- Handling missing social media links

---

### 18. Loading and Error States

**Coverage:** Partial

**Tested:**

- ✅ Loading state display (spinner and message)
- ✅ "School not found" error state

**Missing:**

- Error state for failed API calls
- Error state for failed fit score calculation
- Error state for failed document upload
- Retry mechanisms for failed operations

---

## Recommendations

### Priority 1: Critical Missing Coverage (Implement First)

1. **Document Management E2E Tests**
   - Upload, display, download, delete documents
   - Error handling (file size, format validation)
   - Estimated effort: 4-6 hours

2. **Notes Management E2E Tests**
   - Shared vs. private notes
   - Concurrent editing
   - Timestamps and attribution
   - Estimated effort: 3-4 hours

3. **Status History E2E Tests**
   - Display historical status changes
   - Verify timestamps and user attribution
   - Estimated effort: 2-3 hours

4. **Sidebar Features E2E Tests**
   - Coaches list display
   - Quick actions (favorite, priority, email)
   - Navigation to related pages
   - Estimated effort: 4-5 hours

### Priority 2: Important Missing Coverage

5. **Basic Information Edit Mode Tests**
   - Toggle edit mode
   - College data lookup
   - Save/cancel functionality
   - Estimated effort: 3-4 hours

6. **Division Recommendations Tests**
   - Card display logic
   - Recommendations accuracy
   - Dismissal functionality
   - Estimated effort: 2-3 hours

7. **Email Modal Tests**
   - Open/close modal
   - Pre-population logic
   - Send email functionality
   - Estimated effort: 2-3 hours

### Priority 3: Nice to Have

8. **Academic Information Display Tests**
   - Verify all academic fields render correctly
   - Estimated effort: 2 hours

9. **Social Media Links Tests**
   - Verify links render and open correctly
   - Estimated effort: 1-2 hours

10. **Distance Display Tests**
    - Verify distance calculation and display
    - Estimated effort: 1-2 hours

---

## Component Test Coverage (Unit Tests) ✅

The following components have **unit tests** in `tests/unit/components/School/`:

- ✅ `SchoolDetailHeader.spec.ts`
- ✅ `SchoolInformationCard.spec.ts`
- ✅ `SchoolNotesCard.spec.ts`
- ✅ `SchoolProsConsCard.spec.ts`
- ✅ `SchoolSidebar.spec.ts`

**Note:** While unit tests cover component logic and rendering, **E2E tests are still needed** to verify full user workflows and integration with the backend.

---

## Total Estimated Effort

**Priority 1:** 13-18 hours
**Priority 2:** 7-10 hours
**Priority 3:** 4-6 hours

**Total:** 24-34 hours to achieve comprehensive E2E coverage

---

## Next Steps

1. **Immediate Action:** Create Priority 1 E2E tests (critical gaps)
2. **Within 1 Sprint:** Complete Priority 2 tests (important features)
3. **Ongoing:** Add Priority 3 tests as time permits
4. **Maintenance:** Update tests as features evolve

---

## Appendix: Test Files Reviewed

- `tests/e2e/tier1-critical/schools-crud.spec.ts` (522 lines)
- `tests/e2e/schools-fit-score-display.spec.ts` (294 lines)
- `tests/e2e/schools-status-tracking.spec.ts` (228 lines)
- `tests/e2e/coaching-philosophy.spec.ts` (437 lines)
- `pages/schools/[id]/index.vue` (482 lines)
- Component unit tests (5 files)

**Total E2E Test Coverage:** ~1,481 lines covering ~40% of features
