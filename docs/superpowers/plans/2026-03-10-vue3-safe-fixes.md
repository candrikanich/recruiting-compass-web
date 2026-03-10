# Vue 3 Safe Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 10 targeted Vue 3 quality improvements with zero behavior changes — all existing tests must pass after each task.

**Architecture:** Three independent groups of changes (mechanical cleanup, VueUse adoption, query/template quality). Each group is self-contained and commits independently. No architectural changes; purely structural improvements.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, VueUse (`@vueuse/core` already installed), Pinia, Supabase, Vitest

**Spec:** `docs/superpowers/specs/2026-03-10-vue3-safe-fixes-design.md`

---

## Chunk 1: Mechanical Fixes

### Task 1: Remove redundant `Header` component imports

Nuxt auto-imports all `/components/**` — the explicit `import Header` lines are dead code.

**Files:**
- Modify: `pages/coaches/index.vue:495`
- Modify: `pages/performance/index.vue:434`
- Modify: `pages/offers/index.vue:459`
- Modify: `pages/settings/index.vue:167`
- Modify: `pages/settings/location.vue:198`
- Modify: `pages/reports/index.vue:277`

- [ ] **Step 1: Remove the 6 import lines**

Delete (exact match, one per file):
```
import Header from "~/components/Header.vue";
```

- [ ] **Step 2: Verify build still resolves Header**

```bash
npm run type-check
```
Expected: 0 errors. Header is still auto-imported by Nuxt; no `Header is not defined` errors.

- [ ] **Step 3: Run tests**

```bash
npm run test -- --reporter=dot
```
Expected: all tests pass (same count as before).

- [ ] **Step 4: Commit**

```bash
git add pages/coaches/index.vue pages/performance/index.vue pages/offers/index.vue pages/settings/index.vue pages/settings/location.vue pages/reports/index.vue
git commit -m "refactor: remove redundant Header imports (auto-imported by Nuxt)"
```

---

### Task 2: Extract `useFamilyCtx` composable

Seven pages repeat the same inject-or-fallback pattern for `activeFamily`. Extract to a single composable.

**Files:**
- Create: `composables/useFamilyCtx.ts`
- Modify: `pages/coaches/index.vue` (lines 487–489, 534–535)
- Modify: `pages/dashboard.vue` (lines 177, 375)
- Modify: `pages/offers/index.vue` (lines 457–489)
- Modify: `pages/interactions/index.vue` (lines 156, 185–186)
- Modify: `pages/schools/index.vue` (lines 219, 251–252)
- Modify: `pages/join.vue` (line 20)
- Modify: `pages/onboarding/parent.vue` (line 353)

- [ ] **Step 1: Create the composable**

```typescript
// composables/useFamilyCtx.ts
import { inject } from "vue";
import { useActiveFamily, type UseActiveFamilyReturn } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";

export const useFamilyCtx = (): UseActiveFamilyReturn =>
  inject<UseActiveFamilyReturn>("activeFamily") ?? useFamilyContext();
```

- [ ] **Step 2: Update each page**

For each page, replace the old pattern with `const activeFamily = useFamilyCtx()` and update the import. The exact before/after for each page:

**`pages/coaches/index.vue`** — remove `import { useFamilyContext } from "~/composables/useFamilyContext"`, add `import { useFamilyCtx } from "~/composables/useFamilyCtx"`, replace:
```typescript
// Before (lines 534–535)
const activeFamily = (inject<UseActiveFamilyReturn>("activeFamily") ||
  useFamilyContext()) as UseActiveFamilyReturn;
```
```typescript
// After
const activeFamily = useFamilyCtx();
```
Also remove unused `inject` import if no other `inject` usages remain.

**`pages/dashboard.vue`** — same pattern, line 375:
```typescript
// Before
inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();
```
```typescript
// After
const activeFamily = useFamilyCtx();
```

**`pages/offers/index.vue`** — lines 488–489:
```typescript
// Before
const activeFamily = (inject<UseActiveFamilyReturn>("activeFamily") ||
  useFamilyContext()) as UseActiveFamilyReturn;
```
```typescript
// After
const activeFamily = useFamilyCtx();
```

