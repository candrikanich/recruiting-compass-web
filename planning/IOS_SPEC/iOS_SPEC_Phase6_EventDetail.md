# iOS Page Specification: Event Detail

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Event Detail
**Web Route:** `/events/[id]`
**Priority:** Phase 6 (Polish & Edge Cases)
**Complexity:** High
**Estimated Time:** 5-6 days

---

## 1. Overview

### Purpose

The Event Detail page displays comprehensive information about a specific event, allows editing event details, tracking coaches present, logging performance metrics recorded at the event, marking attendance, and quick-logging interactions that occurred at the event.

### Key User Actions

- View all event details (dates, location, cost, status, description)
- Edit event information (inline modal/sheet)
- Delete event with confirmation
- Mark event as attended (triggers quick interaction logging modal)
- Get directions to event location (opens Maps)
- Add/remove coaches present at event
- Log performance metrics recorded at event
- Export metrics recorded at event (PDF/CSV)
- Quick-log interactions that occurred at event
- Navigate back to events list

### Success Criteria

- Event loads and displays within 2 seconds
- All event details render correctly
- "Mark Attended" triggers interaction logging workflow
- Coaches present list populates from school
- Performance metrics display with export option
- Edit modal pre-fills with current event data
- Successful edits update display immediately
- Delete action removes event and navigates back to list
- All mutations persist correctly

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Event Detail (from events list tap)
2. System fetches event by ID from Supabase
3. System displays:
   - Event header (type badge, name, date range, action buttons)
   - Event details (time, cost, source, status, location)
   - Description section (if any)
   - Performance notes (if any)
   - Metrics recorded at event (if any)
   - Coaches present section (if school linked)
   - Quick interaction logging section
4. User can:
   - Tap "Edit" to open edit modal
   - Tap "Delete" to confirm and delete
   - Tap "Mark Attended" to update status and log interaction
   - Tap "Get Directions" to open Maps
   - Add/remove coaches
   - Log new metrics
```

### Alternative Flow: Mark as Attended

```
1. User taps "✓ Mark Attended" button (only visible if not yet attended)
2. System updates event: attended = true
3. System shows "Quick Log Interaction" modal:
   - Interaction Type (dropdown: In-Person, Phone, Email, Game)
   - Direction (dropdown: Coach contacted us, We contacted coach)
   - Content (multiline text, required)
   - Sentiment (dropdown: Very Positive, Positive, Neutral, Negative)
4. User fills in interaction details
5. User taps "Log Interaction"
6. System creates interaction linked to event
7. Modal closes
8. Event detail page shows "Attended" status
```

### Alternative Flow: Edit Event

```
1. User taps "Edit" button
2. System shows modal/sheet with edit form:
   - Pre-filled with current event data
   - Editable fields: name, type, location, dates, cost, performance notes
3. User modifies fields
4. User taps "Save Changes"
5. System validates changes
6. System calls UPDATE to Supabase
7. System closes modal
8. Event detail page refreshes with updated data
```

### Alternative Flow: Add Coach Present

```
1. User taps "+ Add Coach" (only if event has school_id)
2. System shows dropdown of coaches from that school
3. User selects coach
4. User taps "Add"
5. System updates event.coaches_present array
6. System refreshes coaches list
7. Coach appears in "Coaches Present" section
```

### Alternative Flow: Log Performance Metric

```
1. User taps "+ Add Metric"
2. System shows metric form:
   - Metric Type (dropdown: Velocity, Exit Velo, 60-Yard Dash, Pop Time, ERA, etc.)
   - Value (number input)
   - Unit (text input, e.g., "mph", "sec")
   - Notes (multiline text)
   - Verified checkbox
3. User fills in metric
4. User taps "Log Metric"
5. System creates performance_metric with event_id link
6. System refreshes metrics list
7. Metric appears in "Metrics Recorded" section
```

### Error Scenarios

```
Error: Event not found
- User sees: "Event not found" message
- CTA: "Return to Events →" button
- Navigates back to events list

Error: Network failure loading event
- User sees: Error banner with retry button
- Recovery: Tap "Retry" or pull-to-refresh

Error: Update/Delete fails
- System shows alert: "[Action] failed. Please try again."
- User can retry or cancel
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
  let startDate: String  // "YYYY-MM-DD"
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

  var dateRangeFormatted: String {
    // "Apr 15, 2026" or "Apr 15 - 16, 2026"
  }
}
```

### Related Models

```swift
struct Coach: Codable, Identifiable {
  let id: String
  let schoolId: String
  let firstName: String
  let lastName: String
  let role: String
  let email: String?
  let phone: String?
}

