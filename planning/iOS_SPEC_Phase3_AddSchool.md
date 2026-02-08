# iOS Page Specification: Add School

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Add School
**Web Route:** `/schools/new`
**Priority:** MVP / Phase 3
**Complexity:** High (two entry modes, autocomplete, NCAA lookup, duplicate detection, College Scorecard enrichment)
**Estimated Time:** 3-4 days

---

## 1. Overview

### Purpose

Allow the user to add a new school to their recruiting list. The page supports two entry modes: an autocomplete mode that searches a college database and auto-populates fields (including NCAA division/conference and College Scorecard academic data), and a manual mode where the user types all fields directly. After submission, the school is created in Supabase and the user is navigated to the new school's detail page.

### Key User Actions

- Toggle between autocomplete (college database search) and manual entry
- Search for a college by name using the autocomplete dropdown
- Review auto-populated fields (name, location, website, division, conference)
- Fill in or override form fields (division, conference, website, social handles, notes, status)
- View read-only College Scorecard data (student size, admission rate, tuition, coordinates)
- Submit the form to create a new school
- Cancel and return to the schools list

### Success Criteria

- User can create a school using autocomplete with auto-populated fields
- User can create a school using manual entry
- Auto-filled fields display a visible "(auto-filled)" indicator
- Duplicate detection warns the user before creating a school that already exists
- Form validation prevents submission of invalid data (missing name, bad URL, etc.)
- Created school appears in the schools list and navigates to its detail page
- College Scorecard data (when available) is stored in `academic_info`

---

## 2. User Flows

### Primary Flow: Autocomplete Mode

```
1. User navigates to Add School page
2. "Search college database" toggle is ON by default
3. User types a college name (minimum 3 characters) into the search bar
4. Dropdown shows matching colleges (name + location)
5. User selects a college from the dropdown
6. System auto-populates: name, location, website
7. System runs parallel lookups:
   a. NCAA lookup -> division, conference, logo
   b. College Scorecard -> student size, admission rate, tuition, lat/lng
8. Auto-filled fields show blue "(auto-filled)" badge
9. User optionally fills: notes, status, social handles
10. User taps "Add School"
11. System validates all fields
12. System checks for duplicates (name, domain, NCAA ID)
13. If duplicate found -> show DuplicateSchoolDialog
    a. User taps "Cancel" -> return to form
    b. User taps "Proceed Anyway" -> continue
14. System creates school in Supabase
15. System navigates to /schools/{newSchoolId}
```

### Alternative Flow: Manual Entry Mode

```
1. User toggles OFF "Search college database"
2. Autocomplete search bar is hidden
3. Plain text input for school name appears
4. User fills all fields manually
5. Steps 10-15 from Primary Flow apply
```

### Alternative Flow: Clear Selection

```
1. User has selected a college from autocomplete
2. Green confirmation card shows "Selected: {college name}"
3. User taps "Clear"
4. All auto-filled fields are cleared
5. User can search again or switch to manual entry
```

### Error Scenarios

```
Error: College Scorecard API unavailable
- User sees: "College search is not configured. Please enter the school manually."
- Recovery: Toggle to manual entry mode

Error: No autocomplete results
- User sees: "No colleges found. Try a different search or switch to manual entry."
- Recovery: Refine search or toggle to manual entry

Error: NCAA lookup fails
- User sees: No error displayed (silent failure, debug logged)
- Recovery: Division/conference remain empty, user fills manually

Error: Duplicate school detected
- User sees: DuplicateSchoolDialog with existing school details and match type
- Recovery: Cancel to go back, or Proceed Anyway to create

Error: Validation failure
- User sees: Inline field errors + error summary at top of form
- Recovery: Fix highlighted fields and re-submit

Error: Network failure on submission
- User sees: Error alert "Failed to create school"
- Recovery: Retry submission
```

---

## 3. Data Models

### School Create Input

```swift
struct SchoolCreateInput {
  let name: String                    // Required, 2-255 chars
  let location: String?               // Optional, max 255
  let city: String?                   // Optional, max 100
  let state: String?                  // Optional, 2-letter uppercase
  let division: Division?             // Optional
  let conference: String?             // Optional, max 100
  let website: String?                // Optional, valid URL
  let twitterHandle: String?          // Optional, regex validated
  let instagramHandle: String?        // Optional, regex validated
  let notes: String?                  // Optional, max 5000, sanitized
  let status: SchoolStatus            // Required, default .researching
  let isFavorite: Bool                // Default false
  let pros: [String]                  // Default empty
  let cons: [String]                  // Default empty
  let academicInfo: AcademicInfo?     // From College Scorecard
}
```