**`pages/interactions/index.vue`** — lines 185–186: same replacement as offers.

**`pages/schools/index.vue`** — lines 251–252:
```typescript
// Before
inject<ReturnType<typeof useActiveFamily>>("activeFamily") ||
  useFamilyContext();
```
```typescript
// After
const activeFamily = useFamilyCtx();
```
Remove `import { useActiveFamily }` if no longer used directly.

**`pages/join.vue`** — line 20:
```typescript
// Before
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");
```
```typescript
// After (note: variable was named activeFamilyCtx — update all usages in join.vue)
const activeFamilyCtx = useFamilyCtx();
```

**`pages/onboarding/parent.vue`** — line 353:
```typescript
// Before
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");
```
```typescript
// After
const activeFamilyCtx = useFamilyCtx();
```

- [ ] **Step 3: Type-check and test**

```bash
npm run type-check && npm run test -- --reporter=dot
```
Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add composables/useFamilyCtx.ts pages/coaches/index.vue pages/dashboard.vue pages/offers/index.vue pages/interactions/index.vue pages/schools/index.vue pages/join.vue pages/onboarding/parent.vue
git commit -m "refactor: extract useFamilyCtx composable to consolidate inject-or-fallback pattern"
```

---

### Task 3: Replace `document.getElementById` with `useTemplateRef`

`InteractionAddForm.vue` accesses the file input DOM element imperatively. Template refs are SSR-safe and refactor-safe.

**Files:**
- Modify: `components/Interactions/InteractionAddForm.vue`

- [ ] **Step 1: Add template ref to the input element**

Find the `<input id="attachments"` element in the template and add `ref="attachments"`:
```html
<!-- Before -->
<input id="attachments" type="file" ... />

<!-- After -->
<input id="attachments" ref="attachments" type="file" ... />
```

- [ ] **Step 2: Replace imperative DOM access in script**

In the `<script setup>` block, add the template ref and update the two functions:
```typescript
// Add after other ref declarations (near line 356)
const fileInputRef = useTemplateRef<HTMLInputElement>("attachments");
```

Replace `removeFile` (lines 381–387):
```typescript
// Before
const removeFile = (index: number): void => {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== index);
  const fileInput = document.getElementById("attachments") as HTMLInputElement;
  if (fileInput) {
    fileInput.value = "";
  }
};

// After
const removeFile = (index: number): void => {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== index);
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};
```

Replace the `resetForm` DOM access (lines 407–410):
```typescript
// Before (inside resetForm)
const fileInput = document.getElementById("attachments") as HTMLInputElement;
if (fileInput) {
  fileInput.value = "";
}

// After (inside resetForm)
if (fileInputRef.value) {
  fileInputRef.value.value = "";
}
```

- [ ] **Step 3: Type-check and test**

```bash
npm run type-check && npm run test -- --reporter=dot
```
Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/Interactions/InteractionAddForm.vue
git commit -m "refactor: replace document.getElementById with useTemplateRef in InteractionAddForm"
```

---

### Task 4: Convert `InteractionAddForm` reactive form to ref factory

The `reactive()` form object requires manual property-by-property reset. A `ref` factory collapses `resetForm()` to one line and makes the initial state explicit and reusable.

**Files:**
- Modify: `components/Interactions/InteractionAddForm.vue`

- [ ] **Step 1: Add the factory function and convert the form ref**

In `<script setup>`, replace the `reactive` declaration (line 346):
```typescript
// Before
const newInteraction = reactive({
  type: "",
  direction: "",
  coach_id: "",
  subject: "",
  content: "",
  sentiment: "",
  occurred_at: new Date().toISOString().slice(0, 16),
});

// After
const createInitialForm = () => ({
  type: "",
  direction: "",
  coach_id: "",
  subject: "",
  content: "",
  sentiment: "",
  occurred_at: new Date().toISOString().slice(0, 16),
});

const newInteraction = ref(createInitialForm());
```

Remove `reactive` from the `import { ref, reactive, computed }` line (line 315) since it's no longer used.

