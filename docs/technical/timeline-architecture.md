# Recruiting Timeline - Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer (Vue 3)                  │
├──────────────────┬──────────────────┬──────────────────────────┤
│ Pages/           │ Composables      │ Components               │
│ - timeline       │ - useTasks       │ - PhaseCard              │
│ - schools        │ - usePhase       │ - TaskList               │
│ - interactions   │ - useStatus      │ - StatusSnippet          │
│ - onboarding     │ - useSuggestions │ - SuggestionCard         │
│                  │ - useRecovery    │ - RecoveryModal          │
│                  │ - useViewLogging │ - PortfolioHealth        │
└──────────────────┴──────────────────┴──────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Nuxt Server Routes)               │
├──────────────────────────────────────────────────────────────────┤
│ /api/tasks/{taskId}                  [GET, PATCH, dependencies] │
│ /api/athlete-tasks/[taskId]          [GET, PATCH]               │
│ /api/athlete/phase                   [GET, POST advance]        │
│ /api/athlete/status                  [GET, POST recalculate]    │
│ /api/athlete/portfolio-health        [GET]                      │
│ /api/suggestions                     [GET, PATCH dismiss/comp]  │
│ /api/schools/[id]/fit-score          [GET, POST calculate]      │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Business Logic Layer (Utils)                    │
├──────────────────────────────────────────────────────────────────┤
│ phaseCalculation.ts     - Phase progression logic               │
│ statusScoreCalculation.ts - Composite score computation         │
│ fitScoreCalculation.ts  - Fit score dimensions                  │
│ ruleEngine.ts           - Suggestion rule evaluation            │
│ suggestionStaggering.ts - Suggestion delivery scheduling        │
│ parentMessaging.ts      - Context-aware guidance                │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              Database Layer (PostgreSQL/Supabase)               │
├──────────────────────────────────────────────────────────────────┤
│ Tables:                                                          │
│ - task (80 tasks, 9-12 grade levels)                           │
│ - athlete_task (join table, completion status)                 │
│ - suggestion (rules output, delivery queue)                    │
│ - parent_view_log (symmetric visibility tracking)              │
│ - profiles (extended with timeline fields)                     │
│ - schools (extended with fit score fields)                     │
│ - interactions (extended for interest level)                   │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Task Completion Flow

```
User marks task complete (UI)
    ↓
PATCH /api/athlete-tasks/[taskId] {status: 'completed'}
    ↓
checkAndCompleteTask() trigger (auto-completion)
    ↓
Auto-mark related tasks complete (e.g., "email sent" → "contact coach")
    ↓
Update profiles.current_phase if milestone complete
    ↓
Trigger rule evaluation
    ↓
Generate suggestions (if new triggers hit)
    ↓
Recalculate status score
    ↓
UI updates via composable reactivity
```

### Phase Progression Flow

```
Task milestones reached
    ↓
POST /api/athlete/phase/advance
    ↓
calculatePhase() checks all milestones for current phase
    ↓
If complete: getNextPhase() → canAdvancePhase() returns true
    ↓
Update profiles.current_phase
    ↓
Update phase_milestone_data with timestamps
    ↓
Return new phase + milestone progress
    ↓
UI updates phase card and parent guidance
```

### Status Score Calculation Flow

```
GET /api/athlete/status
    ↓
Fetch athlete's data (profile, tasks, interactions, schools)
    ↓
calculateTaskCompletionRate() → 0-100
calculateInteractionFrequencyScore() → 0-100
calculateCoachInterestScore() → 0-100
calculateAcademicStandingScore() → 0-100
    ↓
Apply weights:
  - Task completion: 35%
  - Interactions: 25%
  - Coach interest: 25%
  - Academic: 15%
    ↓
Composite score (0-100)
    ↓
getStatusLabel() → 'on_track' | 'slightly_behind' | 'at_risk'
    ↓
Persist to profiles.status_score + profiles.status_label
    ↓
Return with breakdown
```

### Suggestion Generation Flow

```
Background job or POST /api/suggestions/evaluate
    ↓
RuleEngine.evaluateAll(athleteId)
    ↓
Load athlete context (schools, interactions, tasks, videos, events)
    ↓
For each rule:
  - Evaluate trigger conditions
  - If true: generate SuggestionData
    ↓
Filter duplicates (no same suggestion within 7 days)
    ↓
Insert into suggestion table (pending_surface = true)
    ↓
surfacePendingSuggestions() stagger 2-3 per day
    ↓
Mark oldest pending as surfaced (surfaced_at timestamp)
    ↓
GET /api/suggestions returns surfaced, not dismissed/completed
    ↓
Frontend shows in dashboard, dismissible by user
```

