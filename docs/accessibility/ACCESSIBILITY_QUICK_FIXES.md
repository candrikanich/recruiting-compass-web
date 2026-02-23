# Accessibility Quick Fixes - Priority Implementation Guide

**Last Updated:** February 10, 2026

This document provides quick fixes for the most critical accessibility issues found in the audit. These can be implemented incrementally without refactoring.

---

## CRITICAL FIXES (Do First - 2-3 hours total)

### 1. Fix DesignSystemFieldError (5 min)

**File:** `/components/DesignSystem/FieldError.vue`
**Impact:** Affects all three forms

**Current:**

```html
<div v-if="error" :id="id" role="alert" class="..."></div>
```

**Fixed:**

```html
<div
  v-if="error"
  :id="id"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  class="..."
></div>
```

**Why:** Screen readers will announce field errors immediately on validation.

---

### 2. Fix FormErrorSummary (15 min)

**File:** `/components/Validation/FormErrorSummary.vue`
**Impact:** Affects all three forms

**Current:**

```vue
<ul class="text-sm text-red-700 space-y-1">
  <li v-for="error in errors" :key="error.field" class="flex items-start gap-2">
    <strong>{{ formatFieldName(error.field) }}:</strong>
    {{ error.message }}
  </li>
</ul>
```

**Fixed:**

```vue
<ul class="text-sm text-red-700 space-y-1">
  <li v-for="error in errors" :key="error.field" class="flex items-start gap-2">
    <button
      type="button"
      @click="focusField(error.field)"
      class="font-semibold text-red-700 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
    >
      {{ formatFieldName(error.field) }}
    </button>
    : {{ error.message }}
  </li>
</ul>

<script setup>
const focusField = (fieldName: string) => {
  const fieldId = fieldName.replace(/\./g, '-');
  const element = document.getElementById(fieldId) ||
                  document.querySelector(`[name="${fieldName}"]`);
  element?.focus();
};
</script>
```

**Why:** Keyboard users can click error messages to jump to problematic fields.

---

### 3. Add Required Field Announcements (30 min)

**Affects:** All three forms - SchoolForm, CoachForm, InteractionForm

**For each required field, change from:**

```html
<label for="name" class="...">
  School Name <span class="text-red-500">*</span>
</label>
```

**To:**

```html
<label for="name" class="...">
  School Name
  <span class="text-red-500" aria-hidden="true">*</span>
  <span class="sr-only">(required)</span>
</label>
```

**Affected locations:**

- `/components/School/SchoolForm.vue` - lines 70, 245, 250
- `/components/Coach/CoachForm.vue` - lines 12, 38, 64
- `/components/Interaction/InteractionForm.vue` - lines 150, 177

**Why:** Screen readers announce "(required)" for each required field.

---

### 4. Add aria-busy to Submit Buttons (10 min)

**Affects:** All three forms

**Current:**

```html
<button type="submit" :disabled="loading">
  {{ loading ? "Adding..." : "Add School" }}
</button>
```

**Fixed:**

```html
<button type="submit" :aria-busy="loading" :disabled="loading">
  {{ loading ? "Adding..." : "Add School" }}
</button>
```

**Locations:**

- `/components/School/SchoolForm.vue` - line 326
- `/components/Coach/CoachForm.vue` - line 181
- `/components/Interaction/InteractionForm.vue` - line 300

**Why:** Screen readers announce when form is processing.

---

### 5. Add Role/Modal Attributes to AddCoachModal (20 min)

**File:** `/components/Coach/AddCoachModal.vue`

**Current:**

```html
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
>
  <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
    <div class="bg-gradient-to-r ... px-6 py-4 text-white">
      <h2 class="text-xl font-bold">Add New Coach</h2>
    </div>
  </div>
</div>
```

**Fixed:**

```html
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
>
  <div
    class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="bg-gradient-to-r ... px-6 py-4 text-white">
      <h2 id="modal-title" class="text-xl font-bold">Add New Coach</h2>
    </div>
  </div>
</div>
```