- [ ] **Step 2: Update script references to use `.value`**

`isFormValid` computed (around line 361):
```typescript
// Before
const isFormValid = computed(
  () =>
    !props.loading &&
    newInteraction.type &&
    newInteraction.direction &&
    newInteraction.content &&
    newInteraction.occurred_at,
);

// After
const isFormValid = computed(
  () =>
    !props.loading &&
    newInteraction.value.type &&
    newInteraction.value.direction &&
    newInteraction.value.content &&
    newInteraction.value.occurred_at,
);
```

`handleSubmit` (around line 413) — update all `newInteraction.xxx` to `newInteraction.value.xxx` in the emit call:
```typescript
emit("submit", {
  type: newInteraction.value.type,
  direction: newInteraction.value.direction,
  coach_id: newInteraction.value.coach_id,
  subject: newInteraction.value.subject,
  content: newInteraction.value.content,
  sentiment: newInteraction.value.sentiment,
  occurred_at: newInteraction.value.occurred_at,
  ...
});
```

`resetForm` — replace all manual assignments with one line:
```typescript
// Before
const resetForm = () => {
  newInteraction.type = "";
  newInteraction.direction = "";
  newInteraction.coach_id = "";
  newInteraction.subject = "";
  newInteraction.content = "";
  newInteraction.sentiment = "";
  newInteraction.occurred_at = new Date().toISOString().slice(0, 16);
  reminderEnabled.value = false;
  reminderDate.value = "";
  reminderType.value = "email";
  selectedFiles.value = [];
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

// After
const resetForm = () => {
  newInteraction.value = createInitialForm();
  reminderEnabled.value = false;
  reminderDate.value = "";
  reminderType.value = "email";
  selectedFiles.value = [];
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};
```

- [ ] **Step 3: Verify template bindings still work**

Vue 3 auto-unwraps top-level refs in templates, so `v-model="newInteraction.type"` in the template continues to work without changes (it resolves to `newInteraction.value.type` internally). No template changes needed.

- [ ] **Step 4: Type-check and test**

```bash
npm run type-check && npm run test -- --reporter=dot
```
Expected: 0 errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/Interactions/InteractionAddForm.vue
git commit -m "refactor: convert InteractionAddForm reactive form to ref factory for cleaner reset"
```

---

## Chunk 2: VueUse Adoption

### Task 5: Replace manual debounce with `useDebounceFn`

Three composables implement `setTimeout`/`clearTimeout` debounce manually. VueUse's `useDebounceFn` is already in the bundle — use it.

**Files:**
- Modify: `composables/useSearchConsolidated.ts`
- Modify: `composables/useUniversalFilter.ts`
- Modify: `composables/useAutoSave.ts`

**Reference:** `useSearchConsolidated.spec.ts` and `useUniversalFilter.spec.ts` use fake timers (`vi.useFakeTimers`). `useDebounceFn` uses `setTimeout` internally and works transparently with Vitest fake timers.

- [ ] **Step 1: Update `useSearchConsolidated.ts`**

Add import at top:
```typescript
import { useDebounceFn } from "@vueuse/core";
```

Remove the `let searchTimeoutId: ReturnType<typeof setTimeout>` declaration (line 114).

Replace the double-`clearTimeout` + `setTimeout` block in `performSearch` (lines 437–459):
```typescript
// Before (the debounce block inside performSearch)
clearTimeout(searchTimeoutId);
// ... cache check ...
clearTimeout(searchTimeoutId);
searchTimeoutId = setTimeout(async () => {
  isSearching.value = true;
  // ...
}, 300);

// After — define the debounced executor as a module-level fn using useDebounceFn
// Place this OUTSIDE of performSearch, at the composable's top-level setup:
const debouncedExecuteSearch = useDebounceFn(async (searchQuery: string) => {
  isSearching.value = true;
  searchError.value = null;
  // ... move the existing setTimeout body here verbatim ...
}, 300);

