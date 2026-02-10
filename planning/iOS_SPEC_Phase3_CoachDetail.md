# iOS Page Specification: Coach Detail

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Coach Detail
**Web Route:** `/coaches/[id]`
**Priority:** MVP / Phase 3 (High - Core Feature)
**Complexity:** High (multi-section detail, notes editing, communication actions, smart delete)
**Estimated Time:** 5 days

---

## 1. Overview

### Purpose

Display the full profile for a single coach, including contact information, communication actions, interaction statistics, shared and private notes, and recent interaction history. This is the primary page for understanding a coach relationship and taking action on it. Users arrive here from the Coaches List (Phase 2) by tapping a coach card.

### Key User Actions

- View coach profile: name, role, school, last contact, responsiveness
- Quick-communicate: email, text, call via native iOS handlers
- Open social profiles: Twitter/X, Instagram
- Edit coach info via full-screen form (first name, last name, email, phone, twitter, instagram, role, notes)
- View and edit shared notes (visible to all family members)
- View and edit private notes (visible only to the current user)
- Delete coach (smart delete with cascade fallback)
- View recent interactions (last 10) with type, date, sentiment, and subject
- Navigate to sub-pages: Analytics, Communications/Messages, Availability, Social Posts

### Success Criteria

- Coach profile loads with all fields populated correctly
- Contact information links open correct native handlers (mail, phone, SMS, browser)
- Shared notes save and persist across sessions for all family members
- Private notes save and persist only for the current user
- Edit form validates all fields and updates the coach record
- Delete triggers confirmation, then removes coach and navigates back to list
- Cascade delete handles coaches with related interactions automatically
- Recent interactions display sorted by date (newest first), limited to 10
- Stats grid shows accurate totals, days-since-contact coloring, and preferred method

---

## 2. User Flows

### Primary Flow

```
1. User taps a coach card on Coaches List page
2. System navigates to Coach Detail with coach ID
3. System fetches coach record by ID from Supabase
4. System fetches school name by school_id
5. System fetches interactions filtered by coach_id
6. User sees full coach profile with all sections
7. User can scroll through header, stats, notes, and interactions
```

### Alternative Flow: Edit Coach

```
1. User taps "Edit" button in header card
2. Full-screen edit form appears (sheet or push navigation)
3. Form pre-populated with current coach data
4. User modifies fields
5. User taps "Save"
6. System validates fields (Zod schema equivalent)
7. System calls updateCoach with validated data
8. Coach profile refreshes with updated values
9. Form dismisses
```

### Alternative Flow: Save Notes (Shared)

```
1. User taps "Edit" next to Notes heading
2. Section switches from read-only to textarea
3. User types or modifies notes
4. User taps "Save Notes"
5. System calls updateCoach with { notes: editedText }
6. Section switches back to read-only with updated text
```

### Alternative Flow: Save Private Notes

```
1. User taps "Edit" next to My Private Notes heading
2. Section switches from read-only to textarea
3. User types or modifies notes
4. User taps "Save Notes"
5. System calls updateCoach with { private_notes: { ...existing, [userId]: editedText } }
6. Section switches back to read-only with updated text
7. Other family members never see this text
```

### Alternative Flow: Quick Communication

```
1a. Email: User taps "Email" → opens MFMailComposeViewController or mailto: URL
1b. Text: User taps "Text" → opens sms: URL with coach phone number
1c. Call: User taps "Call" → opens tel: URL with coach phone number
1d. Twitter: User taps "Twitter" → opens twitter.com/{handle} in SFSafariViewController
1e. Instagram: User taps "Instagram" → opens instagram.com/{handle} in SFSafariViewController
```

### Alternative Flow: Delete Coach

```
1. User taps "Delete Coach" button
2. Confirmation alert appears: "Delete [Coach Name]?"
3. User taps "Delete" (destructive)
4. System attempts simple Supabase delete
5. If FK constraint error → automatic cascade fallback via API
6. On success: navigate back to Coaches List
7. Success toast: "Coach deleted" or "Coach and X interactions deleted"
```

### Error Scenarios

