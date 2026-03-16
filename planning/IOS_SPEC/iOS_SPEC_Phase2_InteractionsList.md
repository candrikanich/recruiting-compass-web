# iOS Page Specification: Interactions List

**Project:** The Recruiting Compass iOS App
**Created:** February 7, 2026
**Page Name:** Interactions List
**Web Route:** `/interactions`
**Priority:** MVP / Phase 2 (High - Core Feature)
**Complexity:** Medium
**Estimated Time:** 3 days

---

## 1. Overview

### Purpose

Display a timeline of all coaching interactions (communications) logged by the athlete or their parents. Interactions are the core tracking mechanism for the recruiting process — every email sent, phone call made, campus visit, or DM exchanged gets logged here. The page includes analytics cards showing totals, filtering by type/direction/sentiment/time, and role-based access (athletes see only their own; parents see all family interactions).

### Key User Actions

- Browse all logged interactions in reverse chronological order
- View analytics summary (total, outbound, inbound, this week)
- Search by subject or content
- Filter by type, direction, sentiment, time period, and logged-by (parents)
- Tap an interaction card to view full detail
- Navigate to log a new interaction
- Export interactions to CSV or PDF (if implemented)

### Success Criteria

- All interactions for the user's family load correctly
- Analytics cards show accurate counts
- Filters combine with AND logic and update results in real-time
- Interaction cards show type icon, direction, sentiment, school/coach context, and date
- Athletes see only their own interactions; parents see all family interactions
- "Logged By" filter appears only for parents
- Privacy notice displayed for athletes

---

## 2. User Flows

### Primary Flow (Athlete)

```
1. User navigates to Interactions tab
2. System fetches all interactions where logged_by = current user ID
3. User sees analytics dashboard (4 metric cards)
4. User sees interaction cards in reverse chronological order
5. User can search, filter, or sort to narrow results
6. User taps a card → navigates to interaction detail page
7. User taps "Log Interaction" → navigates to add interaction page
```

### Primary Flow (Parent)

```
1. Parent navigates to Interactions tab
2. System fetches all interactions for the family unit
3. Parent sees all family interactions (from all members)
4. "Logged By" filter is visible (can filter by "Me" or specific athlete)
5. Each card shows who logged it (parent vs. athlete badge)
6. Parent can filter to see only their own or specific child's interactions
```

### Alternative Flow: Filter Interactions

```
1. User taps filter controls
2. Filter panel shows: Search, Type, Direction, Sentiment, Time Period, [Logged By]
3. User selects filters
4. List and analytics update in real-time
5. Active filters shown as removable chips
```

### Error Scenarios

```
Error: No interactions found
- User sees: Empty state with "No interactions yet" + "Log your first interaction" CTA
- Recovery: Navigate to /interactions/add

Error: Network failure
- User sees: Error banner with message
- Recovery: Pull-to-refresh
```

---

## 3. Data Models

### Interaction Model