// Then inside performSearch, replace the setTimeout block with:
clearResults(); // only if searchQuery is empty (keep existing guard)
// cache check (keep as-is)
await debouncedExecuteSearch(searchQuery);
```

Preserve the existing cache check logic exactly — only replace the `clearTimeout`/`setTimeout` pattern.

- [ ] **Step 2: Update `useUniversalFilter.ts`**

Add import:
```typescript
import { useDebounceFn } from "@vueuse/core";
```

Remove the `debounceTimeouts: Record<string, ReturnType<typeof setTimeout>>` object (line 110).

The current pattern (lines 113–128) debounces each field independently via a `Record` of timeouts. Replace with a `useDebounceFn` per-field approach or use a single debounced applier. Since the API surface returns a `setFilter(field, value, debounceMs)` function, the simplest refactor is to create one debounced function per field lazily:

```typescript
// Before
const debounceTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

const setFilter = (field: string, value: unknown, debounceMs = 0) => {
  if (debounceMs > 0) {
    if (debounceTimeouts[field]) clearTimeout(debounceTimeouts[field]);
    debounceTimeouts[field] = setTimeout(() => {
      filters.value = { ...filters.value, [field]: value };
      delete debounceTimeouts[field];
    }, debounceMs);
  } else {
    filters.value = { ...filters.value, [field]: value };
  }
};

// After
const debouncedSetters: Record<string, ReturnType<typeof useDebounceFn>> = {};

const setFilter = (field: string, value: unknown, debounceMs = 0) => {
  if (debounceMs > 0) {
    if (!debouncedSetters[field]) {
      debouncedSetters[field] = useDebounceFn((v: unknown) => {
        filters.value = { ...filters.value, [field]: v };
      }, debounceMs);
    }
    debouncedSetters[field](value);
  } else {
    filters.value = { ...filters.value, [field]: value };
  }
};
```

- [ ] **Step 3: Update `useAutoSave.ts`**

`useAutoSave.ts` imports from `~/utils/debounce`. Replace with `useDebounceFn`:

```typescript
// Before
import { debounce } from "~/utils/debounce";
// ...
const performSave = debounce(async () => { ... }, debounceMs);

// After
import { useDebounceFn } from "@vueuse/core";
// ...
const performSave = useDebounceFn(async () => { ... }, debounceMs);
```

The function signature and behavior are equivalent. The `~/utils/debounce` import can be removed from this file (check if `~/utils/debounce` has other consumers before deciding whether to delete the utility file).

- [ ] **Step 4: Type-check and run targeted tests**

```bash
npm run type-check
npx vitest run tests/unit/composables/useSearchConsolidated.spec.ts tests/unit/composables/useUniversalFilter.spec.ts tests/unit/composables/useAutoSave.spec.ts --reporter=verbose
```
Expected: 0 type errors, all targeted tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm run test -- --reporter=dot
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add composables/useSearchConsolidated.ts composables/useUniversalFilter.ts composables/useAutoSave.ts
git commit -m "refactor: replace manual setTimeout debounce with useDebounceFn from VueUse"
```

---

### Task 6: Refactor `useSessionTimeout` with VueUse primitives

`useSessionTimeout.ts` manually manages event listener registration/cleanup and activity throttling. VueUse provides `useEventListener` (auto-cleanup) and `useThrottleFn` as drop-in replacements. `localStorage` access is left unchanged (changing it would require restructuring that the tests directly test).

**Files:**
- Modify: `composables/useSessionTimeout.ts`

**Important:** `useSessionTimeout.spec.ts` has 61 tests that spy on `document.addEventListener` and test throttle timing via `vi.advanceTimersByTime`. Both patterns continue to work after this refactor:
- `useEventListener` calls `target.addEventListener` internally, so `vi.spyOn(document, "addEventListener")` still captures the call.
- `useThrottleFn` uses `setTimeout` internally, so Vitest fake timers still control timing.

- [ ] **Step 1: Update imports**

```typescript
// Before
import { ref, onMounted, onBeforeUnmount } from "vue";

// After
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useEventListener, useThrottleFn } from "@vueuse/core";
```

- [ ] **Step 2: Replace manual throttle with `useThrottleFn`**

Remove the `activityThrottleTimeout` variable (line 13).

