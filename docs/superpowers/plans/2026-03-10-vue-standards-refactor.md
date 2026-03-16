# Vue Standards Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all 20 antipatterns found in the vue-specialist audit, bringing the codebase into full alignment with Vue 3 Composition API and Pinia best practices — without regressions.

**Architecture:** Composables orchestrate; Pinia stores own canonical state. After this refactor: no parallel `shallowRef` arrays, no Options API stores, no raw Supabase queries in pages, no self-fetching presentational components.

**Tech Stack:** Vue 3 `<script setup>`, Pinia Setup Store, `@heroicons/vue`, Vitest, TypeScript strict

**Source audit:** vue-specialist agent, 2026-03-10 (20 findings)

---

## File Map

### Created
- `utils/loadingCounter.ts` — concurrent-safe loading state utility
- `tests/unit/utils/loadingCounter.spec.ts`
- `tests/unit/utils/entitySanitizer.spec.ts` — extends existing spec
- `components/Coach/CoachListCard.vue` — extracted from pages/coaches/index.vue
- `tests/unit/components/Coach/CoachListCard.spec.ts`
- `tests/unit/composables/useSchools-store-delegation.spec.ts`
- `tests/unit/composables/useCoaches-store-delegation.spec.ts`

### Modified
- `utils/sanitizers/entitySanitizer.ts` — add 5 missing rich-text fields to `sanitizeSchoolFields`
- `stores/schools.ts` — Options API → Setup Store; use `sanitizeSchoolFields`
- `stores/coaches.ts` — Options API → Setup Store; fix JSDoc
- `stores/user.ts` — Options API → Setup Store; remove polling loop
- `composables/useSchools.ts` — remove internal wrapper; delegate state to store
- `composables/useCoaches.ts` — delegate state to store
- `composables/useInteractions.ts` — remove internal wrapper
- `composables/useFormValidation.ts` — fix in-place array mutation
- `components/Dashboard/DashboardSuggestions.vue` — remove self-fetching; fix moreCount prop; pluralization computed; use logger
- `components/FitScore/FitScoreDisplay.vue` — replace hand-rolled SVGs with Heroicons
- `pages/dashboard.vue` — getWidgetProps() → widgetPropsMap computed; add deadPeriodMessage computed
- `pages/coaches/index.vue` — remove raw fetchData(); use useCoaches(); extract CoachListCard; simplify v-memo
- `pages/schools/index.vue` — simplify 11-field v-memo; remove empty definePageMeta
- `pages/schools/[id]/index.vue` — remove empty definePageMeta
- `pages/school-[id]-coaches.vue` — remove empty definePageMeta
- `pages/schools/new.vue` — remove empty definePageMeta
- `pages/schools/[id]/interactions.vue` — remove empty definePageMeta
- `pages/interactions/index.vue` — simplify 7-field v-memo
- `pages/events/index.vue` — simplify 9-field v-memo
- `pages/documents/index.vue` — simplify 7-field v-memo (×2)
- 63 pages — remove explicit `import {...} from 'vue'`

---

## Chunk 1: Foundation Fixes (Low Risk)

Tasks 1–7. Safe, self-contained changes. Run `npm test` after each task.

---

### Task 1: Extend `sanitizeSchoolFields` to Cover All 8 Rich-Text Fields

**Problem:** `utils/sanitizers/entitySanitizer.ts:17` only sanitizes `notes`, `pros`, `cons`. The schools store had 5 more fields sanitized inline (`coaching_philosophy`, `coaching_style`, `recruiting_approach`, `communication_style`, `success_metrics`) — this was removed when the helper was extracted, leaving those fields unsanitized on school create/update.

**Files:**
- Modify: `utils/sanitizers/entitySanitizer.ts`
- Modify: `stores/schools.ts` — was using inline `sanitizeHtml` for 8 fields; now uses helper
- Expand: `tests/unit/utils/entitySanitizer.spec.ts`

- [ ] **Step 1: Add failing tests for the 5 missing fields**

Add to `tests/unit/utils/entitySanitizer.spec.ts`:

```typescript
describe("sanitizeSchoolFields — additional rich-text fields", () => {
  it("strips XSS from coaching_philosophy", () => {
    const r = sanitizeSchoolFields({ coaching_philosophy: '<script>alert(1)</script>safe' });
    expect(r.coaching_philosophy).toBe("safe");
  });
  it("strips XSS from coaching_style", () => {
    const r = sanitizeSchoolFields({ coaching_style: "<b>bold</b>" });
    expect(r.coaching_style).toBe("bold");
  });
  it("strips XSS from recruiting_approach", () => {
    const r = sanitizeSchoolFields({ recruiting_approach: "<i>ok</i>" });
    expect(r.recruiting_approach).toBe("ok");
  });
  it("strips XSS from communication_style", () => {
    const r = sanitizeSchoolFields({ communication_style: "<em>em</em>" });
    expect(r.communication_style).toBe("em");
  });
  it("strips XSS from success_metrics", () => {
    const r = sanitizeSchoolFields({ success_metrics: "<mark>mark</mark>" });
    expect(r.success_metrics).toBe("mark");
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm test -- tests/unit/utils/entitySanitizer.spec.ts
```

Expected: 5 new tests FAIL.

- [ ] **Step 3: Extend `sanitizeSchoolFields` in `utils/sanitizers/entitySanitizer.ts`**

```typescript
type SchoolFields = {
  notes?: string | null;
  pros?: (string | null | undefined)[];
  cons?: (string | null | undefined)[];
  coaching_philosophy?: string | null;
  coaching_style?: string | null;
  recruiting_approach?: string | null;
  communication_style?: string | null;
  success_metrics?: string | null;
  [key: string]: unknown;
};

export const sanitizeSchoolFields = <T extends SchoolFields>(data: T): T => {
  const result = { ...data };
  if (result.notes) result.notes = sanitizeHtml(result.notes);
  if (result.pros) result.pros = result.pros.map((p) => (p ? sanitizeHtml(p) : p));
  if (result.cons) result.cons = result.cons.map((c) => (c ? sanitizeHtml(c) : c));
  if (result.coaching_philosophy) result.coaching_philosophy = sanitizeHtml(result.coaching_philosophy);
  if (result.coaching_style) result.coaching_style = sanitizeHtml(result.coaching_style);
  if (result.recruiting_approach) result.recruiting_approach = sanitizeHtml(result.recruiting_approach);
  if (result.communication_style) result.communication_style = sanitizeHtml(result.communication_style);
  if (result.success_metrics) result.success_metrics = sanitizeHtml(result.success_metrics);
  return result;
};
```

