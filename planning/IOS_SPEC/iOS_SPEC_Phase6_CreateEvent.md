# iOS Page Specification: Create Event

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Create Event
**Web Route:** `/events/create`
**Priority:** Phase 6 (Polish & Edge Cases)
**Complexity:** High
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

The Create Event page allows athletes to log new recruiting events (camps, showcases, visits, games) with comprehensive details including dates, times, location, cost, school association, and registration status. The page validates input and provides helpful defaults to streamline data entry.

### Key User Actions

- Select event type (required)
- Enter event name (required)
- Select start date (required)
- Optionally select end date, times, check-in time
- Link event to a school (optional dropdown with "Add new" option)
- Enter location details (address, city, state)
- Add event URL, description, performance notes
- Specify cost, event source, registration/attendance status
- Get directions to event location (opens Maps)
- Save event and navigate to detail page
- Cancel and return to events list

### Success Criteria

- Form validates required fields before submission
- Date/time defaults intelligently (end date = start date, end time = start + 1 hour)
- School dropdown allows adding new school inline
- "Get Directions" button opens Apple Maps with address
- Successful save navigates to event detail page
- All form data persists correctly in Supabase
- Error messages are clear and actionable

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Create Event page (from Events list "+ Add Event" button)
2. System displays empty form with required field indicators
3. User fills in:
   - Event Type (dropdown, required)
   - Event Name (text input, required)
   - Start Date (date picker, required)
   - Optional: School, Location, Times, Cost, Notes
4. System auto-populates end date = start date (user can change)
5. System auto-populates end time = start time + 1 hour (if start time entered)
6. User taps "Create Event"
7. System validates required fields
8. System calls POST to Supabase events table
9. System navigates to event detail page (/events/[id])
```

### Alternative Flow: Link to School

```
1. User taps "School" dropdown
2. Dropdown shows:
   - "-- Select a school --" (default)
   - List of user's schools
   - "None"
   - "Other (not listed)"
   - "+ Add new school"
3. User selects a school → school_id set
4. User selects "Other (not listed)" → modal appears for school name input
5. User selects "+ Add new school" → modal appears with school form
6. User enters school details and saves
7. System creates school in Supabase
8. System refreshes school dropdown
9. System pre-selects newly created school
```

### Alternative Flow: Get Directions

```
1. User enters address/city/state
2. "Get Directions" button appears (only if location entered)
3. User taps "Get Directions"
4. System constructs address query: "[address], [city], [state]"
5. System opens Apple Maps with search query
6. Apple Maps shows directions to location
```

### Error Scenarios

```
Error: Required fields missing
- User taps "Create Event" without filling required fields
- System highlights missing fields in red
- System shows error summary banner: "Please complete all required fields"
- Form does not submit

Error: Invalid date range
- User selects end date before start date
- System shows inline error: "End date must be after start date"
- Submit button disabled until corrected

Error: Network failure during save
- System shows error alert: "Failed to create event. Please check your connection and try again."
- User can retry or cancel
- Form data remains filled (not lost)

Error: School creation fails
- System shows alert: "Failed to add school. Please try again."
- User returns to school modal to retry
```

---

## 3. Data Models

### Primary Model: Event (for creation)

```swift
struct CreateEventData {
  var type: EventType  // Required
  var name: String  // Required
  var startDate: String  // Required, ISO format "YYYY-MM-DD"
  var schoolId: String?
  var location: String?
  var address: String?
  var city: String?
  var state: String?
  var endDate: String?
  var startTime: String?  // HH:MM format
  var endTime: String?
  var checkinTime: String?
  var url: String?
  var description: String?
  var eventSource: EventSource?
  var cost: Double?
  var registered: Bool = false
  var attended: Bool = false
  var performanceNotes: String?
}

enum EventType: String, CaseIterable {
  case showcase, camp, officialVisit = "official_visit",
       unofficialVisit = "unofficial_visit", game

  var displayName: String {
    switch self {
    case .showcase: return "Showcase"
    case .camp: return "Camp"
    case .officialVisit: return "Official Visit"
    case .unofficialVisit: return "Unofficial Visit"
    case .game: return "Game"
    }
  }
}

