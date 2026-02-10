# iOS Page Specification: School Detail

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** School Detail
**Web Route:** `/schools/[id]`
**Priority:** MVP / Phase 3
**Complexity:** High (many editable sections, fit score, coaches panel, status history, College Scorecard integration)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

Display comprehensive details for a single school the athlete is tracking. This is the primary drill-down view from the Schools List, combining school metadata, fit score analysis, coaching philosophy, notes (shared and private), pros/cons, coaching staff, status history, and academic data from the College Scorecard API. Users can edit most fields in-place, update recruiting status, toggle favorite, contact coaches directly, and delete the school with cascade support.

### Key User Actions

- View school details (header, badges, location map, academic info)
- Update recruiting status via dropdown (creates status history entry)
- Update priority tier (A/B/C selector)
- Toggle favorite (star button, optimistic update)
- Edit shared notes and private notes (per-user keyed)
- Add/remove pros and cons
- Edit basic information (address, facility, mascot, size, website, social)
- Edit coaching philosophy (5 textarea fields)
- View fit score with breakdown and division recommendations
- Lookup College Scorecard data (auto-populates academic fields)
- View status change history timeline
- Contact coaches directly (email, SMS, call)
- Navigate to full coaches management sub-page
- Navigate to interaction log sub-page
- Send email via modal
- Upload/view shared documents
- Delete school (smart delete with cascade)

### Success Criteria

- School loads with all sections populated from Supabase data
- Status dropdown creates a history entry on change
- Favorite toggle persists immediately with optimistic update
- Fit score displays with tier badge and collapsible breakdown
- Division recommendations appear when fit score warrants it
- Notes (shared and private) save correctly per user
- Pros/cons add and remove with immediate persistence
- Coaching philosophy edits persist across 5 fields
- College Scorecard lookup populates academic fields
- Distance from home calculates when both coordinates are available
- Coaches panel shows contact actions (email, SMS, call)
- Delete handles cascade for schools with coaches/interactions
- Navigation to sub-pages (coaches, interactions) works correctly

---

## 2. User Flows

### Primary Flow

```
1. User taps a school card on the Schools List
2. System navigates to School Detail with school ID
3. System fetches school by ID from Supabase (scoped to family_unit_id)
4. System fetches coaches for this school
5. System fetches shared documents
6. System calculates/loads fit score
7. User sees scrollable detail view with all sections
8. User can tap back chevron to return to Schools List
```

### Alternative Flow: Update Status

```
1. User taps the status picker in the header
2. Native picker presents status options
3. User selects new status (e.g., "Interested" -> "Contacted")
4. System calls updateStatus API (creates status_changed_at + history entry)
5. Status badge updates immediately
6. Status History section refreshes to show new entry
```

### Alternative Flow: Edit Information

```
1. User taps "Edit" button on Information section
2. Form fields appear (address, facility, mascot, size, website, twitter)
3. User modifies fields
4. User taps "Save Information"
5. System calls updateSchool with academic_info merge
6. Section returns to display mode with updated data
```

### Alternative Flow: Toggle Favorite

```
1. User taps star icon in header
2. Star fills/unfills immediately (optimistic update)
3. System calls updateSchool with is_favorite toggle
4. If API fails: revert star state and show error toast
```

### Alternative Flow: Add Pro/Con

```
1. User types in "Add a pro..." or "Add a con..." input
2. User taps "+" button or presses return
3. System appends to pros/cons array and calls updateSchool
4. New item appears in the list with green/red badge
5. Input clears for next entry
```

### Alternative Flow: Lookup College Data

```
1. User taps "Lookup" button in Information section
2. System calls College Scorecard API with school name
3. API returns academic data (student size, tuition, admission rate, lat/lng)
4. System merges into academic_info and calls updateSchool
5. Information section updates with new data
6. If lookup fails: show error banner in Information section
```

### Alternative Flow: Delete School

```
1. User taps "Delete School" button (red, bottom of sidebar/page)
2. Confirmation alert: "Are you sure you want to delete this school?"
3. User confirms
4. System attempts simple delete via Supabase
5. If FK constraint -> cascade delete API removes coaches, interactions, etc.
6. If cascade used: alert "School and associated records deleted"
7. System navigates back to Schools List
```

### Alternative Flow: Contact Coach

```
1. User taps email/SMS/call icon on a coach card in the sidebar
2. System opens native iOS handler:
   - Email: MFMailComposeViewController or mailto: URL
   - SMS: MFMessageComposeViewController or sms: URL
   - Call: tel: URL
3. User completes contact action in native app
```

### Error Scenarios

```
Error: School not found
- User sees: "School not found" message with "Back to Schools" link
- Recovery: Navigate back to Schools List

Error: Network failure on load
- User sees: Error banner with retry button
- Recovery: Pull-to-refresh or tap retry

Error: Save fails (notes, info, philosophy)
- User sees: Error toast "Failed to save. Please try again."
- Recovery: Data remains in edit mode, user can retry

Error: College Scorecard lookup fails
- User sees: Red error banner in Information section
- Recovery: Dismiss error and try again, or enter data manually

Error: Delete fails
- User sees: Error alert with failure message
- Recovery: Retry or dismiss
```

---

## 3. Data Models

### School Model (extended from Phase 2)

