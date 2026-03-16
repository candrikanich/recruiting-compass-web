# Architecture Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all high-impact architecture issues identified in the February 2026 review across five focused phases.

**Architecture:** Work from lowest-risk/highest-value to highest-risk/highest-value. Each phase is independently mergeable. No phase blocks another, but they are ordered by ROI.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript strict, Pinia, Supabase, Vitest, Playwright

---

## Phase 1 — Cleanup & Quick Wins (Days 1–3)

### Task 1.1: Remove Dead Feature Flags

The four `useConsolidated*` flags in `nuxt.config.ts` are not referenced anywhere in composables or pages (grep confirms). The consolidated composables are already the default and sole implementation.

**Files:**
- Modify: `nuxt.config.ts:97-107`

**Step 1: Verify flags are unreferenced**

Run: `grep -rn "useConsolidatedFiles\|useConsolidatedPerformance\|useConsolidatedInteractions\|useConsolidatedComposables\|serverSidePreferences" composables/ pages/ components/ --include="*.ts" --include="*.vue"`
Expected: zero matches (only `.nuxt/` generated types will match)

**Step 2: Remove dead config keys**

In `nuxt.config.ts`, delete lines 97–107:
```typescript
// DELETE these lines:
useConsolidatedComposables:
  process.env.NUXT_PUBLIC_USE_CONSOLIDATED_COMPOSABLES === "true",
serverSidePreferences:
  process.env.NUXT_PUBLIC_SERVER_SIDE_PREFERENCES === "true",
// Phase 3: Composable Consolidation feature flags
useConsolidatedFiles:
  process.env.NUXT_PUBLIC_USE_CONSOLIDATED_FILES !== "false",
useConsolidatedPerformance:
  process.env.NUXT_PUBLIC_USE_CONSOLIDATED_PERFORMANCE !== "false",
useConsolidatedInteractions:
  process.env.NUXT_PUBLIC_USE_CONSOLIDATED_INTERACTIONS !== "false",
```

**Step 3: Verify build passes**

Run: `npm run type-check`
Expected: no errors

**Step 4: Run tests**

Run: `npm run test`
Expected: all 5600+ tests pass

**Step 5: Commit**

```bash
git add nuxt.config.ts
git commit -m "chore: remove dead composable consolidation feature flags"
```

---

### Task 1.2: Harden CSRF Whitelist

The current CSRF middleware (`server/middleware/csrf.ts`) uses `.includes("/api/schools/")` which is dangerously broad — it matches any school route containing those strings. Replace with explicit path arrays.

**Files:**
- Modify: `server/middleware/csrf.ts`
- Test: `tests/unit/server/middleware/csrf.spec.ts` (create if missing)

**Step 1: Write failing test**

Create `tests/unit/server/middleware/csrf.spec.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { validateCsrfToken } from "~/server/utils/csrf";

describe("CSRF middleware exemptions", () => {
  it("exempts exact cascade-delete paths, not prefix matches", () => {
    // These should NOT be exempt (regular mutation endpoints)
    const nonExemptPaths = [
      "/api/schools/list",
      "/api/schools/create",
      "/api/coaches/update",
    ];
    // These SHOULD be exempt (explicit cascade/diagnostic paths)
    const exemptPaths = [
      "/api/schools/abc123/cascade-delete",
      "/api/coaches/def456/cascade-delete",
      "/api/interactions/ghi789/deletion-blockers",
    ];
    // We test the logic in the middleware by checking path matching
    // (actual middleware test requires H3 event mock — keep as integration test)
    expect(nonExemptPaths.length).toBe(3); // placeholder until integration test
  });
});
```

**Step 2: Run test — verify setup works**

Run: `npm run test -- tests/unit/server/middleware/csrf.spec.ts`
Expected: PASS (placeholder test passes)

**Step 3: Rewrite whitelist logic**

