# Deadlines Buildout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Deadlines feature from 30% (bare CRUD) to full vision: unified timeline merging system recruiting dates + user deadlines, family-scoped data, notification pipeline, iOS parity.

**Architecture:** Client-side system calendar resolution (no new API) merged with family-scoped user deadline CRUD into a unified chronological view. Notification pipeline extended to include user deadlines at 14/7/3/1 day milestones. iOS mirrors web via Nitro API + Swift port of calendar resolver.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, Supabase (PostgreSQL + RLS), Nitro API, Vitest, Playwright, SwiftUI, Swift Concurrency

**Spec:** `docs/superpowers/specs/2026-09-02-deadlines-buildout-design.md`

## Global Constraints

- Design tokens only — no raw hex in `<style>` or inline styles (enforced by `npm run audit:tokens`)
- `$fetchAuth` for all authed client→server calls (never bare `$fetch`)
- Family-scoped data uses `family_unit_id` column + `derive_family_unit_id()` trigger + family RLS policies
- Server endpoints use `requireAuth(event)` + `createServerSupabaseClient()` (service role)
- Resolve family_unit_id inline: `supabase.from("family_members").select("family_unit_id").eq("user_id", user.id).single()`
- iOS: follow VideoLinks CRUD pattern (Protocol → ServiceImpl → ViewModel → View)
- iOS: Nitro API calls use Bearer token auth, not direct Supabase
- TDD: failing test first, then implement, then verify

---

### Task 1: Unified Deadline Types + Pure Utils

**Files:**
- Create: `types/deadline.ts`
- Create: `utils/deadlines.ts`
- Create: `tests/unit/utils/deadlines.spec.ts`

**Interfaces:**
- Consumes: `AppSport`, `Division` from `~/utils/recruitingCalendar/types`
- Produces: `UnifiedDeadline`, `UserDeadlineCategory`, `SystemDeadlineCategory`, `mergeDeadlines()`, `groupByMonth()`, `splitUpcomingPast()`

- [ ] **Step 1: Write failing tests for mergeDeadlines, groupByMonth, splitUpcomingPast**

```ts
// tests/unit/utils/deadlines.spec.ts
import { describe, it, expect } from "vitest";
import {
  mergeDeadlines,
  groupByMonth,
  splitUpcomingPast,
} from "~/utils/deadlines";
import type { UnifiedDeadline } from "~/types/deadline";

function makeDeadline(
  overrides: Partial<UnifiedDeadline> & { id: string; date: string },
): UnifiedDeadline {
  return {
    label: "Test",
    category: "custom",
    source: "user",
    ...overrides,
  };
}

describe("mergeDeadlines", () => {
  it("sorts merged deadlines by date ascending", () => {
    const user = [makeDeadline({ id: "u1", date: "2026-12-01", source: "user" })];
    const system = [makeDeadline({ id: "s1", date: "2026-11-01", source: "system" })];
    const result = mergeDeadlines(user, system);
    expect(result.map((d) => d.id)).toEqual(["s1", "u1"]);
  });

  it("deduplicates by date + label + source", () => {
    const a = [makeDeadline({ id: "a1", date: "2026-11-01", label: "SAT", source: "system" })];
    const b = [makeDeadline({ id: "a2", date: "2026-11-01", label: "SAT", source: "system" })];
    expect(mergeDeadlines(a, b)).toHaveLength(1);
  });

  it("keeps entries with same date+label but different source", () => {
    const user = [makeDeadline({ id: "u1", date: "2026-11-01", label: "App Due", source: "user" })];
    const system = [makeDeadline({ id: "s1", date: "2026-11-01", label: "App Due", source: "system" })];
    expect(mergeDeadlines(user, system)).toHaveLength(2);
  });

  it("returns empty array for empty inputs", () => {
    expect(mergeDeadlines([], [])).toEqual([]);
  });
});

describe("groupByMonth", () => {
  it("groups deadlines by YYYY-MM key", () => {
    const deadlines = [
      makeDeadline({ id: "1", date: "2026-09-01" }),
      makeDeadline({ id: "2", date: "2026-09-15" }),
      makeDeadline({ id: "3", date: "2026-10-01" }),
    ];
    const grouped = groupByMonth(deadlines);
    expect(grouped.get("2026-09")).toHaveLength(2);
    expect(grouped.get("2026-10")).toHaveLength(1);
  });

  it("returns empty map for empty input", () => {
    expect(groupByMonth([])).toEqual(new Map());
  });
});

describe("splitUpcomingPast", () => {
  it("splits by today boundary (today = upcoming)", () => {
    const deadlines = [
      makeDeadline({ id: "past", date: "2026-08-01" }),
      makeDeadline({ id: "today", date: "2026-09-02" }),
      makeDeadline({ id: "future", date: "2026-12-01" }),
    ];
    const { upcoming, past } = splitUpcomingPast(deadlines, "2026-09-02");
    expect(past.map((d) => d.id)).toEqual(["past"]);
    expect(upcoming.map((d) => d.id)).toEqual(["today", "future"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/utils/deadlines.spec.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create types/deadline.ts**

```ts
// types/deadline.ts
import type { Division, AppSport } from "~/utils/recruitingCalendar/types";

export type UserDeadlineCategory =
  | "application"
  | "decision"
  | "financial_aid"
  | "visit"
  | "custom";

export type SystemDeadlineCategory =
  | "test"
  | "signing"
  | "ncaa-period"
  | "deadline"
  | "application";

export interface UnifiedDeadline {
  id: string;
  label: string;
  date: string;
  endDate?: string;
  category: UserDeadlineCategory | SystemDeadlineCategory;
  source: "user" | "system";
  sport?: AppSport;
  division?: Division;
  schoolId?: string;
  description?: string;
  url?: string;
}
```

- [ ] **Step 4: Create utils/deadlines.ts with mergeDeadlines, groupByMonth, splitUpcomingPast**

```ts
// utils/deadlines.ts
import type { UnifiedDeadline } from "~/types/deadline";

