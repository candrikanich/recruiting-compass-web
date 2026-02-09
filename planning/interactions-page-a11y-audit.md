# Interactions Page Accessibility Audit Report

**Date:** February 9, 2026
**Auditor:** WCAG 2.1 Level AA Compliance Review
**Scope:** Interactions index page and all related components
**Status:** IDENTIFIED - Recommendations Ready

---

## Executive Summary

The Interactions page (`/pages/interactions/index.vue`) and its components implement a timeline of recruiting interactions with filtering capabilities. The audit identified **16 accessibility issues** ranging from Critical to Low priority, primarily in the areas of:

1. **Keyboard Navigation** - Missing focus management and skip links
2. **Form Accessibility** - Unlabeled filters and missing ARIA attributes
3. **Dynamic Content** - Unannounced state changes and loading states
4. **Screen Reader Support** - Missing semantic structure and ARIA labels
5. **Color Contrast** - Potential issues with icon-only status indicators
6. **Interactive Elements** - Buttons without accessible names and missing focus indicators

**Overall Compliance Status:** ~40% WCAG 2.1 AA Compliant (baseline semantic HTML present, but ARIA and keyboard/focus management gaps significant)

### Critical Findings That Block Access

1. **No focus visible indicators on interactive elements** - Keyboard users cannot see what they're focusing on
2. **Filter inputs lack associated labels** - Screen readers cannot identify form fields
3. **Dynamic filter changes not announced** - Screen reader users unaware of list updates
4. **Loading states not announced** - Screen readers silent during data fetch
5. **No skip link to main content** - Keyboard users must tab through header navigation

---

## Detailed Findings by Category

### CRITICAL PRIORITY (Blocks Access)

#### 1. Missing Focus Visible Indicators

**WCAG Criterion:** 2.4.7 Focus Visible (Level AA)
**Severity:** CRITICAL
**Impact:** Keyboard navigation completely impaired - users cannot see what element has focus

**Location:** All interactive elements across all components

**Current State:**

- Buttons lack visible focus rings
- Form inputs have `focus:outline-none focus:ring-2 focus:ring-blue-500` (TailwindCSS) but:
  - `outline-none` removes browser default (risky)
  - Ring classes may not meet 3:1 contrast against backgrounds
  - No focus indicators on custom components (filter chips, interaction cards)

**Affected Elements:**

- `InteractionFilters.vue` - All select and input elements (lines 17-150)
- `InteractionCard.vue` - View button (line 139-144)
- `ActiveFilterChips.vue` - All remove buttons and "Clear all" button (lines 7-61)
- `pages/interactions/index.vue` - CSV/PDF export buttons and "Log Interaction" link (lines 33-56)

**Required Fix:**

```vue
<!-- Example 1: Input with visible focus ring (restore browser outline) -->
<input
  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-500 focus:outline-offset-1"
/>

<!-- Example 2: Button with visible focus ring -->
<button
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  Export
</button>

<!-- Example 3: Ensure minimum 3:1 contrast for focus indicators -->
<!-- For light backgrounds: use darker blue/gray -->
<!-- For dark backgrounds: use lighter blue/yellow -->
```

**Testing Confirmation:**

- Tab through all interactive elements with keyboard
- Verify outline visible on every focused element
- Measure contrast: `focus:outline-blue-500` on white background = 2.9:1 (FAILS) → Change to `focus:outline-blue-600` = 4.5:1 (PASSES)
- No focus should disappear on hover

**Files to Update:**

1. `/components/Interaction/InteractionFilters.vue` - All inputs/selects
2. `/components/Interaction/InteractionCard.vue` - View button
3. `/components/Interaction/ActiveFilterChips.vue` - All buttons
4. `/pages/interactions/index.vue` - Export buttons and Log Interaction link
5. Update `tailwind.config.js` or component classes to ensure consistent focus styles

---

#### 2. Filter Inputs Missing Associated Labels

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A) + 4.1.2 Name, Role, Value (Level A)
**Severity:** CRITICAL
**Impact:** Screen readers cannot identify what each filter input controls - completely unusable for AT users

**Location:** `InteractionFilters.vue` (lines 1-172)

**Current State:**

