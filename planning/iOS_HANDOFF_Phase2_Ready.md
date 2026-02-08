# iOS App Porting Handoff: Phase 2 Specs Complete

**Project:** The Recruiting Compass iOS App (SwiftUI)
**Date Created:** February 7, 2026
**Status:** ✅ Phase 2 (Dashboard & Core Views) - Fully Specified & Ready

---

## Executive Summary

Phase 2 specifications are complete. Four pages covering the dashboard and core list views have been fully specified, ready for iOS implementation.

- ✅ **4 complete page specifications** (Phase 2: Dashboard & Core Views)
- ✅ **Reusable filter pattern** established across all 3 list pages
- ✅ **Role-based access** documented (athlete vs. parent views)
- ✅ **Data models in Swift** for all entities
- ✅ **API integration** documented for all endpoints

---

## Phase 2 Specifications

| #   | Page                  | Web Route       | Time         | Spec File                             | Status   |
| --- | --------------------- | --------------- | ------------ | ------------------------------------- | -------- |
| 5   | **Dashboard**         | `/dashboard`    | 3 days       | `iOS_SPEC_Phase2_Dashboard.md`        | ✅ Ready |
| 6   | **Coaches List**      | `/coaches`      | 4-5 days     | `iOS_SPEC_Phase2_CoachesList.md`      | ✅ Ready |
| 7   | **Schools List**      | `/schools`      | 4-5 days     | `iOS_SPEC_Phase2_SchoolsList.md`      | ✅ Ready |
| 8   | **Interactions List** | `/interactions` | 3 days       | `iOS_SPEC_Phase2_InteractionsList.md` | ✅ Ready |
|     | **TOTAL**             |                 | **~15 days** |                                       |          |

---

## Implementation Order (Recommended)

### Step 1: Dashboard (3 days)

**Why first:** Main landing page after login. Establishes data fetching pattern for multiple Supabase tables, parent preview mode, and widget-based layout.

**Key patterns established:**

- Multi-table data fetching (schools, coaches, interactions, offers, events, metrics)
- Parent athlete switching with context banner
- Summary stat cards with navigation
- Quick tasks with local persistence
- Action items (suggestions) API integration

**Simplifications for MVP:**

- Defer charts (show numbers only; add Swift Charts in Phase 5)
- Defer map widget, social widget, contact frequency widget
- Simplify recruiting packet (generate + share sheet instead of in-app email)
- Use pull-to-refresh instead of real-time subscriptions

### Step 2: Coaches List (4-5 days)

**Why second:** Establishes the filterable list pattern that Schools and Interactions will reuse. Introduces search, filter dropdowns, sort options, and active filter chips.

**Key patterns established:**

- Client-side search across multiple fields
- Filter bar with dropdown pickers
- Active filter chips (removable)
- Card-based list with actions
- Smart delete (simple + cascade fallback)
- Communication actions (email, SMS, social via native handlers)

### Step 3: Schools List (4-5 days)

**Why third:** Reuses filter pattern from Coaches but adds sliders (fit score, distance), favorites toggle, and badge system. Most complex filtering.

**Key additions beyond Coaches:**

- Dual-thumb slider for fit score range
- Distance slider with Haversine calculation
- Favorite toggle with optimistic update
- Multiple badge types (division, status, fit score, size)
- School logo loading via AsyncImage

### Step 4: Interactions List (3 days)

**Why last:** Simplest list page. Reuses filter pattern. Key differentiator is role-based access (athlete vs. parent) and analytics dashboard.

**Key additions:**

- Analytics cards (total, outbound, inbound, this week)
- Role-based filtering (athlete sees own; parent sees all)
- "Logged By" conditional filter (parents only)
- Privacy notice banner (athletes only)
- Sentiment tracking with color-coded badges

---

## Shared Patterns Across Phase 2

### 1. Filterable List Pattern

All 3 list pages share this structure:

```
[Search Bar] → [Filter Dropdowns] → [Active Chips] → [Results Count] → [Card List]
```

Build this as a reusable component system:

- `FilterableListView<Item>` - Generic list container
- `SearchBar` - Text search component
- `FilterChip` - Removable filter pill
- `EmptyStateView` - Configurable empty/no-results states

### 2. Card Pattern

Each entity has a card component:

- `CoachCard` - Name, role badge, school, responsiveness bar, communication buttons
- `SchoolCard` - Name, location, division/status/fit/size badges, favorite star
- `InteractionCard` - Type icon, direction/sentiment badges, subject, school/coach context, date

### 3. Data Fetching Pattern

```swift
@MainActor
class ListViewModel<T>: ObservableObject {
  @Published var items: [T] = []
  @Published var isLoading = false
  @Published var error: String? = nil

  func fetch() async {
    isLoading = true
    defer { isLoading = false }
    do {
      items = try await fetchFromSupabase()
    } catch {
      self.error = error.localizedDescription
    }
  }
}
```

### 4. Delete Pattern (Smart Delete)

All entities use the same cascade-delete approach:

1. Try simple delete
2. Catch FK constraint error
3. Fall back to `/api/{entity}/{id}/cascade-delete`
4. Return `{ cascadeUsed: bool }`

### 5. Family-Scoped Access

All data queries filter by `family_unit_id`, not `user_id`:

- Schools: `eq("family_unit_id", activeFamilyId)`
- Coaches: `in("school_id", schoolIds)` (schools already family-scoped)
- Interactions: Family-scoped + role-based filtering

---

## Key Data Models (Swift)

All models defined in the specs. Core entities:

| Model               | Fields                                                                             | Used In                      |
| ------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `School`            | name, location, division, status, fitScore, priorityTier, isFavorite, academicInfo | Dashboard, Schools List      |
| `Coach`             | firstName, lastName, role, email, phone, responsivenessScore, lastContactDate      | Dashboard, Coaches List      |
| `Interaction`       | type, direction, sentiment, subject, content, occurredAt, loggedBy                 | Dashboard, Interactions List |
| `Offer`             | status (pending/accepted/rejected/withdrawn)                                       | Dashboard                    |
| `Event`             | name, date, location                                                               | Dashboard                    |
| `PerformanceMetric` | type, value                                                                        | Dashboard                    |

---

## API Endpoints Summary

| Endpoint                                | Method | Used By                     |
| --------------------------------------- | ------ | --------------------------- |
| Direct Supabase: `schools`              | SELECT | Dashboard, Schools, Coaches |
| Direct Supabase: `coaches`              | SELECT | Dashboard, Coaches          |
| Direct Supabase: `interactions`         | SELECT | Dashboard, Interactions     |
| Direct Supabase: `offers`               | SELECT | Dashboard                   |
| Direct Supabase: `events`               | SELECT | Dashboard                   |
| Direct Supabase: `performance_metrics`  | SELECT | Dashboard                   |
| `/api/suggestions?location=dashboard`   | GET    | Dashboard                   |
| `/api/suggestions/{id}/dismiss`         | PATCH  | Dashboard                   |
| `/api/suggestions/{id}/complete`        | PATCH  | Dashboard                   |
| `/api/coaches/{id}/cascade-delete`      | POST   | Coaches List                |
| `/api/schools/{id}/cascade-delete`      | POST   | Schools List                |
| `/api/interactions/{id}/cascade-delete` | POST   | Interactions List           |

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

Spec file: iOS_SPEC_Phase2_[Name].md
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
├── iOS_SPEC_Phase2_Dashboard.md        ← Dashboard spec (3 days)
├── iOS_SPEC_Phase2_CoachesList.md      ← Coaches list spec (4-5 days)
├── iOS_SPEC_Phase2_SchoolsList.md      ← Schools list spec (4-5 days)
├── iOS_SPEC_Phase2_InteractionsList.md ← Interactions list spec (3 days)
└── iOS_HANDOFF_Phase2_Ready.md         ← This document
```

---

## Next Steps After Phase 2

### Phase 3: Detail Pages & CRUD (Week 4-5)

Pages to spec next:

1. Coach Detail Page (`/coaches/[id]`)
2. School Detail Page (`/schools/[id]`)
3. Add Coach Page (`/coaches/new`)
4. Add School Page (`/schools/new`)
5. Interaction Detail / Add Page (`/interactions/add`, `/interactions/[id]`)

These pages will build on the patterns established in Phase 2 (data fetching, card components, form validation).

---

**Created:** February 7, 2026
**Status:** Phase 2 Fully Specified & Ready for iOS Implementation
**Confidence Level:** High - All specifications verified against web implementation
