# Vue Review Part 2 — Additional Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the additional issues found in the second Vue expert review pass that aren't covered by the two existing plan files (`2026-02-24-vue-review-fixes.md` and `2026-02-24-bug-fixes.md`).

**Architecture:** Surgical edits only. No architectural redesigns. Items requiring large refactors (useActiveFamily/inject redesign, user store busy-wait, dual-store migration) are out of scope and noted at the bottom.

**Tech Stack:** Vue 3 Composition API, Nuxt 3, TypeScript strict, Pinia

**Prerequisite:** The other two plan files should be executed first, but the tasks here are mostly independent and can be done in any order.

---

## Scope

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | Critical | useToast singleton bug — every call creates new toasts ref | `composables/useToast.ts` |
| 2 | Critical | useResendCooldown setInterval leaks on unmount | `composables/useResendCooldown.ts` |
| 3 | High | AthleteSwitcher.vue has debug console.debug calls in production (PII leak) | `components/AthleteSwitcher.vue` |
| 4 | High | app.vue uses raw console.debug/error instead of structured logger | `app.vue` |
| 5 | High | EditCoachModal uses useCoaches() creating an isolated composable instance | `components/EditCoachModal.vue` |
| 6 | Medium | useDeleteModal double-resets isDeleting in catch+finally | `composables/useDeleteModal.ts` |
| 7 | Medium | useSearchConsolidated missing clearTimeout before reassigning searchTimeoutId | `composables/useSearchConsolidated.ts` |
| 8 | Medium | useAutoSave debounced save fires after component unmount | `composables/useAutoSave.ts` |
| 9 | Medium | FilterChips.vue uses `any` for filterValues and getDisplayValue props | `components/DesignSystem/FilterChips.vue` |
| 10 | Medium | useDashboardCalculations uses `{ value: T }` instead of `Ref<T>` for interface | `composables/useDashboardCalculations.ts` |
| 11 | Medium | stores/coaches.ts fetchAllCoaches guard ignores active filters | `stores/coaches.ts` |
| 12 | Medium | useAuth.ts has console.log in debug diagnostics that logs session data | `composables/useAuth.ts` |
| 13 | Low | Button.vue indigo/slate hover states identical to base (no visual hover feedback) | `components/DesignSystem/Button.vue` |

---

## Task 1: Fix useToast Singleton Bug

**Problem:** `toasts` is created inside the function body — every call to `useToast()` creates a new independent ref. The `Toast.vue` component and all callers get different arrays, so toasts added by callers never appear in the UI.

**File:** `composables/useToast.ts`

**Step 1: Move toasts to module scope**

Current (line 4-5):
```typescript
export const useToast = () => {
  const toasts = ref<Toast[]>([]);
```

Replace the entire file content:
```typescript
import { ref, computed } from "vue";
import type { Toast, ToastType } from "~/types/toast";

// Module-level singleton: all callers share the same toasts array
const toasts = ref<Toast[]>([]);

export const useToast = () => {
  const showToast = (
    message: string,
    type: ToastType = "info",
    duration = 5000,
  ) => {
    const id = Date.now().toString() + Math.random();
    toasts.value.push({ id, message, type });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  const clearAll = () => {
    toasts.value = [];
  };

  return {
    toasts: computed(() => toasts.value),
    showToast,
    removeToast,
    clearAll,
  };
};
```

**Step 2: Update the test — add clearAll to beforeEach**

The test at `tests/unit/composables/useToast.spec.ts` creates multiple `useToast()` instances per test case. Since the ref is now shared, toasts accumulate across tests. Add clearAll to beforeEach:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useToast } from "~/composables/useToast";

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    // Clear shared singleton state between tests
    const { clearAll } = useToast();
    clearAll();
  });

  // ... rest of tests unchanged
```

**Step 3: Run tests**
```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
npm run test -- --run tests/unit/composables/useToast.spec.ts --reporter=verbose 2>&1 | tail -30
```
Expected: All tests pass.

**Step 4: Commit**
```bash
git add composables/useToast.ts tests/unit/composables/useToast.spec.ts
git commit -m "fix: make useToast toasts a module-level singleton so callers and Toast.vue share state

Every call to useToast() was creating a fresh toasts ref. Toast.vue
rendered a different array than callers wrote to, so toasts never appeared."
```

---

## Task 2: Fix useResendCooldown setInterval Leak

**Problem:** `setInterval` runs after component unmount. `stopCooldown` exists but is never automatically called.

**File:** `composables/useResendCooldown.ts`

**Step 1: Add onBeforeUnmount**

Add this import to the top of the file:
```typescript
import { ref, computed, onBeforeUnmount } from "vue";
```

Add this block after the `stopCooldown` function definition (after line 78, before the `buttonLabel` computed):
```typescript
  // Auto-cleanup when component using this composable unmounts
  onBeforeUnmount(() => {
    stopCooldown();
  });