```swift
struct School: Identifiable, Codable {
  let id: String
  let userId: String
  let name: String
  let location: String?
  let city: String?
  let state: String?
  let division: Division?
  let conference: String?
  let ncaaId: String?
  let status: SchoolStatus
  let statusChangedAt: Date?
  let priorityTier: PriorityTier?
  let ranking: Int?
  let isFavorite: Bool
  let website: String?
  let faviconUrl: String?
  let twitterHandle: String?
  let instagramHandle: String?
  let notes: String?
  let privateNotes: [String: String]?
  let pros: [String]
  let cons: [String]
  let academicInfo: AcademicInfo?
  let coachingPhilosophy: String?
  let coachingStyle: String?
  let recruitingApproach: String?
  let communicationStyle: String?
  let successMetrics: String?
  let fitScore: Double?
  let fitTier: String?
  let familyUnitId: String?
  let createdBy: String?
  let updatedBy: String?
  let createdAt: Date?
  let updatedAt: Date?
}
```

### AcademicInfo Model

```swift
struct AcademicInfo: Codable {
  let gpaRequirement: Double?
  let satRequirement: Int?
  let actRequirement: Int?
  let address: String?
  let city: String?
  let state: String?
  let latitude: Double?
  let longitude: Double?
  let baseballFacilityAddress: String?
  let mascot: String?
  let undergradSize: String?
  let studentSize: Int?
  let carnegieSize: String?
  let tuitionInState: Double?
  let tuitionOutOfState: Double?
  let admissionRate: Double?
  let distanceFromHome: Double?
}
```

### SchoolStatus Enum (full set from web)

```swift
enum SchoolStatus: String, Codable, CaseIterable {
  case interested
  case contacted
  case campInvite = "camp_invite"
  case recruited
  case officialVisitInvited = "official_visit_invited"
  case officialVisitScheduled = "official_visit_scheduled"
  case offerReceived = "offer_received"
  case committed
  case notPursuing = "not_pursuing"

  var displayName: String {
    switch self {
    case .interested: return "Interested"
    case .contacted: return "Contacted"
    case .campInvite: return "Camp Invite"
    case .recruited: return "Recruited"
    case .officialVisitInvited: return "Official Visit Invited"
    case .officialVisitScheduled: return "Official Visit Scheduled"
    case .offerReceived: return "Offer Received"
    case .committed: return "Committed"
    case .notPursuing: return "Not Pursuing"
    }
  }

  var badgeColor: Color {
    switch self {
    case .interested: return .blue
    case .contacted: return .gray
    case .campInvite: return .purple
    case .recruited: return .green
    case .officialVisitInvited: return .orange
    case .officialVisitScheduled: return .orange
    case .offerReceived: return .red
    case .committed: return Color(red: 0.13, green: 0.50, blue: 0.13)
    case .notPursuing: return .gray
    }
  }
}
```

### SchoolStatusHistory Model

```swift
struct SchoolStatusHistory: Identifiable, Codable {
  let id: String
  let schoolId: String
  let previousStatus: String?
  let newStatus: String
  let changedBy: String
  let changedAt: Date
  let notes: String?
  let createdAt: Date
}
```

### FitScoreResult Model

```swift
struct FitScoreResult: Codable {
  let score: Double            // 0-100
  let tier: FitTier
  let breakdown: FitScoreBreakdown
  let missingDimensions: [String]
}

struct FitScoreBreakdown: Codable {
  let athleticFit: Double?
  let academicFit: Double?
  let opportunityFit: Double?
  let personalFit: Double?
}

enum FitTier: String, Codable {
  case reach
  case match
  case safety
  case unlikely

  var displayName: String {
    switch self {
    case .reach: return "Reach"
    case .match: return "Match"
    case .safety: return "Safety"
    case .unlikely: return "Unlikely"
    }
  }

  var badgeColor: Color {
    switch self {
    case .reach: return .orange
    case .match: return .green
    case .safety: return .blue
    case .unlikely: return .red
    }
  }
}
```

### DivisionRecommendation Model

```swift
struct DivisionRecommendation {
  let shouldConsiderOtherDivisions: Bool
  let recommendedDivisions: [String]
  let message: String
}
```

### Coach Model (sidebar panel)

```swift
struct Coach: Identifiable, Codable {
  let id: String
  let schoolId: String?
  let firstName: String
  let lastName: String
  let role: CoachRole
  let email: String?
  let phone: String?
  let twitterHandle: String?
  let instagramHandle: String?

  var fullName: String { "\(firstName) \(lastName)" }
}

enum CoachRole: String, Codable, CaseIterable {
  case head
  case assistant
  case recruiting

  var displayName: String {
    switch self {
    case .head: return "Head Coach"
    case .assistant: return "Assistant Coach"
    case .recruiting: return "Recruiting Coordinator"
    }
  }
}
```

### CollegeDataResult Model

```swift
struct CollegeDataResult: Codable {
  let id: String
  let name: String
  let website: String?
  let address: String?
  let city: String?
  let state: String?
  let studentSize: Int?
  let carnegieSize: String?
  let admissionRate: Double?
  let tuitionInState: Double?
  let tuitionOutOfState: Double?
  let latitude: Double?
  let longitude: Double?
}
```

### Data Origin