### College Search Result (Autocomplete)

```swift
struct CollegeSearchResult: Identifiable {
  let id: String
  let name: String
  let city: String
  let state: String
  let location: String      // "{city}, {state}"
  let website: String?
}
```

### NCAA Lookup Result

```swift
struct NcaaLookupResult {
  let division: Division        // D1, D2, or D3
  let conference: String?
  let logo: String?             // URL to school logo
}
```

### College Scorecard Data

```swift
struct CollegeScorecardData {
  let id: String
  let name: String
  let website: String?
  let address: String?             // "City, State"
  let city: String?
  let state: String?
  let studentSize: Int?
  let carnegieSize: String?        // "Small", "Medium", "Large"
  let enrollmentAll: Int?
  let admissionRate: Double?       // 0.0 - 1.0
  let studentFacultyRatio: Double?
  let tuitionInState: Int?
  let tuitionOutOfState: Int?
  let latitude: Double?
  let longitude: Double?
}
```

### Duplicate Detection Result

```swift
struct DuplicateResult {
  let duplicate: School?
  let matchType: DuplicateMatchType?
}

enum DuplicateMatchType: String {
  case name = "name"
  case domain = "domain"
  case ncaaId = "ncaa_id"

  var displayLabel: String {
    switch self {
    case .name: return "Name Match"
    case .domain: return "Website Domain"
    case .ncaaId: return "NCAA ID"
    }
  }

  var badgeColor: Color {
    switch self {
    case .name: return .red
    case .domain: return .yellow
    case .ncaaId: return .orange
    }
  }
}
```

### Form State Model

```swift
struct AddSchoolFormState {
  var name: String = ""
  var location: String = ""
  var division: Division? = nil
  var conference: String = ""
  var website: String = ""
  var twitterHandle: String = ""
  var instagramHandle: String = ""
  var notes: String = ""
  var status: SchoolStatus = .researching
  var isAutocompleteEnabled: Bool = true

  var autoFilledFields: Set<AutoFillableField> = []

  var isValid: Bool {
    name.trimmingCharacters(in: .whitespaces).count >= 2
  }
}

enum AutoFillableField: String, CaseIterable {
  case name
  case location
  case website
  case division
  case conference
}
```

### Reused Models (from Phase 2)

- `School` - Full school model (see Phase 2 spec)
- `Division` - D1, D2, D3, NAIA, JUCO enum
- `SchoolStatus` - researching, contacted, interested, offer_received, committed, declined
- `AcademicInfo` - latitude, longitude, state, studentSize, admissionRate, etc.

### Data Origin

- **College Search:** College Scorecard API (`api.data.gov`) - real-time search
- **NCAA Lookup:** Local database (built-in `ncaaDatabase`) with session caching
- **College Scorecard Enrichment:** College Scorecard API - fetched on college selection
- **Duplicate Detection:** Local comparison against cached schools list
- **School Creation:** Supabase `schools` table insert
- **Mutations:** Create only (no update/delete on this page)

---

## 4. API Integration

### Supabase: Create School

```
supabase.from("schools")
  .insert([{
    name: "University of Florida",
    location: "Gainesville, Florida",
    division: "D1",
    conference: "SEC",
    website: "https://ufl.edu",
    twitter_handle: "@GatorsBaseball",
    instagram_handle: "@gaborbaseball",
    notes: "Top program in the SEC",
    status: "researching",
    is_favorite: false,
    pros: [],
    cons: [],
    academic_info: {
      student_size: 52218,
      admission_rate: 0.296,
      tuition_in_state: 6381,
      tuition_out_of_state: 28658,
      latitude: 29.6516,
      longitude: -82.3248
    },
    user_id: dataOwnerUserId,
    family_unit_id: activeFamilyId,
    created_by: currentUserId,
    updated_by: currentUserId
  }])
  .select()
  .single()

Response (Success):
{
  "id": "uuid-string",
  "name": "University of Florida",
  ...all fields
}

Error Codes:
- 401: Not authenticated
- 403: RLS policy violation
- 409: Unique constraint violation
```

