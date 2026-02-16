# Header Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize all page headers using a shared `PageHeader` component with gradient background, `text-3xl font-bold` h1, description subtitle, and optional right-side actions slot.

**Architecture:** Create `components/PageHeader.vue` with `title`/`description` props and `#actions` slot. Replace all existing header markup across 12 pages. Remove count-based subtitles in favor of static descriptions.

**Tech Stack:** Vue 3 (Composition API), TailwindCSS

---

### Task 1: Create PageHeader Component

**Files:**
- Create: `components/PageHeader.vue`
- Create: `tests/components/PageHeader.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PageHeader from '~/components/PageHeader.vue'

describe('PageHeader', () => {
  it('renders title as h1', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Test Title' },
    })
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toBe('Test Title')
    expect(h1.classes()).toContain('text-3xl')
    expect(h1.classes()).toContain('font-bold')
  })

  it('renders description when provided', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Title', description: 'Some description' },
    })
    const p = wrapper.find('p')
    expect(p.exists()).toBe(true)
    expect(p.text()).toBe('Some description')
  })

  it('does not render description paragraph when not provided', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Title' },
    })
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders actions slot content', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Title' },
      slots: { actions: '<button>Click me</button>' },
    })
    expect(wrapper.find('button').text()).toBe('Click me')
  })

  it('hides actions container when slot is empty', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Title' },
    })
    // The flex actions div should not render
    const actionsDivs = wrapper.findAll('.flex.items-center.gap-3')
    expect(actionsDivs.length).toBe(0)
  })

  it('uses semantic header element with banner role', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Title' },
    })
    const header = wrapper.find('header')
    expect(header.exists()).toBe(true)
    expect(header.attributes('role')).toBe('banner')
  })

  it('has gradient background and border', async () => {
    const wrapper = await mountSuspended(PageHeader, {
      props: { title: 'Title' },
    })
    const header = wrapper.find('header')
    expect(header.classes()).toContain('border-b')
    expect(header.classes()).toContain('border-slate-200')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components/PageHeader.spec.ts`
Expected: FAIL — component does not exist

**Step 3: Write the component**

```vue
<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header
    class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200"
    role="banner"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
          <p v-if="description" class="text-slate-600 mt-1">
            {{ description }}
          </p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/components/PageHeader.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/PageHeader.vue tests/components/PageHeader.spec.ts
git commit -m "feat: add PageHeader component for standardized page headers"
```

---

### Task 2: Update Dashboard page

**Files:**
- Modify: `pages/dashboard.vue`

**Step 1: Replace header markup**

Replace the existing `<header>` block (lines 14-24) with:

```vue
<PageHeader
  title="Dashboard"
  :description="user ? `Welcome back, ${userFirstName}! 👋` : undefined"
/>
```

Keep the skip link above it. Remove the old `<header role="banner">...</header>` block.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Run: `npm run type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/dashboard.vue
git commit -m "refactor: use PageHeader component on Dashboard page"
```

---

### Task 3: Update Timeline page

**Files:**
- Modify: `pages/timeline/index.vue`

**Step 1: Replace header markup**

Replace lines 8-50 (the `<div class="bg-gradient-to-r ...">` header block) with:

```vue
<PageHeader title="Recruiting Timeline" description="Track your 4-year recruiting journey">
  <template #actions>
    <!-- Current Phase Badge -->
    <div
      v-if="!phaseLoading"
      class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
    >
      <div class="text-sm text-slate-600 mb-1">Current Phase</div>
      <div class="text-lg font-bold text-slate-900">
        {{ getPhaseDisplayName(currentPhase) }}
      </div>
    </div>

    <!-- Status Indicator -->
    <div
      v-if="!statusLoading"
      class="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
    >
      <div class="text-sm text-slate-600 mb-1">Status</div>
      <div class="flex items-center gap-2">
        <div
          class="w-3 h-3 rounded-full"
          :class="getStatusColorClass(statusLabel)"
        />
        <div class="text-lg font-bold text-slate-900">
          {{ statusScore }}/100
        </div>
      </div>
    </div>
  </template>
</PageHeader>
```

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/timeline/index.vue
git commit -m "refactor: use PageHeader component on Timeline page"
```

---

### Task 4: Update Coaches page

**Files:**
- Modify: `pages/coaches/index.vue`

**Step 1: Replace header markup**

Replace the `<div class="bg-white border-b border-slate-200">` header block (from `<!-- Page Header -->` through its closing `</div></div></div>`) with:

```vue
<PageHeader title="Coaches" description="Track and manage your coach contacts">
  <template #actions>
    <NuxtLink
      to="/coaches/new"
      class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 shadow-sm"
    >
      <PlusIcon class="w-4 h-4" />
      Add Coach
    </NuxtLink>
    <button
      v-if="filteredCoaches.length > 0"
      @click="handleExportCSV"
      :disabled="exportLoading"
      :aria-busy="exportLoading"
      aria-label="Export coaches to CSV"
      class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
    >
      <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
      {{ exportLoading ? "Exporting..." : "CSV" }}
    </button>
    <button
      v-if="filteredCoaches.length > 0"
      @click="handleExportPDF"
      :disabled="exportLoading"
      :aria-busy="exportLoading"
      aria-label="Export coaches to PDF"
      class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
    >
      <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
      {{ exportLoading ? "Exporting..." : "PDF" }}
    </button>

    <!-- Export Status Announcement -->
    <div
      v-if="exportMessage"
      role="status"
      aria-live="polite"
      class="text-sm mt-2 text-green-700"
    >
      {{ exportMessage }}
    </div>
  </template>
