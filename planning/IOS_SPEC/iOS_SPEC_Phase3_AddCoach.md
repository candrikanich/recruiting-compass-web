# iOS Page Specification: Add Coach

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Add Coach
**Web Route:** `/coaches/new`
**Priority:** MVP / Phase 3 (High - Core Feature)
**Complexity:** High (many form fields, two-step flow, validation)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

Allow users to add a new coach to one of their tracked schools. The page uses a two-step flow: first select a school, then fill out the coach form with role, contact info, social handles, and notes. On successful submission, the user navigates to the newly created coach's detail page.

### Key User Actions

- Select a school from the user's existing schools
- Fill out the coach form (role, name, email, phone, social handles, notes)
- Submit the form to create a new coach record
- Cancel to return to the coaches list
- Navigate to add a school if none exist

### Success Criteria

- School dropdown loads all schools for the user's active family
- Form only appears after a school is selected
- All required fields are validated before submission
- Optional fields accept empty values (converted to null in database)
- Social handles strip leading `@` automatically
- Notes field sanitizes HTML to prevent XSS
- On success, user navigates to the new coach's detail page
- On error, the form stays open with an error message for retry

---

## 2. User Flows

### Primary Flow

```
1. User taps "Add Coach" (from Coaches list or navigation)
2. System fetches all schools for user's active family unit
3. User sees school selection dropdown
4. User selects a school
5. Coach form appears below the school dropdown
6. User fills in role (required), first name (required), last name (required)
7. User optionally fills in email, phone, Twitter, Instagram, notes
8. User taps "Add Coach" button
9. System validates all fields with Zod schema
10. System sanitizes notes, strips @ from social handles, converts empty strings to null
11. System inserts coach into Supabase with auto-populated fields
12. On success: Navigate to /coaches/{newCoachId} detail page
```

### Alternative Flow: No Schools Exist

```
1. User navigates to Add Coach page
2. System fetches schools — returns empty list
3. User sees: "No schools found. Add a school first."
4. User taps "Add a school first" link
5. Navigation to Add School page
6. After adding a school, user returns to Add Coach
```

### Alternative Flow: Cancel

```
1. User is filling out the coach form
2. User taps "Cancel" button
3. Navigation pops back to Coaches list
4. No data is saved
```

### Alternative Flow: Validation Failure

```
1. User taps "Add Coach" with invalid data
2. System runs Zod validation
3. Error summary appears at top of form
4. Per-field error messages appear below invalid fields
5. User corrects errors
6. User taps "Add Coach" again
7. Validation passes, form submits
```

### Error Scenarios

```
Error: No schools for family
- User sees: Empty state with "No schools found" and link to Add School
- Recovery: Add a school first, then return to Add Coach

Error: Validation failure
- User sees: Error summary at top + inline field errors
- Recovery: Correct invalid fields and resubmit

Error: Network failure during submission
- User sees: Error alert "Failed to create coach"
- Recovery: Form stays open, user can retry

Error: User not authenticated
- User sees: Redirect to login page
- Recovery: Log in, then navigate back to Add Coach

Error: No family context
- User sees: Error "No family context"
- Recovery: Ensure family unit is set up in settings
```

---

## 3. Data Models

### Coach Create Input

```swift
struct CoachCreateInput {
  var role: CoachRole
  var firstName: String
  var lastName: String
  var email: String?
  var phone: String?
  var twitterHandle: String?
  var instagramHandle: String?
  var notes: String?
}
```

### Coach Model (returned from API)

```swift
struct Coach: Identifiable, Codable {
  let id: String
  let schoolId: String?
  let userId: String?
  let familyUnitId: String?
  let role: CoachRole
  let firstName: String
  let lastName: String
  let email: String?
  let phone: String?
  let twitterHandle: String?
  let instagramHandle: String?
  let notes: String?
  let responsivenessScore: Double  // defaults to 0
  let lastContactDate: Date?
  let createdAt: Date?
  let updatedAt: Date?

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

### School Model (for dropdown)

```swift
struct School: Identifiable, Codable {
  let id: String
  let name: String
  // Other fields exist but only id + name needed for dropdown
}
```

### Form State Model

```swift
struct CoachFormState {
  var selectedSchoolId: String? = nil
  var role: CoachRole? = nil
  var firstName: String = ""
  var lastName: String = ""
  var email: String = ""
  var phone: String = ""
  var twitterHandle: String = ""
  var instagramHandle: String = ""
  var notes: String = ""