**Why:** Screen readers announce modal properly; accessible title provided.

---

### 6. Fix Radio Button Grouping (15 min)

**File:** `/components/Interaction/InteractionForm.vue` - lines 176-211

**Current:**

```html
<label class="block text-sm font-medium text-slate-700">
  Direction <span class="text-red-500">*</span>
</label>
<div class="mt-2 flex gap-4">
  <label class="group flex cursor-pointer items-center gap-3">
    <input v-model="form.direction" type="radio" value="outbound" />
    <span>Outbound (We initiated)</span>
  </label>
  ...
</div>
```

**Fixed:**

```html
<fieldset>
  <legend class="block text-sm font-medium text-slate-700 mb-3">
    Direction
    <span class="text-red-500" aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </legend>
  <div class="flex gap-4">
    <label class="group flex cursor-pointer items-center gap-3">
      <input
        v-model="form.direction"
        type="radio"
        value="outbound"
        required
        aria-required="true"
      />
      <span>Outbound (We initiated)</span>
    </label>
    <label class="group flex cursor-pointer items-center gap-3">
      <input
        v-model="form.direction"
        type="radio"
        value="inbound"
        required
        aria-required="true"
      />
      <span>Inbound (They initiated)</span>
    </label>
  </div>
</fieldset>
```

**Why:** Screen readers announce radio buttons as a group.

---

## HIGH PRIORITY FIXES (Next sprint - 2-3 hours)

### 7. Fix Select Dropdown Focus Ring (Multiple Locations)

**Affected files:**

- `/components/Coach/CoachForm.vue` - line 21
- Any other selects using `focus:ring-blue-500/20`

**Current:**

```html
<select
  class="... focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
></select>
```

**Fixed:**

```html
<select
  class="... focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none"
></select>
```

**Why:** Blue ring at 20% opacity is too subtle; full opacity (100%) is more visible.

---

### 8. Improve Color Contrast (1 hour)

**Search for and fix:**

- `text-blue-600` → `text-blue-700` (for "(auto-filled)" label)
- `text-green-700` → `text-green-800` (for success messages)
- `placeholder:text-slate-400` → `placeholder:text-slate-600` (for input placeholders)

**Affected files:**

- `/components/School/SchoolForm.vue` - lines 75, 156, 319
- `/components/Coach/CoachForm.vue` - label text using `text-slate-600`
- `/components/Interaction/InteractionForm.vue` - optional field labels

**Why:** Ensures 4.5:1 minimum contrast ratio for readability.

---

### 9. Add aria-live to Conditional Sections (30 min)

**File:** `/pages/coaches/new.vue`

**Current:**

```html
<div v-else class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
  <p class="text-sm text-slate-600">Please select a school to continue</p>
</div>
```

**Fixed:**

```html
<div
  v-else
  class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
  role="status"
  aria-live="polite"
  aria-label="School selection required"
>
  <p class="text-sm text-slate-600">Please select a school to continue</p>
</div>
```

**Also add to coach form appearance:**

```html
<div v-if="selectedSchoolId">
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
    School selected. Coach form now available.
  </div>
  <CoachForm ... />
</div>
```

**Why:** Screen readers announce when conditional sections appear/disappear.

---

### 10. Standardize Input Padding (20 min)

**File:** `/components/Coach/CoachForm.vue`

**Change all inputs/selects from:**

```html
class="px-4 py-2 ..."
```

**To:**

```html
class="px-4 py-3 ..."
```

**Lines affected:** 49, 75, 97, 113, 135, 154, 171

**Why:** Ensures 44x44px minimum touch target size for mobile users.

---

## MEDIUM PRIORITY FIXES (Sprint 3)

### 11. Add Skip Link Focus Management

**File:** `/pages/coaches/new.vue`

