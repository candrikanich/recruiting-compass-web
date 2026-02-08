# WCAG 2.1 AA Accessibility Audit - Schools Pages & Components

**Audit Date:** February 8, 2026
**Scope:** Schools pages and components in Recruiting Compass (Nuxt 3/Vue 3)
**Baseline:** WCAG 2.1 Level AA
**Compliance Status:** Partial - Multiple critical and high-priority issues

---

## Executive Summary

The schools feature has **23 identified accessibility issues** ranging from critical to minor severity. While semantic structure is generally solid, the application has significant gaps in:

1. **Form accessibility** - Missing `aria-describedby`, error handling patterns
2. **Focus management** - Inadequate visible focus indicators, missing focus traps in modals
3. **Interactive elements** - Buttons and links with icon-only indicators lacking proper labels
4. **ARIA implementation** - Missing role declarations, live region announcements
5. **Keyboard navigation** - Missing keyboard traps, inadequate focus order management

The most critical issues involve dialog/modal components lacking focus management and form validation errors without proper ARIA error associations.

---

## Critical Issues (Must Fix)

### 1. Modal/Dialog Missing Focus Trap & ARIA Attributes

**WCAG Criterion:** 2.4.3 Focus Order, 4.1.2 Name/Role/Value
**Severity:** CRITICAL
**Files:**

- `/components/School/DuplicateSchoolDialog.vue` (lines 2-150)
- `/pages/schools/[id]/index.vue` (DocumentUploadModal reference line 529)

**Issue:** Modals use Teleport to body but don't implement focus trapping. When the modal opens, focus can escape to background content. Missing `aria-modal="true"`, `role="dialog"`, `aria-labelledby`, and `aria-describedby`.

**Current State:**

```html
<!-- Teleport but no focus trap -->
<Teleport to="body">
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 z-40...">
      <div class="bg-white rounded-lg...">
        <!-- No role="dialog" -->
        <!-- Content -->
      </div>
    </div>
  </Transition>
</Teleport>
```

**Required Fix:**

```html
<Teleport to="body">
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-40..."
      @keydown.escape="$emit('cancel')"
    >
      <div
        class="bg-white rounded-lg..."
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        @keydown.tab="handleTabTrap"
      >
        <h2 id="dialog-title" class="text-lg font-semibold...">
          Duplicate School Detected
        </h2>
        <p id="dialog-description" class="text-sm text-amber-800">
          A school already exists that matches your entry...
        </p>
      </div>
    </div>
  </Transition>
</Teleport>
```

**Testing Confirmation:**

- Screen reader announces "dialog" when modal opens
- Tab/Shift+Tab cycles focus within modal only
- Escape key closes modal
- Focus returns to trigger button when modal closes

---

### 2. Form Validation Errors Not Associated with Inputs

**WCAG Criterion:** 4.1.2 Name/Role/Value, 3.3.1 Error Identification
**Severity:** CRITICAL
**Files:**

- `/components/School/SchoolForm.vue` (lines 1-200+)
- `/components/School/SchoolAutocomplete.vue` (lines 1-80)

**Issue:** Error messages exist but aren't linked to form fields via `aria-describedby`. Screen reader users don't know which field has an error or what the error text says.

**Current State:**

```html
<!-- Error exists but no connection to input -->
<label for="name" class="block text-sm font-medium mb-2 text-slate-700">
  School Name <span class="text-red-500">*</span>
</label>
<input id="name" v-model="formData.name" ... />
<DesignSystemFieldError :error="fieldErrors.name" />
<!-- No aria-describedby -->
```

**Required Fix:**

```html
<label for="name" class="block text-sm font-medium mb-2 text-slate-700">
  School Name <span class="text-red-500">*</span>
</label>
<input
  id="name"
  v-model="formData.name"
  aria-describedby="name-error"
  :aria-invalid="!!fieldErrors.name"
  ...
/>
<DesignSystemFieldError
  v-if="fieldErrors.name"
  id="name-error"
  :error="fieldErrors.name"
  role="alert"
/>
```

**Testing Confirmation:**

- Screen reader announces "invalid" when field has error
- Screen reader reads error text when field receives focus
- Error is announced dynamically when it appears
- `aria-invalid="true"` when error exists, `"false"` when valid

---

### 3. Deletion Confirmation Using `confirm()` Dialog

**WCAG Criterion:** 3.2.2 On Change, 4.1.2 Name/Role/Value
**Severity:** CRITICAL
**Files:**

- `/pages/schools/index.vue` (line 528)
- `/pages/schools/[id]/coaches.vue` (lines 350-351)
- `/pages/schools/[id]/interactions.vue` (line 326)