```
Error: Coach not found
- User sees: "Coach not found" message with back navigation
- Recovery: Tap back to return to Coaches List

Error: Network failure during fetch
- User sees: Error banner with message
- Recovery: Pull-to-refresh

Error: Save notes fails
- User sees: Error alert with message
- Recovery: Retry save or cancel edit

Error: Delete fails (non-FK error)
- User sees: Error alert with message
- Recovery: Dismiss and retry

Error: Edit validation fails
- User sees: Inline per-field error messages
- Recovery: Fix fields and re-submit
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
  let privateNotes: [String: String]?  // userId → note text
  let responsivenessScore: Double       // 0-100
  let lastContactDate: Date?
  let availability: CoachAvailability?
  let createdBy: String?
  let updatedBy: String?
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
    case .assistant: return "Assistant Coach"
    case .recruiting: return "Recruiting Coordinator"
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

### Responsiveness Level

```swift
enum ResponsivenessLevel {
  case veryResponsive  // >= 80%
  case responsive      // 60-79%
  case moderate        // 40-59%
  case slow            // 20-39%
  case unresponsive    // < 20%

  init(score: Double) {
    switch score {
    case 80...100: self = .veryResponsive
    case 60..<80:  self = .responsive
    case 40..<60:  self = .moderate
    case 20..<40:  self = .slow
    default:       self = .unresponsive
    }
  }

  var label: String {
    switch self {
    case .veryResponsive: return "Very Responsive"
    case .responsive:     return "Responsive"
    case .moderate:       return "Moderate"
    case .slow:           return "Slow"
    case .unresponsive:   return "Unresponsive"
    }
  }

  var color: Color {
    switch self {
    case .veryResponsive: return Color(hex: "#10B981")  // emerald
    case .responsive:     return Color(hex: "#3B82F6")  // blue
    case .moderate:       return Color(hex: "#F97316")  // orange
    case .slow:           return Color(hex: "#F97316")  // orange
    case .unresponsive:   return Color(hex: "#EF4444")  // red
    }
  }
}
```

### Interaction Model (for Recent Interactions)

```swift
struct Interaction: Identifiable, Codable {
  let id: String
  let schoolId: String?
  let coachId: String?
  let type: InteractionType
  let direction: InteractionDirection
  let subject: String?
  let content: String?
  let sentiment: InteractionSentiment?
  let occurredAt: Date?

  var displayType: String {
    type.rawValue
      .split(separator: "_")
      .map { $0.capitalized }
      .joined(separator: " ")
  }
}

enum InteractionType: String, Codable {
  case email
  case phoneCall = "phone_call"
  case text
  case inPersonVisit = "in_person_visit"
  case virtualMeeting = "virtual_meeting"
  case camp
  case showcase
  case tweet
  case dm
}

enum InteractionDirection: String, Codable {
  case outbound
  case inbound
}

enum InteractionSentiment: String, Codable {
  case veryPositive = "very_positive"
  case positive
  case neutral
  case negative

  var color: Color {
    switch self {
    case .veryPositive: return Color(hex: "#10B981")  // emerald
    case .positive:     return Color(hex: "#3B82F6")  // blue
    case .neutral:      return Color.gray
    case .negative:     return Color(hex: "#EF4444")  // red
    }
  }

  var backgroundColor: Color {
    switch self {
    case .veryPositive: return Color(hex: "#D1FAE5")
    case .positive:     return Color(hex: "#DBEAFE")
    case .neutral:      return Color(hex: "#F1F5F9")
    case .negative:     return Color(hex: "#FEE2E2")
    }
  }
}
```

### Coach Stats Model

```swift
struct CoachStats {
  let totalInteractions: Int
  let daysSinceContact: Int
  let preferredMethod: String

  var daysSinceContactColor: Color {
    if daysSinceContact == 0 { return Color(hex: "#10B981") }  // emerald
    if daysSinceContact > 30 { return Color(hex: "#EF4444") }  // red
    return Color(hex: "#F97316")                                // orange
  }
}
```

### Edit Coach Form Model

```swift
struct CoachEditForm {
  var firstName: String = ""
  var lastName: String = ""
  var role: CoachRole = .head
  var email: String = ""
  var phone: String = ""
  var twitterHandle: String = ""
  var instagramHandle: String = ""
  var notes: String = ""