  var isSchoolSelected: Bool { selectedSchoolId != nil }

  var isSubmittable: Bool {
    isSchoolSelected && role != nil && !firstName.isEmpty && !lastName.isEmpty
  }
}
```

### Form Validation Errors

```swift
struct CoachFormErrors {
  var role: String? = nil
  var firstName: String? = nil
  var lastName: String? = nil
  var email: String? = nil
  var phone: String? = nil
  var twitterHandle: String? = nil
  var instagramHandle: String? = nil
  var notes: String? = nil

  var hasErrors: Bool {
    [role, firstName, lastName, email, phone, twitterHandle, instagramHandle, notes]
      .contains(where: { $0 != nil })
  }

  var allErrors: [String] {
    [role, firstName, lastName, email, phone, twitterHandle, instagramHandle, notes]
      .compactMap { $0 }
  }
}
```

### Data Origin

- **Source:** Supabase `coaches` table (insert), `schools` table (dropdown)
- **Access Control:** Filtered by `family_unit_id` (not user_id)
- **Refresh:** Schools fetched on page load if not already cached
- **Caching:** Schools may be pre-loaded from Coaches List page
- **Mutations:** Create only (insert into coaches table)

---

## 4. API Integration

### Supabase Queries

#### Fetch Schools for Dropdown

```
supabase.from("schools")
  .select("id, name")
  .eq("family_unit_id", activeFamilyId)
  .order("name", ascending: true)
```

#### Insert New Coach

```
supabase.from("coaches")
  .insert([{
    school_id: selectedSchoolId,
    user_id: dataOwnerUserId,
    family_unit_id: activeFamilyId,
    role: formData.role,
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email ?? null,
    phone: formData.phone ?? null,
    twitter_handle: formData.twitterHandle ?? null,
    instagram_handle: formData.instagramHandle ?? null,
    notes: formData.notes ?? null
  }])
  .select()
  .single()
```

#### Response (Success)

```json
{
  "id": "uuid-string",
  "school_id": "uuid-string",
  "user_id": "uuid-string",
  "family_unit_id": "uuid-string",
  "role": "head",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@university.edu",
  "phone": "(555) 123-4567",
  "twitter_handle": "coachsmith",
  "instagram_handle": "coachsmith",
  "notes": "Great recruiter, very responsive",
  "responsiveness_score": 0,
  "last_contact_date": null,
  "created_at": "2026-02-08T12:00:00Z",
  "updated_at": "2026-02-08T12:00:00Z"
}
```

#### Error Codes

- 401: Not authenticated
- 403: No access (family_unit_id mismatch or RLS violation)
- 409: Duplicate entry (if unique constraints exist)
- 422: Validation error (server-side)
- 500: Server error

### Auto-Populated Fields (not user-entered)

| Field                  | Value                                               |
| ---------------------- | --------------------------------------------------- |
| `id`                   | UUID (auto-generated by Supabase)                   |
| `school_id`            | From school dropdown selection                      |
| `user_id`              | From `getDataOwnerUserId()` (active family context) |
| `family_unit_id`       | From `activeFamilyId` (active family context)       |
| `responsiveness_score` | `0` (default)                                       |
| `last_contact_date`    | `null` (no interactions yet)                        |
| `created_at`           | Auto-set by Supabase                                |
| `updated_at`           | Auto-set by Supabase                                |

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK

---

## 5. State Management

### Page-Level State

```swift
@State var formState = CoachFormState()
@State var formErrors = CoachFormErrors()
@State var schools: [School] = []
@State var isLoadingSchools = false
@State var isSubmitting = false
@State var submitError: String? = nil
```

### Computed Properties

```swift
var isFormVisible: Bool {
  formState.isSchoolSelected
}

var isSubmitDisabled: Bool {
  isSubmitting || formErrors.hasErrors || !formState.isSubmittable
}

