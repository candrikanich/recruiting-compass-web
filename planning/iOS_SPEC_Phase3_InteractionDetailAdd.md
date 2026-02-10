# iOS Page Specification: Interaction Detail & Add Interaction

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Interaction Detail & Add Interaction
**Web Route:** `/interactions/add` and `/interactions/[id]`
**Priority:** MVP / Phase 3 (High - Core Feature)
**Complexity:** Medium
**Estimated Time:** 3 days

---

## 1. Overview

### Purpose

These two pages form the write and read sides of the interaction logging system. **Add Interaction** lets an athlete log a new communication (email, phone call, text, campus visit, DM, etc.) with a school or coach, including optional sentiment tracking, interest calibration, and file attachments. **Interaction Detail** displays the full record of a single interaction with its metadata, linked entities (school, coach, event), attachments, and provides export and delete actions. Together they complete the interaction CRUD lifecycle started by the Interactions List (Phase 2).

### Key User Actions

**Add Interaction:**

- Select a school (required) and optionally a coach
- Choose interaction type, direction, date/time
- Add subject, content, sentiment
- Complete interest calibration (conditional on inbound + positive)
- Attach files (images, PDFs, documents)
- Add a new coach inline if not listed
- Submit to create the interaction record

**Interaction Detail:**

- View full interaction record with all metadata
- See linked school, coach, and event as tappable links
- View and open file attachments
- Export interaction data via share sheet
- Delete interaction with confirmation
- Navigate back to interactions list

### Success Criteria

- Athletes can log an interaction with all required fields and have it persist in the database
- Validation prevents submission of invalid data (missing required fields, oversized content)
- Interest calibration correctly computes and appends interest level to inbound positive interactions
- New coaches can be created inline without leaving the form
- Detail page loads and displays all interaction fields including attachments
- Export generates shareable content via native iOS share sheet
- Delete removes the interaction and navigates back to the list
- Parents see detail pages in read-only mode (no create/delete actions)

---

## 2. User Flows

### Primary Flow: Add Interaction (Athlete)

```
1. User taps "Log Interaction" from Interactions List
2. System loads schools list and all coaches for the family
3. Form displays with default: direction=outbound, date/time=now
4. User selects a school (required)
5. Coach dropdown populates with coaches at selected school
6. User selects interaction type (required)
7. User selects direction (outbound/inbound)
8. User optionally fills subject, content, sentiment
9. If direction=inbound AND sentiment=positive/very_positive:
   - Interest calibration section appears
   - User answers 6 yes/no questions
   - Interest level auto-computes and displays
10. User optionally attaches files
11. User taps "Log Interaction"
12. System validates with Zod schema
13. System uploads attachments to Supabase Storage (if any)
14. System creates interaction record
15. System creates inbound alert notification (if inbound)
16. System navigates to /interactions list
```

### Alternative Flow: Add New Coach Inline

```
1. User selects a school
2. User opens coach dropdown
3. User selects "+ Add new coach"
4. System presents a pushed view with fields: First Name, Last Name, Role
5. User fills in coach details and taps "Save Coach"
6. System creates coach via Supabase
7. New coach auto-selected in dropdown
8. User continues with form
```

### Alternative Flow: Other Coach (Not Listed)

```
1. User selects "Other coach (not listed)" from coach dropdown
2. System presents a pushed view with a single text field
3. User enters coach name and taps "Continue"
4. Coach name stored as metadata (coach_id remains null)
5. User continues with form
```

### Primary Flow: View Interaction Detail

```
1. User taps an interaction card from the list
2. System fetches interaction by ID from Supabase
3. System fetches related school, coach, event data
4. System fetches logged-by user name
5. Detail page displays: header, badges, content, details grid, attachments
6. User can tap school/coach links to navigate to those detail pages
7. User can tap attachments to open/download
8. User can export via share sheet or delete
```

### Alternative Flow: Parent Views Detail (Read-Only)

```
1. Parent taps an interaction card
2. Detail page loads identical layout
3. Export and Delete buttons are hidden
4. All content is read-only
```

### Error Scenarios

```
Error: Required field missing on submit
- User sees: Inline validation errors below the relevant field
- Recovery: Fill in the missing field and resubmit

Error: File too large (>10MB)
- User sees: Alert with "File exceeds 10MB limit"
- Recovery: Choose a smaller file

Error: Interaction not found (detail page)
- User sees: "Interaction not found" message
- Recovery: Navigate back to interactions list

Error: Network failure during submission
- User sees: Error banner at top of form
- Recovery: Retry submission (form data preserved)

Error: Non-player tries to create interaction
- User sees: API rejects with "Only players can create interactions"
- Recovery: N/A (parents cannot access the add page)
```

---

## 3. Data Models

### Interaction Model

