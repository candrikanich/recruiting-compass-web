# iOS Page Specification: Dashboard

**Project:** The Recruiting Compass iOS App
**Created:** February 7, 2026
**Page Name:** Dashboard
**Web Route:** `/dashboard`
**Priority:** MVP / Phase 2 (High - Main Landing Page)
**Complexity:** Medium
**Estimated Time:** 3 days

---

## 1. Overview

### Purpose

The dashboard is the primary landing page after login. It provides an at-a-glance summary of the athlete's recruiting journey: key counts (coaches, schools, interactions, offers), action items, quick tasks, performance metrics, upcoming events, and recent activity. Parents can switch between linked athletes to view their data in read-only mode.

### Key User Actions

- View summary stats (coaches, schools, interactions, offers, accepted offers, A-tier schools)
- Tap any stat card to navigate to its corresponding list page
- Review and act on suggested action items (dismiss or complete)
- Manage quick personal tasks (add, toggle, delete, clear completed)
- View recent activity feed
- View upcoming events
- View top performance metrics
- Generate and email a recruiting packet
- Switch between athletes (parent-only)

### Success Criteria

- Dashboard loads and displays all summary counts within 2 seconds
- Tapping a stat card navigates to the correct list page
- Quick tasks persist across app sessions (local storage)
- Parent preview mode shows correct athlete data with read-only banner
- Action items can be dismissed or completed
- Recruiting packet can be generated and emailed

---

## 2. User Flows

### Primary Flow (Athlete)

```
1. User logs in successfully
2. App navigates to Dashboard
3. System fetches counts (schools, coaches, interactions, offers, events, metrics)
4. System fetches notifications and suggestions
5. User sees 6 stat cards with counts
6. User sees action items (up to 3 suggestions)
7. User scrolls to see widgets (charts, tasks, activity, events, metrics)
8. User taps a stat card → navigates to corresponding list page
```

### Alternative Flow: Parent Viewing Athlete

```
1. Parent logs in
2. Dashboard loads with parent's own data
3. Parent selects an athlete from athlete switcher
4. System re-fetches all data for selected athlete
5. Parent context banner appears: "You're viewing [Name]'s recruiting data"
6. All data is read-only
7. Parent view is logged for athlete visibility
```

### Alternative Flow: Empty Dashboard (New User)

```
1. New user logs in for first time
2. All counts show 0
3. Charts show empty states with CTAs:
   - "Log your first interaction"
   - "Add your first school"
   - "Log your first metric"
4. Action items suggest getting started steps
```

### Error Scenarios

```
Error: Data fetch fails
- User sees: Error banner with retry option
- Stat cards show 0 or "--"
- Recovery: Pull-to-refresh or retry button

Error: Network timeout
- User sees: "Connection timed out. Pull to refresh."
- Recovery: Pull-to-refresh gesture

Error: Session expired
- User sees: Redirect to login with timeout message
- Recovery: Re-login
```

---

## 3. Data Models

### Dashboard Summary Data

```swift
struct DashboardSummary {
  let coachCount: Int
  let schoolCount: Int
  let interactionCount: Int
  let totalOffers: Int
  let acceptedOffers: Int
  let aTierSchoolCount: Int
  let schools: [School]
  let coaches: [Coach]
  let interactions: [Interaction]
  let offers: [Offer]
  let events: [Event]
  let metrics: [PerformanceMetric]
}
```

### Stat Card Model

```swift
struct StatCard: Identifiable {
  let id: String
  let title: String
  let count: Int
  let subtitle: String?       // e.g., "42% acceptance rate"
  let icon: String             // SF Symbol name
  let gradientColors: [Color]  // Start/end gradient
  let destination: String      // Navigation target route
}
```

### Suggestion Model

```swift
struct Suggestion: Identifiable, Codable {
  let id: String
  let title: String
  let description: String
  let urgency: UrgencyLevel    // high, medium, low
  let actionUrl: String?
  let location: String         // "dashboard"
}

enum UrgencyLevel: String, Codable {
  case high, medium, low
}
```

### Quick Task Model

```swift
struct QuickTask: Identifiable, Codable {
  let id: String
  var text: String
  var isCompleted: Bool
  let createdAt: Date
}
```