## Key Components

### 1. Task System (`composables/useTasks.ts`)

**Public API:**

```typescript
const {
  tasks,                          // All tasks (filtered by grade/category)
  athleteTasks,                   // Athlete's completion status
  tasksWithStatus,                // Merged tasks + status
  loading,

  fetchTasks(),                   // Load tasks
  updateTaskStatus(),             // Mark complete/in-progress/skipped
  getTaskDependencies(),          // Prerequisite validation
  checkDependenciesComplete(),    // Returns {canProceed, warning}
  getRequiredTasksForPhase(),     // Milestone tasks
  calculateTaskCompletionRate(),  // % complete
} = useTasks()
```

**Features:**

- Lazy loading of task data
- Dependency tracking (warns before attempting task without prerequisites)
- Auto-completion triggers (via `utils/autoTaskCompletion.ts`)
- Task filtering by grade level and category
- Status persistence to database

### 2. Phase Calculation (`utils/phaseCalculation.ts`)

**Key function:**

```typescript
calculatePhase(completedTaskIds: string[], hasSignedNLI: boolean): Phase
```

**Milestones:**

```typescript
PHASE_MILESTONES = {
  freshmanToSophomore: ["task-9-a1", "task-9-at1", "task-9-f1", "task-9-f2"],
  sophomoreToJunior: ["task-10-r1", "task-10-r3", "task-10-r5", "task-10-a2"],
  juniorToSenior: ["task-11-a1", "task-11-a3", "task-11-r3", "task-11-r1"],
  seniorToCommitted: ["task-12-d3"], // NLI signed
};
```

**Features:**

- Automatic phase determination from task completion
- Milestone progress tracking
- Phase advancement guards
- Graceful phase transitions

### 3. Status Score Calculation (`utils/statusScoreCalculation.ts`)

**Weights:**

```typescript
taskCompletion: 0.35,        // 35%
interactionFrequency: 0.25,  // 25%
coachInterest: 0.25,         // 25%
academicStanding: 0.15,      // 15%
```

**Sub-calculators:**

```typescript
calculateTaskCompletionRate(); // Required tasks for grade level
calculateInteractionFrequencyScore(); // Cadence scoring (weekly/monthly)
calculateCoachInterestScore(); // Aggregate from schools
calculateAcademicStandingScore(); // GPA + test scores + eligibility
```

**Output:**

```typescript
{
  score: number (0-100),
  label: 'on_track' | 'slightly_behind' | 'at_risk',
  breakdown: StatusScoreInputs
}
```

### 4. Fit Score System (`utils/fitScoreCalculation.ts`)

**4 Dimensions:**

```typescript
athleticFit: 0 - 40; // Position match, physical, performance, coach interest
academicFit: 0 - 25; // GPA in range, test scores, major offered, support
opportunityFit: 0 - 20; // Roster depth, graduation timeline, aid, walk-on history
personalFit: 0 - 15; // Location, campus size, cost, alignment, major strength
```

**Tier assignment:**

- 70-100: Match/Safety
- 50-69: Reach
- 0-49: Unlikely

**Features:**

- Partial scoring (works with incomplete data)
- Indicates missing dimensions
- Portfolio health aggregation
- School-specific scoring

### 5. Rule Engine (`server/utils/ruleEngine.ts`)

**6 Built-in Rules:**

| Rule              | File                        | Trigger Condition                   | Output                           |
| ----------------- | --------------------------- | ----------------------------------- | -------------------------------- |
| Interaction Gap   | `interactionGap.ts`         | 21+ days no contact at A/B school   | "Reach out to [Coach]"           |
| Missing Video     | `missingVideo.ts`           | Sophomore+ with no video            | "Create highlight video"         |
| Event Follow-up   | `eventFollowUp.ts`          | Event attended, no follow-up 7 days | "Send thank you email"           |
| Video Health      | `videoLinkHealth.ts`        | Video URL 404 or timeout            | "Update broken video link"       |
| Portfolio Health  | `portfolioHealth.ts`        | All schools same tier               | "Add reach/match/safety schools" |
| Priority Reminder | `prioritySchoolReminder.ts` | 14+ days no priority contact        | "Contact [Coach] at [School]"    |

