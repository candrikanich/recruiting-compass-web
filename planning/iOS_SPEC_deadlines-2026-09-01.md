# iOS Spec: Deadlines

**Date:** 2026-09-01
**Source (web):** `pages/deadlines.vue`, `composables/useDeadlines.ts`, `server/api/deadlines/`
**Status:** Web exists (auth bug being fixed this session). iOS has nav stub only — no dedicated view, no service, no model.

## 0. Current iOS state

- `AppDestination.deadlines` exists in iPad sidebar (line 7 of `AppDestination.swift`), routes to `RecruitingTimelineView()` as a fallback (line 128-131 of `AdaptiveRootView.swift`)
- `MoreMenuSection` (iPhone More menu) does **not** include deadlines — it's iPad-only in nav
- No `Deadlines/` feature directory, no model, no service

## 1. Database — no migration needed

`user_deadlines` table already exists (migration `20260318000002`). RLS is user-scoped (`auth.uid() = user_id`). iOS reads/writes via Supabase client directly (same pattern as VideoLinks, Events, etc.).

```sql
user_deadlines (
  id          UUID PK DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  deadline_date DATE NOT NULL,
  category    TEXT NOT NULL,      -- application | decision | financial_aid | visit | custom
  school_id   UUID REFERENCES schools(id) ON DELETE SET NULL,  -- optional link
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
)
```

## 2. Model

Create `Features/Deadlines/Models/Deadline.swift`:

```swift
struct Deadline: Codable, Identifiable, Sendable, Equatable {
  let id: String
  let userId: String
  let label: String
  let deadlineDate: String          // "YYYY-MM-DD" (DATE column)
  let category: DeadlineCategory
  let schoolId: String?
  let createdAt: Date?
  let updatedAt: Date?

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case label
    case deadlineDate = "deadline_date"
    case category
    case schoolId = "school_id"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }
}
```

Create `Features/Deadlines/Models/DeadlineCategory.swift`:

```swift
enum DeadlineCategory: String, Codable, Sendable, CaseIterable, Identifiable {
  case application
  case decision
  case financial_aid
  case visit
  case custom

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .application:   return String(localized: "Application")
    case .decision:      return String(localized: "Decision")
    case .financial_aid: return String(localized: "Financial Aid")
    case .visit:         return String(localized: "Visit")
    case .custom:        return String(localized: "Custom")
    }
  }

  var icon: String {
    switch self {
    case .application:   return "doc.text"
    case .decision:      return "checkmark.seal"
    case .financial_aid: return "dollarsign.circle"
    case .visit:         return "mappin.and.ellipse"
    case .custom:        return "tag"
    }
  }

  var color: Color {
    switch self {
    case .application:   return .blue
    case .decision:      return .green
    case .financial_aid: return .orange
    case .visit:         return .purple
    case .custom:        return .gray
    }
  }
}
```

## 3. Service

Create `Features/Deadlines/Services/DeadlinesManaging.swift` (protocol):

```swift
struct DeadlineCreateRequest: Sendable {
  let userId: String
  let label: String
  let deadlineDate: String      // "YYYY-MM-DD"
  let category: DeadlineCategory
  let schoolId: String?
}

protocol DeadlinesManaging: Sendable {
  func fetchDeadlines(userId: String) async throws -> [Deadline]
  func createDeadline(_ request: DeadlineCreateRequest) async throws -> Deadline
  func deleteDeadline(id: String, userId: String) async throws
}
```

Create `Features/Deadlines/Services/DeadlinesServiceImpl.swift`:

Follow `VideoLinksServiceImpl` pattern exactly — direct Supabase client queries against `user_deadlines`, `.eq("user_id", value: userId)`, OSLog logger.

- `fetchDeadlines`: SELECT ordered by `deadline_date` ASC
- `createDeadline`: INSERT with `.select().single()` return
- `deleteDeadline`: DELETE with `.eq("id")` + `.eq("user_id")`