### Data Origin

- **Schools:** Supabase `schools` table, filtered by `family_unit_id`
- **Coaches:** Supabase `coaches` table, filtered by school IDs from schools query
- **Interactions:** Supabase `interactions` table, filtered by `logged_by` user ID
- **Offers:** Supabase `offers` table, filtered by `user_id`
- **Events:** Supabase `events` table, filtered by `user_id`
- **Metrics:** Supabase `performance_metrics` table, filtered by `user_id`
- **Suggestions:** API endpoint `/api/suggestions?location=dashboard`
- **Quick Tasks:** Local storage (UserDefaults or file-based)
- **Refresh:** On page load + when athlete switches (parents)
- **Caching:** No server-side caching; local tasks cached in UserDefaults

---

## 4. API Integration

### Endpoint 1: Fetch Suggestions

```
GET /api/suggestions?location=dashboard

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Follow up with Coach Smith",
      "description": "It's been 14 days since your last contact",
      "urgency": "high",
      "action_url": "/coaches/abc123",
      "location": "dashboard"
    }
  ]
}
```

### Endpoint 2: Dismiss Suggestion

```
PATCH /api/suggestions/{id}/dismiss

Response:
{ "success": true }
```

### Endpoint 3: Complete Suggestion

```
PATCH /api/suggestions/{id}/complete

Response:
{ "success": true }
```

### Endpoint 4: Generate Recruiting Packet

```
POST /api/recruiting-packet/generate

Response:
{
  "success": true,
  "data": {
    "html": "<html>...</html>",
    "generatedAt": "2026-02-07T10:00:00Z"
  }
}
```

### Endpoint 5: Email Recruiting Packet

```
POST /api/recruiting-packet/email

Body:
{
  "recipientIds": ["coach-uuid-1", "coach-uuid-2"],
  "subject": "Recruiting Packet - [Athlete Name]",
  "body": "Dear Coach..."
}

Response:
{ "success": true, "sentCount": 2 }
```

### Supabase Direct Queries

```
// Schools
supabase.from("schools").select("*").eq("family_unit_id", activeFamilyId)

// Coaches (for all family schools)
supabase.from("coaches").select("*").in("school_id", schoolIds)

// Interactions
supabase.from("interactions").select("*").eq("logged_by", targetUserId)

// Offers
supabase.from("offers").select("*").eq("user_id", targetUserId)

// Events
supabase.from("events").select("*").eq("user_id", targetUserId)

// Performance Metrics
supabase.from("performance_metrics").select("*").eq("user_id", targetUserId)
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK

---

## 5. State Management

### Page-Level State

```swift
@State var isLoading = false
@State var error: String? = nil
@State var coachCount: Int = 0
@State var schoolCount: Int = 0
@State var interactionCount: Int = 0
@State var totalOffers: Int = 0
@State var acceptedOffers: Int = 0
@State var aTierSchoolCount: Int = 0
@State var allSchools: [School] = []
@State var allCoaches: [Coach] = []
@State var allInteractions: [Interaction] = []
@State var allOffers: [Offer] = []
@State var allEvents: [Event] = []
@State var allMetrics: [PerformanceMetric] = []
@State var suggestions: [Suggestion] = []
@State var quickTasks: [QuickTask] = []
@State var newTaskText: String = ""
@State var isGeneratingPacket: Bool = false
@State var packetError: String? = nil
```

### Computed Properties

```swift
var userFirstName: String           // Extracted from full_name or email
var upcomingEvents: [Event]         // Next 5 events sorted by date
var topMetrics: [PerformanceMetric] // First 3 metrics
var contactsThisMonth: Int          // Interactions in current calendar month
var schoolSizeBreakdown: [String: Int] // Carnegie size → count
var dashboardSuggestions: [Suggestion] // First 3 suggestions
var acceptanceRate: String          // "X%" of offers accepted
```

### Shared State (Cross-Page)

- **AuthManager:** Current user, session, role (parent/athlete)
- **FamilyManager:** Active family ID, active athlete ID, accessible athletes list
- **UserStore:** User profile data

### Persistence

- Quick tasks persist in UserDefaults keyed by `user_tasks-{userId}`
- All other data re-fetched on each dashboard visit

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Title: "Dashboard"
  - Subtitle: "Welcome back, {firstName}!"

[Parent Context Banner] (conditional - parents only)
  - Icon: eye
  - "You're viewing [Athlete Name]'s recruiting data"
  - "Data is read-only. Your views are visible to them."

[Stats Cards Row] (horizontal scroll on mobile)
  - 6 gradient cards: Coaches, Schools, Interactions, Offers, Accepted, A-Tier

[Action Items Section]
  - Header: "Action Items"
  - Up to 3 suggestion cards
  - "Show more" link if additional pending

[Two-Column Grid]
  Row 1: [Interaction Trend Chart] + [Recruiting Packet Widget]
  Row 2: [Performance Metrics] + [Upcoming Events]
  Row 3: [Recent Activity Feed] + [Quick Tasks]

[At-a-Glance Summary] (full width, 4 metrics)
  - Schools with Offers
  - Avg Coach Responsiveness
  - Interactions This Month
  - Days Until Graduation
```

