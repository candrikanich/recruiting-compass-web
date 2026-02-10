# iOS Page Specification Template

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Recruiting Timeline
**Web Route:** `/reports/timeline`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** High

---

## 1. Overview

### Purpose

Provides a visual, chronological overview of the recruiting journey across all schools, displaying events, interactions, offers, and status changes on an interactive timeline. Users can see recruiting progress at a glance, filter by school and time range, and drill into specific timeline items for details.

### Key User Actions

- View recruiting timeline with swimlane visualization (grouped by school)
- Filter timeline by view range (3/6/12 months, All Time)
- Filter by specific school (dropdown)
- Toggle visibility of item types (Events, Interactions, Offers, Status Changes)
- See "Today" marker on timeline
- Tap timeline items to navigate to detail pages
- View timeline list (chronological list view below swimlanes)
- Print timeline
- Navigate back to Reports dashboard

### Success Criteria

- Timeline loads and displays all items correctly
- Swimlanes group items by school accurately
- Month headers align with timeline items
- "Today" marker is positioned correctly
- Filters update timeline in real-time
- Timeline items are tappable and navigate to correct detail pages
- Timeline list shows items in chronological order (newest first)
- Print functionality works and formats timeline appropriately
- Timeline is responsive to different device sizes

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Recruiting Timeline from Reports dashboard
2. System loads all data sources (events, interactions, offers, status history)
3. System displays timeline with:
   - Month headers (date range)
   - Swimlanes grouped by school
   - Timeline items as colored bars/dots
   - "Today" marker (red vertical line)
   - Timeline list below swimlanes
4. User sees default filters applied:
   - View Range: 6 months
   - School: All Schools
   - All item types visible (Events, Interactions, Offers, Status Changes)
5. User taps timeline item
6. System navigates to item detail page:
   - Event → /events/[id]
   - Interaction → /interactions/[id]
   - Offer → /offers/[id]
   - Status Change → No detail page (show alert with details)
```

### Alternative Flows

```
Flow B: Change View Range
1. User taps View Range dropdown
2. User selects: 3 months / 6 months / 12 months / All Time
3. System recalculates date range
4. System updates month headers and timeline items
5. User sees updated timeline

Flow C: Filter by School
1. User taps School dropdown
2. User selects specific school
3. System filters timeline items to show only selected school
4. User sees single swimlane for selected school

Flow D: Toggle Item Types
1. User taps checkbox for item type (e.g., "Events")
2. System hides/shows items of that type
3. Timeline updates immediately
4. Legend updates to reflect active types

Flow E: View Timeline List
1. User scrolls down below swimlanes
2. User sees chronological list of all timeline items
3. User taps item in list
4. System navigates to item detail page

Flow F: Print Timeline
1. User taps "Print" button
2. System prepares printable version of timeline
3. System presents iOS print dialog
4. User selects printer or PDF
5. System prints/saves timeline
```

### Error Scenarios

```
Error: No timeline data available
- User sees: Empty state "No timeline data available. Add events, interactions, or offers to see them on the timeline."
- Recovery: Navigate to add pages

Error: Failed to load data
- User sees: Error banner "Unable to load timeline data. Check your connection."
- Recovery: Pull-to-refresh or tap retry button

Error: Invalid date range
- User sees: Alert "Invalid date range. Please try a different view range."
- Recovery: Change view range

Error: Navigation failed
- User sees: Alert "Unable to open item details. Please try again."
- Recovery: Tap item again or go back
```

---

## 3. Data Models

### Primary Model

```swift
struct TimelineItem: Identifiable, Equatable {
  let id: String
  let type: TimelineItemType
  let typeLabel: String
  let emoji: String
  let label: String
  let date: Date
  let endDate: Date?
  let schoolId: String?
  let schoolName: String?
  let details: String?

  enum TimelineItemType: String, Codable {
    case event
    case interaction
    case offer
    case statusChange = "status_change"

    var displayName: String {
      switch self {
      case .event: return "Event"
      case .interaction: return "Interaction"
      case .offer: return "Offer"
      case .statusChange: return "Status Change"
      }
    }

    var color: Color {
      switch self {
      case .event: return .blue
      case .interaction: return .green
      case .offer: return .yellow
      case .statusChange: return .gray
      }
    }