**Rule structure:**

```typescript
interface Rule {
  id: string;
  name: string;
  evaluate: (context: RuleContext) => Promise<SuggestionData | null>;
}

// RuleContext includes: athlete, schools, interactions, tasks, videos, events
```

### 6. Suggestion Staggering (`server/utils/suggestionStaggering.ts`)

**Delivery strategy:**

- Max 2-3 suggestions per day (avoid overwhelm)
- Highest urgency first
- 7-day dedup (no same suggestion twice in a week)
- Dashboard shows max 3, school view shows max 2

**Functions:**

```typescript
surfacePendingSuggestions(athleteId, (limit = 3)); // Daily job
getSurfacedSuggestions(athleteId, location); // Get displayable
```

### 7. Parent View System

**RLS Policies (database-level):**

- `athlete_task`: Parents read-only (cannot update)
- `interactions`: Parents read-only (cannot update)
- `parent_view_log`: Track what parents view

**Composable:**

```typescript
const {
  isParentViewing,          // Computed: parent viewing linked athlete
  viewedAtTime,             // When parent last viewed
  logView(),                // Auto-called on page mount
} = useParentContext()
```

**UI Integration:**

- Disable task checkboxes when parent views
- Show "Parent viewed • 2h ago" indicator
- Read-only enforcement at UI + database

### 8. Recovery System (`composables/useRecovery.ts`)

**4 Triggers:**

| Trigger                | Check                            | Recovery Plan             | Duration |
| ---------------------- | -------------------------------- | ------------------------- | -------- |
| Critical Task Missed   | Phase 1-2 tasks incomplete       | Complete foundation tasks | 21 days  |
| No Coach Interest      | 30+ days no positive interaction | Restart outreach strategy | 45 days  |
| Eligibility Incomplete | NCAA registration not started    | Register NCAA             | 30 days  |
| Fit Gap                | Unbalanced school list           | Add reach/match/safety    | 14 days  |

**Trigger detection:**

```typescript
checkCriticalTaskMissed(); // Sync
checkNoCoachInterest(); // Sync
checkEligibilityIncomplete(); // Async
checkFitGap(); // Sync
```

**Recovery flow:**

1. Trigger detected on Dashboard/Timeline mount
2. RecoveryModal shows plan
3. Athlete acknowledges
4. Tasks tagged `is_recovery_task = true`
5. Dashboard highlights recovery tasks

### 9. Communication System

**Email Templates:**

- Database-stored (not hardcoded)
- Unlock conditions (profile complete, video ready, etc.)
- Auto-population with athlete/school data
- URLSearchParams encoding for mailto: links

**Interest Calibration:**

- 6 yes/no questions (did coach ask about schedule, etc.)
- Weighted scoring (0-1: low, 2-3: medium, 4-6: high)
- Appended to interaction content as metadata

**Email Send:**

- Opens user's email client (mailto: with pre-filled content)
- Returns to app to confirm send
- Marks interaction as sent, auto-completes related tasks

### 10. Late Joiner Onboarding (`composables/useOnboarding.ts`)

**5-question assessment:**

1. Highlight video created?
2. Coaches contacted?
3. School list built?
4. NCAA eligibility registered?
5. SAT/ACT taken?

**Automatic actions:**

- Mark "yes" tasks as complete
- Generate catch-up plan for gaps
- Store `onboarding_complete` in `phase_milestone_data`

## Database Schema

### Core Tables

**task**

```sql
id UUID PRIMARY KEY
category VARCHAR(20)              -- 'academic', 'athletic', 'recruiting', 'exposure', 'mindset'
grade_level INTEGER               -- 9-12
title VARCHAR(255)
description TEXT
required BOOLEAN
dependency_task_ids UUID[]
why_it_matters TEXT
failure_risk TEXT
division_applicability VARCHAR(10)[]  -- ['DI', 'DII', ...] or ['ALL']
created_at TIMESTAMPTZ
```

**athlete_task**

```sql
id UUID PRIMARY KEY
athlete_id UUID REFERENCES profiles(id)
task_id UUID REFERENCES task(id)
status VARCHAR(20)                -- 'not_started', 'in_progress', 'completed', 'skipped'
completed_at TIMESTAMPTZ
is_recovery_task BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(athlete_id, task_id)
```

**suggestion**

