# Vue Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all confirmed bugs, security gaps, and performance issues identified in the Vue expert review.

**Architecture:** Targeted, surgical edits across composables and pages. No architectural redesigns — items requiring large refactors (dual-store migration, inject() redesign, getCurrentInstance removal) are out of scope and tracked separately. Each task is one logical change with a commit.

**Tech Stack:** Vue 3 Composition API, Nuxt 3, TypeScript strict, Pinia, Supabase

---

## Scope: What's Being Fixed

| # | Severity | Issue | Files |
|---|----------|-------|-------|
| T1 | Critical | `shallowRef` index-mutation | useSchools.ts, useInteractions.ts, useInteractionReminders.ts |
| T2 | Critical | Module-level `fetchInFlight` shared across instances | useSchools.ts |
| T3 | High/Security | Cascade-delete CSRF bypass (raw `fetch`) | useSchools.ts, useCoaches.ts, useInteractions.ts |
| T4 | High/DX | `dashboardData.xxx.value` leaking into template | dashboard.vue |
| T5 | Medium | 4 redundant watchers → 1 | dashboard.vue |
| T6 | Medium | `ref<any>` → `computed` for user | dashboard.vue |
| T7 | Medium | Sort separate from filter computed | pages/schools/index.vue |
| T8 | Medium | `Map` inside deep `ref` → `shallowRef` | composables/useFitScore.ts |
| T9 | Low | Raw `console.*` → structured logger | dashboard.vue |
| T10 | Low | Remove dead `showWidget` stub and `:show-widget` props | dashboard.vue + child components |

## Skipped (requires architectural redesign, tracked separately)
- Dual stores vs composables (stores/schools.ts, stores/coaches.ts)
- useDashboardData duplicate fetching (architectural change)
- `inject()` inside composables — requires API surface change
- `getCurrentInstance()` usage — requires lifecycle API refactor
- `v-for :key` issues — NOT confirmed, all checked files already have keys

---

## Task 1: Fix shallowRef Index-Mutations

`shallowRef` only tracks `.value` identity. Assigning `arr.value[i] = x` doesn't change `.value`'s reference, so Vue won't trigger reactivity. Fix by replacing the array reference.

**Files:**
- Modify: `composables/useSchools.ts:413-416`
- Modify: `composables/useInteractions.ts:389-392`
- Modify: `composables/useInteractionReminders.ts:243-246`

### Step 1: Fix useSchools.ts

Find the block at line ~413:
```typescript
const index = schools.value.findIndex((s) => s.id === id);
if (index !== -1) {
  schools.value[index] = data;
}
```

Replace with:
```typescript
const index = schools.value.findIndex((s) => s.id === id);
if (index !== -1) {
  schools.value = schools.value.map((s, i) => (i === index ? data : s));
}
```

### Step 2: Fix useInteractions.ts

Find the block at line ~389:
```typescript
const index = interactions.value.findIndex((i) => i.id === id);
if (index !== -1) {
  interactions.value[index] = data;
}
```

Replace with:
```typescript
const index = interactions.value.findIndex((i) => i.id === id);
if (index !== -1) {
  interactions.value = interactions.value.map((item, i) => (i === index ? data : item));
}
```

### Step 3: Fix useInteractionReminders.ts

Find the block at line ~243:
```typescript
const index = reminders.value.findIndex((r) => r.id === id);
if (index !== -1) {
  reminders.value[index] = { ...reminders.value[index], ...updates };
}
```

Replace with:
```typescript
const index = reminders.value.findIndex((r) => r.id === id);
if (index !== -1) {
  reminders.value = reminders.value.map((r, i) =>
    i === index ? { ...r, ...updates } : r,
  );
}
```

### Step 4: Run tests
```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
npm run test -- --run --reporter=verbose 2>&1 | tail -30
```
Expected: All tests pass. If any test asserts on the old mutation pattern, update the test to assert on the returned new value.

### Step 5: Commit
```bash
git add composables/useSchools.ts composables/useInteractions.ts composables/useInteractionReminders.ts
git commit -m "fix: replace shallowRef index-mutations with array replacement

shallowRef only tracks .value identity, not inner array mutations.
Assigning arr.value[i] = x silently fails to trigger reactivity.
Replace with arr.value = arr.value.map(...) to ensure Vue re-renders."
```