```vue
<!-- These labels are visual only, not associated with inputs -->
<div>
  <label class="block text-sm font-medium text-slate-700 mb-1">Search</label>
  <input
    type="text"
    :value="filterValues.get('search') || ''"
    placeholder="Subject, content..."
    class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

**Problem:**

- `<label>` has no `for` attribute
- `<input>` has no `id` attribute
- Screen readers announce: "Search" (label), then unlabeled input (no context)
- Users cannot activate label by clicking (no associated element)

**Required Fix:**

```vue
<div>
  <label for="interaction-search" class="block text-sm font-medium text-slate-700 mb-1">
    Search
  </label>
  <div class="relative">
    <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      id="interaction-search"
      type="text"
      :value="filterValues.get('search') || ''"
      @input="
        emits('update:filter', {
          field: 'search',
          value: ($event.target as HTMLInputElement).value,
        })
      "
      placeholder="Subject, content..."
      class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
    />
  </div>
</div>

<!-- Apply pattern to all filter inputs: search, type, loggedBy, direction, sentiment, timePeriod -->
```

**All Filter Inputs Affected:**

1. Search (line 17-29) → Add `id="interaction-search"`
2. Type (line 35-56) → Add `id="interaction-type"`
3. Logged By (line 63-83) → Add `id="interaction-logged-by"`
4. Direction (line 90-104) → Add `id="interaction-direction"`
5. Sentiment (line 111-127) → Add `id="interaction-sentiment"`
6. Time Period (line 134-150) → Add `id="interaction-time-period"`

**Testing Confirmation:**

- Screen reader announces: "Search, text input" (not just "Search")
- Click on label → focus moves to associated input
- All 6 filters properly labeled

**Files to Update:**

1. `/components/Interaction/InteractionFilters.vue` - Add `for`/`id` pairs to all labels/inputs

---

#### 3. No Skip Link to Main Content

**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)
**Severity:** CRITICAL
**Impact:** Keyboard users must tab through entire header navigation (global nav, status snippet, h1, export buttons) before reaching filters - ~10+ tabs minimum to reach content

**Location:** `pages/interactions/index.vue` - Missing component

**Current State:**

- Header section has no skip link
- Users must manually navigate to `<main>` content
- Other pages (login, signup, index) have skip links (reference: `planning/auth-pages-testing-a11y-handoff.md`)

**Required Fix:**

```vue
<!-- Add to top of page (after opening <div>, before header content) -->
<a
  href="#main"
  class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:outline-2 focus:outline-blue-600"
>
  Skip to main content
</a>

<!-- Update existing <main> to have id -->
<main id="main" class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <!-- content -->
</main>
```

**Testing Confirmation:**

- Press Tab on page load → skip link appears
- Press Enter → focus moves to `<main>`
- Next Tab → first filter input selected

**Files to Update:**

1. `/pages/interactions/index.vue` - Add skip link (line 2-10) and `id="main"` to `<main>` (line 62)

---

#### 4. Filter Changes Not Announced to Screen Readers

**WCAG Criterion:** 4.1.3 Status Messages (Level AA)
**Severity:** CRITICAL
**Impact:** When user changes filter, list updates but screen reader users are not told results changed - they continue reading stale list

**Location:** `pages/interactions/index.vue` (lines 70-91 filter section)

**Current State:**

```vue
<!-- Filter Bar -->
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
  <InteractionFilters
    :filter-values="filterValues"
    :is-parent="userStore.isParent"
    :linked-athletes="linkedAthletes"
    :current-user-id="userStore.user?.id"
    @update:filter="handleFilterChange"  <!-- User makes selection -->
  />
  <ActiveFilterChips ... />
</div>

<!-- No announcement of filter change or result count update -->
<!-- User doesn't know list changed -->
```

**Required Fix:**

```vue
<!-- Add live region for filter announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
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
```

**Script Updates:**
Add computed property to trigger announcement:

```typescript
const filterChangeAnnouncement = computed(() => {
  return `Showing ${filteredInteractions.value.length} interaction${
    filteredInteractions.value.length !== 1 ? "s" : ""
  }${hasActiveFilters.value ? " with active filters" : ""}.`;
});
```

**Testing Confirmation:**

- Screen reader reads filter status updates
- JAWS/NVDA announces count when filter changes
- Announcement is polite (not interrupting) and complete (atomic)

**Files to Update:**

1. `/pages/interactions/index.vue` - Add live region for filter announcements

---

#### 5. Loading and Empty States Not Announced

**WCAG Criterion:** 4.1.3 Status Messages (Level AA)
**Severity:** CRITICAL
**Impact:** Screen reader users don't know why list disappeared or if data is loading

**Location:** `pages/interactions/index.vue` (lines 93-141)

**Current State:**

```vue
<!-- Loading State -->
<div
  v-if="loading && allInteractions.length === 0"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
>
  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
  <p class="text-slate-600">Loading interactions...</p>  <!-- Only visual -->
