# Accessibility Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add WCAG 2.2 AA axe unit tests for critical form components, fix the SchoolLogo ARIA fallback, upgrade pa11y to WCAG 2.2, expand pa11y URL coverage, and write keyboard testing documentation.

**Architecture:** `vitest-axe` tests live in `tests/unit/a11y/` and are auto-discovered by the existing `tests/unit/**/*.spec.ts` glob. The global `tests/setup.ts` registers the `toHaveNoViolations` matcher. All other changes are config/docs edits.

**Tech Stack:** vitest-axe, @vue/test-utils, happy-dom, axe-core (already installed), pa11y

**Important — happy-dom + color-contrast:** happy-dom does not compute real CSS values, so axe's `color-contrast` rule always reports false positives. Pass `{ rules: { 'color-contrast': { enabled: false } } }` to every `axe()` call. Structural ARIA rules work correctly.

**Important — Teleport + axe:** Components that use `<Teleport>` (like modals) render into `document.body`. For those, pass `attachTo: document.body` in mount options and call `axe(document.body)`. Always call `wrapper.unmount()` after each test to clean up.

---

### Task 1: Install vitest-axe and register the matcher globally

**Files:**
- Modify: `tests/setup.ts` (top of file, after existing imports)
- No test file — this task enables all subsequent tasks

**Step 1: Install the package**

```bash
npm install --save-dev vitest-axe
```

Expected output: `added 1 package` (vitest-axe has no new peer deps — it wraps the already-installed axe-core)

**Step 2: Add the matcher to `tests/setup.ts`**

Add these two lines immediately after the existing imports at the top of `tests/setup.ts`:

```typescript
import * as axeMatchers from 'vitest-axe/matchers'
expect.extend(axeMatchers)
```

The `expect` global is already available from vitest globals. No import needed.

**Step 3: Verify the setup compiles**

```bash
npm run type-check
```

Expected: no errors

**Step 4: Commit**

```bash
git add tests/setup.ts package.json package-lock.json
git commit -m "chore: install vitest-axe and register toHaveNoViolations matcher"
```

---

### Task 2: FormInput axe tests

**Files:**
- Create: `tests/unit/a11y/FormInput.a11y.spec.ts`
- Reference: `components/DesignSystem/Form/FormInput.vue`

`FormInput` wraps a `<label>` + `<input>` with `useId()` for the for/id binding. It also renders `<DesignSystemFieldError>` when `error` is set — stub that since it's a display-only child.

**Step 1: Create the test file**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import FormInput from '~/components/DesignSystem/Form/FormInput.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const fieldErrorStub = {
  template: '<div :id="id" role="alert">{{ error }}</div>',
  props: ['error', 'id'],
}

