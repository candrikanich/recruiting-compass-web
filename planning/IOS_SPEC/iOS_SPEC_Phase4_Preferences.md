# iOS Page Specification: Preferences Pages

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Preferences (5 sub-pages)
**Web Routes:** `/settings/player-details`, `/settings/school-preferences`, `/settings/notifications`, `/settings/dashboard`, `/settings/location`
**Priority:** MVP / Phase 4 (Medium - Personalization)
**Complexity:** Medium (multiple form pages, V2 category-based persistence)
**Estimated Time:** 4-5 days total

---

## 1. Overview

### Purpose

Five settings pages that let users personalize their recruiting experience: athletic profile, school preference criteria, notification controls, dashboard widget visibility, and home location for distance calculations.

### Key User Actions

- **Player Details:** Edit athletic profile (sport, position, stats, academics, social, contact info)
- **School Preferences:** Set and prioritize school criteria, apply templates, mark dealbreakers
- **Notifications:** Toggle notification types on/off, set follow-up reminder frequency
- **Dashboard:** Show/hide summary stats cards and dashboard widgets
- **Location:** Set home address and coordinates for distance calculations

### Success Criteria

- All preferences persist across sessions via V2 category API
- Player details: Only athletes can edit; parents see read-only
- School preferences: Templates pre-fill criteria; drag-to-reorder priorities
- Notifications: Toggles take effect immediately for future notifications
- Dashboard: Widget visibility reflects on dashboard page
- Location: Coordinates auto-detect from address via geocoding

---

## 2. Sub-Page Specifications

---

### 2A. Player Details (`/settings/player-details`)

#### Data Model

```swift
struct PlayerDetails: Codable {
    // Basic Info
    var graduationYear: Int?
    var highSchool: String?
    var clubTeam: String?

    // Athletic Profile
    var primarySport: String?
    var primaryPosition: String?
    var positions: [String]?

    // Physical Stats
    var bats: String?             // "L" | "R" | "S"
    var throws_: String?          // "L" | "R" (renamed to avoid Swift keyword)
    var heightInches: Int?
    var weightLbs: Int?

    // Academics
    var gpa: Double?              // 0.0-5.0
    var satScore: Int?            // 400-1600
    var actScore: Int?            // 1-36

    // External IDs
    var ncaaId: String?
    var perfectGameId: String?
    var prepBaseballId: String?

    // Social Media
    var twitterHandle: String?
    var instagramHandle: String?
    var tiktokHandle: String?
    var facebookUrl: String?

    // Contact
    var phone: String?
    var email: String?
    var allowSharePhone: Bool?
    var allowShareEmail: Bool?

    // School Info
    var schoolName: String?
    var schoolAddress: String?
    var schoolCity: String?
    var schoolState: String?      // 2-char uppercase

    // High School Teams (per grade)
    var ninthGradeTeam: String?
    var ninthGradeCoach: String?
    var tenthGradeTeam: String?
    var tenthGradeCoach: String?
    var eleventhGradeTeam: String?
    var eleventhGradeCoach: String?
    var twelfthGradeTeam: String?
    var twelfthGradeCoach: String?

    // Travel Team
    var travelTeamYear: Int?
    var travelTeamName: String?
    var travelTeamCoach: String?
}
```

#### Form Sections (iOS)

1. **Profile Photo** — Camera/library picker, 5MB max, auto-compress
2. **Basic Information** — Graduation year (picker), high school, club team
3. **Athletic Profile** — Sport (picker), primary position (picker filtered by sport), all positions (multi-select chips)
4. **Physical Profile** — Bats (segmented: R/L/S), Throws (segmented: R/L), Height (two pickers: feet + inches), Weight (number)
5. **Academics** — GPA (0.0-5.0), SAT (400-1600), ACT (1-36)
6. **External Profiles** — NCAA ID, Perfect Game ID, Prep Baseball ID
7. **Social Media** — Twitter (@), Instagram (@), TikTok (@), Facebook (URL)
8. **Contact Info** — Phone, Email, share permission toggles
9. **Current High School** — Name, address, city, state (2-char)
10. **High School Teams** — 4 expandable sections (9th-12th), each with team name + coach
11. **Travel Team** — Year, name, coach

