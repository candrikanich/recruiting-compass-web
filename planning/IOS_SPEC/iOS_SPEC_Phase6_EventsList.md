# iOS Page Specification: Events List

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Events List
**Web Route:** `/events/index`
**Priority:** Phase 6 (Polish & Edge Cases)
**Complexity:** High
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

The Events List page allows athletes to track all recruiting events (camps, showcases, official/unofficial visits, games), manage attendance status, view events on a calendar, and filter by type, date range, and registration status. It serves as the central hub for event management.

### Key User Actions

- View all events in a calendar + list view
- Navigate calendar by month (previous/next)
- Filter by event type (camp, showcase, visit, game)
- Filter by status (registered, not registered, attended)
- Filter by date range (upcoming, past, this month, next month)
- Search events by name, location, description
- Sort events by date, name, or type
- Navigate to event detail page
- Create new event (→ `/events/create`)
- Delete event with confirmation
- Tap calendar date to scroll to event

### Success Criteria

- Events load within 2 seconds
- Calendar displays all events with visual indicators (dots)
- Filtering and sorting work correctly and update instantly
- Search returns relevant results
- Calendar navigation is smooth
- Empty states guide user to add first event
- All CRUD operations persist correctly

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Events page
2. System fetches all events from Supabase
3. System displays:
   - Timeline status snippet at top
   - Calendar view showing current month with event indicators
   - Filter/sort controls
   - Events list (chronological cards)
4. User can tap calendar date with event to scroll to that event
5. User can tap event card to view details
6. User can delete event directly from list
```

### Alternative Flow: Filter Events

```
1. User taps filter controls
2. User selects:
   - Event Type (All, Camp, Showcase, Visit, Game)
   - Status (All, Registered, Not Registered, Attended)
   - Date Range (All, Upcoming, Past, This Month, Next Month)
3. System applies filters instantly
4. List updates with matching events
5. Empty state shows if no results
```

### Alternative Flow: Search Events

```
1. User types in search field
2. System filters events matching:
   - Event name
   - Description
   - Location (address, city)
3. Results update as user types
4. Clear search button resets filter
```

### Alternative Flow: Navigate Calendar

```
1. User taps "Previous" or "Next" month arrows
2. Calendar updates to show new month
3. Event indicators appear for dates with events in that month
4. User can tap highlighted date to scroll list to that date's events
```

### Alternative Flow: Delete Event

```
1. User taps delete button (trash icon) on event card
2. System shows confirmation alert: "Are you sure you want to delete this event?"
3. User confirms deletion
4. System calls DELETE /api/events/[id]
5. System removes event from list and calendar
```

### Error Scenarios

```
Error: No events exist
- User sees: Empty state with calendar icon
- Message: "No events yet"
- Subtitle: "Create your first event to start tracking camps and showcases"
- CTA: "+ Add Event" button

Error: No results match filters
- User sees: Empty filter state with funnel icon
- Message: "No events match your filters"
- Subtitle: "Try adjusting your search criteria"
- Action: "Clear filters" button

Error: Network failure
- User sees: Error banner at top
- Recovery: Pull-to-refresh
```

---

## 3. Data Models

### Primary Model: Event

```swift
struct Event: Codable, Identifiable {
  let id: String
  let userId: String
  let schoolId: String?
  let type: EventType
  let name: String
  let location: String?
  let address: String?
  let city: String?
  let state: String?
  let startDate: String  // ISO date: "YYYY-MM-DD"
  let endDate: String?
  let startTime: String?
  let endTime: String?
  let checkinTime: String?
  let url: String?
  let description: String?
  let eventSource: EventSource?
  let coachesPresent: [String]?  // Array of coach IDs
  let performanceNotes: String?
  let statsRecorded: [String: Any]?
  let cost: Double?
  let registered: Bool
  let attended: Bool
  let createdAt: Date
  let updatedAt: Date

  // Computed properties
  var statusLabel: String {
    if attended { return "Attended" }
    if registered { return "Registered" }
    return "Not Registered"
  }

  var statusColor: UIColor {
    if attended { return .systemGreen }
    if registered { return .systemBlue }
    return .systemGray
  }

  var dateRange: String {
    if endDate == nil || endDate == startDate {
      return formatDate(startDate)
    }
    return "\(formatDate(startDate)) - \(formatDate(endDate!))"
  }
}

enum EventType: String, Codable, CaseIterable {
  case camp
  case showcase
  case officialVisit = "official_visit"
  case unofficialVisit = "unofficial_visit"
  case game

