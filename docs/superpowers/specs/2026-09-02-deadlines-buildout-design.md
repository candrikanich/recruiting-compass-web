# Deadlines Feature Buildout — Design Spec

**Date:** 2026-09-02
**Status:** Approved design, pending implementation plan
**Branch:** TBD (off develop)

## Context

The Deadlines page (`pages/deadlines.vue`) shipped at ~30% of its original vision — a bare user-CRUD list with broken auth (fixed `03b3dabf`). The original March 2026 notifications sprint designed three converging layers: user deadlines (manual), system calendar (NCAA-sourced), and task deadlines (computed). Only user CRUD was wired; the system calendar table exists but is never queried; the notification pipeline handles offers and recommendations but not user deadlines.

This spec completes the feature: surface system recruiting dates, merge them with user deadlines into a unified timeline, wire user deadlines into the notification pipeline, migrate to family scope, and build iOS parity.

## Approved Design Decisions

| Decision | Choice |
|----------|--------|
| Division filtering | Union of all divisions from athlete's tracked schools |
| System calendar data source | TypeScript (`utils/recruitingCalendar/`) — not the `system_calendar` DB table |
| Deadline scoping | Family-scoped (`family_unit_id` + family RLS, same as `communication_templates`) |
| Page layout | Unified chronological timeline; badges distinguish source type |

## Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                  pages/deadlines.vue                    │
│  Unified timeline: system entries + user CRUD entries   │
└───────────────┬───────────────────────┬────────────────┘
                │                       │
    ┌───────────▼──────────┐  ┌────────▼─────────────┐
    │ useRecruitingDeadlines│  │ useDeadlines (existing)│
    │ (NEW — client-side)  │  │ (MODIFIED — $fetchAuth)│
    └───────────┬──────────┘  └────────┬─────────────┘
                │                      │
    ┌───────────▼──────────┐  ┌────────▼─────────────┐
    │ recruitingCalendar/  │  │ /api/deadlines/*      │
    │ resolver.ts (existing)│  │ (MODIFIED — family)   │
    │ calendarData.ts      │  └────────┬─────────────┘
    │ ncaaRecruitingCalendar│           │
    └──────────────────────┘  ┌────────▼─────────────┐
                              │ user_deadlines table  │
                              │ (MODIFIED — family_id)│
                              └──────────────────────┘
```

Notification pipeline:
```
cron/notifications → notificationGenerator.ts
                      ├── generateOfferNotifications()        (existing)
                      ├── generateRecommendationNotifications() (existing)
                      ├── generateUserDeadlineNotifications()  (NEW)
                      └── ...
                   → notificationDelivery.ts
                      └── fetchDeadlineItems()
                          ├── offers query         (existing)
                          ├── recommendations query (existing)
                          └── user_deadlines query  (NEW)
```

---

## Section 1: Data Model — Family-Scope Migration

**Migration file:** `supabase/migrations/YYYYMMDD_family_shared_user_deadlines.sql`

Follows the exact pattern of `20260906000000_family_shared_communication_templates.sql`:

1. **Add column + index:**
   ```sql
   ALTER TABLE public.user_deadlines
     ADD COLUMN IF NOT EXISTS family_unit_id uuid
     REFERENCES public.family_units(id) ON DELETE CASCADE;

   CREATE INDEX IF NOT EXISTS idx_user_deadlines_family_unit_id
     ON public.user_deadlines (family_unit_id);
   ```

2. **Derive trigger** (reuses generic `derive_family_unit_id()` from Phase 1):
   ```sql
   DROP TRIGGER IF EXISTS trg_user_deadlines_derive_family_unit_id
     ON public.user_deadlines;
   CREATE TRIGGER trg_user_deadlines_derive_family_unit_id
     BEFORE INSERT OR UPDATE ON public.user_deadlines
     FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();
   ```

3. **Backfill** existing rows via `family_members` (same subquery pattern).

4. **Cut RLS** — drop old user-scoped policies, create four family-scoped policies:
   - `user_deadlines_select_family` — USING family membership
   - `user_deadlines_insert_family` — WITH CHECK family membership
   - `user_deadlines_update_family` — USING + WITH CHECK family membership
   - `user_deadlines_delete_family` — USING family membership

   No `is_predefined` concept here (unlike templates) — all rows are user-owned.

**API endpoint changes:**
- `server/api/deadlines/index.get.ts` — query by `family_unit_id` (resolve from auth user via `family_members`) instead of `user_id`. RLS enforces, but explicit filter avoids leaking data if RLS misconfigured.
- `server/api/deadlines/index.post.ts` — stamp `family_unit_id` on insert (trigger also derives it, belt-and-suspenders).
- `server/api/deadlines/[id].delete.ts` — ownership check switches to family-scoped (verify row's `family_unit_id` matches caller's family).

---

## Section 2: Unified Deadline Type

**New file:** `types/deadline.ts`

```ts
import type { Division, AppSport } from "~/utils/recruitingCalendar/types";

/** Category for user-created deadlines (stored in DB). */
export type UserDeadlineCategory =
  | "application"
  | "decision"
  | "financial_aid"
  | "visit"
  | "custom";

