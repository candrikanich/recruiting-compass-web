# Design System Spec Files + Token Consolidation — Design

**Date:** 2026-03-10
**Status:** Approved
**Branch:** develop

## Problem

Two overlapping issues:

1. **No design spec files** — LLMs building UI for this project infer design language by reading existing components, which is slow, error-prone, and produces visual drift across sessions. There is no machine-readable reference for "which color means what" or "which badge variant for this state."

2. **Token fragmentation** — `theme.css` defines `--brand-blue-500: #3b82f6` and `main.css @theme` defines `--color-brand-blue-500: #3b82f6` — the same hex value, hardcoded twice. If a color changes, both files must be updated in sync.

## Approach: B — Four spec files + CSS variable alias fix

### Part 1: Design spec files

Four markdown files in `docs/design/`, each with a clear, focused scope:

| File | Purpose |
|------|---------|
| `tokens.md` | Full token reference — semantic tokens + brand palette lookup |
| `colors.md` | Color roles — what each brand color communicates, do/don't rules |
| `components.md` | UI primitive guide — Badge, card, btn, badge-* with usage rules |
| `states.md` | Domain state → visual treatment — every app-specific state mapped to exact color |

These files live in version control alongside code. They are written to be consumed by both AI sessions (dense, machine-readable) and developers (scannable tables, concrete examples).

### Part 2: Token consolidation

`main.css @theme` becomes the **single source of truth** for all raw hex values. It already has the full 50–900 palette for all brand colors.

`theme.css` keeps its `--brand-*` custom property names (used by `theme.utilities.css`) but replaces hardcoded hex values with `var(--color-brand-*)` references:

```css
/* Before */
--brand-blue-500: #3b82f6;
--brand-blue-600: #2563eb;

/* After */
--brand-blue-500: var(--color-brand-blue-500);
--brand-blue-600: var(--color-brand-blue-600);
```

This works because Tailwind v4 `@theme` variables are exposed as CSS custom properties on `:root`, so `var(--color-brand-*)` resolves correctly at runtime.

**Files changed:** `theme.css` only. `theme.utilities.css` and all Vue components are unchanged.

## File Contents

### `docs/design/tokens.md`
- Table of all semantic tokens from `theme.css`: token name, current value, when to use, when NOT to use
- Note that raw brand palette lives in `main.css @theme` as `--color-brand-*`
- Gradient and shadow token reference
- Typography tokens

### `docs/design/colors.md`
- One section per `BadgeColor` value (`blue`, `purple`, `emerald`, `orange`, `slate`, `red`)
- Each section: role, emotional signal, concrete use cases, what NOT to use it for
- Amber callout: the one color used outside `BadgeColor` (raw Tailwind `amber`) — only for missing-data warnings in fit score display
- Color palette quick reference table

### `docs/design/components.md`
- `Badge` component: all 6 colors × 2 variants (solid/light) with when to use each
- CSS utility classes: `card`, `btn-primary`, `btn-secondary`, `btn`, `badge-*`, `search-btn`, `filter-type-btn-*`
- Design system Vue components: `GradientCard`, `EmptyState`, `ErrorState`, `LoadingState`, `CardSkeleton`
- Form components: `FormFileInput`, `FormCheckbox`, `FormDateInput`, `FormTimeInput`

### `docs/design/states.md`
Domain state → visual treatment lookup tables:

| Domain | States |
|--------|--------|
| Fit score tier | match, safety, reach, unlikely |
| Fit score numeric | ≥70, ≥50, <50 |
| Fit breakdown dimension | athletic, academic, opportunity, personal |
| School priority tier | A (Top Choice), B (Strong Interest), C (Fallback) |
| Interaction sentiment | very_positive, positive, neutral, negative |
| Interaction direction | inbound, outbound |
| Task status | not_started, in_progress, completed, skipped |
| Family invitation | pending (active), expired, resent confirmation |

## Constraints

- Spec files are documentation only — no build step, no code generation
- Token consolidation is a pure CSS change — zero risk to component behavior
- `theme.utilities.css` uses `var(--brand-*)` which continues to resolve via `theme.css` — no changes needed there
- Spec files are excluded from secret scanning (already configured in `.secrets.baseline`)

## Out of Scope

- Converting `theme.css` to reference `var(--color-brand-*)` for the semantic tokens like `--primary` and `--destructive` — those use `oklch()` and hex directly for reasons unrelated to the brand palette; leave them as-is
- Adding new tokens or changing any existing color values
- Tooling to auto-generate spec files from CSS (not worth the complexity at this scale)
