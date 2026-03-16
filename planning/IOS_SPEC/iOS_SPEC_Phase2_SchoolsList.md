# iOS Page Specification: Schools List

**Project:** The Recruiting Compass iOS App
**Created:** February 7, 2026
**Page Name:** Schools List
**Web Route:** `/schools`
**Priority:** MVP / Phase 2 (High - Core Feature)
**Complexity:** High (many filters, fit scores, favorites, distance)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

Display all schools the athlete is tracking in a searchable, filterable grid. Schools are the primary entity in recruiting — each school has coaches, interactions, and potentially offers associated with it. This page allows users to browse, filter by division/status/fit score/distance/tier, toggle favorites, and manage their recruiting list. It reuses the filterable list pattern established in the Coaches List.

### Key User Actions

- Browse all tracked schools
- Search schools by name or location
- Filter by division, status, state, favorites, priority tier, fit score range, and distance
- Sort by name, fit score, distance, or last contact
- Toggle favorite (star) on individual schools
- Tap a school card to view detail page
- Delete a school (with confirmation + cascade)
- Navigate to add a new school
- Export schools to CSV or PDF (if implemented)

### Success Criteria

- All schools for the user's family load correctly with correct counts
- Fit scores display with correct color coding (green/orange/red)
- Distance filter works when home location is set
- Favorite toggle persists immediately
- Filters combine with AND logic and display as removable chips
- Delete handles cascade (schools with coaches/interactions)
- Card shows division, status, size, conference, and fit score badges

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Schools tab
2. System fetches all schools for user's family unit
3. System fetches school logos asynchronously
4. User sees school cards in a scrollable grid/list
5. Each card shows: name, location, division badge, status badge, fit score badge, size badge
6. User can search, filter, or sort to narrow results
7. User taps a school card → navigates to school detail page
```

### Alternative Flow: Filter Schools

```
1. User taps filter icon or search bar
2. Filter panel appears with 8 filter options
3. User adjusts filters (dropdowns, sliders, search)
4. List updates in real-time (client-side filtering)
5. Active filters shown as blue chips
6. Results count updates: "{X} result(s) found"
```

### Alternative Flow: Toggle Favorite

```
1. User taps star icon on school card
2. Star fills/unfills immediately (optimistic update)
3. System calls toggleFavorite API in background
4. If API fails: revert star state and show error
```

### Alternative Flow: Delete School

```
1. User taps delete button on school card
2. Confirmation dialog: "Are you sure you want to delete this school?"
3. User confirms
4. System attempts simple delete
5. If FK constraint → cascade delete (removes coaches, interactions, etc.)
6. School removed from list
7. Toast: "School deleted" or "School and X coaches deleted"
```

### Error Scenarios

```
Error: No schools found
- User sees: Empty state with "No schools found" + "Add Your First School" CTA
- Recovery: Navigate to /schools/new

Error: Distance filter with no home location
- User sees: Warning "Set home location" next to disabled distance slider
- Recovery: Navigate to location settings

Error: Delete fails
- User sees: Error alert with message
- Recovery: Retry or dismiss
```

---

## 3. Data Models

### School Model

```swift
struct School: Identifiable, Codable {
  let id: String
  let name: String
  let location: String?
  let division: Division?
  let conference: String?
  let status: SchoolStatus
  let priorityTier: PriorityTier?
  let isFavorite: Bool
  let fitScore: Double?          // 0-100
  let notes: String?
  let pros: [String]
  let cons: [String]
  let website: String?
  let faviconUrl: String?
  let ranking: Int?
  let familyUnitId: String?
  let updatedAt: Date?
  let academicInfo: AcademicInfo?
}

struct AcademicInfo: Codable {
  let latitude: Double?
  let longitude: Double?
  let state: String?
  let studentSize: Int?
  let admissionRate: Double?
  let gpaRequirement: Double?
  let satRequirement: Int?
  let actRequirement: Int?
}