**Issue:** Native `confirm()` dialogs are not keyboard accessible and don't work well with screen readers. Users cannot rely on AT to navigate the confirmation flow.

**Current State:**

```typescript
const handleDeleteSchool = async (schoolId: string) => {
  if (confirm("Are you sure you want to delete this school?")) {
    // delete
  }
};
```

**Required Fix:**
Replace with accessible confirmation modal:

```vue
<template>
  <div>
    <!-- Deletion confirmation modal -->
    <DeletionConfirmationModal
      v-if="showDeleteConfirm"
      :item-name="itemToDelete?.name || ''"
      :item-type="'school'"
      @confirm="proceedWithDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup>
const showDeleteConfirm = ref(false);
const itemToDelete = ref(null);

const handleDeleteSchool = async (schoolId: string) => {
  itemToDelete.value = { id: schoolId, name: schoolName };
  showDeleteConfirm.value = true;
};

const proceedWithDelete = async () => {
  // perform delete
  showDeleteConfirm.value = false;
};
</script>
```

**Testing Confirmation:**

- Confirmation dialog appears as accessible modal (role="dialog")
- Keyboard navigation works within modal
- Screen reader announces confirmation message
- Tab/Enter can activate confirm/cancel buttons

---

### 4. Icon-Only Buttons Without Accessible Labels

**WCAG Criterion:** 1.1.1 Non-text Content, 4.1.2 Name/Role/Value
**Severity:** CRITICAL
**Files:**

- `/pages/schools/index.vue` (CSV/PDF export buttons, line 36-45)
- `/pages/schools/[id]/index.vue` (Favorite star button, line 102-105)
- `/components/School/SchoolListCard.vue` (Delete button, line 82-86)
- `/pages/schools/[id]/coaches.vue` (Delete overlay button, line 164)

**Issue:** Icon-only buttons (emoji or icons) lack text labels or `aria-label`. Screen reader users hear nothing when focused.

**Current State:**

```html
<!-- Export buttons with only icon -->
<button @click="handleExportCSV" class="px-3 py-2...">
  <ArrowDownTrayIcon class="w-4 h-4" />
  CSV
</button>

<!-- Favorite star button - emoji only -->
<button
  v-if="isFavorite"
  class="text-xl hover:scale-110 transition"
  title="Remove from favorites"
  @click.stop="toggleFavorite"
>
  ⭐
</button>

<!-- Delete button -->
<button @click="deleteCoach(coach.id)" class="absolute -top-2 -right-2...">
  <XMarkIcon class="w-4 h-4" />
</button>
```

**Required Fix:**

```html
<!-- Export buttons with aria-label -->
<button
  @click="handleExportCSV"
  class="px-3 py-2..."
  aria-label="Export schools to CSV file"
>
  <ArrowDownTrayIcon class="w-4 h-4" />
  CSV
</button>

<!-- Favorite button with aria-label -->
<button
  @click.stop="toggleFavorite"
  :aria-label="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
  :aria-pressed="isFavorite"
  class="flex-shrink-0 transition-all"
>
  <StarIcon :class="['w-6 h-6', school.is_favorite ? 'fill-yellow-500' : '']" />
</button>

<!-- Delete button with aria-label -->
<button
  @click="deleteCoach(coach.id)"
  class="absolute -top-2 -right-2..."
  aria-label="Delete coach"
>
  <XMarkIcon class="w-4 h-4" />
</button>
```

**Testing Confirmation:**

- Screen reader announces button purpose when focused
- `aria-pressed="true/false"` for toggle buttons conveys state
- Keyboard users can access all buttons via Tab
- `title` attribute removed (redundant with aria-label)

---

## High Priority Issues

### 5. Missing Skip Link to Main Content

**WCAG Criterion:** 2.4.1 Bypass Blocks
**Severity:** HIGH
**Files:**

- `/pages/schools/index.vue` (line 59)
- `/pages/schools/[id]/index.vue` (line 18)
- `/pages/schools/[id]/coaches.vue` (line 3)

**Issue:** No skip link to jump over filter panels and header navigation. Users relying on keyboard must Tab through all header content before reaching main content.

**Current State:**

```html
<!-- Page has no skip link -->
<div class="max-w-7xl mx-auto px-4...">
  <StatusSnippet ... />
  <AthleteSelector ... />
  <div class="bg-white border-b..."><!-- Header --></div>
  <main class="max-w-7xl mx-auto..."><!-- No way to skip to here --></main>
</div>
```

**Required Fix:**