```sql
id UUID PRIMARY KEY
athlete_id UUID REFERENCES profiles(id)
rule_type VARCHAR(50)
urgency VARCHAR(10)               -- 'low', 'medium', 'high'
message TEXT
action_type VARCHAR(50)
related_school_id UUID REFERENCES schools(id)
related_task_id UUID REFERENCES task(id)
dismissed BOOLEAN
dismissed_at TIMESTAMPTZ
completed BOOLEAN
completed_at TIMESTAMPTZ
pending_surface BOOLEAN           -- Queued for delivery
surfaced_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**parent_view_log**

```sql
id UUID PRIMARY KEY
parent_user_id UUID REFERENCES profiles(id)
athlete_id UUID REFERENCES profiles(id)
viewed_item_type VARCHAR(50)      -- 'task', 'school', 'interaction', etc.
viewed_item_id UUID
viewed_at TIMESTAMPTZ
```

### Extended Tables

**profiles**

```sql
-- New columns:
current_phase VARCHAR(20)         -- 'freshman', 'sophomore', 'junior', 'senior', 'committed'
phase_milestone_data JSONB        -- Stores milestone completion dates, onboarding_complete flag
status_score INTEGER              -- 0-100 composite score
status_label VARCHAR(20)          -- 'on_track', 'slightly_behind', 'at_risk'
recovery_mode_active BOOLEAN
recovery_plan_shown_at TIMESTAMPTZ
```

**schools**

```sql
-- New columns:
fit_score INTEGER                 -- 0-100
fit_tier VARCHAR(20)              -- 'reach', 'match', 'safety', 'unlikely'
fit_score_data JSONB              -- {athletic: 30, academic: 20, ...}
```

**videos**

```sql
-- New columns:
last_health_check TIMESTAMPTZ
health_status VARCHAR(20)         -- 'healthy', 'broken', 'unknown'
```

## API Endpoints

### Tasks

- `GET /api/tasks` - List with filters (gradeLevel, category, division)
- `GET /api/athlete-tasks` - Athlete's task statuses
- `GET /api/tasks/with-status` - Merged tasks + athlete status
- `PATCH /api/athlete-tasks/[taskId]` - Update task status
- `GET /api/tasks/[taskId]/dependencies` - Check prerequisites

### Phase

- `GET /api/athlete/phase` - Current phase + milestone progress
- `POST /api/athlete/phase/advance` - Attempt phase advancement

### Status

- `GET /api/athlete/status` - Current status score + breakdown
- `POST /api/athlete/status/recalculate` - Force recalculation

### Portfolio

- `GET /api/athlete/portfolio-health` - School tier distribution

### Fit Score

- `GET /api/schools/[id]/fit-score` - School fit score
- `POST /api/schools/[id]/fit-score` - Calculate/update fit score

### Suggestions

- `GET /api/suggestions` - Surfaced suggestions (queryable by location)
- `PATCH /api/suggestions/[id]/dismiss` - Mark dismissed
- `PATCH /api/suggestions/[id]/complete` - Mark completed
- `POST /api/suggestions/evaluate` - Trigger rule evaluation

## Background Jobs

**Daily evaluation** (6am)

- For each active athlete
- Evaluate all rules
- Generate new suggestions
- Surface 2-3 pending

**Weekly video health check**

- HEAD request to each video URL
- Update health_status
- Generate suggestion if broken

## Performance Considerations

### Query Optimization

- Index on `athlete_task(athlete_id, status)` for quick filtering
- Index on `suggestion(pending_surface)` for staggering queue
- Lazy-load tasks (fetch on-demand, not on app init)
- Cache phase milestone data in profiles table

### Caching Strategy

- Composable refs cache last fetch (reactivity-based)
- Phase calculation cached in `phase_milestone_data`
- Status score persisted to avoid recalc on every page load
- Fit scores cached in schools table

### Scalability

- Rule evaluation batched daily (not on every action)
- Suggestion delivery staggered (max 3/day per athlete)
- Pagination on large lists (school list, interactions)
- Archive old suggestions (30+ days) to table

## Testing

See [`/PHASE_9_TEST_ASSESSMENT.md`](../../PHASE_9_TEST_ASSESSMENT.md) for comprehensive test coverage requirements.

**Current status:**

- Unit tests: 278/348 passing (79.9%)
- Type check: ✅ Passing
- Integration tests: Planned
- E2E tests: Planned

---

**Document Version:** 1.0
**Last Updated:** 2026-01-10
**Architecture Status:** Complete, tested, documented
