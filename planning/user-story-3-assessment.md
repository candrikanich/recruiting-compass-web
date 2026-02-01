# User Story 3 Assessment: School Tracker (CRM-Lite)

**Date:** 2026-01-24
**Status:** Partially Implemented
**Coverage:** ~70% of requirements implemented

---

## Executive Summary

The School Tracker feature (Stories 3.1-3.5) is largely implemented with core functionality working well. However, several important features from the user stories are **missing** or **incomplete**:

### ✅ Implemented (~70%)

- Add schools from database and manually
- View school list with detailed profiles
- School status tracking (6 statuses)
- Notes and pros/cons management
- Advanced filtering (by status, division, state)
- Match scoring system
- Favorite/ranking functionality
- Document uploads
- Interaction logging

### ❌ Missing/Incomplete (~30%)

- **Priority tier system** (A, B, C) - Story 3.4
- **Duplicate school prevention** with warning - Story 3.1
- **Warning when approaching 30 schools** - Story 3.1
- **Automatic fit score recalculation** on profile changes - Story 3.2
- **Fit score breakdown UI** (4 components display) - Story 3.2
- **Distance-based sorting** - Story 3.3
- **Fit score range filtering** - Story 3.3
- **Coaching philosophy/notes section** - Story 3.5
- **Status change history timeline** - Story 3.4
- **Edit history for notes** - Story 3.5
- **Character limit validation** (5000 chars) for notes - Story 3.5
- **Performance requirements** verification (e.g., <30 seconds for adding school)

### 🧪 Test Coverage

- **Unit Tests:** Good coverage (stores, composables, utilities)
- **E2E Tests:** Minimal - only basic navigation tests
- **Missing:** Detailed E2E tests for Story scenarios, duplicate prevention, priority tiers, filtering

---

## Detailed Feature Analysis

### Story 3.1: Parent Adds Schools to Track List

#### Scenarios

| Scenario                   | Status      | Notes                                        |
| -------------------------- | ----------- | -------------------------------------------- |
| Add school from database   | ✅ Complete | NCAA + College Scorecard integration working |
| Add custom school manually | ✅ Complete | Form supports manual entry                   |
| Auto-populate school info  | ✅ Complete | Academic data fetched and stored             |
| Prevent duplicate schools  | ❌ Missing  | No duplicate check implemented               |

#### Acceptance Criteria

| Criteria                 | Status      | Details                              |
| ------------------------ | ----------- | ------------------------------------ |
| Adding school takes <30s | ⚠️ Untested | Likely met but not verified by tests |
| Info auto-populates      | ✅ Met      | NCAA/College Scorecard integration   |
| Can add up to 50 schools | ✅ Met      | No limit enforced, but reasonable    |
| Warning at 30 schools    | ❌ Missing  | No UI warning implemented            |
| No duplicate schools     | ❌ Missing  | No validation or prevention          |

**Missing Implementations:**

1. Duplicate school detection (by name, NCAA ID, or URL)
2. Duplicate warning modal before adding
3. UI warning when user has 30+ schools
4. Performance testing (<30s requirement)

---

### Story 3.2: Parent Views School List with Fit Scores

#### Scenarios

| Scenario                            | Status      | Notes                                         |
| ----------------------------------- | ----------- | --------------------------------------------- |
| Fit score displays                  | ✅ Complete | Match % calculated and shown                  |
| Fit score breakdown visible         | ⚠️ Partial  | Algorithm exists but UI not fully detailed    |
| Fit score updates on profile change | ❌ Missing  | No automatic recalculation                    |
| Honest assessment                   | ✅ Complete | `getMatchBadge()` provides realistic feedback |

#### Acceptance Criteria