enum Division: String, Codable, CaseIterable {
  case d1 = "D1"
  case d2 = "D2"
  case d3 = "D3"
  case naia = "NAIA"
  case juco = "JUCO"
}

enum SchoolStatus: String, Codable, CaseIterable {
  case researching
  case contacted
  case interested
  case offerReceived = "offer_received"
  case committed
  case declined

  var displayName: String {
    switch self {
    case .researching: return "Researching"
    case .contacted: return "Contacted"
    case .interested: return "Interested"
    case .offerReceived: return "Offer Received"
    case .committed: return "Committed"
    case .declined: return "Declined"
    }
  }

  var badgeColor: Color {
    switch self {
    case .researching: return .gray
    case .contacted: return .yellow
    case .interested: return .green
    case .offerReceived: return .green
    case .committed: return .purple
    case .declined: return .red
    }
  }
}

enum PriorityTier: String, Codable, CaseIterable {
  case a = "A"
  case b = "B"
  case c = "C"

  var displayName: String {
    switch self {
    case .a: return "A (Top Choice)"
    case .b: return "B (Strong Interest)"
    case .c: return "C (Fallback)"
    }
  }
}
```

### School Size Categories

```swift
enum SchoolSize: String {
  case verySmall = "Very Small"   // < 1,000
  case small = "Small"            // 1,000 - 4,999
  case medium = "Medium"          // 5,000 - 14,999
  case large = "Large"            // 15,000 - 29,999
  case veryLarge = "Very Large"   // 30,000+

  var badgeColor: Color {
    switch self {
    case .verySmall: return .indigo
    case .small: return .blue
    case .medium: return .green
    case .large: return .orange
    case .veryLarge: return .purple
    }
  }

  static func from(studentSize: Int?) -> SchoolSize? {
    guard let size = studentSize else { return nil }
    switch size {
    case ..<1_000: return .verySmall
    case 1_000..<5_000: return .small
    case 5_000..<15_000: return .medium
    case 15_000..<30_000: return .large
    default: return .veryLarge
    }
  }
}
```

### Filter State Model

```swift
struct SchoolFilters {
  var searchText: String = ""
  var division: Division? = nil
  var status: SchoolStatus? = nil
  var state: String? = nil
  var isFavoritesOnly: Bool = false
  var priorityTier: PriorityTier? = nil
  var fitScoreMin: Double = 0
  var fitScoreMax: Double = 100
  var maxDistance: Double = 3000      // miles
  var sortBy: SchoolSortOption = .nameAZ

  var hasActiveFilters: Bool {
    !searchText.isEmpty || division != nil || status != nil || state != nil ||
    isFavoritesOnly || priorityTier != nil || fitScoreMin > 0 || fitScoreMax < 100 ||
    maxDistance < 3000
  }
}

enum SchoolSortOption: String, CaseIterable {
  case nameAZ = "A-Z"
  case fitScore = "Fit Score"
  case distance = "Distance"
  case lastContact = "Last Contact"
}
```

### Data Origin

- **Source:** Supabase `schools` table, filtered by `family_unit_id`
- **Logos:** Fetched asynchronously via `useSchoolLogos` (favicon URLs)
- **Fit Scores:** Pre-calculated via `useSchoolMatching.calculateMatchScore()`
- **Distance:** Haversine calculation from home location to school coordinates
- **Refresh:** On page load + when active family changes
- **Mutations:** Delete (simple + cascade), toggle favorite

---

## 4. API Integration

### Supabase Queries

```
// Fetch all schools for family
supabase.from("schools")
  .select("*")
  .eq("family_unit_id", activeFamilyId)

// Toggle favorite
supabase.from("schools")
  .update(["is_favorite": newValue])
  .eq("id", schoolId)
```

### Endpoint: Cascade Delete School

```
POST /api/schools/{id}/cascade-delete

Body:
{ "confirmDelete": true }

Response (Success):
{
  "success": true,
  "deleted": {
    "schools": 1,
    "coaches": 4,
    "interactions": 12,
    "offers": 1
  },
  "message": "School and related records deleted"
}
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain

---

## 5. State Management

### Page-Level State

```swift
@State var allSchools: [School] = []
@State var isLoading = false
@State var error: String? = nil
@State var filters = SchoolFilters()
@State var showDeleteConfirmation = false
@State var schoolToDelete: School? = nil
@State var isDeleting = false
@State var homeLocation: (latitude: Double, longitude: Double)? = nil
@State var availableStates: [String] = []   // Extracted from school data
```

### Computed Properties

```swift
var filteredSchools: [School] {
  // Apply all filters (search, division, status, state, favorites, tier, fit score range, distance)
  // Then sort by selected option
}

var distanceCache: [String: Double] {
  // schoolId → distance in miles (memoized)
}

var stateOptions: [String] {
  // Unique states extracted from school locations
}

var resultCount: Int {
  filteredSchools.count
}
```

### Shared State

- **FamilyManager:** `activeFamilyId` for data scoping
- **PreferenceManager:** Home location for distance calculations

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Title: "Schools"
  - Right: [+ Add School] button

[Parent Athlete Selector] (conditional - parents only)

[Search Bar]
  - Text input with magnifying glass icon
  - Placeholder: "Search by name or location..."

[Filter Panel]
  Row 1: [Division ▾] [Status ▾] [State ▾] [Favorites ▾]
  Row 2: [Priority Tier ▾] [Sort ▾]
  Row 3: Fit Score slider (0-100)
  Row 4: Distance slider (0-3000 mi) — disabled if no home location

[Active Filter Chips]
  - Blue pills with ✕ to remove
  - "Clear all" link

[Results Count + Warning]
  - "{X} result(s) found"
  - Warning banner if 30+ schools

[School Cards List/Grid]
  - Scrollable list of school cards
  - Pull-to-refresh enabled
```

### School Card Layout

```
┌─────────────────────────────────────┐
│ HEADER                              │
│ [Logo/   ] School Name     [⭐]     │
│  Favicon   Location                 │
├─────────────────────────────────────┤
│ BADGES (flex-wrap)                  │
│ [Division] [Status] [Fit: 78]      │
│ [Size: Medium]                      │
├─────────────────────────────────────┤
│ CONTENT                             │
│ Conference name                     │
│ Notes preview (2 lines max)...      │
├─────────────────────────────────────┤
│ ACTIONS                             │
│ [View Details]          [🗑️ Delete] │
└─────────────────────────────────────┘
```

### Badge Colors

**Division Badges:**

- D1: Blue (`bg-blue-100 text-blue-700`)
- D2: Green (`bg-green-100 text-green-700`)
- D3: Purple (`bg-purple-100 text-purple-700`)
- NAIA: Orange (`bg-orange-100 text-orange-700`)
- JUCO: Gray (`bg-gray-100 text-gray-700`)

**Status Badges:**

- Researching: Gray (`bg-slate-100 text-slate-700`)
- Contacted: Yellow (`bg-yellow-100 text-yellow-700`)
- Interested: Emerald (`bg-emerald-100 text-emerald-700`)
- Offer Received: Green (`bg-green-100 text-green-700`)
- Committed: Purple (`bg-purple-100 text-purple-700`)
- Declined: Red (`bg-red-100 text-red-700`)

**Fit Score Badge:**

- 70+: Emerald (`bg-emerald-100 text-emerald-700`)
- 50-69: Orange (`bg-orange-100 text-orange-700`)
- <50: Red (`bg-red-100 text-red-700`)

**Size Badges:** See SchoolSize enum colors above.

### Favorite Star

- Position: Top-right of card header
- Unfavorited: Gray outline star (`star` SF Symbol, slate-300)
- Favorited: Filled yellow star (`star.fill` SF Symbol, yellow-500)
- Tap: Toggle with optimistic update
- Tap area: 44pt minimum

### Sliders

**Fit Score Slider (dual thumb):**

- Range: 0-100
- Step: 5
- Labels: "Min: {value}" / "Max: {value}"
- Track color: Blue

**Distance Slider (single thumb):**

- Range: 0-3000 miles
- Step: 50
- Label: "Within {value} miles"
- Disabled state: Gray, "Set home location" warning
- Track color: Blue

### Warning Banner (30+ schools)

```
┌──────────────────────────────────────────────┐
│ ⚠️  You have {X} schools on your list        │
│ Consider organizing with priority tiers      │
│ (A, B, C) to manage your recruiting strategy │
└──────────────────────────────────────────────┘
```

Background: Amber-50, Border: Amber-200, Text: Amber-800

### Loading States

```
First Load:
- Full-screen spinner with "Loading schools..."
- Logo images load asynchronously after cards render