/**
 * Category for system-generated deadlines (from recruiting calendar TS data).
 * Maps from CalendarMilestone.type + RecruitingPeriod.type.
 */
export type SystemDeadlineCategory =
  | "test"           // SAT/ACT dates
  | "signing"        // signing periods
  | "ncaa-period"    // dead/quiet/contact/evaluation period boundaries
  | "deadline"       // NCAA eligibility registration etc.
  | "application";   // FAFSA, Early Decision, Regular Decision

export interface UnifiedDeadline {
  id: string;
  label: string;
  date: string;                     // ISO date YYYY-MM-DD
  endDate?: string;                 // for period ranges (dead period start→end)
  category: UserDeadlineCategory | SystemDeadlineCategory;
  source: "user" | "system";
  sport?: AppSport;
  division?: Division;
  schoolId?: string;                // user deadlines optionally linked to a school
  description?: string;             // system entries carry NCAA descriptions
  url?: string;                     // test dates link to registration
}
```

**Pure merge function** in `utils/deadlines.ts`:

```ts
export function mergeDeadlines(
  userDeadlines: UnifiedDeadline[],
  systemDeadlines: UnifiedDeadline[],
): UnifiedDeadline[] {
  // Dedup by (date + label + source) — prevents double-rendering if a user
  // manually adds a deadline that matches a system entry
  const seen = new Set<string>();
  const all = [...systemDeadlines, ...userDeadlines];
  const deduped = all.filter((d) => {
    const key = `${d.date}|${d.label}|${d.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.sort((a, b) => a.date.localeCompare(b.date));
}
```

**Grouping helper** in the same file:

```ts
export function groupByMonth(
  deadlines: UnifiedDeadline[],
): Map<string, UnifiedDeadline[]> {
  // Key: "YYYY-MM" → array of deadlines in that month
}

export function splitUpcomingPast(
  deadlines: UnifiedDeadline[],
  today: string,
): { upcoming: UnifiedDeadline[]; past: UnifiedDeadline[] } {
  // upcoming = date >= today; past = date < today
}
```

---

## Section 3: System Calendar Resolution (Client-Side)

**New composable:** `composables/useRecruitingDeadlines.ts`

Resolves system deadlines from the existing TypeScript calendar data — no API call, no DB query.

**Inputs (reactive):**
- Athlete's sport — from user profile/preferences (derived context)
- Athlete's graduation year — from `users.graduation_year`
- Tracked school divisions — union of `school.division` from the school store

**Resolution steps:**
1. For each unique division in tracked schools, call `getUpcomingMilestones()` from `utils/recruitingCalendar/resolver.ts` with `{ sport, division, graduationYear, limit: 50 }`.
2. Also call `getSportCalendar()` for each division to get recruiting periods (dead/quiet/contact). Convert period start dates to deadlines (e.g., "D1 Baseball Dead Period begins Nov 9").
3. Convert `CalendarMilestone[]` and period-start entries to `UnifiedDeadline[]` with `source: "system"`.
4. Merge across divisions (dedup milestones that appear in multiple divisions, e.g., SAT dates).

**Output:** `Ref<UnifiedDeadline[]>` — reactive, recomputes when sport/divisions/grad year change.

**No cap on limit:** Unlike the Timeline sidebar's `getUpcomingMilestones(limit: 5)`, the Deadlines page shows ALL upcoming system dates. Pass `limit: 100` (effectively uncapped for a single season's data).

**Period-to-deadline conversion strategy:**
- Only surface the *start* of blocking periods (dead + recruiting_shutdown) as deadline entries — "D1 Baseball Dead Period starts Nov 9"
- Skip contact/evaluation/quiet periods (too noisy, low user value)
- Include the end date as `endDate` so the UI can render "Nov 9 – Nov 12"
- System entry IDs are deterministic strings: `system-${division}-${type}-${startDate}` (e.g., `system-D1-dead-2026-11-09`). No UUID needed — they're ephemeral, never persisted.
- Milestone IDs: `milestone-${date}-${title-slug}` (e.g., `milestone-2026-08-29-sat-test-date`)

---

## Section 4: Enhanced useDeadlines Composable

**Modified file:** `composables/useDeadlines.ts`

Current state: fetches user deadlines via `$fetchAuth`, returns flat list + CRUD.

Changes:
1. Import `useRecruitingDeadlines` for system entries.
2. New computed `unifiedDeadlines` that calls `mergeDeadlines(userDeadlines, systemDeadlines)`.
3. New computed `upcomingDeadlines` / `pastDeadlines` via `splitUpcomingPast`.
4. New computed `groupedByMonth` via `groupByMonth`.
5. CRUD functions remain user-deadline-only (system entries are read-only).

**Return shape:**
```ts
{
  // Raw sources
  userDeadlines: Ref<UserDeadline[]>,
  systemDeadlines: Ref<UnifiedDeadline[]>,

  // Merged
  unifiedDeadlines: ComputedRef<UnifiedDeadline[]>,
  upcomingDeadlines: ComputedRef<UnifiedDeadline[]>,
  pastDeadlines: ComputedRef<UnifiedDeadline[]>,
  groupedByMonth: ComputedRef<Map<string, UnifiedDeadline[]>>,

  // State
  loading: Ref<boolean>,
  error: Ref<string | null>,

  // CRUD (user deadlines only)
  fetchDeadlines: () => Promise<void>,
  createDeadline: (payload: CreateDeadlinePayload) => Promise<UserDeadline>,
  removeDeadline: (id: string) => Promise<void>,
}
```

---

## Section 5: Page Redesign

**Modified file:** `pages/deadlines.vue`

Current page has raw hex colors (`text-gray-900`, `bg-blue-600`) violating token audit. Redesign uses design system components and brand tokens throughout.

### Layout

```
┌─────────────────────────────────────────────────┐
│ Deadlines                        [+ Add Deadline]│
│ Track key dates in your recruiting journey       │
├─────────────────────────────────────────────────┤
│                                                  │
│ ── September 2026 ─────────────────────────────  │
│ ┌──────────────────────────────────────────────┐ │
│ │ 🏈 D1 Football Dead Period    Sep 1 – Sep 2 │ │
│ │    NCAA                                      │ │
│ ├──────────────────────────────────────────────┤ │
│ │ 📝 ACT Test Date              Sep 12        │ │
│ │    Test                                      │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Stanford App Due              Sep 15    [✕]  │ │
│ │    Application · Stanford                    │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ── October 2026 ───────────────────────────────  │
│ │ ...                                          │ │
│                                                  │
│ ── Past ───────────────────────────────────────  │
│ │ (dimmed items)                               │ │
└─────────────────────────────────────────────────┘
```

### Component decisions

- **Page wrapper:** Use `DesignSystemPageState` for loading/error/empty states.
- **Empty state:** `DesignSystemEmptyState` — update description to "Your upcoming recruiting dates, tests, and application deadlines" (remove misleading "View Recruiting Deadlines" button; replace with "Add Deadline" action).
- **List items:** Card-style rows with:
  - Left: label (bold) + date range (formatted nicely) + category `DesignSystemBadge`
  - System items: additional source badge (e.g., `<Badge color="blue" variant="light">NCAA</Badge>`, `<Badge color="purple" variant="light">SAT</Badge>`)
  - User items: Remove button (right side), no source badge
- **Month headers:** Sticky-ish section headers, `text-brand-slate-500 text-sm font-semibold uppercase`
- **Past deadlines:** Collapsed by default, expandable. Items render with `opacity-50`.
- **Add Deadline modal:** Keep current form fields (label, date, category). Add optional school picker (dropdown of tracked schools from school store). Use `DesignSystemModal` instead of raw div overlay. Use `DesignSystemButton` for actions.

### Date formatting

Use `Intl.DateTimeFormat` — no new dependency:
- Single date: "Sep 12, 2026"
- Range: "Sep 1 – Sep 2, 2026"
- Same month: "Sep 1 – 2, 2026"

### Badge color mapping

| Category | Color | Variant |
|----------|-------|---------|
| `test` (SAT/ACT) | purple | light |
| `signing` | emerald | solid |
| `ncaa-period` (dead/quiet) | blue | light |
| `deadline` (NCAA eligibility) | orange | light |
| `application` | blue | light |
| `decision` | emerald | light |
| `financial_aid` | orange | light |
| `visit` | purple | light |
| `custom` | slate | light |

---

## Section 6: Notification Pipeline Wiring

### 6a. In-app notifications

**Modified file:** `server/utils/notificationGenerator.ts`

New function `generateUserDeadlineNotifications()`:
- Query `user_deadlines` where `deadline_date` is within 14 days and in the future
- For each deadline, check days-until against `[14, 7, 3, 1]` lead times
- Dedup against existing notifications (same pattern as offer deadlines): check `(user_id, related_entity_id, related_entity_type: 'user_deadline', type: 'deadline_alert', scheduled_for: today)`
- Create notification with priority `high` when ≤3 days, `normal` otherwise

New templates in `TEMPLATES`:
```ts
user_deadline_14: {
  title: (label) => `Deadline in 14 days: ${label}`,
  message: (label) => `Your deadline "${label}" is in two weeks.`,
},
user_deadline_7: { ... },
user_deadline_3: { ... },
user_deadline_1: { ... },
```

Wire into `deliverNotificationsForUser()` — gated by `prefFor(prefs, "deadline_alert").push_enabled` (existing pref, same gate as offer deadlines).

### 6b. Email alerts

**Modified file:** `server/utils/notificationDelivery.ts`

Extend `fetchDeadlineItems()`:
```ts
// Existing: offers + recommendations queries

// NEW: user_deadlines
const { data: userDeadlines } = await supabase
  .from("user_deadlines")
  .select("id, label, deadline_date")
  .eq("user_id", userId);

if (userDeadlines) {
  for (const ud of userDeadlines) {
    if (!ud.deadline_date) continue;
    items.push({
      entityId: ud.id,
      entityType: "user_deadline",    // NEW entityType
      label: ud.label,
      deadlineDate: ud.deadline_date,
    });
  }
}
```

Update `DeadlineItem.entityType` union: `"offer" | "recommendation" | "user_deadline"`.

The existing `selectDeadlineEmails()` pure function and `DEADLINE_EMAIL_MILESTONES = [14, 7, 3, 1]` apply unchanged — user deadlines get the same email cadence.

`deadline_alert_log` dedup works automatically — `source_table: 'user_deadlines'` is already in the CHECK constraint.

### 6c. Weekly digest

**Modified file:** `server/utils/weeklyDigest.ts`

Extend `fetchUpcomingDeadlines()` to also query `user_deadlines` within the 14-day horizon:
```ts
const { data: userDeadlines } = await supabase
  .from("user_deadlines")
  .select("id, label, deadline_date")
  .eq("user_id", userId);
// Filter to 14-day window, map to existing DeadlineItem shape, merge with offers+events
```

---

## Section 7: iOS Parity

### Directory structure
```
Features/Deadlines/
├── Models/
│   └── Deadline.swift              // Codable model matching API response
├── Services/
│   ├── DeadlineManaging.swift      // Protocol: fetch, create, delete
│   └── DeadlineServiceImpl.swift   // Nitro API calls via URLSession
├── ViewModels/
│   └── DeadlinesViewModel.swift    // @Observable, unified list + CRUD
├── Views/
│   └── DeadlinesView.swift         // List + add sheet
└── Utils/
    └── RecruitingDeadlineResolver.swift  // Port of TS resolver (pure)
```

### Model

```swift
struct Deadline: Codable, Identifiable, Hashable {
    let id: String
    var label: String
    var deadlineDate: String          // ISO date
    var category: String
    var schoolId: String?

    enum CodingKeys: String, CodingKey {
        case id, label, category
        case deadlineDate = "deadline_date"
        case schoolId = "school_id"
    }
}
```

### Service

`DeadlineManaging` protocol with three operations:
- `fetchDeadlines() async throws -> [Deadline]`
- `createDeadline(_ request: CreateDeadlineRequest) async throws -> Deadline`
- `deleteDeadline(id: String) async throws`

`DeadlineServiceImpl` calls the web's Nitro API endpoints (`/api/deadlines`), NOT Supabase directly. This keeps the API contract in one place and means iOS gets family-scoping for free (the web endpoints handle it).

Uses the same `Bearer \(accessToken)` auth pattern as `TimelineAPIService`.

### ViewModel

`@Observable @MainActor class DeadlinesViewModel`:
- `deadlines: [Deadline]` — user deadlines from API
- `systemDeadlines: [UnifiedDeadline]` — from `RecruitingDeadlineResolver`
- `unifiedDeadlines: [UnifiedDeadline]` — merged, computed
- `isLoading`, `isSubmitting`, `errorMessage`
- `load()`, `addDeadline(...)`, `removeDeadline(id:)`

### System calendar on iOS

**Decision: port the resolver to Swift as pure functions.**

Rationale: The recruiting calendar data is ~1700 lines of typed constants — structured, no I/O, no dependencies. A thin server API would add latency, a network dependency, and another endpoint to maintain. The TS data changes once per NCAA season (annual). A Swift port is:
- ~400 lines (periods + milestones are just struct arrays)
- Fully testable (pure input → output)
- Offline-capable

The port covers:
- `RecruitingDeadlineResolver.swift` — equivalent of `getUpcomingMilestones()` + `getSportCalendar()`
- `RecruitingCalendarData.swift` — period/milestone constants (generated or hand-ported from `calendarData.ts`)
- Uses athlete's sport from `PlayerDetails.primarySport` + tracked school divisions from `SchoolStore`

**Staleness guard:** Both platforms read `SEASON_END` (TS: `calendarData.ts` line 38; Swift: equivalent constant). When `Date() > SEASON_END`, surface a "Calendar data may be outdated" banner. Annual update = bump both files.

### Navigation

- **iPhone:** Add `case deadlines` to `MoreMenuSection` enum + `MorePath` routing. Place in the "Planning" group alongside Timeline and Events.
- **iPad:** Change `AppDestination.deadlines` routing from `RecruitingTimelineView()` to `DeadlinesView()`.

### Push notifications

Already handled — `NotificationType.deadlineAlert` exists. No iOS changes needed for the notification display. The web's notification pipeline creates the notifications; iOS renders them.

---

## Section 8: Testing

### Unit tests (web)

| Test file | What it covers |
|-----------|---------------|
| `tests/unit/utils/deadlines.spec.ts` (NEW) | `mergeDeadlines` — sort order, dedup, mixed sources; `groupByMonth`; `splitUpcomingPast` |
| `tests/unit/composables/useRecruitingDeadlines.spec.ts` (NEW) | System deadline resolution: filters by sport, union of divisions, grad year gating, period-to-deadline conversion, empty school list → empty system deadlines |
| `tests/unit/composables/useDeadlines.spec.ts` (MODIFY) | Update mocks for family-scoped API; test unified merge with system deadlines |
| `tests/unit/server/deadlines.spec.ts` (MODIFY) | Family-scoped queries; `family_unit_id` stamped on insert; ownership check via family |
| `tests/unit/server/notificationGenerator.spec.ts` (MODIFY) | New `generateUserDeadlineNotifications` — 14/7/3/1 day milestones, dedup, correct templates |
| `tests/unit/server/notificationDelivery.spec.ts` (MODIFY) | `fetchDeadlineItems` includes user_deadlines; `selectDeadlineEmails` handles `user_deadline` entityType |
| `tests/unit/server/weeklyDigest.spec.ts` (MODIFY) | `fetchUpcomingDeadlines` includes user_deadlines in 14-day window |

### E2E tests (web)

| Spec file | Scenarios |
|-----------|-----------|
| `tests/e2e/deadlines.spec.ts` (NEW) | Page loads without error; system entries visible (at least one SAT/ACT date); add user deadline → appears in list; remove user deadline → disappears; month grouping renders; past deadlines section exists |

### iOS tests

| Test | What |
|------|------|
| `DeadlinesViewModelTests.swift` | load/add/remove, unified merge, error handling |
| `DeadlineServiceTests.swift` | Mock URLSession, correct endpoint URLs + auth |
| `RecruitingDeadlineResolverTests.swift` | Sport/division filtering, grad year gating, period-start conversion |

---

## Files Changed Summary

### New files
| File | Purpose |
|------|---------|
| `types/deadline.ts` | `UnifiedDeadline` type + category unions |
| `utils/deadlines.ts` | `mergeDeadlines`, `groupByMonth`, `splitUpcomingPast` |
| `composables/useRecruitingDeadlines.ts` | Client-side system calendar resolution |
| `supabase/migrations/YYYYMMDD_family_shared_user_deadlines.sql` | Family-scope migration |
| `tests/unit/utils/deadlines.spec.ts` | Merge/group/split unit tests |
| `tests/unit/composables/useRecruitingDeadlines.spec.ts` | System resolution tests |
| `tests/e2e/deadlines.spec.ts` | E2E scenarios |
| iOS: `Features/Deadlines/**` (7 files) | Full CRUD feature |

### Modified files
| File | Change |
|------|--------|
| `composables/useDeadlines.ts` | Integrate `useRecruitingDeadlines`, expose unified computed |
| `pages/deadlines.vue` | Redesign: unified timeline, design tokens, month groups, badges |
| `server/api/deadlines/index.get.ts` | Family-scoped query |
| `server/api/deadlines/index.post.ts` | Stamp `family_unit_id` |
| `server/api/deadlines/[id].delete.ts` | Family-scoped ownership check |
| `server/utils/notificationGenerator.ts` | Add `generateUserDeadlineNotifications` |
| `server/utils/notificationDelivery.ts` | Extend `fetchDeadlineItems` + `DeadlineItem` type |
| `server/utils/weeklyDigest.ts` | Extend `fetchUpcomingDeadlines` |
| `tests/unit/composables/useDeadlines.spec.ts` | Update mocks |
| `tests/unit/server/deadlines.spec.ts` | Family-scoped tests |
| `tests/unit/server/notificationGenerator.spec.ts` | User deadline generator tests |
| `tests/unit/server/notificationDelivery.spec.ts` | User deadline email tests |
| `tests/unit/server/weeklyDigest.spec.ts` | User deadline digest tests |
| iOS: `MoreMenuSection.swift` | Add `.deadlines` case |
| iOS: `MorePath.swift` / `MoreMenuView.swift` | Route deadlines |
| iOS: `AdaptiveRootView.swift` | Fix iPad stub → `DeadlinesView` |

---

## Open Questions / Risks

1. **NCAA calendar data staleness.** The TS data covers the 2026-27 season only (`SEASON_END = 2027-07-31`). When the 2027-28 PDFs publish (~August 2027), both TS and Swift files need manual update. The `SEASON_END` staleness banner mitigates user confusion but doesn't automate the update.

2. **Division union can be noisy.** An athlete tracking 15 schools across D1/D2/D3 will see dead periods for all three — potentially a long list. Mitigation: the UI groups by month and only surfaces blocking period *starts* (dead + recruiting_shutdown), not every contact/quiet window. Consider a "filter by division" dropdown if user feedback says it's too noisy.

3. **system_calendar DB table becomes dead code.** This spec deliberately does NOT use or remove the table. It can be dropped in a cleanup pass once both platforms are confirmed working with the TS data. The migration file stays in-repo (migrations are append-only).

4. **iOS calendar data sync.** The Swift port of calendar data must stay in sync with the TS source. This is a manual process — both files are typed constants, not generated. Consider a code-gen script in a follow-up if drift becomes a real problem.

5. **user_deadlines → family_unit_id backfill.** If any user_deadlines rows belong to users with no `family_members` entry (orphan accounts), their `family_unit_id` stays NULL and they become invisible under family RLS. The migration's backfill query handles this safely (only backfills unambiguous single-family owners), but orphan rows need investigation. Pre-migration: `SELECT count(*) FROM user_deadlines ud LEFT JOIN family_members fm ON ud.user_id = fm.user_id WHERE fm.user_id IS NULL` — if non-zero, decide whether to keep old user-scoped SELECT as a fallback or clean up orphans first.

6. **Notification dedup for family.** The cron runs per-user. A family with parent + player could both receive deadline alerts for the same user_deadline. This matches existing behavior for offer deadlines (each user in the family gets their own notification if they have the pref enabled). Acceptable for now; dedup-by-family is a future optimization.