#### Save Behavior

- **Auto-save:** Debounced on field change (500ms)
- **Explicit save:** "Save" button in navigation bar
- **API:** `PATCH /api/user/preferences/player-details`
- **Post-save:** Triggers fit score recalculation
- **Role check:** Parents see read-only view with banner

#### iOS-Specific Patterns

- Use `Form` with `Section` grouping for natural iOS settings feel
- Height picker: Two-wheel `Picker` (feet: 4-7, inches: 0-11)
- Position multi-select: Horizontally scrolling chips with checkmarks
- Photo upload: `PHPickerViewController` + image compression

---

### 2B. School Preferences (`/settings/school-preferences`)

#### Data Model

```swift
struct SchoolPreferences: Codable {
    var preferences: [SchoolPreference]
    var templateUsed: String?
    var lastUpdated: String?
}

struct SchoolPreference: Codable, Identifiable {
    let id: String
    var category: PreferenceCategory   // location | academic | program | custom
    var type: String                    // max_distance_miles, division, etc.
    var value: AnyCodable              // Varies by type
    var priority: Int                   // Display order (1 = highest)
    var isDealbreaker: Bool
}

enum PreferenceCategory: String, Codable {
    case location, academic, program, custom
}
```

#### Preference Types

| Category | Type                   | Value Type | Options                                                          |
| -------- | ---------------------- | ---------- | ---------------------------------------------------------------- |
| Location | `max_distance_miles`   | Int        | 50-3000                                                          |
| Location | `preferred_regions`    | [String]   | Northeast, Southeast, Midwest, Southwest, West Coast, Pacific NW |
| Location | `preferred_states`     | [String]   | All US states                                                    |
| Academic | `min_academic_rating`  | Int        | 1-5 (Basic → Elite)                                              |
| Academic | `school_size`          | String     | small, medium, large, very_large                                 |
| Program  | `division`             | [String]   | D1, D2, D3, NAIA, JUCO                                           |
| Program  | `conference_type`      | [String]   | Power 4, Group of 5, Mid-Major, Small Conference                 |
| Program  | `scholarship_required` | Bool       | Yes / Not required                                               |
| Custom   | `must_have`            | String     | Free text                                                        |
| Custom   | `nice_to_have`         | String     | Free text                                                        |

#### Templates (Quick-Fill)

| Template            | Pre-filled Criteria                                 |
| ------------------- | --------------------------------------------------- |
| D1 Power Conference | Division: D1, Conference: Power 4, Scholarship: Yes |
| Academic Excellence | Academic rating: 4+, Size: medium, Division: D1/D3  |
| Close to Home       | Max distance: 300 miles                             |
| Best Fit (Balanced) | Distance: 500mi, Rating: 3+, Division: D1/D2/D3     |

#### UI Pattern

- Template cards at top (tap to apply, replaces all preferences)
- Preferences list with drag handles for reorder
- Each row: Label, value, dealbreaker badge, remove button
- Floating "+" button to add new preference (modal picker)
- iOS: Use `List` with `onMove` for drag reorder

#### Save Behavior

- **Explicit save:** "Save Preferences" button
- **Priority auto-updates** on drag reorder
- **API:** `POST /api/user/preferences/school`

---

### 2C. Notification Preferences (`/settings/notifications`)

#### Data Model

```swift
struct NotificationSettings: Codable {
    var followUpReminderDays: Int        // 1-90, default 7
    var enableFollowUpReminders: Bool    // default true
    var enableDeadlineAlerts: Bool       // default true
    var enableDailyDigest: Bool          // default true
    var enableInboundInteractionAlerts: Bool  // default true
    var enableEmailNotifications: Bool   // default true
    var emailOnlyHighPriority: Bool      // default false
    var quietHoursStart: String?         // HH:MM format
    var quietHoursEnd: String?           // HH:MM format
}
```

#### Form Layout

