# User Story 3.4: School Priority & Status Tracking Implementation Plan

**Status**: Ready for Review
**Date**: 2026-01-25

## Overview

Complete the implementation of Story 3.4 acceptance criteria by adding status history tracking, timestamps, and timeline visualization.

## Current State

**Implemented:**

- Priority tier setting (A/B/C) with UI and filtering
- 6 recruiting statuses with manual updates
- General `updated_at` and `updated_by` timestamps
- Interaction logging with 9 types

**Missing:**

- Status change timestamps (`status_changed_at`)
- Status history/audit trail
- Status timeline visualization
- `priority_tier` in Supabase schema
- Test coverage for history features

## Tasks

### Phase 1: Database Schema Updates

#### 1.1: Add Status History Tracking Table

- **File**: Database migration (Supabase)
- **Action**: Create `school_status_history` table
- **Fields**:
  - `id` (UUID, primary key)
  - `school_id` (UUID, foreign key to schools)
  - `previous_status` (enum - nullable for first entry)
  - `new_status` (enum)
  - `changed_by` (UUID, user who made change)
  - `changed_at` (timestamp, default now())
  - `notes` (optional text - reason for change)
  - `created_at` (timestamp)

**Acceptance**: Migration runs without errors, table structure verified

#### 1.2: Add Status Change Timestamp to Schools Table

- **File**: Database migration
- **Action**: Add column `status_changed_at` (timestamp, nullable)
- **Purpose**: Quick reference to last status change time
- **Acceptance**: Column added, existing records updated to use `updated_at` as fallback

#### 1.3: Ensure Priority Tier in Supabase Schema

- **File**: Database schema
- **Action**: Verify or add `priority_tier` column (enum: A, B, C, null)
- **Note**: May already exist but should be confirmed in Supabase UI
- **Acceptance**: Column present and accessible via Supabase client

### Phase 2: TypeScript Types & Interfaces

#### 2.1: Update Database Types

- **File**: `types/database.ts`
- **Action**:
  - Ensure `School` includes `status_changed_at` and `priority_tier`
  - Add `SchoolStatusHistory` interface with fields from 1.1
  - Update status enum to match story (9 states, not current 6):
    - `interested`, `contacted`, `camp_invite`, `recruited`, `official_visit_invited`, `official_visit_scheduled`, `offer_received`, `committed`, `not_pursuing`

**Acceptance**: All types compile without errors, interfaces match database schema

### Phase 3: Store Updates (Pinia)

#### 3.1: Add Status History to School Store

- **File**: `stores/schools.ts`
- **Action**:
  - Add `statusHistory` state to track loaded history
  - Add action `updateStatus(schoolId, newStatus, notes?)` that:
    - Records previous status
    - Updates `status` and `status_changed_at`
    - Creates entry in status history
    - Sets `updated_at` and `updated_by`
  - Add action `getStatusHistory(schoolId)` to load history from Supabase
  - Add getter `statusHistoryFor(schoolId)` to retrieve history
  - Add getter `schoolsByStatus(status)` - update to use new status values

**Acceptance**:

- Store compiles
- `updateStatus` correctly logs history
- History queries work (tested via store unit tests)

#### 3.2: Update School Filtering

- **File**: `stores/schools.ts`
- **Action**: Update `SchoolFilters` interface to accept new status values
- **Acceptance**: All status filtering works with new enum values

### Phase 4: UI Components

#### 4.1: Update School Detail Page

- **File**: `pages/schools/[id]/index.vue`
- **Action**:
  - Update status dropdown to use new 9 status values
  - Replace direct status update with `updateStatus()` action
  - Add optional "Notes" field when changing status
  - Add "View Status History" link/button
  - Display `status_changed_at` below status badge
  - Update status badge colors/styling if needed

**Acceptance**:

- Status dropdown shows all 9 values
- Status change logs to history
- Notes are optional but saved
- `status_changed_at` displays correctly

#### 4.2: Create Status History Modal/Page

- **Files**: `components/School/SchoolStatusHistory.vue` OR `pages/schools/[id]/status-history.vue`
- **Action**: Display status history chronologically
- **Fields**:
  - Status change (from → to)
  - Changed by (user name)
  - Changed at (formatted date/time)
  - Notes (if provided)
- **Features**:
  - Sortable by date (newest first default)
  - Filterable by status
  - Export to CSV option (optional, nice-to-have)

**Acceptance**:

- History loads on component mount
- Displays all status transitions
- Dates are properly formatted
- Empty state handled gracefully

#### 4.3: Update Timeline Report

- **File**: `pages/reports/timeline.vue`
- **Action**:
  - Include "Status Changed" events in timeline
  - Show status transition (from → to)
  - Include notes if provided
  - Group with interactions chronologically
  - Color-code by status

**Acceptance**:

- Status changes appear in timeline
- Sorted correctly with other events
- User can see full recruiting journey

#### 4.4: Update Status Badges

- **File**: `components/School/SchoolCard.vue` and other places
- **Action**: Update status badge colors/labels for new 9 values
- **Color scheme** (suggested):
  - `interested`: Blue
  - `contacted`: Slate
  - `camp_invite`: Purple
  - `recruited`: Green
  - `official_visit_invited`: Amber
  - `official_visit_scheduled`: Orange
  - `offer_received`: Red
  - `committed`: Green-800 (darker)
  - `not_pursuing`: Gray-400

