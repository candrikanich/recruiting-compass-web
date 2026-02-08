# iOS Page Specification: Coaches List

**Project:** The Recruiting Compass iOS App
**Created:** February 7, 2026
**Page Name:** Coaches List
**Web Route:** `/coaches`
**Priority:** MVP / Phase 2 (High - Core Feature)
**Complexity:** High (filtering, communication actions)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

Display all coaches from the user's tracked schools in a searchable, filterable grid. Users can quickly see each coach's contact info, role, responsiveness score, and last contact date. Quick communication actions (email, text, social) allow instant outreach. This page establishes the filterable list pattern reused by Schools and Interactions lists.

### Key User Actions

- Browse all coaches across all tracked schools
- Search coaches by name, email, phone, notes, or social handles
- Filter by role, last contact recency, and responsiveness level
- Sort by name, school, last contacted, responsiveness, or role
- Tap a coach card to view detail page
- Quick-communicate: email, text, tweet, or Instagram message a coach
- Delete a coach (with confirmation)
- Navigate to add a new coach

### Success Criteria

- All coaches for the user's family schools load correctly
- Search filters results in real-time as user types
- Filter dropdowns narrow results correctly
- Active filters display as removable chips
- Communication actions open correct native handlers (email, phone, browser)
- Delete confirmation prevents accidental deletion
- Cascade delete handles coaches with related interactions

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Coaches tab
2. System fetches all schools for user's family unit
3. System fetches all coaches for those schools (ordered by last_name)
4. User sees coach cards in a scrollable grid/list
5. User can search or filter to narrow results
6. User taps a coach card → navigates to coach detail page
```

### Alternative Flow: Filter Coaches

```
1. User taps filter icon or search bar
2. Filter panel appears (search, role, last contact, responsiveness, sort)
3. User selects filters
4. List updates in real-time (client-side filtering)
5. Active filters shown as blue chips below filter bar
6. User taps "Clear all" to reset filters
```

### Alternative Flow: Quick Communication

```
1. User taps email/text/tweet/Instagram icon on a coach card
2a. Email: Opens native email compose (mailto: link)
2b. Text: Opens native SMS compose (tel: link)
2c. Tweet: Opens Twitter/X in browser (external link)
2d. Instagram: Opens Instagram in browser (external link)
```

### Alternative Flow: Delete Coach

```
1. User taps delete icon on coach card
2. Confirmation dialog appears: "Delete [Coach Name]?"
3. User confirms
4. System attempts simple delete
5. If FK constraint error → falls back to cascade delete API
6. Coach removed from list
7. Success: Toast "Coach deleted" or "Coach and X interactions deleted"
```

### Error Scenarios

```
Error: No schools found for family
- User sees: Empty state with "No coaches found"
- Recovery: Add schools first, then add coaches through school detail

Error: Network failure during fetch
- User sees: Error banner with message
- Recovery: Pull-to-refresh

Error: Delete fails
- User sees: Error alert with message
- Recovery: Retry or dismiss
```

---

## 3. Data Models

### Coach Model

```swift
struct Coach: Identifiable, Codable {
  let id: String
  let schoolId: String?
  let userId: String?
  let role: CoachRole
  let firstName: String
  let lastName: String
  let email: String?
  let phone: String?
  let twitterHandle: String?
  let instagramHandle: String?
  let notes: String?
  let responsivenessScore: Double  // 0-100
  let lastContactDate: Date?
  let createdAt: Date?
  let updatedAt: Date?

  var fullName: String { "\(firstName) \(lastName)" }
  var initials: String { "\(firstName.prefix(1))\(lastName.prefix(1))" }
}

enum CoachRole: String, Codable, CaseIterable {
  case head
  case assistant
  case recruiting

  var displayName: String {
    switch self {
    case .head: return "Head Coach"
    case .assistant: return "Assistant"
    case .recruiting: return "Recruiting"
    }
  }

  var badgeColor: Color {
    switch self {
    case .head: return .purple
    case .assistant: return .blue
    case .recruiting: return .green
    }
  }
}
```

### Filter State Model

```swift
struct CoachFilters {
  var searchText: String = ""
  var role: CoachRole? = nil
  var lastContactDays: Int? = nil       // 7, 14, 30, 60, 90
  var responsivenessLevel: ResponsivenessLevel? = nil
  var sortBy: CoachSortOption = .name

  var hasActiveFilters: Bool {
    !searchText.isEmpty || role != nil || lastContactDays != nil || responsivenessLevel != nil
  }
}

enum ResponsivenessLevel: String, CaseIterable {
  case high    // 75-100%
  case medium  // 50-74%
  case low     // 0-49%
}