---

## Task 2: Move fetchInFlight Inside Composable Scope

The module-level `let fetchInFlight: Promise<void> | null = null` at line 14 of `useSchools.ts` is shared across ALL component instances. Two components calling `fetchSchools()` concurrently share the same deduplication lock — the second gets the first's promise regardless of context.

**Files:**
- Modify: `composables/useSchools.ts`

### Step 1: Remove the module-level declaration

Find at line ~14:
```typescript
// In-flight deduplication: prevents concurrent duplicate Supabase calls
let fetchInFlight: Promise<void> | null = null;
```

Delete these two lines.

### Step 2: Add inside useSchoolsInternal

Inside the `useSchoolsInternal` function body (after the `const logger` or `const supabase` line near the top of the function, before `const schools = shallowRef`), add:

```typescript
// In-flight deduplication: prevents concurrent duplicate Supabase calls for this instance
let fetchInFlight: Promise<void> | null = null;
```

The exact insertion point is after `const activeFamily = injectedFamily ?? useFamilyContext();` and before `const schools = shallowRef<School[]>([]);`.

### Step 3: Run tests
```bash
npm run test -- --run --reporter=verbose 2>&1 | tail -30
```
Expected: All tests pass.

### Step 4: Commit
```bash
git add composables/useSchools.ts
git commit -m "fix: scope fetchInFlight dedup lock per composable instance

Module-level lock was shared across all useSchools() call sites.
Moving it inside the function ensures each component gets its own
deduplication lock, preventing cross-context promise sharing."
```

---

## Task 3: Fix CSRF Bypass in Cascade-Delete

All three cascade-delete implementations use raw `fetch()` — bypassing the CSRF token injection and auth headers that `useAuthFetch.$fetchAuth` provides. This violates the project contract in CLAUDE.md.

**Files:**
- Modify: `composables/useSchools.ts` (smartDelete function, ~line 624)
- Modify: `composables/useCoaches.ts` (smartDelete function, ~line 480)
- Modify: `composables/useInteractions.ts` (smartDelete function, ~line 470)

### Step 1: Fix useSchools.ts smartDelete

At the top of `useSchoolsInternal` (near other composable instantiations like `useSupabase`, `useUserStore`), add:
```typescript
const { $fetchAuth } = useAuthFetch();
```

Also add to imports at the top of the file:
```typescript
import { useAuthFetch } from "~/composables/useAuthFetch";
```

Then find the raw fetch call in `smartDelete` (~line 640):
```typescript
const result = await fetch(`/api/schools/${id}/cascade-delete`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ confirmDelete: true }),
});
const response = (await result.json()) as Record<string, unknown>;

if (response.success) {
```

Replace with:
```typescript
const response = await $fetchAuth<Record<string, unknown>>(
  `/api/schools/${id}/cascade-delete`,
  { method: "POST", body: { confirmDelete: true } },
);

if (response.success) {
```

Note: `$fetchAuth` auto-parses JSON — no `.json()` call needed. Remove the `const result =` line entirely.

### Step 2: Fix useCoaches.ts smartDelete

Same pattern. Add import and `const { $fetchAuth } = useAuthFetch();` at composable top.

Find (~line 500):
```typescript
const result = await fetch(`/api/coaches/${id}/cascade-delete`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ confirmDelete: true }),
});
const cascadeResponse = (await result.json()) as Record<string, unknown>;
if (cascadeResponse.success) {
```

Replace with:
```typescript
const cascadeResponse = await $fetchAuth<Record<string, unknown>>(
  `/api/coaches/${id}/cascade-delete`,
  { method: "POST", body: { confirmDelete: true } },
);
if (cascadeResponse.success) {
```

### Step 3: Fix useInteractions.ts smartDelete

Same pattern. Add import and `const { $fetchAuth } = useAuthFetch();`.

Find (~line 482):
```typescript
const result = await fetch(`/api/interactions/${id}/cascade-delete`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ confirmDelete: true }),
});
const cascadeResponse = (await result.json()) as Record<string, unknown>;
if (cascadeResponse.success) {
```