### Stat Cards Design

6 tappable cards in a horizontal scroll (2 rows of 3 on iPad):

| Card         | Icon (SF Symbol)                    | Gradient                    | Value             |
| ------------ | ----------------------------------- | --------------------------- | ----------------- |
| Coaches      | `person.2.fill`                     | Blue (#3B82F6 → #2563EB)    | Coach count       |
| Schools      | `building.2.fill`                   | Purple (#8B5CF6 → #7C3AED)  | School count      |
| Interactions | `bubble.left.and.bubble.right.fill` | Emerald (#10B981 → #059669) | Interaction count |
| Offers       | `gift.fill`                         | Orange (#F97316 → #EA580C)  | Offer count       |
| Accepted     | `checkmark.circle.fill`             | Red (#EF4444 → #DC2626)     | Accepted + rate%  |
| A-Tier       | `star.fill`                         | Indigo (#6366F1 → #4F46E5)  | A-tier count      |

Card dimensions: ~160pt wide, ~100pt tall, 12pt corner radius, subtle shadow.

### Action Item Cards

```
┌─────────────────────────────────────┐
│ [Urgency dot]  Title               │
│ Description text (2 lines max)      │
│                [Dismiss] [Complete] │
└─────────────────────────────────────┘
```

Urgency dot colors: High = red, Medium = amber, Low = blue

### Quick Tasks Widget

```
┌─────────────────────────────────────┐
│ Quick Tasks             [Clear All] │
├─────────────────────────────────────┤
│ [+] Add a task...        [Submit]   │
├─────────────────────────────────────┤
│ ☐ Follow up with Coach Smith       │
│ ☑ Send transcript (strikethrough)  │
│ ☐ Schedule campus visit            │
└─────────────────────────────────────┘
```

Max height: ~192pt scrollable area

### At-a-Glance Summary

4 metric cards in a row:

| Metric                   | Value     | Color Logic                       |
| ------------------------ | --------- | --------------------------------- |
| Schools with Offers      | Count + % | Default                           |
| Avg Coach Responsiveness | % score   | Green ≥75%, Orange ≥50%, Red <50% |
| Interactions This Month  | Count     | Default                           |
| Days Until Graduation    | Countdown | Default                           |

### Loading States

```
First Load:
- Show skeleton placeholders for stat cards (gray rectangles)
- Show spinner for widget areas
- Stat cards animate in once data loads

Pull-to-Refresh:
- Standard iOS pull-to-refresh gesture
- Subtle spinner in navigation bar
- Content remains visible behind

Widget Loading:
- Each widget shows its own loading indicator
- Non-blocking (other widgets load independently)
```

### Empty States

| Widget              | Empty Message                         | CTA                                    |
| ------------------- | ------------------------------------- | -------------------------------------- |
| Interaction Chart   | "No interactions in the last 30 days" | "Log Interaction" → /interactions/add  |
| School Chart        | "No schools added yet"                | "Add School" → /schools/new            |
| Performance Metrics | "No metrics logged yet"               | "Log Your First Metric" → /performance |
| Recent Activity     | "No recent activity"                  | "View All Activity" → /activity        |
| Action Items        | "No action items at this time"        | None                                   |
| Quick Tasks         | Hidden input, no items                | "Add a task..." placeholder            |

### Accessibility

- **VoiceOver:** All stat cards announce: "{title}: {count}" (e.g., "Coaches: 12")
- **Color Contrast:** WCAG AA minimum on all gradient cards
- **Touch Targets:** Stat cards 44pt minimum height
- **Dynamic Type:** All text supports scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (auth + data queries)
- Charts framework (for interaction trend / school interest charts)

### Third-Party Libraries

- **Swift Charts** (iOS 16+, native) for trend/bar charts
- Alternative: No external chart library needed if using native Swift Charts

### External Services

- Supabase PostgreSQL (all data queries)
- Supabase Auth (session management)
- Custom API endpoints (suggestions, recruiting packet)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + pull-to-refresh
- **No internet:** Show offline indicator + cached quick tasks still available
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **Empty data:** Show appropriate empty states per widget (see Section 6)
- **Missing fields:** Use default values (0 for counts, "--" for missing text)
- **Stale data:** Re-fetch on each dashboard visit and athlete switch

### User Errors

- **Quick task empty submit:** Prevent submission of empty task text
- **Rapid suggestion dismiss:** Debounce API calls, disable button during request

### Edge Cases

- **Very long athlete name in parent banner:** Truncate with ellipsis
- **0 schools = 0 coaches:** Both cards show 0, no error
- **Parent with no linked athletes:** Show message to set up family link
- **Concurrent data updates:** Last-fetch-wins; no real-time sync needed for MVP
- **App backgrounded during fetch:** Request completes; update UI on return
- **Graduation date not set:** Show "--" instead of countdown
- **Large number of suggestions:** Only show first 3, "Show more" link for rest

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Dashboard loads with correct counts for all 6 stat cards
- [ ] Tapping each stat card navigates to correct list page
- [ ] Action items display with correct urgency colors
- [ ] Dismissing a suggestion removes it from the list
- [ ] Completing a suggestion removes it and updates count
- [ ] Quick tasks: add, toggle, delete, clear completed all work
- [ ] Quick tasks persist after navigating away and back
- [ ] Upcoming events display in date order (next 5)
- [ ] Performance metrics show top 3 with correct formatting
- [ ] At-a-glance summary shows correct computed values

### Error Tests

- [ ] Handle network timeout gracefully (show error + retry)
- [ ] Handle 401 (redirect to login)
- [ ] Handle empty data set (all widgets show empty states)
- [ ] Handle server errors (5xx) with retry option
- [ ] Handle partial data failure (one query fails, others succeed)

### Parent-Specific Tests

- [ ] Parent context banner appears when viewing athlete
- [ ] Switching athletes re-fetches all data
- [ ] Parent view is logged correctly
- [ ] Data is read-only in parent mode (no edit actions)
- [ ] Athlete name displays correctly in banner

### Edge Case Tests

- [ ] Very long text doesn't break card layouts
- [ ] 0 counts display correctly (not blank)
- [ ] Pull-to-refresh re-fetches all data
- [ ] Quick tasks with very long text wrap properly
- [ ] Rapid taps on suggestion buttons don't create duplicates
- [ ] VoiceOver works on all stat cards and widgets
- [ ] Dashboard adapts to different device sizes (SE, 15, iPad)

### Performance Tests

- [ ] Dashboard loads in <2 seconds on 4G
- [ ] Scroll performance is smooth (60 fps)
- [ ] No memory leaks when navigating away and back
- [ ] Charts render without blocking UI

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Charts:** Web uses Chart.js; iOS should use native Swift Charts (different API but similar output)
- **School map widget:** Web uses a map component; consider deferring to Phase 6 for iOS
- **Social media widget:** Web conditionally shows social handles; defer to Phase 5+ for iOS
- **Contact frequency widget:** Complex heatmap visualization; simplify for iOS MVP (show as list)
- **Coach followup widget:** Shows coaches needing follow-up; can defer to Phase 3 when coach detail exists
- **Recruiting packet:** Email functionality requires composing email with HTML body; consider using `MFMailComposeViewController` or simplified version
- **Activity feed subscription:** Web uses real-time subscription; iOS MVP can use pull-to-refresh instead

### iOS-Specific Considerations

- **Swift Charts requires iOS 16+:** Ensure minimum deployment target is iOS 16
- **Horizontal scroll for stat cards:** Use `ScrollView(.horizontal)` with `LazyHGrid`
- **Quick tasks local storage:** Use UserDefaults with Codable array; key by user ID
- **Pull-to-refresh:** Use `.refreshable {}` modifier on ScrollView
- **Parent athlete switching:** Watch `FamilyManager.activeAthleteId` for changes
- **Large dashboard:** Use `LazyVStack` to avoid rendering all widgets at once

### iOS MVP Simplifications

For the initial iOS implementation, consider these simplifications:

1. **Defer charts:** Show stat numbers only; add chart visualizations in Phase 5
2. **Defer school map:** Skip map widget entirely for MVP
3. **Defer social/contact widgets:** Skip until Phase 5
4. **Simplify recruiting packet:** Show "Generate" button; open in Safari or share sheet instead of in-app email modal
5. **Simplify activity feed:** Show last 5 items with pull-to-refresh instead of real-time subscription

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/dashboard.vue` (614 lines)
- **Composables used:**
  - `useActiveFamily()` - Family context and athlete switching
  - `useNotifications()` - Notification fetching
  - `useSuggestions()` - Action items
  - `useUserTasks()` - Quick tasks (localStorage-based)
  - `useRecruitingPacket()` - Packet generation and email
  - `useViewLogging()` - Parent view tracking
  - `useDocumentsConsolidated()` - Document management
- **Store mutations:**
  - `useUserStore()` - User profile data
- **Child components:**
  - `DashboardStatsCards` - 6 stat cards
  - `DashboardSuggestions` - Action items section
  - `InteractionTrendChart` - 30-day trend line chart
  - `SchoolInterestChart` - School status bar chart
  - `RecruitingPacketWidget` - Generate/email buttons
  - `PerformanceMetricsWidget` - Top 3 metrics grid
  - `UpcomingEventsWidget` - Next 5 events
  - `SchoolMapWidget` - Map visualization
  - `RecentActivityFeed` - Activity stream
  - `QuickTasksWidget` - Inline task manager
  - `ContactFrequencyWidget` - Coach contact metrics
  - `SocialMediaWidget` - Social integrations
  - `CoachFollowupWidget` - Coach responsiveness
  - `AthleteActivityWidget` - Parent-only activity
  - `AtAGlanceSummary` - 4-column key metrics
  - `EmailRecruitingPacketModal` - Email dialog

### API Documentation

- **Supabase:** Direct table queries for counts
- **Custom endpoints:** `/api/suggestions`, `/api/recruiting-packet`
- **Authentication:** Bearer token from Supabase session

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 7, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Start with stat cards + action items + quick tasks. Add charts and advanced widgets incrementally. Parent preview mode is important to establish early as it's used throughout the app.

---

## Appendix A: Watchers & Lifecycle

### On Appear

1. Fetch all counts (schools, coaches, interactions, offers, events, metrics)
2. Fetch suggestions for "dashboard" location
3. Load quick tasks from local storage
4. If parent: check active athlete and show appropriate data

### Watched State

```swift
// When athlete switches (parent mode)
onChange(of: familyManager.activeAthleteId) { newId in
  Task {
    await fetchAllCounts()
    await fetchSuggestions()
    logParentView(athleteId: newId)
  }
}
```

## Appendix B: Parent Preview Mode Detail

### Banner UI

```
┌──────────────────────────────────────────────┐
│ 👁  You're viewing [Athlete Name]'s           │
│    recruiting data. Data is read-only.        │
│    Your views are visible to them.            │
└──────────────────────────────────────────────┘
```

- Background: Blue-50 (#EFF6FF)
- Border: Blue-200 (#BFDBFE)
- Text: Blue-800 (#1E40AF)

### Behavioral Changes

1. All data queries use the selected athlete's context (family_unit_id)
2. Quick tasks still show the parent's own tasks (not athlete's)
3. Suggestions are context-aware (show "Consider discussing together" note)
4. View logging records that parent viewed this athlete's dashboard
5. No edit/delete actions available in parent mode
