# Accessibility Testing Guide

Automated tools catch approximately 30–40% of real accessibility issues. This guide covers all three testing layers used in this project.

## Automated Tests

### Axe unit tests (component level)

Tests in `tests/unit/a11y/` run axe-core on individual components in isolation.

```bash
# All a11y unit tests
npm test -- tests/unit/a11y

# A single component
npm test -- tests/unit/a11y/FormInput.a11y.spec.ts
```

These tests catch structural ARIA violations — missing labels, incorrect roles, broken `aria-describedby` chains. They do not catch color contrast (happy-dom limitation) or issues that only appear in a running browser.

### pa11y full-site scan (page level)

Requires the dev server running on port 3000. Scans public pages with axe at WCAG 2.2 AA level.

```bash
npm run dev &
npx pa11y-ci --config tests/a11y/.pa11yci.json
```

Pages scanned: `/`, `/login`, `/signup`, `/forgot-password`, `/join`, `/dashboard`, `/settings`.

Auth-gated pages (`/schools`, `/coaches`, `/interactions`) require a logged-in session and are not covered here. Use the Playwright E2E suite for those.

---

## Keyboard-Only Testing Checklist

Use only Tab, Shift+Tab, Enter, Space, Escape, and arrow keys. No mouse.

**Tab order**
- [ ] Focus moves in a logical order (top → bottom, left → right)
- [ ] No unexpected focus traps outside of modals
- [ ] A skip-to-content link appears on the first Tab press on public pages

**Focus visibility**
- [ ] Every interactive element shows a visible focus ring when focused
- [ ] Focus ring meets WCAG 2.4.11: minimum 2px, clearly visible against the background
- [ ] No `outline: none` without a visible replacement

**Interactive elements**
- [ ] All buttons, links, and form inputs are reachable by Tab
- [ ] Buttons activate with Enter and Space
- [ ] Links activate with Enter
- [ ] Select elements open with Space/Enter and navigate with arrow keys

**Modals and dialogs**
- [ ] Focus moves into the modal when it opens
- [ ] Tab cycles only within the modal (focus trap active)
- [ ] Escape closes the modal and returns focus to the trigger element

**Forms**
- [ ] Every input has a visible, programmatic label (Tab to it and confirm a screen reader reads the label)
- [ ] Error messages appear near their field, not just at the top
- [ ] Required fields are marked in a way that does not rely on color alone

---

## Screen Reader Testing Matrix

Test with at least two of these pairings:

| Screen Reader | Browser | Platform | Priority |
|---|---|---|---|
| VoiceOver | Safari | macOS / iOS | High |
| NVDA (free) | Firefox | Windows | High |
| TalkBack | Chrome | Android | Medium |

**What to verify with a screen reader**
- [ ] Page `<title>` is descriptive and unique per page
- [ ] Headings form a logical outline (H1 → H2 → H3, no skipped levels)
- [ ] Images have meaningful `alt` text (`alt=""` is correct for decorative images)
- [ ] Form labels are announced when focusing an input
- [ ] Error messages are announced when they appear (check `aria-live` / `role="alert"`)
- [ ] Modal open and close is announced
- [ ] Custom icon-only buttons have an accessible label (`aria-label` or `aria-labelledby`)
- [ ] Toast and status notifications are announced via `aria-live`

**VoiceOver quick start (macOS)**
- Enable/disable: Cmd + F5
- VO key: Ctrl + Option
- Read next item: VO + Right arrow
- Interact with a control: VO + Shift + Down
- Open rotor (headings/landmarks): VO + U

---

## Adding Axe Tests for New Components

When building a new form component or modal, add a `tests/unit/a11y/YourComponent.a11y.spec.ts` file.

**Required pattern:**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import MyComponent from '~/components/MyComponent.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

describe('MyComponent accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(MyComponent, {
      props: { ... },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

**Rules:**
- Always pass `attachTo: document.body`
- Always disable `color-contrast` (happy-dom does not compute CSS values)
- Always call `wrapper.unmount()` after each test
- For modals using `<Teleport>`: call `axe(document.body, ...)` instead of `axe(wrapper.element, ...)`, and use `afterEach` for cleanup
- Test all meaningful states: default, required, error, disabled

**Stub policy:** Only stub child components that have composable or Nuxt dependencies that would cause mount errors. Stubs for purely presentational children defeat the purpose — let them render so axe sees real label/input bindings.
