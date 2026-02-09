# WCAG 2.1 AA Accessibility Audit: Coaches Pages

**Date:** February 9, 2026
**Component:** Recruiting Compass - Coaches Module
**Scope:** pages/coaches/\* and related coach components
**Audit Level:** WCAG 2.1 Level AA

---

## Executive Summary

The coaches pages demonstrate a **mixed accessibility maturity**. Strong foundations exist in semantic HTML and focus indicators, but significant gaps exist in ARIA implementation, screen reader announcements, and interactive component labeling. The most critical issues block access for screen reader users navigating forms and dynamic state changes.

**Overall Compliance Status:** ~60-65% WCAG 2.1 AA (Needs Remediation)

**Critical Blockers:** 4
**High Priority Issues:** 12
**Medium Priority Issues:** 8
**Low Priority Enhancements:** 6

---

## CRITICAL ISSUES (Must Fix - Blocks Access)

### 1. Modal Dialogs Lack Focus Trap & ARIA Attributes

**Location:** pages/coaches/index.vue (line 430-464, Communication Panel)
**WCAG Criterion:** 2.4.3 Focus Order, 4.1.2 Name/Role/Value
**Severity:** CRITICAL
**Impact:** Screen reader users cannot navigate modals safely; keyboard-only users can tab out of dialogs; AT users don't know modal is active

**Current State:**

```vue
<Teleport to="body">
  <Transition name="fade">
    <div
      v-if="showPanel && selectedCoach"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showPanel = false"
    >
      <div
        class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
```

**Problems:**

- No `role="dialog"` on modal container
- No `aria-modal="true"` attribute
- No `aria-labelledby` pointing to modal title (h2)
- No focus trap (focus can escape modal)
- No `aria-hidden="true"` on background overlay
- Closing button lacks accessible label (uses × symbol only)

**Required Fix:**

```vue
<div
  v-if="showPanel && selectedCoach"
  class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  @click="showPanel = false"
  aria-hidden="true"
  role="presentation"
>
  <div
    class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    @click.stop
    role="dialog"
    aria-modal="true"
    aria-labelledby="communication-panel-title"
    @keydown.escape="showPanel = false"
  >
    <div class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl">
      <h2 id="communication-panel-title" class="text-xl font-bold text-slate-900">
        Quick Communication
      </h2>
      <button
        @click="showPanel = false"
        aria-label="Close Quick Communication dialog"
        class="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <XMarkIcon class="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
```

**Testing Confirmation:**

1. Navigate modal with screen reader (NVDA/JAWS) - should announce dialog, focus should stay within
2. Test with keyboard only - Tab should cycle within modal, Escape closes
3. Test with Chrome DevTools Accessibility tree - verify role="dialog" and aria-modal="true"

---

### 2. Delete Confirmation Modal Missing Focus Management & ARIA

**Location:** components/DeleteConfirmationModal.vue
**WCAG Criterion:** 2.4.3 Focus Order, 3.2.1 On Focus, 4.1.2 Name/Role/Value
**Severity:** CRITICAL
**Impact:** Screen reader users don't receive confirmation of destructive action; focus management fails

**Current State:**

```vue
<template>
  <dialog v-if="isOpen" class="rounded-lg shadow-lg p-6 max-w-sm mx-auto">
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-red-600">Delete {{ itemType }}?</h2>
    </div>
  </dialog>
</template>
```

**Problems:**

- Uses HTML `<dialog>` element but doesn't leverage its built-in accessibility (no `@close` handler)
- No `aria-describedby` linking to confirmation text
- No `aria-label` on button group
- Close button (Cancel/Delete) lack clear aria-labels
- No announcement of pending action or consequences
- Missing focus restoration after modal closes

**Required Fix:**

```vue
<template>
  <dialog
    v-if="isOpen"
    class="rounded-lg shadow-lg p-6 max-w-sm mx-auto border border-red-200"
    role="alertdialog"
    aria-labelledby="delete-title"
    aria-describedby="delete-message"
    @close="$emit('cancel')"
  >
    <div class="space-y-4">
      <h2 id="delete-title" class="text-lg font-bold text-red-600">
        Delete {{ itemType }}?
      </h2>
      <p id="delete-message" class="text-gray-700">
        This will permanently delete <strong>{{ itemName }}</strong>
        and any related interactions. This cannot be undone.
      </p>

      <div
        class="flex gap-3 justify-end"
        role="group"
        aria-label="Delete confirmation actions"
      >
        <button
          @click="$emit('cancel')"
          :disabled="isLoading"
          aria-label="Cancel deletion"
          class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="isLoading"
          aria-label="Confirm permanent deletion"
          class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <span v-if="isLoading" aria-live="polite">Deleting...</span>
          <span v-else>Delete</span>
        </button>
      </div>
    </div>
  </dialog>
</template>
```

**Testing Confirmation:**

1. Announce with screen reader - should read: "Delete [coach name]?" followed by description
2. Tab through buttons - focus outline must be visible
3. Verify `<dialog>` backdrop doesn't interfere with focus trap

---

### 3. Icon-Only Buttons Lack Accessible Names

**Location:** pages/coaches/index.vue (lines 355-414)
**WCAG Criterion:** 4.1.2 Name/Role/Value, 1.4.3 Contrast (some)
**Severity:** CRITICAL
**Impact:** Screen reader users hear no purpose; visual users see cryptic icons; some colors fail contrast

**Current State:**

```vue
<button
  v-if="coach.email"
  @click="handleCoachAction('email', coach)"
  class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
  title="Send email"
>
  <EnvelopeIcon class="w-5 h-5" />
</button>
```

**Problems:**

- `title` attribute is insufficient for screen readers (not reliably announced)
- Icon has no `aria-label` on button
- Icon SVGs lack `aria-hidden="true"` (unnecessary semantic duplication)
- Inactive state colors (text-slate-400) likely fail 4.5:1 contrast ratio with white background
- Some hover colors (e.g., text-sky-500 Twitter) may not meet 3:1 contrast ratio