enum CoachSortOption: String, CaseIterable {
  case name
  case school
  case lastContacted
  case responsiveness
  case role
}
```

### Data Origin

- **Source:** Supabase `coaches` table (joined with `schools` for school name)
- **Access Control:** Filtered by `family_unit_id` (not user_id)
- **Refresh:** On page load + when active family changes
- **Caching:** None (always re-fetch)
- **Mutations:** Delete available (simple + cascade)

---

## 4. API Integration

### Supabase Queries

```
// Step 1: Fetch all schools for family
supabase.from("schools")
  .select("*")
  .eq("family_unit_id", activeFamilyId)

// Step 2: Fetch all coaches for those schools
supabase.from("coaches")
  .select("*")
  .in("school_id", schoolIds)
  .order("last_name", ascending: true)
```

### Endpoint: Cascade Delete Coach

```
POST /api/coaches/{id}/cascade-delete

Body:
{ "confirmDelete": true }

Response (Success):
{
  "success": true,
  "deleted": {
    "coaches": 1,
    "interactions": 3,
    "offers": 0,
    "social_media_posts": 1
  },
  "message": "Coach and related records deleted"
}

Error Codes:
- 401: Not authenticated
- 403: No access to this coach
- 404: Coach not found
```

### Endpoint: Deletion Blockers (Optional)

```
GET /api/coaches/{id}/deletion-blockers

Response:
{
  "canDelete": false,
  "blockers": [
    { "type": "interactions", "count": 3 },
    { "type": "offers", "count": 1 }
  ],
  "message": "Coach has 3 interactions and 1 offer"
}
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK

---

## 5. State Management

### Page-Level State

```swift
@State var allCoaches: [Coach] = []
@State var allSchools: [School] = []     // For school name lookup
@State var isLoading = false
@State var error: String? = nil
@State var filters = CoachFilters()
@State var showDeleteConfirmation = false
@State var coachToDelete: Coach? = nil
@State var isDeleting = false
```

### Computed Properties

```swift
var filteredCoaches: [Coach] {
  // Apply search, role, lastContact, responsiveness filters
  // Then sort by selected sort option
}

var schoolNameMap: [String: String] {
  // schoolId → school.name lookup dictionary
}

var activeFilterCount: Int {
  // Count of non-default filter values
}
```

### Shared State

- **FamilyManager:** `activeFamilyId` for data scoping
- **AuthManager:** Current user context

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Title: "Coaches"
  - Right: [+ Add Coach] button

[Search Bar]
  - Text input with magnifying glass icon
  - Placeholder: "Search coaches..."

[Filter Bar] (horizontal scroll)
  - [Role ▾] [Last Contact ▾] [Responsiveness ▾] [Sort ▾]

[Active Filter Chips] (conditional)
  - Blue pills with ✕ to remove
  - "Clear all" link

[Results Count]
  - "{X} coach(es) found"

[Coach Cards List/Grid]
  - Scrollable list of coach cards
  - Pull-to-refresh enabled
```

### Coach Card Layout

```
┌─────────────────────────────────────┐
│ HEADER                              │
│ [Initials   ] Name      [Role Badge]│
│  Circle       School Name           │
├─────────────────────────────────────┤
│ CONTENT                             │
│ ✉️  email@school.edu (truncated)    │
│ 📱  (555) 123-4567                  │
│ ▮▮▮▮▮▯▯ 65% Responsiveness         │
│ 📅  Last contact: Jan 15, 2026     │
├─────────────────────────────────────┤
│ ACTIONS                             │
│ [✉️] [💬] [🐦] [📸]    [🗑️] [→]   │
│ email text tweet insta  delete view │
└─────────────────────────────────────┘
```

### Visual Details

**Initials Circle:**

- 48pt × 48pt circle
- Blue-to-purple gradient background
- White initials text, 18pt semibold

**Role Badge:**

- Rounded pill shape
- Head: Purple background, purple text
- Assistant: Blue background, blue text
- Recruiting: Emerald background, emerald text

**Responsiveness Bar:**

- Full width progress bar
- Height: 6pt
- Color based on score:
  - 75%+: Emerald (#10B981)
  - 50-74%: Amber (#F59E0B)
  - <50%: Red (#EF4444)
- Label: "{score}% Responsive"

**Communication Buttons:**

- Icon-only buttons, 32pt × 32pt tap target (with 44pt hit area)
- Only show if data exists (email button hidden if no email)
- Subtle gray background, darker on tap

### Filter Dropdowns

**Role Filter:**

- Options: All, Head Coach, Assistant, Recruiting
- Default: All

**Last Contact Filter:**

- Options: All, Last 7 days, Last 14 days, Last 30 days, Last 60 days, Last 90 days
- Default: All

**Responsiveness Filter:**

- Options: All, High (75%+), Medium (50-74%), Low (<50%)
- Default: All

**Sort Options:**

- Name (A-Z), School (A-Z), Last Contacted (newest), Responsiveness (highest), Role (head first)
- Default: Name (A-Z)

### Loading States

```
First Load:
- Full-screen spinner with "Loading coaches..."
- Show only when allCoaches is empty AND isLoading