var submitButtonTitle: String {
  isSubmitting ? "Adding..." : "Add Coach"
}
```

### Persistence Across Navigation

- Form state clears when navigating away (no draft saving)
- Schools list may persist in shared state if already fetched
- On successful create, navigates to detail page (form is destroyed)

### Shared State

- **FamilyManager:** `activeFamilyId` for data scoping and `getDataOwnerUserId()` for insert
- **AuthManager:** Current user authentication state
- **SchoolsManager (optional):** Schools may be pre-cached from other pages

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Title: "Add Coach"
  - Leading: Back button (← Coaches)

[Scroll View]
  [Section 1: School Selection]
    - Label: "School *"
    - Picker (dropdown) with school names
    - If no schools: "No schools found. Add a school first." with link

  [Section 2: Coach Form] (visible only when school selected)
    [Section 2a: Role]
      - Label: "Role *"
      - Picker: Head Coach / Assistant Coach / Recruiting Coordinator

    [Section 2b: Name (side by side on iPad, stacked on iPhone)]
      - First Name * (text field)
      - Last Name * (text field)

    [Section 2c: Contact Info]
      - Email (text field, email keyboard)
      - Phone (text field, phone pad keyboard)

    [Section 2d: Social Media (side by side on iPad, stacked on iPhone)]
      - Twitter Handle (text field, @ auto-stripped)
      - Instagram Handle (text field, @ auto-stripped)

    [Section 2e: Notes]
      - Notes (multi-line text editor, 4 lines visible)

  [Section 3: Actions]
    - [Add Coach] primary button (blue, full width)
    - [Cancel] secondary button (gray, full width)

  [Prompt: No School Selected] (visible when no school selected)
    - Blue info banner: "Please select a school to continue"
```

### Coach Form Layout (ASCII)

```
┌──────────────────────────────────────┐
│  ← Add Coach                         │
├──────────────────────────────────────┤
│                                      │
│  School *                            │
│  ┌──────────────────────────────┐   │
│  │ Select School              ▾ │   │
│  └──────────────────────────────┘   │
│                                      │
│  ── Coach Details ──────────────    │
│                                      │
│  Role *                              │
│  ┌──────────────────────────────┐   │
│  │ Select Role                ▾ │   │
│  └──────────────────────────────┘   │
│                                      │
│  First Name *          Last Name *   │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ e.g., John  │  │ e.g., Smith │   │
│  └─────────────┘  └─────────────┘   │
│                                      │
│  ── Contact Info ───────────────    │
│                                      │
│  Email                               │
│  ┌──────────────────────────────┐   │
│  │ john.smith@university.edu    │   │
│  └──────────────────────────────┘   │
│                                      │
│  Phone                               │
│  ┌──────────────────────────────┐   │
│  │ (555) 123-4567               │   │
│  └──────────────────────────────┘   │
│                                      │
│  ── Social Media ───────────────    │
│                                      │
│  Twitter Handle    Instagram Handle  │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ @handle     │  │ @handle     │   │
│  └─────────────┘  └─────────────┘   │
│                                      │
│  ── Notes ──────────────────────    │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Any notes about this coach...│   │
│  │                              │   │
│  │                              │   │
│  │                              │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │         Add Coach            │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │           Cancel             │   │
│  └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### Visual Details

**Navigation Bar:**

- Title: "Add Coach", large title style
- Leading: Back chevron with "Coaches" text

**School Picker:**

- Native iOS `Picker` with `.menu` style
- Shows school name when selected
- Placeholder: "Select School"

**Role Picker:**

- Native iOS `Picker` with `.menu` style
- Options: Head Coach, Assistant Coach, Recruiting Coordinator
- Placeholder: "Select Role"

**Text Fields:**

- Standard iOS `TextField` with rounded border style
- Required fields marked with red asterisk in label
- Placeholder text in gray
- Disabled state (gray background) when submitting

**Notes Field:**

- `TextEditor` with 4-line minimum height
- Placeholder text (custom implementation since TextEditor has no native placeholder)
- Max 5000 characters

**Action Buttons:**

- "Add Coach": Blue filled button, full width, white text, semibold
- "Cancel": Gray filled button, full width, slate text, semibold
- Both 44pt minimum height for touch targets

**Error States:**

- Error summary banner: Red background, white text, at top of form
- Per-field errors: Red text below the field, 12pt font
- Invalid field border: Red outline

### Form Sections (iOS Native)

Use `Form` with `Section` headers for iOS-native grouping:

```swift
Form {
  Section("School") {
    // School picker
  }

  Section("Coach Details") {
    // Role picker
    // First name
    // Last name
  }

  Section("Contact Information") {
    // Email
    // Phone
  }

  Section("Social Media") {
    // Twitter handle
    // Instagram handle
  }

  Section("Notes") {
    // Notes text editor
  }

  Section {
    // Add Coach button
    // Cancel button
  }
}
```

### Loading States

```
Schools Loading:
- Picker shows "Loading schools..." with spinner
- Form section hidden until schools load