Replace with:
```typescript
const cascadeResponse = await $fetchAuth<Record<string, unknown>>(
  `/api/interactions/${id}/cascade-delete`,
  { method: "POST", body: { confirmDelete: true } },
);
if (cascadeResponse.success) {
```

### Step 4: Run type-check
```bash
npm run type-check 2>&1 | tail -20
```
Expected: No new errors.

### Step 5: Run tests
```bash
npm run test -- --run --reporter=verbose 2>&1 | tail -30
```

### Step 6: Commit
```bash
git add composables/useSchools.ts composables/useCoaches.ts composables/useInteractions.ts
git commit -m "fix: use \$fetchAuth for cascade-delete to inject CSRF token

Raw fetch() bypassed CSRF protection and auth headers required by
the cascade-delete API endpoints. Replace with useAuthFetch.\$fetchAuth
which automatically injects the Supabase session token and CSRF token."
```

---

## Task 4: Fix .value Leaks in Dashboard Template

`useDashboardData()` returns raw refs. When stored as `dashboardData` object, Vue won't auto-unwrap nested refs in templates. Fix by destructuring the refs into the component's top-level scope.

**Files:**
- Modify: `pages/dashboard.vue`

### Step 1: Replace the dashboardData assignment

Find (~line 206):
```typescript
const dashboardData = useDashboardData();
```

Replace with:
```typescript
const dashboardData = useDashboardData();
const {
  coachCount,
  schoolCount,
  interactionCount,
  allSchools,
  allInteractions,
  allCoaches,
} = dashboardData;
```

Note: We keep `dashboardData` intact because `useDashboardCalculations(dashboardData)` needs the full object. The destructured names are aliases to the same refs — no double-fetch.

### Step 2: Update the template to remove .value

In the `<template>` section, find and replace:

`dashboardData.coachCount.value` → `coachCount`
`dashboardData.schoolCount.value` → `schoolCount`
`dashboardData.interactionCount.value` → `interactionCount`
`dashboardData.allSchools.value` → `allSchools`
`dashboardData.allInteractions.value` → `allInteractions`
`dashboardData.allCoaches.value` → `allCoaches`

Also fix other `.value` leaks in the template while you're there:
- `suggestionsComposable?.dashboardSuggestions.value || []` — destructure `const { dashboardSuggestions } = suggestionsComposable ?? { dashboardSuggestions: ref([]) }` (or simply keep as-is since suggestionsComposable may be null — this one is borderline acceptable)
- `recruitingPacketComposable.hasGeneratedPacket.value` — can destructure `const { hasGeneratedPacket, showEmailModal, defaultEmailSubject, defaultEmailBody, setShowEmailModal } = recruitingPacketComposable` — but only do this if it doesn't break useDashboardCalculations

For the `recruitingPacketComposable` and `suggestionsComposable`, check if `useDashboardCalculations` uses them. If not, destructure them too. If yes, keep the object and accept remaining `.value` usages.

### Step 3: Run type-check + tests
```bash
npm run type-check 2>&1 | tail -20
npm run test -- --run 2>&1 | tail -20
```

### Step 4: Commit
```bash
git add pages/dashboard.vue
git commit -m "fix: destructure dashboardData refs for proper template auto-unwrapping

Vue only auto-unwraps top-level refs in templates. Nested refs inside
an object require explicit .value which is error-prone. Destructure
the composable's return value so templates read coachCount not
dashboardData.coachCount.value."
```

---

## Task 5: Consolidate 4 Dashboard Watchers into 2

Four separate watchers all call `refreshDashboard()`. Consolidate the family/athlete watchers into one, and keep the user watcher clean.

**Files:**
- Modify: `pages/dashboard.vue`

### Step 1: Remove `user` ref and replace with computed

Find (~line 224):
```typescript
const user = ref<any>(null);
```
Replace with:
```typescript
const user = computed(() => userStore.user);
```

Remove the `import { ref, watch, computed, inject, defineAsyncComponent } from "vue";` line's `ref` if it's no longer used after this change (check — it may still be used for `recruitingPacketLoading` etc., so likely keep `ref` in imports).