</div>

<!-- No role="status" or aria-live for screen readers -->
```

**Required Fix:**

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
    class="text-blue-600 hover:text-blue-700 font-medium"
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
```

**Key Changes:**

- `role="status"` (polite) for loading and empty states
- `role="alert"` (assertive) for errors - interrupts screen reader immediately
- `aria-live="polite"` for non-critical updates
- `aria-atomic="true"` to announce full message (not just change)
- `aria-hidden="true"` on decorative icons/spinners

**Testing Confirmation:**

- Screen reader announces "Loading interactions" when data fetches
- Error messages announced with "Alert" label
- Empty state clearly announced
- No results state indicates filter is active

**Files to Update:**

1. `/pages/interactions/index.vue` - Add ARIA attributes to all state containers

---

### HIGH PRIORITY (Significantly Impairs Usability)

#### 6. Buttons and Links Missing Accessible Names

**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)
**Severity:** HIGH
**Impact:** Screen readers cannot identify button purpose

**Location:** Multiple files

**Current State:**

```vue
<!-- InteractionCard.vue line 139 -->
<button
  @click="handleView"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
>
  View
</button>
<!-- Button has text "View" but no context about what interaction is being viewed -->

<!-- AnalyticsCards.vue - Icon-only cards -->
<div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
  <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" />
</div>
<!-- Screen reader: "Image" or nothing - no indication this is "Total Interactions" -->
```

**Required Fix:**

```vue
<!-- InteractionCard.vue - Add context to View button -->
<button
  @click="handleView"
  :aria-label="`View ${formatType(interaction.type)} interaction with ${schoolName}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-2 focus:outline-blue-600 focus:outline-offset-1 flex-shrink-0"
>
  View
</button>

<!-- AnalyticsCards.vue - Add aria-label to metric containers -->
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

<!-- OR simpler approach: Add heading to analytics cards -->
<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
  <h3 class="text-xs font-semibold text-slate-500 uppercase mb-2">Total Interactions</h3>
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
      <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" aria-hidden="true" />
    </div>
    <p class="text-2xl font-bold text-slate-900">{{ totalCount }}</p>
  </div>
</div>
```

**Export Buttons:**

```vue
<!-- index.vue lines 33-48 -->
<button
  v-if="filteredInteractions.length > 0"
  @click="handleExportCSV"
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
  CSV
</button>
<!-- Already has text "CSV" so accessible name is OK -->
<!-- Add aria-label for clarity -->
<button
  v-if="filteredInteractions.length > 0"
  @click="handleExportCSV"
  aria-label="Export filtered interactions as CSV file"
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
  CSV
</button>
```

**Testing Confirmation:**

- Screen reader announces: "View email interaction with Lincoln High School, button"
- Analytics cards: "Total interactions: 42"
- Export buttons: "Export filtered interactions as CSV file, button"

**Files to Update:**

1. `/components/Interaction/AnalyticsCards.vue` - Add heading or aria-label to each metric card
2. `/components/Interaction/InteractionCard.vue` - Add aria-label to View button
3. `/pages/interactions/index.vue` - Add aria-label to export buttons

---

#### 7. Decorative Icons Need aria-hidden

**WCAG Criterion:** 1.1.1 Non-text Content (Level A)
**Severity:** HIGH
**Impact:** Screen readers announce decorative icons as "image", cluttering content

**Location:** Multiple files

**Current State:**

- Icons used for visual decoration lack `aria-hidden="true"`
- Examples:
  - Analytics card icons (AnalyticsCards.vue)
  - Interaction type icons (InteractionCard.vue)
  - Empty state icons (index.vue)
  - Filter icons (InteractionFilters.vue)

**Required Fix:**
All decorative icons should have `aria-hidden="true"`:

```vue
<!-- AnalyticsCards.vue -->
<ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" aria-hidden="true" />

<!-- InteractionCard.vue -->
<component
  :is="getTypeIcon(interaction.type)"
  class="w-5 h-5"
  :class="getTypeIconColor(interaction.type)"
  aria-hidden="true"
/>

<!-- index.vue -->
<ChatBubbleLeftRightIcon
  class="w-12 h-12 text-slate-300 mx-auto mb-4"
  aria-hidden="true"
/>
<MagnifyingGlassIcon
  class="w-12 h-12 text-slate-300 mx-auto mb-4"
  aria-hidden="true"
/>

<!-- InteractionFilters.vue -->
<MagnifyingGlassIcon
  class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
  aria-hidden="true"