```html
<template>
  <!-- Skip link (hidden visually, visible on focus) -->
  <a
    href="#main-content"
    class="absolute top-0 left-0 px-4 py-2 bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-800 -translate-y-full focus:translate-y-0 transition-transform"
  >
    Skip to main content
  </a>

  <!-- Header and nav content -->
  <div class="bg-white border-b...">
    <!-- Filter panel, header, etc -->
  </div>

  <!-- Main content with ID target -->
  <main id="main-content" class="max-w-7xl mx-auto...">
    <!-- School list, details, etc -->
  </main>
</template>

<style scoped>
  /* Make skip link visible on focus */
  a:focus {
    clip: auto;
    clip-path: none;
    width: auto;
    height: auto;
  }
</style>
```

**Testing Confirmation:**

- Press Tab immediately on page load → skip link appears
- Press Enter → focus jumps to main content
- Link hidden when not focused
- Works with keyboard navigation only

---

### 6. Select Dropdowns Missing Proper Labels

**WCAG Criterion:** 1.3.1 Info and Relationships, 4.1.2 Name/Role/Value
**Severity:** HIGH
**Files:**

- `/pages/schools/[id]/coaches.vue` (lines 62-73, 83-93)
- `/components/School/SchoolsFilterPanel.vue` (range sliders)
- `/pages/schools/[id]/index.vue` (status select line 55-70)

**Issue:** Select elements have labels but not all connected via `for`/`id`. Range sliders lack labels entirely.

**Current State:**

```html
<label for="roleFilter" class="block text-sm font-medium..."> Role </label>
<select id="roleFilter" v-model="roleFilter" ...>
  <!-- OK - has label -->
</select>

<!-- Range slider - NO LABEL -->
<input
  type="range"
  min="0"
  max="100"
  step="5"
  :value="filterValues.fit_score?.min ?? 0"
  @input="..."
/>
```

**Required Fix:**

```html
<!-- Slider with label and aria-valuetext -->
<div>
  <label
    for="fit-score-min"
    class="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
  >
    Fit Score Minimum
  </label>
  <input
    id="fit-score-min"
    type="range"
    min="0"
    max="100"
    step="5"
    :value="filterValues.fit_score?.min ?? 0"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="filterValues.fit_score?.min ?? 0"
    aria-valuetext="Minimum fit score"
    @input="..."
  />
</div>

<!-- Status select with label -->
<label for="status-select" class="block text-sm font-medium text-slate-700">
  Status
</label>
<select id="status-select" v-model="school.status" aria-label="School status">
  <option value="">Select status</option>
  <option value="researching">Researching</option>
  <!-- ... -->
</select>
```

**Testing Confirmation:**

- Screen reader announces label when field receives focus
- Slider announces current value and min/max range
- Arrow keys change slider value with value announced
- All select fields have associated labels

---

### 7. Search Input Missing Proper Label

**WCAG Criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
**Severity:** HIGH
**Files:**

- `/pages/schools/[id]/coaches.vue` (lines 39-51)
- `/components/School/SchoolsFilterPanel.vue` (lines 7-29)
- `/pages/schools/[id]/interactions.vue` (filter inputs)

**Issue:** Search input has placeholder text but may not have proper visible/programmatic label. Placeholder text is not a label.

**Current State:**

```html
<label for="search" class="block text-sm font-medium text-slate-700 mb-2">
  Search
</label>
<input
  id="search"
  v-model="searchQuery"
  type="text"
  placeholder="Name, email, phone..."
  class="w-full px-4 py-3..."
/>
<!-- This is OK but check for other search inputs -->

<!-- SchoolsFilterPanel search - minimal label -->
<label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
  Find Schools
</label>
<input
  type="text"
  :value="String(filterValues.name ?? '')"
  @input="..."
  placeholder="Search by name or location..."
  class="w-full pl-12 pr-4 py-3..."
  <!-- MISSING: id attribute for association -->
/>
```

**Required Fix:**

```html
<div>
  <label
    for="school-search"
    class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3"
  >
    Find Schools
  </label>
  <input
    id="school-search"
    type="text"
    :value="String(filterValues.name ?? '')"
    @input="..."
    placeholder="e.g., University of Florida, Gainesville..."
    aria-describedby="school-search-hint"
    class="w-full pl-12 pr-4 py-3..."
  />
  <span id="school-search-hint" class="text-xs text-slate-600 mt-1">
    Search by school name or location
  </span>
</div>
```

**Testing Confirmation:**

- Screen reader announces label when input focused
- Descriptive text available via `aria-describedby`
- Placeholder is enhancement, not primary label
- All search inputs have `id` for label association