Submitting:
- "Add Coach" button shows "Adding..." with spinner
- All form fields disabled
- Cancel button remains active

Success:
- Brief haptic feedback (success)
- Navigate to coach detail page

Error:
- Error banner appears at top of form
- Haptic feedback (error)
- Form fields re-enabled
- Scroll to top so error is visible
```

### Empty States

**No Schools:**

- Icon: `building.2.fill` (large, gray)
- Title: "No Schools Found"
- Subtitle: "You need to add a school before adding a coach"
- CTA: "Add School" button (navigates to Add School page)

### Accessibility

- **VoiceOver:** All form fields have descriptive labels; required fields announce "required"
- **Touch Targets:** All buttons and pickers 44pt minimum
- **Dynamic Type:** All text supports scaling
- **Keyboard Navigation:** Tab order follows visual layout (top to bottom)
- **Error Announcements:** Validation errors announced via `UIAccessibility.post` when they appear
- **Focus Management:** After validation error, focus moves to first invalid field

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (data queries + auth)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (coaches + schools tables)
- Supabase Auth (session management)

### Internal Dependencies

- Coach model (shared with Coaches List, Coach Detail)
- School model (shared with Schools List, Add School)
- Family context manager (shared across all pages)
- Form validation utilities (reusable across Add School, Add Interaction forms)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout during school fetch:** Show "Connection timed out" + retry button
- **Timeout during submit:** Show "Connection timed out" + retry (form data preserved)
- **No internet:** Show offline indicator; disable submit button
- **Server error (5xx):** Show "Server error" + retry (form data preserved)

### Validation Errors

| Field      | Validation Rule                                                           | Error Message                                                                 |
| ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Role       | Must be selected (non-empty)                                              | "Please select a role"                                                        |
| First Name | 1-100 chars, no HTML                                                      | "First name is required" / "First name must not exceed 100 characters"        |
| Last Name  | 1-100 chars, no HTML                                                      | "Last name is required" / "Last name must not exceed 100 characters"          |
| Email      | RFC-valid email, 5-255 chars                                              | "Please enter a valid email address"                                          |
| Phone      | Matches `(123) 456-7890`, `123-456-7890`, `123.456.7890`, or `1234567890` | "Please enter a valid phone number"                                           |
| Twitter    | 1-15 chars, alphanumeric + underscore                                     | "Invalid Twitter handle (1-15 characters, letters/numbers/underscore)"        |
| Instagram  | 1-30 chars, allows `.` `_` letters numbers                                | "Invalid Instagram handle (1-30 characters, letters/numbers/dots/underscore)" |
| Notes      | Max 5000 chars                                                            | "Text must not exceed 5000 characters"                                        |

### Data Transformations

- **Email:** Lowercased, trimmed, empty string becomes `null`
- **Phone:** Empty string becomes `null`
- **Twitter Handle:** Leading `@` stripped, empty string becomes `null`
- **Instagram Handle:** Leading `@` stripped, empty string becomes `null`
- **Notes:** HTML sanitized (strip dangerous tags), empty string becomes `null`
- **First/Last Name:** HTML stripped, trimmed

### User Errors

- **Submit without school:** Submit button is disabled; prompt banner visible
- **Submit with missing required fields:** Inline errors appear; submit button disabled
- **Submit with invalid optional fields:** Inline errors on those fields; submit blocked until fixed

### Edge Cases

- **Very long name input:** Truncated at 100 characters by validation
- **Pasting formatted text into notes:** HTML stripped/sanitized
- **Rapidly tapping submit:** Button disabled during submission; prevents duplicate creation
- **Switching family context mid-form:** Schools dropdown reloads; form resets
- **Session expires during form fill:** On submit, 401 triggers redirect to login
- **Special characters in names:** Allowed after HTML stripping (accented characters, hyphens, apostrophes)
- **Phone with country code:** Not supported by current regex; only 10-digit US numbers
- **iPad split view:** Form uses adaptive layout (side-by-side fields on wide screens)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and shows school dropdown
- [ ] School dropdown contains all schools for active family
- [ ] Selecting a school reveals the coach form
- [ ] Role picker shows all three options (Head Coach, Assistant Coach, Recruiting Coordinator)
- [ ] Form submits with all required fields filled
- [ ] Form submits with all fields (required + optional) filled
- [ ] Empty optional fields are stored as `null` in database
- [ ] Twitter handle `@coachsmith` is stored as `coachsmith`
- [ ] Instagram handle `@coach.smith` is stored as `coach.smith`
- [ ] Email is lowercased and trimmed before submission
- [ ] On success, navigates to new coach's detail page
- [ ] New coach appears in coaches list on next visit
- [ ] Cancel button navigates back to coaches list without saving

### Validation Tests

- [ ] Cannot submit without selecting a school
- [ ] Cannot submit without selecting a role
- [ ] Cannot submit without first name
- [ ] Cannot submit without last name
- [ ] Invalid email shows error (e.g., "notanemail")
- [ ] Invalid phone shows error (e.g., "123")
- [ ] Invalid Twitter handle shows error (e.g., "this_is_way_too_long_for_twitter")
- [ ] Invalid Instagram handle shows error (e.g., "invalid handle with spaces")
- [ ] Notes exceeding 5000 chars shows error
- [ ] First/last name exceeding 100 chars shows error
- [ ] Fixing a validation error clears the inline error message
- [ ] Error summary shows count and list of errors

### Error Tests

- [ ] Handle network timeout during school fetch (show retry)
- [ ] Handle network timeout during submit (show error, preserve form)
- [ ] Handle 401 (redirect to login)
- [ ] Handle server error 500 (show error, preserve form)
- [ ] Handle no schools (show empty state with link to Add School)
- [ ] Handle no family context (show error message)

### Edge Case Tests

- [ ] Very long names don't break form layout
- [ ] Special characters in names display correctly (accents, hyphens, apostrophes)
- [ ] Pasting HTML into notes strips dangerous tags
- [ ] Double-tap submit doesn't create duplicate coach
- [ ] Keyboard dismissal works correctly for all fields
- [ ] Form scrolls to accommodate keyboard on small devices
- [ ] VoiceOver reads all form labels and error messages
- [ ] Page adapts between iPhone and iPad layouts

### Performance Tests

- [ ] Schools dropdown loads in <1 second on 4G
- [ ] Form submission completes in <2 seconds on 4G
- [ ] No memory leaks when navigating away during submission
- [ ] Keyboard appearance/dismissal is smooth

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **No NCAA lookup:** Coaches are manually entered. NCAA lookup exists only for schools.
- **No duplicate detection:** The web app does not check for duplicate coaches (same name at same school). iOS should match this behavior.
- **No coach photo:** The web form does not support uploading a coach photo. Skip for iOS MVP.
- **Edit uses modal, not page:** On web, editing a coach uses a modal overlay on the detail page, not a separate route. The same `CoachForm` component is reused for both add and edit. iOS should reuse validation logic between Add Coach (full page) and Edit Coach (sheet/modal).
- **Notes sanitization:** Web uses `sanitizeHtml()` for notes. iOS should strip HTML tags from notes since the notes field is plain text on iOS.
- **Validation is client-side only:** The web app validates with Zod on the client before insert. Supabase has column constraints but no server-side Zod validation for coach creation.

### iOS-Specific Considerations

- **Native Picker for role:** Use SwiftUI `Picker` with `.menu` style rather than a custom dropdown
- **Keyboard types:** Use `.emailAddress` keyboard for email, `.phonePad` for phone, `.default` for all other fields
- **Auto-strip @:** On `.onSubmit` or focus loss, strip leading `@` from Twitter and Instagram handles
- **TextEditor placeholder:** SwiftUI `TextEditor` does not have native placeholder support. Implement with an overlay `Text` that hides when content is entered.
- **Form scrolling:** Wrap in `ScrollView` or use `Form` (which scrolls natively) to handle keyboard avoidance
- **Haptic feedback:** Use `UINotificationFeedbackGenerator` for success (`.success`) and error (`.error`) on submission
- **Family-scoped access:** Always use `family_unit_id` from `FamilyManager`, never `user_id` alone

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/coaches/new.vue`
- **Form component:** `/components/Coach/CoachForm.vue`
- **Composables used:**
  - `useCoaches()` - `createCoach(schoolId, coachData)` function
  - `useSchools()` - `fetchSchools()` for dropdown population
  - `useFormValidation()` - Field-level and form-level validation
  - `useFamilyContext()` - Family unit scoping