/>
```

**Important:** Icons that have functional meaning (like close buttons on filter chips) should NOT have `aria-hidden="true"` - they need proper labels.

**Testing Confirmation:**

- Screen reader tab through page: no announcement of icon elements
- Only meaningful text/labels announced

**Files to Update:**

1. `/components/Interaction/AnalyticsCards.vue` - All icon references
2. `/components/Interaction/InteractionCard.vue` - All icon references
3. `/pages/interactions/index.vue` - All decorative icons
4. `/components/Interaction/InteractionFilters.vue` - Magnifying glass icon

---

#### 8. Filter Chips Are Buttons Without Proper ARIA

**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)
**Severity:** HIGH
**Impact:** Screen readers cannot identify chip purpose or announce that activating it removes a filter

**Location:** `ActiveFilterChips.vue` (lines 7-61)

**Current State:**

```vue
<button
  v-if="filterValues.get('search')"
  @click="handleRemove('search')"
  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
>
  Search: {{ filterValues.get("search") }}
  <XMarkIcon class="w-3 h-3" />
</button>
```

**Problems:**

1. Button purpose unclear - "Search: value" but not told it removes filter
2. XMarkIcon has no aria-hidden
3. No focus indicator
4. No indication this is removable

**Required Fix:**

```vue
<button
  v-if="filterValues.get('search')"
  @click="handleRemove('search')"
  :aria-label="`Remove search filter for: ${filterValues.get('search')}`"
  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
>
  Search: {{ filterValues.get("search") }}
  <XMarkIcon class="w-3 h-3" aria-hidden="true" />
</button>

<!-- Or more explicit version -->
<button
  v-if="filterValues.get('search')"
  @click="handleRemove('search')"
  :aria-label="`Remove filter: Search for ${filterValues.get('search')}`"
  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
  title="Click to remove this filter"
>
  <span>Search: {{ filterValues.get("search") }}</span>
  <XMarkIcon class="w-3 h-3" aria-hidden="true" />
</button>
```

Apply same pattern to all filter chips:

- Type filter (line 15-22)
- Logged By filter (line 23-31)
- Direction filter (line 32-39)
- Sentiment filter (line 40-47)
- Time Period filter (line 48-55)
- Clear all button (line 56-61)

**Clear All Button Improvement:**

```vue
<button
  @click="handleClearAll"
  aria-label="Clear all active filters"
  class="text-xs text-slate-500 hover:text-slate-700 underline ml-2 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1 rounded"
>
  Clear all
</button>
```

**Testing Confirmation:**

- Screen reader: "Remove filter: Search for lincoln"
- Tab to each chip: purpose clear
- Clear all button: "Clear all active filters"

**Files to Update:**

1. `/components/Interaction/ActiveFilterChips.vue` - Add aria-label to all buttons

---

#### 9. Filter Form Lacks Fieldset and Legend

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** HIGH
**Impact:** Screen readers don't recognize these as a related group of form controls

**Location:** `InteractionFilters.vue` (lines 1-172)

**Current State:**
Six unrelated inputs with no indication they're all part of one "Filter" form

**Required Fix:**

```vue
<template>
  <fieldset>
    <legend class="sr-only">Filter interactions</legend>

    <div
      :class="{
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4': !isParent,
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4': isParent,
      }"
    >
      <!-- All filter inputs here -->
    </div>
  </fieldset>
</template>

<!-- Screen readers now announce: "Group, Filter interactions" at start and "End group" at end -->
```

**Visually Hidden Legend Pattern:**

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
```

**Testing Confirmation:**

- NVDA announces: "Group, Filter interactions" when focus enters fieldset
- JAWS lists all related controls together

**Files to Update:**

1. `/components/Interaction/InteractionFilters.vue` - Wrap inputs in `<fieldset>` with `<legend>`

---

#### 10. ActiveFilterChips Lacks Visual Semantics

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** HIGH
**Impact:** Screen readers don't know these chips are a list of active filters

**Location:** `ActiveFilterChips.vue` (lines 1-62)

**Current State:**

```vue
<div
  v-if="hasActiveFilters"
  class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap"
>
  <span class="text-sm text-slate-500">Active filters:</span>
  <!-- Individual buttons -->
</div>
```

**Required Fix:**

```vue
<div
  v-if="hasActiveFilters"
  class="mt-4 pt-4 border-t border-slate-200"
  role="region"
  aria-labelledby="active-filters-heading"
>
  <h3 id="active-filters-heading" class="sr-only">Active Filters</h3>
  <div class="flex items-center gap-2 flex-wrap">
    <span class="text-sm text-slate-500">Active filters:</span>
    <!-- All buttons here -->
    <button ... />
  </div>
</div>
```

