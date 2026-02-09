# Interactions Page A11y - Code Examples & Implementation Guide

**Reference:** `/planning/interactions-page-a11y-audit.md`
**Quick Summary:** `/planning/interactions-a11y-quick-summary.md`

---

## CRITICAL FIX #1: Focus Visible Indicators

### Problem

All interactive elements lack visible focus rings when using keyboard navigation. Users cannot tell what has focus.

### Location

- `pages/interactions/index.vue` (buttons, links)
- `components/Interaction/InteractionFilters.vue` (form inputs)
- `components/Interaction/InteractionCard.vue` (View button)
- `components/Interaction/ActiveFilterChips.vue` (remove buttons)
- `components/Interaction/AnalyticsCards.vue` (implicit - no direct interactive elements)

### Current Code (WRONG)

```vue
<!-- All inputs currently have: -->
<input class="... focus:outline-none focus:ring-2 focus:ring-blue-500 ..." />

<!-- All buttons currently have no focus styling -->
<button class="px-3 py-2 ...">CSV</button>
```

### Fixed Code (RIGHT)

```vue
<!-- Form inputs: Add visible outline -->
<input
  id="interaction-search"
  type="text"
  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
/>

<!-- Buttons: Add visible outline -->
<button
  @click="handleExportCSV"
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  CSV
</button>

<!-- Links: Add visible outline -->
<NuxtLink
  to="/interactions/add"
  class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  <PlusIcon class="w-4 h-4" aria-hidden="true" />
  Log Interaction
</NuxtLink>
```

### What Changed

| Before                             | After                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `focus:outline-none`               | REMOVED (removes browser outline)                                          |
| `focus:ring-2 focus:ring-blue-500` | Changed to `focus:outline-2 focus:outline-blue-600 focus:outline-offset-1` |
| No focus styling on buttons        | Added consistent focus outline                                             |

### Why This Works

- `outline-2` creates 2px border (visible)
- `outline-blue-600` is darker than `-500` (meets 3:1 contrast minimum)
- `outline-offset-1` adds 1px space between element and outline (easier to see)
- Outlines don't take up layout space (unlike borders)

### Testing

```
1. Load page in browser
2. Press Tab repeatedly
3. Verify: Blue outline visible around EVERY focused element
4. No outline should disappear on hover
```

---

## CRITICAL FIX #2: Label Associations

### Problem

Form labels aren't connected to inputs. Screen readers can't identify what each input controls.

### Location

`components/Interaction/InteractionFilters.vue` (lines 8-150)

### Current Code (WRONG)

```vue
<!-- These have no id/for association -->
<div>
  <label class="block text-sm font-medium text-slate-700 mb-1">Search</label>
  <div class="relative">
    <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      :value="filterValues.get('search') || ''"
      @input="emits('update:filter', { field: 'search', value: ($event.target as HTMLInputElement).value })"
      placeholder="Subject, content..."
      class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
    />
  </div>
</div>
```

**Screen reader hears:** "Search" (label), then unlabeled input

### Fixed Code (RIGHT)