```swift
struct Interaction: Identifiable, Codable {
  let id: String
  let schoolId: String?
  let coachId: String?
  let eventId: String?
  let type: InteractionType
  let direction: Direction
  let subject: String?
  let content: String?
  let sentiment: Sentiment?
  let occurredAt: Date
  let loggedBy: String
  let familyUnitId: String
  let attachments: [String]?
  let createdAt: Date?
  let updatedAt: Date?

  var displayDate: Date {
    occurredAt
  }

  var displaySubject: String {
    subject ?? type.displayName
  }

  var hasAttachments: Bool {
    !(attachments ?? []).isEmpty
  }

  var attachmentCount: Int {
    (attachments ?? []).count
  }

  enum CodingKeys: String, CodingKey {
    case id
    case schoolId = "school_id"
    case coachId = "coach_id"
    case eventId = "event_id"
    case type, direction, subject, content, sentiment
    case occurredAt = "occurred_at"
    case loggedBy = "logged_by"
    case familyUnitId = "family_unit_id"
    case attachments
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }
}
```

### Shared Enums (from Phase 2)

```swift
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

  var iconName: String {
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

  var subtitle: String {
    switch self {
    case .outbound: return "We initiated"
    case .inbound: return "They initiated"
    }
  }

  var badgeColor: Color {
    switch self {
    case .outbound: return .purple
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

  var isPositive: Bool {
    self == .veryPositive || self == .positive
  }
}
```

### Form State Model (Add Interaction)

```swift
struct InteractionFormState {
  var schoolId: String = ""
  var coachId: String? = nil
  var type: InteractionType? = nil
  var direction: Direction = .outbound
  var occurredAt: Date = Date()
  var subject: String = ""
  var content: String = ""
  var sentiment: Sentiment? = nil
  var interestLevel: InterestLevel = .notSet
  var attachedFiles: [AttachmentFile] = []

  var isValid: Bool {
    !schoolId.isEmpty && type != nil && direction != nil
  }

  var showsInterestCalibration: Bool {
    direction == .inbound && sentiment?.isPositive == true
  }
}

struct AttachmentFile: Identifiable {
  let id = UUID()
  let fileName: String
  let fileSize: Int64
  let mimeType: String
  let data: Data

  var fileSizeMB: Double {
    Double(fileSize) / (1024 * 1024)
  }

  var isOverSizeLimit: Bool {
    fileSizeMB > 10.0
  }

  var fileIcon: String {
    if mimeType.hasPrefix("image/") { return "photo" }
    if mimeType.contains("pdf") { return "doc.richtext" }
    if mimeType.contains("word") || mimeType.contains("document") { return "doc.text" }
    return "paperclip"
  }
}
```

### Interest Calibration Model

```swift
struct InterestCalibration {
  static let questions: [String] = [
    "Did they ask about your schedule or upcoming events?",
    "Did they mention visiting campus or suggest a visit?",
    "Did they ask about your academic interests or major?",
    "Did they provide their direct contact info (phone/email)?",
    "Did they mention roster needs at your position?",
    "Was this a personalized response (not a form letter)?"
  ]

  var answers: [Bool] = Array(repeating: false, count: 6)

  var yesCount: Int {
    answers.filter { $0 }.count
  }

  var interestLevel: InterestLevel {
    switch yesCount {
    case 0: return .notSet
    case 1: return .low
    case 2...3: return .medium
    default: return .high
    }
  }

  var resultDescription: String {
    switch interestLevel {
    case .notSet:
      return "Answer questions to see coach interest level"
    case .low:
      return "Limited signals detected. Consider diversifying your target list."
    case .medium:
      return "Coach seems interested but check for personalization. Stay in touch regularly."
    case .high:
      return "Coach showing strong signals of genuine interest. Follow up promptly."
    }
  }
}

enum InterestLevel: String, Codable {
  case high
  case medium
  case low
  case notSet = "not_set"

  var displayName: String {
    switch self {
    case .high: return "High Interest"
    case .medium: return "Medium Interest"
    case .low: return "Low Interest"
    case .notSet: return "Not Set"
    }
  }

  var emoji: String {
    switch self {
    case .high: return "\u{1F525}"     // fire
    case .medium: return "\u{26A1}"    // lightning
    case .low: return "\u{2744}\u{FE0F}" // snowflake
    case .notSet: return "—"
    }
  }

  var color: Color {
    switch self {
    case .high: return .green
    case .medium: return .orange
    case .low: return .gray
    case .notSet: return .gray
    }
  }
}
```

### New Coach Form Model