- **Source:** Supabase `schools` table, filtered by `id` + `family_unit_id`
- **Status History:** Supabase `school_status_history` table, filtered by `school_id`
- **Coaches:** Supabase `coaches` table, filtered by `school_id`
- **Documents:** Supabase documents filtered by `shared_with_schools` containing school ID
- **Fit Score:** Calculated client-side via `useFitScore` (cached in memory)
- **College Data:** External API (College Scorecard data.gov)
- **Refresh:** On page mount, after edits, and on pull-to-refresh
- **Mutations:** Update school fields, update status (with history), toggle favorite, add/remove pros/cons, delete (simple + cascade)

---

## 4. API Integration

### Supabase Queries

```
// Fetch single school by ID (scoped to family)
supabase.from("schools")
  .select("*")
  .eq("id", schoolId)
  .eq("family_unit_id", activeFamilyId)
  .single()

// Update school fields
supabase.from("schools")
  .update(updatedFields)
  .eq("id", schoolId)
  .eq("family_unit_id", activeFamilyId)
  .select()
  .single()

// Update status (also creates history entry)
supabase.from("schools")
  .update(["status": newStatus, "status_changed_at": now, "updated_by": userId])
  .eq("id", schoolId)
  .eq("family_unit_id", activeFamilyId)
  .select()
  .single()

supabase.from("school_status_history")
  .insert([
    "school_id": schoolId,
    "previous_status": previousStatus,
    "new_status": newStatus,
    "changed_by": userId,
    "changed_at": now
  ])

// Fetch status history for school
supabase.from("school_status_history")
  .select("*")
  .eq("school_id", schoolId)
  .order("changed_at", ascending: false)

// Fetch coaches for school
supabase.from("coaches")
  .select("*")
  .eq("school_id", schoolId)

// Toggle favorite
supabase.from("schools")
  .update(["is_favorite": newValue])
  .eq("id", schoolId)

// Simple delete
supabase.from("schools")
  .delete()
  .eq("id", schoolId)
  .eq("family_unit_id", activeFamilyId)
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

Error Codes:
- 401: Not authenticated
- 403: No access to this school
- 404: School not found
```

### Endpoint: Fit Score

```
GET /api/schools/{id}/fit-score

Response:
{
  "score": 72,
  "tier": "match",
  "breakdown": {
    "athleticFit": 80,
    "academicFit": 65,
    "opportunityFit": 70,
    "personalFit": 73
  },
  "missingDimensions": ["athleticFit"]
}

POST /api/schools/{id}/fit-score  (recalculate)
```

### External API: College Scorecard

```
GET https://api.data.gov/ed/collegescorecard/v1/schools

Query Parameters:
- api_key: (stored in app config)
- school.name: "University of Texas"
- fields: id,school.name,school.city,school.state,school.school_url,
          location.lat,location.lon,latest.admissions.admission_rate.overall,
          latest.student.size,latest.cost.tuition.in_state,
          latest.cost.tuition.out_of_state
- per_page: 1

Response:
{
  "results": [{
    "id": 228778,
    "school.name": "The University of Texas at Austin",
    "school.city": "Austin",
    "school.state": "TX",
    "school.school_url": "www.utexas.edu",
    "location.lat": 30.2849,
    "location.lon": -97.7341,
    "latest.student.size": 40804,
    "latest.admissions.admission_rate.overall": 0.3189,
    "latest.cost.tuition.in_state": 10824,
    "latest.cost.tuition.out_of_state": 40032
  }]
}

Error Codes:
- 401: Invalid API key
- 429: Rate limited
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK

---

## 5. State Management

### Page-Level State

```swift
@State var school: School? = nil
@State var isLoading = false
@State var error: String? = nil
@State var fitScore: FitScoreResult? = nil
@State var divisionRecommendation: DivisionRecommendation? = nil
@State var coaches: [Coach] = []
@State var statusHistory: [SchoolStatusHistory] = []
@State var homeLocation: (latitude: Double, longitude: Double)? = nil

// Edit states
@State var isEditingBasicInfo = false
@State var isEditingNotes = false
@State var isEditingPrivateNotes = false
@State var editedNotes = ""
@State var editedPrivateNotes = ""
@State var editedBasicInfo = EditableBasicInfo()
@State var newPro = ""
@State var newCon = ""

// Status update
@State var isStatusUpdating = false
@State var isPriorityUpdating = false

// College data lookup
@State var isCollegeDataLoading = false
@State var collegeDataError: String? = nil

// Modals / sheets
@State var showDeleteConfirmation = false
@State var showEmailSheet = false
```

### Computed Properties

```swift
var myPrivateNote: String {
  guard let userId = authManager.currentUser?.id,
        let notes = school?.privateNotes else { return "" }
  return notes[userId] ?? ""
}

var calculatedSize: SchoolSize? {
  SchoolSize.from(studentSize: school?.academicInfo?.studentSize)
}

var calculatedDistanceFromHome: String? {
  guard let schoolLat = school?.academicInfo?.latitude,
        let schoolLng = school?.academicInfo?.longitude,
        let homeLat = homeLocation?.latitude,
        let homeLng = homeLocation?.longitude else { return nil }
  let home = CLLocation(latitude: homeLat, longitude: homeLng)
  let schoolLoc = CLLocation(latitude: schoolLat, longitude: schoolLng)
  let miles = home.distance(from: schoolLoc) / 1609.34
  return String(format: "%.0f miles", miles)
}