### College Scorecard API: Search Colleges (Autocomplete)

```
GET https://api.data.gov/ed/collegescorecard/v1/schools
  ?api_key={key}
  &school.name={query}
  &fields=id,school.name,school.city,school.state,school.school_url,...
  &per_page=10

Response:
{
  "results": [
    {
      "id": 134130,
      "school.name": "University of Florida",
      "school.city": "Gainesville",
      "school.state": "FL",
      "school.school_url": "www.ufl.edu",
      "location.lat": 29.6516,
      "location.lon": -82.3248,
      "latest.student.size": 52218,
      "latest.admissions.admission_rate.overall": 0.296,
      "latest.cost.tuition.in_state": 6381,
      "latest.cost.tuition.out_of_state": 28658
    }
  ],
  "metadata": { "total": 1, "page": 0, "per_page": 10 }
}

Error Codes:
- 401: Invalid API key
- 429: Rate limit exceeded
- 5xx: Server error
```

### NCAA Lookup (Local Database)

```
Input: School name string
Process:
  1. Normalize name (remove "University", "College", etc.)
  2. Search D1 schools, then D2, then D3
  3. Match using: exact, partial (>8 chars), fuzzy (Levenshtein distance <= 2)
  4. Cache result in session map

Output: { division: "D1", conference: "SEC" } or null
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Required Context:** `user_id`, `family_unit_id` from active family

---

## 5. State Management

### Page-Level State

```swift
@State var formState = AddSchoolFormState()
@State var isLoading = false
@State var isSubmitting = false
@State var error: String? = nil

// Autocomplete
@State var searchQuery: String = ""
@State var searchResults: [CollegeSearchResult] = []
@State var isSearching = false
@State var selectedCollege: CollegeSearchResult? = nil

// Enrichment data
@State var ncaaResult: NcaaLookupResult? = nil
@State var scorecardData: CollegeScorecardData? = nil
@State var schoolLogo: String? = nil
@State var isEnrichmentLoading = false
@State var isScorecardFetched = false
@State var enrichmentError: String? = nil

// Duplicate detection
@State var showDuplicateDialog = false
@State var duplicateResult: DuplicateResult? = nil

// Validation
@State var fieldErrors: [String: String] = [:]
```

### Persistence Across Navigation

- Form state clears when navigating away (no persistence needed)
- NCAA lookup cache persists for session (module-level Map)
- College Scorecard cache persists for session (module-level Map)

### Shared State

- **FamilyManager:** `activeFamilyId` and `dataOwnerUserId` for Supabase insert
- **SchoolsStore:** Cached schools list for duplicate detection
- **AuthManager:** Current user ID for `created_by` / `updated_by`

---

## 6. UI/UX Details

### Layout Structure

```
[Navigation Bar]
  - Back: "< Schools" (back to schools list)
  - Title: "Add New School"

[Header Card]
  - Blue gradient background
  - Title: "Add New School"
  - Subtitle: "Add a school to your recruiting list"

[Toggle Section]
  - Toggle: "Search college database" (default ON)

[Selected College Card] (conditional - when college selected)
  - Green background
  - Shows: name, location, logo (if available)
  - "Fetching college data..." spinner (during enrichment)
  - "College data and map coordinates loaded" (after enrichment)
  - [Clear] button to deselect

[Form Sections]
  Section 1: School Name
    - Autocomplete mode: Search bar with dropdown
    - Manual mode: Text input

  Section 2: Location
    - Text input, placeholder "e.g., Gainesville, Florida"

  Section 3: Division & Conference (side-by-side)
    - Division: Picker (D1, D2, D3, NAIA, JUCO) + "(auto-filled)" badge
    - Conference: Text input + "(auto-filled)" badge

  Section 4: Website
    - Text input, placeholder "https://example.com"

  Section 5: Social Media (side-by-side)
    - Twitter Handle: Text input, placeholder "@handle"
    - Instagram Handle: Text input, placeholder "@handle"

  Section 6: Notes
    - Multi-line text editor, 4 lines visible

  Section 7: Initial Status
    - Picker: Researching (default), Contacted, Interested,
              Offer Received, Declined, Committed

  Section 8: College Scorecard Data (conditional - read-only)
    - Only shown when scorecardData is available
    - Grid of data: Student Size, Size Category, Total Enrollment,
      Admission Rate, Student-Faculty Ratio, Tuition In/Out-of-State,
      Map Coordinates indicator