```swift
struct NewCoachFormState {
  var firstName: String = ""
  var lastName: String = ""
  var role: CoachRole = .assistant

  var isValid: Bool {
    !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
    !lastName.trimmingCharacters(in: .whitespaces).isEmpty
  }
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

### Data Origin

- **Source:** Supabase `interactions` table, with joins to `schools`, `coaches`, `events`, `users`
- **Athletes:** Can create, view, and delete their own interactions
- **Parents:** Can only view interactions in their accessible families (read-only)
- **Attachments:** Supabase Storage bucket `interaction-attachments`
- **Refresh:** Single fetch on page load (detail), on-demand after create (add)
- **Caching:** None (always re-fetch for detail page)

---

## 4. API Integration

### Supabase Queries

#### Fetch Single Interaction (Detail)

```
supabase.from("interactions")
  .select("*")
  .eq("id", interactionId)
  .single()
```

#### Fetch Logged-By User Name (Detail)

```
supabase.from("users")
  .select("id, full_name")
  .eq("id", interaction.loggedBy)
  .single()
```

#### Fetch Schools (Add Form)

```
supabase.from("schools")
  .select("id, name")
  .eq("family_unit_id", activeFamilyId)
  .order("name", ascending: true)
```

#### Fetch Coaches (Add Form)

```
supabase.from("coaches")
  .select("id, first_name, last_name, role, school_id")
  .eq("family_unit_id", activeFamilyId)
```

#### Create Interaction

```
supabase.from("interactions")
  .insert([{
    school_id: schoolId,
    coach_id: coachId,
    type: type,
    direction: direction,
    occurred_at: occurredAtISO,
    subject: sanitized(subject),
    content: sanitized(content),
    sentiment: sentiment,
    logged_by: currentUserId,
    family_unit_id: activeFamilyId,
    attachments: []
  }])
  .select()
  .single()
```

#### Upload Attachments

```
// For each file:
supabase.storage
  .from("interaction-attachments")
  .upload("interactions/{interactionId}/{filename}", fileData)

// Then update interaction record:
supabase.from("interactions")
  .update({ attachments: uploadedPaths })
  .eq("id", interactionId)
```

#### Create Coach Inline

```
supabase.from("coaches")
  .insert([{
    school_id: selectedSchoolId,
    first_name: firstName,
    last_name: lastName,
    role: role,
    family_unit_id: activeFamilyId
  }])
  .select()
  .single()
```

#### Delete Interaction (Simple)

```
supabase.from("interactions")
  .delete()
  .eq("id", interactionId)
  .eq("family_unit_id", activeFamilyId)
  .eq("logged_by", currentUserId)
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

### Endpoint: Create Inbound Alert

Not a separate endpoint. The web composable creates a notification record in the `notifications` table when `direction == "inbound"` and user has alerts enabled. iOS should replicate this logic client-side or defer to a server function.

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Role Enforcement:** Only `player` role can create interactions (enforced at DB level and client-side)

---

## 5. State Management

### Add Interaction Page State

```swift
@State var formState = InteractionFormState()
@State var calibration = InterestCalibration()
@State var schools: [School] = []
@State var allCoaches: [Coach] = []
@State var isLoading = false
@State var isSubmitting = false
@State var error: String? = nil
@State var validationErrors: [String: String] = [:]
@State var showAddCoachSheet = false
@State var showOtherCoachSheet = false
@State var newCoachForm = NewCoachFormState()
@State var otherCoachName: String = ""
```

### Add Interaction Computed Properties

```swift
var schoolCoaches: [Coach] {
  guard !formState.schoolId.isEmpty else { return [] }
  return allCoaches.filter { $0.schoolId == formState.schoolId }
}

var canSubmit: Bool {
  formState.isValid && !isSubmitting
}

var pageTitle: String {
  authManager.user?.role == .player ? "Log My Interaction" : "Log Interaction"
}
```

### Interaction Detail Page State

```swift
@State var interaction: Interaction? = nil
@State var school: School? = nil
@State var coach: Coach? = nil
@State var event: Event? = nil
@State var loggedByName: String = "Unknown"
@State var isLoading = false
@State var error: String? = nil
@State var showDeleteConfirmation = false
@State var isDeleting = false
```

### Detail Page Computed Properties

```swift
var isOwner: Bool {
  interaction?.loggedBy == authManager.user?.id
}

var isParent: Bool {
  authManager.user?.role == .parent
}

var canDelete: Bool {
  isOwner && !isParent
}

var canExport: Bool {
  interaction != nil
}

var formattedDate: String {
  guard let date = interaction?.occurredAt else { return "Unknown" }
  let formatter = DateFormatter()
  formatter.dateStyle = .medium
  formatter.timeStyle = .short
  return formatter.string(from: date)
}

var loggedByDisplay: String {
  if interaction?.loggedBy == authManager.user?.id {
    return "You"
  }
  return loggedByName
}
```

### Shared State