```swift
struct Interaction: Identifiable, Codable {
  let id: String
  let type: InteractionType
  let direction: Direction
  let schoolId: String?
  let coachId: String?
  let subject: String?
  let content: String?
  let sentiment: Sentiment?
  let occurredAt: Date?
  let loggedBy: String?           // User ID who logged it
  let attachments: [String]?
  let createdAt: Date?
  let updatedAt: Date?

  var displayDate: Date {
    occurredAt ?? createdAt ?? Date()
  }

  var hasAttachments: Bool {
    !(attachments ?? []).isEmpty
  }

  var attachmentCount: Int {
    (attachments ?? []).count
  }
}

enum InteractionType: String, Codable, CaseIterable {
  case email
  case phoneCall = "phone_call"
  case text
  case inPersonVisit = "in_person_visit"
  case virtualMeeting = "virtual_meeting"
  case camp
  case showcase
  case tweet
  case directMessage = "dm"

  var displayName: String {
    switch self {
    case .email: return "Email"
    case .phoneCall: return "Phone Call"
    case .text: return "Text"
    case .inPersonVisit: return "In-Person Visit"
    case .virtualMeeting: return "Virtual Meeting"
    case .camp: return "Camp"
    case .showcase: return "Showcase"
    case .tweet: return "Tweet"
    case .directMessage: return "Direct Message"
    }
  }

  var iconName: String {  // SF Symbol names
    switch self {
    case .email: return "envelope.fill"
    case .phoneCall: return "phone.fill"
    case .text: return "bubble.left.fill"
    case .inPersonVisit: return "person.2.fill"
    case .virtualMeeting: return "video.fill"
    case .camp: return "figure.run"
    case .showcase: return "star.fill"
    case .tweet: return "bubble.left.fill"
    case .directMessage: return "paperplane.fill"
    }
  }

  var iconColor: Color {
    switch self {
    case .email: return .blue
    case .phoneCall: return .purple
    case .text: return .green
    case .inPersonVisit: return .orange
    case .virtualMeeting: return .indigo
    case .camp: return .orange
    case .showcase: return .pink
    case .tweet: return .cyan
    case .directMessage: return .purple
    }
  }
}

enum Direction: String, Codable, CaseIterable {
  case outbound
  case inbound

  var displayName: String {
    switch self {
    case .outbound: return "Outbound"
    case .inbound: return "Inbound"
    }
  }

  var badgeColor: Color {
    switch self {
    case .outbound: return .blue
    case .inbound: return .green
    }
  }
}

enum Sentiment: String, Codable, CaseIterable {
  case veryPositive = "very_positive"
  case positive
  case neutral
  case negative

  var displayName: String {
    switch self {
    case .veryPositive: return "Very Positive"
    case .positive: return "Positive"
    case .neutral: return "Neutral"
    case .negative: return "Negative"
    }
  }

  var badgeColor: Color {
    switch self {
    case .veryPositive: return .green
    case .positive: return .blue
    case .neutral: return .gray
    case .negative: return .red
    }
  }
}
```

### Filter State Model

```swift
struct InteractionFilters {
  var searchText: String = ""
  var type: InteractionType? = nil
  var direction: Direction? = nil
  var sentiment: Sentiment? = nil
  var timePeriod: TimePeriod? = nil
  var loggedBy: String? = nil          // User ID (parents only)

  var hasActiveFilters: Bool {
    !searchText.isEmpty || type != nil || direction != nil ||
    sentiment != nil || timePeriod != nil || loggedBy != nil
  }
}

enum TimePeriod: Int, CaseIterable {
  case last7Days = 7
  case last14Days = 14
  case last30Days = 30
  case last90Days = 90

  var displayName: String {
    switch self {
    case .last7Days: return "Last 7 days"
    case .last14Days: return "Last 14 days"
    case .last30Days: return "Last 30 days"
    case .last90Days: return "Last 90 days"
    }
  }
}
```

### Analytics Model

```swift
struct InteractionAnalytics {
  let totalCount: Int
  let outboundCount: Int
  let inboundCount: Int
  let thisWeekCount: Int
}
```

### Data Origin

- **Source:** Supabase `interactions` table, filtered by `family_unit_id`
- **Athletes:** Auto-filtered by `logged_by = currentUserId`
- **Parents:** See all family interactions; can filter by `logged_by`
- **Related data:** Schools and coaches for name lookup
- **Refresh:** On page load + when active family changes
- **Caching:** None (always re-fetch)

---

## 4. API Integration

### Supabase Queries

```
// Fetch interactions (athlete)
supabase.from("interactions")
  .select("*")
  .eq("logged_by", currentUserId)
  .order("occurred_at", ascending: false)

// Fetch interactions (parent - all family)
supabase.from("interactions")
  .select("*")
  .eq("family_unit_id", activeFamilyId)
  .order("occurred_at", ascending: false)

// Fetch schools (for name lookup)
supabase.from("schools")
  .select("id, name")
  .eq("family_unit_id", activeFamilyId)

// Fetch coaches (for name lookup)
supabase.from("coaches")
  .select("id, first_name, last_name, school_id")
  .in("school_id", schoolIds)
```

### Endpoint: Cascade Delete Interaction