Replace `handleActivity` (lines 53–62):
```typescript
// Before
const handleActivity = () => {
  if (activityThrottleTimeout) return;
  updateActivity();
  activityThrottleTimeout = setTimeout(() => {
    activityThrottleTimeout = null;
  }, DEFAULT_TIMEOUT_CONFIG.activityThrottleMs);
};

// After
const handleActivity = useThrottleFn(() => {
  updateActivity();
}, DEFAULT_TIMEOUT_CONFIG.activityThrottleMs);
```

- [ ] **Step 3: Replace manual event listener registration with `useEventListener`**

Remove `boundActivityHandler` variable (line 14).

In `initializeTracking`, replace the `forEach addEventListener` block:
```typescript
// Before
boundActivityHandler = () => { handleActivity(); };
DEFAULT_TIMEOUT_CONFIG.activityEvents.forEach((event) => {
  document.addEventListener(event, boundActivityHandler!, true);
});

// After — returns a stop function for manual cleanup if needed
const stopListeners = useEventListener(
  document,
  DEFAULT_TIMEOUT_CONFIG.activityEvents,
  handleActivity,
  { capture: true },
);
```

Store the `stopListeners` function so `cleanup()` can call it:
```typescript
// At composable top level (replace boundActivityHandler declaration)
let stopActivityListeners: (() => void) | null = null;

// In initializeTracking, store the return value
stopActivityListeners = useEventListener(
  document,
  DEFAULT_TIMEOUT_CONFIG.activityEvents,
  handleActivity,
  { capture: true },
);
```

- [ ] **Step 4: Update `cleanup()` to use the stop function**

```typescript
// Before
if (boundActivityHandler) {
  DEFAULT_TIMEOUT_CONFIG.activityEvents.forEach((event) => {
    document.removeEventListener(event, boundActivityHandler!, true);
  });
  boundActivityHandler = null;
}

// After
stopActivityListeners?.();
stopActivityListeners = null;
```

- [ ] **Step 5: Type-check and run targeted tests**

```bash
npm run type-check
npx vitest run tests/unit/composables/useSessionTimeout.spec.ts --reporter=verbose
```
Expected: 0 type errors, all 61 tests pass.

- [ ] **Step 6: Run full test suite**

```bash
npm run test -- --reporter=dot
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add composables/useSessionTimeout.ts
git commit -m "refactor: replace manual event listeners and throttle in useSessionTimeout with VueUse"
```

---

### Task 7: Fix `stores/user.ts` logout SRP violation

The `logout()` action directly calls `localStorage.removeItem` for keys owned by other domain composables. This violates SRP and is a maintenance trap — adding a new page with persisted filters means remembering to update `logout()`.

**Fix:** Add a `clearAllFilterCaches()` function to `usePageFilters.ts` that owns all knowledge of its own storage keys. Call it from `logout()`.

**Files:**
- Modify: `composables/usePageFilters.ts`
- Modify: `stores/user.ts`

- [ ] **Step 1: Add `clearAllFilterCaches` to `usePageFilters.ts`**

Add at the end of the file (after the composable function, before the closing):
```typescript
const FILTER_STORAGE_KEYS = [
  "schools-filters",
  "coaches-filters",
  "interactions-filters",
  "offers-filters",
] as const;

export const clearAllFilterCaches = (): void => {
  if (!import.meta.client) return;
  FILTER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};
```

- [ ] **Step 2: Update `stores/user.ts` `logout()` action**

Add import at top of `user.ts`:
```typescript
import { clearAllFilterCaches } from "~/composables/usePageFilters";
```

Replace the 4 `localStorage.removeItem` lines in `logout()` (lines 243–246):
```typescript
// Before
localStorage.removeItem("schools-filters");
localStorage.removeItem("coaches-filters");
localStorage.removeItem("interactions-filters");
localStorage.removeItem("offers-filters");

// After
clearAllFilterCaches();
```

- [ ] **Step 3: Type-check and run tests**