[Action Buttons]
  - "Add School" primary button (blue gradient)
  - "Cancel" secondary button (outline)
```

### Autocomplete Dropdown

```
┌──────────────────────────────────┐
│ 🔍 Type college name...          │
├──────────────────────────────────┤
│ University of Florida            │
│ Gainesville, FL                  │
├──────────────────────────────────┤
│ Florida State University         │
│ Tallahassee, FL                  │
├──────────────────────────────────┤
│ University of Central Florida    │
│ Orlando, FL                      │
└──────────────────────────────────┘
```

- Minimum 3 characters to trigger search
- Shows loading spinner while searching
- Shows "No colleges found" if no results
- Keyboard navigable (arrow keys + enter) on iPad
- Dismiss on tap outside

### Selected College Confirmation Card

```
┌──────────────────────────────────────┐
│ ✅ Selected: University of Florida    │
│    Gainesville, FL         [Logo] [x] │
│    ✓ College data and map             │
│      coordinates loaded               │
└──────────────────────────────────────┘
```

- Green background (`Color.green.opacity(0.1)`)
- Green border
- Logo image (if available from NCAA lookup) in top-right
- "Clear" button to deselect
- Loading indicator during enrichment

### Auto-Filled Badge

- Blue text: "(auto-filled)" next to field label
- Shown for: name, location, website, division, conference
- User can always override auto-filled values

### Duplicate School Dialog

```
┌──────────────────────────────────────┐
│ ⚠️ Duplicate School Detected         │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ A school already exists that   │   │
│ │ matches your entry...          │   │
│ └────────────────────────────────┘   │
│                                      │
│ Match Type: [Name Match]             │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Existing School                │   │
│ │ University of Florida          │   │
│ │ Division: D1 - SEC             │   │
│ │ Location: Gainesville, FL      │   │
│ └────────────────────────────────┘   │
│                                      │
│        [Cancel]  [Proceed Anyway]    │
└──────────────────────────────────────┘
```

- Presented as `.alert` or `.sheet` on iOS
- Match type badge: Name (red), Domain (yellow), NCAA ID (orange)
- Shows existing school's name, division, conference, location

### College Scorecard Section (Read-Only)

```
┌──────────────────────────────────────┐
│ College Scorecard Data               │
│ ┌────────────┬─────────────────────┐ │
│ │ Student    │ Size Category       │ │
│ │ Size       │ Large               │ │
│ │ 52,218     │                     │ │
│ ├────────────┼─────────────────────┤ │
│ │ Admission  │ Student-Faculty     │ │
│ │ Rate       │ Ratio               │ │
│ │ 29.6%      │ 17:1                │ │
│ ├────────────┼─────────────────────┤ │
│ │ Tuition    │ Tuition             │ │
│ │ (In-State) │ (Out-of-State)      │ │
│ │ $6,381     │ $28,658             │ │
│ ├────────────┼─────────────────────┤ │
│ │ Location   │                     │ │
│ │ ✓ Map      │                     │ │
│ │ coordinates│                     │ │
│ └────────────┴─────────────────────┘ │
└──────────────────────────────────────┘
```

- Blue background tint
- 2-column grid layout using `LazyVGrid`
- Only shows fields that have non-null values

### Form Validation

- **Real-time:** Validate on field blur (focus loss)
- **On submit:** Full schema validation before API call
- **Error display:** Red text below each invalid field
- **Error summary:** Red banner at top of form listing all errors
- **Submit disabled:** When `name` is empty or `hasErrors` is true

### Loading States

```
Search Loading:
- Inline spinner in autocomplete dropdown
- "Searching..." text

Enrichment Loading:
- "Fetching college data..." text in selected college card
- Blue spinner icon

