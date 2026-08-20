# Plan: FormSegmentedControl + Direction migration

**Branch:** `feat/segmented-control` (off develop) · worktree `wt-segmented-control` · port 3010
**Origin:** dropdown-usage audit — image "When a dropdown shouldn't exist" bucket 1 (2-4 options → radio/segmented).

## Goal
Build one reusable segmented control, migrate all 6 interaction-Direction `<select>`s to it. Later 2-4 option selects (coach-role ×5, sort-dir) reuse it in a follow-up.

## Component — `components/DesignSystem/Form/FormSegmentedControl.vue`
Styled native radios (fieldset + legend, visually-hidden `<input type=radio>` + styled label segments). Free keyboard/arrow nav + SR semantics.

Props mirror `FormSelect`: `modelValue: string`, `label`, `options: {value,label}[]`, `name?`, `required?`, `disabled?`, `error?`, `size?: 'sm'|'md'`.
Emits: `update:modelValue`, `blur`.
Styling: design tokens only (audit:tokens gate). Active `bg-brand-blue-600 text-white`; inactive `text-slate-700 hover:bg-slate-50`; focus-visible ring. Neutral filter segment = an option with `value:""` (no special config).

## Migration — 6 sites (same string values, no store/API change)
| Site | Shape | size |
|---|---|---|
| Interactions/InteractionFiltersBar.vue:42 | filter 3-way | sm |
| Interaction/InteractionFilters.vue:109 | filter 3-way | sm |
| Search/AdvancedFilters.vue:183 | filter 3-way | sm |
| coaches/[id]/communications.vue:56 | filter 3-way | sm |
| Interactions/InteractionAddForm.vue:45 | form 2-way, required | md |
| Events/EventQuickLogModal.vue:45 | form 2-way | md |

Excluded: `offers/index.vue:327` sortDirection (separate bucket).

## TDD
1. RED: `tests/unit/components/FormSegmentedControl.spec.ts` (render, emit on click, keyboard, disabled, active class, neutral option) + `tests/unit/a11y/FormSegmentedControl.a11y.spec.ts`.
2. GREEN: build component.
3. Migrate 6 sites; fix any `getByRole('combobox')` → `radio` in existing tests.

## Gates
`npm run type-check`, `npm run lint`, `npm run audit:tokens`, `npm run test`. Browser (port 3010): interactions filter bar + quick-log modal.