```bash
npm run type-check && npm run test -- --reporter=dot
```
Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add composables/usePageFilters.ts stores/user.ts
git commit -m "refactor: fix logout SRP violation — move filter cache ownership to usePageFilters"
```

---

## Chunk 3: Query & Template Quality

### Task 8: Replace `select("*")` with explicit column lists

`useEntitySearch.ts` uses `select("*")` for 4 entity types. This fetches every column including large JSON fields on every search keypress. Select only what is needed for display and filtering.

**Files:**
- Modify: `composables/useEntitySearch.ts`

**Reference pattern:** `composables/useSchools.ts` lines 153–180 shows the correct explicit column list approach.

- [ ] **Step 1: Replace `select("*")` in `searchSchools` (line 111)**

The fuzzy search uses fields `["name", "address", "city", "state"]`. Filters use `division`, `state`, `verified`. Add `id, user_id, family_unit_id` for identity.

```typescript
// Before
.select("*")

// After
.select("id, name, city, state, address, division, status, verified, user_id, family_unit_id")
```

- [ ] **Step 2: Replace `select("*")` in `searchCoaches` (line 170)**

Fuzzy fields: `["name", "school", "email", "phone"]`. Filters: `sport`, `response_rate`, `verified`. Add identity fields.

```typescript
// Before
.select("*")

// After
.select("id, name, school, school_id, email, phone, sport, response_rate, verified, user_id")
```

- [ ] **Step 3: Replace `select("*")` in `searchInteractions` (line 232)**

Filter fields: `sentiment_label`, `direction`, `recorded_date`. Display needs: `subject`, `notes`, `type`.

```typescript
// Before
.select("*")

// After
.select("id, subject, notes, type, direction, sentiment_label, recorded_date, coach_id, user_id")
```

- [ ] **Step 4: Replace `select("*")` in `searchMetrics` (line 293)**

Filter fields: `metric_type`, `value`. Search uses `notes`. Display: `recorded_date`, `unit`, `verified`.

```typescript
// Before
.select("*")

// After
.select("id, metric_type, value, unit, recorded_date, notes, verified, user_id")
```

- [ ] **Step 5: Type-check**

The query results are cast to `School[]`, `Coach[]`, etc. downstream. TypeScript will accept the narrower column selection since we're using `as`. Verify:

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/unit/composables/useSearch.spec.ts --reporter=verbose
npm run test -- --reporter=dot
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add composables/useEntitySearch.ts
git commit -m "perf: replace select(*) with explicit columns in useEntitySearch search queries"
```

---

### Task 9: Replace `select("*")` in `useEvents` and `useDashboardData`

**Files:**
- Modify: `composables/useEvents.ts`
- Modify: `composables/useDashboardData.ts`

- [ ] **Step 1: Update `useEvents.ts` `fetchEvents` (line 87) and `fetchEvent` (line 140)**

The `Event` type (`types/models.ts:194`) needs these fields for display:

```typescript
// Both select("*") calls in useEvents.ts
.select("id, user_id, school_id, type, name, location, address, city, state, start_date, end_date, start_time, end_time, registered, attended, description, url, cost, coaches_present, event_source, performance_notes, created_at, updated_at")
```

- [ ] **Step 2: Update `useDashboardData.ts` three `select("*")` calls**

`fetchOffers` (line 167) — for dashboard summary, Offer needs status, school_id, and key fields:
```typescript
.select("id, user_id, school_id, type, status, scholarship_amount, annual_amount, deadline, notes, created_at")
```

`fetchEvents` (line 186) — same column list as useEvents above:
```typescript
.select("id, user_id, school_id, type, name, start_date, end_date, registered, attended, location, created_at")
```

`fetchMetrics` (line 205) — same as useEntitySearch metrics:
```typescript
.select("id, user_id, metric_type, value, unit, recorded_date, notes, verified, created_at")
```

- [ ] **Step 3: Type-check and run tests**