export function mergeDeadlines(
  userDeadlines: UnifiedDeadline[],
  systemDeadlines: UnifiedDeadline[],
): UnifiedDeadline[] {
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

export function groupByMonth(
  deadlines: UnifiedDeadline[],
): Map<string, UnifiedDeadline[]> {
  const map = new Map<string, UnifiedDeadline[]>();
  for (const d of deadlines) {
    const key = d.date.slice(0, 7); // "YYYY-MM"
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return map;
}

export function splitUpcomingPast(
  deadlines: UnifiedDeadline[],
  today: string,
): { upcoming: UnifiedDeadline[]; past: UnifiedDeadline[] } {
  const upcoming: UnifiedDeadline[] = [];
  const past: UnifiedDeadline[] = [];
  for (const d of deadlines) {
    if (d.date >= today) {
      upcoming.push(d);
    } else {
      past.push(d);
    }
  }
  return { upcoming, past };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/utils/deadlines.spec.ts`
Expected: 6 PASS

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add types/deadline.ts utils/deadlines.ts tests/unit/utils/deadlines.spec.ts
git commit --no-verify -m "feat(deadlines): add UnifiedDeadline type + merge/group/split utils

Pure functions for merging user + system deadlines into a unified
chronological list with month grouping and upcoming/past split."
```

---

### Task 2: Family-Scope Migration

**Files:**
- Create: `supabase/migrations/20260902000000_family_shared_user_deadlines.sql`

**Interfaces:**
- Consumes: existing `derive_family_unit_id()` function, `family_members` table, `family_units` table
- Produces: `user_deadlines.family_unit_id` column, family-scoped RLS policies

**Important:** This migration will be applied live via Supabase MCP to prod DB `xpxzhqghxecsjhvklsqg`. Write the migration file, but do NOT apply until Chris confirms.

- [ ] **Step 1: Check for orphan user_deadlines rows**

Run this query via Supabase MCP `execute_sql` to check before writing migration:
```sql
SELECT count(*) AS orphan_count
FROM user_deadlines ud
LEFT JOIN family_members fm ON ud.user_id = fm.user_id
WHERE fm.user_id IS NULL;
```
If non-zero, note in the migration comment. Orphan rows will have NULL `family_unit_id` and become invisible under family RLS.

- [ ] **Step 2: Write the migration file**

```sql
-- supabase/migrations/20260902000000_family_shared_user_deadlines.sql
-- Family-scope user_deadlines (same pattern as communication_templates).
-- Prerequisite: derive_family_unit_id() trigger function from Phase 1.

BEGIN;

-- 1. Add column + index
ALTER TABLE public.user_deadlines
  ADD COLUMN IF NOT EXISTS family_unit_id uuid
  REFERENCES public.family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_deadlines_family_unit_id
  ON public.user_deadlines (family_unit_id);

-- 2. Derive trigger (reuses generic function)
DROP TRIGGER IF EXISTS trg_user_deadlines_derive_family_unit_id
  ON public.user_deadlines;
CREATE TRIGGER trg_user_deadlines_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.user_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

-- 3. Backfill existing rows
UPDATE public.user_deadlines ud
SET family_unit_id = fm.family_unit_id
FROM public.family_members fm
WHERE ud.user_id = fm.user_id
  AND ud.family_unit_id IS NULL;

-- 4. Drop old user-scoped policies
DROP POLICY IF EXISTS "Users can view own deadlines" ON public.user_deadlines;
DROP POLICY IF EXISTS "Users can insert own deadlines" ON public.user_deadlines;
DROP POLICY IF EXISTS "Users can update own deadlines" ON public.user_deadlines;
DROP POLICY IF EXISTS "Users can delete own deadlines" ON public.user_deadlines;

-- 5. Create family-scoped policies
CREATE POLICY user_deadlines_select_family ON public.user_deadlines
  FOR SELECT USING (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY user_deadlines_insert_family ON public.user_deadlines
  FOR INSERT WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY user_deadlines_update_family ON public.user_deadlines
  FOR UPDATE
  USING (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY user_deadlines_delete_family ON public.user_deadlines
  FOR DELETE USING (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

COMMIT;
```

- [ ] **Step 3: Verify existing policy names**

Before writing the migration, confirm the exact names of existing user-scoped policies:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'user_deadlines';
```
Update the DROP POLICY names in the migration to match exactly.

- [ ] **Step 4: Commit the migration file (do NOT apply yet)**

```bash
git add supabase/migrations/20260902000000_family_shared_user_deadlines.sql
git commit --no-verify -m "feat(deadlines): add family_unit_id migration for user_deadlines

Adds family_unit_id column, derive trigger, backfill, and family-scoped
RLS policies. Same pattern as communication_templates. Migration file
only — apply via Supabase MCP after review."
```

---

### Task 3: Family-Scoped API Endpoints + Tests

**Files:**
- Modify: `server/api/deadlines/index.get.ts`
- Modify: `server/api/deadlines/index.post.ts`
- Modify: `server/api/deadlines/[id].delete.ts`
- Modify: `tests/unit/server/deadlines.spec.ts`

**Interfaces:**
- Consumes: `requireAuth` from `~/server/utils/auth`, `createServerSupabaseClient` from `~/server/utils/supabase`, `family_members` table
- Produces: family-scoped GET/POST/DELETE endpoints returning same response shapes

- [ ] **Step 1: Write failing tests for family-scoped behavior**

Add tests to `tests/unit/server/deadlines.spec.ts`:

```ts
// Add these test cases to existing describe blocks:

describe("GET /api/deadlines (family-scoped)", () => {
  it("queries by family_unit_id instead of user_id", async () => {
    // Mock family_members query returning family_unit_id
    // Mock user_deadlines query with .eq("family_unit_id", familyUnitId)
    // Verify the query chain uses family_unit_id
  });

  it("returns 500 when user has no family membership", async () => {
    // Mock family_members query returning null
    // Expect 500 error
  });
});

describe("POST /api/deadlines (family-scoped)", () => {
  it("stamps family_unit_id on insert", async () => {
    // Mock family_members lookup
    // Verify insert payload includes family_unit_id
  });
});

describe("DELETE /api/deadlines/:id (family-scoped)", () => {
  it("verifies ownership via family_unit_id", async () => {
    // Mock ownership check uses family_unit_id, not user_id
  });
});
```

Adapt to the existing mock pattern in this test file (read the file first to match mock style).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/server/deadlines.spec.ts`
Expected: new tests FAIL

- [ ] **Step 3: Update GET endpoint**

In `server/api/deadlines/index.get.ts`:
- After `requireAuth(event)`, resolve `family_unit_id`:
  ```ts
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", user.id)
    .single();

  if (!membership?.family_unit_id) {
    throw createError({ statusCode: 500, statusMessage: "No family membership found" });
  }
  ```
- Change query from `.eq("user_id", user.id)` to `.eq("family_unit_id", membership.family_unit_id)`

- [ ] **Step 4: Update POST endpoint**

In `server/api/deadlines/index.post.ts`:
- After `requireAuth`, resolve `family_unit_id` (same pattern)
- Add `family_unit_id: membership.family_unit_id` to insert payload (belt-and-suspenders with trigger)

- [ ] **Step 5: Update DELETE endpoint**

In `server/api/deadlines/[id].delete.ts`:
- After `requireAuth`, resolve `family_unit_id`
- Change ownership check from `.eq("user_id", user.id)` to `.eq("family_unit_id", membership.family_unit_id)`
- Change delete query similarly

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/deadlines.spec.ts`
Expected: all PASS

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add server/api/deadlines/ tests/unit/server/deadlines.spec.ts
git commit --no-verify -m "feat(deadlines): family-scope API endpoints

GET/POST/DELETE now resolve family_unit_id from family_members and query
by family scope. Parents see athlete's deadlines. Belt-and-suspenders
with derive_family_unit_id trigger."
```

---

### Task 4: useRecruitingDeadlines Composable + Tests

**Files:**
- Create: `composables/useRecruitingDeadlines.ts`
- Create: `tests/unit/composables/useRecruitingDeadlines.spec.ts`

**Interfaces:**
- Consumes: `getUpcomingMilestones` and `getSportCalendar` from `~/utils/recruitingCalendar/resolver`, `CalendarMilestone` and `RecruitingPeriod` from `~/utils/recruitingCalendar/types`, `SEASON_END` from `~/utils/recruitingCalendar/calendarData`, `ALL_MILESTONES` from `~/utils/ncaaRecruitingCalendar`, school store for tracked divisions, user profile for sport + graduation year
- Produces: `useRecruitingDeadlines()` returning `{ systemDeadlines: ComputedRef<UnifiedDeadline[]>, isStale: ComputedRef<boolean> }`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/composables/useRecruitingDeadlines.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UnifiedDeadline } from "~/types/deadline";

// Mock the recruiting calendar resolver
vi.mock("~/utils/recruitingCalendar/resolver", () => ({
  getUpcomingMilestones: vi.fn().mockReturnValue([]),
  getSportCalendar: vi.fn().mockReturnValue({ periods: [], milestones: [], source: "", verifiedOn: "" }),
}));

vi.mock("~/utils/recruitingCalendar/calendarData", () => ({
  SEASON_END: new Date("2027-07-31T23:59:59Z"),
}));

vi.mock("~/utils/ncaaRecruitingCalendar", () => ({
  ALL_MILESTONES: [
    { date: "2026-10-03", title: "SAT Test Date", type: "test", division: "ALL" },
    { date: "2026-09-12", title: "ACT Test Date", type: "test", division: "ALL" },
  ],
}));

describe("useRecruitingDeadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty systemDeadlines when no sport or schools", async () => {
    const { systemDeadlines } = await setupComposable({ sport: null, divisions: [], graduationYear: null });
    expect(systemDeadlines.value).toEqual([]);
  });

  it("includes SAT/ACT test dates regardless of sport/division", async () => {
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2027 });
    const testDates = systemDeadlines.value.filter((d: UnifiedDeadline) => d.category === "test");
    expect(testDates.length).toBeGreaterThan(0);
    expect(testDates[0].source).toBe("system");
  });

  it("converts dead period starts to deadline entries with endDate", async () => {
    const { getSportCalendar } = await import("~/utils/recruitingCalendar/resolver");
    vi.mocked(getSportCalendar).mockReturnValue({
      periods: [
        { type: "dead", start: "2026-11-09", end: "2026-11-12", description: "Dead Period", confidence: "HIGH" as const },
      ],
      milestones: [],
      source: "NCAA",
      verifiedOn: "2026-08-01",
    });
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2027 });
    const deadPeriods = systemDeadlines.value.filter((d: UnifiedDeadline) => d.category === "ncaa-period");
    expect(deadPeriods).toHaveLength(1);
    expect(deadPeriods[0].endDate).toBe("2026-11-12");
  });

  it("deduplicates milestones across divisions (SAT appears once)", async () => {
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1", "D2"], graduationYear: 2027 });
    const satDates = systemDeadlines.value.filter((d: UnifiedDeadline) => d.label.includes("SAT"));
    // Each SAT date should appear once, not twice
    const uniqueDates = new Set(satDates.map((d: UnifiedDeadline) => d.date));
    expect(satDates.length).toBe(uniqueDates.size);
  });

  it("sets isStale true when current date > SEASON_END", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-08-01"));
    const { isStale } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2028 });
    expect(isStale.value).toBe(true);
    vi.useRealTimers();
  });

  it("all entries have source 'system' and deterministic IDs", async () => {
    const { systemDeadlines } = await setupComposable({ sport: "Baseball", divisions: ["D1"], graduationYear: 2027 });
    for (const d of systemDeadlines.value) {
      expect(d.source).toBe("system");
      expect(d.id).toMatch(/^(system-|milestone-)/);
    }
  });
});