var schoolDocuments: [Document] {
  allDocuments.filter { $0.sharedWithSchools?.contains(schoolId) == true }
}
```

### Shared State

- **FamilyManager:** `activeFamilyId` for data scoping
- **AuthManager:** `currentUser.id` for private notes keying and attribution
- **PreferenceManager:** Home location for distance calculation

---

## 6. UI/UX Details

### Layout Structure (Scrollable, flattened from web 3-column layout)

```
[Navigation Bar]
  - Back: "< Schools"
  - Right: [Favorite Star]

[ScrollView]
  ┌─── School Header Section ───┐
  │ [Logo] Name                  │
  │ [MapPin] Location            │
  │ [Division] [Status v] [Tier] │
  │ [Size] [Conference]          │
  └──────────────────────────────┘

  ┌─── Quick Actions Section ───┐
  │ [Log Interaction]            │
  │ [Send Email]                 │
  │ [Manage Coaches]             │
  └──────────────────────────────┘

  ┌─── Coaches Panel ───────────┐
  │ Coaches          [Manage ->] │
  │ ┌─ Coach Card ─────────────┐ │
  │ │ Name, Role               │ │
  │ │ [Email] [SMS] [Call]     │ │
  │ └──────────────────────────┘ │
  │ (max 3, link to full list)   │
  └──────────────────────────────┘

  ┌─── Status History Section ──┐
  │ Status History               │
  │ [Previous] -> [New] Date     │
  │ [Previous] -> [New] Date     │
  └──────────────────────────────┘

  ┌─── Fit Score Section ───────┐
  │ School Fit Analysis          │
  │ Score: 72 [Match]            │
  │ Breakdown (collapsible):     │
  │   Athletic: 80               │
  │   Academic: 65               │
  │   Opportunity: 70            │
  │   Personal: 73               │
  │ Missing data warnings        │
  └──────────────────────────────┘

  ┌─── Division Recommendations ┐
  │ (conditional, blue banner)   │
  │ Consider Other Divisions     │
  │ Message text                 │
  │ [D2] [D3] badges             │
  └──────────────────────────────┘

  ┌─── Information Section ─────┐
  │ Information   [Lookup] [Edit]│
  │ [Map View (MapKit)]          │
  │ Distance from Home: 245 mi   │
  │ Campus Address: ...          │
  │ Baseball Facility: ...       │
  │ Mascot: ...                  │
  │ Undergrad Size: ...          │
  │ Website: (link)              │
  │ Twitter: (link)              │
  │ ── College Scorecard ──      │
  │ Students: 40,804             │
  │ Tuition (In): $10,824        │
  │ Tuition (Out): $40,032       │
  │ Admission Rate: 32%          │
  └──────────────────────────────┘

  ┌─── Notes Section ───────────┐
  │ Notes            [History] [Edit]│
  │ Shared notes text...         │
  └──────────────────────────────┘

  ┌─── Private Notes Section ───┐
  │ My Private Notes       [Edit]│
  │ "Only you can see these"     │
  │ Private notes text...        │
  └──────────────────────────────┘

  ┌─── Pros & Cons Section ─────┐
  │ ┌─ Pros ────────┐ ┌─ Cons ─────────┐ │
  │ │ [v] Great...  │ │ [x] Far from...│ │
  │ │ [v] Strong... │ │ [x] Expensive  │ │
  │ │ [+ Add pro ]  │ │ [+ Add con ]   │ │
  │ └───────────────┘ └────────────────┘ │
  └──────────────────────────────┘

  ┌─── Coaching Philosophy ─────┐
  │ Coaching Philosophy    [Edit]│
  │ Coaching Style: ...          │
  │ Recruiting Approach: ...     │
  │ Communication Style: ...     │
  │ Success Metrics: ...         │
  │ Overall Philosophy: ...      │
  └──────────────────────────────┘

  ┌─── Shared Documents ────────┐
  │ Shared Documents    [Upload] │
  │ [Doc Title] [Type] [View]    │
  │ (or empty state)             │
  └──────────────────────────────┘

  ┌─── Attribution Section ─────┐
  │ Created by: Parent           │
  │ Last updated: Parent         │
  │ Feb 7, 2026                  │
  └──────────────────────────────┘

  ┌─── Delete Section ──────────┐
  │ [Delete School] (red)        │
  └──────────────────────────────┘