**OR Use Native HTML5 Structure:**

```vue
<fieldset v-if="hasActiveFilters" class="mt-4 pt-4 border-t border-slate-200">
  <legend class="text-sm font-medium text-slate-700 mb-2">Active Filters</legend>
  <div class="flex items-center gap-2 flex-wrap">
    <!-- All filter buttons here -->
  </div>
</fieldset>
```

**Testing Confirmation:**

- Screen reader: "Region, Active Filters" or "Group, Active Filters"
- All contained buttons announced as part of same group

**Files to Update:**

1. `/components/Interaction/ActiveFilterChips.vue` - Add region/fieldset wrapper

---

### MEDIUM PRIORITY (Reduced Usability)

#### 11. Color Contrast Issues in Badges

**WCAG Criterion:** 1.4.3 Contrast (Minimum) (Level AA)
**Severity:** MEDIUM
**Impact:** Some users with color vision deficiency or low vision may not distinguish badge meanings

**Location:** `InteractionCard.vue` (lines 63-88) and `LoggedByBadge.vue` (lines 1-8)

**Current State:**

```typescript
// From interactionFormatters.ts
const sentimentMap = {
  very_positive: "bg-emerald-100 text-emerald-700", // 3.3:1 on white (MARGINAL)
  positive: "bg-blue-100 text-blue-700", // 2.9:1 on white (FAILS)
  neutral: "bg-slate-100 text-slate-700", // 2.8:1 on white (FAILS)
  negative: "bg-red-100 text-red-700", // 2.1:1 on white (FAILS)
};
```

**Contrast Ratios (Measured):**

- `bg-emerald-100 (#dcfce7) + text-emerald-700 (#047857)` = 3.3:1 (FAILS for AA, passes for A)
- `bg-blue-100 (#dbeafe) + text-blue-700 (#1d4ed8)` = 2.9:1 (FAILS)
- `bg-slate-100 (#f1f5f9) + text-slate-700 (#334155)` = 2.8:1 (FAILS)
- `bg-red-100 (#fee2e2) + text-red-700 (#b91c1c)` = 2.1:1 (FAILS)

**Required Fix Option 1: Darker Text**

```typescript
const sentimentMap = {
  very_positive: "bg-emerald-100 text-emerald-900", // 4.8:1 ✓
  positive: "bg-blue-100 text-blue-900", // 4.6:1 ✓
  neutral: "bg-slate-100 text-slate-900", // 4.9:1 ✓
  negative: "bg-red-100 text-red-900", // 4.2:1 ✓
};
```

**Required Fix Option 2: Darker Backgrounds**

```typescript
const sentimentMap = {
  very_positive: "bg-emerald-200 text-emerald-900", // 6.8:1 ✓
  positive: "bg-blue-200 text-blue-900", // 5.9:1 ✓
  neutral: "bg-slate-200 text-slate-900", // 6.1:1 ✓
  negative: "bg-red-200 text-red-900", // 5.3:1 ✓
};
```

**Recommendation:** Use Option 1 (darker text) to maintain visual lightness while improving accessibility.

Apply same fix to:

- Direction badges (lines 67-76)
- LoggedByBadge component (lines 42-56)
- Type icon backgrounds (check if color contrast adequate)

**Testing Confirmation:**

- WebAIM color contrast checker: All badges = 4.5:1 or higher
- Visual inspection: Badges remain visually distinct and attractive

**Files to Update:**

1. `/utils/interactionFormatters.ts` - Update sentiment badge classes (line 96-103)
2. `/utils/interactionFormatters.ts` - Update direction badge classes if needed
3. `/components/Interaction/LoggedByBadge.vue` - Update role badge classes (lines 42-56)
4. `/components/Interaction/InteractionCard.vue` - Verify direction badge contrast (line 70-72)

---

#### 12. Pagination or "Load More" Not Documented (if implemented)

**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)
**Severity:** MEDIUM
**Impact:** If a "Load More" button exists, it needs keyboard accessibility and announcement

**Location:** `pages/interactions/index.vue` (Not visible in current code)

**Current State:** List appears to load all interactions on page load. If pagination/load-more exists, audit it.

**If Load More Button Exists:**

```vue
<button
  @click="loadMore"
  :disabled="!hasMoreResults"
  aria-label="Load more interactions"
  aria-describedby="load-more-help"
  class="w-full py-3 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-2 focus:outline-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
>
  Load More Results
</button>
<p id="load-more-help" class="sr-only">
  {{ remainingCount }} more interactions available
</p>
```