| Criteria                    | Status     | Details                                       |
| --------------------------- | ---------- | --------------------------------------------- |
| Fit score 0-100 displays    | ✅ Met     | Match scoring works                           |
| Updates within 1 second     | ❌ Missing | No automatic updates on profile changes       |
| 4-component breakdown shown | ⚠️ Partial | Components calculated but not all shown in UI |
| Honest assessment           | ✅ Met     | Algorithm prevents false hope                 |
| Algorithm documented        | ⚠️ Partial | Code exists but could use more comments       |

**Missing Implementations:**

1. Automatic fit score recalculation trigger when athlete profile updates (GPA, stats, etc.)
2. "Fit scores updated" notification when recalculation occurs
3. UI component breakdown showing all 4 scores:
   - Academic Fit (GPA-based)
   - Athletic Fit (stats-based)
   - Opportunity Fit (coach interest)
   - Personal Fit (school-life fit)
4. Performance guarantee (<1 second recalculation)

---

### Story 3.3: Parent Filters and Sorts Schools

#### Scenarios

| Scenario                  | Status      | Notes                                   |
| ------------------------- | ----------- | --------------------------------------- |
| Filter by priority tier   | ❌ Missing  | Priority tiers (A/B/C) not implemented  |
| Filter by status          | ✅ Complete | Works via `schoolsByStatus` getter      |
| Filter by fit score range | ❌ Missing  | No range filter UI/logic                |
| Sort by distance          | ⚠️ Partial  | Distance calculated but sorting unclear |
| Apply multiple filters    | ✅ Complete | Multi-filter system works               |

#### Acceptance Criteria

| Criteria                                  | Status     | Details                            |
| ----------------------------------------- | ---------- | ---------------------------------- |
| Filter by priority tier                   | ❌ Missing | Feature doesn't exist              |
| Filter by status                          | ✅ Met     | Implemented                        |
| Filter by fit score range                 | ❌ Missing | No UI or logic                     |
| Filter by distance                        | ⚠️ Partial | Can calculate but can't sort by it |
| Filter by division                        | ✅ Met     | Implemented                        |
| Filter by state                           | ✅ Met     | Implemented                        |
| Sort by distance, fit score, contact date | ⚠️ Partial | No sorting implemented in UI       |
| Multiple filters work together            | ✅ Met     | System supports it                 |
| <100ms filter load time                   | ✅ Met     | Local filtering is fast            |

**Missing Implementations:**

1. Priority tier system in data model
2. UI components for priority tier filtering
3. Fit score range slider/inputs
4. Distance-based sorting (closest to farthest)
5. Sorting by fit score
6. Sorting by last contact date
7. Sort direction toggle (ascending/descending)

---

### Story 3.4: Parent Sets School Priority and Status

#### Scenarios

| Scenario                 | Status      | Notes                         |
| ------------------------ | ----------- | ----------------------------- |
| Set priority tier        | ❌ Missing  | No A/B/C tier system          |
| Track recruiting status  | ✅ Complete | Status field fully functional |
| Timestamp status changes | ✅ Complete | `updated_at` recorded         |

#### Acceptance Criteria

| Criteria                    | Status     | Details                                                                             |
| --------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| Independent priority/status | ❌ Missing | Priority system not implemented                                                     |
| A/B/C priority tiers        | ❌ Missing | Not in data model                                                                   |
| Predefined status values    | ✅ Met     | 6 statuses: researching, contacted, interested, offer_received, committed, declined |
| Timestamped status changes  | ✅ Met     | `updated_at` field                                                                  |
| View status history         | ❌ Missing | No history timeline                                                                 |
| Status visible in timeline  | ✅ Partial | Interaction timeline exists but status-specific view missing                        |

**Missing Implementations:**

1. Add `priority_tier` field to School model (enum: 'A', 'B', 'C')
2. UI components to set priority (separate from status)
3. Status change history tracking (could store in JSON or separate table)
4. Status history timeline view with timestamps
5. Migration for new field

---

### Story 3.5: Parent Views and Adds School Notes

#### Scenarios