  init(from coach: Coach) {
    firstName = coach.firstName
    lastName = coach.lastName
    role = coach.role
    email = coach.email ?? ""
    phone = coach.phone ?? ""
    twitterHandle = coach.twitterHandle ?? ""
    instagramHandle = coach.instagramHandle ?? ""
    notes = coach.notes ?? ""
  }
}
```

### Data Origin

- **Source:** Supabase `coaches` table (single record by ID), `schools` table (for school name), `interactions` table (filtered by coach_id)
- **Access Control:** RLS enforced by `family_unit_id`
- **Refresh:** On page load + pull-to-refresh
- **Caching:** None (always re-fetch on navigation)
- **Mutations:** Update (coach fields, notes, private notes), Delete (simple + cascade)

---

## 4. API Integration

### Supabase Queries

```
// Fetch single coach by ID
supabase.from("coaches")
  .select("*")
  .eq("id", coachId)
  .single()

// Fetch school name
supabase.from("schools")
  .select("id, name")
  .eq("id", schoolId)
  .single()

// Fetch interactions for coach
supabase.from("interactions")
  .select("*")
  .eq("coach_id", coachId)
  .order("occurred_at", ascending: false)

// Update coach fields
supabase.from("coaches")
  .update(updateData)
  .eq("id", coachId)
  .eq("family_unit_id", activeFamilyId)
  .select()
  .single()

// Update notes only
supabase.from("coaches")
  .update(["notes": newNotesText, "updated_at": ISO8601Now, "updated_by": userId])
  .eq("id", coachId)
  .eq("family_unit_id", activeFamilyId)

// Update private notes (merge with existing)
supabase.from("coaches")
  .update(["private_notes": mergedPrivateNotes, "updated_at": ISO8601Now, "updated_by": userId])
  .eq("id", coachId)
  .eq("family_unit_id", activeFamilyId)

// Simple delete
supabase.from("coaches")
  .delete()
  .eq("id", coachId)
  .eq("family_unit_id", activeFamilyId)
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

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK

---

## 5. State Management

### Page-Level State

```swift
@State var coach: Coach? = nil
@State var schoolName: String = ""
@State var interactions: [Interaction] = []
@State var isLoading = false
@State var error: String? = nil

// Notes editing
@State var isEditingNotes = false
@State var editedNotes: String = ""
@State var isSavingNotes = false

// Private notes editing
@State var isEditingPrivateNotes = false
@State var editedPrivateNotes: String = ""
@State var isSavingPrivateNotes = false

// Edit coach modal
@State var showEditForm = false

// Delete confirmation
@State var showDeleteConfirmation = false
@State var isDeleting = false
```

### Computed Properties

```swift
var recentInteractions: [Interaction] {
  interactions
    .sorted { ($0.occurredAt ?? .distantPast) > ($1.occurredAt ?? .distantPast) }
    .prefix(10)
    .map { $0 }
}

var stats: CoachStats {
  guard let coach else {
    return CoachStats(totalInteractions: 0, daysSinceContact: 0, preferredMethod: "N/A")
  }

  let total = interactions.count

  let daysSince: Int = {
    guard let lastContact = coach.lastContactDate else { return 0 }
    return Calendar.current.dateComponents([.day], from: lastContact, to: Date()).day ?? 0
  }()

  let preferredMethod: String = {
    let counts = Dictionary(grouping: interactions, by: \.type)
      .mapValues { $0.count }
    guard let topType = counts.max(by: { $0.value < $1.value })?.key else {
      return "N/A"
    }
    return topType.rawValue
      .split(separator: "_")
      .map { $0.capitalized }
      .joined(separator: " ")
  }()

  return CoachStats(
    totalInteractions: total,
    daysSinceContact: daysSince,
    preferredMethod: preferredMethod
  )
}

var myPrivateNote: String {
  guard let coach, let userId = authManager.currentUserId else { return "" }
  return coach.privateNotes?[userId] ?? ""
}

var responsivenessLevel: ResponsivenessLevel? {
  guard let coach else { return nil }
  return ResponsivenessLevel(score: coach.responsivenessScore)
}
```

### Shared State

- **FamilyManager:** `activeFamilyId` for data scoping
- **AuthManager:** Current user ID (for private notes keying and update tracking)

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Back: "< All Coaches"
  - Title: (none, coach name is in header card)