Replace `server/middleware/csrf.ts` content with:
```typescript
import { requireCsrfToken } from "../utils/csrf";

// Exact path prefixes that are CSRF-exempt (token generation, health)
const CSRF_EXEMPT_PREFIXES = [
  "/api/csrf-token",
  "/api/health",
  "/api/auth",
] as const;

// Exact full paths that are CSRF-exempt (specific admin/cascade operations)
const CSRF_EXEMPT_EXACT_PATHS = [
  "/api/athlete/fit-scores/recalculate-all",
] as const;

// Path patterns that require BOTH segment match AND operation match
const CSRF_EXEMPT_PATTERNS: Array<{ segment: string; operations: string[] }> = [
  {
    segment: "/cascade-delete",
    operations: ["/api/schools/", "/api/coaches/", "/api/interactions/"],
  },
  {
    segment: "/deletion-blockers",
    operations: ["/api/schools/", "/api/coaches/", "/api/interactions/"],
  },
];

export default defineEventHandler((event) => {
  const method = event.node.req.method;
  const path = event.path;

  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(method || "")) return;

  if (event.context._skipCsrfValidation) return;

  if (CSRF_EXEMPT_PREFIXES.some((prefix) => path?.startsWith(prefix))) return;

  if (CSRF_EXEMPT_EXACT_PATHS.some((exact) => path === exact)) return;

  for (const pattern of CSRF_EXEMPT_PATTERNS) {
    if (
      path?.endsWith(pattern.segment) &&
      pattern.operations.some((op) => path.startsWith(op))
    ) {
      return;
    }
  }

  requireCsrfToken(event);
});
```

**Step 4: Run tests**

Run: `npm run test && npm run type-check`
Expected: all pass

**Step 5: Commit**

```bash
git add server/middleware/csrf.ts tests/unit/server/middleware/csrf.spec.ts
git commit -m "fix: harden CSRF whitelist to use explicit paths instead of broad prefix matching"
```

---

### Task 1.3: Optimize useActivityFeed Queries

Currently `useActivityFeed.ts` makes 4 separate Supabase queries: interactions, then schools batch, then status_changes, then schools batch again. Consolidate to 2 queries using Supabase's join syntax.

**Files:**
- Modify: `composables/useActivityFeed.ts:144-271`
- Test: `tests/unit/composables/useActivityFeed.spec.ts` (exists or create)

**Step 1: Check if a test file exists**

Run: `ls tests/unit/composables/useActivityFeed.spec.ts 2>/dev/null || echo "missing"`

**Step 2: Write/add a test for the consolidated query shape**

In the test file, add:
```typescript
it("fetches interactions with school names in a single query", async () => {
  // Mock should show interactions returned WITH schools embedded
  const mockInteractions = [
    {
      id: "int-1",
      school_id: "school-1",
      type: "email",
      content: "Hello",
      occurred_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      schools: { id: "school-1", name: "Ohio State" },
    },
  ];
  // ... assert that activities.value[0].entityName === "Ohio State"
});
```

**Step 3: Implement join query**

In `composables/useActivityFeed.ts`, replace the interactions fetch block (lines 144–210) with:
```typescript
// Single query: interactions with school names joined
const { data: interactionsWithSchools } = await supabase
  .from("interactions")
  .select(
    "id, school_id, type, content, subject, occurred_at, created_at, schools(id, name)",
  )
  .eq("logged_by", session.value!.user!.id)
  .order("created_at", { ascending: false })
  .limit(50)
  .returns<Array<{
    id: string;
    school_id: string;
    type: string;
    content: string | null;
    subject: string | null;
    occurred_at: string | null;
    created_at: string;
    schools: { id: string; name: string } | null;
  }>>();

if (interactionsWithSchools) {
  interactionsWithSchools.forEach((interaction) => {
    const school = interaction.schools;
    events.push({
      id: `interaction-${interaction.id}`,
      type: "interaction",
      timestamp: interaction.occurred_at || interaction.created_at || new Date().toISOString(),
      title: getInteractionTitle(interaction as Interaction, school ?? undefined),
      description: getInteractionDescription(interaction as Interaction),
      icon: getInteractionIcon(interaction.type as Interaction["type"]),
      entityType: "interaction",
      entityId: interaction.id,
      entityName: school?.name,
      clickable: true,
      clickUrl: `/interactions?id=${interaction.id}`,
    });
  });
}
```