| Scenario                 | Status      | Notes                          |
| ------------------------ | ----------- | ------------------------------ |
| Add notes                | ✅ Complete | Notes field fully functional   |
| View coaching philosophy | ❌ Missing  | No coaching philosophy section |
| Edit notes               | ✅ Complete | Edit functionality works       |

#### Acceptance Criteria

| Criteria               | Status     | Details                     |
| ---------------------- | ---------- | --------------------------- |
| 5000 char limit        | ❌ Missing | No limit validation         |
| Save in <2s            | ✅ Met     | Database updates are fast   |
| Display on detail page | ✅ Met     | Notes visible               |
| Edit anytime           | ✅ Met     | Edit UI works               |
| Edit history recorded  | ❌ Missing | Only `updated_at` timestamp |

**Missing Implementations:**

1. Notes field character limit (5000) with visual indicator
2. Edit history (show last updated date/time and who updated)
3. Coaching philosophy section with fields:
   - Coaching style (high-intensity, player development, etc.)
   - Recruit preferences
   - Communication style
   - Success with similar athletes
4. Separate storage/display of coaching notes vs. general notes

---

## Current Test Coverage Summary

### Unit Tests ✅

- **Schools Store:** `tests/unit/stores/schools.spec.ts` - CRUD, sanitization, errors
- **useSchools Composable:** `tests/unit/composables/useSchools.spec.ts` - Basic tests
- **useSchoolMatching:** `tests/unit/composables/useSchoolMatching.spec.ts` - Match scoring
- **useSchoolLogos:** `tests/unit/composables/useSchoolLogos.spec.ts` - Logo fetching/caching
- **useSchoolsSearch:** `tests/unit/composables/useSchoolsSearch.spec.ts` - Search logic
- **School Pages:** Various page component tests

**Gaps:**

- No tests for duplicate detection (not implemented yet)
- No tests for priority tier filtering (not implemented)
- No tests for fit score range filtering (not implemented)
- No tests for distance sorting (not implemented)
- No tests for character limit validation (not implemented)

### E2E Tests ⚠️ Minimal

- **File:** `tests/e2e/schools.spec.ts` - Only 4 basic tests
  - Navigation to schools page
  - Dashboard authentication check
  - Logout functionality
  - Cross-page navigation

**Gaps:**

- No test for adding school from database
- No test for manual school creation
- No test for duplicate school prevention
- No test for filtering and sorting
- No test for priority tier changes
- No test for status updates
- No test for notes/pros/cons management
- No test for view school details

---

## Recommendations

### Priority 1 (Core User Story Requirements)

1. Implement priority tier system (A/B/C) with database field
2. Add duplicate school detection with warning modal
3. Add warning when user reaches 30+ schools
4. Implement fit score breakdown UI display
5. Add automatic fit score recalculation on athlete profile changes

### Priority 2 (Enhancement)

1. Implement sorting by distance, fit score, contact date
2. Add fit score range filtering
3. Add status change history timeline
4. Add character limit validation for notes (5000)
5. Add edit history tracking for notes

### Priority 3 (Nice to Have)

1. Coaching philosophy section with detailed fields
2. Performance testing for <30s school add requirement
3. More detailed E2E test coverage

---

## Implementation Effort Estimate

| Feature              | Complexity | Dependencies                              |
| -------------------- | ---------- | ----------------------------------------- |
| Priority tier system | Medium     | DB migration, store update, UI components |
| Duplicate detection  | Medium     | Search algorithm, warning modal           |
| Fit score updates    | Medium     | Event system, recalc logic, UI updates    |
| Sorting/filtering    | Medium     | Store updates, UI components              |
| Status history       | Medium     | Data storage, timeline UI                 |
| Character validation | Low        | Simple validator, UI indicator            |

---

## Next Steps

1. ✅ Assessment complete (this document)
2. 🔄 Create detailed implementation plan (to follow)
3. 🔄 Create unit test plan for new features
4. 🔄 Create E2E test plan for user story scenarios