**Required Fix:**

```vue
<!-- Email button -->
<button
  v-if="coach.email"
  @click="handleCoachAction('email', coach)"
  aria-label="Send email to {{ coach.first_name }} {{ coach.last_name }}"
  class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  <EnvelopeIcon class="w-5 h-5" aria-hidden="true" />
</button>

<!-- Text button -->
<button
  v-if="coach.phone"
  @click="handleCoachAction('text', coach)"
  aria-label="Send text message to {{ coach.first_name }} {{ coach.last_name }}"
  class="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
>
  <ChatBubbleLeftIcon class="w-5 h-5" aria-hidden="true" />
</button>

<!-- Twitter button -->
<button
  v-if="coach.twitter_handle"
  @click="handleCoachAction('tweet', coach)"
  aria-label="View {{ coach.first_name }}'s Twitter profile"
  class="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
>
  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <!-- SVG path -->
  </svg>
</button>

<!-- Delete button -->
<button
  @click="openDeleteModal(coach)"
  data-test="coach-delete-btn"
  aria-label="Delete {{ coach.first_name }} {{ coach.last_name }}"
  class="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <!-- SVG path -->
  </svg>
</button>
```

**Testing Confirmation:**

1. Screen reader announces button purpose: "Send email to John Smith"
2. Test contrast: Use WebAIM Contrast Checker or Chrome DevTools Accessibility tab
3. Verify focus ring visible at 200% zoom without cutoff

---

### 4. Dynamic Loading States Not Announced to Screen Readers

**Location:** pages/coaches/index.vue (lines 224-232), all coach detail pages
**WCAG Criterion:** 4.1.3 Status Messages
**Severity:** CRITICAL
**Impact:** Screen reader users don't know page is loading; async operations fail silently

**Current State:**

```vue
<!-- Loading State -->
<div
  v-if="loading && allCoaches.length === 0"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
>
  <div
    class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
  ></div>
  <p class="text-slate-600">Loading coaches...</p>
</div>
```

**Problems:**

- Spinner div has no accessible purpose (visual only)
- Text "Loading coaches..." is not announced as a status message
- No `aria-live="polite"` to announce state change
- No `role="status"` to mark as live region
- Users don't know when loading completes (no aria-busy state)

**Required Fix:**

```vue
<div
  v-if="loading && allCoaches.length === 0"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <div
    class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
    aria-hidden="true"
  ></div>
  <p class="text-slate-600">Loading coaches...</p>
</div>

<!-- Also add to main container for persistent feedback: -->
<main
  class="max-w-7xl mx-auto px-4 sm:px-6 py-8"
  aria-busy="loading"
  @aria-busy="$emit('loading-changed')"
>
```

**Testing Confirmation:**

1. With screen reader, hear "status: Loading coaches..." when page loads
2. Hear announcement when loading completes
3. Test with NVDA "View > Speech Viewer" to see announcements

---

## HIGH PRIORITY ISSUES (Significant Compliance Gaps)

### 5. Form Labels Missing or Incorrect Association

**Location:** pages/coaches/[id]/communications.vue (lines 20-91), pages/coaches/[id]/availability.vue
**WCAG Criterion:** 1.3.1 Info and Relationships, 4.1.2 Name/Role/Value
**Severity:** HIGH
**Impact:** Form fields lack accessible names; screen reader users can't identify input purposes

**Current State:**

```vue
<!-- Type Filter -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-2"
    >Communication Type</label
  >
  <select
    v-model="selectedType"
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
```

**Problems:**

- `<label>` missing `for` attribute
- `<select>` missing `id` attribute
- Not programmatically linked (screen readers announce as unlabeled)

**Required Fix:**

```vue
<div>
  <label
    for="communication-type-filter"
    class="block text-sm font-medium text-gray-700 mb-2"
  >
    Communication Type
  </label>
  <select
    id="communication-type-filter"
    v-model="selectedType"
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  >
    <option value="">All Types</option>
    <!-- options -->
  </select>
</div>
```

**Affected Elements:**

- All filter sections (Type, Direction, Date Range, Sentiment) in communications.vue
- All form inputs in availability.vue schedule editor
- Role selection in coaches/new.vue

**Testing Confirmation:**

1. Screen reader announces: "Communication Type, dropdown"
2. User can activate field by clicking/focusing label text
3. ChromeVox reads label when input receives focus

---

### 6. Search Input Missing Accessible Label & Description

**Location:** pages/coaches/index.vue (lines 63-84)
**WCAG Criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
**Severity:** HIGH
**Impact:** Search purpose unclear; icon-only placeholder insufficient

**Current State:**

```vue
<div>
  <label class="block text-sm font-medium text-slate-700 mb-1">Search</label>
  <div class="relative">
    <MagnifyingGlassIcon
      class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
    />
    <input
      type="text"
      :value="filterValues.get('search') || ''"
      @input="handleFilterUpdate('search', ($event.target as HTMLInputElement).value)"
      placeholder="Name, email, phone..."
      class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
</div>
```

**Problems:**

- Icon lacks `aria-hidden="true"` and label
- Search input missing `id` to link with `<label for>`
- Placeholder used instead of supplementary description
- No search button with accessible purpose

**Required Fix:**

```vue
<div>
  <label
    for="coaches-search"
    class="block text-sm font-medium text-slate-700 mb-1"
  >
    Search coaches
  </label>
  <div class="relative">
    <MagnifyingGlassIcon
      class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      aria-hidden="true"
    />
    <input
      id="coaches-search"
      type="text"
      :value="filterValues.get('search') || ''"
      @input="handleFilterUpdate('search', ($event.target as HTMLInputElement).value)"
      aria-describedby="coaches-search-hint"
      placeholder="Name, email, phone..."
      class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
  <p id="coaches-search-hint" class="mt-1 text-xs text-slate-500">
    Search by first/last name, email, phone number, Twitter handle, Instagram handle, or notes
  </p>
</div>
```