```
POST /api/interactions/{id}/cascade-delete

Body:
{ "confirmDelete": true }

Response:
{
  "success": true,
  "deleted": { "interactions": 1 },
  "message": "Interaction deleted"
}
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain

---

## 5. State Management

### Page-Level State

```swift
@State var allInteractions: [Interaction] = []
@State var schools: [School] = []           // For name lookup
@State var coaches: [Coach] = []            // For name lookup
@State var isLoading = false
@State var error: String? = nil
@State var filters = InteractionFilters()
@State var linkedAthletes: [LinkedAthlete] = []  // Parents only
```

### Computed Properties

```swift
var filteredInteractions: [Interaction] {
  // Apply all filters (search, type, direction, sentiment, timePeriod, loggedBy)
  // Return sorted by displayDate descending
}

var analytics: InteractionAnalytics {
  let total = filteredInteractions.count
  let outbound = filteredInteractions.filter { $0.direction == .outbound }.count
  let inbound = filteredInteractions.filter { $0.direction == .inbound }.count
  let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
  let thisWeek = filteredInteractions.filter { $0.displayDate >= weekAgo }.count
  return InteractionAnalytics(totalCount: total, outboundCount: outbound, inboundCount: inbound, thisWeekCount: thisWeek)
}

var schoolNameMap: [String: String]    // schoolId → name
var coachNameMap: [String: String]     // coachId → "First Last"

var isParent: Bool {
  authManager.user?.role == .parent
}
```

### Shared State

- **FamilyManager:** `activeFamilyId`, `isViewingAsParent`
- **AuthManager:** Current user, role

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Title: "My Interactions" (athlete) or "Interactions" (parent)
  - Right: [+ Log Interaction] button

[Privacy Notice] (athletes only)
  - "Your recruiting interactions are visible to your linked parent(s)"

[Analytics Dashboard] (4 metric cards in 2×2 grid)
  - Total | Outbound | Inbound | This Week

[Search Bar]
  - Placeholder: "Subject, content..."

[Filter Bar] (horizontal scroll)
  - [Type ▾] [Direction ▾] [Sentiment ▾] [Time Period ▾] [Logged By ▾ (parents)]

[Active Filter Chips]
  - Removable blue pills + "Clear all"

[Results Count]
  - "{X} interaction(s) found"

[Interaction Cards List]
  - Scrollable, reverse chronological
  - Pull-to-refresh enabled
```

### Analytics Cards

4 cards in a 2-column grid:

| Card      | Icon (SF Symbol)                    | Background | Value           |
| --------- | ----------------------------------- | ---------- | --------------- |
| Total     | `bubble.left.and.bubble.right.fill` | Blue-50    | Total count     |
| Outbound  | `arrow.up.circle.fill`              | Emerald-50 | Outbound count  |
| Inbound   | `arrow.down.circle.fill`            | Purple-50  | Inbound count   |
| This Week | `calendar.circle.fill`              | Amber-50   | This week count |

Card dimensions: Half-width, ~80pt tall, 12pt corner radius

### Interaction Card Layout

```
┌─────────────────────────────────────┐
│ [Type    ] [Type Badge] [Direction] │
│  Icon      "Email"      "Outbound"  │
│            [Logged By]  [Sentiment] │
│                                     │
│ Subject line (one line, truncated)  │
│ School Name • Coach Name            │
│ Content preview (2 lines max)...    │
│                                     │
│ 📅 Feb 3, 2026, 2:15 PM  📎 2 files│
└─────────────────────────────────────┘
```

### Type Icon

- Colored circle background (40pt × 40pt)
- White SF Symbol icon centered
- Color matches `InteractionType.iconColor`

### Badge Colors

**Direction Badge:**

- Outbound: Blue background, blue text
- Inbound: Emerald background, emerald text

**Sentiment Badge:**

- Very Positive: Emerald background
- Positive: Blue background
- Neutral: Slate/gray background
- Negative: Red background

**Logged By Badge (parents only):**

- "You": Blue background
- Athlete name: Purple background

### Date Formatting