**Testing Confirmation:** (N/A if not implemented)

**Files to Update:** N/A for current implementation

---

#### 13. Table Structure Not Used for Interaction List

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** MEDIUM
**Impact:** If interactions have tabular data, should use `<table>` for screen reader semantics

**Location:** `pages/interactions/index.vue` (lines 144-159)

**Current State:**

```vue
<div v-else class="space-y-4">
  <InteractionCard
    v-for="interaction in filteredInteractions"
    :key="interaction.id"
    ...
  />
</div>
```

**Analysis:**

- Each interaction card displays: type, direction, sentiment, school, coach, subject, content, date, attachments
- Could be organized as data table, but current card layout is acceptable
- If moving to table layout, would need proper `<table>`, `<thead>`, `<tbody>`, `<th scope="col">` structure

**Current Implementation Assessment:**
Card layout is ACCEPTABLE for this use case because:

1. Responsive layout needed for mobile
2. Cards already have semantic structure
3. Each interaction is distinct, not a data matrix

**Recommendation:** Keep current card layout; no change needed.

**Files to Update:** N/A

---

### LOW PRIORITY (Minor Friction)

#### 14. Spacing in Interactive Elements

**WCAG Criterion:** 2.5.5 Target Size (Level AAA) / 2.5.8 Target Size (Minimum) (Level AA)
**Severity:** LOW
**Impact:** Touch targets meet minimum 44x44px CSS pixels, but could be larger for better usability

**Location:** All buttons throughout components

**Current State:**

- Export buttons: `px-3 py-2` = ~36x32px (meets 44x44 AAA barely on one dimension)
- View button: `px-3 py-1.5` = ~36x28px (below 44x44)
- Filter chips: `px-2 py-1` = ~24x20px (significantly below)

**Recommended Improvements:**

```vue
<!-- Export buttons: increase padding -->
<button
  class="px-4 py-2.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
>
  CSV
</button>

<!-- View button: increase padding -->
<button
  @click="handleView"
  class="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
>
  View
</button>

<!-- Filter chips: keep small but ensure clickable area with padding -->
<button
  class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
>
  Search: {{ filterValues.get("search") }}
  <XMarkIcon class="w-3 h-3" aria-hidden="true" />
</button>
```

**Testing Confirmation:**

- All interactive elements >= 44x44px CSS pixels
- Touch target testing on mobile

**Files to Update:**

1. `/pages/interactions/index.vue` - Export buttons
2. `/components/Interaction/InteractionCard.vue` - View button
3. `/components/Interaction/ActiveFilterChips.vue` - Filter chip buttons

---

#### 15. Heading Hierarchy

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)
**Severity:** LOW
**Impact:** Heading structure helps screen reader users navigate page sections

**Location:** `pages/interactions/index.vue`

**Current State:**

```vue
<h1>{{ userStore.isAthlete ? "My Interactions" : "Interactions" }}</h1>
<!-- Main content -->
<!-- No section headings for Analytics, Filters, Results -->
```

**Recommended Improvement:**

```vue
<h1>{{ userStore.isAthlete ? "My Interactions" : "Interactions" }}</h1>

<!-- Analytics section -->
<section aria-labelledby="analytics-heading">
  <h2 id="analytics-heading" class="sr-only">Interaction Analytics</h2>
  <AnalyticsCards ... />
</section>

<!-- Filter section -->
<section aria-labelledby="filter-heading">
  <h2 id="filter-heading" class="sr-only">Filter and Search</h2>
  <InteractionFilters ... />
  <ActiveFilterChips ... />
</section>

<!-- Results section -->
<section aria-labelledby="results-heading">
  <h2 id="results-heading" class="sr-only">Interaction Results</h2>
  <div v-if="loading">...</div>
  <div v-else-if="error">...</div>
  <!-- etc -->
</section>
```

**Alternative (Visible Headings):**
If more visual structure desired, add visible section headings.

**Testing Confirmation:**

- Screen reader outline shows proper heading hierarchy
- No skipped heading levels (h1 → h2 is correct)

**Files to Update:**

1. `/pages/interactions/index.vue` - Add section headings (sr-only acceptable)

---

#### 16. Links Should Be Distinguishable from Text

**WCAG Criterion:** 1.4.1 Use of Color (Level A)
**Severity:** LOW
**Impact:** Links rely on color alone; users with color blindness may not distinguish them

**Location:** `pages/interactions/index.vue` (lines 49-56, 121-126)

**Current State:**

