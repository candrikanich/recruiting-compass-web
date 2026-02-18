# iOS Page Specification: Activity Feed

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Activity Feed
**Web Route:** `/activity`
**Priority:** MVP / Phase 4 (Medium - Timeline Feature)
**Complexity:** Medium (aggregated timeline, real-time updates, filtering, pagination)
**Estimated Time:** 2-3 days

---

## 1. Overview

### Purpose

Provide a unified timeline of all user activity: interactions with coaches, school status changes, and document uploads. The activity feed gives users a chronological view of their recruiting journey in one place, with filtering and search capabilities.

### Key User Actions

- View all activity events in reverse chronological order
- Filter by activity type (interactions, school status changes, documents)
- Filter by date range (7 days, 30 days, 90 days, all time)
- Search activities by title or description
- Tap clickable activities to navigate to the related entity
- Paginate through large activity lists (20 per page)

### Success Criteria

- Activities from all 3 sources merge into a single sorted timeline
- School names hydrate correctly for interaction and status change events
- Filtering and search work correctly (client-side)
- Pagination controls display when total exceeds page size
- Clickable activities navigate to the correct detail page
- Real-time updates appear when new activities occur (dashboard widget)
- Loading, error, and empty states display appropriately

---

## 2. User Flows

### Primary Flow: View Activity History

```
1. User navigates to Activity page (from tab bar or dashboard "View All")
2. System calls fetchActivities({ limit: 500, offset: 0 })
3. System queries 3 Supabase tables in parallel:
   a. interactions (last 50, by logged_by)
   b. school_status_history (last 50, by changed_by)
   c. documents (last 50, by user_id)
4. System hydrates school names via batch query
5. Events merge, sort by timestamp DESC
6. First 20 display with pagination controls
```

### Alternative Flow: Filter Activities

```
1. User selects "Interactions" from type filter
2. Computed filter: activities.filter(a.type === "interaction")
3. Pagination resets to page 1
4. Filtered activities display
```

### Alternative Flow: Navigate from Activity

```
1. User taps a clickable activity event
2. System reads event.clickUrl
3. Navigate to mapped iOS destination:
   - Interaction → Interaction Detail
   - School Status → School Detail
4. Non-clickable events (documents) don't navigate
```

### Alternative Flow: Real-Time Update (Dashboard Widget)

```
1. Dashboard displays RecentActivityFeed widget (10 items)
2. Supabase Realtime channel subscribes to 3 tables
3. User logs an interaction elsewhere
4. Channel receives INSERT event
5. New ActivityEvent prepends to feed
6. User sees new item appear without manual refresh
```

### Error Scenarios

```
Error: Network failure on load
- User sees: Error message with "Try Again" button
- Recovery: Tap retry to refetch

Error: Supabase query failure
- User sees: Error banner with message
- Recovery: Retry button

Error: No activities found
- User sees: Empty state icon + "No activities found"
- Suggestion: "Try adjusting your filters or search query"
```

---

## 3. Data Models

### Primary Model

```swift
struct ActivityEvent: Codable, Identifiable {
    let id: String                          // Prefixed: "interaction-", "status-", "doc-"
    let type: ActivityEventType
    let timestamp: String                   // ISO date (sort key)
    let title: String                       // e.g., "Email with ASU"
    let description: String                 // First 50 chars of content
    let icon: String                        // Emoji icon
    let entityType: String?                 // "school" | "coach" | "document" | etc.
    let entityId: String?
    let entityName: String?                 // School name, document title, etc.
    let metadata: [String: String]?         // { "relativeTime": "2h ago" }
    let isClickable: Bool
    let clickUrl: String?                   // Navigation destination
}

enum ActivityEventType: String, Codable, CaseIterable {
    case interaction
    case schoolStatusChange = "school_status_change"
    case documentUpload = "document_upload"

    var label: String {
        switch self {
        case .interaction: return "Interactions"
        case .schoolStatusChange: return "School Status Changes"
        case .documentUpload: return "Documents"
        }
    }
}
```

### Icon Mapping

```swift
// Interaction type → emoji
let interactionIcons: [String: String] = [
    "email": "📧",
    "phone_call": "☎️",
    "text": "💬",
    "in_person_visit": "🤝",
    "virtual_meeting": "💻",
    "camp": "⛺",
    "showcase": "🎬",
    "tweet": "🐦",
    "dm": "📱"
]
let defaultInteractionIcon = "📝"

// Other types
let schoolStatusIcon = "📍"
let documentIcon = "📄"
```

### Database Tables Queried

| Table                   | Fields Used                                                    | Filter              | Sort            |
| ----------------------- | -------------------------------------------------------------- | ------------------- | --------------- |
| `interactions`          | id, school_id, type, content, subject, occurred_at, created_at | logged_by = userId  | created_at DESC |
| `school_status_history` | id, school_id, new_status, notes, changed_at                   | changed_by = userId | changed_at DESC |
| `documents`             | id, title, type, created_at                                    | user_id = userId    | created_at DESC |