Submission Loading:
- "Add School" button text changes to "Adding..."
- Button disabled + opacity reduced
- Cancel button disabled
```

### Empty/Default State

- Form loads with all fields empty
- "Search college database" toggle ON
- Status defaults to "Researching"
- No College Scorecard section visible

### Accessibility

- **VoiceOver:** All form fields have descriptive labels
- **Auto-filled badge:** Read as "auto-filled" after field label
- **Autocomplete dropdown:** Announce result count, selected item
- **Duplicate dialog:** Announce as alert with match type and school name
- **Toggle:** "Search college database, switch button, on/off"
- **Submit button:** Announce disabled state and loading state
- **Touch Targets:** All buttons 44pt minimum
- **Dynamic Type:** All text supports scaling
- **Keyboard:** Full keyboard navigation support (iPad)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (data insert + auth)
- Foundation (URL validation, string processing)

### Third-Party Libraries

- None required

### External Services

- Supabase PostgreSQL (schools table insert)
- College Scorecard API (college search + enrichment)
- NCAA database (local, bundled with app)

### Internal Dependencies

- Schools List page (Phase 2) must exist for navigation
- School Detail page (Phase 4) must exist for post-creation navigation
- Family context must be loaded (activeFamilyId, dataOwnerUserId)
- Schools store must have cached schools list for duplicate detection

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout on autocomplete search:** Show "Unable to search colleges" in dropdown
- **Timeout on enrichment:** Silent failure; fields remain empty for manual entry
- **Timeout on submission:** Show "Failed to create school" alert with retry
- **No internet:** Show offline indicator; disable form submission
- **Server error (5xx):** Show generic error message with retry

### Data Errors

- **Invalid API key:** Show "College search is not configured" message
- **Rate limited (429):** Show "Too many requests. Please try again in a moment."
- **Empty search results:** Show "No colleges found" in dropdown
- **NCAA lookup miss:** Silent (no division/conference auto-filled)
- **College Scorecard miss:** Silent (no academic data section shown)
- **Null fields in API response:** Skip display; only show non-null values
- **Invalid URL in website field:** Show inline validation error

### User Errors

- **Name too short (< 2 chars):** Inline error "School name must be at least 2 characters"
- **Invalid URL format:** Inline error on blur
- **Invalid Twitter handle:** Inline error with pattern hint
- **Invalid Instagram handle:** Inline error with pattern hint
- **Notes too long (> 5000 chars):** Inline error with character count
- **Empty required field:** "Add School" button stays disabled

### Edge Cases

- **User selects college then toggles to manual:** Clear selection, keep form data
- **User types < 3 chars in autocomplete:** No search triggered, no error
- **User rapidly types in autocomplete:** Debounce search (300ms recommended)
- **User overrides auto-filled field:** Remove "(auto-filled)" badge for that field
- **College Scorecard returns duplicate IDs:** Deduplicate by school ID
- **Very long school name from autocomplete:** Truncate in dropdown, full name in form
- **Special characters in school name:** Sanitize before insert
- **School with same name but different program:** Duplicate dialog allows "Proceed Anyway"
- **Concurrent form submissions:** Disable button after first tap
- **Keyboard covers form fields:** Scroll form to keep active field visible
- **Offline with cached schools:** Duplicate detection still works against local cache

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads with empty form and autocomplete toggle ON
- [ ] Typing 3+ chars in autocomplete triggers college search
- [ ] Search results display with name and location
- [ ] Selecting a college auto-populates name, location, website
- [ ] Auto-filled fields show "(auto-filled)" badge
- [ ] NCAA lookup auto-fills division and conference (when found)
- [ ] College Scorecard data section appears with correct values
- [ ] Toggling to manual mode hides autocomplete, shows text input
- [ ] Division picker shows all 5 options (D1, D2, D3, NAIA, JUCO)
- [ ] Status picker defaults to "Researching" with all 6 options
- [ ] "Clear" button on selected college card resets all auto-filled fields
- [ ] Submitting valid form creates school and navigates to detail page
- [ ] Cancel button navigates back to schools list

### Validation Tests

- [ ] Empty name disables "Add School" button
- [ ] Name < 2 chars shows inline error
- [ ] Name > 255 chars shows inline error
- [ ] Invalid website URL shows inline error on blur
- [ ] Invalid Twitter handle shows inline error
- [ ] Invalid Instagram handle shows inline error
- [ ] Notes > 5000 chars shows inline error
- [ ] All validation errors clear when corrected

### Duplicate Detection Tests

- [ ] Exact name match triggers duplicate dialog
- [ ] Domain match triggers duplicate dialog with "Website Domain" badge
- [ ] NCAA ID match triggers duplicate dialog with "NCAA ID" badge
- [ ] "Cancel" in duplicate dialog returns to form
- [ ] "Proceed Anyway" in duplicate dialog creates school
- [ ] Duplicate detection works against locally cached schools

### Error Tests

- [ ] Handle network timeout on autocomplete gracefully
- [ ] Handle network timeout on form submission
- [ ] Handle 401 (redirect to login)
- [ ] Handle College Scorecard API unavailable
- [ ] Handle NCAA lookup failure (silent, fields stay empty)
- [ ] Handle submission failure with error message
- [ ] Double-tap on submit does not create duplicate schools

### Edge Case Tests

- [ ] Very long school names don't break layout
- [ ] Special characters in school name handled correctly
- [ ] Switching between autocomplete and manual mode preserves entered data
- [ ] Rapidly typing in autocomplete (debounce works)
- [ ] Keyboard dismissal doesn't obscure form fields
- [ ] Form works on both iPhone and iPad
- [ ] VoiceOver reads all labels, errors, and auto-filled badges
- [ ] Dynamic Type scaling doesn't break form layout

### Performance Tests

- [ ] Autocomplete search responds in < 1 second
- [ ] NCAA lookup (local) completes in < 100ms
- [ ] Form submission completes in < 3 seconds on 4G
- [ ] No memory leaks when navigating away mid-enrichment
- [ ] Session cache prevents duplicate API calls for same college

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **College Scorecard API key:** Required in runtime config (`collegeScorecardApiKey`). Without it, autocomplete falls back to manual entry.
- **NCAA database is local:** Only covers D1, D2, D3. NAIA and JUCO are available as manual selections but are not auto-detected.
- **Fuzzy matching limitations:** Levenshtein distance threshold of 2 can miss some school name variations (e.g., "UC Berkeley" vs "University of California, Berkeley").
- **College Scorecard data gaps:** `carnegieSize`, `enrollmentAll`, and `studentFacultyRatio` are often null in the API response.
- **Logo fetching:** The web version fetches favicons asynchronously after school creation. The NCAA lookup also returns logos for some schools.
- **Duplicate detection runs against local cache only:** If schools list is not loaded, duplicate detection will miss matches.
- **Division options in form vs NCAA lookup:** The form select only shows D1, D2, D3. NAIA and JUCO are in the validation schema but not in the form dropdown. The web SchoolForm.vue only lists D1/D2/D3 in the select options. iOS should include all 5 in the Picker.

### iOS-Specific Considerations

- **Autocomplete search bar:** Use a native `TextField` with a `List` overlay for results instead of the web's custom dropdown. Consider using `.searchable()` modifier on a `NavigationStack` for a native feel.
- **Debouncing:** Implement a 300ms debounce on the search query using `Combine` or `Task.sleep`.
- **Keyboard handling:** Use `@FocusState` to manage focus and scroll the form to keep the active field visible.
- **Picker for Division/Status:** Use native `Picker` with `.menu` style for compact dropdowns.
- **College Scorecard API key:** Must be bundled securely (not hardcoded). Consider fetching from Supabase config or using iOS keychain.
- **NCAA database bundling:** The web version uses a large JavaScript module (`ncaaDatabase`). For iOS, bundle as a JSON resource file or Swift static data.
- **MVP simplification:** For the initial iOS release, consider deferring College Scorecard enrichment and NCAA auto-lookup. Let users fill all fields manually and add enrichment in a follow-up release. This reduces API dependencies and complexity.
- **Form scrolling:** Wrap the form in a `ScrollView` to ensure all fields are accessible, especially when the keyboard is shown.
- **Haptic feedback:** Add a light haptic when a college is selected from autocomplete and when the school is successfully created.

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/schools/new.vue`
- **Components:**
  - `SchoolForm.vue` - Main form with validation
  - `SchoolAutocomplete.vue` - College database search dropdown
  - `DuplicateSchoolDialog.vue` - Duplicate detection modal
  - `FormErrorSummary.vue` - Validation error summary banner
  - `DesignSystem/FieldError.vue` - Inline field error display
