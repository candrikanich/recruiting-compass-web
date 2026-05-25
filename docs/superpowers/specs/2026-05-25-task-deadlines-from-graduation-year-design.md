# Task Deadlines Computed from Graduation Year

**Date:** 2026-05-25
**Status:** Approved — ready for implementation plan
**Origin:** E2E bucket (c) parent-tasks. The `parent-tasks.spec.ts` deadline-badge test (`:55`) skips because tasks never carry a `deadline_date`. Chosen fix (Approach C): compute a per-athlete deadline from the athlete's graduation year plus a per-task relative offset.

## Problem

`pages/tasks/index.vue` renders `<DeadlineBadge :deadline-date="task.deadline_date" />`, and `DeadlineBadge` only shows (`data-testid="deadline-badge"`) when `deadlineDate !== null && urgency !== 'none'`. But:

- The `task` template table has **no `deadline_date` column** (confirmed: `information_schema` reports the column absent).
- `/api/tasks` and `/api/tasks/with-status` never select or compute a deadline.
- So `task.deadline_date` is always `undefined`/`null` and the badge never renders.

Four `parent-tasks.spec.ts` tests are consequently skipped:

| Test | Current blocker |
|---|---|
| `:40` task-item visibility | List renders empty within the 3s probe (load timing / grade alignment) |
| `:55` deadline-badge | No deadline data flows to tasks (this spec's core fix) |
| `:68` athlete-select (≥2 options) | Runs as player (no parent context); parent has only 1 linked athlete |
| `:82` read-only checkbox for parent | Runs as player, not parent |

## Goals

1. Tasks carry a computed `deadline_date` derived from the viewed athlete's `graduation_year` and a per-template offset.
2. The tasks endpoints can compute for a specific athlete (so a parent viewing an athlete sees that athlete's deadlines), with server-side authorization.
3. The four skipped `parent-tasks.spec.ts` tests run with real data and pass.

## Non-Goals

- Real, accurate recruiting-calendar dates per task. Offsets are grade-band defaults, refinable later.
- Changing `DeadlineBadge` rendering rules.
- Wiring `user_deadlines` / `system_calendar` into tasks (Approach A/B, rejected).
- Editing iOS.

## Data Model

### `task.deadline_offset_months`

Add nullable column to `task`:

```sql
ALTER TABLE task ADD COLUMN IF NOT EXISTS deadline_offset_months INTEGER NULL;
```

Semantics: months **before graduation** a task is due. Backfill the existing templates by grade band (earlier grades = larger offset):

| grade_level | band (months before grad) | v1 value (mid-band) |
|---|---|---|
| 12 | 0–11 | 6 |
| 11 | 12–23 | 18 |
| 10 | 24–35 | 30 |
| 9 | 36–47 | 42 |

Backfill rule (v1): every task in a grade gets that grade's single mid-band value (`UPDATE task SET deadline_offset_months = 6 WHERE grade_level = 12`, etc.). No per-task curation. Distinct values across grades still yield distinct urgency tiers. The band column documents the room for future per-task refinement. Migration includes the `ALTER` plus the four backfill `UPDATE`s.

### Anchor + formula

- Graduation anchor = **June 1 of `graduation_year`** (`graduation_year-06-01`).
- `deadline_date = anchor − deadline_offset_months` (calendar month subtraction).
- If `graduation_year` is null OR `deadline_offset_months` is null → `deadline_date = null`.

Computed server-side; never stored per athlete.

## Components

### 1. Server: athlete-scoped deadline compute

**`server/api/tasks/index.get.ts`** and **`server/api/tasks/with-status.get.ts`**:

- Accept optional `?athleteId=<uuid>`. Default = `user.id` (caller).
- **Authorization:** if `athleteId !== user.id`, verify caller and athlete share a `family_unit_id` via `family_members` (reuse the existing family-access pattern used by cascade-delete / dashboard parent view). Reject with 403 otherwise. Never trust the param without this check.
- Select `deadline_offset_months` in `TASK_COLUMNS`.
- Fetch the target athlete's `graduation_year` from `users`.
- Compute `deadline_date` per task via a shared helper.
- `athlete_task` status fetch keys on the target `athleteId` (not the caller) when viewing as parent.

**Shared helper** `server/utils/taskDeadlines.ts` (pure, unit-testable):

```ts
computeTaskDeadline(graduationYear: number | null, offsetMonths: number | null): string | null
```

Returns `YYYY-MM-DD` or null. One place for the anchor + subtraction logic.

### 2. Client: pass the active athlete id

**`composables/useTasks.ts`** — `fetchTasks` / `fetchTasksWithStatus` accept and forward an optional `athleteId`. **`pages/tasks/index.vue`** passes `currentAthleteId.value` (from `useParentContext`) when a parent is viewing. Deadlines arrive pre-computed; the page no longer depends on the never-fetched `athleteProfile` for deadline display. (`athleteProfile`/`currentGradeLevel` remain for the grade-band task filter; that pre-existing gap is out of scope except where it blocks `:40` — see Open Questions.)

### 3. Test seed

In `parent-tasks.spec.ts` `beforeAll` (or a shared seed helper):

- Set `player@test.com.graduation_year` to a value placing the athlete mid-high-school so multiple grade bands yield upcoming/future deadlines (e.g. current year + 2).
- Seed a **second athlete** (`e2e-athlete2@...`) into a player/athlete role linked to `parent@test.com`'s family unit so the switcher shows ≥2 options.
- Clean up seeded rows in `afterAll`.

### 4. Tests

`parent-tasks.spec.ts`:

- `test.use({ storageState: parent.json })` for the describe (parent context).
- Un-skip `:40`, `:55`, `:68`, `:82`; replace conditional `test.skip()` bodies with real assertions now that data exists.
- `:68` asserts ≥2 athlete options. `:82` asserts the checkbox is disabled for the parent. `:55` asserts ≥1 deadline-badge. `:40` asserts task-item renders.

## Data Flow

```
tasks page (parent) → useTasks.fetchTasksWithStatus(athleteId=currentAthleteId)
  → GET /api/tasks?athleteId=… (authz: same family_unit)
      → fetch task templates (+ deadline_offset_months)
      → fetch athlete graduation_year
      → computeTaskDeadline(gradYear, offset) per task
  → GET /api/athlete-tasks (status for athleteId)
  → merge → DeadlineBadge renders when deadline_date present & urgent
```

## Error Handling

- Unauthorized cross-athlete fetch → 403, logged via `useLogger`, generic statusMessage (no internal leak).
- Null graduation_year or offset → null deadline (no badge), not an error.
- `computeTaskDeadline` is pure and total (handles nulls), so no throw path in the hot loop.

## Testing

- **Unit** (`server/utils/taskDeadlines.spec.ts`): null grad year → null; null offset → null; offset subtraction crosses year boundary correctly (e.g. grad 2028, offset 30 → 2025-12-01); month arithmetic stable.
- **Unit** (`useTasks`): forwards `athleteId` to the endpoint.
- **E2E** (`parent-tasks.spec.ts`): the four un-skipped tests pass as parent with seeded data, across repeated runs (parallel-worker stable — scope shared-family assertions to seeded rows where counts could race).

## Open Questions

1. **`:40` root cause** — task-item skips today despite 20 grade-10 templates. Likely the 3s probe vs. the per-task sequential `getTaskDependencies` loop, or the athlete's grade not resolving to 10. Implementation must confirm (longer wait vs. seed grade alignment vs. fix `athleteProfile` fetch). The plan's first step is to reproduce and pin this before assuming it's solved by the deadline work.
2. **Offset granularity** — v1 ships single mid-band offsets per grade. If product later wants per-task dates, the column already exists; only the backfill changes.