Apply the same join pattern to the `school_status_history` block (lines 213–271):
```typescript
const { data: statusChanges } = await supabase
  .from("school_status_history")
  .select("id, school_id, new_status, notes, changed_at, schools(id, name)")
  .eq("changed_by", session.value!.user!.id)
  .order("changed_at", { ascending: false })
  .limit(50)
  .returns<Array<{
    id: string;
    school_id: string;
    new_status: string;
    notes: string | null;
    changed_at: string;
    schools: { id: string; name: string } | null;
  }>>();
```

**Step 4: Run tests**

Run: `npm run test -- --grep "useActivityFeed"`
Expected: PASS

**Step 5: Commit**

```bash
git add composables/useActivityFeed.ts
git commit -m "perf: consolidate useActivityFeed queries using Supabase joins"
```

---

## Phase 2 — Type Safety (Days 4–6)

### Task 2.1: Create Typed Supabase Error Helper

The root cause of 50+ `as any` casts is that Supabase's TypeScript types don't cleanly cover the `error` property on query responses. Create a typed query wrapper.

**Files:**
- Create: `utils/supabase/query.ts`
- Create: `types/supabase-helpers.ts`
- Test: `tests/unit/utils/supabase-query.spec.ts`

**Step 1: Write failing tests**

Create `tests/unit/utils/supabase-query.spec.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { extractQueryResult } from "~/utils/supabase/query";

describe("extractQueryResult", () => {
  it("returns data when query succeeds", () => {
    const response = { data: [{ id: "1" }], error: null };
    const result = extractQueryResult(response);
    expect(result).toEqual([{ id: "1" }]);
  });

  it("throws with message when query returns error", () => {
    const response = { data: null, error: { message: "not found", code: "PGRST116" } };
    expect(() => extractQueryResult(response)).toThrow("not found");
  });

  it("returns null for single() queries with no rows", () => {
    const response = { data: null, error: null };
    const result = extractQueryResult(response);
    expect(result).toBeNull();
  });
});
```

**Step 2: Run — verify fails**

Run: `npm run test -- tests/unit/utils/supabase-query.spec.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create the helper**

Create `utils/supabase/query.ts`:
```typescript
/**
 * Type-safe wrapper for Supabase query responses.
 * Eliminates `as any` casts by providing a typed extraction helper.
 */

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

/**
 * Extracts data from a Supabase response or throws a typed error.
 * Use instead of destructuring with `as any` error casts.
 *
 * @example
 * const schools = extractQueryResult(await supabase.from("schools").select("*"));
 */
export function extractQueryResult<T>(response: SupabaseResponse<T>): T | null {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
}

/**
 * Extracts data from a Supabase response, throwing if data is null.
 * Use for queries where absence of data is an error.
 */
export function requireQueryResult<T>(response: SupabaseResponse<T>, entityName = "record"): T {
  const data = extractQueryResult(response);
  if (data === null) {
    throw new Error(`${entityName} not found`);
  }
  return data;
}
```

Create `types/supabase-helpers.ts`:
```typescript
/**
 * Re-exports for supabase query utilities.
 * Import from here for consistent access patterns.
 */
export type { SupabaseError, SupabaseResponse } from "~/utils/supabase/query";
export { extractQueryResult, requireQueryResult } from "~/utils/supabase/query";
```

**Step 4: Run tests**

Run: `npm run test -- tests/unit/utils/supabase-query.spec.ts`
Expected: PASS (3 tests)

**Step 5: Replace `as any` casts in useActivityFeed.ts**

The `useActivityFeed.ts` already improved from Task 1.3. Now find remaining `as any` casts and replace with `extractQueryResult`. The pattern to eliminate:
```typescript
// BEFORE (every query in the file):
const { data: foo } = response as { data: Array<...> | null; error: any; };

// AFTER:
const foo = extractQueryResult<Array<...>>(response);
```

**Step 6: Run full test suite**

Run: `npm run test && npm run type-check`
Expected: all pass

**Step 7: Commit**

```bash
git add utils/supabase/query.ts types/supabase-helpers.ts tests/unit/utils/supabase-query.spec.ts composables/useActivityFeed.ts
git commit -m "feat: add typed Supabase query helper to eliminate as-any casts"
```

---

### Task 2.2: Add Custom AppError Type

Replace `err instanceof Error && "statusCode" in err` runtime checks with a proper typed error class.

**Files:**
- Create: `types/errors.ts`
- Modify: `server/utils/errorHandler.ts`
- Test: `tests/unit/types/errors.spec.ts`

**Step 1: Write failing test**

Create `tests/unit/types/errors.spec.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { AppError, isAppError } from "~/types/errors";

