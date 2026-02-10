# iOS Page Specification: Tasks / Recruiting Timeline

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Tasks / Recruiting Timeline
**Web Route:** `/tasks/index`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** Medium-High (Complex dependency logic)
**Estimated Time:** 3-4 days

---

## 1. Overview

### Purpose

The Tasks page provides a phase-based recruiting timeline with task tracking, dependency management, and completion monitoring. Tasks are organized by grade level, have prerequisites (blocking dependencies), and track athlete progress through the recruiting journey.

### Key User Actions

- View all tasks for current grade level
- Filter tasks by status (Not Started, In Progress, Completed)
- Filter tasks by deadline urgency (Critical, Urgent, Upcoming)
- Mark tasks as complete (if prerequisites are met and user is athlete)
- Expand task details to see "Why It Matters" and "What Can Go Wrong"
- View locked tasks and their prerequisites
- See progress percentage (completed / total)
- Parent preview mode: View athlete's tasks (read-only)

### Success Criteria

- Tasks load and display within 2 seconds
- Dependency logic correctly locks tasks until prerequisites complete
- Progress bar shows accurate completion percentage
- Filters persist across app sessions
- Parent mode shows read-only view with athlete switcher
- Task completion triggers success message and updates UI

---

## 2. User Flows

### Primary Flow (Athlete)

```
1. User navigates to Tasks page
2. System calculates current grade level from graduation year
3. System fetches tasks for grade level + athlete's completion status
4. System displays:
   - Progress counter (X of Y tasks completed, %)
   - Filter controls (Status, Urgency)
   - Task list (sorted: required first, then by urgency)
5. User can tap checkbox to mark task complete (if unlocked)
6. User can tap task to expand/collapse details
```

### Alternative Flow: Mark Task Complete

```
1. User taps checkbox on unlocked task
2. System checks if all prerequisites are complete
3. If locked:
   - System shows alert with incomplete prerequisites
   - User cancels action
4. If unlocked:
   - System updates task status to "completed"
   - System shows success message "Great job! 🎉"
   - System refreshes task list
   - Dependent tasks may unlock
```

### Alternative Flow: View Locked Task Details

```
1. User taps a locked task
2. System expands task details
3. System highlights prerequisites section in red
4. Section shows: "🔒 Complete These First"
5. Lists incomplete prerequisite tasks
6. User sees what's blocking the task
```

### Alternative Flow: Filter Tasks

```
1. User selects status filter (e.g., "In Progress")
2. System filters task list
3. Only matching tasks display
4. Filter persists in localStorage
5. User selects urgency filter (e.g., "Critical")
6. System applies both filters
7. List updates immediately
```

### Alternative Flow: Parent Preview Mode

```
1. Parent logs in
2. Parent navigates to Tasks
3. System detects parent role
4. System shows:
   - Blue banner: "👁 Viewing [Athlete Name]'s Tasks (Read-Only)"
   - Athlete switcher (if parent has multiple linked athletes)
   - Task list (checkboxes disabled)
5. Parent can view but not modify task status
```

### Error Scenarios

```
Error: No tasks for grade level
- User sees: "No tasks available for this grade level"
- Action: None (expected state)

Error: Fetch fails
- User sees: Error banner
- Recovery: Pull-to-refresh or retry button

Error: Task completion fails
- User sees: Alert with error message
- Action: Retry
```

---

## 3. Data Models

### Primary Model: TaskWithStatus