```vue
<!-- All 6 filters with id/for association -->
<fieldset>
  <legend class="sr-only">Filter interactions</legend>

  <div :class="{ 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4': !isParent, 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4': isParent }">
    <!-- Filter 1: Search -->
    <div>
      <label for="interaction-search" class="block text-sm font-medium text-slate-700 mb-1">
        Search
      </label>
      <div class="relative">
        <MagnifyingGlassIcon
          class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="interaction-search"
          type="text"
          :value="filterValues.get('search') || ''"
          @input="emits('update:filter', { field: 'search', value: ($event.target as HTMLInputElement).value })"
          placeholder="Subject, content..."
          class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
        />
      </div>
    </div>

    <!-- Filter 2: Type -->
    <div>
      <label for="interaction-type" class="block text-sm font-medium text-slate-700 mb-1">
        Type
      </label>
      <select
        id="interaction-type"
        :value="filterValues.get('type') || ''"
        @change="emits('update:filter', { field: 'type', value: ($event.target as HTMLSelectElement).value || null })"
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
      >
        <option value="">-- All --</option>
        <option value="email">Email</option>
        <option value="text">Text</option>
        <!-- ... other options ... -->
      </select>
    </div>

    <!-- Filter 3: Logged By (Parents only) -->
    <div v-if="isParent">
      <label for="interaction-logged-by" class="block text-sm font-medium text-slate-700 mb-1">
        Logged By
      </label>
      <select
        id="interaction-logged-by"
        :value="filterValues.get('loggedBy') || ''"
        @change="emits('update:filter', { field: 'loggedBy', value: ($event.target as HTMLSelectElement).value || null })"
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
      >
        <option value="">-- All --</option>
        <option v-if="currentUserId" :value="currentUserId">Me (Parent)</option>
        <option v-for="athlete in linkedAthletes" :key="athlete.id" :value="athlete.id">
          {{ athlete.full_name }}
        </option>
      </select>
    </div>

    <!-- Filter 4: Direction -->
    <div>
      <label for="interaction-direction" class="block text-sm font-medium text-slate-700 mb-1">
        Direction
      </label>
      <select
        id="interaction-direction"
        :value="filterValues.get('direction') || ''"
        @change="emits('update:filter', { field: 'direction', value: ($event.target as HTMLSelectElement).value || null })"
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
      >
        <option value="">-- All --</option>
        <option value="outbound">Outbound</option>
        <option value="inbound">Inbound</option>
      </select>
    </div>

    <!-- Filter 5: Sentiment -->
    <div>
      <label for="interaction-sentiment" class="block text-sm font-medium text-slate-700 mb-1">
        Sentiment
      </label>
      <select
        id="interaction-sentiment"
        :value="filterValues.get('sentiment') || ''"
        @change="emits('update:filter', { field: 'sentiment', value: ($event.target as HTMLSelectElement).value || null })"
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
      >
        <option value="">-- All --</option>
        <option value="very_positive">Very Positive</option>
        <option value="positive">Positive</option>
        <option value="neutral">Neutral</option>
        <option value="negative">Negative</option>
      </select>
    </div>

    <!-- Filter 6: Time Period -->
    <div>
      <label for="interaction-time-period" class="block text-sm font-medium text-slate-700 mb-1">
        Time Period
      </label>
      <select
        id="interaction-time-period"
        :value="filterValues.get('timePeriod') || ''"
        @change="emits('update:filter', { field: 'timePeriod', value: ($event.target as HTMLSelectElement).value || null })"
        class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
      >
        <option value="">-- All Time --</option>
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </div>
  </div>
</fieldset>
```

**Screen reader now hears:** "Group, Filter interactions" + "Search, text input"

### What Changed

| Before              | After                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| No IDs on inputs    | Added unique IDs: `interaction-search`, `interaction-type`, etc.                |
| No `for` attributes | Added `for="interaction-search"`, `for="interaction-type"`, etc.                |
| No `<fieldset>`     | Wrapped all in `<fieldset>` with sr-only `<legend>`                             |
| No focus outlines   | All inputs have `focus:outline-2 focus:outline-blue-600 focus:outline-offset-1` |

### Testing

```
1. Load page
2. Click on "Search" label → focus should move to search input
3. Use NVDA: "Search, text input"
4. Without label click: "Unlabeled input" (broken)
```

---

## CRITICAL FIX #3: Skip Link

### Problem

Keyboard users must tab through header navigation (~10+ tabs) before reaching main content. There's no skip link to bypass this.

### Location

`pages/interactions/index.vue` (top of page + main element)

### Current Code (WRONG)

```vue
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="interactions" />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <!-- Header content: h1, export buttons, log button -->
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Content -->
    </main>
  </div>
</template>
```

**Keyboard flow:** Tab → logo? → nav? → skip? → export CSV → export PDF → log interaction → finally reach filters

### Fixed Code (RIGHT)