    var backgroundColor: Color {
      switch self {
      case .event: return Color.blue.opacity(0.1)
      case .interaction: return Color.green.opacity(0.1)
      case .offer: return Color.yellow.opacity(0.1)
      case .statusChange: return Color.gray.opacity(0.1)
      }
    }
  }
}

struct TimelineSwimlan {
  let schoolId: String?
  let schoolName: String
  let items: [TimelineItem]

  var displayName: String {
    schoolName.isEmpty ? "No School" : schoolName
  }
}

struct TimelineMonth {
  let key: String // "2025-01"
  let label: String // "Jan"
  let year: Int
  let date: Date
}

struct TimelineViewState {
  var viewRange: ViewRange = .sixMonths
  var selectedSchoolId: String? = nil
  var showEvents = true
  var showInteractions = true
  var showOffers = true
  var showStatusChanges = true

  enum ViewRange: String, CaseIterable {
    case threeMonths = "3"
    case sixMonths = "6"
    case twelveMonths = "12"
    case allTime = "all"

    var label: String {
      switch self {
      case .threeMonths: return "3 Months"
      case .sixMonths: return "6 Months"
      case .twelveMonths: return "12 Months"
      case .allTime: return "All Time"
      }
    }

    func calculateDateRange(items: [TimelineItem], today: Date) -> (start: Date, end: Date) {
      let calendar = Calendar.current
      let end = calendar.date(byAdding: .month, value: 2, to: today)! // 2 months into future

      switch self {
      case .allTime:
        let allDates = items.map { $0.date }
        let earliest = allDates.min() ?? calendar.date(byAdding: .month, value: -6, to: today)!
        return (earliest, end)
      case .threeMonths:
        let start = calendar.date(byAdding: .month, value: -3, to: today)!
        return (start, end)
      case .sixMonths:
        let start = calendar.date(byAdding: .month, value: -6, to: today)!
        return (start, end)
      case .twelveMonths:
        let start = calendar.date(byAdding: .month, value: -12, to: today)!
        return (start, end)
      }
    }
  }
}
```

### Related Models

- `Event` (data source)
- `Interaction` (data source)
- `Offer` (data source)
- `SchoolStatusHistory` (data source)
- `School` (for school names)

### Data Origin

- **Source:** Supabase (`events`, `interactions`, `offers`, `school_status_history` tables)
- **Refresh:** On page load, pull-to-refresh
- **Caching:** Cache for 5 minutes
- **Mutations:** None (read-only view)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Events

```
GET via Supabase
Table: events
Filter: user_id = current_user_id
Select: id, type, name, start_date, end_date, school_id

Swift Example:
let response = try await supabase
  .from("events")
  .select("id, type, name, start_date, end_date, school_id")
  .eq("user_id", userId)
  .execute()
```

#### Endpoint 2: Fetch Interactions

```
GET via Supabase
Table: interactions
Filter: user_id = current_user_id
Select: id, type, subject, occurred_at, created_at, school_id

Swift Example:
let response = try await supabase
  .from("interactions")
  .select("id, type, subject, occurred_at, created_at, school_id")
  .eq("user_id", userId)
  .execute()
```

#### Endpoint 3: Fetch Offers

```
GET via Supabase
Table: offers
Filter: athlete_id = athlete_id
Select: id, offer_type, offer_date, created_at, school_id

Swift Example:
let response = try await supabase
  .from("offers")
  .select("id, offer_type, offer_date, created_at, school_id")
  .eq("athlete_id", athleteId)
  .execute()