struct PerformanceMetric: Codable, Identifiable {
  let id: String
  let userId: String
  let eventId: String?
  let metricType: String  // "velocity", "exit_velo", etc.
  let value: Double
  let unit: String
  let recordedDate: String
  let notes: String?
  let verified: Bool
  let createdAt: Date

  var displayLabel: String {
    // "Fastball Velocity", "Exit Velocity", etc.
  }
}

struct InteractionData {
  var type: InteractionType  // in_person_visit, phone_call, email, game
  var direction: InteractionDirection  // inbound, outbound
  var content: String
  var sentiment: InteractionSentiment  // very_positive, positive, neutral, negative
}
```

### Data Origin

- **Source:** Supabase table `events` (+ join `coaches`, `performance_metrics`)
- **Refresh:** On page load, after mutations
- **Caching:** Cache event data for 5 minutes
- **Mutations:** Update, Delete available

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Event

```
GET (Supabase query)

Supabase call:
- .from("events")
- .select("*")
- .eq("id", eventId)
- .eq("user_id", currentUserId)
- .single()

Response:
{
  "id": "uuid",
  "type": "showcase",
  "name": "Spring Showcase 2026",
  "start_date": "2026-04-15",
  ...all event fields
}

Error Codes:
- 401: Not authenticated
- 403: No access to this event
- 404: Event not found
```

#### Endpoint 2: Update Event

```
PUT/PATCH (Supabase update)

Supabase call:
- .from("events")
- .update({ ...updates, updated_at: now })
- .eq("id", eventId)
- .select()
- .single()

Body:
{
  "name": "Updated Name",
  "attended": true,
  "coaches_present": ["uuid1", "uuid2"],
  ...any event fields to update
}

Response:
{
  "id": "uuid",
  ...updated event fields
}
```

#### Endpoint 3: Delete Event

```
DELETE (Supabase delete)

Supabase call:
- .from("events")
- .delete()
- .eq("id", eventId)

Response:
{ "success": true }
```

#### Endpoint 4: Fetch Coaches (for school)

```
GET (Supabase query)

Supabase call:
- .from("coaches")
- .select("id, first_name, last_name, role, email, phone")
- .eq("school_id", schoolId)
- .eq("user_id", currentUserId)

Response:
[
  {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Smith",
    "role": "Head Coach",
    "email": "coach@school.edu",
    "phone": "555-1234"
  },
  ...
]
```

#### Endpoint 5: Fetch Performance Metrics

```
GET (Supabase query)

Supabase call:
- .from("performance_metrics")
- .select("*")
- .eq("event_id", eventId)
- .eq("user_id", currentUserId)

Response:
[
  {
    "id": "uuid",
    "metric_type": "velocity",
    "value": 92.5,
    "unit": "mph",
    "verified": true,
    "notes": "Measured at showcase",
    "recorded_date": "2026-04-15"
  },
  ...
]
```

#### Endpoint 6: Create Performance Metric

```
POST (Supabase insert)

Supabase call:
- .from("performance_metrics")
- .insert([{ ...metricData, user_id, event_id }])
- .select()
- .single()

Body:
{
  "metric_type": "velocity",
  "value": 92.5,
  "unit": "mph",
  "recorded_date": "2026-04-15",
  "notes": "...",
  "verified": true,
  "event_id": "uuid",
  "user_id": "uuid"
}

Response:
{
  "id": "uuid",
  ...metric fields
}
```

#### Endpoint 7: Create Interaction

```
POST (Supabase insert)

Supabase call:
- .from("interactions")
- .insert([{ ...interactionData, user_id, event_id }])
- .select()
- .single()

Body:
{
  "school_id": "uuid",
  "coach_id": null,
  "event_id": "uuid",
  "type": "in_person_visit",
  "direction": "inbound",
  "subject": "Interaction at Spring Showcase 2026",
  "content": "...",
  "sentiment": "positive",
  "occurred_at": "2026-04-15T09:00:00Z",
  "logged_by": "uuid"
}