### Step 2: Update userFirstName computed

`userFirstName` uses `user.value` — no change needed since `computed` still gives `.value` access in the script.

### Step 3: Consolidate the three refresh watchers

Find these four watchers (lines ~384-424):
```typescript
// Watch for family context to load (fixes hard refresh showing 0s)
watch(
  () => activeFamily.activeFamilyId.value,
  async (newFamilyId, oldFamilyId) => {
    if (newFamilyId && newFamilyId !== oldFamilyId && targetUserId.value) {
      await refreshDashboard();
    }
  },
);

// Watch for athlete switches
watch(
  () => activeFamily.activeAthleteId.value,
  async (newId, oldId) => {
    if (newId && newId !== oldId && activeFamily.isViewingAsParent.value) {
      await refreshDashboard();
    }
  },
);

// Refetch data when returning to dashboard
watch(
  () => router.currentRoute.value.path,
  async (newPath) => {
    if (newPath === "/dashboard") {
      await refreshDashboard();
    }
  },
);

// Watch for user changes
watch(
  () => userStore?.user,
  async (newUser) => {
    user.value = newUser;
    if (newUser && notificationsComposable) {
      await refreshDashboard();
      await notificationsComposable.fetchNotifications();
    }
  },
  { immediate: true },
);
```

Replace with:
```typescript
// Consolidated: refresh when family or athlete context changes
watch(
  () =>
    [
      activeFamily.activeFamilyId.value,
      activeFamily.activeAthleteId.value,
    ] as const,
  async ([familyId], [prevFamilyId]) => {
    if (familyId && familyId !== prevFamilyId && targetUserId.value) {
      await refreshDashboard();
    }
  },
);

// Refetch data when navigating back to dashboard
watch(
  () => router.currentRoute.value.path,
  async (newPath) => {
    if (newPath === "/dashboard") {
      await refreshDashboard();
    }
  },
);

// Initialize on user load
watch(
  () => userStore?.user,
  async (newUser) => {
    if (newUser && notificationsComposable) {
      await refreshDashboard();
      await notificationsComposable.fetchNotifications();
    }
  },
  { immediate: true },
);
```

Note: The `user.value = newUser` line is removed because `user` is now a `computed`.

### Step 4: Run type-check + tests
```bash
npm run type-check 2>&1 | tail -20
npm run test -- --run 2>&1 | tail -20
```

### Step 5: Commit
```bash
git add pages/dashboard.vue
git commit -m "refactor: consolidate dashboard watchers and replace ref<any> with computed

Replace ref<any>(null) user with computed(() => userStore.user) to
eliminate the type gap. Collapse family/athlete watchers into one
compound watcher to reduce duplicate refreshDashboard() calls."
```

---

## Task 6: Separate Sort from Filter Computed in schools/index.vue

The `filteredSchools` computed in `pages/schools/index.vue` does filtering AND sorting in one pass. Separate them so sort re-runs only when sort criteria change, not on every keypress.

**Files:**
- Modify: `pages/schools/index.vue`

### Step 1: Find the current computed

Find the `filteredSchools` computed (~line 411):
```typescript
const filteredSchools = computed(() => {
  let filtered = filteredItems.value as unknown as School[];

  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    filtered = filtered.filter((s: School) =>
      priorityTierFilter.value?.includes(s.priority_tier as "A" | "B" | "C"),
    );
  }

  const showMatches = typedFilterValues.value.show_matches;
  if (showMatches && hasPreferences.value) {
    filtered = filtered.filter((s: School) => {
      const match = calculateMatchScore(s);
      return match.score >= 60 && !match.hasDealbreakers;
    });
  }

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      // ... sort cases
    }
  });

  return sorted;
});
```

### Step 2: Split into two computeds

Replace the entire `filteredSchools` computed with two computeds:

```typescript
const filteredSchools = computed(() => {
  let filtered = filteredItems.value as unknown as School[];

  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    filtered = filtered.filter((s: School) =>
      priorityTierFilter.value?.includes(s.priority_tier as "A" | "B" | "C"),
    );
  }

  const showMatches = typedFilterValues.value.show_matches;
  if (showMatches && hasPreferences.value) {
    filtered = filtered.filter((s: School) => {
      const match = calculateMatchScore(s);
      return match.score >= 60 && !match.hasDealbreakers;
    });
  }

  return filtered;
});

const sortedFilteredSchools = computed(() => {
  return [...filteredSchools.value].sort((a, b) => {
    switch (sortBy.value) {
      case "fit-score":
        return (b.fit_score ?? -1) - (a.fit_score ?? -1);
      case "distance": {
        if (
          !userHomeLocation.value?.latitude ||
          !userHomeLocation.value?.longitude
        ) {
          return a.name.localeCompare(b.name);
        }
        const distA = distanceCache.value.get(a.id) ?? Infinity;
        const distB = distanceCache.value.get(b.id) ?? Infinity;
        return distA - distB;
      }
      case "last-contact":
        return (
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
        );
      case "a-z":
      default:
        return a.name.localeCompare(b.name);
    }
  });
});
```

### Step 3: Update template references

In the `<template>` section, every reference to `filteredSchools` that produces the paginated/displayed list needs to use `sortedFilteredSchools` instead.

Search for `filteredSchools` in the template and check which usages are for display (should use `sortedFilteredSchools`) vs count (can use either — `filteredSchools.length` is fine for count).

Replace display-list usages:
- The schools list passed to the grid/card components → `sortedFilteredSchools`
- Any pagination slice → `sortedFilteredSchools`
- Count displays like `filteredSchools.length` → can stay as `filteredSchools.length` (filter count without sort is correct)

### Step 4: Run type-check + tests
```bash
npm run type-check 2>&1 | tail -20
npm run test -- --run 2>&1 | tail -20
```

### Step 5: Commit
```bash
git add pages/schools/index.vue
git commit -m "perf: separate filtering and sorting into distinct computeds in schools page

Previously filteredSchools ran both filter + sort on every filter change
(including per-keystroke name search). Splitting into filteredSchools
(filter only) and sortedFilteredSchools (sort only) ensures the sort
pass only re-runs when sort criteria change."
```

---

## Task 7: Fix Map Inside Deep ref in useFitScore.ts

`ref()` (deep reactive) wraps a `Map` with a Proxy, adding unnecessary deep observation overhead. Since `schoolFitScores` is a cache replaced atomically, `shallowRef` is correct.

**Files:**
- Modify: `composables/useFitScore.ts`

### Step 1: Check the current import

At the top of `useFitScore.ts`, the import likely has `ref`. Check if `shallowRef` is already imported:
```typescript
import { ref, computed, ... } from "vue";
```

If `shallowRef` is not already imported, add it.

### Step 2: Change ref to shallowRef

Find (~line 77):
```typescript
const state = ref<UseFitScoreState>({
  schoolFitScores: new Map(),
  portfolioHealth: null,
  loading: false,
  error: null,
});
```

Replace with:
```typescript
const state = shallowRef<UseFitScoreState>({
  schoolFitScores: new Map(),
  portfolioHealth: null,
  loading: false,
  error: null,
});
```

**Important:** After this change, all mutations to `state.value.xxx` must replace the whole `state.value` object — NOT mutate properties directly — otherwise reactivity breaks (same rule as other shallowRefs). Search for any `state.value.loading = ...` or `state.value.error = ...` and replace with:
```typescript
state.value = { ...state.value, loading: true };
state.value = { ...state.value, error: message };
state.value = { ...state.value, schoolFitScores: newMap };
```

If there are many mutations to `state.value.xxx`, it may be cleaner to keep individual `ref`s for `loading`, `error`, and `portfolioHealth`, and use `shallowRef` only for `schoolFitScores`. Use your judgment based on how many mutation sites exist.

### Step 3: Run type-check + tests
```bash
npm run type-check 2>&1 | tail -20
npm run test -- --run 2>&1 | tail -20
```

### Step 4: Commit
```bash
git add composables/useFitScore.ts
git commit -m "perf: use shallowRef for useFitScore state to avoid deep Map proxying

Wrapping a Map inside a deep ref causes Vue to proxy all Map operations.
Since the state object is replaced atomically (not mutated in-place),
shallowRef is the correct choice."
```