```

#### Endpoint 4: Fetch Status History

```
GET via Supabase
Table: school_status_history
Filter: school_id in (user's schools)
Select: id, school_id, previous_status, new_status, changed_at, notes

Swift Example:
// Fetch for each school
for school in schools {
  let response = try await supabase
    .from("school_status_history")
    .select("*")
    .eq("school_id", school.id)
    .order("changed_at", ascending: false)
    .execute()
}
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
@Published var timelineItems: [TimelineItem] = []
@Published var schools: [School] = []
@Published var loading = false
@Published var error: String? = nil

// Filters
@Published var viewState = TimelineViewState()

// Computed
var filteredItems: [TimelineItem] {
  // Apply type filters and school filter
}

var swimlanes: [TimelineSwimlane] {
  // Group filtered items by school
}

var visibleMonths: [TimelineMonth] {
  // Generate month headers for date range
}

var todayPosition: CGFloat {
  // Calculate Today marker position as percentage
}
```

### Persistence Across Navigation

- **View range** persists via `UserDefaults` (key: "timelineViewRange")
- **Item type toggles** do not persist (reset to all on/default)
- **School filter** does not persist (reset to "All Schools")

### Shared State (if cross-page)

- **Family context:** Active user/athlete via `useActiveFamily` composable
- **Auth state:** Accessed from Supabase session manager
- **School list:** Shared across app

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Header]
    - Back button: "← Back to Reports"
    - Title: "Recruiting Timeline"
    - Subtitle: "Visual overview of your recruiting journey"
    - Print button (top-right)

  [Controls Bar - White Background]
    - View Range dropdown (3/6/12 months, All Time)
    - School filter dropdown (All Schools, specific school)
    - Item type checkboxes (Events, Interactions, Offers, Status Changes)

  [ScrollView - Vertical]
    [Timeline Swimlanes Card - White Background]
      - Month Headers (horizontal scroll):
        * Month label (Jan, Feb, Mar...)
        * Year label (2025)
      - Swimlanes (one per school):
        * School name + item count
        * Timeline bar (gray background, grid lines)
        * Timeline items (colored bars/dots)
        * "Today" marker (red vertical line)
      - Legend (bottom):
        * Events (blue square)
        * Interactions (green square)
        * Offers (yellow square)
        * Status Changes (gray square)
        * Today (red line)

    [Timeline List Card - White Background]
      - Header: "Timeline List"
      - List of items (chronological, newest first):
        * Icon circle (colored by type)
        * Label + school name + date
        * Type badge (colored)
        * Tap: Navigate to detail page
```

### Design System References

- **Color Palette:**
  - Events: `#0066FF` (blue)
  - Interactions: `#00CC66` (green)
  - Offers: `#FFD700` (yellow)
  - Status Changes: `#6B7280` (gray)
  - Today marker: `#FF3333` (red)
  - Background: `#F9FAFB`

- **Typography:**
  - Title: SF Pro Display, 28pt, bold
  - Subtitle: SF Pro Text, 16pt, regular
  - School name: SF Pro Text, 16pt, semibold
  - Month label: SF Pro Text, 14pt, semibold
  - Item label: SF Pro Text, 12pt, medium

- **Spacing:** 16pt padding, 12pt gaps
- **Radius:** 12pt for cards, 8pt for timeline bar

### Interactive Elements

#### View Range Dropdown

- **Options:** 3 Months, 6 Months, 12 Months, All Time
- **Style:** Standard iOS picker
- **Default:** 6 Months
- **Tap:** Present picker sheet

#### School Filter Dropdown

- **Options:** All Schools, [School 1], [School 2], ...
- **Style:** Standard iOS picker
- **Default:** All Schools
- **Tap:** Present picker sheet

#### Item Type Checkboxes

- **Checkboxes:** Events, Interactions, Offers, Status Changes
- **Style:** iOS native toggle switches
- **Default:** All checked (on)
- **Tap:** Toggle on/off, update timeline immediately

#### Timeline Items (Swimlane View)

- **Bar Style (for events with duration):**
  - Width: Proportional to duration
  - Height: 32pt
  - Background: Colored (blue/green/yellow/gray)
  - Border radius: 4pt
  - Text: Emoji + label (truncated)

- **Dot Style (for point-in-time items):**
  - Width: 8pt circle
  - Background: Colored
  - Position: Centered on date

- **Tap:** Navigate to detail page
- **Hover/Long-press:** Show tooltip with full label and date

#### Timeline Items (List View)

- **Row Layout:**
  - Left: Icon circle (40pt, colored background, emoji)
  - Center: Label (bold) + school name + date (gray, small)
  - Right: Type badge (colored pill)

- **Tap:** Navigate to detail page
- **Hover:** Light blue background

#### Print Button

- **Style:** Blue outline, icon-only
- **Icon:** Printer SF Symbol
- **Tap:** Present iOS print dialog

### Loading States

```
First Load:
- Skeleton for controls bar
- Skeleton for swimlanes (3 placeholder swimlanes)
- 300ms delay before showing skeleton

Reload:
- Activity indicator in navigation bar
- Content remains visible

Empty State (No Data):
- Icon: 📊 (gray, 80pt)
- Title: "No timeline data available"
- Subtitle: "Add events, interactions, or offers to see them on the timeline"

Error State:
- Red banner at top
- Error message
- Retry button
```

### Accessibility

- **VoiceOver:**
  - Timeline item: "[Event emoji] Event name. School: Stanford. Date: January 15, 2025."
  - Swimlane: "Stanford. 5 items on timeline."
  - Month header: "January 2025"
  - Today marker: "Today. February 10, 2026."
  - Checkbox: "Show events. Checked." or "Show events. Unchecked."
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for all buttons/items
- **Dynamic Type:** Support text size scaling (labels, school names)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (for auth + data)
- Charts (iOS 16+) - Optional, for enhanced timeline visualization

### Third-Party Libraries

- None (use native iOS components)

### External Services

- Supabase PostgreSQL (`events`, `interactions`, `offers`, `school_status_history` tables)
- Supabase Auth (session management)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" banner + retry
- **No internet:** Show offline mode indicator, disable reload
- **Server error (5xx):** Show "Server error. Unable to load data." + retry

### Data Errors

- **Empty data set:** Show empty state with CTA
- **Invalid dates:** Skip item, log error
- **Missing school_id:** Display item in "No School" swimlane
- **Missing required fields:** Skip item, log error

### User Errors

- **No items match filters:** Show message "No items match your filters. Try adjusting filters."
- **Invalid view range:** Revert to default (6 months)
- **Failed navigation:** Show alert "Unable to open item details"

### Edge Cases

- **Very long school names:** Truncate with ellipsis (1 line max)
- **Many swimlanes (20+):** Implement collapsible swimlanes or pagination
- **Overlapping items:** Stagger vertically (offset by 8pt)
- **Items outside view range:** Hide (don't display on timeline)
- **Zero-duration events:** Display as dot (8pt circle)
- **Future dates:** Allow display (up to 2 months in future)
- **Time zone handling:** Use local time zone for display
- **Print formatting:** Adjust layout for landscape orientation

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays timeline correctly
- [ ] Swimlanes group items by school
- [ ] Month headers align with timeline items
- [ ] "Today" marker is positioned correctly
- [ ] User can change view range (timeline updates)
- [ ] User can filter by school (timeline updates)
- [ ] User can toggle item types (timeline updates)
- [ ] User can tap timeline item to navigate
- [ ] Timeline list shows items chronologically
- [ ] Print button presents print dialog

### Error Tests

- [ ] Handle network timeout during load (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle empty data set (show empty state)
- [ ] Handle failed navigation (show alert)
- [ ] Handle server errors (5xx) (show retry)

### Edge Case Tests

- [ ] Very long school names truncate properly
- [ ] Many swimlanes (20+) display correctly
- [ ] Overlapping items stagger vertically
- [ ] Items outside view range are hidden
- [ ] Zero-duration events display as dots
- [ ] Future dates display correctly
- [ ] VoiceOver reads all elements correctly
- [ ] Dynamic Type scales text appropriately
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Timeline loads in <2 seconds (for 100 items)
- [ ] View range change updates in <500ms
- [ ] Filter updates in <200ms
- [ ] Scrolling is smooth (60 fps)
- [ ] No memory leaks when navigating away

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Swimlane visualization:** Complex custom rendering (web uses CSS positioning, iOS needs custom layout)
- **Grid lines:** Web uses CSS borders, iOS needs manual drawing or ZStack layers
- **Tooltip on hover:** iOS uses long-press gesture instead of hover
- **Print formatting:** Web uses `@media print`, iOS uses UIGraphicsPDFRenderer

### iOS-Specific Considerations

- **Custom timeline layout:** Requires custom SwiftUI layout or UIKit integration (complex)
- **Scrolling performance:** Many swimlanes with many items may lag (optimize with lazy loading)
- **Date calculations:** Precise positioning requires careful date arithmetic
- **Overlapping items:** Stacking logic can be complex for dense timelines
- **Landscape orientation:** Timeline works better in landscape (consider forcing landscape)
- **iPad optimization:** Use more screen space for swimlanes (3-4 columns)
- **Today marker animation:** Consider animating marker position on view range change

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/reports/timeline.vue`
- **Composables used:**
  - `useSchools` (school data)
  - `useInteractions` (interaction data)
  - `useOffers` (offer data)
  - `useEvents` (event data)
  - `useSchoolStore` (status history)
- **API endpoints:** Supabase direct queries (no custom API routes)

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG
- **Timeline Visualization:** Similar to Gantt charts, project management timelines

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Charts Framework:** https://developer.apple.com/documentation/charts (iOS 16+)

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Consider using Swift Charts for timeline visualization (simpler than custom layout)
- Implement lazy loading for swimlanes (load off-screen swimlanes on-demand)
- Timeline works best in landscape orientation (suggest rotation on iPhone)
- Print functionality should format timeline for A4/Letter size paper
- Consider adding zoom gestures for timeline (pinch to zoom date range)
- Overlapping items could use offset stacking (like Gantt charts)

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Calendar View** (if exists) - Similar month header scrolling
- **Gantt Chart** (if exists) - Similar swimlane visualization

### Code Snippets from Web

```typescript
// Build timeline items from all data sources
const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = [];

  // Add events
  if (showEvents.value) {
    events.value.forEach((event) => {
      items.push({
        id: `event-${event.id}`,
        type: "event",
        typeLabel: formatEventType(event.type),
        emoji: getEventEmoji(event.type),
        label: event.name,
        date: new Date(event.start_date),
        endDate: event.end_date ? new Date(event.end_date) : undefined,
        schoolId: event.school_id || undefined,
        schoolName: schools.value.find((s) => s.id === event.school_id)?.name,
      });
    });
  }

  // Similar for interactions, offers, status changes...

  return items;
});

// Group items by school for swimlanes
const swimlanes = computed(() => {
  const groups = new Map<string, TimelineItem[]>();

  timelineItems.value.forEach((item) => {
    const key = item.schoolId || "no-school";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries())
    .map(([schoolId, items]) => ({
      schoolId: schoolId === "no-school" ? null : schoolId,
      schoolName:
        schoolId === "no-school"
          ? "No School"
          : schools.value.find((s) => s.id === schoolId)?.name || "Unknown",
      items: items.sort((a, b) => a.date.getTime() - b.date.getTime()),
    }))
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName));
});