[ScrollView]
  [Header Card]
    - Coach name (large title)
    - Role label
    - School name
    - Last contact date + days ago
    - Responsiveness badge (top-right)
    - Contact info grid (email, phone, twitter, instagram)
    - Primary action buttons (Email, Text, Call, Twitter, Instagram)
    - Secondary action buttons (Analytics, Messages, Availability, Social Posts, Edit, Delete)

  [Stats Grid] (3 columns)
    - Total Interactions (count)
    - Days Since Contact (color-coded number)
    - Preferred Method (text)

  [Notes Section]
    - Header: "Notes" + Edit toggle
    - Read mode: plain text display
    - Edit mode: textarea + Save/Cancel buttons

  [Private Notes Section]
    - Header: "My Private Notes" + Edit toggle
    - Disclaimer: "Only you can see these notes"
    - Read mode: plain text display
    - Edit mode: textarea + Save/Cancel buttons

  [Recent Interactions Section]
    - Header: "Recent Interactions"
    - List of up to 10 interaction rows
    - Each row: type icon (colored), type label, date, sentiment badge, subject
    - "View All" link if > 10 interactions
```

### Header Card Layout

```
┌──────────────────────────────────────────┐
│  Coach First Last            [Responsive]│
│  Head Coach                   ness Badge │
│  University of Example                   │
│  📅 Last contact: Jan 15, 2026 (24 days)│
├──────────────────────────────────────────┤
│  ✉️ coach@example.edu                    │
│  📱 (555) 123-4567                       │
│  𝕏  @coachhandle                         │
│  📷 @coachinstagram                      │
├──────────────────────────────────────────┤
│  [Email] [Text] [Call] [Twitter] [Insta] │
├──────────────────────────────────────────┤
│  [Availability] [Social Posts]           │
│  [Edit]                    [Delete Coach]│
└──────────────────────────────────────────┘
```

### Stats Grid Layout

```
┌──────────┬──────────┬──────────┐
│ Total    │ Days     │ Preferred│
│ Inter-   │ Since    │ Contact  │
│ actions  │ Contact  │ Method   │
│          │          │          │
│   12     │   24     │  Email   │
│ (slate)  │ (orange) │ (slate)  │
└──────────┴──────────┴──────────┘
```

### Notes Section Layout

```
Read Mode:
┌──────────────────────────────────────────┐
│  Notes                          [Edit]   │
│                                          │
│  Great coach, very responsive to         │
│  emails. Prefers morning contact.        │
└──────────────────────────────────────────┘

Edit Mode:
┌──────────────────────────────────────────┐
│  Notes                          [Cancel] │
│  ┌────────────────────────────────────┐  │
│  │ Great coach, very responsive to   │  │
│  │ emails. Prefers morning contact.  │  │
│  │                                   │  │
│  │                                   │  │
│  └────────────────────────────────────┘  │
│  [Save Notes]  [Cancel]                  │
└──────────────────────────────────────────┘
```

### Recent Interactions Row Layout

```
┌──────────────────────────────────────────┐
│ [●] Email          positive    Meeting.. │
│     Jan 15, 2026                         │
├──────────────────────────────────────────┤
│ [●] Phone Call     neutral     Follow-up │
│     Jan 10, 2026                         │
├──────────────────────────────────────────┤
│ [●] Text           very_pos..  Great co..│
│     Jan 5, 2026                          │
└──────────────────────────────────────────┘
```

### Visual Details

**Responsiveness Badge:**

- Rounded pill with colored dot + label text
- Thresholds (from web `ResponsivenessBadge.vue`):
  - > = 80%: Emerald background/text, "Very Responsive"
  - 60-79%: Blue background/text, "Responsive"
  - 40-59%: Orange background/text, "Moderate"
  - 20-39%: Orange background/text, "Slow"
  - < 20%: Red background/text, "Unresponsive"

**Days Since Contact Coloring:**

- 0 days: Emerald (#10B981)
- 1-30 days: Orange (#F97316)
- 31+ days: Red (#EF4444)

**Interaction Type Icon Colors:**

| Type            | Background  | Icon Color  |
| --------------- | ----------- | ----------- |
| email           | Blue-100    | Blue-600    |
| text            | Emerald-100 | Emerald-600 |
| phone_call      | Orange-100  | Orange-600  |
| in_person_visit | Purple-100  | Purple-600  |
| virtual_meeting | Indigo-100  | Indigo-600  |
| camp            | Amber-100   | Amber-600   |
| showcase        | Pink-100    | Pink-600    |
| tweet           | Sky-100     | Sky-600     |
| dm              | Violet-100  | Violet-600  |

**Sentiment Badge Colors:**

| Sentiment     | Background  | Text Color  |
| ------------- | ----------- | ----------- |
| very_positive | Emerald-100 | Emerald-700 |
| positive      | Blue-100    | Blue-700    |
| neutral       | Slate-100   | Slate-700   |
| negative      | Red-100     | Red-700     |

**Action Button Colors (Primary):**

| Action    | Gradient                  |
| --------- | ------------------------- |
| Email     | Blue-500 → Blue-600       |
| Text      | Emerald-500 → Emerald-600 |
| Call      | Orange-500 → Orange-600   |
| Twitter   | Sky-500 → Sky-600         |
| Instagram | Purple-500 → Pink-500     |
| Analytics | Indigo-500 → Indigo-600   |
| Messages  | Slate-500 → Slate-600     |

**Secondary Actions (Edit, Availability, Social Posts):**

- Outlined style: slate-300 border, slate-700 text
- Delete: red-300 border, red-700 text, right-aligned

### Loading States

```
First Load:
- Full-screen centered spinner with "Loading coach profile..."
- Show only when coach is nil AND isLoading is true