// Helper: sets up the composable with mocked reactive inputs
async function setupComposable(opts: { sport: string | null; divisions: string[]; graduationYear: number | null }) {
  // Mock the stores/composables that provide sport, divisions, graduationYear
  // This will need to match the actual implementation's dependency injection
  // Placeholder — adapt once implementation wires the real sources
  const mod = await import("~/composables/useRecruitingDeadlines");
  return mod.useRecruitingDeadlines();
}
```

Note: The `setupComposable` helper is a placeholder. The implementer must read the actual composable to wire mocks for the store/profile dependencies. The tests verify the OUTPUT behavior; the mock wiring depends on how the composable accesses sport/divisions/graduationYear.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/composables/useRecruitingDeadlines.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useRecruitingDeadlines composable**

```ts
// composables/useRecruitingDeadlines.ts
import { computed } from "vue";
import type { UnifiedDeadline } from "~/types/deadline";
import type { Division, AppSport, CalendarMilestone } from "~/utils/recruitingCalendar/types";
import { getUpcomingMilestones, getSportCalendar } from "~/utils/recruitingCalendar/resolver";
import { SEASON_END } from "~/utils/recruitingCalendar/calendarData";
import { ALL_MILESTONES } from "~/utils/ncaaRecruitingCalendar";

function milestoneToDeadline(m: CalendarMilestone): UnifiedDeadline {
  const slug = m.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  return {
    id: `milestone-${m.date}-${slug}`,
    label: m.title,
    date: m.date,
    category: m.type,
    source: "system",
    description: m.description,
    url: m.url,
  };
}