```

### Badge Colors

**Status Badges** (matches web `statusBadgeColor` mapping):

| Status                   | Background | Text       |
| ------------------------ | ---------- | ---------- |
| Interested               | Blue-100   | Blue-700   |
| Contacted                | Slate-100  | Slate-700  |
| Camp Invite              | Purple-100 | Purple-700 |
| Recruited                | Green-100  | Green-700  |
| Official Visit Invited   | Amber-100  | Amber-700  |
| Official Visit Scheduled | Orange-100 | Orange-700 |
| Offer Received           | Red-100    | Red-700    |
| Committed                | Green-800  | White      |
| Not Pursuing             | Gray-300   | Gray-700   |

**Division Badges:** Same as Phase 2 (D1=Blue, D2=Green, D3=Purple, NAIA=Orange, JUCO=Gray)

**Priority Tier Badges:**

| Tier | Style            |
| ---- | ---------------- |
| A    | Gold badge, bold |
| B    | Silver badge     |
| C    | Bronze badge     |

**Fit Score Badge:**

| Score Range | Color            | Tier Label   |
| ----------- | ---------------- | ------------ |
| 70+         | Green (#10B981)  | Match/Safety |
| 50-69       | Orange (#F97316) | Reach        |
| <50         | Red (#EF4444)    | Unlikely     |

**Size Badges:** Same as Phase 2 SchoolSize enum.

### Favorite Star

- Position: Navigation bar trailing item
- Unfavorited: `star` SF Symbol, gray
- Favorited: `star.fill` SF Symbol, yellow
- Tap area: 44pt minimum

### Map View

- Use native MapKit `Map` view with annotation for school location
- Height: ~180pt
- Show school name as annotation title
- Conditional: only render when latitude/longitude are available

### Quick Actions

- Three full-width buttons stacked vertically
- "Log Interaction": Blue gradient, `bubble.left.and.bubble.right` icon -> pushes to `/schools/[id]/interactions`
- "Send Email": Purple gradient, `envelope` icon -> presents mail compose sheet
- "Manage Coaches": Slate, `person.2` icon -> pushes to `/schools/[id]/coaches`

### Coach Cards (Sidebar Panel)

- Show up to 3 coaches
- Each card: Name, role badge, contact action buttons (email/SMS/call)
- "Manage ->" link at top navigates to full coaches management
- Contact buttons use SF Symbols: `envelope` (blue), `message` (green), `phone` (purple)
- Each button: 34pt circle with icon, 44pt tap area

### Pros & Cons

- Pros: Green background items, green checkmark icon
- Cons: Red background items, red X icon
- Each item has an X button to remove
- Add input at bottom with "+" button
- Input: text field with return-to-submit

### Coaching Philosophy (5 Fields)

- Coaching Style
- Recruiting Approach
- Communication Style
- Success Metrics
- Overall Philosophy
- Display mode: labeled text blocks (or "Not provided" placeholder)
- Edit mode: 5 multiline text fields with placeholders

### Loading States

```
First Load:
- Full-screen spinner with "Loading school..."
- All sections render after data arrives

Section Saves:
- Save button shows "Saving..." with spinner
- Disabled state during save

Status Update:
- Status picker shows loading indicator while updating
- Reverts on failure