Pull-to-Refresh:
- Standard iOS pull-to-refresh
- Re-fetches coach, school name, and interactions

Notes Save:
- Save button shows "Saving..." with disabled state
- Returns to read mode on success

Delete:
- Delete button shows spinner during deletion
- Navigates to Coaches List on success
```

### Empty States

**Coach Not Found:**

- Card with centered text: "Coach not found"
- Back navigation available via nav bar

**No Interactions:**

- Centered text: "No interactions recorded yet"
- No CTA (interactions are created from other flows)

**No Notes:**

- Gray text: "No notes added yet." (shared)
- Gray text: "No private notes yet" (private)
- Edit button always available

### Edit Coach Form (Full-Screen Sheet)

```
┌──────────────────────────────────────────┐
│  [Cancel]   Edit Coach          [Save]   │
├──────────────────────────────────────────┤
│  First Name *                            │
│  ┌────────────────────────────────────┐  │
│  │ John                              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Last Name *                             │
│  ┌────────────────────────────────────┐  │
│  │ Smith                             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Role *                                  │
│  ┌────────────────────────────────────┐  │
│  │ Head Coach                    ▾   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Email                                   │
│  ┌────────────────────────────────────┐  │
│  │ coach@university.edu              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Phone                                   │
│  ┌────────────────────────────────────┐  │
│  │ (555) 123-4567                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Twitter Handle                          │
│  ┌────────────────────────────────────┐  │
│  │ coachsmith                        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Instagram Handle                        │
│  ┌────────────────────────────────────┐  │
│  │ coachsmith                        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Notes                                   │
│  ┌────────────────────────────────────┐  │
│  │ Great head coach, very engaged    │  │
│  │ with recruits...                  │  │
│  │                                   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Delete Confirmation Dialog

```
┌──────────────────────────────┐
│  Delete Coach?               │
│                              │
│  Are you sure you want to    │
│  delete John Smith?          │
│  This cannot be undone.      │
│                              │
│  [Cancel]         [Delete]   │
│                   (red)      │
└──────────────────────────────┘
```

### Accessibility

- **VoiceOver:** Header announces: "{fullName}, {role} at {school}, responsiveness {score}%"
- **VoiceOver:** Stats grid: Each stat read as "{label}: {value}"
- **VoiceOver:** Interaction rows: "{type} on {date}, sentiment {sentiment}, subject {subject}"
- **VoiceOver:** Notes sections: Announce edit state and character count
- **Touch Targets:** All buttons 44pt minimum
- **Dynamic Type:** All text supports scaling
- **Reduce Motion:** Disable transition animations when enabled

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- MessageUI (`MFMailComposeViewController` for email compose)
- SafariServices (`SFSafariViewController` for Twitter/Instagram links)
- Supabase iOS Client (data queries + auth)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (coaches, schools, interactions tables)
- Supabase Auth (session management, user ID for private notes)
- Cascade delete API endpoint (Nitro serverless function)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry via pull-to-refresh
- **No internet:** Show offline indicator banner
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **Coach not found (null response):** Show "Coach not found" card with back navigation
- **School not found:** Show coach without school name (field blank)
- **No interactions:** Show "No interactions recorded yet" empty state
- **Null responsiveness_score:** Hide responsiveness badge entirely
- **Null last_contact_date:** Show "No contact recorded yet" instead of date
- **Missing email/phone/social:** Hide corresponding contact row and action button
- **Null notes:** Show "No notes added yet." placeholder
- **Null private_notes or missing user key:** Show "No private notes yet" placeholder