</PageHeader>
```

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/coaches/index.vue
git commit -m "refactor: use PageHeader component on Coaches page"
```

---

### Task 5: Update Schools page

**Files:**
- Modify: `pages/schools/index.vue`

**Step 1: Replace header markup**

Replace the `<div class="bg-white border-b border-slate-200">` header block with:

```vue
<PageHeader title="Schools" description="Track and evaluate your target schools">
  <template #actions>
    <button
      v-if="filteredSchools.length > 0"
      @click="handleExportCSV"
      class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
    >
      <ArrowDownTrayIcon class="w-4 h-4" />
      CSV
    </button>
    <button
      v-if="filteredSchools.length > 0"
      @click="handleExportPDF"
      class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
    >
      <ArrowDownTrayIcon class="w-4 h-4" />
      PDF
    </button>
    <NuxtLink
      to="/schools/new"
      class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
    >
      <PlusIcon class="w-4 h-4" />
      Add School
    </NuxtLink>
  </template>
</PageHeader>
```

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/schools/index.vue
git commit -m "refactor: use PageHeader component on Schools page"
```

---

### Task 6: Update Interactions page

**Files:**
- Modify: `pages/interactions/index.vue`

**Step 1: Replace header markup**

Replace the `<div class="bg-white border-b border-slate-200">` header block with:

```vue
<PageHeader
  :title="userStore.isAthlete ? 'My Interactions' : 'Interactions'"
  description="Log and review your recruiting communications"
>
  <template #actions>
    <button
      v-if="filteredInteractions.length > 0"
      @click="handleExportCSV"
      class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
    >
      <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
      CSV
    </button>
    <button
      v-if="filteredInteractions.length > 0"
      @click="handleExportPDF"
      class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
    >
      <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
      PDF
    </button>
    <NuxtLink
      to="/interactions/add"
      data-testid="log-interaction-button"
      class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
    >
      <PlusIcon class="w-4 h-4" aria-hidden="true" />
      Log Interaction
    </NuxtLink>
  </template>
</PageHeader>
```

Note: Remove the athlete visibility notice (`"Your recruiting interactions are visible to your linked parent(s)"`) from the header — it can be moved to a banner in the main content if needed, or dropped.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/interactions/index.vue
git commit -m "refactor: use PageHeader component on Interactions page"
```

---

### Task 7: Update Events page

**Files:**
- Modify: `pages/events/index.vue`

**Step 1: Replace header markup**

The Events page header is currently broken (description inside `justify-between` flex, button below header). Replace the entire header `<div class="bg-white border-b ...">...</div>` block with:

```vue
<PageHeader title="Events" description="Track camps, showcases, visits, and games">
  <template #actions>
    <NuxtLink
      to="/events/create"
      data-testid="add-event-button"
      class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 shadow-sm"
    >
      <PlusIcon class="w-4 h-4" />
      Add Event
    </NuxtLink>
  </template>
</PageHeader>
```