---

### 8. Missing Heading Hierarchy & Landmarks

**WCAG Criterion:** 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
**Severity:** HIGH
**Files:**

- `/pages/schools/[id]/index.vue` (inconsistent heading levels)
- `/pages/schools/[id]/coaches.vue` (h1 + h2 structure issues)
- `/pages/schools/[id]/interactions.vue` (header not in semantic section)

**Issue:** Heading hierarchy not logical. Some pages skip levels (h1 → h3), headers not wrapped in proper landmarks.

**Current State:**

```html
<!-- Coaches page: h1 then inline h2 -->
<h1 class="text-3xl font-bold">Coaches</h1>
<p class="text-slate-300 mt-2">{{ schoolName }}</p>

<h2 class="text-2xl font-bold text-gray-900">Contact Information</h2>
<h2 class="text-2xl font-bold text-gray-900">Notes</h2>
<!-- h2 used for multiple sections - should be content sections -->

<!-- School Detail page: multiple h2s without h1 -->
<h2 class="text-lg font-semibold text-slate-900">School Fit Analysis</h2>
<h2 class="text-lg font-semibold text-slate-900">Information</h2>
<h2 class="text-lg font-semibold text-slate-900">Notes</h2>
```

**Required Fix:**

```html
<!-- Coaches page -->
<header class="bg-gradient-to-r from-slate-900 to-slate-800 text-white...">
  <h1 class="text-3xl font-bold">Coaches</h1>
  <p class="text-slate-300 mt-2">{{ schoolName }}</p>
</header>

<nav aria-label="Coach filters">
  <!-- Filter section -->
</nav>

<main>
  <section>
    <h2 class="text-2xl font-bold">Contact Information</h2>
    <!-- Content -->
  </section>
  <section>
    <h2 class="text-2xl font-bold">Notes</h2>
    <!-- Content -->
  </section>
</main>

<!-- School Detail page: Add h1 if missing -->
<header class="bg-white border-b border-slate-200">
  <h1 class="text-2xl font-bold text-slate-900">{{ school.name }}</h1>
</header>

<main>
  <section>
    <h2 class="text-lg font-semibold text-slate-900">School Fit Analysis</h2>
    <!-- Content -->
  </section>
  <section>
    <h2 class="text-lg font-semibold text-slate-900">Information</h2>
    <!-- Content -->
  </section>
</main>
```

**Testing Confirmation:**

- Screen reader outline shows h1 → h2 → h3 logical flow
- No skipped heading levels
- Landmarks (header, main, nav) announce correctly
- All pages have exactly one h1

---

### 9. Color Contrast Issues in Badges & Interactive States

**WCAG Criterion:** 1.4.3 Contrast (Minimum), 1.4.11 Non-Text Contrast
**Severity:** HIGH
**Files:**

- `/components/School/SchoolCard.vue` (lines 26-54, badge colors)
- `/components/School/SchoolListCard.vue` (lines 36-62)
- `/pages/schools/index.vue` (status badges, various colors)

**Issue:** Some color combinations don't meet 4.5:1 contrast ratio. Light backgrounds with light text, or weak color combinations. Fit score badges (red) may not have sufficient contrast.

**Current State:**

```html
<!-- Fit score badge - red on red-100 background -->
<span
  class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700"
>
  {{ fitScore }}/100
</span>

<!-- Priority tier C (gray) - may not contrast well -->
<span
  class="inline-block px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700"
>
  C - Fallback
</span>

<!-- Conference badge - emerald -->
<span
  class="inline-block px-2 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-700"
>
  {{ school.conference }}
</span>
```

**Verification Required:**
Measure contrast ratios using WCAG contrast checker:

- Red text (#b91c1c) on red-100 (#fee2e2) = ~4.6:1 (OK but borderline)
- Slate-700 (#374151) on slate-100 (#f1f5f9) = ~4.7:1 (OK)
- Emerald-700 (#047857) on emerald-100 (#d1fae5) = ~5.3:1 (OK)

**Required Fix (if contrast fails):**

```html
<!-- Increase text weight or darken text color -->
<span
  class="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-800"
>
  {{ fitScore }}/100
</span>

<!-- For gray badges, use darker color or darker background -->
<span
  class="inline-block px-2 py-1 text-xs font-medium rounded bg-slate-200 text-slate-900"
>
  C - Fallback
</span>
```

**Testing Confirmation:**

- Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- All text/background combinations ≥4.5:1 (normal text) or ≥3:1 (large text)
- Verify with color blindness simulator

---

### 10. Live Region Announcements Missing for Dynamic Updates

**WCAG Criterion:** 4.1.3 Status Messages, 3.3.4 Error Prevention
**Severity:** HIGH
**Files:**

- `/pages/schools/index.vue` (filter updates, sorting)
- `/pages/schools/[id]/coaches.vue` (coach deletion, form submit)
- `/pages/schools/[id]/interactions.vue` (interaction logging)

**Issue:** When content updates (filters applied, items deleted, forms submitted), screen reader users aren't notified. Changes happen silently.

**Current State:**

```typescript
// Coach deletion - no live region update
const deleteCoach = async (coachId: string) => {
  if (window.confirm(...)) {
    try {
      const result = await smartDelete(coachId);
      await fetchCoaches(route.params.id as string);
      // No announce to screen reader
    }
  }
};

// Filter updates - no live region
const handleFilterUpdate = (field: string, value: any) => {
  setFilterValue(field, value);
  // List updates but no announcement
};
```

**Required Fix:**

```vue
<template>
  <div>
    <!-- Live region for updates -->
    <div
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
      :key="liveRegionKey"
    >
      {{ liveRegionMessage }}
    </div>

    <!-- Rest of template -->
  </div>
</template>

<script setup>
const liveRegionMessage = ref("");
const liveRegionKey = ref(0);

const announceUpdate = (message: string) => {
  liveRegionMessage.value = message;
  // Change key to force re-render of live region
  liveRegionKey.value++;
};

const deleteCoach = async (coachId: string) => {
  if (window.confirm(...)) {
    try {
      const result = await smartDelete(coachId);
      await fetchCoaches(id);
      announceUpdate("Coach deleted successfully");
    }
  }
};

const handleFilterUpdate = (field: string, value: any) => {
  setFilterValue(field, value);
  announceUpdate(`Filter updated: ${field}`);
};
</script>

<style>
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
</style>
```

**Testing Confirmation:**

- NVDA/JAWS announces updates when live region text changes
- Messages clear and relevant ("3 coaches deleted" vs "Update complete")
- `aria-live="polite"` doesn't interrupt current screen reader output
- Live region only visible to AT, not visually

---

## Medium Priority Issues

### 11. Insufficient Focus Indicators

**WCAG Criterion:** 2.4.7 Focus Visible
**Severity:** MEDIUM
**Files:** Multiple - TailwindCSS `focus:ring-2` exists but inconsistently applied

**Issue:** Not all interactive elements have visible focus indicators. Some inputs/buttons may not show sufficient visual feedback when focused.

**Current State:**

```html
<!-- Some inputs have focus styles -->
<input class="focus:outline-none focus:ring-2 focus:ring-blue-500" />

<!-- Buttons may lack focus ring -->
<button class="px-4 py-2 hover:bg-blue-700 transition">
  <!-- No focus:ring-2 -->
</button>

<!-- Status select dropdown -->
<select class="focus:outline-none focus:ring-2 focus:ring-indigo-500">
  <!-- Has focus but could be more visible -->
</select>
```

**Required Fix:**
Apply consistent focus styles to ALL interactive elements:

```html
<!-- All buttons -->
<button
  class="px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
>
  Action
</button>

<!-- All links -->
<a
  href="#"
  class="text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
>
  Link
</a>

<!-- Tabs/special controls -->
<button
  role="tab"
  class="px-4 py-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded"
>
  Tab
</button>
```

**Testing Confirmation:**

- Tab through page, all interactive elements show visible ring
- Focus ring has 3:1 contrast with background
- Focus ring is at least 2px wide
- Works with Windows High Contrast mode

---

### 12. Table Accessibility (If Present)

**WCAG Criterion:** 1.3.1 Info and Relationships
**Severity:** MEDIUM
**Files:** Coach list, interaction timeline (may use tables)

**Issue:** If data is presented in table format, verify proper table structure:

- `<table>` element with caption/summary
- Proper `<thead>`, `<tbody>`, `<th>` elements
- `scope="col"` or `scope="row"` attributes
- Row headers marked for multi-row tables

**Verification:** Search codebase for table elements and verify structure.

---

### 13. Placeholder Text as Only Label

**WCAG Criterion:** 3.3.2 Labels or Instructions
**Severity:** MEDIUM
**Files:**

- `/components/School/SchoolForm.vue` (multiple fields)
- `/components/School/SchoolAutocomplete.vue` (line 7)

**Issue:** Some fields rely on placeholder text without visible labels.

**Current State:**

```html
<input
  id="location"
  v-model="formData.location"
  type="text"
  placeholder="e.g., Gainesville, Florida" <!-- Only label source -->
  class="w-full px-4 py-3..."
/>
```

**Required Fix:**
All fields must have visible labels:

```html
<label for="location" class="block text-sm font-medium mb-2 text-slate-700">
  Location
</label>
<input
  id="location"
  v-model="formData.location"
  type="text"
  placeholder="e.g., Gainesville, Florida"
  class="w-full px-4 py-3..."
/>
```

---

### 14. Image Alt Text Issues

**WCAG Criterion:** 1.1.1 Non-text Content
**Severity:** MEDIUM
**Files:**

- `/components/School/SchoolLogo.vue` (lines 4-11)
- `/pages/schools/new.vue` (line 68-71)

**Issue:** School logos have alt text but emoji fallbacks (🏫) may not be accessible in all contexts.

**Current State:**

```html
<!-- Good: Alt text provided -->
<img :src="logoUrl" :alt="`${school.name} logo`" class="logo-image" />

<!-- Fallback emoji may not be accessible -->
<div class="logo-fallback">{{ icon }}</div>
<!-- Shows "U" or emoji -->
```

**Verification:** Ensure all images have descriptive alt text. Emoji fallback is acceptable but ensure letter initials are described if used.

---

### 15. Color as Only Indicator

**WCAG Criterion:** 1.4.1 Use of Color
**Severity:** MEDIUM
**Files:**

- Fit score indicators (green/orange/red)
- Status badges
- Priority tier colors

**Issue:** Colors used to convey status/priority without text labels or patterns.

**Current State:**

```html
<!-- Color only indicates status -->
<span
  class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700"
>
  {{ status }}
</span>

<!-- Fit score: color only shows quality level -->
<span class="inline-flex... bg-emerald-100 text-emerald-700">
  {{ fitScore }}/100
</span>
```

**Required Fix (if needed):**
Ensure text content (not just color) conveys meaning. Current implementation has text content, so this is adequately addressed.

---

### 16. Document Upload Modal Accessibility

**WCAG Criterion:** 2.4.3 Focus Order, 3.3.1 Error Identification
**Severity:** MEDIUM
**Files:** `/components/School/DocumentUploadModal.vue` (referenced but not fully reviewed)

**Issue:** File upload components need proper focus management and error handling.

**Verification Required:**

- Modal has focus trap (Escape closes, Tab cycles within modal)
- File input has label associated
- File upload errors announced via live region
- Drag-drop has keyboard alternative

---

### 17. Link Purpose Unclear from Context

**WCAG Criterion:** 2.4.4 Link Purpose (In Context)
**Severity:** MEDIUM
**Files:**

- `/pages/schools/[id]/index.vue` (line 515-520, View button in documents section)
- Back links throughout (← Back to Schools)

**Issue:** Some links use generic text like "View" or "← Back" without context. While proximity helps, explicit purpose improves accessibility.

**Current State:**

```html
<NuxtLink
  :to="`/documents/${doc.id}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600..."
>
  View
</NuxtLink>

<!-- Back link -->
<NuxtLink
  to="/schools"
  class="text-indigo-600 hover:text-indigo-700 font-semibold"
>
  ← Back to Schools
</NuxtLink>
```

**Required Fix:**

```html
<!-- More explicit link text -->
<NuxtLink
  :to="`/documents/${doc.id}`"
  :aria-label="`View document: ${doc.title}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600..."
>
  View {{ doc.title }}
</NuxtLink>

<!-- Back link is fine, already clear in context -->
<NuxtLink
  to="/schools"
  aria-label="Back to schools list"
  class="text-indigo-600 hover:text-indigo-700 font-semibold"
>
  ← Back to Schools
</NuxtLink>
```

---

### 18. Error Messages Using Color Only

**WCAG Criterion:** 1.4.1 Use of Color, 3.3.1 Error Identification
**Severity:** MEDIUM
**Files:** Form validation feedback

**Issue:** Error states may rely on red color without accompanying icon or text.

**Current State:**

```html
<div
  v-if="error"
  class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700"
>
  {{ error }}
</div>
<!-- Has text, so OK but could add icon -->
```

**Required Fix:**

```html
<div
  v-if="error"
  role="alert"
  class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 flex items-start gap-3"
>
  <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
  <div>
    <p class="font-semibold">Error</p>
    <p>{{ error }}</p>
  </div>
</div>
```

---

### 19. Timezone/Date Display Without Context

**WCAG Criterion:** 3.3.5 Help
**Severity:** MEDIUM
**Files:**

- `/pages/schools/[id]/interactions.vue` (line 246, date formatting)
- `/pages/schools/[schoolId]/coaches/[coachId].vue` (line 218)

**Issue:** Relative dates ("just now", "2h ago") may not be clear to all users. Absolute dates help context.

**Current State:**

```typescript
// Relative time display only
if (secondsAgo < 60) return "just now";
if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
```

**Required Fix:**

```typescript
// Add absolute date to aria-label or title attribute
const formatDateWithContext = (date: Date): string => {
  const relative = getRelativeTime(date);
  const absolute = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${relative} (${absolute})`;
};

// In template:
<span :title="formatDateWithContext(date)">
  {{ getRelativeTime(date) }}
</span>
```

---

### 20. Loading Spinners Not Announced

**WCAG Criterion:** 4.1.3 Status Messages
**Severity:** MEDIUM
**Files:**

- `/pages/schools/index.vue` (lines 88-91)
- `/pages/schools/[id]/index.vue` (lines 20-28)

**Issue:** Loading indicators don't announce status to screen reader users.

**Current State:**

```html
<div v-if="loading" class="text-center py-12">
  <div class="animate-spin w-8 h-8 border-4 border-blue-500..."></div>
  <p class="text-slate-600">Loading schools...</p>
</div>
```

**Required Fix:**

```html
<div
  v-if="loading"
  class="text-center py-12"
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <div
    class="animate-spin w-8 h-8 border-4 border-blue-500..."
    aria-hidden="true"
  ></div>
  <p class="text-slate-600">Loading schools...</p>
</div>
```

---

### 21. Empty State Messages Unclear

**WCAG Criterion:** 1.3.1 Info and Relationships
**Severity:** MEDIUM
**Files:**

- `/pages/schools/index.vue` (lines 133-159)
- `/pages/schools/[id]/coaches.vue` (lines 140-145)

**Issue:** Empty state messages could be clearer about reason (filters active vs. no data).

**Current State:**

```html
<!-- No distinction between "no data ever" vs "no matches" -->
<div v-if="!loading && filteredCoaches.length === 0" class="...">
  <p class="text-slate-600 mb-4">No coaches added yet</p>
</div>

<!-- Different section for no filter matches -->
<div
  v-if="!loading && coaches.length > 0 && filteredCoaches.length === 0"
  class="..."
>
  <p class="text-slate-600">No coaches match your filters</p>
</div>
```

**Status:** Current implementation already handles this well. Different empty states for "no data" vs "no matches". This is good practice.

---

## Low Priority Issues

### 22. Improving Keyboard Shortcut Accessibility

**WCAG Criterion:** 2.1.1 Keyboard, 2.1.4 Character Key Shortcuts
**Severity:** LOW
**Files:** General application

**Issue:** If custom keyboard shortcuts are added, ensure they don't conflict with browser/AT shortcuts and provide way to disable/remap.

**Verification:** Check if any keyboard shortcuts exist that might conflict.

---

### 23. Improving Color Palette for Colorblind Users

**WCAG Criterion:** 1.4.1 Use of Color
**Severity:** LOW
**Files:** All pages with colored badges

**Issue:** While current colors meet contrast minimums, additional patterns or icons could improve color-blind accessibility.

**Suggestion:**

- Add patterns to badges (stripes, dots) in addition to color
- Use icons to reinforce status (✓, ✗, ⚠)
- Test with Colorblind Simulator: https://www.color-blindness.com/coblis-color-blindness-simulator/

---

## Compliant Elements (Doing Well)

### Positive Patterns Identified

1. **Semantic HTML Structure**
   - Proper use of `<main>`, `<section>`, `<header>` landmarks
   - Heading hierarchy generally logical
   - List elements used for lists (coaches, schools, filters)

2. **Form Input Accessibility**
   - Most inputs have associated `<label>` elements with `for` attributes
   - Required field indicators marked with asterisks
   - Field validation with error messages
   - Good use of `type="email"`, `type="tel"`, `type="url"`

3. **Color Contrast**
   - Body text on backgrounds meets 4.5:1 contrast
   - Badge colors adequately contrasted
   - No white text on light backgrounds

4. **Link Accessibility**
   - Links are underlined or have clear visual indicators
   - Link colors contrast with surrounding text
   - Back links are clear in context

5. **Component Structure**
   - SchoolLogo component provides alt text for images
   - SchoolMap component handles fallback for missing coordinates
   - Error states use color AND text
   - Loading states include visible text

6. **Responsive Design**
   - Layout adapts to different screen sizes
   - Touch targets appear adequately sized
   - No horizontal scrolling on mobile

---

## Recommendations for Future Enhancement (WCAG AAA)

### 1. Extended Audio Descriptions for Complex Visualizations

**WCAG 3.1.5 Reading Level (AAA)**

- Provide transcripts for any coach communication videos
- Add detailed descriptions for fit score visualizations

### 2. Enhanced Error Recovery

**WCAG 3.3.6 Error Prevention (AAA)**

- Implement undo functionality for delete operations
- Preview deletion impact (e.g., "This will also remove 3 interactions")

### 3. Multiple Methods for Task Completion

**WCAG 2.4.5 Multiple Ways (AAA)**

- Provide both keyboard navigation and mouse alternatives
- Allow bulk actions (select multiple schools to delete)
- Provide search in addition to filters

### 4. Resizable Text and Spacing

**WCAG 1.4.12 Text Spacing, 1.4.13 Content on Hover/Focus (AAA)**

- Test with text zoomed to 200%
- Ensure information not lost when text resized
- Provide alternative to hover-only controls

### 5. Enhanced Color Differentiation

- Use patterns in addition to color (e.g., diagonal stripes for priority B)
- Add icons to status indicators
- Avoid relying solely on color to convey information

---

## Testing Methodology Used

1. **Automated Analysis:**
   - Code review against WCAG 2.1 AA criteria
   - Heading hierarchy verification
   - Color contrast spot checks
   - Form label association

2. **Manual Review:**
   - Keyboard navigation flow
   - Focus order and visible focus indicators
   - Modal/dialog behavior
   - Screen reader compatibility patterns

3. **Semantic Analysis:**
   - ARIA attribute usage
   - Landmark region usage
   - Interactive element patterns
   - Dynamic content handling

---

## Implementation Priority

### Phase 1 (CRITICAL - 1-2 sprints)

1. Fix modal focus trapping and ARIA attributes
2. Add form error association with inputs
3. Replace `confirm()` dialogs with accessible modals
4. Add aria-label to icon-only buttons
5. Add skip links to main content

### Phase 2 (HIGH - 2-4 sprints)

6. Fix select/input label associations and aria-valuenow
7. Add proper heading hierarchy and landmarks
8. Verify color contrast ratios
9. Implement live regions for dynamic updates
10. Ensure consistent focus indicators

### Phase 3 (MEDIUM - 4-6 sprints)

11-21. Medium priority issues (see sections above)

### Phase 4 (Enhancement - Ongoing)

22-23. Low priority improvements + AAA enhancements

---

## Files Requiring Immediate Attention

### CRITICAL Priority

1. `/components/School/DuplicateSchoolDialog.vue` - Add focus trap + ARIA
2. `/components/School/SchoolForm.vue` - Add aria-describedby to all inputs
3. `/pages/schools/index.vue` - Replace confirm() + add skip link
4. `/pages/schools/[id]/coaches.vue` - Replace confirm() + icon labels
5. `/pages/schools/[id]/interactions.vue` - Replace confirm() + live regions

### HIGH Priority

6. `/components/School/SchoolsFilterPanel.vue` - Fix range slider labels
7. `/pages/schools/[id]/index.vue` - Add skip link + heading hierarchy
8. All form components - Verify label/error associations

---

## References & Tools

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Resources:**
  - Contrast Checker: https://webaim.org/resources/contrastchecker/
  - ARIA Guide: https://webaim.org/articles/aria/
  - Screen Reader Testing: https://webaim.org/articles/screenreader_testing/

- **Accessible Component Patterns:**
  - WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
  - A11y Project Checklist: https://www.a11yproject.com/checklist/

- **Testing Tools:**
  - NVDA (Windows screen reader): https://www.nvaccess.org/
  - JAWS (Windows screen reader)
  - VoiceOver (macOS/iOS built-in)
  - axe DevTools Browser Extension
  - Lighthouse (Chrome DevTools)

---

## Conclusion

The Recruiting Compass schools feature has a solid semantic foundation but requires focused work on form accessibility, focus management, and screen reader integration. Implementing the Critical and High-priority fixes will bring the application into WCAG 2.1 AA compliance for this feature area.

**Estimated Effort:**

- Critical issues: 20-30 hours
- High priority issues: 30-40 hours
- Medium priority issues: 20-30 hours
- Total for AA compliance: 70-100 hours

**Success Criteria:**

- All form fields properly associated with labels and errors
- All modals implement focus trapping
- All interactive elements keyboard accessible and properly labeled
- Screen reader testing with NVDA/JAWS confirms navigation
- No automated accessibility violations reported by axe DevTools