  var displayName: String {
    switch self {
    case .camp: return "Camp"
    case .showcase: return "Showcase"
    case .officialVisit: return "Official Visit"
    case .unofficialVisit: return "Unofficial Visit"
    case .game: return "Game"
    }
  }

  var badgeColor: UIColor {
    switch self {
    case .camp: return .systemGreen
    case .showcase: return .systemPurple
    case .officialVisit: return .systemBlue
    case .unofficialVisit: return .systemCyan
    case .game: return .systemOrange
    }
  }
}

enum EventSource: String, Codable {
  case email, flyer, webSearch = "web_search", recommendation, friend, other

  var displayName: String {
    switch self {
    case .email: return "Email"
    case .flyer: return "Flyer"
    case .webSearch: return "Web Search"
    case .recommendation: return "Recommendation"
    case .friend: return "Friend"
    case .other: return "Other"
    }
  }
}
```

### Related Models

- **School** (optional link via `school_id`)
- **Coach** (coaches present at event)
- **PerformanceMetric** (metrics recorded at event)
- **Interaction** (interactions logged at event)

### Data Origin

- **Source:** Supabase table `events`
- **Refresh:** On page load, manual pull-to-refresh
- **Caching:** Cache events for 5 minutes (stale-while-revalidate)
- **Mutations:** Create, Update, Delete available

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch All Events

```
GET /api/events (handled by Supabase client directly)

Query via Supabase:
- .from("events")
- .select("*")
- .eq("user_id", currentUserId)
- .order("start_date", { ascending: true })

Optional filters:
- .eq("school_id", schoolId)
- .eq("type", eventType)
- .gte("start_date", startDateISO)
- .lte("start_date", endDateISO)

Response:
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "school_id": "uuid",
    "type": "showcase",
    "name": "Spring Showcase 2026",
    "location": "Atlanta, GA",
    "start_date": "2026-04-15",
    "end_date": "2026-04-16",
    "start_time": "09:00",
    "cost": 150.00,
    "registered": true,
    "attended": false,
    "created_at": "2026-02-10T..."
  },
  ...
]
```

#### Endpoint 2: Fetch Single Event

```
GET /api/events/[id] (Supabase client)

Query:
- .from("events")
- .select("*")
- .eq("id", eventId)
- .eq("user_id", currentUserId)
- .single()

Response:
{
  "id": "uuid",
  ...event fields
}

Error Codes:
- 401: Not authenticated
- 403: No access to this event
- 404: Event not found
```

#### Endpoint 3: Delete Event

```
DELETE /api/events/[id] (Supabase client)

Body: None

Response:
{ "success": true }

Error Codes:
- 401: Not authenticated
- 403: Not authorized to delete this event
- 404: Event not found
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK
- **Logout:** Clear token from Keychain

---

## 5. State Management

### Page-Level State

```swift
@State var events: [Event] = []
@State var isLoading = false
@State var error: String? = nil

// Filters
@State var searchQuery = ""
@State var typeFilter: EventType? = nil
@State var statusFilter: StatusFilter = .all
@State var dateRangeFilter: DateRangeFilter = .all

// Calendar
@State var currentMonth: Date = Date()
@State var selectedDate: Date? = nil

// Sort
@State var sortBy: SortOption = .dateDesc

enum StatusFilter {
  case all, registered, notRegistered, attended
}

enum DateRangeFilter {
  case all, upcoming, past, thisMonth, nextMonth
}

enum SortOption {
  case dateAsc, dateDesc, name, type
}
```

### Computed Properties

```swift
var filteredEvents: [Event] {
  var result = events

  // Search filter
  if !searchQuery.isEmpty {
    result = result.filter { event in
      event.name.localizedCaseInsensitiveContains(searchQuery) ||
      event.description?.localizedCaseInsensitiveContains(searchQuery) == true ||
      event.city?.localizedCaseInsensitiveContains(searchQuery) == true
    }
  }

  // Type filter
  if let type = typeFilter {
    result = result.filter { $0.type == type }
  }

  // Status filter
  switch statusFilter {
  case .all: break
  case .registered: result = result.filter { $0.registered && !$0.attended }
  case .notRegistered: result = result.filter { !$0.registered && !$0.attended }
  case .attended: result = result.filter { $0.attended }
  }

  // Date range filter
  let today = Date()
  result = result.filter { event in
    guard let eventDate = ISO8601DateFormatter().date(from: event.startDate) else { return false }
    switch dateRangeFilter {
    case .all: return true
    case .upcoming: return eventDate >= today
    case .past: return eventDate < today
    case .thisMonth: return Calendar.current.isDate(eventDate, equalTo: today, toGranularity: .month)
    case .nextMonth:
      guard let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: today) else { return false }
      return Calendar.current.isDate(eventDate, equalTo: nextMonth, toGranularity: .month)
    }
  }

  // Sorting
  return result.sorted { a, b in
    switch sortBy {
    case .dateAsc: return a.startDate < b.startDate
    case .dateDesc: return a.startDate > b.startDate
    case .name: return a.name < b.name
    case .type: return a.type.rawValue < b.type.rawValue
    }
  }
}

var calendarDays: [Date] {
  // Generate 42 days (6 weeks) for calendar grid
  // Start from first day of month, backfill to Sunday
}

func hasEvent(date: Date) -> Bool {
  let dateStr = ISO8601DateFormatter().string(from: date).prefix(10)
  return events.contains { $0.startDate.hasPrefix(dateStr) }
}
```