- **FamilyManager:** `activeFamilyId`, `getDataOwnerUserId()`
- **AuthManager:** Current user, role, authentication status

---

## 6. UI/UX Details

### Add Interaction Layout Structure

```
[Navigation Bar]
  - Title: "Log My Interaction" (athlete) / "Log Interaction" (parent)
  - Left: Back button
  - Subtitle: "Record a new communication with a school or coach"

[Error Banner] (if validation errors)
  - Dismissible error summary

[Form - ScrollView]
  [School Picker] *
    - Picker with all user's schools

  [Coach Picker] (optional)
    - Populated by selected school's coaches
    - Extra options: "Other coach (not listed)", "+ Add new coach"
    - Disabled until school selected

  [Type Picker] *
    - All InteractionType cases with icons

  [Direction Segment] *
    - Segmented control: Outbound | Inbound
    - Subtitles: "We initiated" | "They initiated"

  [Date & Time Picker] *
    - Default: current date/time
    - Native DatePicker

  [Subject Text Field] (optional)
    - Placeholder: "Email subject, call topic, etc."
    - Max 500 characters

  [Content Text Editor] (optional)
    - Multiline TextEditor
    - Placeholder: "Details about the interaction..."
    - Max 10,000 characters

  [Sentiment Picker] (optional)
    - Options: Very Positive, Positive, Neutral, Negative

  [Interest Calibration Section] (conditional)
    - Visible ONLY when direction=inbound AND sentiment in [positive, very_positive]
    - 6 toggle switch questions
    - Result card: emoji + level + description

  [Attachments Section] (optional, defer for MVP)
    - "Add Files" button → iOS document picker
    - List of selected files with remove buttons
    - Accepted: images, PDF, DOC, DOCX, TXT
    - Max 10MB per file

[Action Buttons]
  - Primary: "Log Interaction" (blue gradient)
  - Secondary: "Cancel" (outline)
```

### Interaction Detail Layout Structure

```
[Navigation Bar]
  - Left: Back button
  - Right: [Share] [Delete] (athletes only)

[Header Section]
  - Subject (large, bold) or type name fallback
  - Formatted date/time

[Status Badges Row]
  - [Type Badge] (blue) with icon
  - [Direction Badge] (green=inbound, purple=outbound)
  - [Sentiment Badge] (color-coded) — if present

[Content Card]
  - "Content" header
  - Full text, whitespace preserved

[Details Grid] (2×2)
  ┌─────────────┬─────────────┐
  │   School    │    Coach    │
  │  Tappable   │  Tappable   │
  │  link or —  │  link or —  │
  ├─────────────┼─────────────┤
  │   Event     │  Logged By  │
  │  Tappable   │  "You" or   │
  │  link or —  │  full name  │
  └─────────────┴─────────────┘

[Attachments Card] (conditional)
  - "Attachments (N)" header
  - Grid of file links with type icons
  - Tappable to open/download

[Metadata Footer]
  - "Created: [date]"
```

### Type Picker Display

Each type shows an icon and label. For iOS, use a `Picker` or a custom scrollable grid:

| Type            | SF Symbol          | Label           |
| --------------- | ------------------ | --------------- |
| Email           | `envelope.fill`    | Email           |
| Text            | `bubble.left.fill` | Text            |
| Phone Call      | `phone.fill`       | Phone Call      |
| In-Person Visit | `person.2.fill`    | In-Person Visit |
| Virtual Meeting | `video.fill`       | Virtual Meeting |
| Camp            | `figure.run`       | Camp            |
| Showcase        | `star.fill`        | Showcase        |
| Tweet           | `bubble.left.fill` | Tweet           |
| Direct Message  | `paperplane.fill`  | Direct Message  |

### Direction Segmented Control

Use a native `Picker` with `.segmented` style:

- **Outbound:** Label "Outbound", subtitle "We initiated"
- **Inbound:** Label "Inbound", subtitle "They initiated"

### Sentiment Badge Colors (Detail Page)

| Sentiment     | Background    | Text Color |
| ------------- | ------------- | ---------- |
| Very Positive | Green-100     | Green-800  |
| Positive      | Lime/Blue-100 | Blue-800   |
| Neutral       | Gray-100      | Gray-800   |
| Negative      | Red-100       | Red-800    |

### Interest Calibration Section (Add Page)