```

**Step 2: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -20
```

**Step 3: Commit**
```bash
git add composables/useResendCooldown.ts
git commit -m "fix: stop cooldown interval on component unmount to prevent timer leak"
```

---

## Task 3: Remove Debug console.debug from AthleteSwitcher

**Problem:** Two `console.debug` calls exist in production code — one at module level (runs on every import) and one inside a `computed` (runs on every re-evaluation, logging the `parentAccessibleFamilies` array which is PII).

**File:** `components/AthleteSwitcher.vue`

**Step 1: Remove the two console.debug calls**

Remove line 35:
```typescript
console.debug("[AthleteSwitcher] Injection result:", { injected: !!injected });
```

Remove lines 45-48:
```typescript
  console.debug(
    `[AthleteSwitcher] isParent=${isParent}, familiesCount=${familiesCount}, show=${show}`,
    activeFamily.parentAccessibleFamilies.value,
  );
```

The `showSwitcher` computed should look like:
```typescript
const showSwitcher = computed(() => {
  const isParent = activeFamily.isParent.value;
  const familiesCount = activeFamily.parentAccessibleFamilies.value.length;
  return isParent && familiesCount > 1;
});
```

**Step 2: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -10
```

**Step 3: Commit**
```bash
git add components/AthleteSwitcher.vue
git commit -m "fix: remove debug console.debug calls from AthleteSwitcher that logged PII"
```

---

## Task 4: Replace Raw console.* in app.vue with Structured Logger

**Problem:** `app.vue` uses `console.debug` and `console.error` instead of `createClientLogger`, making initialization errors invisible in the log aggregation system.

**File:** `app.vue`

**Step 1: Add logger import**

In `<script setup>`, the existing imports are:
```typescript
import { onBeforeMount, provide } from "vue";
import { useSessionTimeout } from "~/composables/useSessionTimeout";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "~/composables/useActiveFamily";
import SessionTimeoutWarning from "~/components/Auth/SessionTimeoutWarning.vue";
```

Add after the existing imports:
```typescript
import { createClientLogger } from "~/utils/logger";
const logger = createClientLogger("app");
```

**Step 2: Replace console calls**

Replace:
```typescript
    console.debug("[App] Starting user initialization");
```
With:
```typescript
    logger.debug("Starting user initialization");
```

Replace:
```typescript
        console.debug("[App] User initialization complete");
```
With:
```typescript
        logger.debug("User initialization complete");
```

Replace:
```typescript
        console.error("[App] Failed to initialize user:", err);
```
With:
```typescript
        logger.error("Failed to initialize user", err);
```

**Step 3: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -10
```

**Step 4: Commit**
```bash
git add app.vue
git commit -m "chore: replace raw console.* with structured logger in app.vue"
```

---

## Task 5: Fix EditCoachModal Isolated useCoaches Instance

**Problem:** `EditCoachModal.vue` calls `useCoaches()` which creates its own isolated `coaches` ref and registers a `watch` on `activeAthleteId`. When the athlete switches, it calls `fetchAllCoaches()` unnecessarily. More critically, `updateCoach` writes to this isolated instance's `coaches.value` — the parent page's list won't update from the parent's composable instance.

**The fix:** Accept `updateCoach` as a prop from the parent instead of calling `useCoaches()` inside the modal.

**File:** `components/EditCoachModal.vue`

**Step 1: Check current Props and useCoaches usage**

The modal currently has (around line 202-214):
```typescript
interface Props {
  coach: Coach;
  isOpen: boolean;
}
const props = defineProps<Props>();
// ...
const { updateCoach } = useCoaches();
```

**Step 2: Add updateFn to Props and remove useCoaches call**

Update the Props interface to include the update function:
```typescript
interface Props {
  coach: Coach;
  isOpen: boolean;
  updateFn: (id: string, data: Partial<Coach>) => Promise<Coach>;
}
const props = defineProps<Props>();
```

Remove the line:
```typescript
const { updateCoach } = useCoaches();
```

Find where `updateCoach` is called in the save handler (search for `updateCoach(` in the file) and replace with `props.updateFn(`.

**Step 3: Update parent components that open EditCoachModal**

Search for all usages of `EditCoachModal`:
```bash
grep -r "EditCoachModal" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web/pages --include="*.vue" -l
grep -r "EditCoachModal" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web/components --include="*.vue" -l
```