College Scorecard Lookup:
- "Lookup" button shows "Looking up..." with spinner
- Error banner appears below button on failure
```

### Empty States

**School Not Found:**

- Icon: `building.2.fill` (large, gray)
- Title: "School not found"
- Link: "Back to Schools" -> navigates to Schools List

**No Coaches:**

- Text: "No coaches added yet" (centered, gray)

**No Documents:**

- Text: "No documents shared with this school yet" (centered, gray)

**No Status History:**

- Text: "No status changes yet" (centered, gray)

**No Notes:**

- Text: "No notes added yet." (gray, italic)

**No Private Notes:**

- Text: "No private notes added yet." (gray, italic)

**No Pros/Cons:**

- Text: "No pros added yet" / "No cons added yet" (gray)

### Accessibility

- **VoiceOver:** All sections have clear headings, edit buttons announce purpose
- **Status picker:** "Recruiting status, currently {status}, double tap to change"
- **Favorite star:** "Favorite, toggle" / "Favorited, toggle"
- **Coach contact buttons:** "Email {coach name}", "Text {coach name}", "Call {coach name}"
- **Fit score:** "Fit score {score} percent, tier {tier}"
- **Pros/cons:** "Pro: {text}, remove button" / "Con: {text}, remove button"
- **Touch Targets:** All buttons 44pt minimum
- **Dynamic Type:** All text supports scaling

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- MapKit (for school location map)
- Supabase iOS Client (data queries + auth)
- CoreLocation (for distance calculations)
- MessageUI (for email/SMS compose)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (schools, school_status_history, coaches, documents tables)
- Cascade delete API endpoint
- College Scorecard API (data.gov)
- School logos (external favicon URLs)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry button
- **No internet:** Show offline indicator
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **Null location:** Show "Location unknown" in header
- **Null division:** Omit division badge
- **Null conference:** Omit conference badge
- **Null academic_info:** Hide map, hide distance, hide College Scorecard section
- **Null latitude/longitude:** Hide map view, hide distance calculation
- **Null fit_score:** Hide Fit Score section entirely
- **Null coaching_philosophy fields:** Show "Not provided" placeholders
- **Missing logo:** Show school initials in colored circle (like Phase 2 fallback)
- **Null status_changed_at:** Omit from display
- **Empty pros/cons arrays:** Show "No pros/cons added yet" text
- **Empty private_notes or missing user key:** Show "No private notes added yet"
- **Null website/twitter:** Hide Contact & Social section

### User Errors

- **Empty pro/con input:** Disable "+" button when input is empty
- **Save failure:** Keep edit mode active, show error toast
- **Favorite toggle failure:** Revert optimistic update, show brief error toast
- **Status update failure:** Revert to previous status, show error

### Edge Cases

- **Very long school name:** Truncate with ellipsis in header (2 lines max)
- **Very long notes:** ScrollView handles overflow
- **Many pros/cons (20+):** All render in scrollable section
- **Private notes keyed by wrong user_id:** Only show notes for current user
- **Concurrent edits (two family members editing):** Last-write-wins (Supabase default)
- **School with no coaches:** Empty state in coaches panel, "Manage" link still works
- **Parent vs athlete:** Parent sees all family schools read-only fit scores; can still manage coaches/log interactions
- **College Scorecard API key missing:** Show "College Scorecard API not configured" error
- **College Scorecard school not found:** Show "School not found in database" error
- **Distance = 0:** Show "0 miles" (school is at home location)
- **Admission rate stored as decimal (0.32):** Display as "32%" (multiply by 100)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all school data correctly
- [ ] Header shows name, location, division, status, tier, size, conference badges
- [ ] Favorite star toggles and persists
- [ ] Status picker changes status and creates history entry
- [ ] Priority tier selector updates correctly (A/B/C/None)
- [ ] Status history timeline loads and displays entries
- [ ] Fit score displays with correct tier badge and breakdown
- [ ] Division recommendations appear when fit score < 70 and applicable
- [ ] Map renders with correct school location pin
- [ ] Distance from home calculates correctly
- [ ] Information section displays all academic_info fields
- [ ] Information edit mode saves all fields
- [ ] College Scorecard lookup populates fields
- [ ] Notes edit and save works (shared notes)
- [ ] Private notes edit and save works (keyed by user)
- [ ] Add pro works (input + button + enter key)
- [ ] Remove pro works (X button)
- [ ] Add con works
- [ ] Remove con works
- [ ] Coaching philosophy displays 5 fields
- [ ] Coaching philosophy edit saves all 5 fields
- [ ] Coaches panel shows up to 3 coaches with contact buttons
- [ ] Email/SMS/Call buttons open correct native handlers
- [ ] "Log Interaction" navigates to interactions sub-page
- [ ] "Manage Coaches" navigates to coaches sub-page
- [ ] Documents section shows shared documents
- [ ] Delete school with confirmation works (simple path)
- [ ] Delete school with cascade works (FK constraint path)
- [ ] Navigation back to Schools List after delete
- [ ] Attribution section shows created by / updated by / date

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle school not found (show empty state)
- [ ] Handle save failures (keep edit mode, show error)
- [ ] Handle favorite toggle failure (revert optimistic update)
- [ ] Handle status update failure (revert to previous)
- [ ] Handle delete failure (show error alert)
- [ ] Handle College Scorecard API failure (show error banner)
- [ ] Handle missing College Scorecard API key

### Edge Case Tests

- [ ] Very long school name doesn't break header layout
- [ ] School with no academic_info hides map and related sections
- [ ] School with no coaches shows empty state
- [ ] School with no fit score hides fit section
- [ ] School with no notes shows placeholder
- [ ] Private notes isolated per user
- [ ] Many pros/cons render correctly
- [ ] Coaching philosophy with empty fields shows placeholders
- [ ] Distance calculation with missing home location omits display
- [ ] Admission rate displays as percentage (not decimal)
- [ ] Pull-to-refresh re-fetches all data
- [ ] VoiceOver reads all sections correctly
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] Scrolling smooth with all sections populated
- [ ] Map loads without blocking other content
- [ ] Logo loads asynchronously
- [ ] College Scorecard lookup completes in <3 seconds
- [ ] Fit score calculation is instant (cached after first load)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Coaching Philosophy component:** Web uses a separate `CoachingPhilosophy.vue` component with 5 textarea fields (coaching_style, recruiting_approach, communication_style, success_metrics, coaching_philosophy). iOS should implement all 5 fields.
- **Private notes structure:** Stored as `{ [userId]: "note text" }` JSON object. iOS must use the current user's ID as the key.
- **Status history:** Web creates history entries in `school_status_history` table during status update. The status update and history insert are two separate Supabase calls (not transactional).
- **College Scorecard API:** Uses a public API key stored in runtime config. Rate limited. Results are cached in-memory per session.
- **Fit score calculation:** Performed client-side using `useFitScore`. Uses 4 dimensions: athletic, academic, opportunity, personal. Requires athlete profile data for full accuracy; shows "missing dimensions" warnings when data is incomplete.
- **Division recommendations:** Only shown when `fitScore < 70`. Logic varies by current division (D1 schools get D2/D3 recommendations, etc.).
- **Document upload:** Web has a modal for uploading documents. Consider deferring this to a later iOS phase.
- **Email modal:** Web uses an `EmailSendModal` component. iOS should use native `MFMailComposeViewController`.

### iOS-Specific Considerations

- **3-column to scroll:** Web uses a 3-column layout (main content, sidebar). iOS flattens this into a single scrollable view with sections.
- **Map view:** Use MapKit `Map` with `MKPointAnnotation` instead of Leaflet (web). Only render when coordinates available.
- **Status picker:** Use native iOS `Picker` or `Menu` instead of HTML `<select>`.
- **Priority tier selector:** Implement as segmented control (A/B/C) with a "None" option.
- **Contact actions:** Use `UIApplication.shared.open(url)` for `mailto:`, `sms:`, and `tel:` URLs. Check `canOpenURL` first.
- **Coaching philosophy MVP:** Could simplify to a single text field initially, then expand to 5 fields in a subsequent iteration.
- **Document upload:** Defer to a later phase. Show documents as read-only links for MVP.
- **Notes history component:** Web has a `NotesHistory` component. Consider deferring or simplifying for iOS MVP.
- **Optimistic updates:** Implement for favorite toggle. Other edits should show loading state and confirm on success.

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/schools/[id]/index.vue`
- **Composables used:**
  - `useSchools()` - CRUD, favorites, smart delete, status update
  - `useSchoolLogos()` - Async logo fetching
  - `useFitScore()` - Fit score calculation and caching
  - `useDivisionRecommendations()` - Division recommendation logic
  - `useCollegeData()` - College Scorecard API integration
  - `useCoaches()` - Coach fetching for sidebar panel
  - `useDocumentsConsolidated()` - Document fetching
  - `usePreferenceManager()` - Home location for distance calculation
  - `useUserStore()` - Current user ID for private notes
  - `useFamilyContext()` / `useActiveFamily()` - Family unit scoping