```swift
struct TaskWithStatus: Identifiable {
  let id: String
  let title: String
  let description: String?
  let gradeLevel: Int
  let category: String
  let division: String?
  let required: Bool
  let deadlineDate: Date?
  let whyItMatters: String?
  let failureRisk: String?
  let dependencyTaskIds: [String]
  let athleteTask: AthleteTaskStatus?
  let prerequisiteTasks: [TaskSummary]
  let hasIncompletePrerequisites: Bool

  // Computed
  var isLocked: Bool {
    hasIncompletePrerequisites
  }

  var deadlineUrgency: DeadlineUrgency {
    guard let deadline = deadlineDate else { return .none }
    let daysRemaining = Calendar.current.dateComponents([.day], from: Date(), to: deadline).day ?? 0
    if daysRemaining < 0 { return .critical }
    if daysRemaining <= 7 { return .urgent }
    if daysRemaining <= 14 { return .upcoming }
    return .future
  }

  var statusColor: Color {
    if let status = athleteTask?.status {
      switch status {
      case .completed: return .green
      case .inProgress: return .yellow
      case .notStarted: return .gray
      }
    }
    return .gray
  }
}

struct AthleteTaskStatus: Codable {
  let taskId: String
  let userId: String
  let status: TaskStatus
  let completedAt: Date?

  enum TaskStatus: String, Codable {
    case notStarted = "not_started"
    case inProgress = "in_progress"
    case completed = "completed"
  }
}

struct TaskSummary: Identifiable {
  let id: String
  let title: String
}

enum DeadlineUrgency {
  case critical   // Overdue or due soon
  case urgent     // Due this week
  case upcoming   // Due in 2 weeks
  case future
  case none       // No deadline
}
```

### Data Origin

- **Source:** Supabase `tasks` table + `athlete_tasks` table (joined)
- **Refresh:** On page load, after status update
- **Caching:** In-memory only
- **Mutations:** Update task status only (tasks themselves are read-only)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Tasks with Status

```
GET /api/tasks/with-status?gradeLevel=10

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Register with NCAA Eligibility Center",
      "description": "...",
      "grade_level": 10,
      "category": "academics",
      "division": "D1",
      "required": true,
      "deadline_date": "2026-06-01",
      "why_it_matters": "...",
      "failure_risk": "...",
      "dependency_task_ids": [],
      "athlete_task": {
        "task_id": "uuid",
        "user_id": "uuid",
        "status": "completed",
        "completed_at": "2026-02-01T00:00:00Z"
      },
      "prerequisite_tasks": [],
      "has_incomplete_prerequisites": false
    },
    ...
  ]
}
```

#### Endpoint 2: Update Task Status

```
POST /api/athlete-tasks/update-status

Body:
{
  "task_id": "uuid",
  "status": "completed"
}

Response:
{
  "success": true,
  "data": { /* updated athlete_task */ }
}
```

### Authentication

(Same as other pages)

---

## 5. State Management

```swift
@State var tasks: [TaskWithStatus] = []
@State var isLoading = false
@State var error: String? = nil
@State var currentGradeLevel: Int = 10
@State var statusFilter: TaskStatus? = nil
@State var urgencyFilter: UrgencyFilter? = nil
@State var expandedTaskId: String? = nil
@State var showSuccessMessage = false
@State var isViewingAsParent = false
@State var currentAthleteId: String? = nil

enum UrgencyFilter: String, CaseIterable {
  case all
  case critical
  case urgent
  case upcoming

  var displayName: String {
    switch self {
    case .all: return "All"
    case .critical: return "Overdue / Due Soon"
    case .urgent: return "Due This Week"
    case .upcoming: return "Due In 2 Weeks"
    }
  }
}

// Filters persist via UserDefaults (keyed by athleteId)
@AppStorage("taskStatusFilter_\(athleteId)") var storedStatusFilter: String = "all"
@AppStorage("taskUrgencyFilter_\(athleteId)") var storedUrgencyFilter: String = "all"
```

---

## 6. UI/UX Details

### Layout Structure