```vue
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- SKIP LINK: Appears on Tab, hidden by default -->
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:outline-2 focus:outline-blue-600"
    >
      Skip to main content
    </a>

    <!-- Global Navigation -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="interactions" />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <!-- Header content: h1, export buttons, log button -->
    </div>

    <!-- MAIN CONTENT: Now has id -->
    <main id="main" class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Content -->
    </main>
  </div>
</template>
```

### What Changed

| Before                  | After                                                        |
| ----------------------- | ------------------------------------------------------------ |
| No skip link            | Added skip link after `<div>` opens                          |
| `<main>` has no id      | Added `id="main"`                                            |
| No way to bypass header | Tab 1 → skip link visible, press Enter → focus jumps to main |

### CSS Pattern

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* TailwindCSS already provides this via @apply, just use sr-only class */
```

### Testing

```
1. Load page
2. Press Tab immediately
3. White box should appear: "Skip to main content"
4. Press Enter
5. Focus jumps to <main>
6. Next Tab → first filter input
```

---

## CRITICAL FIX #4: Filter Changes Announcement

### Problem

When user changes a filter, the interaction list updates but screen reader users don't hear about it.

### Location

`pages/interactions/index.vue` (after filters section)

### Current Code (WRONG)

```vue
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
  <InteractionFilters ... />
  <ActiveFilterChips ... />
</div>

<!-- No live region -->

<!-- Results just update silently -->
<div v-else class="space-y-4">
  <InteractionCard v-for="interaction in filteredInteractions" ... />
</div>
```

### Fixed Code (RIGHT)

```vue
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
  <!-- LIVE REGION: Announces filter changes -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="sr-only"
  >
    <span v-if="hasActiveFilters">
      Showing {{ filteredInteractions.length }} interaction{{
        filteredInteractions.length !== 1 ? 's' : ''
      }} with active filters.
    </span>
    <span v-else>
      Showing {{ filteredInteractions.length }} interaction{{
        filteredInteractions.length !== 1 ? 's' : ''
      }}.
    </span>
  </div>

  <InteractionFilters ... />
  <ActiveFilterChips ... />
</div>

<!-- Results -->
<div v-else class="space-y-4">
  <InteractionCard v-for="interaction in filteredInteractions" ... />
</div>
```

### In Script

```typescript
// This computed property already exists, just make sure it triggers updates
const filteredInteractions = computed(() => {
  // filtering logic
});

// The live region will automatically re-announce when this count changes
```

### What Changed

| Before                      | After                                                       |
| --------------------------- | ----------------------------------------------------------- |
| No announcement             | Added `role="status"` + `aria-live="polite"`                |
| Filter changes silent       | Live region announces count                                 |
| No indication filter worked | Screen reader: "Showing 5 interactions with active filters" |

### Why This Works

- `role="status"` = this is a status update
- `aria-live="polite"` = announce when it changes, but don't interrupt
- `aria-atomic="true"` = announce the full text, not just what changed
- `class="sr-only"` = hidden visually (users see count in header already)

### Testing

```
1. Load page with NVDA running
2. Change a filter (e.g., select "Email" type)
3. NVDA announces: "Showing 5 interactions with active filters"
4. Clear filter
5. NVDA announces: "Showing 12 interactions"
```

---

## CRITICAL FIX #5: Loading & Empty State Announcements

### Problem

Loading state appears but screen reader users don't know data is loading. Same for empty states.

### Location

`pages/interactions/index.vue` (lines 93-141)

### Current Code (WRONG)

```vue
<!-- Loading State - visual only -->
<div v-if="loading && allInteractions.length === 0" class="...">
  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
  <p class="text-slate-600">Loading interactions...</p>
  <!-- No role, aria-live -->
</div>

<!-- Error State - visual only -->
<div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
  <p class="text-red-700">{{ error }}</p>
  <!-- No role="alert" -->
</div>

<!-- Empty State - visual only -->
<div v-else-if="allInteractions.length === 0" class="...">
  <ChatBubbleLeftRightIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
  <p class="text-slate-900 font-medium mb-2">No interactions yet</p>
  <!-- No role, aria-live -->
</div>