- **Child components:**
  - `SchoolLogo` - School favicon/initials display
  - `SchoolMap` - Leaflet map with school pin
  - `SchoolStatusHistory` - Status change timeline
  - `School/CoachingPhilosophy` - 5-field coaching philosophy editor
  - `SchoolPrioritySelector` - A/B/C tier selector
  - `SchoolDocumentUploadModal` - Document upload
  - `EmailSendModal` - Email compose modal
  - `NotesHistory` - Notes change history
  - `FitScoreDisplay` - Fit score with breakdown
- **Utilities:**
  - `getCarnegieSize()` / `getSizeColorClass()` - School size categorization
  - `calculateDistance()` / `formatDistance()` - Haversine distance calculation

### API Documentation

- **Cascade delete:** `POST /api/schools/{id}/cascade-delete`
- **Fit score get:** `GET /api/schools/{id}/fit-score`
- **Fit score recalculate:** `POST /api/schools/{id}/fit-score`
- **College Scorecard:** `https://api.data.gov/ed/collegescorecard/v1/schools`

### Type Definitions

- **School model:** `/types/models.ts` (lines 59-106)
- **SchoolStatusHistory:** `/types/models.ts` (lines 108-117)
- **Coach:** `/types/models.ts` (lines 119-129)
- **AcademicInfo:** `/types/models.ts` (lines 17-28)
- **FitScoreResult:** `/types/timeline.ts` (lines 213-218)
- **DivisionRecommendation:** `/types/timeline.ts` (lines 239-243)
- **FitTier:** `/types/timeline.ts` (line 26)

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** Yes
**Notes:** This is the most complex single-page spec in the app. It combines view, edit, and external API integration into one scrollable detail view. Recommend implementing in phases: (1) header + status + favorite + basic display, (2) notes + pros/cons + coaching philosophy, (3) fit score + College Scorecard lookup + map, (4) coaches panel + contact actions + documents. The coaching philosophy could be simplified to a single text field for MVP and expanded to 5 fields later. Document upload should be deferred -- show documents as read-only for MVP.

---

## Appendix A: Editable Basic Info Structure

```swift
struct EditableBasicInfo {
  var address: String = ""
  var baseballFacilityAddress: String = ""
  var mascot: String = ""
  var undergradSize: String = ""
  var distanceFromHome: Double? = nil
  var website: String = ""
  var twitterHandle: String = ""
  var instagramHandle: String = ""

  static func from(school: School) -> EditableBasicInfo {
    EditableBasicInfo(
      address: school.academicInfo?.address ?? "",
      baseballFacilityAddress: school.academicInfo?.baseballFacilityAddress ?? "",
      mascot: school.academicInfo?.mascot ?? "",
      undergradSize: school.academicInfo?.undergradSize ?? "",
      distanceFromHome: school.academicInfo?.distanceFromHome,
      website: school.website ?? "",
      twitterHandle: school.twitterHandle ?? "",
      instagramHandle: school.instagramHandle ?? ""
    )
  }
}
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

func fitTierBadgeColor(_ tier: FitTier) -> (background: Color, text: Color) {
  switch tier {
  case .safety: return (.green.opacity(0.15), .green)
  case .match: return (.blue.opacity(0.15), .blue)
  case .reach: return (.orange.opacity(0.15), .orange)
  case .unlikely: return (.red.opacity(0.15), .red)
  }
}
```

## Appendix C: Division Recommendation Logic