- **Composables used:**
  - `useSchools()` - `createSchool`, `findDuplicate`, `hasDuplicate`
  - `useNcaaLookup()` - `lookupDivision` (NCAA division/conference lookup)
  - `useCollegeData()` - `fetchByName` (College Scorecard enrichment)
  - `useCollegeAutocomplete()` - `searchColleges` (autocomplete dropdown)
  - `useFormValidation()` - Form validation state management
- **Validation schema:** `utils/validation/schemas.ts` - `schoolSchema`
- **NCAA database:** `composables/ncaaDatabase.ts` - `DIVISION_SCHOOLS`

### API Documentation

- **College Scorecard API:** https://api.data.gov/ed/collegescorecard/
- **Supabase schools table:** See database schema in `/types/database.ts`
- **Cascade delete (not used on this page):** `POST /api/schools/{id}/cascade-delete`

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** Yes
**Notes:** This is the most complex form page in the app due to two entry modes, external API enrichment, and duplicate detection. For MVP, consider implementing manual mode first (Phase 3a) and adding autocomplete + enrichment as a fast-follow (Phase 3b). The duplicate detection logic is straightforward since it runs against the locally cached schools list. The NCAA database should be bundled as a static resource in the iOS app rather than making network calls.

---

## Appendix A: Validation Rules Reference

