# Vue Standards Refactor — Design Spec

**Date:** 2026-03-10
**Approach:** TDD Phase-by-Phase (Option A)
**Audit source:** vue-specialist agent review

---

## Problem

The codebase has solid Vue 3 foundations but carries 10 identified issues across four severity tiers. Left unaddressed, these impose accumulating maintenance cost and introduce subtle runtime risks.

---

## Goals

1. Eliminate all 10 issues identified in the vue-specialist audit
2. Maintain or improve test coverage throughout
3. No regressions — existing 5860 tests stay green after every phase
4. Write missing tests before touching untested code paths

---

## Phased Plan

### Phase 1 — Quick Wins (lowest risk)

| Item | Action |
|---|---|
| `DocumentUploadModal.vue` Options API | Convert to `<script setup>` |
| `ref<any[]>` copies in pages | Replace with typed computed refs |
| `v-memo` gaps | Add to interactions, events, documents list rows |
| `defineEmits` payload typing | Replace `any` with concrete types in CoachForm |

**Tests:** Existing `DocumentUploadModal.spec.ts` and `CoachForm.spec.ts` serve as regression net. Augment emit tests.

### Phase 2 — Type Safety

| Item | Action |
|---|---|
| `as any` Supabase casts (~25) | Replace with `Database` types + `satisfies` |
| `defineEmits` typed payloads across all components | Audit and fix all components with untyped emits |
| `useLoadingCounter` utility | Create `utils/loadingCounter.ts`, write tests first |

**Tests:** Write `tests/unit/utils/loadingCounter.spec.ts` before implementation. Store tests guard Supabase cast changes.

### Phase 3 — Structural

| Item | Action |
|---|---|
| Dynamic `import()` in store actions | Move to module-level static imports |
| Sanitization duplication | Extract `utils/sanitizers/entitySanitizer.ts` |
| Replace custom `useFocusTrap` | Swap with `@vueuse/integrations/useFocusTrap` |
| Replace `localStorage` reads | Adopt `useLocalStorage` from `@vueuse/core` |

**Tests:** Write `tests/unit/composables/useFocusTrap.spec.ts` before replacing implementation. Write `tests/unit/utils/entitySanitizer.spec.ts` before extracting.

### Phase 4 — Architectural (highest risk)

| Item | Action |
|---|---|
| `useFamilyContext` SSR singleton | Refactor stores to accept `familyId` as action param |
| `reactive()` + `Object.assign` in forms | Replace with `ref()` + spread in CoachForm/SchoolForm |
| `onMounted`+`watch` fetch races | Consolidate to single `watchEffect` or `watch` with immediate |
| Parallel composable/store state | Composables read from stores; stop parallel caching |

**Tests:** Write direct behavioral tests for `useFamilyContext` before refactor. Existing store/composable suites guard the convergence.

---

## Architecture Decisions

**useFamilyContext SSR fix:** Stores accept `familyId: string` as parameter in actions rather than reading a module-level singleton. The composable layer (which has access to `inject()`) reads the active family and passes it through.

**State layer convergence:** Composables remain the orchestration layer; Pinia stores hold canonical data. Composables write to stores via actions and read via getters — no parallel `shallowRef` arrays.

**VueUse adoption:** `useFocusTrap` from `@vueuse/integrations`, `useLocalStorage` from `@vueuse/core`. Both are already installed (v14.2).

**Loading state:** `useLoadingCounter` replaces both `useLoadingStates` (boolean) and the ad-hoc counter pattern in two composables — single source of truth.

---

## Success Criteria

- [ ] `npm test` passes after each phase (zero regressions)
- [ ] `npm run type-check` clean after Phase 2
- [ ] `npm run lint` clean throughout
- [ ] No `as any` in stores after Phase 2
- [ ] No module-level singleton in `useFamilyContext` after Phase 4
- [ ] `DocumentUploadModal.vue` uses `<script setup>`
- [ ] All `defineEmits` have typed payloads
- [ ] `v-memo` on all list row components
- [ ] `useLoadingCounter` used in all composables with concurrent ops

---

## Files Touched

**Phase 1:** `DocumentUploadModal.vue`, `pages/schools/index.vue`, `pages/interactions/index.vue`, `pages/events/index.vue`, `components/Coach/CoachForm.vue`

**Phase 2:** `stores/coaches.ts`, `stores/schools.ts`, all components with untyped emits, new `utils/loadingCounter.ts`

**Phase 3:** `stores/coaches.ts`, `stores/schools.ts`, `composables/useFocusTrap.ts`, new `utils/sanitizers/entitySanitizer.ts`

**Phase 4:** `composables/useFamilyContext.ts`, `stores/coaches.ts`, `stores/schools.ts`, `composables/useCoaches.ts`, `composables/useSchools.ts`, `components/Coach/CoachForm.vue`, `components/School/SchoolForm.vue`