### Persistence Across Navigation

- Filters reset when user navigates away (do not persist)
- Calendar month resets to current month on page reload
- Selected sort order persists in UserDefaults

### Shared State

- **Active Family Context:** Which athlete's events to show (if parent viewing)
- **User Auth State:** Supabase user session
- **Events Data:** Shared event manager (singleton or observable)

---

## 6. UI/UX Details

### Layout Structure

```
[Header]
  - Timeline Status Snippet (Phase indicator)

[Page Header - White Card]
  - Title: "Events"
  - Subtitle: "Track camps, showcases, visits, and games"
  - "+ Add Event" button (blue, prominent)

[Filters Card - White Background]
  - Search input (left-aligned, magnifying glass icon)
  - Type dropdown (Camp, Showcase, Visit, Game)
  - Status dropdown (Registered, Not Registered, Attended)
  - Date Range dropdown (Upcoming, Past, This Month, Next Month)

[Results Count and Sort Bar]
  - "X results" (left)
  - Sort dropdown (right): Date (Newest First), Date (Oldest First), Name, Type

[Calendar Card - White Background]
  - Month/Year header (centered)
  - Previous/Next month arrows
  - 7-column grid (Sun-Sat)
  - Days with events show blue dot indicator
  - Today highlighted in blue background
  - Tap date with event to scroll list to that date

[Events List - Cards]
  - Vertical scrolling
  - Each event card shows:
    - Event type badge (colored)
    - Status badge (registered/attended)
    - Event name (bold, large)
    - Date range (formatted)
    - Time, cost, location (icons + text)
    - Performance notes preview (if any)
    - Delete button (trash icon, red)

[Empty State]
  - Calendar icon (large, gray)
  - "No events yet"
  - "Create your first event to start tracking..."
  - "+ Add Event" button

[Empty Filtered State]
  - Funnel icon (large, gray)
  - "No events match your filters"
  - "Clear filters" button
```

### Design System References

- **Color Palette:**
  - Primary: `#3B82F6` (blue)
  - Success: `#10B981` (green - attended)
  - Warning: `#F59E0B` (amber - registered)
  - Danger: `#EF4444` (red - delete)
  - Gray: `#64748B` (not registered)

- **Typography:**
  - Page Title: SF Pro Display, 28pt, bold
  - Event Name: SF Pro Text, 18pt, semibold
  - Subtitle: SF Pro Text, 14pt, regular, gray-600
  - Body: SF Pro Text, 14pt, regular

- **Spacing:** 16pt standard padding, 12pt card gaps
- **Radius:** 12pt for cards, 8pt for buttons, 6pt for badges
- **Shadows:** Light shadow on cards (0 1px 3px rgba(0,0,0,0.1))

### Interactive Elements

#### Buttons

- **Primary CTA (Add Event):** Blue gradient background, white text, rounded
- **Delete:** Red text, hover background red-50, trash icon
- **Filter Controls:** Dropdown pickers (native iOS style)
- **Clear Filters:** Blue text link

#### Calendar

- **Day Cells:** 44pt touch target, rounded when selected
- **Event Indicator:** 4pt blue dot below date number
- **Today:** Blue background, white text
- **Other Month Days:** Gray-300 text (dimmed)
- **Tap Behavior:** If date has event, scroll list to that event

#### Event Cards

- **Card:** White background, border, rounded corners, shadow on press
- **Badges:** Inline, rounded-full, colored by type/status
- **Icons:** Heroicons (clock, dollar, map pin)
- **Swipe Actions:** Swipe left for delete (iOS standard pattern)

### Loading States

```
First Load:
- Skeleton screens for calendar and first 3 event cards
- Shimmer animation
- 300ms delay before showing skeleton

Reload:
- Pull-to-refresh control (standard iOS)
- Subtle activity indicator in navigation bar

Empty State:
- Icon + message + CTA
- No loading indicator

Error State:
- Red banner at top with error message
- "Retry" button
```