### User Errors

- **Edit form validation:**
  - First name empty: "First name is required"
  - Last name empty: "Last name is required"
  - First name > 100 chars: "First name must not exceed 100 characters"
  - Last name > 100 chars: "Last name must not exceed 100 characters"
  - Invalid email format: "Please enter a valid email address"
  - Twitter handle > 15 chars: "Twitter handle must not exceed 15 characters"
  - Instagram handle > 30 chars: "Instagram handle must not exceed 30 characters"
  - Notes > 5000 chars: "Notes must not exceed 5000 characters"
- **Delete coach with FK dependencies:** Automatic cascade fallback (transparent to user)
- **Concurrent saves:** Last-write-wins (standard Supabase behavior)

### Edge Cases

- **Very long coach name:** Truncate with ellipsis in header; full name in edit form
- **Very long email:** Truncate in contact grid with ellipsis
- **Very long notes:** ScrollView handles overflow naturally
- **Coach with all social handles:** Show all 4 communication buttons + both social links
- **Coach with no contact info at all:** Show only Edit and Delete buttons
- **Private notes JSON structure:** Always merge with existing keys to avoid overwriting other users' notes
- **Twitter handle with @ prefix:** Strip @ before constructing URL (matches web behavior)
- **Instagram handle with @ prefix:** Strip @ before constructing URL (matches web behavior)
- **User switches family context:** Coach may no longer be accessible; handle 403/empty response gracefully
- **Coach deleted by another family member:** Show error on next action attempt, navigate back to list

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays coach with all fields populated
- [ ] Coach name, role label, and school name display correctly
- [ ] Last contact date shows formatted date and days-ago calculation
- [ ] Responsiveness badge shows correct label and color for each threshold
- [ ] Contact info grid shows email, phone, twitter, instagram (only when populated)
- [ ] Stats grid shows correct totals, days-since-contact coloring, and preferred method
- [ ] Shared notes display in read mode; edit/save/cancel cycle works
- [ ] Private notes display in read mode; edit/save/cancel cycle works
- [ ] Private notes are keyed by user ID and not visible to other users
- [ ] Recent interactions list shows up to 10 items sorted by date (newest first)
- [ ] Interaction rows show correct type icon, color, date, sentiment badge, and subject
- [ ] Edit form opens pre-populated with current coach data
- [ ] Edit form saves valid data and refreshes the profile
- [ ] Delete confirmation appears and requires explicit confirm
- [ ] Simple delete works for coaches with no dependencies
- [ ] Cascade delete works for coaches with interactions

### Communication Tests

- [ ] Email button opens mail compose with correct address
- [ ] Text button opens SMS compose with correct phone number
- [ ] Call button initiates phone call with correct number
- [ ] Twitter button opens twitter.com/{handle} in browser (@ stripped)
- [ ] Instagram button opens instagram.com/{handle} in browser (@ stripped)
- [ ] Communication buttons hidden when coach lacks that contact method

### Error Tests

- [ ] Handle coach not found (show message + back navigation)
- [ ] Handle network timeout gracefully (error banner + pull-to-refresh)
- [ ] Handle 401 (redirect to login)
- [ ] Handle notes save failure (show error, stay in edit mode)
- [ ] Handle delete failure (show error alert)
- [ ] Handle edit validation errors (inline per-field messages)

### Edge Case Tests

- [ ] Coach with no contact info shows only Edit and Delete buttons
- [ ] Coach with null responsiveness_score hides badge
- [ ] Coach with null last_contact_date shows "No contact recorded yet"
- [ ] Empty notes sections show placeholder text
- [ ] Very long names don't break header layout
- [ ] Twitter/Instagram handles with @ prefix work correctly in URLs
- [ ] Private notes merge preserves other users' notes
- [ ] Pull-to-refresh re-fetches all data (coach, school, interactions)
- [ ] "View All" link appears when > 10 interactions
- [ ] VoiceOver reads all sections correctly

### Performance Tests