enum EventSource: String, CaseIterable {
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

### Data Origin

- **Source:** Supabase table `events`
- **Mutation:** Create (insert)
- **Validation:** Client-side + server-side (Supabase constraints)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Create Event

```
POST (Supabase insert)

Supabase call:
- .from("events")
- .insert([{ ...eventData, user_id: currentUserId }])
- .select()
- .single()

Body:
{
  "type": "showcase",
  "name": "Spring Showcase 2026",
  "school_id": "uuid" | null,
  "location": "string" | null,
  "address": "string" | null,
  "city": "string" | null,
  "state": "string" | null,
  "start_date": "2026-04-15",
  "start_time": "09:00" | null,
  "end_date": "2026-04-16" | null,
  "end_time": "17:00" | null,
  "checkin_time": "08:30" | null,
  "url": "https://..." | null,
  "description": "string" | null,
  "event_source": "email" | null,
  "cost": 150.00 | null,
  "registered": false,
  "attended": false,
  "performance_notes": "string" | null,
  "user_id": "uuid"
}

Response:
{
  "id": "uuid",
  "type": "showcase",
  "name": "Spring Showcase 2026",
  ...all fields,
  "created_at": "2026-02-10T...",
  "updated_at": "2026-02-10T..."
}

Error Codes:
- 400: Invalid input (missing required fields)
- 401: Not authenticated
- 500: Server error
```

#### Endpoint 2: Fetch Schools (for dropdown)

```
GET (Supabase query)

Supabase call:
- .from("schools")
- .select("id, name, location")
- .eq("user_id", currentUserId)
- .order("name", { ascending: true })

Response:
[
  { "id": "uuid", "name": "University of Georgia", "location": "Athens, GA" },
  { "id": "uuid", "name": "Georgia Tech", "location": "Atlanta, GA" },
  ...
]
```

#### Endpoint 3: Create School (inline)

```
POST (Supabase insert)

Supabase call:
- .from("schools")
- .insert([{ name, location, user_id }])
- .select()
- .single()

Body:
{
  "name": "New School Name",
  "location": "City, State",
  "user_id": "uuid"
}

Response:
{
  "id": "uuid",
  "name": "New School Name",
  "location": "City, State",
  ...
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
@State var formData = CreateEventData()
@State var schools: [School] = []
@State var isLoading = false
@State var error: String? = nil

// Modal state
@State var showOtherSchoolModal = false
@State var showAddSchoolModal = false
@State var otherSchoolName = ""
@State var newSchoolData = (name: "", location: "")

// Validation
@State var validationErrors: [String: String] = [:]
```

### Form Watchers

```swift
// Auto-populate end date when start date changes
.onChange(of: formData.startDate) { newValue in
  if formData.endDate == nil || formData.endDate!.isEmpty {
    formData.endDate = newValue
  }
}

// Auto-populate end time when start time changes
.onChange(of: formData.startTime) { newValue in
  if formData.endTime == nil || formData.endTime!.isEmpty {
    if let time = parseTime(newValue) {
      let endTime = time.addingTimeInterval(3600)  // +1 hour
      formData.endTime = formatTime(endTime)
    }
  }
}

// Show/hide modals based on school selection
.onChange(of: formData.schoolId) { newValue in
  if newValue == "other" {
    showOtherSchoolModal = true
  } else if newValue == "add_new" {
    showAddSchoolModal = true
  }
}
```

### Validation Logic

```swift
func validateForm() -> Bool {
  validationErrors = [:]

  if formData.type == nil {
    validationErrors["type"] = "Event type is required"
  }

  if formData.name.trimmingCharacters(in: .whitespaces).isEmpty {
    validationErrors["name"] = "Event name is required"
  }

  if formData.startDate.isEmpty {
    validationErrors["startDate"] = "Start date is required"
  }

  if let endDate = formData.endDate, !endDate.isEmpty {
    if endDate < formData.startDate {
      validationErrors["endDate"] = "End date must be after start date"
    }
  }

  return validationErrors.isEmpty
}
```

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Back button: "← Back to Events"
  - Title: "Add New Event"

[Content - Scrollable Form]
  Section 1: Event Info
    - Event Type (picker, required *)
    - Event Name (text field, required *)
    - School (dropdown with "None", "Other", "+ Add new")
    - Event Source (picker, optional)
    - Cost (number field, $ prefix)
    - Event URL (text field, URL keyboard)