- **Store mutations:**
  - `useUserStore()` - Current user info for `user_id`
- **Child components:**
  - `CoachForm` - Reusable form for add and edit
  - `FormErrorSummary` - Validation error display at top of form
  - `DesignSystemFieldError` - Per-field inline error text
- **Validation schema:** `/utils/validation/schemas.ts` -> `coachSchema`
- **Validators:** `/utils/validation/validators.ts` -> `emailSchema`, `phoneSchema`, `twitterHandleSchema`, `instagramHandleSchema`, `sanitizedTextSchema`, `richTextSchema`

### API Documentation

- **Insert:** Direct Supabase insert into `coaches` table (no custom API endpoint)
- **Schools fetch:** Direct Supabase query on `schools` table

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** Yes
**Notes:** This page establishes the form-with-validation pattern. Build the validation system generically (field-level validators, error state model, error summary view) so it can be reused for Add School, Add Interaction, and Edit modals. The two-step flow (select prerequisite entity, then show form) also appears in Add Interaction (select coach before logging interaction), so design the step-gating pattern for reuse. For social handles, auto-stripping the `@` on blur is a small UX polish worth including from day one.

---

## Appendix A: Validation Implementation Detail

### Swift Validation Functions

```swift
enum CoachValidator {

  static func validateRole(_ role: CoachRole?) -> String? {
    guard role != nil else { return "Please select a role" }
    return nil
  }

  static func validateFirstName(_ name: String) -> String? {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { return "First name is required" }
    if trimmed.count > 100 { return "First name must not exceed 100 characters" }
    return nil
  }

  static func validateLastName(_ name: String) -> String? {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { return "Last name is required" }
    if trimmed.count > 100 { return "Last name must not exceed 100 characters" }
    return nil
  }

  static func validateEmail(_ email: String) -> String? {
    guard !email.isEmpty else { return nil }  // optional field
    let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if trimmed.count < 5 { return "Email must be at least 5 characters" }
    if trimmed.count > 255 { return "Email must not exceed 255 characters" }
    let emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if trimmed.wholeMatch(of: emailRegex) == nil {
      return "Please enter a valid email address"
    }
    return nil
  }

  static func validatePhone(_ phone: String) -> String? {
    guard !phone.isEmpty else { return nil }  // optional field
    let phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
    if phone.wholeMatch(of: phoneRegex) == nil {
      return "Please enter a valid phone number"
    }
    return nil
  }

  static func validateTwitterHandle(_ handle: String) -> String? {
    guard !handle.isEmpty else { return nil }  // optional field
    let cleaned = handle.hasPrefix("@") ? String(handle.dropFirst()) : handle
    let twitterRegex = /^[A-Za-z0-9_]{1,15}$/
    if cleaned.wholeMatch(of: twitterRegex) == nil {
      return "Invalid Twitter handle (1-15 characters, letters/numbers/underscore)"
    }
    return nil
  }

  static func validateInstagramHandle(_ handle: String) -> String? {
    guard !handle.isEmpty else { return nil }  // optional field
    let cleaned = handle.hasPrefix("@") ? String(handle.dropFirst()) : handle
    let instagramRegex = /^[A-Za-z0-9_.]{1,30}$/
    if cleaned.wholeMatch(of: instagramRegex) == nil {
      return "Invalid Instagram handle (1-30 characters, letters/numbers/dots/underscore)"
    }
    return nil
  }

  static func validateNotes(_ notes: String) -> String? {
    guard !notes.isEmpty else { return nil }  // optional field
    if notes.count > 5000 { return "Notes must not exceed 5000 characters" }
    return nil
  }

  static func validateAll(_ form: CoachFormState) -> CoachFormErrors {
    CoachFormErrors(
      role: validateRole(form.role),
      firstName: validateFirstName(form.firstName),
      lastName: validateLastName(form.lastName),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
      twitterHandle: validateTwitterHandle(form.twitterHandle),
      instagramHandle: validateInstagramHandle(form.instagramHandle),
      notes: validateNotes(form.notes)
    )
  }
}
```