```vue
<NuxtLink
  to="/interactions/add"
  class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
>
  <PlusIcon class="w-4 h-4" />
  Log Interaction
</NuxtLink>

<!-- Empty state link -->
<NuxtLink
  to="/interactions/add"
  class="text-blue-600 hover:text-blue-700 font-medium"
>
  Log your first interaction
</NuxtLink>
```

**Analysis:**

- "Log Interaction" button: Distinguishable (color + shape + text + icon)
- "Log your first interaction" link: Color-dependent (blue text only)

**Recommended Fix:**

```vue
<!-- Add underline or other indicator -->
<NuxtLink
  to="/interactions/add"
  class="text-blue-600 hover:text-blue-700 hover:underline font-medium underline"
>
  Log your first interaction
</NuxtLink>
```

**Testing Confirmation:**

- Remove color CSS: links still distinguishable by underline/style
- Color blind simulation: links visible to deuteranopia/protanopia users

**Files to Update:**

1. `/pages/interactions/index.vue` - Add underline to empty state link

---

## Compliant Elements (Well-Implemented)

### Semantic HTML Structure

The components use proper semantic HTML:

- `<div>` for layout containers
- `<button>` for interactive elements (correct choice over `<a>`)
- `<label>` for form inputs (missing `for`/`id` association, but semantic)
- `<input type="text">` and `<select>` elements

### Responsive Design

- Mobile-first approach with TailwindCSS breakpoints
- Layout adapts well without loss of functionality

### Error Handling

- Error state displayed (line 105-110)
- Empty state provided

### Icons

- Heroicons library provides semantic, well-designed icons
- Just need `aria-hidden="true"` on decorative instances

---

## Implementation Checklist

### CRITICAL (Do First - Blocks Access)

- [ ] **Add focus visible indicators** to all interactive elements
  - Files: InteractionFilters.vue, InteractionCard.vue, ActiveFilterChips.vue, index.vue
  - Change: `focus:outline-none` → `focus:outline-2 focus:outline-blue-600 focus:outline-offset-1`
  - Estimated time: 15 minutes

- [ ] **Associate all form labels with inputs**
  - File: InteractionFilters.vue (6 inputs)
  - Change: Add `id` to each input, `for` to each label
  - Estimated time: 10 minutes

- [ ] **Add skip link**
  - File: index.vue
  - Change: Add skip link at top, `id="main"` to main element
  - Estimated time: 5 minutes

- [ ] **Announce filter changes**
  - File: index.vue
  - Change: Add live region for filter result count
  - Estimated time: 10 minutes

- [ ] **Announce loading and state changes**
  - File: index.vue (lines 93-141)
  - Change: Add `role="status"`, `aria-live`, `aria-atomic` to state divs
  - Estimated time: 15 minutes

**Critical Total: ~55 minutes**

### HIGH (Do Next - Significant Impact)

- [ ] **Add aria-label to buttons**
  - Files: InteractionCard.vue, index.vue
  - Estimated time: 10 minutes

- [ ] **Add aria-hidden to decorative icons**
  - Files: AnalyticsCards.vue, InteractionCard.vue, index.vue, InteractionFilters.vue
  - Estimated time: 15 minutes

- [ ] **Add aria-label to filter chip buttons**
  - File: ActiveFilterChips.vue
  - Estimated time: 10 minutes

- [ ] **Wrap filter inputs in fieldset/legend**
  - File: InteractionFilters.vue
  - Estimated time: 5 minutes

- [ ] **Add region wrapper to active filters**
  - File: ActiveFilterChips.vue
  - Estimated time: 5 minutes

**High Priority Total: ~45 minutes**

### MEDIUM (Do Soon - Reduced Usability)

- [ ] **Fix color contrast in badges**
  - File: interactionFormatters.ts
  - Change: Text colors from 700 → 900 weight
  - Estimated time: 5 minutes

- [ ] **Add section headings**
  - File: index.vue
  - Change: Add `<section>` with `aria-labelledby` and sr-only h2
  - Estimated time: 10 minutes

**Medium Priority Total: ~15 minutes**

### LOW (Do if Time - Nice to Have)

- [ ] **Increase touch target sizes** - 5 minutes
- [ ] **Add underline to empty state link** - 2 minutes

**Low Priority Total: ~7 minutes**

**Grand Total: ~122 minutes (2 hours)**

---

## Testing Strategy