```bash
npm run type-check && npm run test -- --reporter=dot
```
Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add composables/useEvents.ts composables/useDashboardData.ts
git commit -m "perf: replace select(*) with explicit columns in useEvents and useDashboardData"
```

---

### Task 10: Extract inline template logic and add `v-memo` to list rows

Two improvements:
1. `pages/tasks/index.vue` has multi-line `:class`/`:title` ternary expressions in list items — move to computed functions
2. `pages/coaches/index.vue` and `pages/schools/index.vue` render lists of 12–50 items with dense `:class` bindings — add `v-memo` to skip re-renders for unchanged rows

**Files:**
- Modify: `pages/tasks/index.vue`
- Modify: `pages/coaches/index.vue`
- Modify: `pages/schools/index.vue`

- [ ] **Step 1: Extract task checkbox computed helpers**

In `pages/tasks/index.vue` `<script setup>`, add two helper functions (near other task-related computed logic):

```typescript
const taskCheckboxClass = (taskId: string) => [
  "mt-1 w-5 h-5 text-blue-600 rounded-sm shrink-0",
  isViewingAsParent.value || isTaskLocked(taskId)
    ? "opacity-50 cursor-not-allowed"
    : "cursor-pointer",
];

const taskCheckboxTitle = (taskId: string): string => {
  if (isViewingAsParent.value) return "Parents can view tasks but cannot mark them complete";
  if (isTaskLocked(taskId)) return "Complete prerequisites to unlock this task";
  return "Mark task complete";
};
```

Update the template checkbox element (lines 455–467):
```html
<!-- Before -->
:class="[
  'mt-1 w-5 h-5 text-blue-600 rounded-sm shrink-0',
  isViewingAsParent || isTaskLocked(task.id)
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer',
]"
:title="
  isViewingAsParent
    ? 'Parents can view tasks but cannot mark them complete'
    : isTaskLocked(task.id)
      ? 'Complete prerequisites to unlock this task'
      : 'Mark task complete'
"

<!-- After -->
:class="taskCheckboxClass(task.id)"
:title="taskCheckboxTitle(task.id)"
```

- [ ] **Step 2: Add `v-memo` to coaches list rows**

In `pages/coaches/index.vue`, find the `v-for` element (line 183):
```html
<!-- Before -->
<div
  v-for="coach in paginatedCoaches"
  :key="coach.id"
  class="bg-white rounded-xl border border-slate-200 ...">

<!-- After -->
<div
  v-for="coach in paginatedCoaches"
  :key="coach.id"
  v-memo="[coach.id, coach.name, coach.school, coach.responsiveness_score, coach.last_contact_date, coach.status]"
  class="bg-white rounded-xl border border-slate-200 ...">
```

Include every field that affects the rendered output of the row. If unsure, add more fields — over-specifying `v-memo` is safe (just slightly less optimal); under-specifying causes stale renders.

- [ ] **Step 3: Add `v-memo` to schools list rows**

In `pages/schools/index.vue`, the list renders `<SchoolCard>` components (line 157):
```html
<!-- Before -->
<SchoolCard
  v-for="school in paginatedSchools"
  :key="school.id"
  :school="school"
  @toggle-favorite="toggleFavorite"
  @delete="handleDeleteSchool" />

<!-- After -->
<SchoolCard
  v-for="school in paginatedSchools"
  :key="school.id"
  v-memo="[school.id, school.name, school.status, school.is_favorite, school.fit_score, school.priority_tier, school.updated_at]"
  :school="school"
  @toggle-favorite="toggleFavorite"
  @delete="handleDeleteSchool" />
```

- [ ] **Step 4: Type-check and run tests**

```bash
npm run type-check && npm run test -- --reporter=dot
```
Expected: 0 errors, all tests pass.

- [ ] **Step 5: Lint**

```bash
npm run lint
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add pages/tasks/index.vue pages/coaches/index.vue pages/schools/index.vue
git commit -m "refactor: extract inline template ternaries to helpers and add v-memo to list rows"
```

---

## Final Verification

After all 10 tasks complete:

- [ ] **Run full suite**

```bash
npm run type-check && npm run lint && npm run test
```
Expected: 0 type errors, 0 lint errors, all tests pass (same count as before).

- [ ] **Sanity check dev server** (optional but recommended)

```bash
npm run dev
```
Open `http://localhost:3000` — verify schools list, coaches list, tasks page, and add-interaction form load and function correctly.
