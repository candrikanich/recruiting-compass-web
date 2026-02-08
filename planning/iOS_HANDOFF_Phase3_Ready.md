# iOS App Porting Handoff: Phase 3 Specs Complete

**Project:** The Recruiting Compass iOS App (SwiftUI)
**Date Created:** February 8, 2026
**Status:** Phase 3 (Detail Pages & CRUD) - Fully Specified & Ready

---

## Executive Summary

Phase 3 specifications are complete. Five pages covering detail views and CRUD operations have been fully specified, ready for iOS implementation.

- 5 complete page specifications (Phase 3: Detail Pages & CRUD)
- Reusable edit/form patterns established across all pages
- Smart delete pattern (simple + cascade) documented for all entities
- Data models in Swift for all entities
- API integration documented for all endpoints
- Role-based access documented (athlete vs. parent)

---

## Phase 3 Specifications

| #   | Page                       | Web Route                                 | Time         | Spec File                                 | Status |
| --- | -------------------------- | ----------------------------------------- | ------------ | ----------------------------------------- | ------ |
| 9   | **Coach Detail**           | `/coaches/[id]`                           | 5 days       | `iOS_SPEC_Phase3_CoachDetail.md`          | Ready  |
| 10  | **School Detail**          | `/schools/[id]`                           | 4-5 days     | `iOS_SPEC_Phase3_SchoolDetail.md`         | Ready  |
| 11  | **Add Coach**              | `/coaches/new`                            | 4-5 days     | `iOS_SPEC_Phase3_AddCoach.md`             | Ready  |
| 12  | **Add School**             | `/schools/new`                            | 3-4 days     | `iOS_SPEC_Phase3_AddSchool.md`            | Ready  |
| 13  | **Interaction Detail/Add** | `/interactions/add`, `/interactions/[id]` | 3 days       | `iOS_SPEC_Phase3_InteractionDetailAdd.md` | Ready  |
|     | **TOTAL**                  |                                           | **~20 days** |                                           |        |

---

## Implementation Order (Recommended)

### Step 1: Add Coach (4-5 days)

**Why first:** Simplest CRUD form in Phase 3. Establishes the form validation pattern, school selection dropdown, and Supabase insert flow that all other forms will reuse.

**Key patterns established:**

- Two-step form flow (select context, then fill details)
- Zod-equivalent field validation in Swift
- Empty string → null normalization for optional fields
- Family-scoped Supabase inserts (user_id + family_unit_id)
- Navigate to detail page on success

### Step 2: Coach Detail (5 days)

**Why second:** Builds on the Coach model from Add Coach. Introduces the detail page pattern: header card, stats grid, notes (shared + private), recent interactions, edit modal, and smart delete.

**Key patterns established:**

- Detail page layout (header → stats → notes → related data)
- Inline note editing (shared notes + per-user private notes)
- Responsiveness badge with color thresholds
- Smart delete (simple → cascade fallback)
- Native communication actions (email, SMS, call, social)
- Sub-page navigation placeholders (Analytics, Availability)

### Step 3: Add School (3-4 days)

**Why third:** Reuses form patterns from Add Coach but adds complexity: autocomplete college search, parallel NCAA + College Scorecard data enrichment, and duplicate detection.

**Key additions beyond Add Coach:**

- Autocomplete search with auto-population
- NCAA division/conference lookup
- College Scorecard academic data enrichment
- Duplicate detection (name, domain, NCAA ID)
- Auto-filled field indicators
- Phased MVP approach: manual entry first, autocomplete enrichment second

### Step 4: School Detail (4-5 days)

**Why fourth:** Most complex detail page. Reuses detail page pattern from Coach Detail but adds: fit score display, status history timeline, pros/cons management, coaching philosophy, map integration, and sidebar coaches panel.

**Key additions beyond Coach Detail:**

- Fit score card with tier badge and breakdown
- Division recommendations
- Status dropdown with history timeline
- Priority tier selector (A/B/C)
- Favorite toggle with optimistic update
- Pros & cons inline management
- Coaching philosophy (5 editable fields)
- MapKit integration for school location
- Distance from home calculation
- Coaches sidebar panel with quick contact

### Step 5: Interaction Detail/Add (3 days)

**Why last:** Ties together coaches and schools. Add form has dynamic coach dropdown based on school selection, interest calibration questionnaire, and attachment upload. Detail page is read-only with badges and metadata.

**Key additions:**

- Dynamic coach dropdown (cascades from school selection)
- Inline coach creation from form
- Interest calibration (conditional 6-question checklist)
- Attachment upload via native document picker
- Direction (inbound/outbound) and sentiment tracking
- Role-based access (athletes create, parents view-only)
- Inbound alert notification auto-creation

---

## Shared Patterns Across Phase 3

### 1. Detail Page Pattern

All detail pages share this structure:

```
[Back Navigation]
[Header Card] → Name, badges, key metadata
[Stats/Summary] → Quick metrics
[Editable Sections] → Notes, info, with view/edit toggle
[Related Data] → Recent interactions, coaches, etc.
[Actions] → Edit, Delete, Navigate
```

### 2. Form Pattern

All create forms share this structure:

```
[Context Selection] → School picker (coach/interaction) or autocomplete (school)
[Form Sections] → Grouped fields with validation
[Action Bar] → Submit (disabled until valid) + Cancel
```

### 3. Smart Delete Pattern

All entities use identical cascade-delete approach:

```swift
func smartDelete(id: String) async throws -> DeleteResult {
  do {
    try await supabase.from("entity").delete().eq("id", id)
    return DeleteResult(cascadeUsed: false)
  } catch {
    if isForeignKeyError(error) {
      let response = try await apiClient.post("/api/entity/\(id)/cascade-delete", body: ["confirmDelete": true])
      return DeleteResult(cascadeUsed: true, deletedCounts: response.deleted)
    }
    throw error
  }
}
```

### 4. Notes Pattern

Both Coach and School detail pages use:

- **Shared notes**: Visible to all family members, stored as `notes` field
- **Private notes**: Per-user keyed, stored as `private_notes[userId]` JSONB
- **Edit toggle**: View mode → Edit mode with save/cancel
- **Merge safety**: Fetch latest private_notes before updating to avoid overwriting other users' notes

### 5. Family-Scoped Access

All data queries filter by `family_unit_id`:

- Schools: `eq("family_unit_id", activeFamilyId)`
- Coaches: `in("school_id", familyScopedSchoolIds)`
- Interactions: Family-scoped + logged_by for role-based filtering

---

## Key Data Models (Swift)

All models defined in the individual specs. Core additions for Phase 3:

| Model                  | Key Fields                                                           | Used In                       |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------- |
| `CoachEditForm`        | firstName, lastName, role, email, phone, social handles, notes       | Coach Detail (edit modal)     |
| `CoachCreateInput`     | schoolId + CoachEditForm fields                                      | Add Coach                     |
| `SchoolCreateInput`    | name, location, division, conference, website, social, notes, status | Add School                    |
| `AcademicInfo`         | address, tuition, admission rate, enrollment, lat/lng                | School Detail                 |
| `FitScoreResult`       | score, tier, breakdown, missingDimensions                            | School Detail                 |
| `SchoolStatusHistory`  | previousStatus, newStatus, changedBy, timestamp, notes               | School Detail                 |
| `InteractionFormState` | schoolId, coachId, type, direction, sentiment, subject, content      | Add Interaction               |
| `InterestCalibration`  | 6 boolean questions, computed interest level                         | Add Interaction (conditional) |
| `AttachmentFile`       | filename, mimeType, data, storagePath                                | Interaction Detail/Add        |

---

## API Endpoints Summary

| Endpoint                                 | Method | Used By                       |
| ---------------------------------------- | ------ | ----------------------------- |
| Direct Supabase: `coaches` (by id)       | SELECT | Coach Detail                  |
| Direct Supabase: `coaches`               | INSERT | Add Coach                     |
| Direct Supabase: `coaches`               | UPDATE | Coach Detail (edit)           |
| Direct Supabase: `coaches`               | DELETE | Coach Detail (simple delete)  |
| Direct Supabase: `schools` (by id)       | SELECT | School Detail                 |
| Direct Supabase: `schools`               | INSERT | Add School                    |
| Direct Supabase: `schools`               | UPDATE | School Detail (edit)          |
| Direct Supabase: `schools`               | DELETE | School Detail (simple delete) |
| Direct Supabase: `interactions` (by id)  | SELECT | Interaction Detail            |
| Direct Supabase: `interactions`          | INSERT | Add Interaction               |
| Direct Supabase: `interactions`          | DELETE | Interaction Detail            |
| Direct Supabase: `school_status_history` | SELECT | School Detail                 |
| `/api/coaches/{id}/cascade-delete`       | POST   | Coach Detail                  |
| `/api/schools/{id}/cascade-delete`       | POST   | School Detail                 |
| `/api/schools/{id}/fit-score`            | GET    | School Detail                 |
| `/api/schools/{id}/fit-score`            | POST   | School Detail (recalculate)   |
| `/api/interactions/{id}/cascade-delete`  | POST   | Interaction Detail            |
| College Scorecard API (data.gov)         | GET    | Add School (enrichment)       |

---

## Handing Off to iOS Claude

### For Each Page, Provide:

```
I have a complete specification for the [Page Name].
Web route: [route]
Estimated time: [days]
Dependencies: [previous pages completed]

Key features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Spec file: iOS_SPEC_Phase3_[Name].md
Architecture reference: iOS_ARCHITECTURE_MIRRORING.md

Please implement this page following the specification.
```

### Testing Between Steps

After each page:

1. iOS Claude finishes implementation
2. Test iOS version manually
3. Compare with web version
4. Document any platform-specific differences
5. Move to next page

---

## Files Created

```
planning/
├── iOS_SPEC_Phase3_CoachDetail.md           <- Coach detail spec (5 days)
├── iOS_SPEC_Phase3_SchoolDetail.md          <- School detail spec (4-5 days)
├── iOS_SPEC_Phase3_AddCoach.md              <- Add coach spec (4-5 days)
├── iOS_SPEC_Phase3_AddSchool.md             <- Add school spec (3-4 days)
├── iOS_SPEC_Phase3_InteractionDetailAdd.md  <- Interaction detail/add spec (3 days)
└── iOS_HANDOFF_Phase3_Ready.md              <- This document
```

---

## Next Steps After Phase 3

### Phase 4: Settings & Advanced Features (Week 5-6)

Pages to spec next:

1. Family Management Settings (`/settings/family-management`)
2. Preferences Pages (`/settings/player-details`, `/settings/school-preferences`, `/settings/notifications`, `/settings/dashboard`)
3. Notifications Page (`/notifications`)
4. Activity Feed (`/activity`)

These pages will build on the patterns established in Phase 3 (form validation, detail pages, CRUD operations).

---

**Created:** February 8, 2026
**Status:** Phase 3 Fully Specified & Ready for iOS Implementation
**Confidence Level:** High - All specifications verified against web implementation