### Accessibility

- **VoiceOver:**
  - Calendar: "Calendar showing [Month Year]. [X] events this month."
  - Day cell: "[Date number], [Day of week]. [Has event / No event]."
  - Event card: "[Event name], [Type], [Date], [Status]."
  - Delete button: "Delete [event name]"

- **Color Contrast:** All text meets WCAG AA (4.5:1 minimum)
- **Touch Targets:** 44pt minimum (iOS standard)
- **Dynamic Type:** All text scales with user's font size preference
- **Haptic Feedback:** Light impact on button tap, notification on delete

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client (for auth + data)
- Combine (for reactive state)

### Third-Party Libraries

- None required (native calendar implementation)

### External Services

- Supabase PostgreSQL (events table)
- Supabase Auth (user session)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" banner + retry button
- **No internet:** Show offline indicator, cache last-fetched events
- **Server error (5xx):** Show "Server error, please try again" + retry

### Data Errors

- **Empty list:** Show appropriate empty state with CTA
- **Invalid date format:** Skip rendering that event, log error
- **Missing required field:** Show placeholder text ("Unknown event")
- **Stale data:** Automatic refresh on app foreground

### User Errors

- **Delete confirmation:** Always confirm before deleting (destructive action)
- **Filter no results:** Show "No matches" empty state + clear filters button

### Edge Cases

- **Very long event names:** Truncate with ellipsis at 60 characters
- **Large lists (100+ events):** Implement pagination or virtual scrolling
- **Events spanning multiple days:** Show date range in card
- **Events in past with "registered" status:** Allow user to mark as attended
- **Calendar navigation to far future/past:** Limit to ±2 years from current month
- **Multiple events same day:** Stack on calendar (dot indicator), list shows all

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all events correctly
- [ ] Calendar shows current month with event indicators
- [ ] Filtering by type, status, date range works
- [ ] Search filters events by name/location
- [ ] Sorting changes event order
- [ ] Tapping event card navigates to detail page
- [ ] Tapping calendar date scrolls to event
- [ ] Deleting event removes it from list and calendar
- [ ] "+ Add Event" navigates to create page
- [ ] Pull-to-refresh reloads events

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show permission message)
- [ ] Handle empty data set (show empty state)
- [ ] Handle server errors (5xx)
- [ ] Handle invalid event data

### Edge Case Tests

- [ ] Very long event names don't break layout
- [ ] Large lists (100+ events) scroll smoothly
- [ ] Rapid taps on delete don't create duplicate API calls
- [ ] Calendar navigates correctly across year boundaries
- [ ] Multiple events same day display correctly
- [ ] VoiceOver announces all elements correctly
- [ ] Page adapts to different device sizes (SE, 13, 15 Pro Max)
- [ ] Dynamic Type scaling works

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] Calendar rendering is smooth (60 fps)
- [ ] List scrolling is smooth with 50+ events
- [ ] No memory leaks when navigating away
- [ ] Filtering updates instantly (<100ms)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- Calendar view may be slow to render on older devices if >100 events in month
- Date parsing assumes ISO 8601 format ("YYYY-MM-DD") — invalid formats will break display
- Delete action is immediate (no undo) — consider implementing undo toast

### iOS-Specific Considerations

- Native date pickers may differ from web UI (iOS uses wheel picker)
- Swipe-to-delete gesture conflicts with horizontal scroll (use button instead)
- Calendar month navigation animates (may feel slower than instant web update)
- Large event lists may trigger OS memory warnings (implement pagination at 100+ items)
- Search filtering is case-insensitive on iOS (consistent with platform convention)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/events/index.vue`
- **Composables used:** `useEvents`
- **Related API endpoints:** Supabase direct queries (no custom API routes)

### Design References

- **Figma:** [Link if available]
- **Brand Guidelines:** Match Nuxt web app color scheme

### API Documentation

- **Database Schema:** `events` table in Supabase
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)

---

## 12. Sign-Off

**Specification reviewed by:** Claude Code
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Events List is a high-complexity page due to calendar integration, multiple filters, and real-time search. Prioritize performance optimization for list scrolling and calendar rendering.

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- Schools List (`/schools/index`) - Similar filtering and list pattern
- Coaches List (`/coaches`) - Similar card layout and search

### Code Snippets from Web

```typescript
// Calendar day generation (JavaScript - translate to Swift)
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: Date[] = [];
  const current = new Date(startDate);
  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
});

// Check if date has event
const hasEvent = (date: Date): boolean => {
  const dateStr = date.toISOString().split("T")[0];
  return events.value.some((e) => e.start_date === dateStr);
};
```