```vue
<script setup>
const mainContentRef = ref<HTMLElement | null>(null);

const handleSkipLink = (e: Event) => {
  e.preventDefault();
  mainContentRef.value?.focus();
};
</script>

<template>
  <a
    href="#main-content"
    @click="handleSkipLink"
    class="sr-only focus:not-sr-only ..."
  >
    Skip to main content
  </a>

  <FormPageLayout
    ref="mainContentRef"
    id="main-content"
    tabindex="-1"
    ...
  ></FormPageLayout>
</template>
```

---

### 12. Fix Coach Select Grouping

**File:** `/components/Form/CoachSelect.vue`

```html
<select id="coach-select" ...>
  <option value="">Select a coach (optional)</option>
  <optgroup label="Available Coaches">
    <option v-for="coach in filteredCoaches" :key="coach.id" :value="coach.id">
      {{ coach.first_name }} {{ coach.last_name }} - {{ getRoleLabel(coach.role)
      }}
    </option>
  </optgroup>
  <optgroup label="Other Options">
    <option value="other">Other coach (not listed)</option>
    <option value="add-new">Add new coach</option>
  </optgroup>
</select>
<p id="coach-help" class="sr-only">
  Select a coach from the list, choose "Other coach" if not listed, or "Add new
  coach" to create one.
</p>
```

---

### 13. Add Format Help to Date Input

**File:** `/components/Interaction/InteractionForm.vue`

```html
<label for="occurred_at" class="block text-sm font-medium text-slate-700">
  Date & Time
  <span class="text-red-500" aria-hidden="true">*</span>
  <span class="sr-only">(required)</span>
</label>
<input
  id="occurred_at"
  v-model="form.occurred_at"
  type="datetime-local"
  required
  aria-required="true"
  aria-describedby="datetime-help"
  class="..."
/>
<p id="datetime-help" class="mt-1 text-xs text-slate-600">
  Select a date and time using the picker, or enter: YYYY-MM-DD HH:MM
</p>
```

---

## Testing Commands

After each fix, run:

```bash
# Type checking
npm run type-check

# Linting
npm run lint:fix

# Unit tests
npm run test

# Browser testing
npm run dev
# Then open browser dev tools > Accessibility > Run axe DevTools
```

---

## Verification Checklist

- [ ] All required fields announced with "(required)"
- [ ] Form errors announced immediately on validation
- [ ] Submit button announces loading state with aria-busy
- [ ] Radio buttons grouped with fieldset/legend
- [ ] Modals have role="dialog" and aria-modal="true"
- [ ] Select dropdowns have visible focus ring
- [ ] All text meets 4.5:1 contrast minimum
- [ ] Conditional sections announced with aria-live
- [ ] Touch targets are 44x44px minimum
- [ ] Skip link moves focus to main content

---

## Testing with Screen Readers

### Quick Test (5 min)

1. Tab through form
2. Listen for required field announcements
3. Fill field and blur to trigger validation
4. Listen for error announcement
5. Submit form
6. Listen for loading state announcement

### Full Test (30 min)

Use NVDA (Windows) or VoiceOver (Mac):

1. Press SR+H to hear page heading
2. Tab through all form fields
3. Fill in and trigger validation
4. Listen for error summary
5. Click error message to jump to field
6. Submit form and verify completion message

---

## Priority Implementation Order

**Sprint 1 (CRITICAL - 2-3 hours):**

1. Fix DesignSystemFieldError aria-live
2. Fix FormErrorSummary links
3. Add required field announcements
4. Add aria-busy to submit buttons
5. Add modal role/aria attributes
6. Fix radio button grouping

**Sprint 2 (HIGH - 2-3 hours):** 7. Fix select focus rings 8. Improve color contrast 9. Add aria-live to conditionals 10. Standardize input padding

**Sprint 3 (MEDIUM - 2-3 hours):**
11-13. Remaining medium-priority fixes

---

**Estimated Total Time:** 6-9 hours of development
**Estimated Testing Time:** 3-4 hours (automated + manual)
**Target Completion:** 1-2 weeks at 3-4 hours/day