### Field Validation Summary

```swift
struct SchoolFormValidator {

  static func validateName(_ name: String) -> String? {
    let trimmed = name.trimmingCharacters(in: .whitespaces)
    if trimmed.count < 2 {
      return "School name must be at least 2 characters"
    }
    if trimmed.count > 255 {
      return "School name must not exceed 255 characters"
    }
    return nil
  }

  static func validateWebsite(_ url: String) -> String? {
    guard !url.isEmpty else { return nil }
    let pattern = #"^https?://.+"#
    if url.range(of: pattern, options: .regularExpression) == nil {
      return "Please enter a valid URL (e.g., https://example.com)"
    }
    return nil
  }

  static func validateTwitterHandle(_ handle: String) -> String? {
    guard !handle.isEmpty else { return nil }
    let pattern = #"^@?[A-Za-z0-9_]{1,15}$"#
    if handle.range(of: pattern, options: .regularExpression) == nil {
      return "Invalid Twitter handle format"
    }
    return nil
  }

  static func validateInstagramHandle(_ handle: String) -> String? {
    guard !handle.isEmpty else { return nil }
    let pattern = #"^@?[A-Za-z0-9_.]{1,30}$"#
    if handle.range(of: pattern, options: .regularExpression) == nil {
      return "Invalid Instagram handle format"
    }
    return nil
  }

  static func validateNotes(_ notes: String) -> String? {
    if notes.count > 5000 {
      return "Notes must not exceed 5,000 characters"
    }
    return nil
  }

  static func validateLocation(_ location: String) -> String? {
    if location.count > 255 {
      return "Location must not exceed 255 characters"
    }
    return nil
  }

  static func validateConference(_ conference: String) -> String? {
    if conference.count > 100 {
      return "Conference must not exceed 100 characters"
    }
    return nil
  }
}
```

## Appendix B: Duplicate Detection Logic

```swift
struct DuplicateDetector {

  /// Check all duplicate criteria in priority order: name > domain > NCAA ID
  static func findDuplicate(
    in existingSchools: [School],
    for input: SchoolCreateInput
  ) -> DuplicateResult {

    // 1. Name match (case-insensitive exact)
    if let nameMatch = existingSchools.first(where: {
      $0.name.lowercased() == input.name.trimmingCharacters(in: .whitespaces).lowercased()
    }) {
      return DuplicateResult(duplicate: nameMatch, matchType: .name)
    }

    // 2. Domain match (extract hostname, compare)
    if let website = input.website,
       let inputDomain = extractDomain(from: website) {
      if let domainMatch = existingSchools.first(where: {
        guard let existingDomain = extractDomain(from: $0.website ?? "") else { return false }
        return existingDomain == inputDomain
      }) {
        return DuplicateResult(duplicate: domainMatch, matchType: .domain)
      }
    }

    // 3. NCAA ID match (case-insensitive)
    // (NCAA ID is not part of the create form, but included for completeness
    //  in case it's derived from NCAA lookup)

    return DuplicateResult(duplicate: nil, matchType: nil)
  }

  private static func extractDomain(from urlString: String) -> String? {
    guard let url = URL(string: urlString),
          let host = url.host else { return nil }
    return host.replacingOccurrences(of: "^www\\.", with: "", options: .regularExpression)
  }
}
```