// Calculate item position on timeline
const getItemStyle = (item: TimelineItem) => {
  const totalMs =
    dateRange.value.end.getTime() - dateRange.value.start.getTime();
  const startMs = item.date.getTime() - dateRange.value.start.getTime();
  const left = Math.max(0, Math.min(100, (startMs / totalMs) * 100));

  // Calculate width for events with end dates
  let width = 2; // minimum width in percent
  if (item.endDate) {
    const durationMs = item.endDate.getTime() - item.date.getTime();
    width = Math.max(2, (durationMs / totalMs) * 100);
  }

  return {
    left: `${left}%`,
    width: `${Math.min(width, 100 - left)}%`,
    top: "16px",
  };
};
```

### iOS Implementation Pattern

```swift
// SwiftUI Timeline Swimlane View
struct TimelineSwimlaneView: View {
  let swimlane: TimelineSwimlane
  let dateRange: (start: Date, end: Date)

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      // School header
      HStack {
        Text(swimlane.displayName)
          .font(.headline)
        Spacer()
        Text("\(swimlane.items.count) items")
          .font(.caption)
          .foregroundColor(.secondary)
      }

      // Timeline bar
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          // Background
          Rectangle()
            .fill(Color.gray.opacity(0.1))
            .cornerRadius(8)

          // Grid lines (month divisions)
          ForEach(0..<visibleMonths.count) { index in
            Rectangle()
              .fill(Color.gray.opacity(0.2))
              .frame(width: 1)
              .offset(x: geometry.size.width * CGFloat(index) / CGFloat(visibleMonths.count))
          }

          // Today marker
          if todayPosition >= 0 && todayPosition <= 100 {
            Rectangle()
              .fill(Color.red)
              .frame(width: 2)
              .offset(x: geometry.size.width * todayPosition / 100)
          }

          // Timeline items
          ForEach(swimlane.items) { item in
            TimelineItemView(item: item, geometry: geometry, dateRange: dateRange)
              .onTapGesture {
                navigateToItem(item)
              }
          }
        }
      }
      .frame(height: 64)
    }
    .padding()
  }

  func navigateToItem(_ item: TimelineItem) {
    // Navigation logic
  }
}
```