For each parent that uses `EditCoachModal`, add `:update-fn="updateCoach"`. The parent should already have `const { updateCoach } = useCoaches()` from its own usage — pass that down:
```html
<EditCoachModal
  :coach="selectedCoach"
  :is-open="isEditModalOpen"
  :update-fn="updateCoach"
  @close="handleClose"
  @updated="handleUpdated"
/>
```

**Step 4: Remove the useCoaches import from EditCoachModal if it was the only usage**

Check the full import list at the top of `EditCoachModal.vue` — if `useCoaches` is imported but no longer called, remove the import.

**Step 5: Run type-check + tests**
```bash
npm run type-check 2>&1 | head -30
npm run test -- --run --reporter=dot 2>&1 | tail -20
```

**Step 6: Commit**
```bash
git add components/EditCoachModal.vue pages/ components/
git commit -m "refactor: accept updateFn as prop in EditCoachModal instead of calling useCoaches() internally

Calling useCoaches() inside the modal created an isolated composable instance
with its own coaches ref and an unnecessary watch on activeAthleteId. The
parent page already has a useCoaches() instance — pass updateCoach down."
```

---

## Task 6: Fix useDeleteModal Double-Reset of isDeleting

**Problem:** In the `catch` branch, `isDeleting.value = false` is set explicitly AND then set again by `finally`. The explicit set in `catch` is redundant.

**File:** `composables/useDeleteModal.ts`

**Step 1: Remove the explicit reset from catch**

Current code (lines 41-46):
```typescript
    } catch (error) {
      isDeleting.value = false;
      throw error; // Re-throw so caller can handle error display
    } finally {
      isDeleting.value = false;
    }
```

Replace with:
```typescript
    } catch (error) {
      throw error; // Re-throw so caller can handle error display
    } finally {
      isDeleting.value = false;
    }
```