Also update the `<main>` container from `max-w-6xl` to `max-w-7xl` for consistency.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/events/index.vue
git commit -m "refactor: use PageHeader component on Events page (fix broken layout)"
```

---

### Task 8: Update Offers page

**Files:**
- Modify: `pages/offers/index.vue`

**Step 1: Replace header markup**

Replace the `<div class="bg-white border-b border-slate-200">` header block with:

```vue
<PageHeader title="Offers" description="Track and compare your scholarship offers">
  <template #actions>
    <button
      v-if="selectedOffers.length >= 2"
      data-testid="compare-offers-button"
      @click="showComparison = true"
      class="px-3 py-2 text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
    >
      <ScaleIcon class="w-4 h-4" />
      Compare ({{ selectedOffers.length }})
    </button>
    <button
      data-testid="log-offer-button"
      @click="showAddForm = !showAddForm"
      class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
    >
      <PlusIcon class="w-4 h-4" />
      {{ showAddForm ? "Cancel" : "Log Offer" }}
    </button>
  </template>
</PageHeader>
```

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/offers/index.vue
git commit -m "refactor: use PageHeader component on Offers page"
```

---

### Task 9: Update Documents page

**Files:**
- Modify: `pages/documents/index.vue`

**Step 1: Replace header and update page background**

The Documents page has a fundamentally different layout (`bg-gray-50`, no dedicated header section). Changes needed:

1. Change root div from `bg-gray-50` to `bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100`
2. Add `<PageHeader>` before the content container
3. Remove the old inline header (`<div class="mb-8">...</div>` with h1/description)
4. Keep the statistics row in the main content

Replace the page structure so it starts with:

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <PageHeader title="Documents" description="Manage videos, transcripts, and other recruiting documents" />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Statistics Row (keep existing) -->
      ...
```

Remove the old `<div class="mb-8">` header block. Change `max-w-6xl` to `max-w-7xl`. Update any remaining `text-gray-*` to `text-slate-*` in the statistics row.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/documents/index.vue
git commit -m "refactor: use PageHeader component on Documents page"
```

---

### Task 10: Update Recommendations page

**Files:**
- Modify: `pages/recommendations/index.vue`

**Step 1: Replace header and update page background**

Same structural change as Documents:

1. Change root div from `bg-gray-50` to `bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100`
2. Add `<PageHeader>` before the content
3. Remove old inline header

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <PageHeader title="Recommendation Letters" description="Track recommendation letter requests and submissions" />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Filters Section (keep existing, update to max-w-7xl) -->
      ...
```

Remove the old `<div class="mb-8">` header. Update `gray-*` colors to `slate-*` where they appear in surrounding layout elements.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/recommendations/index.vue
git commit -m "refactor: use PageHeader component on Recommendations page"
```

---

### Task 11: Update Search page

**Files:**
- Modify: `pages/search/index.vue`

**Step 1: Replace header and update page background**

1. Change root div from `bg-gray-50` to `bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100`
2. Add `<PageHeader>` before the content
3. Remove old inline header

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <PageHeader title="Advanced Search" description="Search across schools, coaches, interactions, and performance metrics" />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Save Search Dialog (keep existing) -->
      ...
```

Remove the old `<div class="mb-8">` header. Update `max-w-6xl` to `max-w-7xl`.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/search/index.vue
git commit -m "refactor: use PageHeader component on Search page"
```

---

### Task 12: Update Analytics page

**Files:**
- Modify: `pages/analytics/index.vue`

**Step 1: Replace header and update page background**

1. Change root div from `bg-gray-50` to `bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100`
2. Replace the `<div class="bg-white border-b border-gray-200">` header block with `<PageHeader>`

```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <PageHeader title="Analytics" description="Comprehensive recruiting metrics and performance insights" />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Date Range Controls (keep existing) -->
      ...
```

Remove old header block. Update `lg:px-8` to just `sm:px-6` in the main container for consistency.

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/analytics/index.vue
git commit -m "refactor: use PageHeader component on Analytics page"
```

---

### Task 13: Update Settings page

**Files:**
- Modify: `pages/settings/index.vue`

**Step 1: Replace header markup**

Replace the `<div class="bg-white border-b border-slate-200">` header block with:

```vue
<PageHeader title="Settings" description="Manage your profile, preferences, and account settings" />
```

No `#actions` slot needed. Also update `max-w-4xl` to `max-w-7xl` in the main content area for consistency (or keep `max-w-4xl` if the settings layout looks better narrow — implementer should check visually).

**Step 2: Run tests and type-check**

Run: `npm run test -- --reporter=verbose 2>&1 | tail -20`
Expected: PASS

**Step 3: Commit**

```bash
git add pages/settings/index.vue
git commit -m "refactor: use PageHeader component on Settings page"
```

---

### Task 14: Run full test suite and final commit

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run type-check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Run lint**

Run: `npm run lint:fix`
Expected: Clean or auto-fixed

**Step 4: Final commit if any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes for header standardization"
```