```swift
func getRecommendedDivisions(
  currentDivision: String?,
  fitScore: Double?
) -> DivisionRecommendation {
  guard let division = currentDivision?.uppercased(),
        let score = fitScore else {
    return DivisionRecommendation(
      shouldConsiderOtherDivisions: false,
      recommendedDivisions: [],
      message: ""
    )
  }

  // High fit scores need no recommendations
  if score >= 70 {
    return DivisionRecommendation(
      shouldConsiderOtherDivisions: false,
      recommendedDivisions: [],
      message: ""
    )
  }

  // Low fit scores (<50) - strong recommendation
  if score < 50 {
    switch division {
    case "D1":
      return DivisionRecommendation(
        shouldConsiderOtherDivisions: true,
        recommendedDivisions: ["D2", "D3"],
        message: "Based on your current profile, you might have stronger opportunities at D2 or D3 programs."
      )
    case "D2":
      return DivisionRecommendation(
        shouldConsiderOtherDivisions: true,
        recommendedDivisions: ["D3", "NAIA"],
        message: "Based on your current profile, you might have stronger opportunities at D3 or NAIA programs."
      )
    case "D3":
      return DivisionRecommendation(
        shouldConsiderOtherDivisions: true,
        recommendedDivisions: ["NAIA"],
        message: "Consider also exploring NAIA programs which may be a better fit."
      )
    default:
      return DivisionRecommendation(
        shouldConsiderOtherDivisions: false,
        recommendedDivisions: [],
        message: ""
      )
    }
  }

  // Moderate fit scores (50-69) - soft recommendation
  switch division {
  case "D1":
    return DivisionRecommendation(
      shouldConsiderOtherDivisions: true,
      recommendedDivisions: ["D2"],
      message: "While this is a solid reach school, consider adding D2 programs for more realistic opportunities."
    )
  case "D2":
    return DivisionRecommendation(
      shouldConsiderOtherDivisions: true,
      recommendedDivisions: ["D3"],
      message: "While this is a solid reach school, consider adding D3 programs for more realistic opportunities."
    )
  default:
    return DivisionRecommendation(
      shouldConsiderOtherDivisions: false,
      recommendedDivisions: [],
      message: ""
    )
  }
}
```

## Appendix D: Status Badge Color Mapping

```swift
func statusBadgeColors(_ status: SchoolStatus) -> (background: Color, text: Color) {
  switch status {
  case .interested:
    return (Color.blue.opacity(0.15), .blue)
  case .contacted:
    return (Color.gray.opacity(0.15), Color(white: 0.4))
  case .campInvite:
    return (Color.purple.opacity(0.15), .purple)
  case .recruited:
    return (Color.green.opacity(0.15), .green)
  case .officialVisitInvited:
    return (Color.yellow.opacity(0.3), Color(red: 0.7, green: 0.5, blue: 0.0))
  case .officialVisitScheduled:
    return (Color.orange.opacity(0.15), .orange)
  case .offerReceived:
    return (Color.red.opacity(0.15), .red)
  case .committed:
    return (Color(red: 0.13, green: 0.50, blue: 0.13), .white)
  case .notPursuing:
    return (Color.gray.opacity(0.3), Color(white: 0.4))
  }
}
```

## Appendix E: College Scorecard Integration

```swift
func lookupCollegeData(schoolName: String) async throws -> CollegeDataResult? {
  guard schoolName.count >= 3 else {
    throw CollegeDataError.nameTooShort
  }

  guard let apiKey = AppConfig.collegeScorecardApiKey, !apiKey.isEmpty else {
    throw CollegeDataError.apiKeyMissing
  }

  var components = URLComponents(
    string: "https://api.data.gov/ed/collegescorecard/v1/schools"
  )!
  components.queryItems = [
    URLQueryItem(name: "api_key", value: apiKey),
    URLQueryItem(name: "school.name", value: schoolName),
    URLQueryItem(name: "fields", value: [
      "id", "school.name", "school.city", "school.state",
      "school.school_url", "location.lat", "location.lon",
      "latest.admissions.admission_rate.overall",
      "latest.student.size", "latest.cost.tuition.in_state",
      "latest.cost.tuition.out_of_state"
    ].joined(separator: ",")),
    URLQueryItem(name: "per_page", value: "1"),
  ]

  let (data, response) = try await URLSession.shared.data(from: components.url!)

  guard let httpResponse = response as? HTTPURLResponse else {
    throw CollegeDataError.invalidResponse
  }

  switch httpResponse.statusCode {
  case 200: break
  case 401: throw CollegeDataError.invalidApiKey
  case 429: throw CollegeDataError.rateLimited
  default: throw CollegeDataError.serverError(httpResponse.statusCode)
  }

  let decoded = try JSONDecoder().decode(CollegeScorecardAPIResponse.self, from: data)

  guard let first = decoded.results.first else {
    throw CollegeDataError.schoolNotFound
  }

  return CollegeDataResult(
    id: String(first.id),
    name: first.schoolName,
    website: first.schoolUrl,
    address: [first.city, first.state].compactMap { $0 }.joined(separator: ", "),
    city: first.city,
    state: first.state,
    studentSize: first.studentSize,
    carnegieSize: nil,
    admissionRate: first.admissionRate,
    tuitionInState: first.tuitionInState,
    tuitionOutOfState: first.tuitionOutOfState,
    latitude: first.latitude,
    longitude: first.longitude
  )
}

enum CollegeDataError: LocalizedError {
  case nameTooShort
  case apiKeyMissing
  case invalidApiKey
  case rateLimited
  case schoolNotFound
  case invalidResponse
  case serverError(Int)

  var errorDescription: String? {
    switch self {
    case .nameTooShort: return "School name must be at least 3 characters"
    case .apiKeyMissing: return "College Scorecard API not configured"
    case .invalidApiKey: return "College Scorecard API key is invalid"
    case .rateLimited: return "Too many requests to College Scorecard API"
    case .schoolNotFound: return "School not found in College Scorecard database"
    case .invalidResponse: return "Invalid response from College Scorecard API"
    case .serverError(let code): return "Server error (\(code))"
    }
  }
}
```
