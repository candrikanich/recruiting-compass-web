# Accessibility Improvements Design

**Date:** 2026-03-07
**Status:** Approved

## Overview

Implement WCAG 2.2 AA accessibility improvements across the Recruiting Compass web app, based on a gap analysis against the 2026 accessibility checklist. Changes span unit-level axe testing, a component fix, pa11y config updates, and manual testing documentation.

## Scope

5 areas of work, in priority order:

1. **vitest-axe unit tests** — add `@axe-core/react`-equivalent checks at component level
2. **SchoolLogo aria fix** — fallback div missing accessible label
3. **pa11y WCAG 2.2 update** — upgrade standard string and rules array
4. **Expand pa11y URLs** — add public pages to automated scan
5. **Keyboard testing documentation** — codify manual testing checklist

---

## 1. vitest-axe Unit Tests

### Package

Install `vitest-axe` (wraps axe-core for Vitest). Already have `axe-core` installed — vitest-axe adds the `toHaveNoViolations` matcher and `axe()` helper.

### Directory structure

```
tests/unit/a11y/
├── FormInput.a11y.spec.ts
├── FormSelect.a11y.spec.ts
├── FormTextarea.a11y.spec.ts
├── SignupForm.a11y.spec.ts
├── LoginForm.a11y.spec.ts
├── DeleteConfirmationModal.a11y.spec.ts
└── SchoolLogo.a11y.spec.ts
```

### Test pattern

Each file: mount the component in key states (default, with error, required, disabled) and assert `expect(await axe(wrapper.element)).toHaveNoViolations()`. Use `configureAxe` to set WCAG 2.2 AA ruleset.

### Setup

Add `vitest-axe/extend-expect` import to `tests/setup.ts` (or equivalent global setup) so the matcher is available without per-file imports.

---

## 2. SchoolLogo Accessible Fallback

The emoji/letter fallback `<div>` in `SchoolLogo.vue` has no ARIA label. Screen readers see it as an unlabeled interactive region or skip it silently.

**Fix:** Add `role="img"` and `:aria-label="\`${school.name} logo\`"` to the fallback div. This mirrors the `alt` attribute already set on the `<img>` path.

---

## 3. pa11y WCAG 2.2 Config Update

**File:** `tests/a11y/.pa11yci.json`

| Field | Before | After |
|-------|--------|-------|
| `standard` | `"WCAG2AA"` | `"WCAG22AA"` |
| `rules` | `["wcag2aa"]` | `["wcag22aa"]` |

This enables two new WCAG 2.2 checks:
- 2.4.11: Focus appearance (min 2px outline perimeter)
- 2.5.8: Target size minimum (24x24 CSS px)

---

## 4. Expand pa11y URLs

Add public pages that don't require auth state. Auth-gated pages redirect to `/login` in CI so they are not useful without a pre-authenticated session — exclude them with a comment.

**Add:**
- `http://localhost:3000/` (landing page)
- `http://localhost:3000/forgot-password`
- `http://localhost:3000/join`

**Keep:** existing `/login`, `/signup`, `/dashboard`, `/settings` (dashboard/settings will scan the login redirect, which is still useful).

---

## 5. Keyboard Testing Documentation

**File:** `docs/accessibility-testing.md`

Contents:
- Keyboard-only test checklist (Tab order, focus visibility, modal trap, Escape key, skip links)
- Screen reader test matrix (NVDA + Firefox, VoiceOver + Safari)
- How to run pa11y locally (`npx pa11y-ci --config tests/a11y/.pa11yci.json`)
- How to run vitest-axe tests (`npm test -- tests/unit/a11y`)
- Automation coverage caveat (30-40% of real issues)

---

## Out of Scope

- Auth-gated pa11y scanning (requires session injection — future work)
- Full manual keyboard audit of all pages (ongoing process, not one-time)
- Color contrast audit (no violations found in current codebase scan)