**Acceptance**: All status values display with consistent colors across app

### Phase 5: Unit Tests

#### 5.1: Status History Store Tests

- **File**: `tests/unit/stores/schools-status-history.spec.ts`
- **Coverage**:
  - `updateStatus()` creates history entry
  - `getStatusHistory()` retrieves entries
  - History ordered correctly (newest first)
  - `status_changed_at` updates on status change
  - Multiple status changes create multiple entries
  - Notes are optional
  - History works independently of priority tier changes

**Acceptance**: All tests pass, 90%+ coverage of store actions

#### 5.2: Status History Component Tests

- **File**: `tests/unit/components/School/SchoolStatusHistory.spec.ts`
- **Coverage**:
  - Component renders history list
  - Empty state displays when no history
  - Sorts chronologically
  - Formats dates correctly
  - Displays all fields (from, to, user, date, notes)
  - Handles loading state

**Acceptance**: All tests pass, component renders correctly

#### 5.3: Timeline Report Tests

- **File**: `tests/unit/pages/timeline-with-status.spec.ts` (new) or update existing
- **Coverage**:
  - Status changes appear in timeline
  - Sorted with interactions chronologically
  - Status badge colors correct
  - Notes display in timeline

**Acceptance**: Tests pass, timeline includes status events

### Phase 6: E2E Tests

#### 6.1: Status Change Workflow E2E

- **File**: `tests/e2e/schools-status-tracking.spec.ts`
- **Test Scenarios**:
  1. User opens school detail page
  2. User changes status from "interested" to "contacted"
  3. Optional: user adds notes about the change
  4. Status updates on page
  5. `status_changed_at` displays
  6. Status change appears in status history

**Acceptance**: Test passes consistently

#### 6.2: Status History Viewing E2E

- **File**: `tests/e2e/schools-status-history.spec.ts`
- **Test Scenarios**:
  1. User opens school detail page
  2. User clicks "View Status History"
  3. History modal/page opens
  4. All previous status changes display
  5. Most recent change is first
  6. Each entry shows: from status, to status, changed by, date, notes (if any)
  7. User can close modal

**Acceptance**: Test passes, history displays correctly

#### 6.3: Timeline Visualization E2E

- **File**: Update `tests/e2e/timeline.spec.ts`
- **Test Scenarios**:
  1. User opens Timeline Report
  2. Status changes appear in timeline (mixed with interactions)
  3. Status change event shows readable format
  4. Status badges display with correct colors
  5. Timeline is chronologically ordered

**Acceptance**: Timeline displays status changes correctly

### Phase 7: Documentation

#### 7.1: Update README

- **File**: `README.md`
- **Action**: Document status tracking features under "Core Features"
- **Content**: Brief explanation of status history, priority tiers, timeline

#### 7.2: Update CLAUDE.md

- **File**: `CLAUDE.md`
- **Action**: Add notes about status history patterns and conventions

**Acceptance**: Documentation is clear and matches implementation

## Acceptance Criteria

### For Code Implementation

- [ ] Database schema includes `school_status_history` table and `status_changed_at` column
- [ ] All 9 status values supported (interested, contacted, camp_invite, recruited, official_visit_invited, official_visit_scheduled, offer_received, committed, not_pursuing)
- [ ] Status changes create timestamped history entries
- [ ] Status history modal/page displays all transitions with user and date
- [ ] Timeline report includes status changes chronologically
- [ ] All store functions compile without TypeScript errors
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes with no warnings

### For Tests

- [ ] 50+ new unit tests added (status history store + components)
- [ ] 3+ new E2E test scenarios (status change, history view, timeline)
- [ ] `npm run test` passes (all tests)
- [ ] `npm run test:e2e` passes (all E2E tests)
- [ ] Coverage report shows >85% coverage for new code

### For User Experience

- [ ] Parents can change school status with optional notes
- [ ] Parents can view status change history for any school
- [ ] Status changes timestamped and attributed to user
- [ ] Status changes appear in recruiting timeline
- [ ] Status badges are visually distinct by status value
- [ ] All acceptance criteria from Story 3.4 satisfied

## Story Acceptance Criteria Mapping

| Criteria                            | Status | Implementation                          |
| ----------------------------------- | ------ | --------------------------------------- |
| Can set priority tier independently | ✅     | Existing feature, works                 |
| Priority tiers A/B/C                | ✅     | Existing feature, works                 |
| Status values predefined            | ⚠️     | Need to expand from 6 to 9              |
| Status changes timestamped          | ❌     | Add `status_changed_at` + history table |
| Can view status history             | ❌     | Add history component/page              |
| Status changes in timeline          | ❌     | Update timeline report                  |

## Dependencies

- Supabase schema migration (must complete 1.1, 1.2, 1.3 first)
- No external package dependencies added
- Builds on existing store and component patterns

## Notes

- Priority tier functionality is complete and tested
- Status history is critical for recruiting journey tracking
- Timeline visualization helps parents see progress over time
- Status notes provide context for transitions
- Interaction logging already exists; status history is separate tracking

## Open Questions

1. Should status change require authentication/user context? (Assume yes)
2. Should users be able to edit/delete status history? (Recommend no - audit trail)
3. Should status changes trigger notifications? (Out of scope for this story, future feature)
4. Should status notes be mandatory or optional? (Recommend optional)
5. What timezone should timestamps use? (Assume user's local via Supabase)