```
[In-App Notifications Section]
  ☑ Coach Follow-Up Reminders
    └─ Days between follow-ups: [Stepper: 1-90, default 7]
  ☑ Deadline Alerts
  ☑ Daily Digest
  ☑ Inbound Contact Alerts

[Email Notifications Section]
  ☑ Enable Email Notifications
    └─ ☑ High-Priority Only (nested, shown when email enabled)
```

#### Save Behavior

- **Explicit save:** "Save Preferences" button
- **Reset:** "Reset to Defaults" button restores all defaults
- **API:** `POST /api/user/preferences/notifications`

#### iOS Pattern

- Use `Toggle` controls for each setting
- Stepper or Slider for reminder days
- Nested toggles indent visually when parent is enabled
- Disable nested controls when parent toggle is off

---

### 2D. Dashboard Customization (`/settings/dashboard`)

#### Data Model

```swift
struct DashboardWidgetVisibility: Codable {
    var statsCards: StatsCardVisibility
    var widgets: WidgetVisibility
}

struct StatsCardVisibility: Codable {
    var coaches: Bool           // default true
    var schools: Bool
    var interactions: Bool
    var offers: Bool
    var events: Bool
    var performance: Bool
    var notifications: Bool
    var socialMedia: Bool
}

struct WidgetVisibility: Codable {
    var recentNotifications: Bool    // default true (all default true)
    var linkedAccounts: Bool
    var recruitingCalendar: Bool
    var quickTasks: Bool
    var atAGlanceSummary: Bool
    var offerStatusOverview: Bool
    var interactionTrendChart: Bool
    var schoolInterestChart: Bool
    var schoolMapWidget: Bool
    var coachFollowupWidget: Bool
    var eventsSummary: Bool
    var performanceSummary: Bool
    var recentDocuments: Bool
    var interactionStats: Bool
    var schoolStatusOverview: Bool
    var coachResponsiveness: Bool
    var upcomingDeadlines: Bool
}
```

#### UI Layout

```
[Summary Statistics Section]
  "Select All" / "Deselect All" buttons
  Grid (2 columns) of toggle cards:
    👥 Coaches    🏫 Schools
    💬 Interactions  📝 Offers
    📅 Events    📊 Performance
    🔔 Notifications  📱 Social Media

[Dashboard Widgets Section]
  "Select All" / "Deselect All" buttons
  Grid (2 columns) of toggle cards:
    17 widget toggles with descriptive names
```

#### Save Behavior

- **Explicit save:** "Save Changes" button
- **Reset:** "Reset to Defaults" enables all
- **API:** `POST /api/user/preferences/dashboard`

#### iOS Pattern

- Use `LazyVGrid(columns: 2)` with toggle cards
- Each card: icon + label + checkmark/toggle
- Select All / Deselect All as toolbar buttons

---

### 2E. Home Location (`/settings/location`)

#### Data Model

```swift
struct HomeLocation: Codable {
    var address: String?
    var city: String?
    var state: String?         // 2-char uppercase
    var zip: String?           // max 10 chars
    var latitude: Double?
    var longitude: Double?
}
```

#### Form Layout

```
[Address Section]
  Street Address: [text]
  City: [text]    State: [2-char]    ZIP: [text]

[Coordinates Section]
  [Lookup from Address] button
  Latitude: [number]    Longitude: [number]
  ✓ "Coordinates ready" (if both set)
```

#### Save Behavior

- **Auto-save:** On ZIP code change (debounced 500ms)
- **Geocoding:** "Lookup from Address" calls geocoding service
- **API:** `POST /api/user/preferences/location`

#### iOS-Specific

- Consider `CLGeocoder` for address → coordinate lookup (native iOS)
- Optional: `MKMapView` preview showing pin at coordinates
- State field: Auto-uppercase, max 2 characters

---

## 3. Shared API Infrastructure

### Preference Manager Pattern

All 5 pages use the same V2 category-based API:

```
GET  /api/user/preferences/[category]     → Fetch preferences
POST /api/user/preferences/[category]     → Create/update preferences
DELETE /api/user/preferences/[category]   → Delete preferences
POST /api/user/preferences/[category]/history  → Record change
GET  /api/user/preferences/[category]/history  → Fetch history
```

**Categories:** `player`, `school`, `notifications`, `dashboard`, `location`