- [ ] **Step 4: Ensure `stores/schools.ts` uses the helper**

Check that `stores/schools.ts` imports and calls `sanitizeSchoolFields` in `createSchool` and `updateSchool`. If it still has any inline `sanitizeHtml` calls for school fields, replace them:

```typescript
// In createSchool and updateSchool, replace any inline block with:
import { sanitizeSchoolFields } from "~/utils/sanitizers/entitySanitizer";
const sanitized = sanitizeSchoolFields({ ...schoolData }); // or { ...updates }
```

Remove `import { sanitizeHtml }` from `stores/schools.ts` if it's no longer called directly.

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/unit/utils/entitySanitizer.spec.ts tests/unit/stores/schools.spec.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add utils/sanitizers/entitySanitizer.ts stores/schools.ts tests/unit/utils/entitySanitizer.spec.ts
git commit -m "fix: extend sanitizeSchoolFields to cover all 8 rich-text fields"
```

---

### Task 2: Fix In-Place Array Mutation in `useFormValidation.ts`

**Problem:** `composables/useFormValidation.ts:230` — `errors.value[existingIndex].message = message` mutates a reactive array element in-place. Violates immutability.

**Files:**
- Modify: `composables/useFormValidation.ts:229-231`
- Test: `tests/unit/composables/useFormValidation.spec.ts`

- [ ] **Step 1: Add failing test**

In `tests/unit/composables/useFormValidation.spec.ts` (create if absent), add:

```typescript
import { describe, it, expect } from "vitest";
import { useFormValidation } from "~/composables/useFormValidation";
import { z } from "zod";