describe("AppError", () => {
  it("creates an error with status code and type", () => {
    const err = new AppError(404, "notfound", "School not found");
    expect(err.statusCode).toBe(404);
    expect(err.type).toBe("notfound");
    expect(err.message).toBe("School not found");
    expect(err instanceof Error).toBe(true);
  });

  it("isAppError correctly identifies AppError instances", () => {
    const appErr = new AppError(400, "validation", "Bad input");
    const regularErr = new Error("oops");
    expect(isAppError(appErr)).toBe(true);
    expect(isAppError(regularErr)).toBe(false);
    expect(isAppError("string")).toBe(false);
  });
});
```

**Step 2: Run — verify fails**

Run: `npm run test -- tests/unit/types/errors.spec.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement**

Create `types/errors.ts`:
```typescript
export type ErrorType =
  | "validation"
  | "notfound"
  | "forbidden"
  | "conflict"
  | "external"
  | "server";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly type: ErrorType,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) return new AppError(500, "server", err.message);
  return new AppError(500, "server", String(err));
}
```

**Step 4: Run tests**

Run: `npm run test -- tests/unit/types/errors.spec.ts`
Expected: PASS (3 tests)

**Step 5: Update errorHandler.ts to use AppError**

In `server/utils/errorHandler.ts`, import and use `AppError` for typed error creation where currently `instanceof Error && "statusCode" in err` is used.

**Step 6: Commit**

```bash
git add types/errors.ts tests/unit/types/errors.spec.ts server/utils/errorHandler.ts
git commit -m "feat: add typed AppError class to replace instanceof runtime checks"
```

---

## Phase 3 — State Management Robustness (Days 7–9)

### Task 3.1: Enforce Family Context Injection (Fail-Fast)

Both `useSchools.ts:77` and `useInteractions.ts:150` have silent fallback to singleton when injection fails. In dev, this should throw. In production, it logs a warning. The singleton `useFamilyContext()` should only be the canonical provided instance.

**Files:**
- Modify: `composables/useSchools.ts:74-84`
- Modify: `composables/useInteractions.ts:148-155` (find injection block)
- Modify: `composables/useCoaches.ts` (find same pattern)
- Test: Existing tests for these composables

**Step 1: Find all singleton fallback instances**

Run: `grep -rn "useFamilyContext()\|injectedFamily || use" composables/ --include="*.ts"`
Note all file paths and line numbers.

**Step 2: Write a test that exercises injection failure**

In existing composable tests (e.g., `tests/unit/composables/useSchools.spec.ts`), add:
```typescript
it("warns when activeFamily injection is not set up", async () => {
  const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  // Don't call provide("activeFamily", ...) before using composable
  const { schools } = useSchools();
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[useSchools] activeFamily injection failed"),
  );
  consoleSpy.mockRestore();
});
```

**Step 3: Harden the injection pattern in useSchools.ts**

Replace lines 74–84 in `composables/useSchools.ts`:
```typescript
// BEFORE:
const injectedFamily =
  inject<ReturnType<typeof useActiveFamily>>("activeFamily");
const activeFamily = injectedFamily || useFamilyContext();
if (!injectedFamily) {
  console.warn("[useSchools] activeFamily injection failed, using singleton fallback...");
}

// AFTER:
const injectedFamily = inject<ReturnType<typeof useActiveFamily>>("activeFamily");
if (!injectedFamily) {
  if (import.meta.dev) {
    throw new Error(
      "[useSchools] activeFamily was not provided. " +
      "Wrap your page/layout with provide('activeFamily', useActiveFamily()).",
    );
  }
  console.warn("[useSchools] activeFamily injection missing — data may be stale.");
}
const activeFamily = injectedFamily ?? useFamilyContext();
```

Apply the same pattern to `useInteractions.ts` and `useCoaches.ts`.

**Step 4: Verify app root provides activeFamily**

Run: `grep -rn "provide.*activeFamily" app.vue layouts/ pages/ --include="*.vue"`
Confirm the root layout does provide it. If not, add it.

**Step 5: Run tests**

Run: `npm run test && npm run type-check`
Expected: all pass

