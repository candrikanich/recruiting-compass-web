# Vue 3 Safe Fixes — Design Spec

**Date:** 2026-03-10
**Track:** A (safe, targeted fixes — no architectural changes)
**Deferred:** Store/composable data duplication, Setup Store migration, mega-composable splitting (Track B)

## Goal

Apply 8 categories of targeted Vue 3 / Nuxt 3 quality improvements with zero behavior changes. Each group is independently verifiable: tests must pass after every group before proceeding.

## Success Criteria

- `npm run type-check` passes
- `npm run test` passes (all ~5860 tests)
- `npm run lint` passes
- No behavior changes — purely structural/quality improvements

---

## Section 1 — Trivial/Mechanical

**Files touched:** 6 pages, `components/Interactions/InteractionAddForm.vue`, ~10 small components

### 1a. Remove redundant `Header` imports
Nuxt auto-imports all components in `/components/**`. Six pages explicitly import `Header` — remove those imports.

Affected pages: `coaches/index.vue`, `performance/index.vue`, `offers/index.vue`, `settings/index.vue`, `settings/location.vue`, `reports/index.vue`

### 1b. Extract `useFamilyCtx` composable
Seven pages repeat the same inject-or-fallback pattern:
```ts
const activeFamily = (inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext()) as UseActiveFamilyReturn;
```
Create `composables/useFamilyCtx.ts` and replace all 7 occurrences.

### 1c. Replace `document.getElementById` with `useTemplateRef`
`InteractionAddForm.vue` uses `document.getElementById("attachments")` to reset the file input. Replace with `useTemplateRef<HTMLInputElement>("attachments")` and add `ref="attachments"` to the template element.

### 1d. Add `withDefaults` where missing
Components with optional boolean/string props that rely on `|| fallback` in templates should declare defaults via `withDefaults(defineProps<{}>(), {})`.

---

## Section 2 — VueUse Adoption

**Files touched:** `useSearchConsolidated.ts`, `useUniversalFilter.ts`, `useAutoSave.ts`, `useSessionTimeout.ts`, `stores/user.ts`

### 2a. Replace manual debounce with `useDebounceFn`
Three composables use `setTimeout`/`clearTimeout` manually for debouncing:
- `useSearchConsolidated.ts` — `let searchTimeoutId`
- `useUniversalFilter.ts` — `Record<string, ReturnType<typeof setTimeout>>`
- `useAutoSave.ts` — uses `~/utils/debounce` utility

Replace all with `useDebounceFn` from `@vueuse/core`.

### 2b. Replace `useSessionTimeout` manual patterns
`useSessionTimeout.ts` (225 lines) manually implements:
- Throttled activity tracking → replace with `useThrottleFn`
- Raw `addEventListener`/`removeEventListener` → replace with `useEventListener` (auto-cleanup)
- Page visibility → replace with `usePageVisibility`
- `localStorage` access → replace with `useLocalStorage`

### 2c. Fix `stores/user.ts` logout SRP violation
Logout action removes `localStorage` keys belonging to other domains (coaches, schools, interactions, offers). This violates SRP and is a maintenance trap.

Fix: Remove those `localStorage.removeItem` calls from `logout()`. Instead, each affected composable/store reacts to the user store's logout state via a `watch` on `isAuthenticated` to clear its own cache when the user logs out.

---

## Section 3 — Query & Template Quality

**Files touched:** `useEvents.ts`, `useEntitySearch.ts`, `useDashboardData.ts`, `pages/tasks/index.vue`, `pages/coaches/index.vue`, `pages/schools/index.vue`, `components/Interactions/InteractionAddForm.vue`

### 3a. Replace `select("*")` with explicit column lists
Audit `useEvents`, `useEntitySearch`, `useDashboardData` (and `useInteractions`, `useCoaches` if applicable). For each query, determine which columns the UI actually renders and replace `select("*")` with an explicit column list. Use `useSchools.ts` as the reference pattern.

### 3b. Extract inline template logic to computed properties
`pages/tasks/index.vue` has multi-line `:class` and `:title` ternary expressions per list item. Extract to named computed properties (e.g., `taskCheckboxClass(task)`, `taskCheckboxTitle(task)`).

### 3c. Add `v-memo` to list rows
Coaches list (`pages/coaches/index.vue`) and schools list (`pages/schools/index.vue`) render 12–50 items with multiple `:class` bindings per row. Add `v-memo="[item.id, ...displayedFields]"` to each list item element.

### 3d. Convert `InteractionAddForm` form object to ref factory
Replace `reactive({ ... })` + manual `resetForm()` with `ref<FormType>(initialValues())` where `initialValues` is a factory function. Reset becomes `form.value = initialValues()`.

---

## Implementation Strategy

Each section is a separate agent task, run sequentially with test verification between each:

1. Section 1 (mechanical) → verify tests
2. Section 2 (VueUse) → verify tests
3. Section 3 (queries + templates) → verify tests
4. Commit all groups together with a single descriptive commit

Each group can be parallelized internally (e.g., 1a+1b+1c+1d in parallel agents) since they touch non-overlapping files.

---

## Deferred — Track B

- Resolve Pinia store / composable data duplication (coaches, schools, interactions)
- Migrate stores to Setup Store syntax + remove `await import()` in actions
- Split mega-composables (`useSchools`, `useCoaches`, `useSearchConsolidated`, `useAuth`, etc.)