**Step 2: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -10
```

**Step 3: Commit**
```bash
git add composables/useDeleteModal.ts
git commit -m "fix: remove redundant isDeleting reset in catch block — finally handles it"
```

---

## Task 7: Fix useSearchConsolidated Missing clearTimeout

**Problem:** `searchTimeoutId` is reassigned without clearing the previous timer first. If search is triggered rapidly, multiple timers fire.

**File:** `composables/useSearchConsolidated.ts`

**Step 1: Find where searchTimeoutId is assigned**

Around line 458:
```typescript
    searchTimeoutId = setTimeout(async () => {
```

**Step 2: Add clearTimeout before reassigning**

Replace with:
```typescript
    clearTimeout(searchTimeoutId);
    searchTimeoutId = setTimeout(async () => {
```

**Step 3: Run tests**
```bash
npm run test -- --run tests/unit/composables/useSearchConsolidated.spec.ts --reporter=verbose 2>&1 | tail -20
```

**Step 4: Commit**
```bash
git add composables/useSearchConsolidated.ts
git commit -m "fix: clear pending search timeout before scheduling a new one in useSearchConsolidated"
```

---

## Task 8: Fix useAutoSave Firing After Unmount

**Problem:** The debounced save callback can fire after the component unmounts if a pending debounce is in-flight. The project's `debounce` utility doesn't expose a `cancel` method, so we use a mounted flag instead.

**File:** `composables/useAutoSave.ts`

**Step 1: Add onBeforeUnmount import**

Current imports:
```typescript
import { ref } from "vue";
```

Replace with:
```typescript
import { ref, onBeforeUnmount } from "vue";
```

**Step 2: Add mounted flag and guard**

After `const { debounceMs = 500, onSave, onError } = options;`, add:
```typescript
  let isMounted = true;
  onBeforeUnmount(() => {
    isMounted = false;
  });
```

Inside `performSave` (the debounced function), add an early return at the top:
```typescript
  const performSave = debounce(async () => {
    if (!isMounted) return;
    isSaving.value = true;
```

**Step 3: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -10
```

**Step 4: Commit**
```bash
git add composables/useAutoSave.ts
git commit -m "fix: guard debounced save against firing after component unmount"
```

---

## Task 9: Fix FilterChips.vue `any` Prop Types

**Problem:** `filterValues` and `getDisplayValue` use `any`. The `FilterValues` type is already imported but not used for these props.

**File:** `components/DesignSystem/FilterChips.vue`

**Step 1: Check the FilterValues type**

Open `~/types/filters.ts` and verify the `FilterValues` type definition. It should be `Record<string, unknown>` or similar.

**Step 2: Update Props interface**

Current (lines 51-57):
```typescript
interface Props {
  configs: FilterConfig[];
  filterValues: Record<string, any>;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getDisplayValue: (field: string, value: any) => string;
}
```

Replace with:
```typescript
interface Props {
  configs: FilterConfig[];
  filterValues: FilterValues;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getDisplayValue: (field: string, value: FilterValues[string]) => string;
}
```

Note: `FilterValues` is already imported at line 49. If `FilterValues` is typed as `Record<string, unknown>`, then `FilterValues[string]` is `unknown`. If that causes issues with the `getDisplayValue` callers, adjust to `(field: string, value: unknown) => string`.

**Step 3: Run type-check**
```bash
npm run type-check 2>&1 | head -30
```

Fix any type errors that arise in callers.

**Step 4: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -10
```

**Step 5: Commit**
```bash
git add components/DesignSystem/FilterChips.vue
git commit -m "fix: replace any types with FilterValues in FilterChips props interface"
```

---

## Task 10: Fix useDashboardCalculations Interface

**Problem:** The `DashboardData` interface uses `{ value: T }` (structurally matches a ref but isn't typed as one). TypeScript won't catch if a non-reactive object is passed.

**File:** `composables/useDashboardCalculations.ts`

**Step 1: Add Ref import**

Current imports:
```typescript
import { computed } from "vue";
import type { ComputedRef } from "vue";
```

Replace with:
```typescript
import { computed } from "vue";
import type { ComputedRef, Ref } from "vue";
```

**Step 2: Update the DashboardData interface**

Current (lines 26-32):
```typescript
interface DashboardData {
  allSchools: { value: School[] };
  allInteractions: { value: Interaction[] };
  allOffers: { value: Offer[] };
  allEvents: { value: Event[] };
  allMetrics: { value: PerformanceMetric[] };
}
```

Replace with:
```typescript
interface DashboardData {
  allSchools: Ref<School[]>;
  allInteractions: Ref<Interaction[]>;
  allOffers: Ref<Offer[]>;
  allEvents: Ref<Event[]>;
  allMetrics: Ref<PerformanceMetric[]>;
}
```

**Step 3: Run type-check**
```bash
npm run type-check 2>&1 | head -30
```

If any callers pass a `ComputedRef` where `Ref` is expected: `ComputedRef<T>` extends `Ref<T>`, so this should be fine. If callers pass plain objects `{ value: [...] }`, they will correctly error and need updating to pass actual refs.

**Step 4: Commit**
```bash
git add composables/useDashboardCalculations.ts
git commit -m "fix: use Ref<T> instead of { value: T } in DashboardData interface for type safety"
```

---

## Task 11: Fix stores/coaches.ts Fetch Guard Ignoring Filters

**Problem:** The guard `if (this.isFetched && this.coaches.length > 0 && !filters) return;` allows stale data to be returned when `filters` is undefined, even if the cache was populated by a filtered query. If `fetchAllCoaches(someFilter)` runs first, `isFetched` is set to `true`. A subsequent `fetchAllCoaches()` (no filter) returns the filtered cache as if it were the full dataset.

**File:** `stores/coaches.ts`

**Step 1: Add a `lastFetchedWithFilters` state property**

Find the state definition at the top of the store (the `state: () => ({...})` block). Add:
```typescript
lastFetchedWithFilters: false as boolean,
```

**Step 2: Record whether the last fetch had filters**

After `this.isFetched = true;` (around line 208), add:
```typescript
this.lastFetchedWithFilters = !!filters;
```

**Step 3: Update the guard**

Current guard (line 169):
```typescript
if (this.isFetched && this.coaches.length > 0 && !filters) return;
```

Replace with:
```typescript
// Return cached data only if the cache was populated without filters
// (a filtered cache should not masquerade as a full dataset)
if (this.isFetched && this.coaches.length > 0 && !filters && !this.lastFetchedWithFilters) return;
```

**Step 4: Run type-check + tests**
```bash
npm run type-check 2>&1 | head -20
npm run test -- --run --reporter=dot 2>&1 | tail -15
```

**Step 5: Commit**
```bash
git add stores/coaches.ts
git commit -m "fix: skip fetch cache in fetchAllCoaches if cache was populated by a filtered query"
```

---

## Task 12: Remove Production console.log from useAuth.ts Diagnostics

**Problem:** `verifyUserIdStability` (and its helpers) use `console.log`, `console.group`, `console.table`, and `console.error` with styled output. These functions are diagnostic utilities that log session state (including user IDs). If exported and available in production, they represent a data exposure risk.

**File:** `composables/useAuth.ts`

**Step 1: Find the diagnostic section**

Search for `verifyUserIdStability` in the file. The section spans from approximately line 490-580 and includes `getAuthState`, `compareAuthStates`, and `verifyUserIdStability`.

**Step 2: Check if these functions are returned from useAuth**

At the bottom of `useAuth.ts`, find the return statement. Check if `verifyUserIdStability`, `getAuthState`, or `compareAuthStates` are in the returned object.

**If they are NOT returned:** The functions are dead code — remove the entire section.

**If they ARE returned:** They are potentially used as debugging utilities. In that case, wrap the console calls in a development guard:

```typescript
const isDev = import.meta.dev; // Nuxt/Vite dev mode flag

// In verifyUserIdStability:
if (isDev) {
  console.log("%c🔍 Starting User ID Stability Test", "color: blue; font-weight: bold;");
}
```

Or better: replace the entire function body with logger.debug calls since `createClientLogger` is presumably already available in useAuth.ts.

**Step 3: Run type-check + tests**
```bash
npm run type-check 2>&1 | head -20
npm run test -- --run --reporter=dot 2>&1 | tail -15
```

**Step 4: Commit**
```bash
git add composables/useAuth.ts
git commit -m "fix: remove or guard production console.log calls in useAuth diagnostic functions"
```

---

## Task 13: Fix Button.vue Hover States for indigo and slate

**Problem:** The `solid` variant for `indigo` and `slate` has identical base and hover classes, so the button has no visual hover feedback.

**File:** `components/DesignSystem/Button.vue`

**Step 1: Fix the colorVariants object**

Current (lines 84-99):
```typescript
  indigo: {
    solid: "bg-brand-indigo-600 text-white hover:bg-brand-indigo-600",
    gradient:
      "bg-gradient-to-r from-brand-indigo-500 to-brand-indigo-600 text-white hover:from-brand-indigo-600 hover:to-brand-indigo-600",
    ...
  },
  slate: {
    solid: "bg-brand-slate-700 text-white hover:bg-brand-slate-700",
    gradient:
      "bg-gradient-to-r from-brand-slate-700 to-brand-slate-700 text-white hover:from-brand-slate-700 hover:to-brand-slate-700",
    ...
  },
```

Replace with:
```typescript
  indigo: {
    solid: "bg-brand-indigo-600 text-white hover:bg-brand-indigo-700",
    gradient:
      "bg-gradient-to-r from-brand-indigo-500 to-brand-indigo-600 text-white hover:from-brand-indigo-600 hover:to-brand-indigo-700",
    outline:
      "border-2 border-brand-indigo-500 text-brand-indigo-600 hover:bg-brand-indigo-100",
    ghost: "text-brand-indigo-600 hover:bg-brand-indigo-100",
  },
  slate: {
    solid: "bg-brand-slate-700 text-white hover:bg-brand-slate-800",
    gradient:
      "bg-gradient-to-r from-brand-slate-600 to-brand-slate-700 text-white hover:from-brand-slate-700 hover:to-brand-slate-800",
    outline:
      "border-2 border-brand-slate-600 text-brand-slate-700 hover:bg-brand-slate-100",
    ghost: "text-brand-slate-700 hover:bg-brand-slate-100",
  },
```

**Step 2: Run tests**
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -10
```

**Step 3: Commit**
```bash
git add components/DesignSystem/Button.vue
git commit -m "fix: restore hover color feedback for indigo and slate button variants"
```

---

## Final Verification

After all tasks:

```bash
npm run type-check 2>&1 | tail -20
npm run test -- --run 2>&1 | tail -30
npm run lint 2>&1 | tail -10
```

Expected: No errors. All tests pass.

---

## Out of Scope (Future Work)

These issues require dedicated architectural sessions:

1. **`stores/user.ts` busy-wait** (S11) — Replace the 10-attempt polling loop with `supabase.auth.onAuthStateChange`. Requires careful integration testing since user initialization touches auth, family context, and routing.

2. **`usePageFilters` deep:true watch** (S1) — Need to audit all consumers to confirm filters are always replaced (not mutated) before removing `deep: true`. Risky change without full audit.

3. **`InteractionFiltersBar.vue` raw DOM casting** (W9) — Replace with `defineModel` or writable computed. Low-risk but requires refactoring the 4 selects and verifying parent bindings.

4. **`useDashboardData` duplicate fetching** (W4) — Replace with aggregation over existing composable state. Large scope, requires architectural discussion.

5. **`useActiveFamily` getCurrentInstance()** (S7) — Expose explicit `initialize()` method. Requires changes to all call sites.

6. **`useCoaches.fetchCoaches` array reset** (A3) — Document that `fetchCoaches(schoolId)` replaces the full array. Add JSDoc warning.