### Data Origin

- **Source:** 3 Supabase tables merged client-side
- **Refresh:** On page load + real-time subscription (dashboard widget)
- **Caching:** No persistent cache; in-memory during session
- **Mutations:** None (read-only timeline)

---

## 4. API Integration

### Data Fetching Pattern

All queries go directly to Supabase (no custom API endpoints):

#### Fetch Interactions

```
SELECT id, school_id, type, content, subject, occurred_at, created_at
FROM interactions
WHERE logged_by = :userId
ORDER BY created_at DESC
LIMIT 50
```

#### Fetch School Status Changes

```
SELECT id, school_id, new_status, notes, changed_at
FROM school_status_history
WHERE changed_by = :userId
ORDER BY changed_at DESC
LIMIT 50
```

#### Fetch Documents

```
SELECT id, title, type, created_at
FROM documents
WHERE user_id = :userId
ORDER BY created_at DESC
LIMIT 50
```

#### Hydrate School Names

```
SELECT id, name
FROM schools
WHERE id IN (:schoolIds)
```

### Real-Time Subscription (Dashboard Widget Only)

```
Channel: "activity-feed"
Subscriptions:
  1. interactions INSERT (filter: logged_by = userId)
  2. school_status_history INSERT (filter: changed_by = userId)
  3. documents INSERT (filter: user_id = userId)
```

### Authentication

- **Method:** Supabase Auth Token
- **RLS:** Each table has row-level security policies filtering by user/family

---

## 5. State Management

### Page-Level State

```swift
@State var activities: [ActivityEvent] = []
@State var isLoading = false
@State var error: String? = nil
@State var selectedType: ActivityEventType? = nil    // nil = "All"
@State var selectedDateRange: DateRange = .all
@State var searchQuery: String = ""
@State var currentPage: Int = 1
let pageSize: Int = 20

enum DateRange: String, CaseIterable {
    case all = "all"
    case week = "week"        // 7 days
    case month = "month"      // 30 days
    case quarter = "quarter"  // 90 days

    var label: String {
        switch self {
        case .all: return "All Time"
        case .week: return "Last 7 Days"
        case .month: return "Last 30 Days"
        case .quarter: return "Last 90 Days"
        }
    }

    var daysAgo: Int? {
        switch self {
        case .all: return nil
        case .week: return 7
        case .month: return 30
        case .quarter: return 90
        }
    }
}
```

### Computed Properties

```swift
var filteredActivities: [ActivityEvent] {
    var result = activities

    // Type filter
    if let type = selectedType {
        result = result.filter { $0.type == type }
    }

    // Date range filter
    if let days = selectedDateRange.daysAgo {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
        result = result.filter { ISO8601DateFormatter().date(from: $0.timestamp)! >= cutoff }
    }

    // Search filter
    if !searchQuery.isEmpty {
        let query = searchQuery.lowercased()
        result = result.filter {
            $0.title.lowercased().contains(query) ||
            $0.description.lowercased().contains(query)
        }
    }

    return result
}

var paginatedActivities: [ActivityEvent] {
    let start = (currentPage - 1) * pageSize
    let end = min(start + pageSize, filteredActivities.count)
    return Array(filteredActivities[start..<end])
}

var totalPages: Int {
    max(1, Int(ceil(Double(filteredActivities.count) / Double(pageSize))))
}
```

---

## 6. UI/UX Details

### Layout Structure — Full Page (`/activity`)

```
[Navigation Bar]
  - Title: "Activity History"
  - Subtitle: "Track all your recruiting activity"

[Filter Card]
  - Row 1: Activity Type (Picker: All / Interactions / Status Changes / Documents)
  - Row 2: Date Range (Picker: All Time / 7 Days / 30 Days / 90 Days)
  - Row 3: Search (text input: "Search activities...")

[Activity List]
  - Scrollable list of ActivityEventItem cards
  - Each card:
    - Leading: Emoji icon (2xl)
    - Title (medium weight, truncated to 1 line)
    - Description (secondary text, truncated to 2 lines)
    - Trailing: Relative time ("2h ago")
  - Clickable items: Chevron disclosure indicator
  - Non-clickable items: No chevron

[Pagination Controls] (if totalPages > 1)
  - "Previous" button (disabled on page 1)
  - "Page X of Y" label
  - "Next" button (disabled on last page)

[Empty State]
  - Sparkles icon
  - "No activities found"
  - "Try adjusting your filters or search query"

[Loading State]
  - Centered spinner

[Error State]
  - Error message
  - "Try Again" button
```

### Layout Structure — Dashboard Widget