Pull-to-Refresh:
- Standard iOS pull-to-refresh
- Re-fetches schools then coaches

Delete:
- Button shows spinner during deletion
- Card fades out on successful delete
```

### Empty States

**No Coaches (no data):**

- Icon: `person.2.fill` (large, gray)
- Title: "No coaches found"
- Subtitle: "Add coaches through school detail pages"
- CTA: "Add Coach" button → /coaches/new

**No Results (filters applied):**

- Icon: `magnifyingglass` (large, gray)
- Title: "No coaches match your filters"
- Subtitle: "Try adjusting your search or filters"
- CTA: "Clear Filters" button

### Delete Confirmation Dialog

```
┌──────────────────────────────┐
│  Delete Coach?               │
│                              │
│  Are you sure you want to    │
│  delete [Coach Name]?        │
│  This cannot be undone.      │
│                              │
│  [Cancel]         [Delete]   │
│                   (red)      │
└──────────────────────────────┘
```

### Accessibility

- **VoiceOver:** Cards announce: "{fullName}, {role} at {school}, responsiveness {score}%"
- **Swipe Actions:** Swipe left for delete (alternative to button)
- **Touch Targets:** All buttons 44pt minimum
- **Dynamic Type:** All text supports scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (data queries + auth)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (coaches + schools tables)
- Supabase Auth (session management)
- Cascade delete API endpoint

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry via pull-to-refresh
- **No internet:** Show offline indicator
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **No schools = no coaches:** Show empty state
- **Coach with no school_id:** Skip or show "Unknown School"
- **Missing email/phone:** Hide corresponding communication button
- **Null responsiveness_score:** Show 0% or "--"
- **Null last_contact_date:** Show "Never contacted"

### User Errors

- **Delete coach with dependencies:** Cascade delete handles this automatically
- **Rapid filter changes:** Client-side filtering is instant; no debounce needed

### Edge Cases

- **Very long coach name:** Truncate with ellipsis
- **Very long email:** Truncate in card, full in detail
- **Coach with all social handles:** Show all 4 communication buttons
- **Coach with no social handles:** Show only email/phone (if available)
- **500+ coaches:** List renders with lazy loading; no pagination needed (client-side filtering)
- **Parent switching athletes:** Re-fetch coaches for new family context
- **Concurrent delete:** If coach already deleted, show "Coach not found" error

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all coaches with correct data
- [ ] Coach cards show name, role badge, school, email, phone, responsiveness, last contact
- [ ] Search filters coaches by name, email, phone (case-insensitive)
- [ ] Role filter narrows to selected role
- [ ] Last contact filter shows only coaches contacted within timeframe
- [ ] Responsiveness filter shows correct score ranges
- [ ] Sort options reorder list correctly
- [ ] Active filter chips appear and can be removed individually
- [ ] "Clear all" removes all filters
- [ ] Tapping "View" navigates to coach detail page
- [ ] Tapping "Add Coach" navigates to coach creation
- [ ] Delete confirmation shows and requires explicit confirm
- [ ] Simple delete works for coaches with no dependencies
- [ ] Cascade delete works for coaches with interactions/offers

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle empty coach list (show empty state)
- [ ] Handle delete failure (show error alert)
- [ ] Handle server errors (5xx)

### Communication Tests

- [ ] Email button opens native mail compose with correct address
- [ ] Text/SMS button opens native messaging with correct number
- [ ] Twitter button opens twitter.com/{handle} in browser
- [ ] Instagram button opens instagram.com/{handle} in browser
- [ ] Buttons hidden when coach lacks that contact method

### Edge Case Tests

- [ ] Very long names don't break card layout
- [ ] Special characters in names display correctly
- [ ] 0% responsiveness shows correctly (not blank)
- [ ] "Never contacted" shown when no last_contact_date
- [ ] Pull-to-refresh re-fetches data
- [ ] VoiceOver reads all coach card elements
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolling is smooth with 100+ coaches
- [ ] Search filtering is instant (<100ms)
- [ ] No memory leaks when navigating away and back

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **No pagination:** Web loads all coaches at once and filters client-side. Works fine for typical use (<500 coaches). iOS should match this approach.
- **Export CSV/PDF:** Web has export buttons but they are marked TODO (not implemented). Skip for iOS MVP.
- **Communication panel:** Web opens an in-app communication panel with template selection and interaction logging. For iOS MVP, use native mail/SMS instead and defer interaction logging to Phase 3.
- **Responsiveness calculation:** Score is pre-computed and stored on the coach record. iOS does not need to calculate it—just display the value.

### iOS-Specific Considerations

- **Native email/SMS:** Use `MFMailComposeViewController` or `mailto:` URL scheme for email. Use `sms:` URL scheme for text.
- **External links:** Open Twitter/Instagram in SFSafariViewController or default browser
- **Filter persistence:** Filters should reset when navigating away (no persistence needed)
- **Family-scoped access:** Always filter by `family_unit_id`, never `user_id` alone
- **Card vs List:** Consider using a `List` with custom rows rather than a grid for better iOS-native feel. Grid layout (like web) works well on iPad.

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/coaches/index.vue`
- **Composables used:**
  - `useCoaches()` - CRUD operations, smart delete
  - `useCommunication()` - Communication panel state
  - `useFamilyContext()` - Family unit scoping
  - `useSupabase()` - Direct Supabase queries