- Format: "MMM d, yyyy, h:mm a" (e.g., "Feb 3, 2026, 2:15 PM")
- Source: `occurred_at` (primary) or `created_at` (fallback)

### Loading States

```
First Load:
- Full-screen spinner with "Loading interactions..."
- Show only when allInteractions is empty AND isLoading

Pull-to-Refresh:
- Standard iOS pull-to-refresh
- Analytics cards update with filtered data
```

### Empty States

**No Interactions (no data):**

- Icon: `bubble.left.and.bubble.right.fill` (large, gray)
- Title: "No interactions yet"
- Subtitle: "Start logging your recruiting communications"
- CTA: "Log Your First Interaction" → /interactions/add

**No Results (filters applied):**

- Icon: `magnifyingglass` (large, gray)
- Title: "No interactions match your filters"
- Subtitle: "Try adjusting your search or filters"
- CTA: "Clear Filters" button

### Privacy Notice (Athletes Only)

```
┌──────────────────────────────────────────┐
│ ℹ️  Your recruiting interactions are      │
│    visible to your linked parent(s)      │
└──────────────────────────────────────────┘
```

Background: Blue-50, Text: Blue-700, subtle rounded border

### Accessibility

- **VoiceOver:** Cards announce: "{type} {direction}, {subject}, with {coach} at {school}, {date}"
- **Analytics cards:** "{label}: {count}"
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

- Supabase PostgreSQL (interactions, schools, coaches tables)
- Supabase Auth (session management)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + pull-to-refresh
- **No internet:** Show offline indicator
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **Null occurred_at:** Use `created_at` as fallback date
- **Null subject:** Show type name as fallback (e.g., "Email")
- **Null school_id/coach_id:** Omit school/coach line from card
- **Missing content:** Hide content preview line
- **Empty attachments array:** Hide attachment indicator

### User Errors

- **Search with no results:** Show "No interactions match" empty state
- **Filter combination with no results:** Show clear filters CTA

### Edge Cases

- **Very long subject:** Truncate to single line with ellipsis
- **Very long content:** Clamp to 2 lines with ellipsis
- **500+ interactions:** Lazy loading handles this; no pagination needed for MVP
- **Parent with no linked athletes:** "Logged By" filter still shows "Me (Parent)" option
- **Interaction with deleted school/coach:** Show "Unknown School" / "Unknown Coach"
- **Same-second interactions:** Stable sort by `id` as tiebreaker
- **Timezone handling:** Display dates in user's local timezone

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all interactions in reverse chronological order
- [ ] Analytics cards show correct counts (total, outbound, inbound, this week)
- [ ] Search filters by subject and content (case-insensitive)
- [ ] Type filter narrows to selected interaction type
- [ ] Direction filter shows only outbound or inbound
- [ ] Sentiment filter narrows correctly
- [ ] Time period filter shows interactions within selected window
- [ ] Active filter chips appear and can be removed
- [ ] Tapping a card navigates to interaction detail
- [ ] "Log Interaction" button navigates to creation page
- [ ] Interaction cards show correct type icon, badges, school/coach names, date

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle empty interaction list (show empty state)
- [ ] Handle server errors (5xx)
- [ ] Handle missing school/coach references gracefully

### Role-Based Tests

- [ ] Athletes see only their own interactions (logged_by filter)
- [ ] Athletes see privacy notice banner
- [ ] Athletes do NOT see "Logged By" filter
- [ ] Parents see all family interactions
- [ ] Parents see "Logged By" filter with correct options
- [ ] Parents see "Logged By" badge on each card
- [ ] Parent switching athletes re-fetches data

### Edge Case Tests