- [ ] Page loads in < 2 seconds on 4G (3 parallel queries)
- [ ] Notes save completes in < 1 second
- [ ] Interaction list scrolls smoothly with 10 items
- [ ] No memory leaks when navigating away and back
- [ ] Edit form does not cause layout reflow

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Communication panel:** Web opens an in-app communication panel with template selection, message composition, and automatic interaction logging. For iOS MVP, use native mail/SMS handlers instead. Interaction logging from communication will be deferred to a later phase.
- **Rich text notes:** Web stores notes as HTML (via `richTextSchema` and `sanitizeHtml`). iOS should use plain text for notes editing. When displaying existing HTML notes, strip tags or use a simple attributed string renderer.
- **Sub-page navigation:** Analytics, Communications/Messages, Availability, and Social Posts are separate web routes. For iOS Phase 3, show these as navigation links but defer their implementation to later phases. Show a "Coming Soon" placeholder if tapped.
- **Responsiveness score:** Pre-computed server-side and stored on the coach record. iOS does not need to calculate it.
- **Stats preferred method:** Computed client-side from interaction type frequency. The web implementation counts all interactions for the coach and picks the most common type.

### iOS-Specific Considerations

- **Native email:** Use `MFMailComposeViewController` when available; fall back to `mailto:` URL scheme if mail is not configured on device.
- **Native SMS:** Use `sms:` URL scheme. `MFMessageComposeViewController` available for richer integration but adds complexity.
- **Phone calls:** Use `tel:` URL scheme. Consider checking `UIApplication.shared.canOpenURL` before showing Call button.
- **External social links:** Open in `SFSafariViewController` for in-app browsing, or fall back to `UIApplication.shared.open` for native app deep links.
- **Private notes JSON:** The `private_notes` column is a JSONB field. When updating, always read the current value first and merge to avoid overwriting other users' notes. The web implementation does: `{ ...existingPrivateNotes, [userId]: newText }`.
- **Edit form:** Use a `.sheet` presentation (full-screen on iPhone, form sheet on iPad) rather than a web-style modal overlay.
- **Family-scoped access:** Always include `family_unit_id` in update and delete queries, matching the web composable pattern. Never rely on `user_id` alone.
- **Back navigation after delete:** After successful delete, pop the navigation stack back to Coaches List. The deleted coach should already be removed from the list if using shared state.

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/coaches/[id].vue`
- **Composables used:**
  - `useCoaches()` - getCoach, updateCoach, smartDelete
  - `useSchools()` - getSchool (for school name lookup)
  - `useInteractions()` - fetchInteractions (filtered by coach_id)
  - `useCommunication()` - Communication panel state (defer for iOS)
  - `useUserStore()` - Current user ID (for private notes)
- **Child components:**
  - `ResponsivenessBadge` - Color-coded responsiveness pill
  - `EditCoachModal` - Coach edit form
  - `DeleteConfirmationModal` - Delete confirmation dialog
  - `CommunicationPanel` - Email/text composer (defer for iOS)
- **Validation schema:** `/utils/validation/schemas.ts` -> `coachSchema`
- **Types:** `/types/models.ts` -> `Coach`, `Interaction`, `CoachAvailability`, `PrivateNotes`

### API Documentation

- **Cascade delete:** `POST /api/coaches/{id}/cascade-delete`
- **Body:** `{ "confirmDelete": true }`
- **Response:** `{ success, deleted: { coaches, interactions, offers, social_media_posts }, message }`

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** This page is the primary detail view for coaches and establishes the detail-page pattern for the app. The notes editing pattern (view/edit toggle with save/cancel) should be built as a reusable component since it appears in School Detail and other pages. For communication, start with native iOS handlers (mailto:, sms:, tel:, URL schemes) rather than building an in-app communication panel. Sub-page navigation targets (Analytics, Communications, Availability, Social Posts) should be wired up as NavigationLink destinations but can show placeholder views until those specs are implemented.

---

## Appendix A: Validation Rules Detail

### Coach Edit Form Validation (Swift Equivalent of Zod Schema)

```swift
struct CoachFormValidator {
  static func validate(_ form: CoachEditForm) -> [String: String] {
    var errors: [String: String] = [:]

    // first_name: sanitized text, 1-100 chars, required
    let trimmedFirst = form.firstName.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmedFirst.isEmpty {
      errors["firstName"] = "First name is required"
    } else if trimmedFirst.count > 100 {
      errors["firstName"] = "First name must not exceed 100 characters"
    }

    // last_name: sanitized text, 1-100 chars, required
    let trimmedLast = form.lastName.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmedLast.isEmpty {
      errors["lastName"] = "Last name is required"
    } else if trimmedLast.count > 100 {
      errors["lastName"] = "Last name must not exceed 100 characters"
    }

    // email: valid email or empty, optional
    if !form.email.isEmpty {
      let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if form.email.firstMatch(of: emailRegex) == nil {
        errors["email"] = "Please enter a valid email address"
      }
    }

    // phone: flexible format, optional (no strict validation on web)
    // Web uses phoneSchema which is permissive

    // twitter_handle: 1-15 chars after stripping @, optional
    if !form.twitterHandle.isEmpty {
      let handle = form.twitterHandle.replacingOccurrences(of: "@", with: "")
      if handle.count > 15 {
        errors["twitterHandle"] = "Twitter handle must not exceed 15 characters"
      }
    }

    // instagram_handle: 1-30 chars after stripping @, optional
    if !form.instagramHandle.isEmpty {
      let handle = form.instagramHandle.replacingOccurrences(of: "@", with: "")
      if handle.count > 30 {
        errors["instagramHandle"] = "Instagram handle must not exceed 30 characters"
      }
    }

    // notes: up to 5000 chars, optional
    if form.notes.count > 5000 {
      errors["notes"] = "Notes must not exceed 5000 characters"
    }

    return errors
  }
}
```

---

## Appendix B: Smart Delete Implementation Detail

### Smart Delete Pattern (Swift)

```swift
func smartDelete(coachId: String) async throws -> DeleteResult {
  do {
    // Fast path: simple Supabase delete
    try await supabaseManager.deleteCoach(coachId)
    return DeleteResult(cascadeUsed: false)
  } catch {
    // Check if this is a foreign key constraint error
    if isForeignKeyError(error) {
      // Slow path: cascade delete via API endpoint
      let url = URL(string: "\(baseURL)/api/coaches/\(coachId)/cascade-delete")!
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
      request.httpBody = try JSONEncoder().encode(["confirmDelete": true])

      let (data, response) = try await URLSession.shared.data(for: request)
      guard let httpResponse = response as? HTTPURLResponse,
            httpResponse.statusCode == 200 else {
        throw CoachError.cascadeDeleteFailed
      }

      let cascadeResponse = try JSONDecoder().decode(CascadeDeleteResponse.self, from: data)
      if cascadeResponse.success {
        return DeleteResult(cascadeUsed: true, deletedCounts: cascadeResponse.deleted)
      }
      throw CoachError.cascadeDeleteFailed
    }
    throw error
  }
}