Pull-to-Refresh:
- Standard iOS pull-to-refresh
- Re-fetches schools

Favorite Toggle:
- Optimistic UI update (instant star change)
- Revert on API failure
```

### Empty States

**No Schools (no data):**

- Icon: `building.2.fill` (large, gray)
- Title: "No schools found"
- CTA: "Add Your First School" → /schools/new

**No Results (filters applied):**

- Icon: `magnifyingglass` (large, gray)
- Title: "No schools match your filters"
- Subtitle: "Try adjusting your filters or search terms"
- CTA: "Clear Filters" button

### Accessibility

- **VoiceOver:** Cards announce: "{name}, {division}, {status}, fit score {score}%"
- **Favorite star:** "Favorite, toggle" / "Favorited, toggle"
- **Sliders:** "Fit score minimum, {value}" / "Distance, {value} miles"
- **Touch Targets:** All buttons 44pt minimum
- **Dynamic Type:** All text supports scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (data queries + auth)
- CoreLocation (for distance calculations)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (schools table)
- Cascade delete API endpoint
- School logos (external favicon URLs)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + pull-to-refresh
- **No internet:** Show offline indicator
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **Null fit_score:** Show no fit badge (omit from card)
- **Null location:** Show "Location unknown"
- **Null division:** Show no division badge
- **Missing logo:** Show school initials in colored circle (like coach avatar)
- **Missing academic_info:** Skip size badge and distance calculation
- **State extraction failure:** Omit from state filter options

### User Errors

- **Distance filter without home location:** Disable slider, show warning
- **Favorite toggle failure:** Revert optimistic update, show brief error toast

### Edge Cases

- **Very long school name:** Truncate with ellipsis
- **School with no notes:** Hide notes section in card
- **100+ schools:** Lazy loading in list; consider performance warning
- **Duplicate school names:** Cards still unique by ID; show location for disambiguation
- **Parent switching athletes:** Re-fetch schools for new family context
- **Fit score = 0:** Show "Fit: 0" in red (not hidden)
- **Distance = 0:** School is at home location; show "0 mi"

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all schools with correct data
- [ ] School cards show name, location, division, status, fit score, size badges
- [ ] Search filters schools by name and location (case-insensitive)
- [ ] Division filter narrows to selected division
- [ ] Status filter narrows to selected status
- [ ] State filter shows unique states and filters correctly
- [ ] Favorites filter shows only starred schools
- [ ] Priority tier filter works correctly
- [ ] Fit score slider filters by score range
- [ ] Distance slider filters by distance (when home location set)
- [ ] Sort options reorder list correctly
- [ ] Active filter chips appear and can be removed individually
- [ ] Tapping "View Details" navigates to school detail page
- [ ] Tapping "Add School" navigates to school creation
- [ ] Favorite toggle persists (star fills/unfills)
- [ ] Delete with confirmation works (simple + cascade)

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle empty school list (show empty state)
- [ ] Handle delete failure (show error alert)
- [ ] Handle favorite toggle failure (revert optimistic update)
- [ ] Handle missing home location (disable distance slider)

### Edge Case Tests

- [ ] Very long school names don't break card layout
- [ ] Schools with no fit score display correctly
- [ ] Schools with no location display "Location unknown"
- [ ] 30+ schools trigger warning banner
- [ ] Distance filter disabled without home location
- [ ] Pull-to-refresh re-fetches data
- [ ] VoiceOver reads all card elements
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolling smooth with 100+ schools
- [ ] Filter changes update instantly
- [ ] Logo loading doesn't block card rendering
- [ ] Distance calculations cached (not recalculated on filter change)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **School logos:** Fetched from external favicon URLs. Some schools may not have logos — use initials fallback.
- **Fit score calculation:** Computed by `useSchoolMatching` based on user preferences. iOS should either call the same calculation logic or display pre-computed scores from the database.
- **Distance calculation:** Uses Haversine formula with school lat/long from `academic_info`. Requires home location from user preferences.
- **Export CSV/PDF:** Web has export buttons. Defer for iOS MVP or implement using share sheet.
- **Dual-thumb slider:** iOS doesn't have a native dual-thumb slider. Options: use a third-party library, build custom, or use two separate sliders for min/max fit score.

### iOS-Specific Considerations

- **Logo loading:** Use `AsyncImage` for favicon URLs with initials placeholder
- **Distance:** Use `CLLocation.distance(from:)` for Haversine calculation
- **Dual slider:** Consider using a custom `RangeSlider` view or two separate `Slider` controls
- **State extraction:** Parse unique states from school `academic_info.state` or location string
- **Filter persistence:** Filters reset when navigating away (no persistence)
- **Favorite optimistic update:** Update local state immediately, revert on API error

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/schools/index.vue`
- **Composables used:**
  - `useSchools()` - CRUD, favorites, smart delete
  - `useSchoolLogos()` - Async logo fetching
  - `useSchoolMatching()` - Fit score calculation
  - `usePreferenceManager()` - Home location + school preferences
  - `useInteractions()` - For export data
  - `useOffers()` - For export data
  - `useCoaches()` - For export data
  - `useFamilyContext()` - Family unit scoping
  - `useUniversalFilter()` - Filter state management