## Appendix C: Submission Flow

```swift
func submitSchool() async {
  guard formState.isValid else { return }

  // 1. Validate all fields
  let errors = validateAllFields()
  guard errors.isEmpty else {
    fieldErrors = errors
    return
  }

  // 2. Check for duplicates
  let duplicateCheck = DuplicateDetector.findDuplicate(
    in: schoolsStore.schools,
    for: buildCreateInput()
  )
  if duplicateCheck.duplicate != nil {
    duplicateResult = duplicateCheck
    showDuplicateDialog = true
    return  // Wait for user decision
  }

  // 3. Proceed with creation
  await createSchool()
}

func createSchool() async {
  isSubmitting = true
  error = nil

  do {
    let input = buildCreateInput()

    // Insert into Supabase
    let response = try await supabase
      .from("schools")
      .insert([
        "name": input.name,
        "location": input.location as Any,
        "division": input.division?.rawValue as Any,
        "conference": input.conference as Any,
        "website": input.website as Any,
        "twitter_handle": input.twitterHandle as Any,
        "instagram_handle": input.instagramHandle as Any,
        "notes": input.notes as Any,
        "status": input.status.rawValue,
        "is_favorite": false,
        "pros": [] as [String],
        "cons": [] as [String],
        "academic_info": encodeAcademicInfo(scorecardData) as Any,
        "user_id": familyManager.dataOwnerUserId,
        "family_unit_id": familyManager.activeFamilyId,
        "created_by": authManager.currentUserId,
        "updated_by": authManager.currentUserId,
      ])
      .select()
      .single()
      .execute()

    let newSchool = try response.decoded(as: School.self)

    // 4. Update local schools cache
    schoolsStore.appendSchool(newSchool)

    // 5. Navigate to school detail
    navigationPath.append(.schoolDetail(id: newSchool.id))

  } catch {
    self.error = "Failed to create school: \(error.localizedDescription)"
  }

  isSubmitting = false
}
```

## Appendix D: NCAA Database Bundling Strategy

The web app uses a large TypeScript module (`composables/ncaaDatabase.ts`) containing arrays of school objects organized by division (D1, D2, D3). For iOS:

**Recommended approach: Bundle as JSON resource**

```swift
// NcaaDatabase.swift

struct NcaaSchoolInfo: Codable {
  let name: String
  let conference: String
}

struct NcaaDatabase {
  static let shared = NcaaDatabase()

  let d1Schools: [NcaaSchoolInfo]
  let d2Schools: [NcaaSchoolInfo]
  let d3Schools: [NcaaSchoolInfo]

  private init() {
    d1Schools = Self.loadSchools(from: "ncaa_d1")
    d2Schools = Self.loadSchools(from: "ncaa_d2")
    d3Schools = Self.loadSchools(from: "ncaa_d3")
  }

  private static func loadSchools(from filename: String) -> [NcaaSchoolInfo] {
    guard let url = Bundle.main.url(forResource: filename, withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let schools = try? JSONDecoder().decode([NcaaSchoolInfo].self, from: data)
    else { return [] }
    return schools
  }

  /// Look up division and conference for a school name
  func lookup(schoolName: String) -> NcaaLookupResult? {
    let normalized = normalizeSchoolName(schoolName)

    for school in d1Schools where schoolNameMatches(normalized, normalizeSchoolName(school.name)) {
      return NcaaLookupResult(division: .d1, conference: school.conference, logo: nil)
    }
    for school in d2Schools where schoolNameMatches(normalized, normalizeSchoolName(school.name)) {
      return NcaaLookupResult(division: .d2, conference: school.conference, logo: nil)
    }
    for school in d3Schools where schoolNameMatches(normalized, normalizeSchoolName(school.name)) {
      return NcaaLookupResult(division: .d3, conference: school.conference, logo: nil)
    }

    return nil
  }
}
```

Export the web database to JSON files during build:

1. Extract `DIVISION_SCHOOLS.D1`, `.D2`, `.D3` arrays
2. Save as `ncaa_d1.json`, `ncaa_d2.json`, `ncaa_d3.json`
3. Add to iOS app bundle as resource files