describe("validateField — immutable error update", () => {
  it("creates new error object on update (no in-place mutation)", async () => {
    const { validateField, errors } = useFormValidation();
    const schema = z.string().min(5, "Too short");

    await validateField("name", "ab", schema);
    const firstRef = errors.value[0];

    // Re-trigger with a different (still failing) value to update the message
    await validateField("name", "abc", schema);

    // Immutable update creates a new object — old ref must be stale
    expect(errors.value[0]).not.toBe(firstRef);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm test -- tests/unit/composables/useFormValidation.spec.ts
```

Expected: FAIL — `errors.value[0] === firstRef` (same object, in-place mutation).

- [ ] **Step 3: Fix `composables/useFormValidation.ts`**

Replace lines 229–231:
```typescript
// BEFORE
if (existingIndex >= 0) {
  errors.value[existingIndex].message = message;
}

// AFTER
if (existingIndex >= 0) {
  errors.value = errors.value.map((e, i) =>
    i === existingIndex ? { ...e, message } : e,
  );
}
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/unit/composables/useFormValidation.spec.ts
git add composables/useFormValidation.ts tests/unit/composables/useFormValidation.spec.ts
git commit -m "fix: replace in-place array mutation in useFormValidation with immutable update"
```

---

### Task 3: Remove `useSchoolsInternal` / `useInteractionsInternal` Wrappers

**Problem:** `useSchools()` is a passthrough to `useSchoolsInternal()`. Same for `useInteractions()`. Zero indirection value; forces manual return-type maintenance.

**Files:**
- Modify: `composables/useSchools.ts:41-70`
- Modify: `composables/useInteractions.ts:57-80`

- [ ] **Step 1: Run baseline**

```bash
npm test -- tests/unit/composables/
```

All PASS before changing anything.

- [ ] **Step 2: Flatten `useSchools`**

In `composables/useSchools.ts`:
1. Delete lines 41–43 (the 3-line wrapper function `useSchools`)
2. Rename `useSchoolsInternal` → `useSchools` and add `export`
3. Remove the explicit return type annotation — TypeScript infers it

- [ ] **Step 3: Flatten `useInteractions`**

Same pattern: delete the wrapper, rename `useInteractionsInternal` → `useInteractions`, add `export`, remove explicit return type.

- [ ] **Step 4: Verify**

```bash
npm test
npm run type-check
```

Expected: all PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add composables/useSchools.ts composables/useInteractions.ts
git commit -m "refactor: remove useSchoolsInternal/useInteractionsInternal passthrough wrappers"
```

---

### Task 4: Create `useLoadingCounter` Utility

**Problem:** Two incompatible loading patterns exist: boolean `ref(false)` in auth pages; ad-hoc `loadingCount = ref(0)` counter in composables. Unify with a proper semaphore utility.

**Files:**
- Create: `utils/loadingCounter.ts`
- Create: `tests/unit/utils/loadingCounter.spec.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/unit/utils/loadingCounter.spec.ts
import { describe, it, expect } from "vitest";
import { useLoadingCounter } from "~/utils/loadingCounter";

describe("useLoadingCounter", () => {
  it("starts not loading", () => {
    expect(useLoadingCounter().loading.value).toBe(false);
  });
  it("is loading after increment", () => {
    const { loading, increment } = useLoadingCounter();
    increment();
    expect(loading.value).toBe(true);
  });
  it("stays loading when decremented once of two", () => {
    const { loading, increment, decrement } = useLoadingCounter();
    increment(); increment(); decrement();
    expect(loading.value).toBe(true);
  });
  it("stops loading when all increments matched", () => {
    const { loading, increment, decrement } = useLoadingCounter();
    increment(); increment(); decrement(); decrement();
    expect(loading.value).toBe(false);
  });
  it("does not go below zero", () => {
    const { loading, decrement } = useLoadingCounter();
    decrement();
    expect(loading.value).toBe(false);
  });
  it("wrap() sets loading during async op and clears after", async () => {
    const { loading, wrap } = useLoadingCounter();
    let during = false;
    await wrap(async () => { during = loading.value; });
    expect(during).toBe(true);
    expect(loading.value).toBe(false);
  });
  it("wrap() clears loading even when op throws", async () => {
    const { loading, wrap } = useLoadingCounter();
    await expect(wrap(async () => { throw new Error("boom"); })).rejects.toThrow();
    expect(loading.value).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm test -- tests/unit/utils/loadingCounter.spec.ts
```

- [ ] **Step 3: Implement**

```typescript
// utils/loadingCounter.ts
import { ref, computed } from "vue";

export const useLoadingCounter = () => {
  const count = ref(0);
  const loading = computed(() => count.value > 0);
  const increment = () => { count.value++; };
  const decrement = () => { count.value = Math.max(0, count.value - 1); };
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    increment();
    try {
      return await fn();
    } finally {
      decrement();
    }
  };
  return { loading, increment, decrement, wrap };
};
```

- [ ] **Step 4: Run to confirm PASS, then commit**

```bash
npm test -- tests/unit/utils/loadingCounter.spec.ts
git add utils/loadingCounter.ts tests/unit/utils/loadingCounter.spec.ts
git commit -m "feat: add useLoadingCounter — concurrent-safe loading state utility"
```

---

### Task 5: Fix `DashboardSuggestions.vue` — Self-Fetching, Ignored Prop, Pluralization

**Three problems in one component:**
1. `deadPeriodMessage` is computed from `useSchools()` inside a presentational component — should be passed as a prop from `dashboard.vue`
2. `moreCount` prop (line 97) is silently shadowed by a local `computed(() => suggestionsComposable?.moreCount.value)` — the prop value is always ignored
3. Template pluralization is unreadable string concatenation — should be a computed

**Files:**
- Modify: `components/Dashboard/DashboardSuggestions.vue`
- Modify: `pages/dashboard.vue`
- Test: `tests/unit/components/Dashboard/DashboardSuggestions.spec.ts`

- [ ] **Step 1: Write tests**

Create `tests/unit/components/Dashboard/DashboardSuggestions.spec.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardSuggestions from "~/components/Dashboard/DashboardSuggestions.vue";

vi.mock("~/composables/useSuggestions", () => ({
  useSuggestions: () => ({ surfaceMoreSuggestions: vi.fn(), moreCount: { value: 0 } }),
}));

const suggestions = [
  { id: "1", title: "A", body: "b", priority: "HIGH", category: "follow_up", created_at: "" },
  { id: "2", title: "B", body: "b", priority: "LOW", category: "follow_up", created_at: "" },
];

describe("DashboardSuggestions", () => {
  it("uses moreCount prop (not internal computed)", () => {
    const wrapper = mount(DashboardSuggestions, {
      props: { suggestions, moreCount: 5 },
    });
    expect(wrapper.text()).toContain("5");
  });

  it("shows plural form for 2 suggestions", () => {
    const wrapper = mount(DashboardSuggestions, { props: { suggestions } });
    expect(wrapper.text()).toContain("2 items need your attention");
  });

  it("shows singular form for 1 suggestion", () => {
    const wrapper = mount(DashboardSuggestions, {
      props: { suggestions: [suggestions[0]] },
    });
    expect(wrapper.text()).toContain("1 item needs your attention");
  });

  it("shows deadPeriodMessage from prop", () => {
    const wrapper = mount(DashboardSuggestions, {
      props: { suggestions: [], deadPeriodMessage: "Dead period active" },
    });
    expect(wrapper.text()).toContain("Dead period active");
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm test -- tests/unit/components/Dashboard/DashboardSuggestions.spec.ts
```

- [ ] **Step 3: Refactor `DashboardSuggestions.vue` script**

```typescript
// Remove these imports:
// import { useSchools } from "~/composables/useSchools"
// import { getDeadPeriodMessage } from "~/server/utils/ncaaRecruitingCalendar"

// Remove: const { schools: allSchools } = useSchools()
// Remove: const deadPeriodMessage = computed(...) — was computing from schools
// Remove: const moreCount = computed(() => suggestionsComposable?.moreCount.value || 0)

// Add deadPeriodMessage to props:
interface Props {
  suggestions: Suggestion[];
  isViewingAsParent?: boolean;
  athleteName?: string;
  moreCount?: number;
  deadPeriodMessage?: string | null;
}
withDefaults(defineProps<Props>(), {
  isViewingAsParent: false,
  athleteName: undefined,
  moreCount: 0,
  deadPeriodMessage: null,
});

// Add computed for readable pluralization:
const actionItemsText = computed(() => {
  const n = props.suggestions.length;
  return `${n} item${n !== 1 ? "s" : ""} need${n === 1 ? "s" : ""} your attention`;
});

// Replace console.error with logger:
import { createClientLogger } from "~/utils/logger";
const logger = createClientLogger("DashboardSuggestions");
// In surfaceMoreSuggestions catch: logger.error("Error surfacing suggestions", err)
```

In template: use `deadPeriodMessage` prop directly; use `{{ actionItemsText }}`; the `moreCount` prop is already correct since we removed the shadowing computed.

- [ ] **Step 4: Move `deadPeriodMessage` computation to `pages/dashboard.vue`**

In `pages/dashboard.vue`, add:

```typescript
import { getDeadPeriodMessage } from "~/server/utils/ncaaRecruitingCalendar";

const deadPeriodMessage = computed((): string | null => {
  if (!allSchools.value.length) return null;
  const now = new Date();
  const allInDeadPeriod = allSchools.value.every((school) => {
    const div = (school.division as string) || "D1";
    return !!getDeadPeriodMessage(now, div as "D1" | "D2" | "D3");
  });
  return allInDeadPeriod ? getDeadPeriodMessage(now, "D1") : null;
});
```

Pass to component:
```html
<DashboardSuggestions
  :suggestions="suggestions"
  :more-count="suggestionsMoreCount"
  :dead-period-message="deadPeriodMessage"
  ...
/>
```

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/unit/components/Dashboard/DashboardSuggestions.spec.ts
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add components/Dashboard/DashboardSuggestions.vue pages/dashboard.vue tests/unit/components/Dashboard/DashboardSuggestions.spec.ts
git commit -m "refactor: DashboardSuggestions — remove self-fetching, fix moreCount prop shadow, computed pluralization"
```

---

### Task 6: Replace `getWidgetProps` Method with `widgetPropsMap` Computed

**Problem:** `pages/dashboard.vue:297` — `getWidgetProps(id)` is called in the template on every render. Vue cannot memoize a plain method. Converting to a `computed` map means props are only recalculated when reactive dependencies change.

**Files:**
- Modify: `pages/dashboard.vue:297-340`

No new tests — the existing dashboard E2E and component tests guard behavior.

- [ ] **Step 1: Replace in `pages/dashboard.vue`**

Remove:
```typescript
const getWidgetProps = (id: WidgetId): Record<string, unknown> => {
  switch (id) { ... }
};
```

Add:
```typescript
const widgetPropsMap = computed(
  (): Partial<Record<WidgetId, Record<string, unknown>>> => ({
    interactionTrendChart: { interactions: allInteractions.value },
    schoolInterestChart: { schools: allSchools.value },
    schoolMapWidget: { schools: allSchools.value },
    performanceSummary: {
      metrics: allMetrics.value,
      topMetrics: topMetrics.value,
      showPerformance: true,
    },
    quickTasks: {
      tasks: tasks.value ?? [],
      showTasks: true,
      onAddTask: addTask,
      onToggleTask: toggleTask,
      onDeleteTask: deleteTask,
      onClearCompleted: () => userTasksComposable?.clearCompleted(),
    },
    coachFollowupWidget: {},
    atAGlanceSummary: {
      coaches: allCoaches.value,
      schools: allSchools.value,
      interactions: allInteractions.value,
      offers: allOffers.value,
    },
    schoolStatusOverview: { breakdown: schoolSizeBreakdown.value, count: schoolCount.value },
    eventsSummary: { events: upcomingEvents.value, showEvents: true },
    recentNotifications: {},
    linkedAccounts: { showSocial: true },
  }),
);
```

In template, replace `v-bind="getWidgetProps(entry.id)"` with `v-bind="widgetPropsMap[entry.id] ?? {}"`.

- [ ] **Step 2: Verify**

```bash
npm run type-check && npm test
```

- [ ] **Step 3: Commit**

```bash
git add pages/dashboard.vue
git commit -m "perf: replace getWidgetProps() method with widgetPropsMap computed in dashboard"
```

---

### Task 7: Cleanup — SVGs, Empty Metadata, Vue Imports, JSDoc

Four small independent fixes batched together for efficiency.

**Files:**
- `components/FitScore/FitScoreDisplay.vue` — replace 2 hand-rolled chevron SVGs with Heroicons
- 5 pages — remove empty `definePageMeta({})`
- 63 pages — remove redundant `import {...} from 'vue'`
- `stores/coaches.ts` — fix malformed JSDoc

- [ ] **Step 1: Replace hand-rolled SVGs in `FitScoreDisplay.vue`**

```typescript
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/24/solid";
```

Replace the two `<svg>` blocks inside the breakdown toggle button with:
```html
<ChevronUpIcon v-if="isExpanded" class="w-4 h-4" />
<ChevronDownIcon v-else class="w-4 h-4" />
```

- [ ] **Step 2: Remove 5 empty `definePageMeta({})` calls**

In each of these files, delete the `definePageMeta({})` line (and surrounding blank lines):
- `pages/schools/index.vue`
- `pages/schools/[id]/index.vue`
- `pages/school-[id]-coaches.vue`
- `pages/schools/new.vue`
- `pages/schools/[id]/interactions.vue`

**Do NOT** remove `definePageMeta` calls that have content (e.g., `{ middleware: "auth" }`).

- [ ] **Step 3: Strip redundant Vue auto-imports from 63 pages**

Nuxt 3 auto-imports all Vue Composition API functions. Remove explicit imports for:
`ref, computed, watch, watchEffect, onMounted, onUnmounted, onBeforeUnmount, reactive, readonly, shallowRef, nextTick, toRef, toRefs, isRef, unref`

**Keep** imports for non-auto-imported items: `inject`, `provide`, `markRaw`, `shallowReadonly`, `defineAsyncComponent`, and all `type` imports (`type ComputedRef`, `type Ref`, etc.).

Process in batches of 10 pages, running `npm run type-check` after each batch to catch anything missed.

```bash
# After each batch:
npm run type-check
```

- [ ] **Step 4: Fix JSDoc in `stores/coaches.ts`**

Replace the `@example` block on `useCoachStore` (lines 24–38) with:
```typescript
/**
 * Coaches store — manages coach data and communication tracking.
 *
 * Provides canonical state for coach CRUD, filtering, and responsiveness scoring.
 * Use via `useCoaches()` composable for full family-context orchestration.
 */
```

Also remove the malformed `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment embedded in the JSDoc of `coachesByResponsiveness` getter.

- [ ] **Step 5: Run full suite and commit**

```bash
npm test && npm run type-check && npm run lint
```

Expected: all clean.

```bash
git add components/FitScore/FitScoreDisplay.vue pages/ stores/coaches.ts
git commit -m "chore: Heroicons for FitScoreDisplay, remove empty definePageMeta, strip redundant vue imports, fix coaches JSDoc"
```

---

## Chunk 2: Store Modernization (Medium Risk)

Tasks 8–10. Pure syntax migration from Options API to Pinia Setup Store. Zero behavior change — existing store tests serve as the regression net.

**Invariant:** After each task run `npm test -- tests/unit/stores/` before committing. If any store test fails, the failure is a `this.x` → `x.value` substitution you missed — fix it before moving on.

---

### Task 8: Migrate `stores/schools.ts` → Pinia Setup Store

**Problem:** Options API `{ state, getters, actions }` form. Setup Store is more idiomatic, gives better TypeScript inference (no `this` typing issues), and aligns with the rest of the Composition API codebase.

**Files:**
- Modify: `stores/schools.ts` (full `defineStore` body rewrite)

The public interface — all state property names, getter names, action names and signatures — stays identical.

- [ ] **Step 1: Baseline**

```bash
npm test -- tests/unit/stores/schools.spec.ts tests/unit/stores/schools-priority.spec.ts tests/unit/stores/schools-status-history.spec.ts
```

All PASS.

- [ ] **Step 2: Rewrite `defineStore` body**

```typescript
export const useSchoolStore = defineStore("schools", () => {
  // --- State ---
  const schools = ref<School[]>([]);
  const selectedSchoolId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const filters = ref<SchoolFilters>({ division: "", state: "", verified: null });
  const statusHistory = ref<Record<string, SchoolStatusHistory[]>>({});

  // --- Getters (computed) ---
  const selectedSchool = computed(() =>
    schools.value.find((s) => s.id === selectedSchoolId.value) ?? null
  );
  const filteredSchools = computed(() =>
    schools.value.filter((s) => {
      if (filters.value.division && s.division !== filters.value.division) return false;
      if (filters.value.state && s.state !== filters.value.state) return false;
      if (
        filters.value.priorityTiers?.length &&
        !filters.value.priorityTiers.includes(s.priority_tier as "A" | "B" | "C")
      ) return false;
      return true;
    })
  );
  const favoriteSchools = computed(() => schools.value.filter((s) => s.is_favorite));
  const hasSchools = computed(() => schools.value.length > 0);
  // Parameterized getters become plain functions (not computed):
  const schoolsByStatus = (status: School["status"]) =>
    schools.value.filter((s) => s.status === status);
  const schoolsByDivision = (division: School["division"]) =>
    schools.value.filter((s) => s.division === division);
  const schoolsByPriorityTier = (tier: "A" | "B" | "C") =>
    schools.value.filter((s) => s.priority_tier === tier);
  const statusHistoryFor = (schoolId: string) =>
    statusHistory.value[schoolId] ?? [];

  // --- Actions ---
  // Copy every action body from the Options API form verbatim,
  // replacing every `this.x` → `x.value` throughout.
  // e.g. `this.schools = data` → `schools.value = data`
  //      `this.loading = true` → `loading.value = true`
  //      `this.isFetched = true` → `isFetched.value = true`
  //      `this.statusHistory[id]` → `statusHistory.value[id]`
  async function fetchSchools() { /* ... same body, this.x → x.value ... */ }
  async function getSchool(id: string): Promise<School | null> { /* ... */ }
  async function createSchool(schoolData: Omit<School, "id" | "created_at" | "updated_at">) { /* ... */ }
  async function updateSchool(id: string, updates: Partial<School>) { /* ... */ }
  async function deleteSchool(id: string) { /* ... */ }
  async function toggleFavorite(id: string, isFavorite: boolean) {
    return updateSchool(id, { is_favorite: !isFavorite });
  }
  async function updateRanking(schools_: School[]) { /* ... */ }
  async function updateStatus(schoolId: string, newStatus: School["status"], notes?: string) { /* ... */ }
  async function getStatusHistory(schoolId: string) { /* ... */ }
  function setSelectedSchool(id: string | null) { selectedSchoolId.value = id; }
  function setFilters(newFilters: Partial<SchoolFilters>) {
    filters.value = { ...filters.value, ...newFilters };
  }
  function resetFilters() { filters.value = { division: "", state: "", verified: null }; }
  function clearError() { error.value = null; }

  return {
    schools, selectedSchoolId, loading, error, isFetched, filters, statusHistory,
    selectedSchool, filteredSchools, favoriteSchools, hasSchools,
    schoolsByStatus, schoolsByDivision, schoolsByPriorityTier, statusHistoryFor,
    fetchSchools, getSchool, createSchool, updateSchool, deleteSchool,
    toggleFavorite, updateRanking, updateStatus, getStatusHistory,
    setSelectedSchool, setFilters, resetFilters, clearError,
  };
});
```

Add `ref, computed` to the Vue import at the top.

- [ ] **Step 3: Run store tests**

```bash
npm test -- tests/unit/stores/schools.spec.ts tests/unit/stores/schools-priority.spec.ts tests/unit/stores/schools-status-history.spec.ts
```

Expected: all PASS. A failure means a missed `this.x` substitution — grep and fix.

- [ ] **Step 4: Full suite**

```bash
npm test && npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add stores/schools.ts
git commit -m "refactor: migrate stores/schools.ts to Pinia Setup Store"
```

---

### Task 9: Migrate `stores/coaches.ts` → Pinia Setup Store

Same mechanical process as Task 8.

**Files:**
- Modify: `stores/coaches.ts`

- [ ] **Step 1: Baseline**

```bash
npm test -- tests/unit/stores/coaches.spec.ts
```

- [ ] **Step 2: Rewrite `defineStore` body**

Key difference from schools: `fetchAllCoaches` takes a `filters` param — rename the param to `filterOptions` inside the action to avoid shadowing the `filters` ref:

```typescript
export const useCoachStore = defineStore("coaches", () => {
  const coaches = ref<Coach[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const lastFetchedWithFilters = ref(false);
  const isFetchedBySchools = ref<Record<string, boolean>>({});
  const filters = ref<CoachFilters>({ schoolId: undefined, role: undefined, search: undefined });

  const coachesBySchool = (schoolId: string) => coaches.value.filter((c) => c.school_id === schoolId);
  const filteredCoaches = computed(() => coaches.value.filter((c) => {
    if (filters.value.schoolId && c.school_id !== filters.value.schoolId) return false;
    if (filters.value.role && c.role !== filters.value.role) return false;
    if (filters.value.search) {
      const s = filters.value.search.toLowerCase();
      return c.first_name.toLowerCase().includes(s) ||
             c.last_name.toLowerCase().includes(s) ||
             c.email?.toLowerCase().includes(s);
    }
    return true;
  }));
  const coachesByResponsiveness = computed(() =>
    [...coaches.value].sort((a, b) => (b.responsiveness_score ?? 0) - (a.responsiveness_score ?? 0))
  );
  const coachesByLastContact = computed(() =>
    [...coaches.value].sort((a, b) => {
      if (!a.last_contact_date && !b.last_contact_date) return 0;
      if (!a.last_contact_date) return 1;
      if (!b.last_contact_date) return -1;
      return new Date(b.last_contact_date).getTime() - new Date(a.last_contact_date).getTime();
    })
  );
  const coachesByRole = (role: Coach["role"]) => coaches.value.filter((c) => c.role === role);
  const areCoachesFetched = (schoolId: string) => isFetchedBySchools.value[schoolId] === true;

  // Actions: same bodies, this.x → x.value
  // Rename fetchAllCoaches param: filters → filterOptions
  async function fetchAllCoaches(filterOptions?: CoachFilters) { /* same body using filterOptions */ }
  // ... all other actions

  return {
    coaches, loading, error, isFetched, lastFetchedWithFilters, isFetchedBySchools, filters,
    coachesBySchool, filteredCoaches, coachesByResponsiveness, coachesByLastContact,
    coachesByRole, areCoachesFetched,
    fetchCoaches, fetchAllCoaches, fetchCoachesBySchools, getCoach,
    createCoach, updateCoach, deleteCoach, setFilters, resetFilters, clearError,
  };
});
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test -- tests/unit/stores/coaches.spec.ts
npm test && npm run type-check
git add stores/coaches.ts
git commit -m "refactor: migrate stores/coaches.ts to Pinia Setup Store"
```

---

### Task 10: Migrate `stores/user.ts` → Setup Store + Remove Polling Loop

**Two fixes:**
1. Options API → Setup Store
2. `initializeUser` polls up to 10 × 50ms for a session. Replace with a single `getSession()` call. Supabase guarantees the session is available synchronously after initialization.

**Files:**
- Modify: `stores/user.ts`
- Maybe create: `plugins/auth.client.ts` (if `onAuthStateChange` not already in a plugin)

- [ ] **Step 1: Find existing auth subscription**

```bash
grep -r "onAuthStateChange" plugins/ middleware/ --include="*.ts" -l
```

If found, verify it calls `userStore.initializeUser()` on `SIGNED_IN`. If not found, you'll need to add it in Step 5.

- [ ] **Step 2: Rewrite `stores/user.ts` as Setup Store**

```typescript
export const useUserStore = defineStore("user", () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const isAuthenticated = ref(false);
  const isEmailVerified = ref(false);

  const currentUser = computed(() => user.value);
  const userRole = computed(() => user.value?.role);
  const isLoggedIn = computed(() => isAuthenticated.value);
  const emailVerified = computed(() => isEmailVerified.value);
  const isAthlete = computed(() => user.value?.role === "player");
  const isParent = computed(() => user.value?.role === "parent");
  const isAdmin = computed(() => user.value?.role === "admin");

  async function initializeUser() {
    const supabase = useSupabase();
    loading.value = true;
    try {
      // Single call — no polling loop
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) logger.error("[initializeUser] Session error:", sessionError);

      if (session?.user) {
        isAuthenticated.value = true;
        isEmailVerified.value = session.user.email_confirmed_at != null;
        const { data: profile, error: fetchError } = await supabase
          .from("users").select("*").eq("id", session.user.id).maybeSingle();
        if (fetchError) logger.error("[initializeUser] Profile fetch error:", fetchError);
        if (profile) {
          user.value = profile;
        } else {
          const created = await createUserProfile(
            session.user.id,
            session.user.email ?? "",
            session.user.user_metadata?.full_name ?? "",
          );
          if (!created) {
            user.value = {
              id: session.user.id,
              email: session.user.email ?? "",
              full_name: session.user.user_metadata?.full_name ?? "",
              role: "player",
            };
          }
        }
      } else {
        user.value = null;
        isAuthenticated.value = false;
      }
    } catch (err) {
      logger.error("[initializeUser] Unexpected error:", err);
      user.value = null;
      isAuthenticated.value = false;
    } finally {
      loading.value = false;
    }
  }

  // createUserProfile, setUser, logout, refreshVerificationStatus,
  // setProfilePhotoUrl, updateProfileFields — same bodies, this.x → x.value

  return {
    user, loading, isAuthenticated, isEmailVerified,
    currentUser, userRole, isLoggedIn, emailVerified, isAthlete, isParent, isAdmin,
    initializeUser, createUserProfile, setUser, logout,
    refreshVerificationStatus, setProfilePhotoUrl, updateProfileFields,
  };
});
```

- [ ] **Step 3: Add `onAuthStateChange` subscription if missing**

If Step 1 found no existing subscription, create `plugins/auth.client.ts`:

```typescript
export default defineNuxtPlugin(() => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") userStore.initializeUser();
    if (event === "SIGNED_OUT") userStore.logout();
  });
});
```

- [ ] **Step 4: Smoke test the auth flow**

```bash
npm run dev
```

Log in, verify user state loads, log out, verify state clears.

- [ ] **Step 5: Run tests and commit**

```bash
npm test && npm run type-check
git add stores/user.ts plugins/
git commit -m "refactor: migrate stores/user.ts to Setup Store; replace polling loop with onAuthStateChange"
```

---

## Chunk 3: Data Layer Unification + Component Extraction (High Risk)

Tasks 11–14. These change the data flow between composables and stores. Run `npm test` after every sub-step.

**Approach:** Composables read `computed(() => store.entities)` instead of their own `shallowRef<T[]>`. Composable mutations call store actions. The store becomes the single source of truth for the entity arrays.

---

### Task 11: Wire `useSchools` to Delegate State to `useSchoolStore`

**Problem:** `useSchools` has its own `shallowRef<School[]>` completely independent of `useSchoolStore.schools`. Data mutated via the composable never appears in the store and vice versa.

**Files:**
- Modify: `composables/useSchools.ts`
- Create: `tests/unit/composables/useSchools-store-delegation.spec.ts`

- [ ] **Step 1: Write a failing delegation test**

```typescript
// tests/unit/composables/useSchools-store-delegation.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("~/composables/useSupabase", () => ({ useSupabase: () => ({ from: vi.fn() }) }));
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({ activeFamilyId: { value: "fam-1" } }),
}));
vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({ activeFamilyId: { value: "fam-1" } }),
}));
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn() }),
}));

describe("useSchools — store delegation", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("schools ref reads from useSchoolStore, not a separate shallowRef", async () => {
    const { useSchools } = await import("~/composables/useSchools");
    const { useSchoolStore } = await import("~/stores/schools");
    const store = useSchoolStore();
    const { schools } = useSchools();

    // Seed the store directly
    store.schools = [{ id: "s1", name: "Test U" } as any];

    expect(schools.value).toHaveLength(1);
    expect(schools.value[0].id).toBe("s1");
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm test -- tests/unit/composables/useSchools-store-delegation.spec.ts
```

Expected: FAIL — `schools.value` is empty (composable owns its own ref today).

- [ ] **Step 3: Refactor `composables/useSchools.ts`**

```typescript
import { useSchoolStore } from "~/stores/schools";
import { computed, shallowReadonly, inject } from "vue";

export const useSchools = () => {
  const schoolStore = useSchoolStore();
  const injectedFamily = inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily ?? useFamilyContext();

  // Delegate state to store
  const schools = shallowReadonly(computed(() => schoolStore.schools));
  const loading = computed(() => schoolStore.loading);
  const error = computed(() => schoolStore.error);
  const favoriteSchools = computed(() => schoolStore.favoriteSchools);

  // Remove: shallowRef<School[]>, loadingCount ref, errorRef, fetchInFlight

  // Delegate CRUD to store actions
  const fetchSchools = () => schoolStore.fetchSchools();
  const getSchool = (id: string) => schoolStore.getSchool(id);
  const createSchool = (data: Omit<School, "id" | "created_at" | "updated_at">) =>
    schoolStore.createSchool(data);
  const updateSchool = (id: string, updates: Partial<School>) =>
    schoolStore.updateSchool(id, updates);
  const deleteSchool = (id: string) => schoolStore.deleteSchool(id);
  const toggleFavorite = (id: string, current: boolean) =>
    schoolStore.toggleFavorite(id, current);
  const updateRanking = (schools_: School[]) => schoolStore.updateRanking(schools_);

  // Keep composable-only helpers (read from schools.value — still works via computed):
  const findDuplicate = (...) => { /* reads schools.value */ };
  const hasDuplicate = computed(() => ...);
  const isNameDuplicate = (name: string | undefined) => { /* reads schools.value */ };
  const isDomainDuplicate = (...) => { /* reads schools.value */ };
  const isNCAAAIDuplicate = (...) => { /* reads schools.value */ };
  // smartDelete calls $fetchAuth for cascade — keep as-is, still uses school data via schools.value

  return {
    schools, favoriteSchools, loading, error,
    fetchSchools, getSchool, createSchool, updateSchool, deleteSchool,
    smartDelete, toggleFavorite, updateRanking,
    findDuplicate, hasDuplicate, isNameDuplicate, isDomainDuplicate, isNCAAAIDuplicate,
  };
};
```

> **Note:** The family context auto-invalidation `watch` (watches `activeFamilyId`, clears schools and re-fetches) should remain in the composable. After this refactor it calls `schoolStore.$patch({ schools: [], isFetched: false })` then `schoolStore.fetchSchools()`.

- [ ] **Step 4: Run delegation test**

```bash
npm test -- tests/unit/composables/useSchools-store-delegation.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run full suite, fix any mocks that assumed local shallowRef**

```bash
npm test
```

Any test that mocked `useSchools` by mocking its internal shallowRef must now mock `useSchoolStore` instead. Update those mocks.

- [ ] **Step 6: Commit**

```bash
git add composables/useSchools.ts tests/unit/composables/useSchools-store-delegation.spec.ts
git commit -m "refactor: useSchools delegates state to useSchoolStore — eliminate parallel shallowRef"
```

---

### Task 12: Wire `useCoaches` to Delegate State to `useCoachStore`

Same pattern as Task 11.

**Files:**
- Modify: `composables/useCoaches.ts`
- Create: `tests/unit/composables/useCoaches-store-delegation.spec.ts`

- [ ] **Step 1: Write delegation test (same structure as Task 11)**

```typescript
// tests/unit/composables/useCoaches-store-delegation.spec.ts
it("coaches ref reads from useCoachStore, not a separate shallowRef", async () => {
  const { useCoaches } = await import("~/composables/useCoaches");
  const { useCoachStore } = await import("~/stores/coaches");
  const store = useCoachStore();
  const { coaches } = useCoaches();

  store.coaches = [{ id: "c1", first_name: "John" } as any];
  expect(coaches.value[0].id).toBe("c1");
});
```

- [ ] **Step 2: Run to confirm FAIL, then refactor**

```typescript
// In composables/useCoaches.ts:
const coachStore = useCoachStore();
const coaches = shallowReadonly(computed(() => coachStore.coaches));
const loading = computed(() => coachStore.loading);
const error = computed(() => coachStore.error);

const fetchCoaches = (schoolId: string) => coachStore.fetchCoaches(schoolId);
const fetchAllCoaches = (filters?: ...) => coachStore.fetchAllCoaches(filters);
const fetchCoachesBySchools = (ids: string[]) => coachStore.fetchCoachesBySchools(ids);
const getCoach = (id: string) => coachStore.getCoach(id);
const createCoach = (schoolId: string, data: ...) => coachStore.createCoach(schoolId, data);
const updateCoach = (id: string, updates: ...) => coachStore.updateCoach(id, updates);
const deleteCoach = (id: string) => coachStore.deleteCoach(id);
// Keep smartDelete — uses $fetchAuth for cascade
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
npm run type-check
git add composables/useCoaches.ts tests/unit/composables/useCoaches-store-delegation.spec.ts
git commit -m "refactor: useCoaches delegates state to useCoachStore — eliminate parallel shallowRef"
```

---

### Task 13: Fix `pages/coaches/index.vue` — Replace Raw `fetchData()` with Composables

**Problem:** `pages/coaches/index.vue:529` imports `useSupabase()` and queries Supabase directly in `fetchData()` (lines 675–713). Every other list page uses its domain composable. `console.error` and `console.debug` in the delete handler (lines 669, 722) should use the logger.

**Files:**
- Modify: `pages/coaches/index.vue`

- [ ] **Step 1: Remove raw Supabase access**

1. Remove: `const supabase = useSupabase()` (line 529)
2. Expand the `useCoaches()` destructure to include `fetchAllCoaches` and `fetchCoachesBySchools`
3. Add: `const { schools, fetchSchools } = useSchools()`
4. Delete: `const allCoaches = ref<Coach[]>([])` and `const schools = ref<School[]>([])`
   - `allCoaches` is now `coaches` from `useCoaches()`
   - `schools` is now from `useSchools()`
5. Replace `onMounted(fetchData)` with:
   ```typescript
   onMounted(async () => {
     await fetchSchools();
     if (schools.value.length > 0) {
       await fetchCoachesBySchools(schools.value.map((s) => s.id));
     }
   });
   ```
6. Delete the entire `fetchData` function (lines 675–720)
7. Replace `console.error` in the delete handler with `logger.error`

- [ ] **Step 2: Update references**

`filteredCoaches`, `paginatedCoaches`, `totalPages` etc. all read `allCoaches.value` — update to `coaches.value`.

`useCoachListStats(computed(() => allCoaches.value))` → `useCoachListStats(computed(() => coaches.value))`

- [ ] **Step 3: Type-check and smoke test**

```bash
npm run type-check
npm run dev
```

Navigate to `/coaches` — list loads, pagination works, delete works.

- [ ] **Step 4: Commit**

```bash
git add pages/coaches/index.vue
git commit -m "refactor: coaches/index.vue — replace raw Supabase fetchData() with useCoaches()/useSchools()"
```

---

### Task 14: Extract `CoachListCard.vue` + Simplify All `v-memo` Lists

**Two combined tasks:**
1. Extract the ~200-line inline coach card into `components/Coach/CoachListCard.vue`
2. Simplify fragile multi-field `v-memo` lists across 4 pages

**Files:**
- Create: `components/Coach/CoachListCard.vue`
- Create: `tests/unit/components/Coach/CoachListCard.spec.ts`
- Modify: `pages/coaches/index.vue`
- Modify: `pages/schools/index.vue` — 11-field v-memo → `[school.updated_at]`
- Modify: `pages/interactions/index.vue` — 7-field v-memo → `[interaction.updated_at ?? interaction.occurred_at]`
- Modify: `pages/documents/index.vue` — 7-field v-memo (×2) → `[doc.updated_at]`
- Modify: `pages/events/index.vue` — 9-field v-memo → `[event.updated_at ?? event.start_date]`

- [ ] **Step 1: Find the card template boundary**

```bash
grep -n "v-memo\|^          <li\|^          </li" pages/coaches/index.vue | head -10
```

The card starts at the `<li v-memo=...` and ends at its matching `</li>`.

- [ ] **Step 2: Write tests for `CoachListCard`**

```typescript
// tests/unit/components/Coach/CoachListCard.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachListCard from "~/components/Coach/CoachListCard.vue";

const coach = {
  id: "c1", first_name: "Jane", last_name: "Doe", role: "head",
  school_id: "s1", email: "jane@example.com",
  responsiveness_score: 80, last_contact_date: "2026-01-01",
  created_at: "", updated_at: "",
};
const school = { id: "s1", name: "Test University", division: "D1" } as any;

describe("CoachListCard", () => {
  it("renders coach full name", () => {
    const wrapper = mount(CoachListCard, { props: { coach, school } });
    expect(wrapper.text()).toContain("Jane Doe");
  });

  it("renders coach role", () => {
    const wrapper = mount(CoachListCard, { props: { coach, school } });
    expect(wrapper.text()).toContain("Head");
  });

  it("emits open-communication with coachId when action triggered", async () => {
    const wrapper = mount(CoachListCard, { props: { coach, school } });
    await wrapper.find("[data-testid='open-communication']").trigger("click");
    expect(wrapper.emitted("open-communication")?.[0]).toEqual(["c1"]);
  });

  it("emits delete-coach when delete triggered", async () => {
    const wrapper = mount(CoachListCard, { props: { coach, school } });
    await wrapper.find("[data-testid='delete-coach']").trigger("click");
    expect(wrapper.emitted("delete-coach")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run to confirm FAIL**

```bash
npm test -- tests/unit/components/Coach/CoachListCard.spec.ts
```

- [ ] **Step 4: Create `components/Coach/CoachListCard.vue`**

Extract the `<li>` card template body from `pages/coaches/index.vue`. Props and emits:

```typescript
interface Props {
  coach: Coach;
  school: School | undefined;
}
const emit = defineEmits<{
  "open-communication": [coachId: string];
  "delete-coach": [coach: Coach];
}>();
```

Add `data-testid="open-communication"` and `data-testid="delete-coach"` to the relevant action elements. Remove `v-memo` from the component (it belongs on the parent's `<li>` wrapper or the component tag).

- [ ] **Step 5: Replace inline card in `pages/coaches/index.vue`**

```html
<CoachListCard
  v-for="coach in paginatedCoaches"
  :key="coach.id"
  v-memo="[coach.updated_at]"
  :coach="coach"
  :school="getSchoolById(coach.school_id, schools)"
  @open-communication="(id) => openCommunication(id)"
  @delete-coach="openDeleteModal"
/>
```

Note `v-memo="[coach.updated_at]"` — single field.

- [ ] **Step 6: Simplify v-memo on other list pages**

Verify each model has `updated_at`:
```bash
grep "updated_at" types/models.ts
```

Then update each file:
- `pages/schools/index.vue:159` → `v-memo="[school.updated_at]"`
- `pages/interactions/index.vue:123` → `v-memo="[interaction.updated_at ?? interaction.occurred_at]"`
- `pages/documents/index.vue:217` and `:229` → `v-memo="[doc.updated_at]"`
- `pages/events/index.vue:203` → `v-memo="[event.updated_at ?? event.start_date]"`

- [ ] **Step 7: Run tests + smoke test each list page**

```bash
npm test
npm run dev
```

Navigate to `/schools`, `/interactions`, `/documents`, `/events` — trigger an update and confirm the list row re-renders correctly.

- [ ] **Step 8: Commit**

```bash
git add components/Coach/CoachListCard.vue tests/unit/components/Coach/CoachListCard.spec.ts pages/coaches/index.vue pages/schools/index.vue pages/interactions/index.vue pages/documents/index.vue pages/events/index.vue
git commit -m "refactor: extract CoachListCard, simplify v-memo to single updated_at across all list pages"
```

---

## Final Verification

- [ ] **Run full suite**

```bash
npm test
```

Expected: all tests PASS (5860+, plus newly added).

- [ ] **Type-check**

```bash
npm run type-check
```

Expected: 0 errors.

- [ ] **Lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Verify no parallel shallowRef in composables**

```bash
grep -n "shallowRef<School\|shallowRef<Coach" composables/useSchools.ts composables/useCoaches.ts
```

Expected: 0 results.

- [ ] **Verify no raw Supabase in pages**

```bash
grep -n "useSupabase\(\)" pages/coaches/index.vue
```

Expected: 0 results.

- [ ] **Verify no Options API stores**

```bash
grep -n "defineStore.*{$" stores/schools.ts stores/coaches.ts stores/user.ts
```

Expected: all `defineStore` calls use the Setup Store `() =>` form.

- [ ] **Manual smoke test**

```bash
npm run dev
```

- Schools list: loads, filter works, add/edit/delete a school
- Coaches list: loads, paginate, delete
- Dashboard: widgets load, action items show
- Auth: log out → log in → user state correct

---

## Unresolved Questions

Answer these before execution begins:

1. **Auth plugin:** Does `plugins/` already have `onAuthStateChange`?
   ```bash
   grep -r "onAuthStateChange" plugins/ middleware/ --include="*.ts" -l
   ```

2. **`useCoaches` smartDelete:** After Task 12, does `smartDelete` still have access to `$fetchAuth`? Check the composable before removing local Supabase access — smartDelete may need `$fetchAuth` passed in or kept local.

3. **`pages/reports/timeline.vue`:** The one page that imports `useSchoolStore()` directly. After Task 11, it reads `store.schools` which is now populated by `useSchools()` — confirm this page also calls `useSchools()` somewhere to trigger the initial fetch. If not, add a `useSchools().fetchSchools()` call in its `onMounted`.

4. **`getDeadPeriodMessage` in dashboard.vue:** Is this function isomorphic (no server-only imports)? It's imported from `~/server/utils/ncaaRecruitingCalendar`. Confirm it has no `process.env` or server-only deps before importing on the client.

5. **`useCoaches` return type:** Confirm no caller destructures `schools` from `useCoaches()`:
   ```bash
   grep -rn "useCoaches" pages/ composables/ components/ | grep "schools"
   ```