- **Child components:**
  - `StatusSnippet` - Timeline status
  - `AthleteSelector` - Parent athlete switching
  - `DeleteConfirmationModal` - Delete confirmation
- **Utilities:**
  - `getCarnegieSize()` - School size categorization
  - `exportSchoolComparisonToCSV()` - CSV export
  - `generateSchoolComparisonPDF()` - PDF export

### API Documentation

- **Cascade delete:** `POST /api/schools/{id}/cascade-delete`
- **Toggle favorite:** Direct Supabase update on `is_favorite` field

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 7, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** This page has the most filters of any list page. Reuse the filter system from Coaches List but extend with sliders for fit score and distance. The favorite toggle is an important UX element — implement with optimistic updates for responsiveness. Consider simplifying the dual-thumb fit score slider for MVP (use min/max text inputs if custom slider is too complex).

---

## Appendix A: Distance Calculation

### Haversine Formula

```swift
func haversineDistance(
  from: (latitude: Double, longitude: Double),
  to: (latitude: Double, longitude: Double)
) -> Double {  // Returns miles
  let earthRadiusMiles = 3958.8
  let dLat = (to.latitude - from.latitude) * .pi / 180
  let dLon = (to.longitude - from.longitude) * .pi / 180
  let lat1 = from.latitude * .pi / 180
  let lat2 = to.latitude * .pi / 180

  let a = sin(dLat / 2) * sin(dLat / 2) +
          cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
  let c = 2 * atan2(sqrt(a), sqrt(1 - a))

  return earthRadiusMiles * c
}
```

Or use CoreLocation:

```swift
let home = CLLocation(latitude: homeLat, longitude: homeLon)
let school = CLLocation(latitude: schoolLat, longitude: schoolLon)
let distanceMiles = home.distance(from: school) / 1609.34
```

## Appendix B: Fit Score Color Logic

```swift
func fitScoreColor(_ score: Double) -> Color {
  switch score {
  case 70...: return .green     // #10B981
  case 50..<70: return .orange  // #F97316
  default: return .red          // #EF4444
  }
}
```