```
┌──────────────────────────────────────────────┐
│  Coach Interest Level                        │
│  Answer these questions to gauge the coach's │
│  level of interest based on their response.  │
│                                              │
│  [Toggle] Did they ask about your schedule   │
│           or upcoming events?                │
│  [Toggle] Did they mention visiting campus   │
│           or suggest a visit?                │
│  [Toggle] Did they ask about your academic   │
│           interests or major?                │
│  [Toggle] Did they provide their direct      │
│           contact info (phone/email)?        │
│  [Toggle] Did they mention roster needs at   │
│           your position?                     │
│  [Toggle] Was this a personalized response   │
│           (not a form letter)?               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔥 High Interest                      │  │
│  │ Coach showing strong signals of        │  │
│  │ genuine interest. Follow up promptly.  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

Result card color-coding:

- **High (4+ yes):** Green background, green text, fire emoji
- **Medium (2-3 yes):** Amber background, amber text, lightning emoji
- **Low (1 yes):** Gray background, gray text, snowflake emoji
- **Not Set (0 yes):** Gray background, gray text, dash

### Attachment File Icons (Detail Page)

| File Type    | SF Symbol       | Fallback Label |
| ------------ | --------------- | -------------- |
| PDF          | `doc.richtext`  | PDF            |
| Word (DOC/X) | `doc.text`      | Document       |
| Image        | `photo`         | Image          |
| Text         | `doc.plaintext` | Text           |
| Other        | `paperclip`     | File           |

Filename display: Truncate to 20 characters with ellipsis.

### Loading States

```
Add Page Initial Load:
- Skeleton pickers while schools/coaches load
- Form becomes interactive once data loaded

Submission Loading:
- "Log Interaction" button shows spinner + "Logging..."
- All form fields disabled during submission
- Cancel button hidden during submission

Detail Page Loading:
- Full-screen spinner with "Loading interaction..."
- Show only when interaction is nil AND isLoading