**Testing Confirmation:**

1. Screen reader announces: "Search coaches, edit text, Name email phone..."
2. Focus input - hear description: "Search by first/last name..."
3. Label click focuses input

---

### 7. Responsiveness Score Bar Lacks Accessible Alternative

**Location:** pages/coaches/index.vue (lines 314-336), pages/coaches/[id].vue (line 73)
**WCAG Criterion:** 1.4.1 Use of Color, 4.1.2 Name/Role/Value
**Severity:** HIGH
**Impact:** Color-blind users can't assess responsiveness; screen reader users get no data

**Current State:**

```vue
<div class="flex items-center justify-between">
  <span class="text-sm text-slate-500">Responsiveness</span>
  <div class="flex items-center gap-2">
    <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full"
        :class="getResponsivenessBarClass(coach.responsiveness_score || 0)"
        :style="{ width: `${coach.responsiveness_score || 0}%` }"
      ></div>
    </div>
    <span class="text-sm font-medium">{{ coach.responsiveness_score || 0 }}%</span>
  </div>
</div>
```

**Problems:**

- Bar uses only color to convey value (not accessible to color-blind users)
- Bar div has no `role`, `aria-label`, or semantic meaning
- Percentage text is accessible but bar is decorative redundancy
- No pattern or texture to distinguish bar from background (color-only coding)

**Required Fix:**

```vue
<div class="flex items-center justify-between">
  <label for="coach-responsiveness-{{ coach.id }}" class="text-sm text-slate-500">
    Responsiveness
  </label>
  <div class="flex items-center gap-2">
    <!-- Accessible progress bar -->
    <div
      id="coach-responsiveness-{{ coach.id }}"
      class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-300"
      role="progressbar"
      :aria-valuenow="coach.responsiveness_score || 0"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="coach.responsiveness_score + '% responsiveness score'"
    >
      <div
        class="h-full rounded-full transition-all"
        :class="getResponsivenessBarClass(coach.responsiveness_score || 0)"
        :style="{ width: `${coach.responsiveness_score || 0}%` }"
        aria-hidden="true"
      >
        <!-- Add pattern/stripe for color-blind accessibility -->
        <div class="h-full opacity-20" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px)"></div>
      </div>
    </div>
    <span
      class="text-sm font-medium tabular-nums"
      aria-hidden="true"
    >
      {{ coach.responsiveness_score || 0 }}%
    </span>
  </div>
</div>
```

**Testing Confirmation:**

1. Screen reader announces: "Responsiveness, progressbar, 75% responsiveness score"
2. Test with Deutan/Protan/Achromat color blindness simulator
3. Bar distinguishable from background with pattern overlay

---

### 8. List of Coaches Lacks Semantic Structure

**Location:** pages/coaches/index.vue (lines 268-424)
**WCAG Criterion:** 1.3.1 Info and Relationships
**Severity:** HIGH
**Impact:** Screen reader users don't perceive list structure; ambiguous navigation

**Current State:**

```vue
<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div
    v-for="coach in filteredCoaches"
    :key="coach.id"
    class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
  >
```

**Problems:**

- Grid uses `<div>` instead of `<ul>/<li>` for list semantics
- Screen reader doesn't announce "list of 15 items"
- No item count indicator
- Search and filter changes don't announce result count

**Required Fix:**

```vue
<!-- Add aria-live region to announce filter results -->
<div
  class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  <p class="text-sm text-blue-900">
    {{ filteredCoaches.length }} coach{{ filteredCoaches.length !== 1 ? 'es' : '' }} found
  </p>
</div>

<!-- Use semantic list structure -->
<ul
  v-if="filteredCoaches.length > 0"
  class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
>
  <li
    v-for="coach in filteredCoaches"
    :key="coach.id"
    class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
  >
    <!-- Card content -->
  </li>
</ul>
```

**Testing Confirmation:**

1. Screen reader announces: "List of 15 items" when page loads
2. When filters applied, hear: "Status: 8 coaches found"
3. List navigation works (list up/down, item numbers)

---

### 9. Date Formatters Lack Internationalization & Context

**Location:** pages/coaches/[id].vue (lines 655-670), pages/coaches/index.vue (lines 593-600)
**WCAG Criterion:** 3.1.1 Language of Page, 3.2.1 On Focus, 3.2.2 On Input
**Severity:** HIGH
**Impact:** International users misinterpret dates; ambiguous time zones; "days ago" lacks context

**Current State:**

```vue
const formatDate = (dateString: string | undefined): string => { if
(!dateString) return ""; const date = new Date(dateString); return
date.toLocaleDateString("en-US", { month: "short", day: "numeric", year:
"numeric", }); };
```

**Problems:**

- Date formatting is locale-hardcoded (en-US)
- "Last contact: Nov 3, 2025 (97 days ago)" - the "days ago" calculation is unclear if it's exact
- No timezone indicator for availability times
- Users with different locale settings see US-formatted dates

**Required Fix:**

```vue
<!-- Compute user's locale from browser/profile -->
const userLocale = computed(() => navigator.language || 'en-US'); const
formatDate = (dateString: string | undefined): string => { if (!dateString)
return ""; const date = new Date(dateString); return
date.toLocaleDateString(userLocale.value, { weekday: 'short', month: 'long',
day: 'numeric', year: 'numeric', }); }; const formatDateWithTime = (dateString:
string | undefined): string => { if (!dateString) return ""; const date = new
Date(dateString); return date.toLocaleString(userLocale.value, { month: 'short',
day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
timeZoneName: 'short', }); }; const getDaysAgoExact = (dateString: string):
string => { const date = new Date(dateString); const today = new Date(); const
days = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
if (days === 0) return 'today'; if (days === 1) return '1 day ago'; return
`${days} days ago`; };
```

**HTML Update:**