  Section 2: Date & Time
    - Start Date (date picker, required *)
    - Start Time (time picker, optional)
    - End Date (date picker, optional, defaults to start date)
    - End Time (time picker, optional, defaults to start time + 1 hour)
    - Check-in Time (time picker, optional)

  Section 3: Location
    - Street Address (text field)
    - City (text field)
    - State (text field, 2 char max, uppercase)
    - "Get Directions" button (if address/city entered)

  Section 4: Event Details
    - Event Description (multiline text, 3 rows)
    - Registered checkbox
    - Attended checkbox

  Section 5: Performance
    - Performance Notes (multiline text, 4 rows)

[Bottom Buttons - Fixed Bar]
  - "Create Event" button (blue, full width, disabled if invalid)
  - "Cancel" button (gray, full width)
```

### Design System References

- **Color Palette:**
  - Primary: `#3B82F6` (blue)
  - Gray: `#6B7280` (secondary text)
  - Border: `#D1D5DB` (light gray)
  - Error: `#EF4444` (red)

- **Typography:**
  - Page Title: SF Pro Display, 24pt, bold
  - Section Header: SF Pro Text, 16pt, semibold
  - Labels: SF Pro Text, 14pt, medium
  - Input Text: SF Pro Text, 16pt, regular
  - Hint: SF Pro Text, 12pt, regular, gray-600

- **Spacing:** 16pt section padding, 12pt between fields
- **Radius:** 8pt for inputs, 12pt for buttons
- **Borders:** 1pt solid gray-300 for inputs

### Interactive Elements

#### Text Inputs

- **Style:** Rounded border, 44pt height, 16pt padding
- **Placeholder:** Gray-400 text
- **Focus:** Blue border, 2pt width
- **Error:** Red border, red helper text below

#### Pickers

- **Event Type:** Native iOS picker wheel
- **School:** Native picker with custom options ("None", "Other", "+ Add new")
- **Date/Time:** Native iOS date/time pickers (inline or sheet)

#### Checkboxes

- **Style:** iOS standard toggle switch
- **Labels:** Left-aligned, 14pt medium

#### Buttons

- **Primary (Create Event):** Blue gradient, white text, rounded, disabled state gray
- **Secondary (Cancel):** Gray-200 background, gray-900 text
- **Get Directions:** Green background, white text, map pin icon

### Modals

#### "Other School" Modal

```
- Background: Semi-transparent black overlay
- Card: White, centered, rounded corners
- Title: "School Not Listed"
- Input: School name text field
- Buttons: "Continue" (blue), "Cancel" (gray)
```

#### "Add New School" Modal

```
- Similar to "Other School" modal
- Title: "Add New School"
- Inputs: School name (required), Location (optional)
- Buttons: "Save School" (blue, disabled if name empty), "Cancel" (gray)
```

### Loading States

```
Saving Event:
- "Create Event" button shows spinner + "Creating..." text
- Button disabled during save
- Form inputs disabled
- Background dimmed slightly

Loading Schools:
- School dropdown shows "Loading..." while fetching
- Disabled until schools loaded
```

### Accessibility

- **VoiceOver:**
  - Form labels: "Event Type, Required field"
  - Required indicator: "This field is required" announcement
  - Validation errors: "Error: [message]" announcement on field focus
  - Date picker: "Start Date, Required field, [current value]"

- **Color Contrast:** WCAG AA compliant (4.5:1 for text)
- **Touch Targets:** 44pt minimum
- **Dynamic Type:** All text scales with user preference
- **Keyboard Navigation:** Tab order follows logical flow

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client
- MapKit (for "Get Directions" integration)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (events, schools tables)
- Supabase Auth (user session)
- Apple Maps (directions)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show alert "Request timed out, please try again"
- **No internet:** Show alert "No internet connection" + retry button
- **Server error (5xx):** Show alert "Server error, please try again later"

### Data Errors

- **Required field missing:** Highlight field in red, show error message below
- **Invalid date range:** Show inline error "End date must be after start date"
- **Invalid URL format:** Show error "Please enter a valid URL (e.g., https://...)"

### User Errors

- **School creation fails:** Show alert, allow retry
- **Duplicate event name:** Allow (no constraint on name uniqueness)
- **Form submitted twice:** Disable button after first tap to prevent duplicates

### Edge Cases

- **Very long event name:** Allow up to 255 characters, no truncation on create
- **Past event date:** Allow (user may be logging past event)
- **Cost = 0:** Allow (free event)
- **State abbreviation validation:** Convert to uppercase, warn if not 2 chars
- **Cancel with unsaved changes:** Show alert "Discard changes?" (Yes/No)
- **App backgrounded during save:** Resume save when app returns to foreground

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Form loads with empty fields
- [ ] Required fields validate correctly
- [ ] End date defaults to start date
- [ ] End time defaults to start time + 1 hour
- [ ] School dropdown loads user's schools
- [ ] "Add new school" creates school and pre-selects it
- [ ] "Get Directions" opens Maps with correct address
- [ ] Successful save navigates to event detail page
- [ ] Form data persists correctly in Supabase

### Error Tests

- [ ] Submit without required fields shows validation errors
- [ ] End date before start date shows error
- [ ] Network timeout shows error alert
- [ ] 401 error redirects to login
- [ ] School creation failure shows error
- [ ] Invalid URL shows error

### Edge Case Tests

- [ ] Very long event name (255 chars) saves correctly
- [ ] Past event date allowed
- [ ] Free event (cost = 0) saves correctly
- [ ] Cancel with unsaved changes prompts confirmation
- [ ] Rapid taps on "Create Event" don't create duplicates
- [ ] VoiceOver announces all fields and errors
- [ ] Form adapts to different device sizes
- [ ] Dynamic Type scaling works

### Performance Tests

- [ ] Form loads in <1 second
- [ ] School dropdown populates in <500ms
- [ ] Save completes in <2 seconds on 4G
- [ ] No memory leaks when navigating away

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- Web version has "School Not Listed" and "Add New School" modals — iOS should use similar pattern
- Web auto-populates end date/time intelligently — iOS must replicate this behavior
- Web allows linking to coaches at event creation — iOS may defer this to event detail page

### iOS-Specific Considerations

- Native date/time pickers take up significant vertical space (use inline or sheet style)
- State input should auto-capitalize and limit to 2 characters
- URL keyboard type improves UX for URL field
- MapKit integration requires "Get Directions" button vs. inline map embed
- Form scrolling may conflict with picker interactions (test on smaller devices)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/events/create.vue`
- **Composables used:** `useEvents`, `useSchools`, `useFormValidation`
- **Validation schemas:** `/utils/validation/schemas.ts` (eventSchema)

### Design References

- **Figma:** [Link if available]
- **Brand Guidelines:** Match Nuxt web app

### API Documentation

- **Database Schema:** `events`, `schools` tables in Supabase
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)

---

## 12. Sign-Off

**Specification reviewed by:** Claude Code
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Create Event form is complex due to many fields, intelligent defaults, and inline school creation. Prioritize form validation and UX polish for smooth data entry experience.

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- Add Coach (`/coaches/new`) - Similar multi-section form pattern
- Add School (`/schools/new`) - Similar form validation and modal patterns

### Code Snippets from Web

```typescript
// Auto-populate end date when start date changes
watch(
  () => form.start_date,
  (newValue) => {
    if (newValue && !form.end_date) {
      form.end_date = newValue;
    }
  },
);

// Auto-populate end time when start time changes
watch(
  () => form.start_time,
  (newValue) => {
    if (newValue && !form.end_time) {
      const [hours, minutes] = newValue.split(":");
      const endHour = (parseInt(hours) + 1) % 24;
      form.end_time = `${String(endHour).padStart(2, "0")}:${minutes}`;
    }
  },
);

// Get Directions
const getDirections = () => {
  let query = "";
  if (form.address) query += form.address;
  if (form.city) query += (query ? ", " : "") + form.city;
  if (form.state) query += (query ? ", " : "") + form.state;

  if (query.trim()) {
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://www.google.com/maps/search/${encodedQuery}`, "_blank");
  }
};
```