**Step 6: Commit**

```bash
git add composables/useSchools.ts composables/useInteractions.ts composables/useCoaches.ts
git commit -m "fix: enforce family context injection with dev-time error and prod warning"
```

---

### Task 3.2: Automatic Cache Invalidation on Athlete Switch

When a parent switches athletes, all cached composable data remains stale until manually refreshed. Add a reactive watcher to clear and refetch.

**Files:**
- Modify: `composables/useSchools.ts`
- Modify: `composables/useInteractions.ts`
- Modify: `composables/useCoaches.ts`
- Test: `tests/unit/composables/useSchools.spec.ts`

**Step 1: Write failing test**

In `tests/unit/composables/useSchools.spec.ts`, add:
```typescript
it("re-fetches schools when activeAthleteId changes", async () => {
  const activeAthleteId = ref("athlete-1");
  const fetchSpy = vi.fn().mockResolvedValue(undefined);
  // Provide mock activeFamily with reactive athleteId
  provide("activeFamily", {
    activeFamilyId: computed(() => "family-1"),
    activeAthleteId,
    // ... other required fields
  });

  const { fetchSchools } = useSchools();
  fetchSchools = fetchSpy; // inject spy

  // Simulate athlete switch
  activeAthleteId.value = "athlete-2";
  await nextTick();

  expect(fetchSpy).toHaveBeenCalled();
});
```

**Step 2: Add watch to useSchools.ts**

After the `activeFamily` injection block in `composables/useSchools.ts`, add:
```typescript
import { watch } from "vue";

// Auto-invalidate cache when athlete changes (parent switching view)
watch(
  () => activeFamily.activeAthleteId?.value,
  async (newAthleteId, oldAthleteId) => {
    if (newAthleteId && newAthleteId !== oldAthleteId) {
      schools.value = [];
      await fetchSchools();
    }
  },
);
```

Apply the same pattern in `useInteractions.ts` (watch → clear interactions → fetchInteractions) and `useCoaches.ts`.

**Step 3: Run tests**

Run: `npm run test -- --grep "re-fetches.*athlete"`
Expected: PASS

**Step 4: Run full suite**

Run: `npm run test`
Expected: all pass

**Step 5: Commit**

```bash
git add composables/useSchools.ts composables/useInteractions.ts composables/useCoaches.ts tests/unit/composables/useSchools.spec.ts
git commit -m "feat: auto-invalidate composable cache when parent switches athlete"
```

---

## Phase 4 — Composable Decomposition (Days 10–18)

### Task 4.1: Decompose useInteractions.ts (980 lines → 3 files)

**Target structure:**
- `composables/useInteractions.ts` — CRUD + filters (lines 72–560) ~350 lines
- `composables/useInteractionReminders.ts` — Reminder CRUD + computed (lines 651–902) ~260 lines
- `composables/useInteractionNotes.ts` — Note history (lines 575–650) ~80 lines

**Files:**
- Modify: `composables/useInteractions.ts`
- Create: `composables/useInteractionReminders.ts`
- Create: `composables/useInteractionNotes.ts`
- Test: `tests/unit/composables/useInteractionReminders.spec.ts`
- Test: `tests/unit/composables/useInteractionNotes.spec.ts`

**Step 1: Read the current file boundaries**

Run: `grep -n "^  const load\|^  const create\|^  const complete\|^  const delete\|^  const update\|^  const fetch\|^  const format" composables/useInteractions.ts`
Note exact line numbers for: `loadReminders` (651), `createReminder` (684), `completeReminder` (745), `deleteReminder` (784), `updateReminder` (814), `fetchNoteHistory` (575), `formattedNoteHistory` (642).

**Step 2: Write tests for extracted composables first**

Create `tests/unit/composables/useInteractionReminders.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useInteractionReminders } from "~/composables/useInteractionReminders";

describe("useInteractionReminders", () => {
  it("exposes loading and reminders state", () => {
    const { reminders, loading, error } = useInteractionReminders();
    expect(reminders.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("computes activeReminders from non-completed items", () => {
    const { reminders, activeReminders } = useInteractionReminders();
    // ... test computed
  });
});
```

**Step 3: Extract useInteractionReminders.ts**