No update endpoint on web, so skip update for now (web doesn't have edit either — add/remove only).

## 4. ViewModel

Create `Features/Deadlines/ViewModels/DeadlinesListViewModel.swift`:

```swift
@Observable
final class DeadlinesListViewModel {
  private(set) var deadlines: [Deadline] = []
  private(set) var isLoading = false
  private(set) var error: String?
  var showAddSheet = false

  private let service: DeadlinesManaging
  private let authManager: AuthManager

  init(service: DeadlinesManaging = DeadlinesServiceImpl(),
       authManager: AuthManager = .shared) { ... }

  func loadDeadlines() async { ... }
  func addDeadline(label: String, date: Date, category: DeadlineCategory, schoolId: String?) async { ... }
  func removeDeadline(_ deadline: Deadline) async { ... }

  // Derived
  var sortedDeadlines: [Deadline] { deadlines.sorted(by: deadlineDate) }
  var upcomingDeadlines: [Deadline] { sortedDeadlines.filter { $0.parsedDate >= today } }
  var pastDeadlines: [Deadline] { sortedDeadlines.filter { $0.parsedDate < today } }
}
```

## 5. Views

### 5a. `DeadlinesListView.swift` — main list

- `NavigationStack` with title "Deadlines"
- Toolbar `+` button → shows `AddDeadlineSheet`
- Two sections: **Upcoming** (sorted by date ASC) and **Past** (sorted by date DESC, collapsed by default)
- Each row: category icon (colored) · label · formatted date · category pill
- Swipe-to-delete on each row (`.onDelete` or `.swipeActions`)
- Empty state: `ContentUnavailableView` with calendar icon, "No deadlines yet", "Track application, offer, and recruiting deadlines"
- Loading: `ProgressView`
- Error: inline error banner (same pattern as other list views)

### 5b. `AddDeadlineSheet.swift` — add form

Presented as `.sheet`:
- `TextField` for label (required, max 200 chars)
- `DatePicker` for date (date only, no time)
- `Picker` for category (all 5 `DeadlineCategory` cases)
- Optional school picker (if user wants to associate with a tracked school — stretch goal, can defer to v2)
- Cancel / Save buttons in toolbar
- Disable Save until label is non-empty and date is set
- Dismiss on successful save + refresh list

### 5c. `DeadlineRow.swift` — list row component

- Leading: category icon in colored circle (28pt)
- Center: label (`.body.weight(.medium)`) + date + category name (`.caption.foregroundStyle(.secondary)`)
- Trailing: days-until badge (e.g., "3 days", "Today", "Tomorrow", "Past") — computed from `deadline_date` vs today
- Accessibility: combine children, label = "\(label), \(category), \(relativeDate)"

## 6. Navigation integration

### iPad (already has stub)

In `AdaptiveRootView.swift`, replace the fallback:

```swift
case .deadlines:
  DeadlinesListView()
```

Remove the comment about no dedicated screen.

### iPhone (missing from More menu)

1. Add `case deadlines` to `MoreMenuSection`:
   - `title`: "Deadlines"
   - `description`: "Application, visit, and recruiting deadlines"
   - `icon`: "exclamationmark.circle" (matches `AppDestination`)
   - `color`: `.red`

2. Add `.deadlines` to the "Recruiting" section in `MoreMenuView.moreMenuList` (after `.events`):
   ```swift
   menuSectionView("Recruiting", items: [.timeline, .events, .deadlines, .documents, ...])
   ```

3. Add routing in `MoreMenuView.sectionDestination`:
   ```swift
   case .deadlines:
     DeadlinesListView()
   ```

## 7. File tree

```
Features/Deadlines/
├── Models/
│   ├── Deadline.swift
│   └── DeadlineCategory.swift
├── Services/
│   ├── DeadlinesManaging.swift
│   └── DeadlinesServiceImpl.swift
├── ViewModels/
│   └── DeadlinesListViewModel.swift
├── Views/
│   ├── DeadlinesListView.swift
│   └── AddDeadlineSheet.swift
└── Components/
    └── DeadlineRow.swift
```

## 8. Tests

Unit tests (follow existing patterns):
- `DeadlineCategoryTests.swift` — displayName, icon, color for all cases
- `DeadlinesListViewModelTests.swift` — load/add/remove/sort/upcoming-vs-past, error handling
- `DeadlinesServiceTests.swift` — mock Supabase calls if pattern exists, otherwise skip (VideoLinks has no service tests)

Accessibility tests:
- `DeadlinesListAccessibilityTests.swift` — row labels, swipe actions, empty state

## 9. Scope boundaries

**In scope:**
- Model, service, viewModel, list view, add sheet, row component
- Navigation on both iPhone and iPad
- Swipe-to-delete
- Upcoming/Past sectioning
- Days-until badge

**Out of scope (defer):**
- Edit deadline (web doesn't have it either)
- School association picker (schema supports `school_id` but web doesn't expose it in the UI)
- Deadline notifications/alerts (`deadline_alert_log` table exists but no iOS notification integration yet)
- Category filtering / search
- Calendar view of deadlines

## 10. Validation rules (match web Zod schema)

| Field | Rule |
|---|---|
| `label` | Required, 1–200 chars, trimmed |
| `deadline_date` | Required, valid date, format `YYYY-MM-DD` |
| `category` | Required, one of the 5 enum values |
| `school_id` | Optional UUID (deferred — not in UI) |

## 11. Gotchas

- **RLS is user-scoped, not family-scoped.** Unlike most other tables, `user_deadlines` uses `auth.uid() = user_id`, not family_unit_id. Parents see only their own deadlines, not their athlete's. This matches web behavior. If family-scoping is desired later, it needs a migration + RLS policy update on both platforms.
- **No `family_unit_id` column** on `user_deadlines` — confirms user-scoped intent.
- **Date handling:** `deadline_date` is a Postgres `DATE` (no timezone). Store and transmit as `"YYYY-MM-DD"` string. Parse to `Date` client-side for display/comparison only. Use `Calendar.current.startOfDay` for today-comparisons to avoid timezone bugs.
- **Web uses Nitro API endpoints** (`/api/deadlines`), but iOS should query Supabase directly (same pattern as VideoLinks, Events — iOS doesn't route through the web API layer).