<!-- No Results State - visual only -->
<div v-else-if="filteredInteractions.length === 0" class="...">
  <MagnifyingGlassIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
  <p class="text-slate-900 font-medium mb-2">No interactions match your filters</p>
  <!-- No role, aria-live -->
</div>
```

### Fixed Code (RIGHT)

```vue
<!-- Loading State -->
<div
  v-if="loading && allInteractions.length === 0"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
>
  <div
    class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
    aria-hidden="true"
  ></div>
  <p class="text-slate-600">Loading interactions...</p>
</div>

<!-- Error State -->
<div
  v-else-if="error"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
>
  <p class="text-red-700">{{ error }}</p>
</div>

<!-- Empty State -->
<div
  v-else-if="allInteractions.length === 0"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
>
  <ChatBubbleLeftRightIcon
    class="w-12 h-12 text-slate-300 mx-auto mb-4"
    aria-hidden="true"
  />
  <p class="text-slate-900 font-medium mb-2">No interactions yet</p>
  <NuxtLink
    to="/interactions/add"
    class="text-blue-600 hover:text-blue-700 font-medium underline"
  >
    Log your first interaction
  </NuxtLink>
</div>

<!-- No Results State -->
<div
  v-else-if="filteredInteractions.length === 0"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
>
  <MagnifyingGlassIcon
    class="w-12 h-12 text-slate-300 mx-auto mb-4"
    aria-hidden="true"
  />
  <p class="text-slate-900 font-medium mb-2">
    No interactions match your filters
  </p>
  <p class="text-sm text-slate-500">
    Try adjusting your search or filters
  </p>
</div>

<!-- Results -->
<div v-else class="space-y-4">
  <InteractionCard v-for="interaction in filteredInteractions" :key="interaction.id" ... />
</div>
```

### What Changed

| State      | Before                  | After                                    |
| ---------- | ----------------------- | ---------------------------------------- |
| Loading    | No announcement         | `role="status"` + `aria-live="polite"`   |
| Error      | No announcement         | `role="alert"` + `aria-live="assertive"` |
| Empty      | No announcement         | `role="status"` + `aria-live="polite"`   |
| No Results | No announcement         | `role="status"` + `aria-live="polite"`   |
| All        | No aria-hidden on icons | Added `aria-hidden="true"`               |

### Why Different Roles?

- `role="status"` (polite) = "Please let the user know when convenient"
- `role="alert"` (assertive) = "Interrupt immediately - this is important!"

Use alert for errors, status for loading/empty/no results.

### Testing

```
1. Load page with NVDA
2. NVDA announces: "Loading interactions, status"
3. Wait for load
4. NVDA announces: "Showing X interactions"
5. Change filter to get no results
6. NVDA announces: "No interactions match your filters, status"
7. Go back to empty state
8. NVDA announces: "No interactions yet, status"
```

---

## HIGH PRIORITY FIX #1: Button Accessible Names

### Problem

Buttons don't have clear accessible names. Screen readers don't describe what they do.

### Affected Components

- `InteractionCard.vue` (View button)
- `AnalyticsCards.vue` (metric cards)
- `pages/interactions/index.vue` (export buttons)

### Example 1: View Button in InteractionCard.vue

**Current (WRONG):**

```vue
<button
  @click="handleView"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
>
  View
</button>
<!-- Screen reader: "View, button" - doesn't say WHAT you're viewing -->
```

**Fixed (RIGHT):**

```vue
<button
  @click="handleView"
  :aria-label="`View ${formatType(interaction.type)} interaction with ${schoolName || 'Unknown'}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-2 focus:outline-blue-600 focus:outline-offset-1 flex-shrink-0"
>
  View
</button>
<!-- Screen reader: "View email interaction with Lincoln High School, button" -->
```

### Example 2: Analytics Cards in AnalyticsCards.vue

**Current (WRONG):**

```vue
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
      <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" />
    </div>
    <div>
      <p class="text-2xl font-bold text-slate-900">{{ totalCount }}</p>
      <p class="text-sm text-slate-500">Total</p>
    </div>
  </div>