```
[Section Header]
  - "Recent Activity" title
  - Refresh button (trailing)

[Activity List]
  - 10 most recent ActivityEventItem rows
  - Compact style (smaller icons/text)

[Footer]
  - "View All Activity →" link → navigates to /activity

[Empty State]
  - "No recent activity"

[Loading State]
  - Spinner
```

### Activity Event Item Design

```
┌─────────────────────────────────────────────┐
│  📧  Email with Arizona State    ·  2h ago  │
│       Discussed camp schedule...             │
└─────────────────────────────────────────────┘
```

- Icon: 24pt emoji, leading
- Title: `.headline` weight, primary color, 1-line truncation
- Description: `.subheadline`, secondary color, 2-line truncation
- Time: `.caption`, tertiary color, trailing

### Relative Time Formatting

```swift
func formatRelativeTime(_ dateString: String) -> String {
    let date = /* parse ISO date */
    let seconds = Date().timeIntervalSince(date)

    if seconds < 60 { return "just now" }
    if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
    if seconds < 86400 { return "\(Int(seconds / 3600))h ago" }
    if seconds < 604800 { return "\(Int(seconds / 86400))d ago" }

    return date.formatted(.dateTime.month(.abbreviated).day())  // "Jan 15"
}
```

### Accessibility

- Activity items: `.accessibilityLabel("[icon description]: [title]. [description]. [time]")`
- Filter controls: Standard picker accessibility
- Pagination: `.accessibilityLabel("Page [X] of [Y]")`
- All touch targets: 44pt minimum

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client (auth + data + realtime)

### Supabase Realtime (Dashboard Widget)

- Channel subscription for live updates
- Automatically unsubscribes when widget disappears

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show error message with retry
- **No internet:** Show offline indicator
- **Partial failure:** If one of 3 queries fails, show results from successful queries + warning

### Edge Cases

- Zero activities: Show empty state with filter adjustment suggestion
- All activities filtered out: Same empty state
- Very long activity titles: Truncate to 1 line with ellipsis
- Very long descriptions: Truncate to 2 lines with ellipsis
- 500+ activities fetched: Client-side pagination handles performance
- Filter change: Reset pagination to page 1
- Activity with no school_id: Show "Unknown School" as entity name
- Timestamp priority: Interactions use `occurred_at` if present, else `created_at`
- Real-time update while on full page: Not implemented (dashboard widget only)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Activities load from all 3 sources
- [ ] Activities merge and sort by timestamp (newest first)
- [ ] School names hydrate correctly
- [ ] Icons map correctly by interaction type
- [ ] Type filter works (All, Interactions, Status Changes, Documents)
- [ ] Date range filter works (7d, 30d, 90d, all)
- [ ] Search filters by title and description
- [ ] Pagination shows correct page numbers
- [ ] Previous/Next buttons navigate correctly
- [ ] Clickable activities navigate to detail pages
- [ ] Non-clickable activities don't navigate
- [ ] Dashboard widget shows 10 most recent
- [ ] Dashboard "View All" navigates to full page

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle partial query failure (show available data)
- [ ] Handle 401 (redirect to login)
- [ ] Handle empty activity list

### Edge Case Tests

- [ ] Combined filters work (type + date + search)
- [ ] Filter change resets pagination
- [ ] Long text truncates correctly
- [ ] Activities without school names show fallback
- [ ] VoiceOver works on all elements
- [ ] Dynamic type scaling

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolls smoothly with 500 activities
- [ ] Client-side filtering is instant
- [ ] No memory leaks

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- Activity feed fetches 500 items on the full page (vs 10 on dashboard widget)
- All filtering and pagination is client-side (no server-side pagination)
- Real-time updates only on dashboard widget, not the full activity page
- School names require a separate batch query (hydration step)
- `clickUrl` values are web routes that need mapping to iOS navigation

### iOS-Specific Considerations

- Map web `clickUrl` paths to iOS navigation:
  - Interaction activities → Interaction Detail (if implemented)
  - School status activities → School Detail
  - Document activities → non-clickable (no document viewer yet)
- Consider `List` with `LazyVStack` for smooth scrolling of 500 items
- Real-time: Use Supabase iOS SDK's `.channel()` API for dashboard widget
- Pull-to-refresh: Add `.refreshable` modifier for manual reload
- Consider prefetching school names and caching during session

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/activity.vue`
- **Composable:** `useActivityFeed` (fetching, real-time, formatting)
- **Components:** `ActivityEventItem.vue`, `RecentActivityFeed.vue` (dashboard widget)
- **Database tables:** `interactions`, `school_status_history`, `documents`
- **Tests:** `useActivityFeed.spec.ts`, `ActivityEventItem.spec.ts`, `RecentActivityFeed.spec.ts`

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** The activity feed is read-only — no mutations needed. The main complexity is aggregating 3 data sources and hydrating school names. Start with the full page view (simpler, no real-time), then add the dashboard widget with Supabase Realtime subscription. Consider implementing pull-to-refresh since the full page doesn't have real-time updates.