Delete Loading:
- Delete button shows spinner
- Confirmation dialog dismissed
```

### Empty States

**Detail Page - Interaction Not Found:**

- Icon: `exclamationmark.triangle` (large, amber)
- Title: "Interaction not found"
- Subtitle: "This interaction may have been deleted"
- CTA: "Back to Interactions" button

### Accessibility

- **VoiceOver (Add):** Form fields announce label + required status. Calibration toggles announce question text + current state.
- **VoiceOver (Detail):** Badges announce "{type} interaction, {direction}, sentiment: {sentiment}". Details grid announces "{label}: {value}" for each cell.
- **Touch Targets:** All buttons, toggles, and pickers at least 44pt
- **Dynamic Type:** All text supports scaling
- **Keyboard Avoidance:** Form scrolls to keep active field visible above keyboard

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (data queries + auth + storage)
- UniformTypeIdentifiers (for document picker file types)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (interactions, schools, coaches, events, users tables)
- Supabase Auth (session management, role verification)
- Supabase Storage (attachment file uploads/downloads)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout on submit:** Show "Connection timed out" + preserve form data + allow retry
- **Timeout on detail load:** Show "Connection timed out" + pull-to-refresh
- **No internet:** Show offline indicator; disable submit button
- **Server error (5xx):** Show "Server error" + retry button

### Validation Errors

- **Missing school_id:** Inline error "Please select a school"
- **Missing type:** Inline error "Please select a type"
- **Subject too long (>500):** Inline character count + error at limit
- **Content too long (>10,000):** Inline character count + error at limit
- **File too large (>10MB):** Alert dialog with file name and size
- **Invalid file type:** Alert dialog with accepted types list
- **Zod validation failure:** Map Zod errors to field-level inline messages

### Data Errors

- **Null subject (detail):** Display interaction type name as fallback
- **Null content (detail):** Hide content section entirely
- **Null sentiment (detail):** Hide sentiment badge
- **Null school_id (detail):** Show dash in school cell
- **Null coach_id (detail):** Show dash in coach cell
- **Null event_id (detail):** Show dash in event cell
- **Unknown logged_by user:** Display "Unknown"
- **Empty attachments array:** Hide attachments section
- **Deleted school/coach reference:** Show "Unknown School" / "Unknown Coach"

### User Errors

- **Parent tries to access add page:** Redirect to interactions list (role check)
- **Double-tap submit:** Disable button on first tap; prevent duplicate creation
- **Cancel with unsaved changes:** Show "Discard changes?" confirmation dialog

### Edge Cases

- **School with no coaches:** Coach picker shows "No coaches found" + "+ Add new coach" option
- **Very long subject on detail:** Wrap text, no truncation on detail page
- **Very long content on detail:** Full display with scroll
- **Attachment filename with special characters:** URL-encode for storage path
- **Timezone handling:** Form date picker uses local timezone; convert to UTC ISO on submit; display in local timezone on detail
- **Interest calibration appends to content:** Only appends `[Coach Interest Level: HIGH]` on submit, not on toggle change
- **School selection change resets coach:** When school changes, clear coach_id and refresh coach list
- **Rapid navigation away after submit:** Ensure async operations complete before navigating

---

## 9. Testing Checklist

### Happy Path Tests - Add Interaction

- [ ] Form loads with default values (direction=outbound, date=now)
- [ ] Schools list populates from Supabase
- [ ] Selecting a school populates coach dropdown
- [ ] All interaction type options display correctly
- [ ] Direction toggle switches between outbound and inbound
- [ ] Date picker allows selection and defaults to now
- [ ] Subject field accepts text and enforces 500 char limit
- [ ] Content field accepts multiline text and enforces 10,000 char limit
- [ ] Sentiment picker shows all options
- [ ] Form submits successfully with valid required fields only
- [ ] Form submits successfully with all fields filled
- [ ] After submission, navigates to interactions list
- [ ] Created interaction appears in list on return

### Happy Path Tests - Interest Calibration

- [ ] Calibration section hidden when direction=outbound
- [ ] Calibration section hidden when sentiment=neutral or negative
- [ ] Calibration section appears when direction=inbound AND sentiment=positive
- [ ] Calibration section appears when direction=inbound AND sentiment=very_positive
- [ ] Toggle switches update yes count
- [ ] 0 yes = "Not Set", 1 yes = "Low", 2-3 yes = "Medium", 4+ yes = "High"
- [ ] Result card shows correct emoji, label, and description
- [ ] Interest level appended to content on submit

### Happy Path Tests - Coach Selection

- [ ] "Other coach (not listed)" opens text input sheet
- [ ] "+ Add new coach" opens coach creation sheet
- [ ] New coach saves to Supabase and auto-selects
- [ ] Other coach name captured, coach_id stays null
- [ ] Changing school clears selected coach

### Happy Path Tests - Interaction Detail

- [ ] Detail page loads and displays all interaction fields
- [ ] Subject displays (or type fallback for null subject)
- [ ] Type badge displays with correct color
- [ ] Direction badge displays green (inbound) or purple (outbound)
- [ ] Sentiment badge displays with correct color (when present)
- [ ] Content section shows full text with preserved whitespace
- [ ] School name is tappable and navigates to school detail
- [ ] Coach name is tappable and navigates to coach detail
- [ ] "Logged By" shows "You" for own interactions
- [ ] "Logged By" shows full name for others' interactions
- [ ] Attachments section shows when attachments exist
- [ ] Attachment links open files
- [ ] Export generates share sheet content
- [ ] Delete shows confirmation dialog
- [ ] Confirming delete removes interaction and navigates back

### Error Tests

- [ ] Submit with missing school shows validation error
- [ ] Submit with missing type shows validation error
- [ ] Handle network timeout on submit (preserve form data)
- [ ] Handle network timeout on detail load
- [ ] Handle 401 (redirect to login)
- [ ] Handle interaction not found (detail)
- [ ] Handle deleted school/coach references gracefully

### Role-Based Tests

- [ ] Athletes see "Log My Interaction" title
- [ ] Athletes see export and delete buttons on detail
- [ ] Parents cannot access add interaction page
- [ ] Parents see detail page in read-only mode (no export/delete)
- [ ] Non-player role prevented from creating via API

### Edge Case Tests

- [ ] Subject at exactly 500 characters
- [ ] Content at exactly 10,000 characters
- [ ] School with zero coaches shows appropriate state
- [ ] Calibration disappears when direction changes back to outbound
- [ ] Calibration disappears when sentiment changes to neutral
- [ ] Cancel with unsaved changes shows confirmation
- [ ] Double-tap submit does not create duplicate
- [ ] VoiceOver navigates all form elements correctly
- [ ] Dynamic Type scaling on both pages
- [ ] Page adapts to different device sizes (iPhone SE to Pro Max)

### Performance Tests

- [ ] Add form loads in <2 seconds on 4G
- [ ] Detail page loads in <2 seconds on 4G
- [ ] Form submission completes in <3 seconds (without attachments)
- [ ] No memory leaks when navigating between list and detail repeatedly

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Attachment uploads:** Web uses drag-and-drop + file input. iOS should use native `UIDocumentPickerViewController` or `.fileImporter` modifier. For MVP, consider deferring attachments to Phase 4.
- **Interest calibration exposed via ref:** Web parent component accesses calibration state via `defineExpose`. iOS should use `@Binding` or `@ObservableObject` pattern instead.
- **Export as CSV:** Web generates a CSV blob and triggers download. iOS should use native share sheet (`UIActivityViewController`) with the same data formatted as plain text or CSV.
- **Other coach name:** Web stores the name in memory but does not persist it. The `coach_id` stays null. Consider appending the name to the interaction content or a separate field.
- **Content modification on submit:** Interest calibration appends `[Coach Interest Level: HIGH]` to the content field during submission. This is content mutation, not a separate field. iOS should replicate this behavior.
- **No edit flow:** Neither web page has an edit mode. Interactions are create-once, read, delete only. No update UI exists.
- **Event field:** The detail page shows an event cell in the details grid, but the add form does not include event selection. Events are linked separately.

### iOS-Specific Considerations

- **Date picker:** Use native `DatePicker` with `.dateAndTime` display. Convert to UTC ISO string on submit using `ISO8601DateFormatter`.
- **Keyboard management:** Use `.scrollDismissesKeyboard(.interactively)` on the form ScrollView. Add toolbar "Done" button for text fields.
- **Coach creation sheet:** Use `.sheet` or `NavigationLink` push instead of web modal. Pass new coach back via closure.
- **File picker:** Use `.fileImporter(isPresented:allowedContentTypes:)` with `[.pdf, .jpeg, .png, .gif, .plainText]` and Word UTTypes.
- **Share sheet:** Use `ShareLink` (iOS 16+) or `UIActivityViewController` wrapper for export.
- **Form preservation:** If user navigates to add coach and back, form state must be preserved. Use `@StateObject` for the ViewModel.
- **Haptic feedback:** Add haptic feedback on successful submission and on delete confirmation.

### Access Control Rules

- **Only `player` role can create interactions** (enforced at database level via RLS)
- **Parents see read-only detail** (hide create/delete actions)
- **Family-scoped access:** All queries filter by `family_unit_id`
- **Delete requires ownership:** `logged_by == currentUserId` check

### Validation Schema (Matches Web Zod Schema)

| Field         | Rule                                       | Error Message                               |
| ------------- | ------------------------------------------ | ------------------------------------------- |
| `school_id`   | Required, valid UUID                       | "Please select a school"                    |
| `coach_id`    | Optional, valid UUID if provided           | "Invalid coach selection"                   |
| `type`        | Required, valid enum value                 | "Please select an interaction type"         |
| `direction`   | Required, "outbound" or "inbound"          | "Please select a direction"                 |
| `occurred_at` | Required, valid ISO datetime               | "Please select a date and time"             |
| `subject`     | Optional, max 500 chars, HTML sanitized    | "Subject must be 500 characters or less"    |
| `content`     | Optional, max 10,000 chars, HTML sanitized | "Content must be 10,000 characters or less" |
| `sentiment`   | Optional, valid enum if provided           | "Invalid sentiment value"                   |
| `event_id`    | Optional, valid UUID if provided           | "Invalid event selection"                   |

Additional refinement: Must have either `school_id` or `coach_id` (at least one).

---

## 11. Links & References

### Web Implementation

- **Add Interaction page:** `/pages/interactions/add.vue`
- **Interaction Detail page:** `/pages/interactions/[id].vue`
- **Interest Calibration component:** `/components/Interaction/InterestCalibration.vue`
- **Composables used:**
  - `useInteractions()` - CRUD, validation, attachments, reminders
  - `useSchools()` - School list for form picker
  - `useCoaches()` - Coach list for form picker, inline coach creation
  - `useEvents()` - Event lookup for detail page
  - `useFormValidation()` - Field-level validation state
  - `useUserStore()` - Role check, current user
  - `useFamilyContext()` - Family unit scoping
- **Validation schema:** `/utils/validation/schemas.ts` → `interactionSchema`
- **Attachment utilities:** `/utils/interactions/attachments.ts`
- **Inbound alert utility:** `/utils/interactions/inboundAlerts.ts`
- **Export utility:** `/utils/interactions/exportCSV.ts`

### API Documentation

- **Cascade delete:** `POST /api/interactions/{id}/cascade-delete`
- **School/Coach/Event lookup:** Direct Supabase queries
- **Attachment storage:** Supabase Storage bucket `interaction-attachments`

### Related iOS Specs

- **Phase 2 - Interactions List:** `planning/iOS_SPEC_Phase2_InteractionsList.md` (shared data models, enums)

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** This spec covers both the Add and Detail pages since they share the same data model and form the complete read/write lifecycle. Reuse the `Interaction`, `InteractionType`, `Direction`, and `Sentiment` models from Phase 2. The interest calibration is the most unique iOS adaptation — use native Toggle switches instead of web checkboxes for a better mobile experience. For MVP, consider deferring file attachments to Phase 4 to reduce scope; the core form and detail views are high-value without them. The inline "Add Coach" flow should push a new view rather than present a modal to feel more native on iOS.

---

## Appendix A: Add Interaction Submission Logic

```swift
func submitInteraction() async {
  guard formState.isValid else {
    highlightValidationErrors()
    return
  }

  isSubmitting = true
  error = nil

  do {
    // Build final content with interest level if calibrated
    var finalContent = formState.content
    if formState.showsInterestCalibration &&
       calibration.interestLevel != .notSet {
      let calibrationNote = "\n\n[Coach Interest Level: \(calibration.interestLevel.rawValue.uppercased())]"
      finalContent = (finalContent.isEmpty ? "" : finalContent) + calibrationNote
    }

    // Convert local date to UTC ISO string
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let utcDatetime = isoFormatter.string(from: formState.occurredAt)

    // Sanitize text fields
    let sanitizedSubject = formState.subject.isEmpty ? nil : sanitizeHTML(formState.subject)
    let sanitizedContent = finalContent.isEmpty ? nil : sanitizeHTML(finalContent)

    // Create interaction via Supabase
    let response = try await supabase.from("interactions")
      .insert([
        "school_id": formState.schoolId,
        "coach_id": formState.coachId as Any,
        "type": formState.type!.rawValue,
        "direction": formState.direction.rawValue,
        "occurred_at": utcDatetime,
        "subject": sanitizedSubject as Any,
        "content": sanitizedContent as Any,
        "sentiment": formState.sentiment?.rawValue as Any,
        "logged_by": authManager.user!.id,
        "family_unit_id": familyManager.activeFamilyId!,
        "attachments": [] as [String]
      ])
      .select()
      .single()
      .execute()

    let newInteraction = try JSONDecoder().decode(Interaction.self, from: response.data)

    // Upload attachments if any (Phase 4)
    // if !formState.attachedFiles.isEmpty { ... }

    // Create inbound alert if direction is inbound
    if formState.direction == .inbound {
      await createInboundAlert(for: newInteraction)
    }

    // Navigate back to list
    dismiss()

  } catch {
    self.error = error.localizedDescription
  }

  isSubmitting = false
}
```

## Appendix B: Smart Delete Logic (Detail Page)

```swift
func deleteInteraction() async {
  guard let interactionId = interaction?.id else { return }

  isDeleting = true
  error = nil

  do {
    // Try simple delete first
    try await supabase.from("interactions")
      .delete()
      .eq("id", interactionId)
      .eq("family_unit_id", familyManager.activeFamilyId!)
      .eq("logged_by", authManager.user!.id)
      .execute()

    dismiss()

  } catch {
    let message = error.localizedDescription

    // Check for FK constraint error → try cascade
    if message.contains("Cannot delete") ||
       message.contains("violates foreign key constraint") ||
       message.contains("still referenced") {

      do {
        let url = URL(string: "\(baseURL)/api/interactions/\(interactionId)/cascade-delete")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["confirmDelete": true])

        let (data, _) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(CascadeDeleteResponse.self, from: data)

        if result.success {
          dismiss()
          return
        }
      } catch {
        self.error = "Failed to delete interaction"
      }
    } else {
      self.error = message
    }
  }

  isDeleting = false
}