</div>
<!-- Screen reader: "Image" (for icon) then just numbers - no context -->
```

**Fixed (RIGHT):**

```vue
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
  <div class="flex items-center gap-3" role="img" :aria-label="`Total interactions: ${totalCount}`">
    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
      <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" aria-hidden="true" />
    </div>
    <div>
      <p class="text-2xl font-bold text-slate-900">{{ totalCount }}</p>
      <p class="text-sm text-slate-500">Total</p>
    </div>
  </div>
</div>
<!-- Screen reader: "Total interactions: 42, image" -->
```

### Example 3: Export Buttons in pages/interactions/index.vue

**Current (WRONG):**

```vue
<button
  @click="handleExportCSV"
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
>
  <ArrowDownTrayIcon class="w-4 h-4" />
  CSV
</button>
<!-- Screen reader: "CSV, button" - could be confused with other uses of CSV -->
```

**Fixed (RIGHT):**

```vue
<button
  @click="handleExportCSV"
  aria-label="Export filtered interactions as CSV file"
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
  CSV
</button>
<!-- Screen reader: "Export filtered interactions as CSV file, button" -->
```

---

## HIGH PRIORITY FIX #2: aria-hidden on Decorative Icons

### Problem

Decorative icons are announced by screen readers as "image", cluttering the content.

### Pattern: All Decorative Icons

**Wrong:**

```vue
<ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" />
<!-- Screen reader: "Image" or "Chat bubble left right icon" -->
```

**Right:**

```vue
<ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" aria-hidden="true" />
<!-- Screen reader: (nothing - icon is hidden) -->
```

### Locations to Update

1. **AnalyticsCards.vue** - All 4 metric card icons:

```vue
<ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" aria-hidden="true" />
<ArrowUpIcon class="w-5 h-5 text-emerald-600" aria-hidden="true" />
<ArrowDownIcon class="w-5 h-5 text-purple-600" aria-hidden="true" />
<CalendarIcon class="w-5 h-5 text-amber-600" aria-hidden="true" />
```

2. **InteractionCard.vue** - Type icon and metadata icons:

```vue
<component
  :is="getTypeIcon(interaction.type)"
  class="w-5 h-5"
  :class="getTypeIconColor(interaction.type)"
  aria-hidden="true"
/>
<CalendarIcon class="w-3.5 h-3.5" aria-hidden="true" />
<PaperClipIcon class="w-3.5 h-3.5" aria-hidden="true" />
```

3. **pages/interactions/index.vue** - Empty state icons:

```vue
<ChatBubbleLeftRightIcon
  class="w-12 h-12 text-slate-300 mx-auto mb-4"
  aria-hidden="true"
/>
<MagnifyingGlassIcon
  class="w-12 h-12 text-slate-300 mx-auto mb-4"
  aria-hidden="true"
/>
```

4. **InteractionFilters.vue** - Search icon:

```vue
<MagnifyingGlassIcon
  class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
  aria-hidden="true"
/>
```

5. **ActiveFilterChips.vue** - Remove icons on buttons:

```vue
<XMarkIcon class="w-3 h-3" aria-hidden="true" />
```

### Important Note

Only add `aria-hidden="true"` to **decorative** icons (background, metadata, visual polish).

Do NOT hide:

- Icon-only buttons (need aria-label instead)
- Icons that communicate meaning
- Icons that are part of the accessible name

---

## (Continue with remaining high/medium/low priority fixes)

### Quick Reference for Remaining Issues

**HIGH Priority Remaining:**

- Filter chip buttons need `aria-label="Remove filter: ..."`
- ActiveFilterChips.vue needs `<fieldset>` wrapper
- InteractionFilters.vue needs `<legend class="sr-only">Filter interactions</legend>`

**MEDIUM Priority:**

- interactionFormatters.ts: Change sentiment badge text from 700 → 900 weight
- Increase button padding for larger touch targets

**LOW Priority:**

- Add `<section>` tags with sr-only `<h2>` headings
- Add `underline` class to "Log your first interaction" link

---

**See full audit for all details:** `/planning/interactions-page-a11y-audit.md`