Response:
{
  "id": "uuid",
  ...interaction fields
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
@State var event: Event? = nil
@State var eventMetrics: [PerformanceMetric] = []
@State var schoolCoaches: [Coach] = []
@State var coachesAtEvent: [Coach] = []
@State var isLoading = false
@State var error: String? = nil

// Modals
@State var showEditForm = false
@State var showMetricForm = false
@State var showQuickLogModal = false
@State var showAddCoach = false
@State var showExportModal = false

// Forms
@State var editFormData = EditEventData()
@State var newMetric = NewMetricData()
@State var quickLogData = InteractionData()
@State var selectedCoachId: String? = nil

// Validation
@State var isUpdating = false
@State var metricLoading = false
```

### Computed Properties

```swift
var availableCoaches: [Coach] {
  let presentIds = event?.coachesPresent ?? []
  return schoolCoaches.filter { !presentIds.contains($0.id) }
}

var eventSchoolId: String? {
  return event?.schoolId
}
```

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Back button: "← Back to Events"
  - Title: "" (empty, title in content)

[Content - Scrollable]
  [Event Header Card]
    - Type badge (colored, rounded)
    - Event name (large, bold)
    - Date range (formatted)
    - Action buttons row:
      - "✓ Mark Attended" (if not attended, green)
      - "Edit" (blue)
      - "Delete" (red)

  [Event Details Grid]
    - Start Time (icon + label)
    - Check-in Time (icon + label)
    - Cost (icon + $ amount)
    - Source (icon + label)
    - Status (icon + label)

  [Location Section] (if location exists)
    - 📍 Header
    - Address, City, State
    - "🗺️ Get Directions" button (green)

  [Description Section] (if description exists)
    - Header: "Event Description"
    - Text content

  [Event URL Section] (if url exists)
    - Header: "Event Link"
    - Tappable link (opens Safari)

  [Performance Notes Section] (if notes exist)
    - Header: "Performance Notes"
    - Text content

  [Metrics Section] (if metrics exist)
    - Header: "Metrics Recorded at This Event"
    - Export button (icon)
    - Metric cards (gray background, value + unit, verified badge, delete button)

  [Coaches Present Section]
    - Header: "Coaches Present"
    - "+ Add Coach" button (if school linked)
    - Coach cards (name, role, email, phone, remove button)
    - Empty state: "No coaches recorded" or "Event not linked to school"

  [Log Metric Section]
    - Header: "Log Performance Metric"
    - "+ Add Metric" button
    - Form (if expanded):
      - Metric Type dropdown
      - Value input
      - Unit input
      - Notes textarea
      - Verified checkbox
      - "Log Metric" / "Cancel" buttons
```

### Design System References

- **Color Palette:**
  - Primary: `#3B82F6` (blue)
  - Success: `#10B981` (green)
  - Danger: `#EF4444` (red)
  - Gray: `#6B7280` (secondary text)

- **Typography:**
  - Event Name: SF Pro Display, 24pt, bold
  - Section Header: SF Pro Text, 18pt, semibold
  - Body Text: SF Pro Text, 14pt, regular
  - Metric Value: SF Pro Display, 32pt, bold

- **Spacing:** 16pt card padding, 12pt gaps
- **Radius:** 12pt for cards, 8pt for badges/buttons
- **Shadows:** 0 1px 3px rgba(0,0,0,0.1) for cards

### Interactive Elements

#### Action Buttons

- **Mark Attended:** Green-100 background, green-700 text, checkmark icon
- **Edit:** Blue-100 background, blue-700 text
- **Delete:** Red-100 background, red-700 text, trash icon

#### Edit Modal

```
- Full-screen sheet or modal card
- Header: "Edit Event" + close button (X)
- Form: Pre-filled with current data
- Buttons: "Save Changes" (blue), "Cancel" (gray)
```

#### Quick Log Interaction Modal

```
- Semi-transparent background overlay
- Centered card
- Title: "Log Interactions"
- Subtitle: "Did you have any coaching interactions at [event name]?"
- Form:
  - Type dropdown
  - Direction dropdown
  - Content textarea (required)
  - Sentiment dropdown
- Buttons: "Log Interaction" (blue), "Skip for Now" (gray)
```

#### Metric Form

```
- Inline expansion below "+ Add Metric" button
- Gray-50 background, rounded
- Fields: Type, Value, Unit, Notes, Verified
- Buttons: "Log Metric" (blue, disabled if invalid), "Cancel" (gray)
```

### Loading States

```
Loading Event:
- Skeleton screen mimicking final layout
- Shimmer animation
- No interaction until loaded

Updating Event:
- Action button shows spinner + "Saving..." text
- Form inputs disabled
- Background dimmed

Deleting Event:
- Confirmation alert: "Are you sure?"
- On confirm: Full-screen spinner + "Deleting..."
- Navigate back to list on success
```

### Accessibility

- **VoiceOver:**
  - Event header: "[Event name], [Type], [Date], [Status]"
  - Action buttons: "Mark as attended", "Edit event", "Delete event"
  - Metric card: "[Metric label], [Value] [Unit], [Verified/Not verified]"
  - Coach card: "[Name], [Role], [Email], [Phone]"

- **Color Contrast:** WCAG AA (4.5:1 minimum)
- **Touch Targets:** 44pt minimum
- **Dynamic Type:** All text scales
- **Haptic Feedback:** Light impact on button taps, notification on delete

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client
- MapKit (for directions)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (events, coaches, performance_metrics, interactions tables)
- Supabase Auth (user session)
- Apple Maps (directions)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show error banner with retry
- **No internet:** Show offline indicator, cache last-loaded event
- **Server error (5xx):** Show error alert with retry

### Data Errors

- **Event not found:** Show "Event not found" message + return to list
- **Invalid event ID:** Redirect to create page or list
- **Missing required field:** Show placeholder ("Unknown")
- **Stale data:** Refresh on app foreground

### User Errors

- **Delete confirmation:** Always confirm destructive action
- **Edit form validation:** Validate before save, show inline errors
- **Metric value invalid:** Show error "Please enter a valid number"

### Edge Cases

- **Event with no school:** Disable "Add Coach" section
- **Event already attended:** Hide "Mark Attended" button
- **Very long description:** Allow full text, enable scrolling
- **Multiple metrics same type:** Allow (no uniqueness constraint)
- **Coach removed from school:** Still show in coaches_present (historical data)
- **Event in far past:** Allow viewing/editing (no time restrictions)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Event loads and displays correctly
- [ ] Edit modal pre-fills with current data
- [ ] Edit saves and updates display
- [ ] Delete confirms and navigates back
- [ ] "Mark Attended" updates status and shows interaction modal
- [ ] Quick interaction logging creates interaction
- [ ] Adding coach updates coaches present list
- [ ] Removing coach updates list
- [ ] Logging metric adds to metrics list
- [ ] Export metrics triggers export modal
- [ ] "Get Directions" opens Maps

### Error Tests

- [ ] Event not found shows error
- [ ] Network timeout shows retry
- [ ] 401 redirects to login
- [ ] Update failure shows error alert
- [ ] Delete failure shows error alert
- [ ] Invalid metric value shows error

### Edge Case Tests

- [ ] Event with no school disables coach section
- [ ] Already attended event hides "Mark Attended"
- [ ] Very long text doesn't break layout
- [ ] VoiceOver announces all elements
- [ ] Page adapts to different device sizes
- [ ] Dynamic Type scaling works

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] Scrolling is smooth (60 fps)
- [ ] No memory leaks when navigating away
- [ ] Edit/delete complete in <2 seconds

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- Web version shows "Quick Log Interaction" modal after marking attended — iOS must replicate
- Web allows inline editing of coaches present — iOS uses add/remove buttons
- Web has export modal for metrics — iOS should implement similar flow