struct CascadeDeleteResponse: Codable {
  let success: Bool
  let message: String?
}
```

## Appendix C: Export via Share Sheet (Detail Page)

```swift
func exportInteraction() -> String {
  guard let interaction = interaction else { return "" }

  let lines: [(String, String)] = [
    ("Subject", interaction.displaySubject),
    ("Type", interaction.type.displayName),
    ("Direction", interaction.direction.displayName),
    ("Sentiment", interaction.sentiment?.displayName ?? "N/A"),
    ("School", school?.name ?? "N/A"),
    ("Coach", coach.map { "\($0.firstName) \($0.lastName)" } ?? "N/A"),
    ("Date", formattedDate),
    ("Content", interaction.content ?? "N/A"),
    ("Attachments", "\(interaction.attachmentCount)")
  ]

  // CSV format
  let header = "Field,Value"
  let rows = lines.map { "\"\($0.0)\",\"\($0.1)\"" }
  return ([header] + rows).joined(separator: "\n")
}
```

Use `ShareLink` (iOS 16+) to present the native share sheet:

```swift
if let interaction = interaction {
  ShareLink(
    item: exportInteraction(),
    subject: Text("Interaction: \(interaction.displaySubject)"),
    message: Text("Exported from The Recruiting Compass")
  ) {
    Label("Export", systemImage: "square.and.arrow.up")
  }
}
```

## Appendix D: Interest Calibration Thresholds

| Yes Count | Interest Level | Emoji | Color | Description                                                                      |
| --------- | -------------- | ----- | ----- | -------------------------------------------------------------------------------- |
| 0         | Not Set        | —     | Gray  | "Answer questions to see coach interest level"                                   |
| 1         | Low            | ❄️    | Gray  | "Limited signals detected. Consider diversifying your target list."              |
| 2-3       | Medium         | ⚡    | Amber | "Coach seems interested but check for personalization. Stay in touch regularly." |
| 4-6       | High           | 🔥    | Green | "Coach showing strong signals of genuine interest. Follow up promptly."          |

Content append format: `\n\n[Coach Interest Level: HIGH]`