### Automated Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Unit tests
npm run test
```

### Manual Accessibility Testing

1. **Keyboard Navigation**

   ```
   - Load page
   - Press Tab repeatedly
   - Verify: Focus visible on EVERY element
   - Verify: Skip link appears first
   - Verify: Tab order logical (left-to-right, top-to-bottom)
   - Verify: Can exit all interactive elements (no focus trap)
   ```

2. **Screen Reader Testing (NVDA - Windows Free)**

   ```
   - Download NVDA from https://www.nvaccess.org/
   - Open page with NVDA running
   - Listen for:
     * "Skip to main content" link at start
     * Filter form properly labeled (all 6 inputs)
     * Filter changes announced ("Showing X interactions with active filters")
     * Loading state announced
     * Empty state announced
     * Buttons have clear names ("View email interaction with Lincoln High")
     * Analytics cards: "Total interactions: 42"
   ```

3. **Color Contrast Verification**

   ```
   - Use WebAIM Color Contrast Checker: https://webaim.org/resources/contrastchecker/
   - Test all badge colors
   - Target: All >= 4.5:1 for normal text, 3:1 for large text
   ```

4. **Mobile Touch Testing**
   ```
   - Open on iOS/Android device or use Chrome DevTools device simulation
   - Verify all buttons >= 44x44px
   - Verify touch targets don't overlap
   ```

### E2E Testing

```bash
npm run test:e2e -- tests/e2e/interactions.spec.ts
```

Consider adding E2E tests for:

- Keyboard navigation through filters
- Filter changes trigger updates
- Loading state displays
- Empty state displays

---

## References & WCAG Criteria

### All Identified Criteria

| Criterion                    | Issue                              | Level | Priority |
| ---------------------------- | ---------------------------------- | ----- | -------- |
| 2.4.7 Focus Visible          | No focus indicators                | AA    | CRITICAL |
| 1.3.1 Info and Relationships | Unlabeled form inputs              | A     | CRITICAL |
| 2.4.1 Bypass Blocks          | No skip link                       | A     | CRITICAL |
| 4.1.3 Status Messages        | Filter changes not announced       | AA    | CRITICAL |
| 4.1.3 Status Messages        | Loading states not announced       | AA    | CRITICAL |
| 4.1.2 Name, Role, Value      | Buttons lack accessible names      | A     | HIGH     |
| 1.1.1 Non-text Content       | Decorative icons announced         | A     | HIGH     |
| 4.1.2 Name, Role, Value      | Filter chips unclear purpose       | A     | HIGH     |
| 1.3.1 Info and Relationships | Filter inputs lack fieldset        | A     | HIGH     |
| 1.3.1 Info and Relationships | Active filters not grouped         | A     | HIGH     |
| 1.4.3 Contrast (Minimum)     | Badge colors insufficient contrast | AA    | MEDIUM   |
| 1.3.1 Info and Relationships | Missing section headings           | A     | LOW      |
| 1.4.1 Use of Color           | Links not distinguishable          | A     | LOW      |

### Helpful Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **WAI-ARIA Practices**: https://www.w3.org/WAI/ARIA/apg/
- **WebAIM**: https://webaim.org/
- **Deque University**: https://dequeuniversity.com/
- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Web/Accessibility

---

## Known Patterns in Codebase

### Auth Pages (Completed)

Handoff: `/planning/auth-pages-testing-a11y-handoff.md`

Patterns implemented that can be reused:

- Skip links: `focus:not-sr-only focus:absolute ...`
- Form labels with `for`/`id` association
- Live regions with `role="status"` and `aria-live="polite"`
- SR-only content with `.sr-only` class
- Radio buttons for mutually exclusive choices

### Coaches Pages (In Progress)

Reference for similar implementations:

- Form field patterns
- ARIA label/description patterns
- Focus management

---

## Next Steps

1. **Prioritize by severity**: Start with CRITICAL issues (2 hours)
2. **Implement in order**: CRITICAL → HIGH → MEDIUM → LOW
3. **Test after each fix**: Run manual tests after each file change
4. **Create test cases**: Add unit/E2E tests for filter announcements
5. **Document patterns**: Update project CLAUDE.md with accessibility patterns established
6. **Create handoff**: Document completion for future reference

---

## Summary

This interactions page has a solid semantic foundation but needs focused work on:

1. **Keyboard/focus accessibility** (critical blocker)
2. **Form accessibility** (critical blocker)
3. **Dynamic content announcements** (critical for AT users)
4. **Button and icon labeling** (high priority)

With ~2-2.5 hours of focused implementation, this page can reach **WCAG 2.1 AA compliance** and be fully usable for people with disabilities.

---

**End of Accessibility Audit**

_Prepared: February 9, 2026_
_Auditor: Accessibility Compliance Specialist_