### iOS-Specific Considerations

- Full-screen sheets on iOS may cover entire page (use card style for modals)
- MapKit "Get Directions" opens Maps app (cannot embed inline map)
- Delete confirmation uses iOS standard alert (not custom modal)
- Date formatting must respect user's locale settings
- Large metrics list may require pagination (100+ items)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/events/[id].vue`
- **Composables used:** `useEvents`, `usePerformance`, `useCoaches`, `useInteractions`
- **Related components:** `ExportButton`, `ExportModal`

### Design References

- **Figma:** [Link if available]
- **Brand Guidelines:** Match Nuxt web app

### API Documentation

- **Database Schema:** `events`, `coaches`, `performance_metrics`, `interactions` tables
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)

---

## 12. Sign-Off

**Specification reviewed by:** Claude Code
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Event Detail is the most complex page in Phase 6 due to multiple CRUD operations, modal interactions, and cross-entity relationships (coaches, metrics, interactions). Allocate extra time for testing and UX polish.

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- Coach Detail (`/coaches/[id]`) - Similar detail page structure with related data
- School Detail (`/schools/[id]`) - Similar CRUD operations and coaches list

### Code Snippets from Web

```typescript
// Mark as attended and show interaction modal
const markAsAttended = async () => {
  if (!event.value) return;
  try {
    await updateEvent(eventId, { attended: true });
    event.value.attended = true;
    showQuickLogModal.value = true; // Trigger interaction logging
  } catch (err) {
    console.error("Failed to mark as attended:", err);
  }
};

// Quick log interaction
const handleQuickLogInteraction = async () => {
  if (!event.value || !event.value.school_id) return;
  try {
    const occurredAt = new Date(event.value.start_date).toISOString();
    await createInteraction({
      school_id: event.value.school_id,
      event_id: eventId,
      type: quickLogData.type,
      direction: quickLogData.direction,
      subject: `Interaction at ${event.value.name}`,
      content: quickLogData.content,
      sentiment: quickLogData.sentiment,
      occurred_at: occurredAt,
    });
    showQuickLogModal.value = false;
  } catch (err) {
    console.error("Failed to log interaction:", err);
  }
};
```