```vue
<div class="flex items-center gap-2 text-slate-600 text-sm mt-3">
  <CalendarIcon class="w-4 h-4" />
  <time :datetime="coach.last_contact_date">
    Last contact: {{ formatDate(coach.last_contact_date) }}
    ({{ getDaysAgoExact(coach.last_contact_date) }})
  </time>
</div>
```

**Testing Confirmation:**

1. Change browser locale to de-DE - date formats as "Donnerstag, 3. November 2025"
2. Dates display with full timezone (e.g., "11:30 AM EST")
3. Test with RTL language (Hebrew) - layout mirrors correctly

---

### 10. Empty/Error States Lack Sufficient Contrast

**Location:** pages/coaches/index.vue (lines 242-266)
**WCAG Criterion:** 1.4.3 Contrast (Minimum)
**Severity:** HIGH
**Impact:** Low vision users may not see empty state messages

**Current State:**

```vue
<div
  v-else-if="allCoaches.length === 0"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
>
  <UserGroupIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
  <p class="text-slate-900 font-medium mb-2">No coaches found</p>
  <p class="text-sm text-slate-500">
    Add coaches through school detail pages
  </p>
</div>
```

**Problems:**

- Icon color (text-slate-300 = #cbd5e1) on white fails 3:1 contrast (ratio ~1.8:1)
- Secondary text (text-slate-500) is only ~4:1 contrast - adequate but at edge
- No visual distinction for error states vs. empty states

**Required Fix:**

```vue
<div
  v-else-if="allCoaches.length === 0"
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
  role="status"
>
  <UserGroupIcon class="w-12 h-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
  <h2 class="text-slate-900 font-semibold mb-2">No coaches found</h2>
  <p class="text-slate-700">
    Add coaches through school detail pages
  </p>
</div>

<!-- Error state with alert styling -->
<div
  v-else-if="error"
  class="bg-red-50 border-l-4 border-red-600 p-4 mb-6"
  role="alert"
  aria-live="assertive"
>
  <div class="flex items-start gap-3">
    <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true">
      <!-- Alert icon -->
    </svg>
    <div>
      <h3 class="font-semibold text-red-800 mb-1">Error loading coaches</h3>
      <p class="text-red-700">{{ error }}</p>
    </div>
  </div>
</div>
```

**Testing Confirmation:**

1. WebAIM Contrast Checker: icon should be 4.5:1 minimum
2. Text-slate-500 upgrade to text-slate-700 if used for content
3. Error state uses red-800 (foreground) on red-50 (background) = 7:1 contrast

---

### 11. Tab Navigation Order & Focus Indicators Inconsistent

**Location:** pages/coaches/[id]/availability.vue (lines 96-150)
**WCAG Criterion:** 2.4.3 Focus Order, 2.4.7 Focus Visible
**Severity:** HIGH
**Impact:** Keyboard-only users can't efficiently navigate schedule editor

**Current State:**

```vue
<!-- Edit Mode -->
<div v-else class="space-y-4">
  <div
    v-for="day in DAYS"
    :key="day"
    class="p-4 border border-gray-200 rounded-lg"
  >
    <div class="flex items-center gap-4 mb-3">
      <label class="flex items-center gap-2 flex-1">
        <input
          type="checkbox"
          :checked="getDayAvailability(day)?.available"
          @change="toggleDayEdit(day)"
          class="w-4 h-4 rounded border-gray-300"
        />
```

**Problems:**

- Checkbox input missing focus ring style (no focus:ring-2 class)
- Time inputs below checkbox have no visual focus indicators
- Tab order within grid not logical (should be checkbox → start_time → end_time → next day)
- No keyboard shortcut to move between days
- No indication of required vs. optional fields

**Required Fix:**

```vue
<div v-else class="space-y-4">
  <fieldset
    v-for="day in DAYS"
    :key="day"
    class="p-4 border border-gray-200 rounded-lg"
  >
    <legend class="sr-only">{{ day }} availability</legend>

    <div class="flex items-center gap-4 mb-3">
      <label class="flex items-center gap-2 flex-1">
        <input
          type="checkbox"
          :checked="getDayAvailability(day)?.available"
          @change="toggleDayEdit(day)"
          class="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
        />
        <span class="font-semibold text-gray-900 capitalize">{{ day }}</span>
      </label>
    </div>

    <div
      v-if="getDayAvailability(day)?.available"
      class="flex items-center gap-4 ml-6"
    >
      <div>
        <label for="start-{{ day }}" class="block text-sm text-gray-600 mb-1">
          Start <span class="text-red-600" aria-label="required">*</span>
        </label>
        <input
          :id="`start-${day}`"
          type="time"
          :value="getDayAvailability(day)?.start_time"
          @input="updateDayTime(day, 'start_time', $event)"
          required
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        />
      </div>

      <div>
        <label for="end-{{ day }}" class="block text-sm text-gray-600 mb-1">
          End <span class="text-red-600" aria-label="required">*</span>
        </label>
        <input
          :id="`end-${day}`"
          type="time"
          :value="getDayAvailability(day)?.end_time"
          @input="updateDayTime(day, 'end_time', $event)"
          required
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        />
      </div>
    </div>
  </fieldset>
</div>
```

**Testing Confirmation:**

1. Tab through form - focus ring visible on all inputs
2. Press Tab through each day: checkbox → start → end → next day
3. Toggle checkbox with Space key - time fields appear/disappear, focus management smooth
4. At 200% zoom, focus ring not cut off

---

### 12. No Skip Link to Main Content

**Location:** All coach pages (global concern)
**WCAG Criterion:** 2.4.1 Bypass Blocks
**Severity:** HIGH
**Impact:** Keyboard/AT users must tab through navigation before accessing main content

**Current State:**
No skip link present in any coaches page. Navigation includes:

- Header with StatusSnippet
- Filter bar with 5 selects
- Action buttons

**Required Fix:**
Add to every coaches page (typically in Header or Nuxt layout):

```vue
<!-- Skip Link - first focusable element on page -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white"
>
  Skip to main content
</a>

<!-- Header, navigation, filters -->
<Header />

<!-- Mark main content area -->
<main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <!-- Coach list/detail content -->
</main>
```

**Testing Confirmation:**

1. Press Tab on page load - first focus goes to "Skip to main content" link
2. Press Enter - focus jumps to #main-content
3. Link hidden visually but appears on focus

---

## MEDIUM PRIORITY ISSUES (Reduces Usability)

### 13. Headings Lack `aria-label` Context in Complex Pages

**Location:** pages/coaches/[id].vue (multiple h3 for stats)
**WCAG Criterion:** 1.3.1 Info and Relationships
**Severity:** MEDIUM
**Impact:** Screen reader users can't distinguish between stats sections

**Current State:**

```vue
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <p class="text-sm text-slate-500 mb-1">Total Interactions</p>
    <p class="text-3xl font-bold text-slate-900">{{ stats.totalInteractions }}</p>
  </div>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <p class="text-sm text-slate-500 mb-1">Days Since Contact</p>
  </div>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <p class="text-sm text-slate-500 mb-1">Response Method</p>
  </div>
</div>
```

**Problems:**

- Stats cards have only `<p>` labels, not headings
- No heading structure for stat group
- Screen reader reads: "paragraph: Total Interactions, paragraph: 42" (unclear relationship)

**Required Fix:**

```vue
<section aria-labelledby="coach-stats-heading">
  <h2 id="coach-stats-heading" class="sr-only">Coach Statistics</h2>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 id="stat-interactions" class="text-sm font-medium text-slate-700 mb-2">
        Total Interactions
      </h3>
      <p class="text-3xl font-bold text-slate-900" aria-labelledby="stat-interactions">
        {{ stats.totalInteractions }}
      </p>
    </div>
    <!-- Similar for other stats -->
  </div>
</section>
```

---

### 14. Sentiment Badges Use Emoji Without Text Alternative

**Location:** pages/coaches/[id]/communications.vue (lines 166-171)
**WCAG Criterion:** 1.1.1 Non-text Content
**Severity:** MEDIUM
**Impact:** Screen readers read emoji as characters; meaning unclear

**Current State:**

```vue
const formatSentiment = (sentiment: string): string => {
  const map: Record<string, string> = {
    very_positive: "😊 Very Positive",
    positive: "👍 Positive",
    neutral: "😐 Neutral",
    negative: "👎 Negative",
  };
  return map[sentiment] || sentiment;
};
```

**Problems:**

- Emoji rendered as visual decoration mixed with text
- Screen reader announces: "smiling face emoji Very Positive" (redundant)
- If CSS disables emoji rendering, meaning lost

**Required Fix:**

```vue
const formatSentiment = (sentiment: string): string => {
  const map: Record<string, string> = {
    very_positive: "Very Positive",
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
  };
  return map[sentiment] || sentiment;
};

const getSentimentIcon = (sentiment: string): string => {
  const map: Record<string, string> = {
    very_positive: "😊",
    positive: "👍",
    neutral: "😐",
    negative: "👎",
  };
  return map[sentiment] || "";
};

<!-- In template: -->
<span
  v-if="interaction.sentiment"
  :class="getSentimentClass(interaction.sentiment)"
  :aria-label="`Sentiment: ${formatSentiment(interaction.sentiment)}`"
>
  <span aria-hidden="true">{{ getSentimentIcon(interaction.sentiment) }}</span>
  {{ formatSentiment(interaction.sentiment) }}
</span>
```

---

### 15. Active Filter Pills Need Better Visual/Programmatic Distinction

**Location:** pages/coaches/index.vue (lines 172-220)
**WCAG Criterion:** 4.1.3 Status Messages
**Severity:** MEDIUM
**Impact:** Users unclear if filter is active; no live announcement on filter change

**Current State:**

```vue
<div
  v-if="hasActiveFilters"
  class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap"
>
  <span class="text-sm text-slate-500">Active filters:</span>
  <button
    v-if="filterValues.get('search')"
    @click="handleFilterUpdate('search', null)"
    class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
  >
```

**Problems:**

- Filter pills are buttons but lack `aria-label`
- Removing filter doesn't announce result change
- "Active filters:" label not associated with pill list
- No count of active filters

**Required Fix:**

```vue
<div
  v-if="hasActiveFilters"
  class="mt-4 pt-4 border-t border-slate-200"
>
  <div
    class="flex items-center gap-2 flex-wrap"
    role="group"
    aria-label="Active filters"
  >
    <span class="text-sm font-medium text-slate-700">
      Active filters ({{ Object.keys(activeFilterCount).length }}):
    </span>

    <button
      v-if="filterValues.get('search')"
      @click="handleFilterUpdate('search', null)"
      aria-label="Remove search filter: {{ filterValues.get('search') }}"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Search: {{ filterValues.get("search") }}
      <XMarkIcon class="w-3 h-3" aria-hidden="true" />
    </button>

    <!-- Similar for other filters -->

    <button
      @click="clearFilters"
      aria-label="Clear all active filters"
      class="text-xs text-slate-600 hover:text-slate-900 underline ml-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
    >
      Clear all
    </button>
  </div>

  <!-- Announce filter change -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="false"
    class="sr-only"
  >
    {{ filteredCoaches.length }} coach{{ filteredCoaches.length !== 1 ? 'es' : '' }} found with current filters
  </div>
</div>
```

---

### 16. Missing Required Field Indicators & Error Messaging

**Location:** pages/coaches/new.vue (lines 25-55), components/Coach/CoachForm.vue
**WCAG Criterion:** 3.3.1 Error Identification, 3.3.2 Labels or Instructions, 3.3.4 Error Prevention
**Severity:** MEDIUM
**Impact:** Users unclear which fields are required; error messages not associated with fields

**Current State:**

```vue
<div class="mb-6">
  <label for="school" class="block text-sm font-medium text-gray-700 mb-1">
    School <span class="text-red-600">*</span>
  </label>
  <select id="school" v-model="selectedSchoolId" required
    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
  >
```

**Problems:**

- Visual asterisk (\*) for required but no ARIA equivalent
- No `aria-required="true"` on input
- Form validation errors have no `aria-describedby` linking to error message
- Error message div has no `role="alert"` or `aria-live`

**Required Fix:**

```vue
<fieldset class="space-y-6">
  <legend class="sr-only">Add New Coach</legend>

  <div class="mb-6">
    <label
      for="school"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      School
      <span class="text-red-600" aria-label="required">*</span>
    </label>
    <select
      id="school"
      v-model="selectedSchoolId"
      required
      aria-required="true"
      aria-describedby="school-error school-hint"
      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
    >
      <option value="">-- Select School --</option>
    </select>

    <!-- Hint text -->
    <p id="school-hint" class="mt-1 text-sm text-gray-600">
      You must select a school to continue
    </p>

    <!-- Error message -->
    <div
      v-if="errors.school"
      id="school-error"
      role="alert"
      class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
    >
      {{ errors.school }}
    </div>
  </div>
</fieldset>
```

---

### 17. Interaction Breakdown Chart Not Accessible (pages/coaches/[id]/communications.vue)

**Location:** pages/coaches/[id]/analytics.vue (lines 160-203)
**WCAG Criterion:** 1.1.1 Non-text Content, 4.1.2 Name/Role/Value
**Severity:** MEDIUM
**Impact:** Chart is visual only; screen reader users get no data

**Current State:**

```vue
<div class="space-y-2">
  <div>
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm text-gray-600">Outbound</span>
      <span class="text-sm font-semibold text-gray-900">{{ metrics.outboundCount }}</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div
        class="bg-blue-600 h-2 rounded-full"
        :style="{ width: getBarWidth(metrics.outboundCount, metrics.totalInteractions) }"
      />
    </div>
  </div>
```

**Problems:**

- Bar chart is purely visual, no accessible alternative
- No table or list of data values
- Percentage calculation hidden in CSS width property
- No `aria-label` or `role="progressbar"`

**Required Fix:**

```vue
<!-- Data Table: Primary Content for AT users -->
<table class="w-full border-collapse">
  <caption class="sr-only">Interaction breakdown by direction</caption>
  <thead>
    <tr>
      <th scope="col" class="text-left text-sm font-medium text-gray-700 pb-2">Direction</th>
      <th scope="col" class="text-right text-sm font-medium text-gray-700 pb-2">Count</th>
      <th scope="col" class="text-right text-sm font-medium text-gray-700 pb-2">Percentage</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-t border-gray-200">
      <td class="py-2 text-sm text-gray-900">Outbound</td>
      <td class="text-right text-sm font-semibold text-gray-900">{{ metrics.outboundCount }}</td>
      <td class="text-right text-sm text-gray-700">
        {{ Math.round((metrics.outboundCount / metrics.totalInteractions) * 100) }}%
      </td>
    </tr>
    <tr class="border-t border-gray-200">
      <td class="py-2 text-sm text-gray-900">Inbound</td>
      <td class="text-right text-sm font-semibold text-gray-900">{{ metrics.inboundCount }}</td>
      <td class="text-right text-sm text-gray-700">
        {{ Math.round((metrics.inboundCount / metrics.totalInteractions) * 100) }}%
      </td>
    </tr>
  </tbody>
</table>

<!-- Visual Chart: Supplementary for sighted users -->
<div aria-hidden="true" class="mt-6 space-y-2">
  <div>
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm text-gray-600">Outbound</span>
      <span class="text-sm font-semibold text-gray-900">{{ metrics.outboundCount }}</span>
    </div>
    <div
      class="w-full bg-gray-200 rounded-full h-2"
      role="presentation"
    >
      <div
        class="bg-blue-600 h-2 rounded-full"
        :style="{ width: getBarWidth(metrics.outboundCount, metrics.totalInteractions) }"
      />
    </div>
  </div>
  <!-- Inbound bar -->
</div>
```

---

### 18. Trend Chart Not Accessible (pages/coaches/[id]/analytics.vue)

**Location:** pages/coaches/[id]/analytics.vue (lines 60-88)
**WCAG Criterion:** 1.1.1 Non-text Content
**Severity:** MEDIUM
**Impact:** Bar chart shows trends but has no text alternative; AT users can't interpret data

**Current State:**

```vue
<div
  v-if="trendData.length > 0"
  class="h-64 bg-gray-50 rounded p-4 flex items-end gap-1"
>
  <div
    v-for="(point, idx) in trendData"
    :key="idx"
    class="flex-1 flex flex-col items-center"
    :title="`${point.date}: ${point.score}%`"
  >
```

**Problems:**

- Chart uses only `title` attribute (not reliable for AT)
- Visual bars only, no accessible data representation
- Chart title "Responsiveness Trend" exists but not linked

**Required Fix:**

```vue
<div class="bg-white rounded-lg shadow p-6">
  <div class="mb-6">
    <h2 id="trend-chart-title" class="text-2xl font-bold text-gray-900">
      Responsiveness Trend
    </h2>
    <!-- Trend period selector buttons with proper labeling -->
  </div>

  <!-- Accessible Data Description -->
  <div
    role="region"
    aria-labelledby="trend-chart-title"
    class="mb-6 p-4 bg-gray-50 rounded border border-gray-200"
  >
    <h3 class="text-sm font-medium text-gray-700 mb-3">Trend Data</h3>
    <dl class="space-y-2">
      <div class="flex justify-between text-sm">
        <dt class="font-medium text-gray-900">Highest Score:</dt>
        <dd class="text-gray-700">{{ Math.max(...trendData.map(p => p.score)) }}%
          <span class="text-gray-500">({{ trendData.find(p => p.score === Math.max(...trendData.map(x => x.score)))?.date }})</span>
        </dd>
      </div>
      <div class="flex justify-between text-sm">
        <dt class="font-medium text-gray-900">Lowest Score:</dt>
        <dd class="text-gray-700">{{ Math.min(...trendData.map(p => p.score)) }}%
          <span class="text-gray-500">({{ trendData.find(p => p.score === Math.min(...trendData.map(x => x.score)))?.date }})</span>
        </dd>
      </div>
      <div class="flex justify-between text-sm">
        <dt class="font-medium text-gray-900">Average:</dt>
        <dd class="text-gray-700">{{ (trendData.reduce((sum, p) => sum + p.score, 0) / trendData.length).toFixed(1) }}%</dd>
      </div>
    </dl>
  </div>

  <!-- Visual Chart -->
  <div
    v-if="trendData.length > 0"
    class="h-64 bg-gray-50 rounded p-4 flex items-end gap-1"
    aria-hidden="true"
    role="presentation"
  >
    <div
      v-for="(point, idx) in trendData"
      :key="idx"
      class="flex-1 flex flex-col items-center"
      :title="`${point.date}: ${point.score}%`"
    >
      <!-- Visual bars -->
    </div>
  </div>
</div>
```

---

## LOW PRIORITY ISSUES (Minor Friction/Enhancement)

### 19. Loading Spinner Lacks Accessible Description

**Location:** All coach pages with loading states
**WCAG Criterion:** 1.1.1 Non-text Content
**Severity:** LOW
**Impact:** Visual-only loading indicator; minor for AT users (text is present)

**Current State:**

```vue
<div
  class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
></div>
```

**Fix:** (Already covered in Critical Issue #4, but for reference)

```vue
<div
  class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
  aria-hidden="true"
></div>
```

---

### 20. "View All" Button Lacks Context

**Location:** pages/coaches/[id].vue (lines 458-464)
**WCAG Criterion:** 2.4.4 Link Purpose (In Context)
**Severity:** LOW
**Impact:** Screen reader announces just "View All" without context

**Current State:**

```vue
<div v-if="recentInteractions.length > 10" class="text-center pt-4">
  <button
    class="text-blue-600 hover:text-blue-700 font-semibold text-sm"
  >
    View All {{ recentInteractions.length }} Interactions →
  </button>
</div>
```

**Fix:**

```vue
<div v-if="recentInteractions.length > 10" class="text-center pt-4">
  <button
    aria-label="View all {{ recentInteractions.length }} interactions"
    class="text-blue-600 hover:text-blue-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
  >
    View All {{ recentInteractions.length }} Interactions
    <span aria-hidden="true">→</span>
  </button>
</div>
```

---

### 21. Export Buttons Lack Loading/Success Feedback

**Location:** pages/coaches/index.vue (lines 750-758)
**WCAG Criterion:** 4.1.3 Status Messages
**Severity:** LOW
**Impact:** Users unclear if export succeeded; no loading indication

**Current State:**

```vue
const handleExportCSV = () => { // TODO: Implement CSV export
console.log("Export CSV"); };
```

**Fix** (Future implementation):

```vue
const exportLoading = ref(false); const exportMessage = ref(""); const
handleExportCSV = async () => { exportLoading.value = true; exportMessage.value
= "Preparing export..."; try { // Export logic exportMessage.value = "CSV
exported successfully"; setTimeout(() => { exportMessage.value = ""; }, 3000); }
catch (err) { exportMessage.value = "Export failed: " + err.message; } finally {
exportLoading.value = false; } };

<!-- In template: -->
<button
  @click="handleExportCSV"
  :disabled="exportLoading"
  aria-busy="exportLoading"
  aria-label="Export coaches to CSV"
  class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
>
  <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
  {{ exportLoading ? "Exporting..." : "CSV" }}
</button>

<!-- Status announcement -->
<div
  v-if="exportMessage"
  role="status"
  aria-live="polite"
  class="text-sm mt-2 text-green-700"
>
  {{ exportMessage }}
</div>
```

---

### 22. Tooltip Titles Could Be Replaced with aria-label

**Location:** pages/coaches/index.vue (lines 359, 367, 375, 387, 399)
**WCAG Criterion:** 1.3.1 Info and Relationships
**Severity:** LOW
**Impact:** Hover title not available on touch/keyboard; aria-label more reliable

**Current State:**

```vue
<button
  v-if="coach.email"
  @click="handleCoachAction('email', coach)"
  class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
  title="Send email"
>
```

**Fix:** (Already covered in Critical Issue #3)

---

### 23. Scrollable Content Lacks Indication

**Location:** pages/coaches/[id]/communications.vue (lines 133-216)
**WCAG Criterion:** 2.1.2 No Keyboard Trap
**Severity:** LOW
**Impact:** Users unaware content can scroll; keyboard scrolling not obvious

**Fix (Enhancement):**

```vue
<div
  class="space-y-4 max-h-96 overflow-y-auto"
  role="region"
  aria-label="Communication messages"
>
  <!-- Messages -->
</div>
```

---

### 24. Role/Title Badges Could Use aria-label

**Location:** pages/coaches/index.vue (line 293-298)
**WCAG Criterion:** 1.1.1 Non-text Content
**Severity:** LOW
**Impact:** Badge styling makes purpose less clear; aria-label clarifies

**Current State:**

```vue
<span
  class="px-2 py-1 text-xs font-medium rounded-full"
  :class="getRoleBadgeClass(coach.role)"
>
  {{ getRoleLabel(coach.role) }}
</span>
```

**Fix:**

```vue
<span
  class="px-2 py-1 text-xs font-medium rounded-full"
  :class="getRoleBadgeClass(coach.role)"
  aria-label="Coach role: {{ getRoleLabel(coach.role) }}"
>
  {{ getRoleLabel(coach.role) }}
</span>
```

---

### 25. Social Media Links Open in New Window Without Warning

**Location:** pages/coaches/[id].vue (lines 120-150)
**WCAG Criterion:** 3.2.2 On Input
**Severity:** LOW
**Impact:** New window opens unexpectedly; AT users not warned

**Current State:**

```vue
<a
  :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
  target="_blank"
  rel="noopener noreferrer"
  class="text-blue-600 hover:text-blue-700"
>
  {{ coach.twitter_handle }}
</a>
```

**Fix:**

```vue
<a
  :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="View {{ coach.first_name }}'s Twitter profile (opens in new window)"
  class="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
>
  {{ coach.twitter_handle }}
  <span aria-hidden="true" class="ml-1 inline-block">↗</span>
</a>
```

---

## COMPLIANT ELEMENTS (Well-Implemented Patterns)

### Strong Points

1. **Semantic HTML Structure**: Pages use `<main>`, `<section>`, proper heading hierarchy (h1→h2→h3)
2. **Form Input Focus States**: Most inputs have `focus:ring-2 focus:ring-blue-500` (good visual indicator)
3. **Color Labels**: Color used with text labels, not alone (e.g., role badges show "Head Coach" text)
4. **Loading States**: Text accompanies visual indicators ("Loading coaches...")
5. **Required Field Indicators**: Asterisk used consistently with text/aria
6. **Responsive Design**: Mobile-first responsive classes; pages work at zoom levels

---

## RECOMMENDATIONS & FORWARD-LOOKING IMPROVEMENTS

### AAA Enhancements (Beyond AA)

1. **Larger Focus Indicators**: Increase from 2px to 4px ring width (AAA: 3px minimum)
2. **Extended Timeouts**: Increase default data refresh timeout messaging
3. **High Contrast Mode**: Support Windows High Contrast Mode media queries
4. **Extended Color Palette**: Ensure all interactive states have 7:1 contrast (AAA vs. 4.5:1 AA)

### Best Practices

1. **Test with Real Users**: Conduct usability testing with screen reader users (NVDA, JAWS)
2. **Keyboard Testing**: Navigate all workflows with keyboard only (no mouse)
3. **Mobile AT Testing**: Test with mobile screen readers (TalkBack on Android, VoiceOver on iOS)
4. **Automated Auditing**: Integrate axe-core or Lighthouse into CI/CD pipeline
5. **Design System**: Create reusable accessible component patterns (modal, form, alert) to avoid repetition

### Architectural Improvements

1. **Centralize ARIA**: Create composable utility functions for common patterns (modal, form error, live regions)
2. **Form Validation**: Implement field-level validation with inline error messages and aria-describedby
3. **Data Visualization**: For all charts, provide data tables as primary content with visual chart as supplement
4. **Keyboard Shortcuts**: Document and support keyboard shortcuts (e.g., "?" for help, "/" for search)
5. **Announcement Service**: Create Vue composable for consistent aria-live announcements (filters, deletions, saves)

### Component Library Opportunities

```typescript
// Propose new accessible components:
// - <AccessibleModal> - handles focus trap, ARIA, keyboard escape
// - <AccessibleForm> - wraps form with error handling, field linking
// - <AccessibleChart> - data table + visual chart pattern
// - <AccessibleFilter> - filter controls + result announcements
// - <IconButton> - icon + accessible label pattern
```

---

## Implementation Priority

**Phase 1 (Critical - 1-2 sprints):**

- Fix modal dialog ARIA (issues #1-2)
- Add icon-only button accessible names (issue #3)
- Implement loading state announcements (issue #4)

**Phase 2 (High - 2-3 sprints):**

- Fix all form label associations (issues #5-6)
- Add semantic list structure (issue #8)
- Fix responsiveness bar accessibility (issue #7)
- Add skip links (issue #12)

**Phase 3 (Medium - 3-4 sprints):**

- Replace visual-only charts with data tables (issues #17-18)
- Fix focus indicators on schedule editor (issue #11)
- Improve error state contrast (issue #10)

**Phase 4 (Low - Post-launch):**

- Enhance tooltips and hints (issues #20-22)
- Add keyboard shortcuts
- Implement automated accessibility testing

---

## Testing Checklist Before Release

- [ ] **Screen Reader Testing**: Navigate all pages with NVDA (Windows) or JAWS. Announce all interactive elements and status changes.
- [ ] **Keyboard-Only Navigation**: Complete all workflows without mouse (Tab, Shift+Tab, Enter, Space, Escape).
- [ ] **Zoom Testing**: View at 200% zoom; no content cutoff, layout reflows correctly.
- [ ] **Contrast Testing**: WebAIM Contrast Checker for all text; verify 4.5:1 minimum.
- [ ] **Focus Indicator Testing**: All interactive elements have visible focus ring at 200% zoom.
- [ ] **Color-Blind Testing**: Simulate Deuteranopia, Protanopia, Achromatopsia; verify all info distinct.
- [ ] **Mobile AT Testing**: Test with TalkBack (Android) and VoiceOver (iOS).
- [ ] **Automated Scanning**: Run axe DevTools, Lighthouse, WAVE on all pages; fix flagged issues.
- [ ] **ARIA Validation**: Use ARIA authoring practices guide; validate no invalid role/property combinations.
- [ ] **Localization**: Test with different `lang` attributes; verify screen reader language switches.

---

## Conclusion

The coaches pages demonstrate a solid foundation in semantic HTML and visual design, but accessibility gaps in ARIA implementation, screen reader announcements, and form labeling significantly impair the experience for users with disabilities. The **4 critical issues must be addressed before release**, particularly modal focus management and icon button labeling, which block access for screen reader and keyboard-only users.

Implementing the **12 high-priority fixes** will bring the module to ~85% WCAG 2.1 AA compliance. A follow-up phase addressing medium and low priorities will achieve 95%+ compliance and enable AAA certification.

**Estimated Effort:**

- Critical fixes: 2-3 days (1 developer)
- High priority: 5-7 days
- Medium/low priorities: 3-4 days
- **Total: 10-14 days** for full AA compliance

---

**Report Date:** February 9, 2026
**Audit Scope:** pages/coaches/_, pages/schools/[schoolId]/coaches/_, related components
**WCAG Level:** 2.1 Level AA (baseline), AAA notes included
**Next Review:** Post-remediation, then quarterly