- **Store mutations:**
  - `useUserStore()` - Current user info
- **Child components:**
  - `StatusSnippet` - Timeline status
  - `CommunicationPanel` - Email/text composer modal
  - `DeleteConfirmationModal` - Delete confirmation
  - `FormErrorSummary` - Error display
- **Validation schema:** `/utils/validation/schemas.ts` → `coachSchema`

### API Documentation

- **Cascade delete:** `POST /api/coaches/{id}/cascade-delete`
- **Deletion blockers:** `GET /api/coaches/{id}/deletion-blockers`

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 7, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** This page establishes the filterable list pattern. Build the filter system generically so it can be reused for Schools and Interactions lists. For communication actions, start with native iOS handlers (mailto:, sms:, URL) rather than building an in-app communication panel.

---

## Appendix A: Search Implementation Detail

### Client-Side Search

All filtering happens in a computed property after data is fetched:

```swift
var filteredCoaches: [Coach] {
  var result = allCoaches

  // 1. Text search (case-insensitive, matches multiple fields)
  if !filters.searchText.isEmpty {
    let query = filters.searchText.lowercased()
    result = result.filter { coach in
      coach.firstName.lowercased().contains(query) ||
      coach.lastName.lowercased().contains(query) ||
      (coach.email?.lowercased().contains(query) ?? false) ||
      (coach.phone?.contains(query) ?? false) ||
      (coach.notes?.lowercased().contains(query) ?? false) ||
      (coach.twitterHandle?.lowercased().contains(query) ?? false) ||
      (coach.instagramHandle?.lowercased().contains(query) ?? false)
    }
  }

  // 2. Role filter
  if let role = filters.role {
    result = result.filter { $0.role == role }
  }

  // 3. Last contact filter (days)
  if let days = filters.lastContactDays {
    let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
    result = result.filter { coach in
      guard let lastContact = coach.lastContactDate else { return false }
      return lastContact >= cutoff
    }
  }

  // 4. Responsiveness filter
  if let level = filters.responsivenessLevel {
    result = result.filter { coach in
      switch level {
      case .high: return coach.responsivenessScore >= 75
      case .medium: return coach.responsivenessScore >= 50 && coach.responsivenessScore < 75
      case .low: return coach.responsivenessScore < 50
      }
    }
  }

  // 5. Sort
  return sortCoaches(result, by: filters.sortBy)
}
```

## Appendix B: Deletion Flow Detail

### Smart Delete Pattern

```swift
func smartDelete(coachId: String) async throws -> DeleteResult {
  do {
    // Fast path: simple delete
    try await supabaseManager.deleteCoach(coachId)
    return DeleteResult(cascadeUsed: false)
  } catch {
    // Check if FK constraint error
    if isForeignKeyError(error) {
      // Slow path: cascade delete via API
      let response = try await $fetch("/api/coaches/\(coachId)/cascade-delete", body: ["confirmDelete": true])
      if response.success {
        return DeleteResult(cascadeUsed: true, deletedCounts: response.deleted)
      }
    }
    throw error
  }
}

struct DeleteResult {
  let cascadeUsed: Bool
  var deletedCounts: [String: Int]?
}
```
