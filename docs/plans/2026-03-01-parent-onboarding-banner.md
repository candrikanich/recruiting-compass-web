# Parent Onboarding Banner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a persistent amber banner and empty-state card to parents who have no connected athlete, guiding them to `/settings/family-management` to send an invite.

**Architecture:** Two new pure-display components (`ParentOnboardingBanner`, `ParentNoAthleteEmptyState`) added to `dashboard.vue`, gated on `userStore.isParent && parentAccessibleFamilies.length === 0`. Both disappear reactively when an athlete connects — no dismiss button, no localStorage.

**Tech Stack:** Vue 3 `<script setup>`, TailwindCSS, Heroicons, Vitest + `@vue/test-utils`

---

### Task 1: `ParentOnboardingBanner.vue`

**Files:**
- Create: `components/Dashboard/ParentOnboardingBanner.vue`
- Create: `tests/components/Dashboard/ParentOnboardingBanner.test.ts`

**Step 1: Create the test file**

```typescript
// tests/components/Dashboard/ParentOnboardingBanner.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import ParentOnboardingBanner from '~/components/Dashboard/ParentOnboardingBanner.vue'

describe('ParentOnboardingBanner', () => {
  it('renders the banner with correct message', () => {
    const wrapper = mount(ParentOnboardingBanner, {
      global: { stubs: { NuxtLink: RouterLink } },
    })
    expect(wrapper.text()).toContain("Connect your athlete to get started")
  })

  it('has a link to family management', () => {
    const wrapper = mount(ParentOnboardingBanner, {
      global: { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } },
    })
    expect(wrapper.html()).toContain('/settings/family-management')
  })
})
```

**Step 2: Run test to confirm it fails**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
npm run test -- tests/components/Dashboard/ParentOnboardingBanner.test.ts
```

Expected: FAIL — component file does not exist yet.

**Step 3: Create the component**

```vue
<!-- components/Dashboard/ParentOnboardingBanner.vue -->
<template>
  <div
    role="alert"
    class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6"
  >
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <UserPlusIcon class="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
        <p class="text-sm text-amber-800">
          <strong>Connect your athlete to get started</strong> —
          invite them to join your family or share your family code.
        </p>
      </div>
      <NuxtLink
        to="/settings/family-management"
        class="shrink-0 px-4 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
      >
        Invite Athlete →
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserPlusIcon } from '@heroicons/vue/24/solid'
</script>
```

**Step 4: Run test to confirm it passes**

```bash
npm run test -- tests/components/Dashboard/ParentOnboardingBanner.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add components/Dashboard/ParentOnboardingBanner.vue tests/components/Dashboard/ParentOnboardingBanner.test.ts
git commit -m "feat(dashboard): add ParentOnboardingBanner component"
```

---

### Task 2: `ParentNoAthleteEmptyState.vue`

**Files:**
- Create: `components/Dashboard/ParentNoAthleteEmptyState.vue`
- Create: `tests/components/Dashboard/ParentNoAthleteEmptyState.test.ts`

**Step 1: Create the test file**

```typescript
// tests/components/Dashboard/ParentNoAthleteEmptyState.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParentNoAthleteEmptyState from '~/components/Dashboard/ParentNoAthleteEmptyState.vue'

describe('ParentNoAthleteEmptyState', () => {
  it('renders the heading', () => {
    const wrapper = mount(ParentNoAthleteEmptyState, {
      global: { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } },
    })
    expect(wrapper.text()).toContain("Your athlete isn't connected yet")
  })

  it('renders the explanation', () => {
    const wrapper = mount(ParentNoAthleteEmptyState, {
      global: { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } },
    })
    expect(wrapper.text()).toContain("Once they accept your invite")
  })

  it('has an Invite Athlete link to family management', () => {
    const wrapper = mount(ParentNoAthleteEmptyState, {
      global: { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } },
    })
    expect(wrapper.html()).toContain('/settings/family-management')
    expect(wrapper.text()).toContain('Invite Athlete')
  })
})
```

**Step 2: Run test to confirm it fails**

```bash
npm run test -- tests/components/Dashboard/ParentNoAthleteEmptyState.test.ts
```

Expected: FAIL — component file does not exist yet.

**Step 3: Create the component**

```vue
<!-- components/Dashboard/ParentNoAthleteEmptyState.vue -->
<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-xs mb-6">
    <div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
      <UsersIcon class="w-8 h-8 text-amber-500" aria-hidden="true" />
    </div>
    <h2 class="text-xl font-semibold text-gray-900 mb-2">
      Your athlete isn't connected yet
    </h2>
    <p class="text-gray-500 max-w-sm mb-6">
      Once they accept your invite, you'll see their recruiting activity,
      school list, and progress here.
    </p>
    <NuxtLink
      to="/settings/family-management"
      class="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
    >
      Invite Athlete
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon } from '@heroicons/vue/24/solid'
</script>
```

**Step 4: Run test to confirm it passes**

```bash
npm run test -- tests/components/Dashboard/ParentNoAthleteEmptyState.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add components/Dashboard/ParentNoAthleteEmptyState.vue tests/components/Dashboard/ParentNoAthleteEmptyState.test.ts
git commit -m "feat(dashboard): add ParentNoAthleteEmptyState component"
```

---

### Task 3: Wire components into `dashboard.vue`

**Files:**
- Modify: `pages/dashboard.vue`

The condition is `userStore.isParent && !parentAccessibleFamilies.length`. `parentAccessibleFamilies` is already on the injected `activeFamily` object — just destructure it alongside `isViewingAsParent`.

**Step 1: Destructure `parentAccessibleFamilies` from `activeFamily`**

In `dashboard.vue`, find the existing destructure:

```typescript
// existing line ~263
const { isViewingAsParent } = activeFamily;
```

Change to:

```typescript
const { isViewingAsParent, parentAccessibleFamilies } = activeFamily;
```

**Step 2: Add the `showParentOnboarding` computed**

Add after the destructure above:

```typescript
const showParentOnboarding = computed(
  () => userStore.isParent && parentAccessibleFamilies.value.length === 0,
)
```

**Step 3: Add component imports**

Find the existing import block in `dashboard.vue` and add:

```typescript
import ParentOnboardingBanner from '~/components/Dashboard/ParentOnboardingBanner.vue'
import ParentNoAthleteEmptyState from '~/components/Dashboard/ParentNoAthleteEmptyState.vue'
```

**Step 4: Add components to the template**

In the template, find the existing `<ParentContextBanner>` block:

```html
<!-- Parent Context Banner -->
<ParentContextBanner
  :is-viewing-as-parent="isViewingAsParent"
  :athlete-name="activeAthleteName"
/>
```

Add immediately after it:

```html
<!-- Parent onboarding: shown until an athlete connects -->
<ParentOnboardingBanner v-if="showParentOnboarding" />
<ParentNoAthleteEmptyState v-if="showParentOnboarding" />
```

**Step 5: Verify type-check and lint pass**

```bash
npm run type-check && npm run lint
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add pages/dashboard.vue
git commit -m "feat(dashboard): show onboarding banner and empty state for parents without athletes"
```

---

### Task 4: Manual smoke test

1. Log in as a parent account that has **no** connected athlete
2. Confirm the amber banner appears at the top with the "Invite Athlete →" link
3. Confirm the empty state card appears below it
4. Click "Invite Athlete →" — confirm navigation to `/settings/family-management`
5. Send an invite and have the athlete accept it
6. Return to dashboard — confirm both banner and empty state are gone

---

### Unresolved Questions

None — scope is fully defined.