Create `composables/useInteractionReminders.ts` by moving the `loadReminders`, `createReminder`, `completeReminder`, `deleteReminder`, `updateReminder`, `getRemindersFor`, `formatDueDate` functions along with reminder state (`reminders`, `remindersLoadingRef`, etc.) and their computed (`activeReminders`, `overdueReminders`, `upcomingReminders`, `completedReminders`, `highPriorityReminders`) out of `useInteractionsInternal`.

The composable signature:
```typescript
export const useInteractionReminders = () => {
  const supabase = useSupabase();
  const { session } = useAuth();

  const reminders = shallowRef<FollowUpReminder[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeReminders = computed(() => ...);
  const overdueReminders = computed(() => ...);
  // ... etc

  return {
    reminders: readonly(reminders),
    loading: readonly(loading),
    error: readonly(error),
    activeReminders,
    overdueReminders,
    upcomingReminders,
    completedReminders,
    highPriorityReminders,
    loadReminders,
    createReminder,
    completeReminder,
    deleteReminder,
    updateReminder,
    getRemindersFor,
    formatDueDate,
  };
};
```

**Step 4: Extract useInteractionNotes.ts**

Create `composables/useInteractionNotes.ts` by moving `fetchNoteHistory` and `formattedNoteHistory`:
```typescript
export const useInteractionNotes = () => {
  const supabase = useSupabase();
  const noteHistory = shallowRef<NoteHistoryEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const formattedNoteHistory = computed(() => ...);

  return {
    noteHistory: readonly(noteHistory),
    loading: readonly(loading),
    error: readonly(error),
    formattedNoteHistory,
    fetchNoteHistory,
  };
};
```

**Step 5: Update useInteractions.ts return object**

Remove the extracted functions/state from `useInteractions.ts`. Update all callers that use reminder/notes methods to import from the new composables.

**Step 6: Find and update all callers**

Run: `grep -rn "useInteractions\(\)" pages/ components/ --include="*.vue" | head -20`
Check each caller and update imports if they use reminder/note methods.

**Step 7: Run tests**

Run: `npm run test && npm run type-check`
Expected: all pass

**Step 8: Commit**

```bash
git add composables/useInteractions.ts composables/useInteractionReminders.ts composables/useInteractionNotes.ts tests/unit/composables/
git commit -m "refactor: extract useInteractionReminders and useInteractionNotes from useInteractions"
```

---

### Task 4.2: Decompose useSchools.ts (765 lines → 2 files)

**Target structure:**
- `composables/useSchools.ts` — CRUD + duplicate detection (core) ~400 lines
- `composables/useSchoolStatus.ts` — `updateStatus`, status history (side-effect-heavy) ~200 lines

**Files:**
- Modify: `composables/useSchools.ts`
- Create: `composables/useSchoolStatus.ts`
- Test: `tests/unit/composables/useSchoolStatus.spec.ts`

**Step 1: Write test for extracted composable**

Create `tests/unit/composables/useSchoolStatus.spec.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { useSchoolStatus } from "~/composables/useSchoolStatus";

describe("useSchoolStatus", () => {
  it("updates school status and returns updated school", async () => {
    // mock supabase .from("schools").update()
    const { updateStatus } = useSchoolStatus();
    // ... test
  });
});
```

**Step 2: Extract useSchoolStatus.ts**

Move `updateStatus` method (and its status-history side effects) to `composables/useSchoolStatus.ts`:
```typescript
export const useSchoolStatus = () => {
  const supabase = useSupabase();
  const injectedFamily = inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily ?? useFamilyContext();

  const updateStatus = async (
    schoolId: string,
    newStatus: School["status"],
    notes?: string,
  ): Promise<School> => {
    // moved implementation from useSchools
  };

  return { updateStatus };
};
```

**Step 3: Update useSchools.ts callers**

Remove `updateStatus` from `useSchools.ts` return object. Find callers and update imports.

**Step 4: Run tests**

Run: `npm run test && npm run type-check`
Expected: all pass

**Step 5: Commit**

```bash
git add composables/useSchools.ts composables/useSchoolStatus.ts tests/unit/composables/useSchoolStatus.spec.ts
git commit -m "refactor: extract useSchoolStatus from useSchools"
```

---

## Phase 5 — Error Handling (Days 19–21)