---

## Task 8: Replace Raw console.* with Structured Logger in dashboard.vue

**Files:**
- Modify: `pages/dashboard.vue`

### Step 1: Add logger import

Near the top of the `<script setup>` block, add:
```typescript
import { createClientLogger } from "~/utils/logger";
const logger = createClientLogger("dashboard");
```

### Step 2: Replace raw console calls

Find and replace in `pages/dashboard.vue`:

`console.error("Failed to add task:", err)` → `logger.error("Failed to add task", err)`
`console.error("Packet generation error:", err)` → `logger.error("Packet generation error", err)`

Check for any other `console.log`, `console.warn`, `console.error` in the file and replace with appropriate logger levels.

### Step 3: Run tests
```bash
npm run test -- --run 2>&1 | tail -20
```
Note: If any tests spy on `console.error` directly, check `memory/MEMORY.md` — the project uses a special 3-arg format for the structured logger. Update test assertions to:
```typescript
expect(console.error).toHaveBeenCalledWith(
  expect.stringContaining("[dashboard]"),
  "Failed to add task",
  expect.anything(),
)
```

### Step 4: Commit
```bash
git add pages/dashboard.vue
git commit -m "chore: replace raw console.error with structured logger in dashboard

Raw console calls bypass correlation IDs and log aggregation.
Use createClientLogger('dashboard') for structured output."
```

---

## Task 9: Remove Dead showWidget Stub

`showWidget` always returns `true` and ignores its parameters. Remove the stub and the `:show-widget` props from all child components that receive it.

**Files:**
- Modify: `pages/dashboard.vue`
- Modify: child components that accept `showWidget` prop (search below)

### Step 1: Find all components using showWidget

```bash
grep -r "show-widget\|showWidget" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web/components/Dashboard/ --include="*.vue" -l
grep -r "show-widget\|showWidget" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web/pages/dashboard.vue
```

### Step 2: Remove from dashboard.vue template

Remove all `:show-widget="showWidget"` attribute occurrences in the template.

### Step 3: Remove the stub function from script

Remove the function:
```typescript
// Helper to check if widget should be shown based on preferences
// Defaults to showing all widgets when preferences not loaded
const showWidget = (
  _widgetKey: string,
  _section: "statsCards" | "widgets",
): boolean => {
  return true;
};
```

### Step 4: Remove prop definitions from child components

For each child component found in Step 1 that defines a `showWidget` prop, remove:
- The prop definition from `defineProps`
- Any usage of the prop inside the component template/script (should be unused since it always returned `true`)

### Step 5: Run type-check + tests
```bash
npm run type-check 2>&1 | tail -20
npm run test -- --run 2>&1 | tail -20
```

### Step 6: Commit
```bash
git add pages/dashboard.vue components/Dashboard/
git commit -m "refactor: remove dead showWidget stub and its prop from child components

showWidget always returned true and was never implemented. Remove the
function, its usages in the template, and the prop definition from
all Dashboard child components."
```

---

## Final Verification

After all tasks are complete:

### Step 1: Full test suite
```bash
npm run test -- --run 2>&1 | tail -30
```
Expected: All tests pass (currently ~5719).

### Step 2: Type check
```bash
npm run type-check 2>&1 | tail -20
```
Expected: No errors.

### Step 3: Lint
```bash
npm run lint 2>&1 | tail -20
```

### Step 4: Dev server smoke test
```bash
npm run dev &
# Open http://localhost:3000/dashboard and verify it loads correctly
```

---

## Skipped Items (Future Work)

These require dedicated planning sessions:

1. **Dual stores** (`stores/schools.ts`, `stores/coaches.ts`) — migrate `pages/reports/timeline.vue` and remaining store consumers to composables, then delete legacy stores
2. **useDashboardData duplication** — replace with aggregation over existing composable state
3. **`inject()` inside composables** — explicit parameter passing vs inject pattern debate
4. **`getCurrentInstance()`** — expose explicit `initialize()` method instead of lifecycle hook magic