## Appendix B: Submission Flow Detail

### Data Preparation and Insert

```swift
func submitCoach() async {
  // 1. Run full validation
  let errors = CoachValidator.validateAll(formState)
  guard !errors.hasErrors else {
    formErrors = errors
    announceErrorsForAccessibility(errors)
    return
  }

  guard let schoolId = formState.selectedSchoolId,
        let role = formState.role else {
    return
  }

  isSubmitting = true
  submitError = nil

  do {
    // 2. Prepare data (strip @, convert empty to nil, sanitize)
    let input = CoachInsertData(
      schoolId: schoolId,
      userId: familyManager.dataOwnerUserId,
      familyUnitId: familyManager.activeFamilyId,
      role: role.rawValue,
      firstName: formState.firstName.trimmingCharacters(in: .whitespacesAndNewlines),
      lastName: formState.lastName.trimmingCharacters(in: .whitespacesAndNewlines),
      email: nilIfEmpty(formState.email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()),
      phone: nilIfEmpty(formState.phone),
      twitterHandle: nilIfEmpty(stripAtSign(formState.twitterHandle)),
      instagramHandle: nilIfEmpty(stripAtSign(formState.instagramHandle)),
      notes: nilIfEmpty(stripHtmlTags(formState.notes))
    )

    // 3. Insert via Supabase
    let newCoach = try await supabaseManager.insertCoach(input)

    // 4. Success: haptic feedback + navigate
    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.success)

    navigationPath.append(.coachDetail(id: newCoach.id))

  } catch {
    // 5. Error: show message, keep form open
    submitError = "Failed to create coach. Please try again."
    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.error)
  }

  isSubmitting = false
}

// Helper functions
func nilIfEmpty(_ value: String) -> String? {
  value.isEmpty ? nil : value
}

func stripAtSign(_ handle: String) -> String {
  handle.hasPrefix("@") ? String(handle.dropFirst()) : handle
}

func stripHtmlTags(_ text: String) -> String {
  text.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
}
```

## Appendix C: Add Coach vs Edit Coach Comparison

| Aspect            | Add Coach                                         | Edit Coach                                   |
| ----------------- | ------------------------------------------------- | -------------------------------------------- |
| **Route**         | Full page (`/coaches/new`)                        | Modal/sheet on detail page (`/coaches/{id}`) |
| **School**        | Dropdown selection (required first step)          | Pre-filled, not editable                     |
| **Form Fields**   | 8 fields (role + name + contact + social + notes) | Same 8 fields                                |
| **Validation**    | Same `coachSchema`                                | Same `coachSchema`                           |
| **Submit Action** | Supabase INSERT                                   | Supabase UPDATE                              |
| **On Success**    | Navigate to new coach detail                      | Dismiss modal, refresh detail                |
| **On Cancel**     | Navigate back to coaches list                     | Dismiss modal                                |
| **Button Text**   | "Add Coach" / "Adding..."                         | "Save Changes" / "Saving..."                 |
| **Initial Data**  | All empty                                         | Pre-populated from existing coach            |

iOS should reuse the form view component for both flows, accepting an optional `initialData` parameter (nil for add, populated for edit) and a submission closure.