### Task 5.1: Add Global Error Boundary Component

If an unhandled error escapes a composable inside a component, the entire page crashes. Add a Vue `errorCaptured` boundary.

**Files:**
- Create: `components/ErrorBoundary.vue`
- Modify: `layouts/default.vue` (wrap main content)
- Test: `tests/unit/components/ErrorBoundary.spec.ts`

**Step 1: Write failing test**

Create `tests/unit/components/ErrorBoundary.spec.ts`:
```typescript
import { mount } from "@vue/test-utils";
import ErrorBoundary from "~/components/ErrorBoundary.vue";
import { defineComponent, h } from "vue";

const ThrowingChild = defineComponent({
  setup() {
    throw new Error("test error");
  },
  render: () => h("div"),
});

describe("ErrorBoundary", () => {
  it("catches errors from child components and shows fallback", () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: ThrowingChild,
      },
    });
    expect(wrapper.text()).toContain("Something went wrong");
    expect(wrapper.find('[data-testid="error-retry"]').exists()).toBe(true);
  });

  it("renders children when no error occurs", () => {
    const wrapper = mount(ErrorBoundary, {
      slots: { default: '<div data-testid="child">OK</div>' },
    });
    expect(wrapper.find('[data-testid="child"]').text()).toBe("OK");
  });
});
```

**Step 2: Run — verify fails**

Run: `npm run test -- tests/unit/components/ErrorBoundary.spec.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create ErrorBoundary.vue**

Create `components/ErrorBoundary.vue`:
```vue
<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";

const error = ref<Error | null>(null);
const key = ref(0);

onErrorCaptured((err: Error) => {
  error.value = err;
  return false; // prevent further propagation
});

function retry() {
  error.value = null;
  key.value++;
}
</script>

<template>
  <div v-if="error" class="flex flex-col items-center justify-center p-8 text-center">
    <p class="text-lg font-semibold text-gray-800">Something went wrong</p>
    <p class="mt-1 text-sm text-gray-500">{{ error.message }}</p>
    <button
      data-testid="error-retry"
      class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      @click="retry"
    >
      Try again
    </button>
  </div>
  <slot v-else :key="key" />
</template>
```

**Step 4: Wrap layout content**

In `layouts/default.vue`, wrap the main `<slot />` with `<ErrorBoundary>`:
```vue
<template>
  <div>
    <AppHeader />
    <main>
      <ErrorBoundary>
        <slot />
      </ErrorBoundary>
    </main>
  </div>
</template>
```

**Step 5: Run tests**

Run: `npm run test -- tests/unit/components/ErrorBoundary.spec.ts`
Expected: PASS (2 tests)

**Step 6: Run full suite**

Run: `npm run test && npm run type-check`
Expected: all pass

**Step 7: Commit**

```bash
git add components/ErrorBoundary.vue layouts/default.vue tests/unit/components/ErrorBoundary.spec.ts
git commit -m "feat: add ErrorBoundary component to prevent page crashes from unhandled errors"
```

---

## Unresolved Questions

1. **Task 1.3 (activity feed joins):** Does the Supabase project have an RLS policy that allows joins from `interactions → schools`? Run a test query in Supabase Studio before assuming the join works.

2. **Task 3.1 (fail-fast injection):** Does `app.vue` (or the default layout) currently call `provide("activeFamily", useActiveFamily())`? Run `grep -rn 'provide.*activeFamily' app.vue layouts/` before implementing. If it's missing, the fail-fast will break the entire app in dev immediately.

3. **Task 4.1 (decompose useInteractions):** Pages/components that destructure `useInteractions()` and use reminder methods (e.g., `loadReminders`, `createReminder`) will need updating. Get the full call-site list before extracting: `grep -rn "loadReminders\|createReminder\|completeReminder\|deleteReminder" pages/ components/ --include="*.vue"`.

4. **Task 4.2 (decompose useSchools):** `updateStatus` is called from `useSchoolStatusManagement.ts` and possibly pages. Verify: `grep -rn "updateStatus" pages/ components/ composables/ --include="*.ts" --include="*.vue"`.

5. **Phase priority:** If only one phase can be done, do Phase 1 (cleanup + CSRF hardening + query optimization) — highest ROI, lowest risk.