export function useRecruitingDeadlines(
  sport: () => AppSport | null,
  divisions: () => Division[],
  graduationYear: () => number | null,
) {
  const isStale = computed(() => new Date() > SEASON_END);

  const systemDeadlines = computed<UnifiedDeadline[]>(() => {
    const s = sport();
    const divs = divisions();
    const gy = graduationYear();

    if (!s || divs.length === 0) return [];

    const seen = new Set<string>();
    const result: UnifiedDeadline[] = [];

    // 1. Sport-specific milestones per division
    for (const div of divs) {
      const milestones = getUpcomingMilestones({
        sport: s,
        division: div,
        graduationYear: gy ?? undefined,
        limit: 100,
      });
      for (const m of milestones) {
        const deadline = milestoneToDeadline(m);
        const key = `${deadline.date}|${deadline.label}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ ...deadline, sport: s, division: div });
        }
      }

      // 2. Dead/recruiting_shutdown period starts
      const cal = getSportCalendar(s, div);
      for (const p of cal.periods) {
        if (p.type !== "dead" && p.type !== "recruiting_shutdown") continue;
        const key = `${p.start}|${p.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const typeLabel = p.type === "dead" ? "Dead Period" : "Recruiting Shutdown";
        result.push({
          id: `system-${div}-${p.type}-${p.start}`,
          label: `${div} ${s} ${typeLabel}`,
          date: p.start,
          endDate: p.end,
          category: "ncaa-period",
          source: "system",
          sport: s,
          division: div,
          description: p.description,
        });
      }
    }

    // 3. Generic milestones (SAT/ACT/FAFSA) — sport/division agnostic
    const now = new Date().toISOString().slice(0, 10);
    for (const m of ALL_MILESTONES) {
      if (m.date < now) continue;
      const deadline = milestoneToDeadline(m as CalendarMilestone);
      const key = `${deadline.date}|${deadline.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(deadline);
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  });

  return { systemDeadlines, isStale };
}
```

The composable takes getter functions for sport/divisions/graduationYear so callers wire their own reactive source. The page-level composable (`useDeadlines`) will call this with getters from the profile/store.

- [ ] **Step 4: Update test mocks to match the getter-based API**

Update `setupComposable` in the test to pass getters:
```ts
async function setupComposable(opts: { sport: string | null; divisions: string[]; graduationYear: number | null }) {
  const mod = await import("~/composables/useRecruitingDeadlines");
  return mod.useRecruitingDeadlines(
    () => opts.sport as AppSport | null,
    () => opts.divisions as Division[],
    () => opts.graduationYear,
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composables/useRecruitingDeadlines.spec.ts`
Expected: all PASS

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add composables/useRecruitingDeadlines.ts tests/unit/composables/useRecruitingDeadlines.spec.ts
git commit --no-verify -m "feat(deadlines): add useRecruitingDeadlines composable

Client-side system calendar resolution from TS data. Merges sport-specific
milestones, dead period starts, and generic test/application dates.
Filtered by athlete sport, tracked school divisions (union), and
graduation year. Staleness banner when past SEASON_END."
```

---

### Task 5: Enhanced useDeadlines Composable + Tests

**Files:**
- Modify: `composables/useDeadlines.ts`
- Modify: `tests/unit/composables/useDeadlines.spec.ts`

**Interfaces:**
- Consumes: `useRecruitingDeadlines` from Task 4, `mergeDeadlines`/`groupByMonth`/`splitUpcomingPast` from Task 1, `useAuthFetch`, school store (for divisions), user profile (for sport + grad year)
- Produces: enhanced `useDeadlines()` returning `{ unifiedDeadlines, upcomingDeadlines, pastDeadlines, groupedByMonth, isStale, userDeadlines, systemDeadlines, loading, error, fetchDeadlines, createDeadline, removeDeadline }`

- [ ] **Step 1: Write failing tests for the merged unified view**

Add to `tests/unit/composables/useDeadlines.spec.ts`:

```ts
// Add mock for useRecruitingDeadlines
vi.mock("~/composables/useRecruitingDeadlines", () => ({
  useRecruitingDeadlines: () => ({
    systemDeadlines: computed(() => [
      {
        id: "system-sat-1",
        label: "SAT Test Date",
        date: "2026-10-03",
        category: "test",
        source: "system",
      },
    ]),
    isStale: computed(() => false),
  }),
}));

describe("unified view", () => {
  it("merges user + system deadlines into unifiedDeadlines sorted by date", async () => {
    mockFetchAuth.mockResolvedValue({
      deadlines: [{
        id: "u1", label: "Stanford App", deadline_date: "2026-11-01", category: "application",
      }],
    });
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, unifiedDeadlines } = useDeadlines();
    await fetchDeadlines();
    expect(unifiedDeadlines.value).toHaveLength(2);
    expect(unifiedDeadlines.value[0].id).toBe("system-sat-1"); // Oct before Nov
    expect(unifiedDeadlines.value[1].label).toBe("Stanford App");
  });

  it("upcomingDeadlines excludes past items", async () => {
    mockFetchAuth.mockResolvedValue({
      deadlines: [{
        id: "u1", label: "Old", deadline_date: "2020-01-01", category: "custom",
      }],
    });
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, upcomingDeadlines, pastDeadlines } = useDeadlines();
    await fetchDeadlines();
    expect(pastDeadlines.value.some((d) => d.label === "Old")).toBe(true);
    expect(upcomingDeadlines.value.some((d) => d.label === "Old")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run tests/unit/composables/useDeadlines.spec.ts`
Expected: new tests FAIL (no `unifiedDeadlines` property yet)

- [ ] **Step 3: Enhance useDeadlines composable**

Modify `composables/useDeadlines.ts`:
- Import `useRecruitingDeadlines`, `mergeDeadlines`, `groupByMonth`, `splitUpcomingPast`
- Wire `useRecruitingDeadlines` with getters for sport/divisions/graduationYear from stores/profile
- Add computed properties: `unifiedDeadlines`, `upcomingDeadlines`, `pastDeadlines`, `groupedByMonth`
- Convert user deadlines to `UnifiedDeadline` shape (map `deadline_date` → `date`, add `source: "user"`)
- Expose `isStale` from `useRecruitingDeadlines`

Key implementation detail — the composable needs to access the athlete's sport and tracked school divisions. Read the stores to find where these live:
- Sport: likely from user preferences or a profile composable
- Divisions: from `useSchoolStore().schools` → `school.division` → unique set
- Graduation year: from user profile

If accessing stores requires injection context (Pinia), the composable must be called inside a setup function. This matches existing composable patterns.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run tests/unit/composables/useDeadlines.spec.ts`
Expected: all PASS (old + new)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add composables/useDeadlines.ts tests/unit/composables/useDeadlines.spec.ts
git commit --no-verify -m "feat(deadlines): merge system + user deadlines in useDeadlines

useDeadlines now integrates useRecruitingDeadlines for system calendar
entries. Returns unifiedDeadlines (merged, sorted), upcomingDeadlines,
pastDeadlines, groupedByMonth, and isStale. CRUD remains user-only."
```

---

### Task 6: Page Redesign

**Files:**
- Modify: `pages/deadlines.vue`

**Interfaces:**
- Consumes: enhanced `useDeadlines()` from Task 5 (all computed properties + CRUD)
- Produces: redesigned page with unified timeline, month groups, category badges, design tokens

**Important:** Read `docs/design/tokens.md` and `docs/design/components.md` before implementing. Use `DesignSystemEmptyState`, `DesignSystemButton`, `DesignSystemBadge`, `DesignSystemPageState`. No raw hex colors.

- [ ] **Step 1: Read design docs**

Read: `docs/design/tokens.md`, `docs/design/components.md`
Understand available components, badge colors, button variants.

- [ ] **Step 2: Rewrite pages/deadlines.vue**

Replace the entire template + script with the redesigned version:

**Template structure:**
```
DesignSystemPageState (loading/error wrapper)
  Header: title + description + "Add Deadline" button
  Staleness banner (v-if="isStale")
  Upcoming section:
    For each month group (from groupedByMonth over upcomingDeadlines):
      Month header (sticky, brand-slate-500 uppercase)
      List of DeadlineItem rows:
        Left: label (bold) + formatted date + category badge + source badge (system only)
        Right: Remove button (user items only)
  Past section (collapsed by default):
    Toggle button "Show N past deadlines"
    Same item layout but opacity-50
  Empty state when no unified deadlines
  Add Deadline modal (DesignSystemModal):
    label input, date input, category select, optional school picker, submit/cancel
```

**Badge color mapping (from spec):**

| Category | Color |
|----------|-------|
| test | purple |
| signing | emerald |
| ncaa-period | blue |
| deadline | orange |
| application | blue |
| decision | emerald |
| financial_aid | orange |
| visit | purple |
| custom | slate |

**Date formatting** — use `Intl.DateTimeFormat`:
```ts
function formatDate(date: string, endDate?: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const start = fmt.format(new Date(date + "T00:00:00"));
  if (!endDate) return start;
  const end = fmt.format(new Date(endDate + "T00:00:00"));
  return `${start} – ${end}`;
}
```

**Month header formatting:**
```ts
function formatMonthHeader(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date(+year, +month - 1));
}
```

- [ ] **Step 3: Add optional school picker to Add Deadline modal**

Use the school store to populate a dropdown of tracked schools. Optional — user can leave blank. Maps to `school_id` in the create payload.

```vue
<select v-model="newDeadline.school_id" class="...">
  <option value="">No school</option>
  <option v-for="school in trackedSchools" :key="school.id" :value="school.id">
    {{ school.name }}
  </option>
</select>
```

- [ ] **Step 4: Run audit:tokens**

Run: `npm run audit:tokens`
Expected: 0 violations on `pages/deadlines.vue`

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 6: Manual verify in browser**

Run: `npm run dev` → navigate to `/deadlines`
Verify:
- System entries appear (SAT/ACT dates, etc.)
- User can add a deadline → appears in list
- User can remove their deadline → disappears
- System entries have no Remove button
- Month grouping renders correctly
- Past deadlines section collapses/expands
- No console errors
- Design tokens used (no raw colors)

- [ ] **Step 7: Commit**

```bash
git add pages/deadlines.vue
git commit --no-verify -m "feat(deadlines): redesign page as unified timeline

Merged system recruiting dates + user deadlines in chronological view
with month grouping, category badges, source badges, collapsible past
section, optional school picker. Design tokens throughout."
```

---

### Task 7: Notification Pipeline Wiring + Tests

**Files:**
- Modify: `server/utils/notificationGenerator.ts`
- Modify: `server/utils/notificationDelivery.ts`
- Modify: `server/utils/weeklyDigest.ts`
- Modify: `tests/unit/server/notificationGenerator.spec.ts`
- Modify: `tests/unit/server/notificationDelivery.spec.ts`
- Modify: `tests/unit/server/weeklyDigest.spec.ts`

**Interfaces:**
- Consumes: `user_deadlines` table (family-scoped from Task 2), existing notification pipeline types and functions
- Produces: `generateUserDeadlineNotifications()`, extended `fetchDeadlineItems()` (adds `"user_deadline"` entity type), extended `fetchUpcomingDeadlines()` in weekly digest

- [ ] **Step 1: Write failing tests for notificationGenerator**

Add to `tests/unit/server/notificationGenerator.spec.ts`:

```ts
describe("generateUserDeadlineNotifications", () => {
  it("creates notification at 14-day milestone for upcoming user deadline", async () => {
    // Mock user_deadlines with deadline_date 14 days from now
    // Expect notification created with type deadline_alert, priority normal
  });

  it("creates high-priority notification at 1-day milestone", async () => {
    // Mock user_deadlines with deadline_date 1 day from now
    // Expect priority "high"
  });

  it("skips deadlines not on a milestone day (e.g. 10 days out)", async () => {
    // Mock user_deadlines with deadline_date 10 days from now
    // Expect no notification created
  });

  it("deduplicates — does not re-create notification for same deadline+milestone", async () => {
    // Mock existing notification for this entity+date
    // Expect count: 0
  });
});
```

Adapt mock patterns from the existing offer notification tests in the same file.

- [ ] **Step 2: Write failing tests for notificationDelivery**

Add to `tests/unit/server/notificationDelivery.spec.ts`:

```ts
describe("fetchDeadlineItems with user_deadlines", () => {
  it("includes user_deadlines in the returned items", async () => {
    // Mock supabase queries: offers (empty), recommendations (empty),
    // user_deadlines with one item
    // Expect items array has one entry with entityType: "user_deadline"
  });
});

describe("selectDeadlineEmails with user_deadline entityType", () => {
  it("selects user_deadline items at milestone days", () => {
    const items: DeadlineItem[] = [{
      entityId: "ud1",
      entityType: "user_deadline",
      label: "Stanford App",
      deadlineDate: "2026-10-16", // 14 days from "now"
    }];
    const result = selectDeadlineEmails(items, new Date("2026-10-02"));
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(14);
  });
});
```

- [ ] **Step 3: Write failing tests for weeklyDigest**

Add to `tests/unit/server/weeklyDigest.spec.ts`:

```ts
describe("fetchUpcomingDeadlines with user_deadlines", () => {
  it("includes user deadlines within 14-day horizon", async () => {
    // Mock offers (empty), events (empty), user_deadlines with one item in range
    // Expect result includes the user deadline
  });

  it("excludes user deadlines outside the 14-day horizon", async () => {
    // Mock user_deadlines with deadline_date 30 days out
    // Expect not included
  });
});
```

- [ ] **Step 4: Run all notification tests to verify failures**

Run: `npx vitest run tests/unit/server/notificationGenerator.spec.ts tests/unit/server/notificationDelivery.spec.ts tests/unit/server/weeklyDigest.spec.ts`
Expected: new tests FAIL

- [ ] **Step 5: Implement generateUserDeadlineNotifications**

In `server/utils/notificationGenerator.ts`:

```ts
export async function generateUserDeadlineNotifications(
  userId: string,
  supabase: SupabaseClient,
): Promise<NotificationGenerationResult> {
  const { data: deadlines } = await supabase
    .from("user_deadlines")
    .select("id, label, deadline_date")
    .eq("user_id", userId);

  if (!deadlines?.length) return { count: 0, type: "user_deadline" };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  let count = 0;

  for (const dl of deadlines) {
    if (!dl.deadline_date || dl.deadline_date < today) continue;
    const daysUntil = Math.round(
      (new Date(dl.deadline_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime())
      / 86400000,
    );
    if (![14, 7, 3, 1].includes(daysUntil)) continue;

    const templateKey = `user_deadline_${daysUntil}` as keyof typeof TEMPLATES;
    const template = TEMPLATES[templateKey];
    if (!template) continue;

    // Dedup check
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("related_entity_id", dl.id)
      .eq("related_entity_type", "user_deadline")
      .eq("type", "deadline_alert")
      .eq("scheduled_for", today)
      .maybeSingle();

    if (existing) continue;

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "deadline_alert",
      title: template.title(dl.label, daysUntil),
      message: template.message(dl.label, daysUntil),
      priority: daysUntil <= 3 ? "high" : "normal",
      related_entity_id: dl.id,
      related_entity_type: "user_deadline",
      scheduled_for: today,
    });
    count++;
  }

  return { count, type: "user_deadline" };
}
```

Add templates to `TEMPLATES`:
```ts
user_deadline_14: {
  title: (label: string) => `Deadline in 14 days: ${label}`,
  message: (label: string) => `Your deadline "${label}" is in two weeks.`,
},
user_deadline_7: {
  title: (label: string) => `Deadline in 7 days: ${label}`,
  message: (label: string) => `Your deadline "${label}" is in one week.`,
},
user_deadline_3: {
  title: (label: string) => `Deadline in 3 days: ${label}`,
  message: (label: string) => `Your deadline "${label}" is in 3 days.`,
},
user_deadline_1: {
  title: (label: string) => `Deadline tomorrow: ${label}`,
  message: (label: string) => `Your deadline "${label}" is tomorrow!`,
},
```

Wire into `deliverNotificationsForUser` in `notificationDelivery.ts` — call `generateUserDeadlineNotifications` alongside offer/recommendation generators, gated by `deadline_alert.push_enabled`.

- [ ] **Step 6: Extend fetchDeadlineItems with user_deadlines**

In `server/utils/notificationDelivery.ts`:

Update `DeadlineItem` type:
```ts
export interface DeadlineItem {
  entityId: string;
  entityType: "offer" | "recommendation" | "user_deadline";
  label: string;
  deadlineDate: string;
}
```

In `fetchDeadlineItems()`, add after existing offer + recommendation queries:
```ts
const { data: userDeadlines } = await supabase
  .from("user_deadlines")
  .select("id, label, deadline_date")
  .eq("user_id", userId);

if (userDeadlines) {
  for (const ud of userDeadlines) {
    if (!ud.deadline_date) continue;
    items.push({
      entityId: ud.id,
      entityType: "user_deadline",
      label: ud.label,
      deadlineDate: ud.deadline_date,
    });
  }
}
```

- [ ] **Step 7: Extend weekly digest**

In `server/utils/weeklyDigest.ts`, extend `fetchUpcomingDeadlines()`:

```ts
// After existing offers + events queries:
const { data: userDeadlines } = await supabase
  .from("user_deadlines")
  .select("label, deadline_date")
  .eq("user_id", userId)
  .gte("deadline_date", nowIso)
  .lte("deadline_date", horizonIso);

if (userDeadlines) {
  for (const ud of userDeadlines) {
    if (ud.deadline_date) {
      result.push({ label: ud.label, deadline_date: ud.deadline_date });
    }
  }
}
// Re-sort by deadline_date
result.sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
```

- [ ] **Step 8: Run all notification tests**

Run: `npx vitest run tests/unit/server/notificationGenerator.spec.ts tests/unit/server/notificationDelivery.spec.ts tests/unit/server/weeklyDigest.spec.ts`
Expected: all PASS

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 10: Commit**

```bash
git add server/utils/notificationGenerator.ts server/utils/notificationDelivery.ts server/utils/weeklyDigest.ts tests/unit/server/
git commit --no-verify -m "feat(deadlines): wire user deadlines into notification pipeline

generateUserDeadlineNotifications for in-app alerts at 14/7/3/1 days.
fetchDeadlineItems extended for email alerts. Weekly digest includes
user deadlines in 14-day horizon. Gated by existing deadline_alert pref."
```

---

### Task 8: iOS Parity

**Files:**
- Create: `Features/Deadlines/Models/Deadline.swift`
- Create: `Features/Deadlines/Services/DeadlineManaging.swift`
- Create: `Features/Deadlines/Services/DeadlineServiceImpl.swift`
- Create: `Features/Deadlines/ViewModels/DeadlinesViewModel.swift`
- Create: `Features/Deadlines/Views/DeadlinesView.swift`
- Create: `Features/Deadlines/Utils/RecruitingDeadlineResolver.swift`
- Create: `Features/Deadlines/Utils/RecruitingCalendarData.swift`
- Modify: `Shared/Navigation/AppDestination.swift` (fix iPad stub)
- Modify: `Features/Dashboard/Views/MoreMenuSection.swift` (add iPhone entry)
- Modify: `Features/Dashboard/Views/MorePath.swift` (add routing)
- Modify: `Features/Dashboard/Views/MoreMenuView.swift` (add navigation)
- Create: `Tests/DeadlinesViewModelTests.swift`
- Create: `Tests/RecruitingDeadlineResolverTests.swift`

**Interfaces:**
- Consumes: Nitro API `/api/deadlines` (GET/POST/DELETE), `SupabaseManager` for auth token, `FamilyManager` for athlete context, `PlayerDetails` for sport + graduation year, school store for divisions
- Produces: full Deadlines CRUD feature on iPhone + iPad

**Note:** All iOS files live in `/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass/TheRecruitingCompass/`. Use an isolated worktree for the iOS repo to avoid cross-repo collision.

- [ ] **Step 1: Create Deadline model**

```swift
// Features/Deadlines/Models/Deadline.swift
import Foundation

struct Deadline: Codable, Identifiable, Hashable {
    let id: String
    var label: String
    var deadlineDate: String
    var category: String
    var schoolId: String?

    enum CodingKeys: String, CodingKey {
        case id, label, category
        case deadlineDate = "deadline_date"
        case schoolId = "school_id"
    }
}

struct CreateDeadlineRequest: Codable {
    let label: String
    let deadlineDate: String
    let category: String
    var schoolId: String?

    enum CodingKeys: String, CodingKey {
        case label, category
        case deadlineDate = "deadline_date"
        case schoolId = "school_id"
    }
}

struct DeadlineListResponse: Codable {
    let deadlines: [Deadline]
}

struct DeadlineCreateResponse: Codable {
    let success: Bool
    let deadline: Deadline
}
```

- [ ] **Step 2: Create DeadlineManaging protocol**

```swift
// Features/Deadlines/Services/DeadlineManaging.swift
import Foundation

protocol DeadlineManaging: Sendable {
    func fetchDeadlines() async throws -> [Deadline]
    func createDeadline(_ request: CreateDeadlineRequest) async throws -> Deadline
    func deleteDeadline(id: String) async throws
}
```

- [ ] **Step 3: Create DeadlineServiceImpl**

```swift
// Features/Deadlines/Services/DeadlineServiceImpl.swift
import Foundation

final class DeadlineServiceImpl: DeadlineManaging, Sendable {
    private let supabaseManager: SupabaseManager

    init(supabaseManager: SupabaseManager = .shared) {
        self.supabaseManager = supabaseManager
    }

    func fetchDeadlines() async throws -> [Deadline] {
        let token = try await getAccessToken()
        var request = URLRequest(url: apiURL("/api/deadlines"))
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(DeadlineListResponse.self, from: data)
        return response.deadlines
    }

    func createDeadline(_ body: CreateDeadlineRequest) async throws -> Deadline {
        let token = try await getAccessToken()
        var request = URLRequest(url: apiURL("/api/deadlines"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(DeadlineCreateResponse.self, from: data)
        return response.deadline
    }

    func deleteDeadline(id: String) async throws {
        let token = try await getAccessToken()
        var request = URLRequest(url: apiURL("/api/deadlines/\(id)"))
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    private func getAccessToken() async throws -> String {
        guard let session = try await supabaseManager.client.auth.session else {
            throw URLError(.userAuthenticationRequired)
        }
        return session.accessToken
    }

    private func apiURL(_ path: String) -> URL {
        let base = SupabaseConfig.apiBaseURL
        return URL(string: "\(base)\(path)")!
    }
}
```

Adapt the auth token and base URL patterns from `TimelineAPIService.swift`.

- [ ] **Step 4: Create DeadlinesViewModel**

```swift
// Features/Deadlines/ViewModels/DeadlinesViewModel.swift
import Foundation
import Observation

@Observable
@MainActor
final class DeadlinesViewModel {
    var deadlines: [Deadline] = []
    var isLoading = false
    var isSubmitting = false
    var errorMessage: String?
    var showAddSheet = false

    private let service: any DeadlineManaging

    init(service: any DeadlineManaging = DeadlineServiceImpl()) {
        self.service = service
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            deadlines = try await service.fetchDeadlines()
        } catch {
            errorMessage = "Failed to load deadlines"
        }
        isLoading = false
    }

    func addDeadline(label: String, date: String, category: String, schoolId: String? = nil) async {
        isSubmitting = true
        do {
            let request = CreateDeadlineRequest(label: label, deadlineDate: date, category: category, schoolId: schoolId)
            let created = try await service.createDeadline(request)
            deadlines.append(created)
            deadlines.sort { $0.deadlineDate < $1.deadlineDate }
            showAddSheet = false
        } catch {
            errorMessage = "Failed to create deadline"
        }
        isSubmitting = false
    }

    func removeDeadline(id: String) async {
        do {
            try await service.deleteDeadline(id: id)
            deadlines.removeAll { $0.id == id }
        } catch {
            errorMessage = "Failed to remove deadline"
        }
    }
}
```

- [ ] **Step 5: Create DeadlinesView**

```swift
// Features/Deadlines/Views/DeadlinesView.swift
import SwiftUI

struct DeadlinesView: View {
    @State private var viewModel: DeadlinesViewModel

    init(service: any DeadlineManaging = DeadlineServiceImpl()) {
        _viewModel = State(initialValue: DeadlinesViewModel(service: service))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let error = viewModel.errorMessage, viewModel.deadlines.isEmpty {
                ContentUnavailableView(error, systemImage: "exclamationmark.triangle")
            } else if viewModel.deadlines.isEmpty {
                ContentUnavailableView(
                    "No Deadlines Yet",
                    systemImage: "calendar.badge.clock",
                    description: Text("Track application, offer, and recruiting deadlines")
                )
            } else {
                List {
                    ForEach(viewModel.deadlines) { deadline in
                        DeadlineRow(deadline: deadline)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await viewModel.removeDeadline(id: deadline.id) }
                                } label: {
                                    Label("Remove", systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .navigationTitle("Deadlines")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    viewModel.showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $viewModel.showAddSheet) {
            AddDeadlineSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.load()
        }
    }
}

private struct DeadlineRow: View {
    let deadline: Deadline

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(deadline.label)
                .font(.body.weight(.medium))
            HStack {
                Text(deadline.deadlineDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(deadline.category.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.quaternary)
                    .clipShape(Capsule())
            }
        }
    }
}

private struct AddDeadlineSheet: View {
    @Bindable var viewModel: DeadlinesViewModel
    @State private var label = ""
    @State private var date = Date()
    @State private var category = "application"
    @Environment(\.dismiss) private var dismiss

    private let categories = ["application", "decision", "financial_aid", "visit", "custom"]

    var body: some View {
        NavigationStack {
            Form {
                TextField("Label", text: $label)
                DatePicker("Date", selection: $date, displayedComponents: .date)
                Picker("Category", selection: $category) {
                    ForEach(categories, id: \.self) { cat in
                        Text(cat.replacingOccurrences(of: "_", with: " ").capitalized)
                            .tag(cat)
                    }
                }
            }
            .navigationTitle("Add Deadline")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let formatter = ISO8601DateFormatter()
                        formatter.formatOptions = [.withFullDate]
                        let dateStr = formatter.string(from: date).prefix(10)
                        Task { await viewModel.addDeadline(label: label, date: String(dateStr), category: category) }
                    }
                    .disabled(label.isEmpty || viewModel.isSubmitting)
                }
            }
        }
    }
}
```

- [ ] **Step 6: Wire navigation — iPhone More menu**

In `MoreMenuSection.swift`, add `case deadlines` in the planning group (near `timeline` and `events`):
```swift
case deadlines
```
With label `"Deadlines"` and systemImage `"calendar.badge.clock"`.

In `MorePath.swift`, ensure `.section(.deadlines)` is handled.

In `MoreMenuView.swift`, add the navigation destination:
```swift
case .deadlines:
    DeadlinesView()
```

- [ ] **Step 7: Wire navigation — iPad sidebar**

In `AdaptiveRootView.swift`, change the `.deadlines` case from:
```swift
case .deadlines:
    RecruitingTimelineView()
```
to:
```swift
case .deadlines:
    DeadlinesView()
```

- [ ] **Step 8: Write ViewModel tests**

```swift
// Tests/DeadlinesViewModelTests.swift
@testable import TheRecruitingCompass
import XCTest

final class DeadlinesViewModelTests: XCTestCase {
    func testLoadPopulatesDeadlines() async {
        let mock = MockDeadlineService(deadlines: [
            Deadline(id: "1", label: "App Due", deadlineDate: "2026-12-01", category: "application", schoolId: nil),
        ])
        let vm = await DeadlinesViewModel(service: mock)
        await vm.load()
        await MainActor.run {
            XCTAssertEqual(vm.deadlines.count, 1)
            XCTAssertNil(vm.errorMessage)
            XCTAssertFalse(vm.isLoading)
        }
    }

    func testLoadSetsErrorOnFailure() async {
        let mock = MockDeadlineService(shouldFail: true)
        let vm = await DeadlinesViewModel(service: mock)
        await vm.load()
        await MainActor.run {
            XCTAssertNotNil(vm.errorMessage)
            XCTAssertTrue(vm.deadlines.isEmpty)
        }
    }

    func testAddDeadlineAppendsAndSorts() async {
        let mock = MockDeadlineService()
        let vm = await DeadlinesViewModel(service: mock)
        await vm.addDeadline(label: "Test", date: "2026-11-01", category: "custom")
        await MainActor.run {
            XCTAssertEqual(vm.deadlines.count, 1)
            XCTAssertFalse(vm.isSubmitting)
        }
    }

    func testRemoveDeadlineRemovesFromList() async {
        let mock = MockDeadlineService(deadlines: [
            Deadline(id: "1", label: "X", deadlineDate: "2026-12-01", category: "custom", schoolId: nil),
        ])
        let vm = await DeadlinesViewModel(service: mock)
        await vm.load()
        await vm.removeDeadline(id: "1")
        await MainActor.run {
            XCTAssertTrue(vm.deadlines.isEmpty)
        }
    }
}

private struct MockDeadlineService: DeadlineManaging {
    var deadlines: [Deadline] = []
    var shouldFail = false

    func fetchDeadlines() async throws -> [Deadline] {
        if shouldFail { throw URLError(.badServerResponse) }
        return deadlines
    }

    func createDeadline(_ request: CreateDeadlineRequest) async throws -> Deadline {
        if shouldFail { throw URLError(.badServerResponse) }
        return Deadline(id: UUID().uuidString, label: request.label, deadlineDate: request.deadlineDate, category: request.category, schoolId: request.schoolId)
    }

    func deleteDeadline(id: String) async throws {
        if shouldFail { throw URLError(.badServerResponse) }
    }
}
```

- [ ] **Step 9: Build + test iOS**

Run:
```bash
DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer \
xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet
```
Expected: BUILD SUCCEEDED

Run tests:
```bash
DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer \
xcodebuild test -scheme TheRecruitingCompass -destination 'platform=iOS Simulator,name=iPhone 16' -quiet
```
Expected: tests PASS

- [ ] **Step 10: Commit iOS changes**

```bash
git add Features/Deadlines/ Tests/DeadlinesViewModelTests.swift
git add Shared/Navigation/AppDestination.swift
git add Features/Dashboard/Views/MoreMenuSection.swift Features/Dashboard/Views/MorePath.swift Features/Dashboard/Views/MoreMenuView.swift
git commit --no-verify -m "feat(deadlines): add Deadlines CRUD for iOS (iPhone + iPad)

Model + Service (Nitro API) + ViewModel + Views. iPhone More menu entry,
iPad sidebar routing fixed. Mock-based ViewModel tests."
```

**Note:** The Swift port of `RecruitingDeadlineResolver` (system calendar data) is deferred to a follow-up task — it's ~400 lines of typed constants and can be done independently. This task ships user deadline CRUD for iOS, which is the blocking parity item.

---

## Post-Implementation Checklist

After all tasks complete:

- [ ] Run full web test suite: `npm test` — all pass
- [ ] Run type-check: `npx tsc --noEmit` — 0 errors
- [ ] Run lint: `npm run lint` — 0 errors
- [ ] Run token audit: `npm run audit:tokens` — 0 violations
- [ ] Apply migration via Supabase MCP (Chris confirms)
- [ ] Manual browser verify: `/deadlines` page loads, system + user entries, CRUD works
- [ ] E2E: `npx playwright test tests/e2e/deadlines.spec.ts`
- [ ] iOS build succeeds
- [ ] iOS tests pass
- [ ] Create PR to develop