```
[Parent Context Banner] (if viewing as parent)
  - "👁 Viewing [Name]'s Tasks (Read-Only)"

[Header]
  - Title: "My Tasks" or "[Name]'s Tasks"
  - Subtitle: Context message

[Athlete Switcher] (parent only)
  - Dropdown to switch between linked athletes

[Progress Counter Card]
  - "You've completed X of Y tasks (Z%)"
  - Progress bar (blue fill)

[Filter Controls Card]
  - Status filter dropdown
  - Urgency filter dropdown

[Success Message] (athlete only, transient)
  - "Great job! 🎉"
  - Fades out after 3 seconds

[Task List]
  - Cards sorted by: required first, then urgency, then alphabetical
  - Each card:
    - Checkbox (enabled if unlocked and athlete)
    - Task title
    - 🔒 Locked badge (if locked)
    - Required badge (if required)
    - Status badge (completed/in progress/not started)
    - Description preview
    - Tappable to expand details

[Expanded Task Details] (collapsible)
  - "Why It Matters" section
  - "What Can Go Wrong" section
  - Prerequisites section (if locked)
    - Red background, list of incomplete prerequisites

[Loading State]
  - Skeleton cards

[Empty State]
  - "No tasks available for this grade level"
```

### Design System

- **Progress Bar:** Blue fill, gray background, 12pt height, rounded
- **Status Colors:**
  - Completed: Green (`#10b981`)
  - In Progress: Yellow (`#f59e0b`)
  - Not Started: Gray (`#6b7280`)
- **Locked Tasks:** Gray text, disabled checkbox
- **Required Badge:** Blue background, white text

### Interactive Elements

#### Checkboxes

- 20pt x 20pt minimum size
- Enabled: Blue when checked, gray when unchecked
- Disabled: Gray, reduced opacity
- Parent mode: Always disabled

#### Task Cards

- Tappable to expand/collapse
- Smooth expand/collapse animation

#### Filters

- Native picker style
- Persist selection

### Loading States

- Skeleton cards (5 placeholders)

### Accessibility

- VoiceOver announces:
  - Checkbox: "Mark [Task] complete" or "Complete [prerequisites] to unlock"
  - Task: "[Task title], [Status], [Locked/Unlocked], [Required/Optional]"
  - Progress: "Completed X of Y tasks, Z percent complete"
- Color contrast meets WCAG AA
- 44pt touch targets

---

## 7. Dependencies

### Frameworks

- SwiftUI (iOS 15+)
- Supabase iOS Client

---

## 8. Error Handling & Edge Cases

- **No tasks for grade level:** Show empty state (expected)
- **Network errors:** Show error banner with retry
- **Task completion while prerequisites incomplete:** Show alert with prerequisite list
- **Grade level calculation:** Use graduation year to calculate accurately
- **Locked tasks:** Clearly indicate with badge and disabled checkbox
- **Parent mode:** Disable all mutations, show read-only banner

---

## 9. Testing Checklist

### Happy Path

- [ ] Tasks load for current grade level
- [ ] Progress counter displays correctly
- [ ] Can mark task complete (if unlocked)
- [ ] Dependent tasks unlock after prerequisites complete
- [ ] Filters work (status, urgency)
- [ ] Expand/collapse details works
- [ ] Success message appears and fades
- [ ] Parent mode shows read-only view

### Error Tests

- [ ] Cannot complete locked task (alert shows)
- [ ] Network errors handled
- [ ] No tasks shows empty state

### Edge Cases

- [ ] All tasks completed (100% progress)
- [ ] No unlocked tasks available
- [ ] Parent viewing with multiple athletes
- [ ] Grade level edge cases (freshman, senior)
- [ ] Tasks with no deadline
- [ ] Very long task descriptions

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Dependency logic:** Complex prerequisite checking; ensure iOS matches exactly
- **Filter persistence:** Web uses localStorage; iOS uses UserDefaults
- **Parent mode:** Logic for detecting parent role must match web

### iOS-Specific

- **Grade calculation:** Ensure accurate calculation from graduation year
- **Task locking:** Must check dependencies on every tap
- **UserDefaults keying:** Key filters by athleteId to support multi-athlete families

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/tasks/index.vue`
- **Composables:** `useTasks`, `useAuth`, `useParentContext`
- **Utilities:** `calculateCurrentGrade`, `calculateDeadlineInfo`

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Dependency logic is complex and critical. Ensure thorough testing of task locking/unlocking. Parent mode requires family context from previous phases.