- [ ] Very long subjects truncate correctly
- [ ] Very long content clamps to 2 lines
- [ ] Interactions with no school/coach display correctly
- [ ] Interactions with attachments show file count
- [ ] Analytics update when filters change
- [ ] Pull-to-refresh re-fetches data
- [ ] VoiceOver reads all card elements
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolling smooth with 200+ interactions
- [ ] Filter changes update instantly
- [ ] No memory leaks when navigating away and back

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **No pagination:** Web loads all interactions at once. Works for typical use. iOS should match.
- **Export CSV/PDF:** Web has export buttons. Defer for iOS MVP.
- **Attachment viewing:** Web shows attachment count but detail view handles actual viewing. iOS list just shows count indicator.
- **Communication panel integration:** On web, logging an interaction also updates coach's `last_contact_date`. iOS should handle this in the add interaction flow (Phase 3).
- **Real-time updates:** Web doesn't use real-time subscriptions for interactions list. Simple fetch-on-load is sufficient.

### iOS-Specific Considerations

- **Date formatting:** Use `DateFormatter` with locale-aware formatting
- **Timezone:** Always display in user's local timezone
- **Privacy notice:** Show only for athletes, not parents
- **Logged By lookup:** For parent mode, fetch linked athlete names via account links or family members
- **Filter reset:** Filters reset when navigating away
- **Analytics reactivity:** Analytics should recompute when filtered list changes

### Access Control Rules

- **Athletes can only see interactions where `logged_by == currentUserId`**
- **Parents see all interactions in their accessible family units**
- **Family-scoped access:** Use `family_unit_id` as the access boundary
- **Only students can CREATE interactions** (database-enforced)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/interactions/index.vue`
- **Composables used:**
  - `useInteractions()` - CRUD, filtering, reminders
  - `useFamilyContext()` - Family unit scoping
  - `useSupabase()` - Direct queries
- **Store mutations:**
  - `useUserStore()` - Current user, role check
- **Child components:**
  - `StatusSnippet` - Timeline status
  - Inline analytics cards (not separate component)
  - Inline interaction cards (not separate component)
- **Types:** `InteractionType`, `Direction`, `Sentiment` from `types/models.ts`

### API Documentation

- **Cascade delete:** `POST /api/interactions/{id}/cascade-delete`
- **School/Coach lookup:** Direct Supabase queries for name resolution

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 7, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** This is the simplest of the three list pages. Reuse the filter system from Coaches/Schools lists. The key differentiation is role-based access control (athlete vs. parent views) and the analytics dashboard at the top. The "Logged By" filter is parent-only — conditionally render it based on user role.

---

## Appendix A: Client-Side Filtering

```swift
var filteredInteractions: [Interaction] {
  var result = allInteractions

  // 1. Text search (subject + content)
  if !filters.searchText.isEmpty {
    let query = filters.searchText.lowercased()
    result = result.filter { interaction in
      (interaction.subject?.lowercased().contains(query) ?? false) ||
      (interaction.content?.lowercased().contains(query) ?? false)
    }
  }

  // 2. Type filter
  if let type = filters.type {
    result = result.filter { $0.type == type }
  }

  // 3. Direction filter
  if let direction = filters.direction {
    result = result.filter { $0.direction == direction }
  }

  // 4. Sentiment filter
  if let sentiment = filters.sentiment {
    result = result.filter { $0.sentiment == sentiment }
  }

  // 5. Time period filter
  if let period = filters.timePeriod {
    let cutoff = Calendar.current.date(byAdding: .day, value: -period.rawValue, to: Date())!
    result = result.filter { $0.displayDate >= cutoff }
  }

  // 6. Logged By filter (parents only)
  if let userId = filters.loggedBy {
    result = result.filter { $0.loggedBy == userId }
  }

  // Sort by date descending (newest first)
  return result.sorted { $0.displayDate > $1.displayDate }
}
```

## Appendix B: Analytics Computation

```swift
var analytics: InteractionAnalytics {
  let filtered = filteredInteractions
  let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!

  return InteractionAnalytics(
    totalCount: filtered.count,
    outboundCount: filtered.filter { $0.direction == .outbound }.count,
    inboundCount: filtered.filter { $0.direction == .inbound }.count,
    thisWeekCount: filtered.filter { $0.displayDate >= weekAgo }.count
  )
}
```

Note: Analytics are computed from the **filtered** list, not the full list. This means applying filters changes the analytics cards too, giving users real-time insight into their filtered subset.