### Database

- Table: `user_preferences` (Supabase)
- Columns: `user_id`, `category`, `data` (JSONB), `updated_at`, `created_at`
- One row per user per category

### Authentication

- All endpoints require Supabase auth token
- Player details: Server rejects parent role for writes
- All other pages: Both roles can read/write

---

## 4. State Management

### Per-Page State Pattern

```swift
@State var preferences: [CategoryType]  // Typed preferences object
@State var isLoading = false
@State var isSaving = false
@State var error: String? = nil
@State var successMessage: String? = nil
@State var hasChanges = false           // Track unsaved changes
```

### Cross-Page Shared State

- **User role:** Determines player-details read/write access
- **Active family context:** Not directly used by preferences
- **Dashboard layout:** Consumed by Dashboard page (Phase 2)

---

## 5. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry
- **No internet:** Show offline indicator, cache last-known preferences locally
- **Server error (5xx):** Show "Server error" + retry

### Data Errors

- **No preferences saved yet:** Use defaults (each category has defined defaults)
- **Corrupted JSONB data:** Validation layer falls back to defaults
- **Missing required fields:** Client-side validation before save

### Edge Cases

- Unsaved changes on back navigation: Show "Discard changes?" alert
- Auto-save failure: Show non-blocking error, retry silently
- Fit score recalculation after player details save: Show brief loading indicator
- Very long preference lists (school prefs): Scrollable list, no performance issues expected
- Dashboard with all widgets disabled: Dashboard shows empty state message

---

## 6. Testing Checklist

### Happy Path Tests

- [ ] Each page loads with saved preferences or defaults
- [ ] Changes save successfully and persist
- [ ] Success/error messages display correctly
- [ ] Reset to defaults works on notification and dashboard pages
- [ ] Player details read-only for parents
- [ ] School preference templates apply correctly
- [ ] School preference drag-to-reorder updates priority
- [ ] Location geocoding populates coordinates
- [ ] Dashboard widget toggles reflect on dashboard page

### Error Tests

- [ ] Handle network timeout on all pages
- [ ] Handle 401 (redirect to login)
- [ ] Handle validation errors (inline messages)
- [ ] Handle server errors gracefully

### Edge Case Tests

- [ ] Unsaved changes warning on navigation
- [ ] Default values load when no preferences exist
- [ ] Auto-save debounce works correctly
- [ ] VoiceOver on all form elements
- [ ] Dynamic type scaling on all pages
- [ ] Keyboard avoidance on form inputs

---

## 7. Known Limitations & Gotchas

### From Web Implementation

- Player details has 40+ fields — consider collapsible sections on iOS for space
- School preferences use drag-to-reorder which maps to `List.onMove` in SwiftUI
- Dashboard has 25 toggle items (8 stats + 17 widgets) — use grid layout
- Location geocoding depends on external service availability
- Preference history tracking is server-side; iOS doesn't need to implement the history UI initially

### iOS-Specific Considerations

- `Form` with `Section` is the natural pattern for settings pages
- Use `@FocusState` for keyboard management across many text fields
- Profile photo: Use `PHPickerViewController` (iOS 14+) for photo selection
- Consider `CLGeocoder` instead of web-based geocoding for location page
- School preference reorder: `List { }.onMove(perform:)` for native drag

---

## 8. Links & References

### Web Implementation

- **Pages:** `/pages/settings/player-details.vue`, `school-preferences.vue`, `notifications.vue`, `dashboard.vue`, `location.vue`
- **Composables:** `usePreferenceManager`, `useUserPreferencesV2`, `useAutoSave`, `useProfile`
- **Validation:** `preferenceValidation.ts` (typed converters + defaults)
- **API:** `/server/api/user/preferences/[category].ts`
- **Components:** `ProfilePhotoUpload`, `ProfileEditHistory`

---

## 9. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Start with Notification Preferences (simplest, ~6 toggles) to establish the V2 category API pattern on iOS, then build the more complex pages. Player Details is the largest form and should be last. Consider using a shared `PreferenceService` Swift class that wraps the category-based API for reuse across all 5 pages.
