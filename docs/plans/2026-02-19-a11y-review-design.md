# Accessibility Review Design

**Date:** 2026-02-19
**Goal:** Full a11y audit → fix all issues → prevent regressions
**Driver:** User experience — usability for all users including assistive tech users

## Scope

- 63 pages, 222 components
- All WCAG 2.1 AA concerns: semantic HTML, ARIA, keyboard nav, focus management, color contrast, screen reader announcements

## Existing Baseline

- `axe-core` + `@axe-core/playwright` already installed (not wired to tests yet)
- `SkipLink` component exists but only used in 5 pages — needs broader adoption
- `DesignSystem/` has shared Form, Button, Badge, Toast, ConfirmDialog — highest leverage targets
- ~74 component files and 21 page files already have some `aria-*` usage

## Approach: Agent Audit + Bottom-Up Fix + Automated Regression Tests

Combines: agent-driven contextual audit, component-first fixing for maximum leverage, axe-based regression prevention.

---

## Audit Strategy (3 Tiers by Leverage)

**Tier 1 — DesignSystem components**
Fix once, heals everywhere. Targets: Button, Badge, Toast, Form/*, ConfirmDialog, Card, EmptyState, ErrorState, FilterChips, LoadingSkeleton.

**Tier 2 — Shared layout components**
Affects all pages. Targets: Header, Navigation/sidebar, all modal patterns, SkipLink placement.

**Tier 3 — Pages (all 63)**
Grouped by domain:
- Auth: login, signup, verify-email
- Dashboard
- Schools & Coaches
- Interactions
- Settings (all sub-pages)
- Offers
- Tasks
- Onboarding

Each file is reviewed by the `a11y-wcag-auditor` agent for:
- Semantic HTML (correct element choices)
- ARIA roles, labels, and descriptions
- Keyboard navigation and focus order
- Focus management in modals/dialogs
- Color contrast cues
- Screen reader announcements for dynamic content

---

## Fix Strategy

### Severity Model

| Priority | Description | Examples |
|----------|-------------|---------|
| P0 — Critical | Blocks assistive tech users entirely | Missing labels on inputs, broken keyboard traps, no visible focus |
| P1 — High | Significant degradation of experience | Missing landmarks, poor heading hierarchy, unlabeled icons, modals without focus management |
| P2 — Medium | Noticeable issues, workarounds exist | Borderline color contrast, redundant ARIA, poor alt text |
| P3 — Low | Enhancements | `aria-live` regions for dynamic content, additional skip links |

### Fix Order

P0s across all files → P1s → P2s → P3s

Each fix is a separate commit per component/page for reviewable diffs.

`SkipLink` adoption is extended to all pages during the fix pass.

---

## Regression Prevention

### Layer 1 — Vitest unit tests (DesignSystem components)

Each DesignSystem component gets an `a11y.spec.ts` that mounts it and asserts zero axe violations. Runs in `npm test` with the existing suite.

```typescript
import { axe } from 'axe-core'
import { mount } from '@vue/test-utils'
import Button from '~/components/DesignSystem/Button.vue'

it('has no a11y violations', async () => {
  const wrapper = mount(Button, { props: { label: 'Submit' } })
  const results = await axe(wrapper.element)
  expect(results.violations).toHaveLength(0)
})
```

### Layer 2 — Playwright E2E axe scans (critical flows)

8 critical flows scanned with `@axe-core/playwright`:
1. Login
2. Dashboard
3. Schools list
4. Coach detail
5. Add interaction
6. Settings (player details)
7. Offers
8. Tasks

```typescript
import { checkA11y } from '@axe-core/playwright'

test('dashboard has no a11y violations', async ({ page }) => {
  await page.goto('/dashboard')
  await checkA11y(page)
})
```

Runs in `npm run test:e2e`. No new packages needed.

---

## Deliverables

1. Audit findings report per component/page with severity tags
2. Fixed components/pages committed in severity order
3. Vitest a11y unit tests for all DesignSystem components
4. Playwright axe scans for 8 critical flows
5. `SkipLink` adopted across all pages