func isForeignKeyError(_ error: Error) -> Bool {
  let message = error.localizedDescription.lowercased()
  return message.contains("cannot delete") ||
         message.contains("violates foreign key constraint") ||
         message.contains("still referenced")
}

struct DeleteResult {
  let cascadeUsed: Bool
  var deletedCounts: [String: Int]?
}

struct CascadeDeleteResponse: Codable {
  let success: Bool
  let deleted: [String: Int]?
  let message: String?
}
```

---

## Appendix C: Private Notes Merge Pattern

### Safe Private Notes Update

The `private_notes` field is a JSONB column storing a dictionary of `userId -> noteText`. Multiple family members may each have their own private note on the same coach. When saving, always merge rather than overwrite.

```swift
func savePrivateNote(coachId: String, noteText: String) async throws {
  guard let userId = authManager.currentUserId,
        let familyId = familyManager.activeFamilyId else {
    throw CoachError.notAuthenticated
  }

  // Step 1: Read current private_notes from coach
  let currentCoach = try await fetchCoach(coachId)
  var mergedNotes = currentCoach.privateNotes ?? [:]

  // Step 2: Merge current user's note
  mergedNotes[userId] = noteText

  // Step 3: Update with merged dictionary
  try await supabase
    .from("coaches")
    .update([
      "private_notes": mergedNotes,
      "updated_at": ISO8601DateFormatter().string(from: Date()),
      "updated_by": userId
    ])
    .eq("id", coachId)
    .eq("family_unit_id", familyId)
    .execute()
}
```

This pattern prevents one user's save from accidentally erasing another user's private notes.