describe('FormInput accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address' },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when required', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address', required: true },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing an error', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address', error: 'This field is required' },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when disabled', async () => {
    const wrapper = mount(FormInput, {
      props: { modelValue: '', label: 'Email address', disabled: true },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

**Step 2: Run and verify all 4 pass**

```bash
npm test -- tests/unit/a11y/FormInput.a11y.spec.ts
```

Expected: 4 passing

**Step 3: Commit**

```bash
git add tests/unit/a11y/FormInput.a11y.spec.ts
git commit -m "test(a11y): add axe tests for FormInput"
```

---

### Task 3: FormSelect axe tests

**Files:**
- Create: `tests/unit/a11y/FormSelect.a11y.spec.ts`
- Reference: `components/DesignSystem/Form/FormSelect.vue`

`FormSelect` renders a `<label>` + `<select>` with `useId()`. Structure mirrors FormInput.

**Step 1: Create the test file**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import FormSelect from '~/components/DesignSystem/Form/FormSelect.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('FormSelect accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(FormSelect, {
      props: { modelValue: '', label: 'Sport', options: OPTIONS },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when required', async () => {
    const wrapper = mount(FormSelect, {
      props: { modelValue: '', label: 'Sport', options: OPTIONS, required: true },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing an error', async () => {
    const wrapper = mount(FormSelect, {
      props: { modelValue: '', label: 'Sport', options: OPTIONS, error: 'Please select a sport' },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

**Step 2: Run and verify**

```bash
npm test -- tests/unit/a11y/FormSelect.a11y.spec.ts
```

Expected: 3 passing

**Step 3: Commit**

```bash
git add tests/unit/a11y/FormSelect.a11y.spec.ts
git commit -m "test(a11y): add axe tests for FormSelect"
```

---

### Task 4: FormTextarea axe tests

**Files:**
- Create: `tests/unit/a11y/FormTextarea.a11y.spec.ts`
- Reference: `components/DesignSystem/Form/FormTextarea.vue`

**Step 1: Read the component to check its structure**

Read `components/DesignSystem/Form/FormTextarea.vue` before writing the test. Confirm it uses `useId()` for label/textarea binding and `DesignSystemFieldError` for error display (same pattern as FormInput). Adjust stubs if different.

**Step 2: Create the test file**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import FormTextarea from '~/components/DesignSystem/Form/FormTextarea.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const fieldErrorStub = {
  template: '<div :id="id" role="alert">{{ error }}</div>',
  props: ['error', 'id'],
}

describe('FormTextarea accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(FormTextarea, {
      props: { modelValue: '', label: 'Notes' },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when required', async () => {
    const wrapper = mount(FormTextarea, {
      props: { modelValue: '', label: 'Notes', required: true },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing an error', async () => {
    const wrapper = mount(FormTextarea, {
      props: { modelValue: '', label: 'Notes', error: 'Notes are required' },
      attachTo: document.body,
      global: { stubs: { DesignSystemFieldError: fieldErrorStub } },
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

**Step 3: Run and verify**

```bash
npm test -- tests/unit/a11y/FormTextarea.a11y.spec.ts
```

Expected: 3 passing

**Step 4: Commit**

```bash
git add tests/unit/a11y/FormTextarea.a11y.spec.ts
git commit -m "test(a11y): add axe tests for FormTextarea"
```

---

### Task 5: DeleteConfirmationModal axe tests

**Files:**
- Create: `tests/unit/a11y/DeleteConfirmationModal.a11y.spec.ts`
- Reference: `components/DeleteConfirmationModal.vue`

This modal uses `<Teleport to="body">` and `v-if="isOpen"`. Pass `attachTo: document.body` so Teleport works, pass `isOpen: true`, and axe-check `document.body` (not `wrapper.element`, which is an empty comment node when Teleport is used).

**Step 1: Create the test file**

```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import DeleteConfirmationModal from '~/components/DeleteConfirmationModal.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

describe('DeleteConfirmationModal accessibility', () => {
  let wrapper: ReturnType<typeof mount>

  afterEach(() => {
    wrapper?.unmount()
  })

  it('has no violations when open', async () => {
    wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemType: 'School',
        itemName: 'Stanford University',
        isLoading: false,
      },
      attachTo: document.body,
    })
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('has no violations in loading state', async () => {
    wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemType: 'Coach',
        itemName: 'Jane Smith',
        isLoading: true,
      },
      attachTo: document.body,
    })
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations()
  })
})
```

**Step 2: Run and verify**

```bash
npm test -- tests/unit/a11y/DeleteConfirmationModal.a11y.spec.ts
```

Expected: 2 passing. If a violation is reported, read the violation's `id` and `description` fields — do not suppress it without understanding it first.

**Step 3: Commit**

```bash
git add tests/unit/a11y/DeleteConfirmationModal.a11y.spec.ts
git commit -m "test(a11y): add axe tests for DeleteConfirmationModal"
```

---

### Task 6: Fix SchoolLogo fallback div + add axe test

**Files:**
- Modify: `components/School/SchoolLogo.vue` (line ~15-25)
- Create: `tests/unit/a11y/SchoolLogo.a11y.spec.ts`

The fallback `<div>` renders a letter or emoji. Screen readers need `role="img"` and `aria-label` to describe it meaningfully.

**Step 1: Read the component**

Read `components/School/SchoolLogo.vue` to confirm the fallback div location (around line 15).

**Step 2: Add role and aria-label to the fallback div**

Find this block:
```html
<div
  v-else
  class="logo-fallback"
  :style="{...}"
>
  {{ icon }}
</div>
```

Change to:
```html
<div
  v-else
  role="img"
  :aria-label="`${school.name} logo`"
  class="logo-fallback"
  :style="{...}"
>
  {{ icon }}
</div>
```

**Step 3: Run existing SchoolLogo tests to verify no regression**

```bash
npm test -- tests/unit/components/School/SchoolLogo.spec.ts
```

Expected: all passing

**Step 4: Create the a11y test**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import { vi } from 'vitest'
import SchoolLogo from '~/components/School/SchoolLogo.vue'
import type { School } from '~/types/models'

vi.mock('~/composables/useSchoolLogos', () => ({
  useSchoolLogos: () => ({
    fetchSchoolLogo: vi.fn().mockResolvedValue(null),
    getSchoolLogoCached: vi.fn().mockReturnValue(null),
    isLoading: { value: false },
  }),
}))

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const mockSchool: School = {
  id: '1',
  name: 'Stanford University',
} as School

describe('SchoolLogo accessibility', () => {
  it('has no violations in fallback state (no logo)', async () => {
    const wrapper = mount(SchoolLogo, {
      props: { school: mockSchool, fetchOnMount: false },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

**Step 5: Run and verify**

```bash
npm test -- tests/unit/a11y/SchoolLogo.a11y.spec.ts
```

Expected: 1 passing

**Step 6: Commit both changes together**

```bash
git add components/School/SchoolLogo.vue tests/unit/a11y/SchoolLogo.a11y.spec.ts
git commit -m "fix(a11y): add role=img and aria-label to SchoolLogo fallback div"
```

---

### Task 7: LoginForm axe test

**Files:**
- Create: `tests/unit/a11y/LoginForm.a11y.spec.ts`
- Reference: `components/Auth/LoginForm.vue`

`LoginForm` uses `LoginInputField` as its child input component. Read `components/Auth/LoginInputField.vue` before writing the test — if it renders a proper `<label>` + `<input>` pair, do NOT stub it (let it render for real so axe sees the actual label/input bindings). If it has complex sub-dependencies that cause mount errors, stub it with a realistic label+input stub.

**Step 1: Read LoginInputField**

```
Read: components/Auth/LoginInputField.vue
```

Confirm whether it has additional composable dependencies that would break mounting.

**Step 2: Create the test file**

If `LoginInputField` mounts cleanly (no composable calls), use this (no stub):

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import { vi } from 'vitest'
import LoginForm from '~/components/Auth/LoginForm.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

describe('LoginForm accessibility', () => {
  it('has no violations in default state', async () => {
    const wrapper = mount(LoginForm, {
      props: {
        email: '',
        password: '',
        rememberMe: false,
        disabled: false,
        fieldErrors: {},
        hasErrors: false,
      },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing field errors', async () => {
    const wrapper = mount(LoginForm, {
      props: {
        email: '',
        password: '',
        rememberMe: false,
        disabled: false,
        fieldErrors: { email: 'Invalid email', password: 'Password is required' },
        hasErrors: true,
      },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

If `LoginInputField` has composable dependencies that cause errors, add a realistic stub:

```typescript
// Add to global stubs:
global: {
  stubs: {
    LoginInputField: {
      template: `<div><label :for="id">{{ label }}</label><input :id="id" :type="type" :aria-invalid="!!error" /></div>`,
      props: ['id', 'label', 'type', 'error', 'modelValue', 'disabled', 'icon', 'autocomplete'],
    },
    // Keep existing global stubs from setup.ts
  },
}
```

**Step 3: Run and verify**

```bash
npm test -- tests/unit/a11y/LoginForm.a11y.spec.ts
```

Expected: 2 passing

**Step 4: Commit**

```bash
git add tests/unit/a11y/LoginForm.a11y.spec.ts
git commit -m "test(a11y): add axe tests for LoginForm"
```

---

### Task 8: SignupForm axe test

**Files:**
- Create: `tests/unit/a11y/SignupForm.a11y.spec.ts`
- Reference: `components/Auth/SignupForm.vue`

Same pattern as LoginForm. Read `components/Auth/SignupForm.vue` to get the full props interface before writing the test.

**Step 1: Read SignupForm to get the full props list**

```
Read: components/Auth/SignupForm.vue
```

**Step 2: Create the test file**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import SignupForm from '~/components/Auth/SignupForm.vue'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

// Populate ALL required props from your SignupForm component.
// Read the component's defineProps to get the full list.
const baseProps = {
  // Fill in from reading SignupForm.vue
}

describe('SignupForm accessibility', () => {
  it('has no violations for player signup', async () => {
    const wrapper = mount(SignupForm, {
      props: { ...baseProps, userType: 'player' },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations for parent signup', async () => {
    const wrapper = mount(SignupForm, {
      props: { ...baseProps, userType: 'parent' },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })

  it('has no violations when showing field errors', async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        fieldErrors: { firstName: 'Required', email: 'Invalid email' },
        hasErrors: true,
      },
      attachTo: document.body,
    })
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations()
    wrapper.unmount()
  })
})
```

**Step 3: Run and verify**

```bash
npm test -- tests/unit/a11y/SignupForm.a11y.spec.ts
```

Expected: 3 passing

**Step 4: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all existing tests still passing, 7 new a11y tests added

**Step 5: Commit**

```bash
git add tests/unit/a11y/SignupForm.a11y.spec.ts
git commit -m "test(a11y): add axe tests for SignupForm"
```

---

### Task 9: Update pa11y config to WCAG 2.2

**Files:**
- Modify: `tests/a11y/.pa11yci.json`

**Step 1: Update the config**

Replace the entire file content with:

```json
{
  "runners": ["axe"],
  "standard": "WCAG22AA",
  "timeout": 10000,
  "wait": 2000,
  "chromeLaunchConfig": {
    "args": ["--no-sandbox", "--disable-setuid-sandbox"]
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/signup",
    "http://localhost:3000/forgot-password",
    "http://localhost:3000/join",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/settings"
  ],
  "rules": ["wcag22aa"],
  "reporters": ["json", "cli"],
  "level": "error",
  "ignore": [],
  "threshold": 0,
  "_note": "Auth-gated pages (schools, coaches, interactions) redirect to /login in CI — not scanned here. Use Playwright E2E for authenticated a11y checks."
}
```

Changes made:
- `"standard"`: `"WCAG2AA"` → `"WCAG22AA"` (enables 2.4.11 focus appearance, 2.5.8 target size)
- `"rules"`: `["wcag2aa"]` → `["wcag22aa"]`
- Added 3 public URLs: `/`, `/forgot-password`, `/join`
- Added `_note` explaining why auth-gated pages are excluded

**Step 2: Verify pa11y can parse the config (optional, run locally only)**

```bash
npx pa11y-ci --config tests/a11y/.pa11yci.json --dry-run
```

Expected: lists 7 URLs without errors. Skip if pa11y-ci is not in package.json scripts.

**Step 3: Commit**

```bash
git add tests/a11y/.pa11yci.json
git commit -m "chore(a11y): upgrade pa11y to WCAG 2.2 and expand URL coverage"
```

---

### Task 10: Write keyboard testing documentation

**Files:**
- Create: `docs/accessibility-testing.md`

**Step 1: Create the file**

```markdown
# Accessibility Testing Guide

Automated tools catch ~30-40% of real accessibility issues. Manual testing is required for complete coverage.

## Running Automated Tests

### Axe unit tests (component level)
```bash
# Run all a11y unit tests
npm test -- tests/unit/a11y

# Run tests for a specific component
npm test -- tests/unit/a11y/FormInput.a11y.spec.ts
```

### pa11y full-site scan (page level)
Requires the dev server running on port 3000.

```bash
npm run dev &
npx pa11y-ci --config tests/a11y/.pa11yci.json
```

---

## Keyboard-Only Testing Checklist (20 min)

Test the full user flow using only Tab, Shift+Tab, Enter, Space, Escape, and arrow keys. Do not touch the mouse.

### Setup
- Open Chrome DevTools → Accessibility panel
- Navigate to the page under test

### Checklist

**Tab order**
- [ ] Tab key moves focus in a logical visual order (top → bottom, left → right)
- [ ] No focus traps outside of modals (focus never gets stuck)
- [ ] Skip-to-content link appears when Tab is pressed on the landing page

**Focus visibility**
- [ ] Every interactive element shows a visible focus ring when focused
- [ ] Focus ring is at least 2px and clearly visible against the background (WCAG 2.4.11)
- [ ] Focus is never invisible or hidden with `outline: none` without a visible alternative

**Interactive elements**
- [ ] All buttons, links, and form controls are reachable by Tab
- [ ] Buttons activate with Enter and Space
- [ ] Links activate with Enter
- [ ] Select dropdowns open with Space/Enter and navigate with arrow keys

**Modals and dialogs**
- [ ] When a modal opens, focus moves into the modal automatically
- [ ] Tab cycles only within the modal (focus is trapped)
- [ ] Escape closes the modal and returns focus to the trigger element

**Forms**
- [ ] Every input has a visible label (confirmed by tabbing to it and reading the label)
- [ ] Error messages are announced when they appear (check with screen reader)
- [ ] Required fields are indicated in a way that doesn't rely on color alone

---

## Screen Reader Testing Matrix

Test with at least two pairings:

| Screen Reader | Browser | Platform | Priority |
|---------------|---------|----------|----------|
| VoiceOver | Safari | macOS / iOS | High |
| NVDA (free) | Firefox | Windows | High |
| TalkBack | Chrome | Android | Medium |

### Key things to verify with a screen reader
- [ ] Page title is descriptive and unique
- [ ] Headings create a logical outline (H1 → H2 → H3, no skipped levels)
- [ ] Images have meaningful alt text (or `alt=""` for decorative images)
- [ ] Form labels are read aloud when focusing an input
- [ ] Error messages are announced when they appear
- [ ] Dynamic content changes (toasts, status updates) are announced via `aria-live`
- [ ] Modal open/close is announced
- [ ] Custom icon buttons have an accessible label (not just an icon)

### VoiceOver quick start (macOS)
- Enable: Cmd + F5
- Read next item: VO + Right arrow (VO = Ctrl + Option)
- Interact with a form: VO + Shift + Down
- Open rotor (headings/landmarks): VO + U

---

## Adding axe Tests for New Components

When building a new form component or modal:

1. Create `tests/unit/a11y/YourComponent.a11y.spec.ts`
2. Mount the component with `attachTo: document.body`
3. Always disable `color-contrast` (happy-dom limitation): `{ rules: { 'color-contrast': { enabled: false } } }`
4. Test all key states: default, required, error, disabled
5. For modals using `<Teleport>`: axe-check `document.body`, not `wrapper.element`
6. Call `wrapper.unmount()` after each test

```typescript
import { axe } from 'vitest-axe'

it('has no violations', async () => {
  const wrapper = mount(MyComponent, { props: { ... }, attachTo: document.body })
  expect(await axe(wrapper.element, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  wrapper.unmount()
})
```
```

**Step 2: Commit**

```bash
git add docs/accessibility-testing.md
git commit -m "docs: add accessibility testing guide with keyboard and screen reader checklists"
```

---

### Task 11: Final verification

**Step 1: Run the full test suite**

```bash
npm test
```

Expected: all existing tests pass, new a11y tests pass

**Step 2: Type check**

```bash
npm run type-check
```

Expected: no errors

**Step 3: Lint**

```bash
npm run lint:fix
```

Expected: no errors

**Step 4: Push**

```bash
git push
```
