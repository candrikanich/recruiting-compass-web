# WCAG 2.1 AA Accessibility Audit Report

**Recruiting Compass - Add Pages Form Audit**
**Date:** February 10, 2026
**Pages Audited:**

- `/pages/schools/new.vue` (Add School)
- `/pages/coaches/new.vue` (Add Coach)
- `/pages/interactions/add.vue` (Log Interaction)

---

## Executive Summary

Overall Compliance Status: **PARTIAL - WCAG 2.1 AA**

The three add/form pages demonstrate solid foundational accessibility practices with several important strengths and critical gaps. The application implements:

**Strengths:**

- Proper semantic form structure with labels and inputs
- ARIA attributes for form validation (aria-invalid, aria-describedby)
- Error summary component with alert role and live region support
- Skip link implementation on coaches page
- Keyboard focus indicators on interactive elements
- Field-level error messages properly associated

**Critical Issues (Must Fix):**

- Missing focus management in modals (no focus trap, no return focus)
- Incomplete ARIA labeling on required field indicators
- No announce mechanism for form submission states
- Missing aria-label on icon-only buttons
- Insufficient contrast in several UI elements
- No keyboard shortcut documentation

**High Priority Issues:**

- Radio button group not properly labeled
- Select dropdowns missing visual feedback for disabled state
- Error messages not announced to screen readers in real-time
- Modal overlay lacks keyboard escape support documentation

---

## Detailed Findings by Page

### 1. ADD SCHOOL PAGE (`/pages/schools/new.vue`)

#### File Location

`/pages/schools/new.vue`
`/components/School/SchoolForm.vue`
`/components/School/SchoolAutocomplete.vue` (referenced, not reviewed)

#### Form Structure Overview

- Autocomplete toggle checkbox
- School name field with autocomplete integration
- Location, Division, Conference fields
- Website, Twitter, Instagram fields
- Notes textarea
- Status select dropdown
- Submit/Cancel buttons

---

### WCAG Compliance Issues - Add School

#### CRITICAL ISSUES

**1. Missing Focus Management in Parent Component**

- **Location:** `/pages/schools/new.vue` line 8
- **WCAG Criterion:** 2.4.3 Focus Order
- **Severity:** CRITICAL
- **Issue:** FormPageLayout wraps entire form but no focus management on mount
- **Impact:** Screen reader users may not know where focus is positioned when page loads
- **Current State:**
  ```html
  <FormPageLayout back-to="/schools" ...>
    <!-- form content -->
  </FormPageLayout>
  ```
- **Required Fix:** Set focus to page title or first interactive element on mount

  ```vue
  <script setup>
  const pageTitle = (ref < HTMLElement) | (null > null);

  onMounted(() => {
    // Focus page title for announcement
    pageTitle.value?.focus();
  });
  </script>

  <template>
    <FormPageLayout>
      <h1 ref="pageTitle" tabindex="-1" class="sr-only">Add New School</h1>
      <!-- form -->
    </FormPageLayout>
  </template>
  ```

- **Testing Confirmation:** Use screen reader to verify page title is announced on load; use keyboard to confirm focus position

**2. Autocomplete Toggle Missing Group Label**

- **Location:** `/pages/schools/new.vue` lines 10-22
- **WCAG Criterion:** 1.3.1 Info and Relationships
- **Severity:** CRITICAL
- **Issue:** Checkbox label "Search college database" exists but checkbox is not in a fieldset with legend for the toggle concept
- **Impact:** Screen reader users cannot understand that this controls form behavior (autocomplete vs manual)
- **Current State:**
  ```html
  <label class="flex items-center gap-3 cursor-pointer group">
    <input v-model="useAutocomplete" type="checkbox" ... />
    <span>Search college database</span>
  </label>
  ```
- **Required Fix:** Add aria-describedby to explain toggle effect
  ```html
  <fieldset class="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
    <legend class="text-sm font-medium text-slate-700 mb-3">
      Data Entry Method
    </legend>
    <label class="flex items-center gap-3 cursor-pointer group">
      <input
        v-model="useAutocomplete"
        type="checkbox"
        class="w-5 h-5 text-blue-600 border-2 border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
        aria-describedby="autocomplete-desc"
      />
      <span
        class="text-slate-700 font-medium group-hover:text-blue-600 transition-colors"
      >
        Search college database
      </span>
    </label>
    <p id="autocomplete-desc" class="sr-only">
      Enable to search a college database for auto-populated school information,
      or disable to manually enter all school details.
    </p>
  </fieldset>
  ```
- **Testing Confirmation:** Screen reader should announce fieldset legend, checkbox state, and description

**3. Required Field Indicator Not Properly Announced**

- **Location:** `/components/School/SchoolForm.vue` lines 70-77, 245-262
- **WCAG Criterion:** 1.3.1 Info and Relationships (related to 3.3.2 Labels or Instructions)
- **Severity:** CRITICAL
- **Issue:** Red asterisk "\*" used for required field indicator but not accessible to screen readers
  ```html
  <label for="name" class="block text-sm font-medium mb-2 text-slate-700">
    School Name <span class="text-red-500">*</span>
  </label>
  ```
- **Impact:** Screen reader users cannot identify required fields; red asterisk is visual-only
- **Current State:** Asterisk is visible but not announced
- **Required Fix:** Add aria-required or use sr-only text

  ```vue
  <!-- OPTION 1: Use aria-required attribute -->
  <label for="name" class="block text-sm font-medium mb-2 text-slate-700">
    School Name
  </label>
  <input
    id="name"
    v-model="formData.name"
    type="text"
    required
    aria-required="true"
    class="w-full ..."
  />
  <span class="text-red-500" aria-hidden="true">*</span>

  <!-- OPTION 2: Add sr-only text (more explicit) -->
  <label for="name" class="block text-sm font-medium mb-2 text-slate-700">
    School Name
    <span class="text-red-500" aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </label>
  ```

- **Testing Confirmation:** Screen reader should announce "(required)" for all required fields; aria-required="true" should be detected in accessibility tree

**4. Missing ARIA Labels on Icon-Only Clear Button**

- **Location:** `/pages/schools/new.vue` lines 55-61
- **WCAG Criterion:** 1.1.1 Non-text Content, 4.1.2 Name, Role, Value
- **Severity:** CRITICAL
- **Issue:** "Clear" button has text content but the function is ambiguous for screen readers
  ```html
  <button
    type="button"
    @click="clearSelection"
    class="flex-shrink-0 text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
  >
    Clear
  </button>
  ```
- **Impact:** Screen reader announces "Clear" but context is unclear - clear what?
- **Current State:** Button text only
- **Required Fix:** Add aria-label for clarity
  ```html
  <button
    type="button"
    @click="clearSelection"
    aria-label="Clear selected college and reload form"
    class="flex-shrink-0 text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
  >
    Clear
  </button>
  ```
- **Testing Confirmation:** Screen reader should announce "Clear selected college and reload form, button"

**5. No Live Region for Loading State**

- **Location:** `/pages/schools/new.vue` lines 37-46
- **WCAG Criterion:** 4.1.3 Status Messages (WCAG 2.1 Level AA)
- **Severity:** CRITICAL
- **Issue:** Loading indicator text appears but is not announced to screen readers in real-time
  ```html
  <div v-if="collegeDataLoading" class="mt-2 text-xs text-blue-600">
    Fetching college data...
  </div>
  ```
- **Impact:** Screen reader users don't know data is loading; they may think page is stuck
- **Current State:** Text is visual only, no aria-live
- **Required Fix:** Add aria-live="polite" and aria-atomic
  ```html
  <div
    v-if="collegeDataLoading"
    class="mt-2 text-xs text-blue-600"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    Fetching college data...
  </div>
  <div
    v-else-if="collegeScorecardFetched"
    class="mt-2 text-xs text-green-700 flex items-center gap-1"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <CheckIcon class="w-3 h-3" aria-hidden="true" />
    <span>College data and map coordinates loaded</span>
  </div>
  ```
- **Testing Confirmation:** Screen reader should announce "Fetching college data" status update without requiring focus shift

**6. Form Submission Loading State Not Announced**

- **Location:** `/components/School/SchoolForm.vue` lines 326-333
- **WCAG Criterion:** 4.1.3 Status Messages, 2.4.8 Focus Visible
- **Severity:** HIGH
- **Issue:** Submit button text changes to "Adding..." but no aria-busy attribute or busy indicator
  ```html
  <button
    type="submit"
    :disabled="loading || hasErrors || !formData.name"
    class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
  >
    {{ loading ? "Adding..." : "Add School" }}
  </button>
  ```
- **Impact:** Screen reader users cannot determine that form is processing; button appears disabled but no indication why
- **Current State:** Loading state inferred from button text and disabled attribute only
- **Required Fix:** Add aria-busy and role="status"
  ```html
  <button
    type="submit"
    :disabled="loading || hasErrors || !formData.name"
    :aria-busy="loading"
    aria-label="Add School"
    class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
  >
    {{ loading ? "Adding..." : "Add School" }}
  </button>
  ```
- **Testing Confirmation:** Screen reader should announce aria-busy="true" when loading begins

---

#### HIGH PRIORITY ISSUES

**1. Select Dropdown Custom Background Not Keyboard Accessible**

- **Location:** `/components/School/SchoolForm.vue` lines 355-362
- **WCAG Criterion:** 2.1.1 Keyboard
- **Severity:** HIGH
- **Issue:** Custom dropdown styling uses SVG background image which may interfere with keyboard navigation and visibility
  ```typescript
  const selectDropdownStyle = computed(() => ({
    backgroundImage: `url("data:image/svg+xml,...")`,
    backgroundPosition: "right 0.75rem center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "1.5em 1.5em",
    paddingRight: "2.5rem",
  }));
  ```
- **Impact:** Custom background may not appear in high contrast mode; arrow icon may be invisible to some users
- **Current State:** SVG background for dropdown arrow, no fallback
- **Required Fix:** Use safer approach with appearance-none and CSS pseudo-element
  ```vue
  <template>
    <div class="relative">
      <select
        id="division"
        v-model="formData.division"
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 pr-10"
      >
        <!-- options -->
      </select>
      <!-- Decorative arrow -->
      <svg
        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M6 8l4 4 4-4"
        />
      </svg>
    </div>
  </template>
  ```
- **Testing Confirmation:** Test in Windows High Contrast mode; verify arrow icon is visible; keyboard navigation still works

**2. Auto-filled Field Indicator Not Accessible**

- **Location:** `/components/School/SchoolForm.vue` lines 14-18, 46-50
- **WCAG Criterion:** 1.3.1 Info and Relationships
- **Severity:** HIGH
- **Issue:** "(auto-filled)" text label is visual only, not accessible to screen readers as metadata
  ```html
  <label for="name" class="block text-sm font-medium mb-2 text-slate-700">
    School Name <span class="text-red-500">*</span>
    <span v-if="isAutoFilled('name')" class="text-xs text-blue-600 font-normal"
      >(auto-filled)</span
    >
  </label>
  ```
- **Impact:** Screen reader users don't know field was pre-populated by system
- **Current State:** Visual indicator only in label
- **Required Fix:** Add aria-describedby or metadata attribute
  ```html
  <label for="name" class="block text-sm font-medium mb-2 text-slate-700">
    School Name
    <span class="text-red-500" aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </label>
  <input
    id="name"
    v-model="formData.name"
    type="text"
    required
    aria-required="true"
    :aria-describedby="isAutoFilled('name') ? 'name-autofill' : undefined"
    class="w-full ..."
  />
  <span v-if="isAutoFilled('name')" id="name-autofill" class="sr-only">
    This field was auto-filled from the selected college
  </span>
  ```
- **Testing Confirmation:** Screen reader should announce auto-fill status when user focuses field

**3. Error Messages Not Announced in Real-Time**

- **Location:** `/components/School/SchoolForm.vue` (FormErrorSummary component)
- **WCAG Criterion:** 4.1.3 Status Messages
- **Severity:** HIGH
- **Issue:** Field errors appear via FormErrorSummary but are not announced to screen readers until focus is manually moved
  ```vue
  <FormErrorSummary v-if="hasErrors" :errors="errors" @dismiss="clearErrors" />
  ```
- **Impact:** Screen reader users must manually search for errors; form submission may fail silently
- **Current State:** FormErrorSummary has aria-live="assertive" (good), but field-level errors only show on blur
- **Required Fix:** Add aria-live to individual field errors
  ```html
  <!-- In DesignSystemFieldError.vue -->
  <div
    v-if="error"
    :id="id"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    class="mt-1 text-sm text-red-600 flex items-start gap-1"
  >
    <ExclamationCircleIcon
      class="w-4 h-4 mt-0.5 flex-shrink-0"
      aria-hidden="true"
    />
    <span>{{ error }}</span>
  </div>
  ```
- **Testing Confirmation:** Screen reader should announce error immediately when validation fails on blur

**4. Color Contrast Insufficient in Several Elements**

- **Location:** Multiple throughout SchoolForm
- **WCAG Criterion:** 1.4.3 Contrast (Minimum) - AA requires 4.5:1 for normal text, 3:1 for large text
- **Severity:** HIGH
- **Issue:** Several text elements have insufficient contrast:
  - "(auto-filled)" text at lines 74-76: text-blue-600 on white (fails 4.5:1 ratio)
  - Success message "Map coordinates available" at line 319: text-green-700 on white (fails 4.5:1)
  - Placeholder text in inputs: uses placeholder:text-slate-400 (likely fails contrast)
- **Current State:**
  ```html
  <!-- Insufficient contrast -->
  <span class="text-xs text-blue-600 font-normal">(auto-filled)</span>
  <p class="font-semibold text-green-700">Map coordinates available</p>
  ```
- **Required Fix:** Use higher contrast colors or adjust opacity

  ```html
  <!-- Better contrast -->
  <span class="text-xs text-blue-700 font-normal">(auto-filled)</span>
  <p class="font-semibold text-green-800">Map coordinates available</p>

  <!-- For placeholders -->
  <input
    placeholder="e.g., University of Florida"
    class="placeholder:text-slate-600"
  />
  ```

- **Testing Confirmation:** Use WAVE, Axe, or color contrast checker; verify all text meets 4.5:1 minimum

---

#### MEDIUM PRIORITY ISSUES

**1. Missing Heading Hierarchy**

- **Location:** `/pages/schools/new.vue` lines 5-6 (page title in FormPageLayout)
- **WCAG Criterion:** 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
- **Severity:** MEDIUM
- **Issue:** Page title is in FormPageLayout component but not semantic h1 element
- **Impact:** Screen readers cannot identify main page heading; heading structure is unclear
- **Current State:** Title passed as prop, rendered as div
  ```vue
  <FormPageLayout
    title="Add New School"
    description="..."
  >
  ```
- **Required Fix:** Change FormPageLayout to render title as h1
  ```vue
  <!-- In FormPageLayout.vue -->
  <template>
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <p class="mt-2 text-sm text-white/90">{{ description }}</p>
  </template>
  ```
- **Testing Confirmation:** Screen reader should identify h1 heading; outline view should show correct hierarchy

**2. Tab Order Not Visible in Focus Outline**

- **Location:** `/components/School/SchoolForm.vue` (multiple)
- **WCAG Criterion:** 2.4.7 Focus Visible
- **Severity:** MEDIUM
- **Issue:** Focus outlines are subtle (focus:ring-2 with offset) and may not be visible at default browser zoom
- **Impact:** Keyboard users cannot easily track focus position on form
- **Current State:**
  ```html
  <input
    class="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
  ```
- **Required Fix:** Ensure focus outline has minimum 2px and high contrast
  ```html
  <input
    class="focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 focus:outline-none"
  />
  <!-- Add to global CSS for consistency -->
  /* Ensure outline is visible */ input:focus, select:focus, textarea:focus {
  outline: 2px solid #2563eb; outline-offset: 2px; }
  ```
- **Testing Confirmation:** Tab through form; verify blue outline is visible at 200% zoom; outline contrasts with background

**3. Inconsistent Label Spacing**

- **Location:** `/components/School/SchoolForm.vue` (various)
- **WCAG Criterion:** 3.3.2 Labels or Instructions
- **Severity:** MEDIUM
- **Issue:** Label margin-bottom varies: mb-2 vs mb-1 in CoachForm
- **Current State:** SchoolForm uses mb-2, CoachForm uses mb-1
- **Impact:** Inconsistent visual hierarchy may confuse users about form structure
- **Required Fix:** Standardize to single spacing value throughout
  ```html
  <!-- All labels use mb-2 -->
  <label for="..." class="block text-sm font-medium mb-2 text-slate-700">
    Field Label
  </label>
  ```
- **Testing Confirmation:** Visual inspection; measure consistency across forms

---

#### COMPLIANT ELEMENTS (Good Practices)

**Strengths in Add School Form:**

1. **Proper Label Association** - All inputs have `for` attributes matching IDs
2. **Error Summary Component** - FormErrorSummary uses `role="alert"` with `aria-live="assertive"`
3. **Field Error Descriptors** - Each error has unique ID linked via `aria-describedby`
4. **Input Validation State** - `aria-invalid` attribute set when errors present
5. **Disabled Button State** - Submit button properly disabled when form invalid
6. **Semantic HTML** - Uses `<form>`, `<label>`, `<input>`, `<select>`, `<textarea>`
7. **Border Radius Accessibility** - High contrast borders (2px border-blue-300/slate-300)

---

### 2. ADD COACH PAGE (`/pages/coaches/new.vue`)

#### File Location

`/pages/coaches/new.vue`
`/components/Coach/CoachForm.vue`
`/components/Form/SchoolSelect.vue`

#### Form Structure Overview

- Skip link (good practice)
- School selection dropdown (required)
- Coach role select dropdown (required)
- First/Last name fields (required)
- Email, Phone fields (optional)
- Twitter, Instagram fields (optional)
- Notes textarea (optional)
- Submit/Cancel buttons

---

### WCAG Compliance Issues - Add Coach

#### CRITICAL ISSUES

**1. Skip Link Focus Not Managed**

- **Location:** `/pages/coaches/new.vue` lines 3-8
- **WCAG Criterion:** 2.4.1 Bypass Blocks
- **Severity:** CRITICAL
- **Issue:** Skip link exists and is properly hidden, but focus management is incomplete
  ```html
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
  >
    Skip to main content
  </a>
  ```
- **Impact:** Skip link works but anchor target (#main-content) doesn't receive focus; user must manually click link to move focus
- **Current State:** Skip link visually appears but clicking doesn't move focus to target
- **Required Fix:** Use JavaScript to manage focus

  ```html
  <a
    href="#main-content"
    @click="handleSkipLink"
    class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
  >
    Skip to main content
  </a>

  <script setup>
    const mainContentRef = ref<HTMLElement | null>(null);

    const handleSkipLink = (e: Event) => {
      e.preventDefault();
      mainContentRef.value?.focus();
    };
  </script>

  <template>
    <FormPageLayout
      ref="mainContentRef"
      id="main-content"
      tabindex="-1"
      ...
    ></FormPageLayout
  ></template>
  ```

- **Testing Confirmation:** Press Tab on page load to reveal skip link; press Enter; focus should move to main content area

**2. Required Field Indicator Not Properly Announced**

- **Location:** `/components/Coach/CoachForm.vue` lines 12-14, 38-40, 66-67
- **WCAG Criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- **Severity:** CRITICAL
- **Issue:** Same issue as SchoolForm - asterisk "\*" not accessible
  ```html
  <label for="role" class="block text-sm font-medium mb-1 text-slate-600">
    Role <span class="text-red-600">*</span>
  </label>
  ```
- **Impact:** Screen reader users cannot identify required fields
- **Current State:** Asterisk visible only
- **Required Fix:** Apply same fix as SchoolForm:
  ```html
  <label for="role" class="block text-sm font-medium mb-1 text-slate-600">
    Role
    <span class="text-red-600" aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </label>
  ```
- **Testing Confirmation:** Screen reader announces "(required)" for role, first_name, last_name fields

**3. Select Dropdown Focus Ring Insufficient**

- **Location:** `/components/Coach/CoachForm.vue` lines 15-30
- **WCAG Criterion:** 2.4.7 Focus Visible
- **Severity:** CRITICAL
- **Issue:** Select has focus:ring-2 but color is very subtle
  ```html
  <select
    class="focus:ring-2 focus:border-transparent focus:ring-blue-500/20"
  ></select>
  ```
- **Impact:** Focus ring is 20% opacity blue (very hard to see); keyboard users cannot track position
- **Current State:** focus:ring-blue-500/20 (too subtle)
- **Required Fix:** Use full opacity and higher contrast
  ```html
  <select
    class="focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none"
  />
  ```
- **Testing Confirmation:** Tab through form; blue focus ring should be clearly visible

**4. Form Submission State Not Announced**

- **Location:** `/components/Coach/CoachForm.vue` lines 181-194
- **WCAG Criterion:** 4.1.3 Status Messages
- **Severity:** CRITICAL
- **Issue:** Same as SchoolForm - submit button shows "Adding..." but no aria-busy
  ```html
  <button
    type="submit"
    class="flex-1 px-4 py-2 text-white font-semibold rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
  >
    {{ loading ? "Adding..." : "Add Coach" }}
  </button>
  ```
- **Impact:** Screen reader users don't know form is processing
- **Required Fix:** Add aria-busy attribute
  ```html
  <button
    type="submit"
    :aria-busy="loading"
    class="flex-1 px-4 py-2 text-white font-semibold rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
  >
    {{ loading ? "Adding..." : "Add Coach" }}
  </button>
  ```
- **Testing Confirmation:** Screen reader announces aria-busy="true" when loading

---

#### HIGH PRIORITY ISSUES

**1. School Select Dependency Not Announced**

- **Location:** `/pages/coaches/new.vue` lines 35-37
- **WCAG Criterion:** 3.3.2 Labels or Instructions, 3.3.4 Error Prevention
- **Severity:** HIGH
- **Issue:** Coach form is conditionally rendered after school selection, but this dependency is not announced to screen readers
  ```html
  <CoachForm v-if="selectedSchoolId" ... />
  <div v-else class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <p class="text-sm text-slate-600">Please select a school to continue</p>
  </div>
  ```
- **Impact:** Screen reader users may not understand why coach form is hidden or why it suddenly appears
- **Current State:** Conditional rendering with static text message
- **Required Fix:** Add aria-live region and aria-label

  ```html
  <div
    v-if="!selectedSchoolId"
    class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
    role="status"
    aria-live="polite"
    aria-label="School selection required"
  >
    <p class="text-sm text-slate-600">Please select a school to continue</p>
  </div>

  <div v-else>
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      School selected. Coach form now available.
    </div>
    <CoachForm ... />
  </div>
  ```

- **Testing Confirmation:** Screen reader announces when school form appears/disappears; announces status when coach form becomes available

**2. Insufficient Color Contrast in Secondary Text**

- **Location:** `/components/Coach/CoachForm.vue` lines 12, 38, 64, 89, 106, 125, 143
- **WCAG Criterion:** 1.4.3 Contrast (Minimum)
- **Severity:** HIGH
- **Issue:** Label text uses text-slate-600 which may not meet 4.5:1 contrast ratio
- **Current State:**
  ```html
  <label class="block text-sm font-medium mb-1 text-slate-600">
    Role <span class="text-red-600">*</span>
  </label>
  ```
- **Impact:** Users with low vision or color blindness cannot read labels
- **Required Fix:** Use darker color for labels
  ```html
  <label class="block text-sm font-medium mb-1 text-slate-700">
    Role
    <span class="text-red-600" aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </label>
  ```
- **Testing Confirmation:** Use color contrast checker; verify 4.5:1 minimum for all text

**3. Input Padding Inconsistent with SchoolForm**

- **Location:** `/components/Coach/CoachForm.vue` vs `/components/School/SchoolForm.vue`
- **WCAG Criterion:** 2.5.5 Target Size (Enhanced) - touch target should be 44x44px minimum
- **Severity:** HIGH
- **Issue:** CoachForm inputs use `py-2` (8px) while SchoolForm uses `py-3` (12px)

  ```html
  <!-- CoachForm: too small -->
  <input class="px-4 py-2 border border-slate-300 ..." />

  <!-- SchoolForm: better -->
  <input class="px-4 py-3 border-2 border-slate-300 ..." />
  ```

- **Impact:** Mobile users and users with motor impairments may have difficulty clicking input fields
- **Required Fix:** Standardize to py-3 (12px) across all forms
  ```html
  <input class="px-4 py-3 border border-slate-300 ..." />
  ```
- **Testing Confirmation:** Measure actual touch target size; verify 44x44px minimum on mobile

**4. Error Messages Not Announced in Real-Time**

- **Location:** `/components/Coach/CoachForm.vue` (DesignSystemFieldError)
- **WCAG Criterion:** 4.1.3 Status Messages
- **Severity:** HIGH
- **Issue:** Same as SchoolForm - field errors not announced with aria-live
- **Impact:** Screen reader users must manually discover errors
- **Current State:** Errors show on blur without aria-live
- **Required Fix:** Add aria-live="assertive" to DesignSystemFieldError component
  ```html
  <!-- In DesignSystemFieldError.vue -->
  <div
    v-if="error"
    :id="id"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    class="mt-1 text-sm text-red-600 flex items-start gap-1"
  >
    <ExclamationCircleIcon ... />
    <span>{{ error }}</span>
  </div>
  ```
- **Testing Confirmation:** Screen reader announces error immediately on validation

---

#### MEDIUM PRIORITY ISSUES

**1. Cancel Button Missing aria-label**

- **Location:** `/components/Coach/CoachForm.vue` line 197
- **WCAG Criterion:** 1.1.1 Non-text Content (indirectly)
- **Severity:** MEDIUM
- **Issue:** Cancel button text is clear in context but aria-label would improve clarity
- **Current State:**
  ```html
  <button type="button" @click="$emit('cancel')">Cancel</button>
  ```
- **Required Fix:** Add aria-label for screen reader clarity
  ```html
  <button
    type="button"
    aria-label="Cancel adding coach"
    @click="$emit('cancel')"
  >
    Cancel
  </button>
  ```
- **Testing Confirmation:** Screen reader announces "Cancel adding coach, button"

**2. Missing Heading in Page Structure**

- **Location:** `/pages/coaches/new.vue`
- **WCAG Criterion:** 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
- **Severity:** MEDIUM
- **Issue:** Page title in FormPageLayout but no semantic h1
- **Impact:** Screen reader users cannot identify main page heading
- **Current State:** Title passed as prop to FormPageLayout
- **Required Fix:** Ensure FormPageLayout renders h1 element
  ```vue
  <!-- In FormPageLayout.vue -->
  <h1 class="text-2xl font-bold">{{ title }}</h1>
  ```
- **Testing Confirmation:** Screen reader identifies h1; heading outline shows correct hierarchy

---

#### COMPLIANT ELEMENTS

**Strengths in Add Coach Form:**

1. **Proper Label Association** - All inputs have `for` attributes matching IDs
2. **Field-Level Error Association** - `aria-describedby` links errors to fields
3. **Required Field Attributes** - `aria-required="true"` on required fields (lines 19, 47, 72)
4. **Error Summary Component** - FormErrorSummary with aria-live support
5. **Disabled State Handling** - Inputs properly disabled when loading
6. **Semantic Form Structure** - Uses `<form>`, `<label>`, `<input>`, `<select>`, `<textarea>`

---

### 3. LOG INTERACTION PAGE (`/pages/interactions/add.vue`)

#### File Location

`/pages/interactions/add.vue`
`/components/Interaction/InteractionForm.vue`
`/components/Coach/AddCoachModal.vue`
`/components/Coach/OtherCoachModal.vue`

#### Form Structure Overview

- School selection dropdown (required)
- Coach selection dropdown (optional with "Add New" / "Other" options)
- Interaction type select (required)
- Direction radio buttons (required - outbound/inbound)
- Date/Time input (required)
- Subject text input (optional)
- Content textarea (optional)
- Sentiment select (optional)
- Interest calibration section (conditional)
- File upload (optional)
- Submit/Cancel buttons
- Modal dialogs for adding new coach

---

### WCAG Compliance Issues - Log Interaction

#### CRITICAL ISSUES

**1. Radio Button Group Not Properly Labeled**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 176-211
- **WCAG Criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- **Severity:** CRITICAL
- **Issue:** Radio button group "Direction" lacks fieldset/legend wrapper
  ```html
  <label class="block text-sm font-medium text-slate-700">
    Direction <span class="text-red-500">*</span>
  </label>
  <div class="mt-2 flex gap-4">
    <label class="group flex cursor-pointer items-center gap-3">
      <input v-model="form.direction" type="radio" value="outbound" />
      <span>Outbound (We initiated)</span>
    </label>
    <label class="group flex cursor-pointer items-center gap-3">
      <input v-model="form.direction" type="radio" value="inbound" />
      <span>Inbound (They initiated)</span>
    </label>
  </div>
  ```
- **Impact:** Screen reader users cannot determine these are grouped radio buttons; semantics are unclear
- **Current State:** Label is separate div; no fieldset grouping
- **Required Fix:** Use fieldset/legend for proper semantic grouping
  ```html
  <fieldset>
    <legend class="block text-sm font-medium text-slate-700 mb-3">
      Direction <span class="text-red-500" aria-hidden="true">*</span>
      <span class="sr-only">(required)</span>
    </legend>
    <div class="mt-2 flex gap-4">
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
- **Testing Confirmation:** Screen reader announces "Direction, group, (required)" and reads each radio button in context of group

**2. Modal Focus Management Missing**

- **Location:** `/components/Coach/AddCoachModal.vue` lines 69-172
- **WCAG Criterion:** 2.4.3 Focus Order, 2.4.8 Focus Visible
- **Severity:** CRITICAL
- **Issue:** Modal opens but focus is not automatically moved to first form field or modal title; no focus trap; no return focus on close
  ```html
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="handleClose"
    >
      <div class="w-full max-w-md ... bg-white ...">
        <div class="bg-gradient-to-r ... px-6 py-4">
          <h2 class="text-xl font-bold">Add New Coach</h2>
        </div>
      </div>
    </div></Teleport
  >
  ```
- **Impact:** Keyboard users may not know modal opened; focus may remain behind modal; can tab out of modal; focus lost on close
- **Current State:**
  - No focus management on open
  - No focus trap (can Tab out of modal)
  - No return focus on close
  - Modal has no role="dialog" or aria-modal
- **Required Fix:** Implement proper modal accessibility

  ```vue
  <script setup>
  const modalRef = ref<HTMLElement | null>(null);
  const previousFocusElement = ref<HTMLElement | null>(null);

  const openModal = () => {
    previousFocusElement.value = document.activeElement as HTMLElement;
    showAddCoachModal.value = true;

    // Wait for DOM update
    nextTick(() => {
      const firstInput = modalRef.value?.querySelector('input');
      firstInput?.focus();
    });
  };

  const closeModal = () => {
    showAddCoachModal.value = false;
    // Return focus to trigger button
    previousFocusElement.value?.focus();
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  watch(() => showAddCoachModal.value, (show) => {
    if (show) {
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('keydown', handleEscape);
    }
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape);
  });
  </script>

  <template>
    <Teleport to="body">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="handleClose"
      >
        <div
          ref="modalRef"
          class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          @click.stop
        >
          <div
            class="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white"
          >
            <h2 id="modal-title" class="text-xl font-bold">Add New Coach</h2>
            <p class="mt-1 text-sm text-white/90">
              Add a coach for this school
            </p>
          </div>
          <!-- form content -->
        </div>
      </div>
    </Teleport>
  </template>
  ```

- **Testing Confirmation:**
  - Tab when modal opens: focus should move to first form field
  - Press Tab repeatedly: focus should cycle within modal only
  - Press Escape: modal should close and focus return to trigger button

**3. Conditional Interest Calibration Component Not Accessible**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 282-288
- **WCAG Criterion:** 1.3.1 Info and Relationships, 4.1.3 Status Messages
- **Severity:** CRITICAL
- **Issue:** Interest calibration section appears conditionally but no live region announces its appearance
  ```html
  <!-- Interest Calibration (conditional) -->
  <div
    v-if="shouldShowCalibration"
    class="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6"
  >
    <InterestCalibration ref="calibrationComponent" />
  </div>
  ```
- **Impact:** Screen reader users may not know new section appeared; form structure seems to change unexpectedly
- **Current State:** Section appears/disappears based on form state with no announcement
- **Required Fix:** Add aria-live and description
  ```html
  <div
    v-if="shouldShowCalibration"
    class="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6"
    role="region"
    aria-live="polite"
    aria-labelledby="calibration-label"
  >
    <h3
      id="calibration-label"
      class="text-sm font-semibold text-indigo-900 mb-4"
    >
      Coach Interest Level Calibration
    </h3>
    <InterestCalibration ref="calibrationComponent" />
  </div>
  ```
- **Testing Confirmation:** Screen reader announces section when it appears; announces heading and instructions

**4. File Upload Component Accessibility Unknown**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 290-296
- **WCAG Criterion:** Multiple (1.1.1, 1.3.1, 2.1.1, 4.1.2, 4.1.3)
- **Severity:** CRITICAL
- **Issue:** FileUpload component referenced but not reviewed; accessibility unknown
  ```html
  <FileUpload
    v-model="selectedFiles"
    :disabled="loading"
    accept="image/*,.pdf,.doc,.docx"
    :multiple="true"
  />
  ```
- **Impact:** File upload may have critical accessibility issues (no alt text for preview, no keyboard access, etc.)
- **Current State:** Component not reviewed
- **Required Fix:** Verify FileUpload component has:
  - Proper label for file input
  - Keyboard accessible upload button (Enter/Space to select)
  - File type restrictions announced
  - Preview images have alt text
  - Delete file button has aria-label
  - Selected files list announced to screen readers
- **Testing Confirmation:** Review FileUpload component source code and test with screen reader

**5. Form Submission State Not Announced**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 300-307
- **WCAG Criterion:** 4.1.3 Status Messages
- **Severity:** CRITICAL
- **Issue:** Submit button shows "Logging..." but no aria-busy attribute
  ```html
  <button
    data-testid="log-interaction-submit-button"
    type="submit"
    :disabled="loading || !isFormValid"
    class="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
  >
    {{ loading ? "Logging..." : "Log Interaction" }}
  </button>
  ```
- **Impact:** Screen reader users don't know form is processing
- **Required Fix:** Add aria-busy
  ```html
  <button
    type="submit"
    :aria-busy="loading"
    aria-label="Log interaction"
    :disabled="loading || !isFormValid"
    class="..."
  >
    {{ loading ? "Logging..." : "Log Interaction" }}
  </button>
  ```
- **Testing Confirmation:** Screen reader announces aria-busy="true" when loading begins

---

#### HIGH PRIORITY ISSUES

**1. Interaction Type Select Missing Required Indicator Announcement**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 149-152
- **WCAG Criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- **Severity:** HIGH
- **Issue:** Required field indicator not accessible (asterisk only)
  ```html
  <label for="type" class="block text-sm font-medium text-slate-700">
    Type <span class="text-red-500">*</span>
  </label>
  ```
- **Impact:** Screen reader users cannot identify required fields
- **Current State:** Visual asterisk only
- **Required Fix:** Add aria-required and sr-only text
  ```html
  <label for="type" class="block text-sm font-medium text-slate-700">
    Type
    <span class="text-red-500" aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </label>
  <select
    id="type"
    v-model="form.type"
    required
    aria-required="true"
    class="..."
  ></select>
  ```
- **Testing Confirmation:** Screen reader announces "(required)" for type field

**2. Select Dropdown With Emojis Not Accessible**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 161-171
- **WCAG Criterion:** 1.1.1 Non-text Content
- **Severity:** HIGH
- **Issue:** Option values include emoji which screen readers may not announce clearly
  ```html
  <option value="email">📧 Email</option>
  <option value="text">💬 Text</option>
  <option value="phone_call">☎️ Phone Call</option>
  ```
- **Impact:** Screen reader users hear emoji descriptions instead of clear interaction type; may be confusing or verbose
- **Current State:** Emoji in option text; no aria-label
- **Required Fix:** Provide hidden text or aria-label
  ```html
  <option value="email">
    <span aria-hidden="true">📧</span>
    <span>Email</span>
  </option>
  <!-- OR use data attributes -->
  <option value="email" title="Email">📧 Email</option>
  ```
- **Testing Confirmation:** Screen reader should clearly announce "Email, email option" (not emoji)

**3. Date/Time Input Missing Format Hint**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 213-227
- **WCAG Criterion:** 3.3.5 Help
- **Severity:** HIGH
- **Issue:** datetime-local input has no instructions for expected format
  ```html
  <label for="occurred_at" class="block text-sm font-medium text-slate-700">
    Date & Time <span class="text-red-500">*</span>
  </label>
  <input
    id="occurred_at"
    v-model="form.occurred_at"
    type="datetime-local"
    required
    class="..."
  />
  ```
- **Impact:** Screen reader users unfamiliar with browser date/time picker may not know how to format input
- **Current State:** No aria-describedby pointing to format instructions
- **Required Fix:** Add format hint
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
    Select a date and time. Use the date/time picker or enter in format:
    YYYY-MM-DD HH:MM
  </p>
  ```
- **Testing Confirmation:** Screen reader announces format help when focused

**4. Insufficient Color Contrast in Optional Field Labels**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 231-233, 247-249
- **WCAG Criterion:** 1.4.3 Contrast (Minimum)
- **Severity:** HIGH
- **Issue:** "(Optional)" text in labels may have insufficient contrast
  ```html
  <label for="subject" class="block text-sm font-medium text-slate-700">
    Subject (Optional)
  </label>
  ```
- **Impact:** Users with low vision may not see that field is optional
- **Current State:** Text color not specified for (Optional) portion
- **Required Fix:** Ensure all text meets 4.5:1 contrast minimum; use darker shade for emphasis
  ```html
  <label for="subject" class="block text-sm font-medium text-slate-700">
    Subject
    <span class="text-slate-600">(optional)</span>
  </label>
  ```
- **Testing Confirmation:** Color contrast checker should verify 4.5:1 or higher

**5. Coach Select "Add New Coach" Option Not Accessible**

- **Location:** `/components/Form/CoachSelect.vue` lines 91-93
- **WCAG Criterion:** 1.1.1 Non-text Content
- **Severity:** HIGH
- **Issue:** Option uses "+" character which may not be clear to screen readers
  ```html
  <option value="add-new">+ Add new coach</option>
  <option value="other">Other coach (not listed)</option>
  ```
- **Impact:** Screen reader users may not understand these are action options, not actual coach names
- **Current State:** Options mixed with regular coach options; no grouping or separation
- **Required Fix:** Use optgroup or add aria-label
  ```html
  <select
    id="coach-select"
    :value="modelValue || ''"
    :disabled="disabled || !schoolId"
    :required="required"
    :aria-describedby="error ? 'coach-select-error' : 'coach-help'"
    class="..."
  >
    <option value="">Select a coach (optional)</option>
    <optgroup label="Available Coaches">
      <option
        v-for="coach in filteredCoaches"
        :key="coach.id"
        :value="coach.id"
      >
        {{ coach.first_name }} {{ coach.last_name }} - {{
        getRoleLabel(coach.role) }}
      </option>
    </optgroup>
    <optgroup label="Other Options">
      <option value="other">Other coach (not listed)</option>
      <option value="add-new">Add new coach</option>
    </optgroup>
  </select>
  <p id="coach-help" class="sr-only">
    Select a coach from the list, or choose "Other coach" if the coach is not
    listed, or "Add new coach" to create a new coach entry.
  </p>
  ```
- **Testing Confirmation:** Screen reader announces optgroup labels and distinguishes coach options from action options

---

#### MEDIUM PRIORITY ISSUES

**1. Conditional Form Sections Not Announced**

- **Location:** `/components/Interaction/InteractionForm.vue`
- **WCAG Criterion:** 1.3.1 Info and Relationships
- **Severity:** MEDIUM
- **Issue:** Multiple form sections conditionally rendered but no announcement of what changed
  - Coach form shows/hides based on school selection
  - Sentiment field shows/hides based on type selection
  - Interest calibration shows/hides based on sentiment selection
- **Impact:** Screen reader users may not understand form structure changes
- **Current State:** Conditional rendering with no aria-live announcements
- **Required Fix:** Add aria-live regions for major changes
  ```html
  <div
    v-if="!form.school_id"
    role="status"
    aria-live="polite"
    class="p-4 bg-blue-50 rounded"
  >
    <p class="text-sm text-slate-700">
      Select a school to begin logging an interaction
    </p>
  </div>
  ```
- **Testing Confirmation:** Screen reader announces when sections appear/disappear

**2. Cancel Button Missing Clear Label**

- **Location:** `/components/Interaction/InteractionForm.vue` line 309-312
- **WCAG Criterion:** 1.1.1 Non-text Content (indirectly)
- **Severity:** MEDIUM
- **Issue:** Cancel button text is generic
  ```html
  <button type="button" ... @click="handleCancel">Cancel</button>
  ```
- **Required Fix:** Add aria-label
  ```html
  <button
    type="button"
    aria-label="Cancel logging interaction"
    @click="handleCancel"
  >
    Cancel
  </button>
  ```
- **Testing Confirmation:** Screen reader announces "Cancel logging interaction, button"

**3. Sentiment Select Emoji Not Accessible**

- **Location:** `/components/Interaction/InteractionForm.vue` lines 273-278
- **WCAG Criterion:** 1.1.1 Non-text Content
- **Severity:** MEDIUM
- **Issue:** Sentiment options use emoji which may not be announced correctly
  ```html
  <option value="very_positive">😄 Very Positive</option>
  <option value="positive">😊 Positive</option>
  <option value="neutral">😐 Neutral</option>
  <option value="negative">😕 Negative</option>
  ```
- **Impact:** Screen readers may announce emoji instead of sentiment
- **Current State:** Emoji in option text
- **Required Fix:** Use title attribute or aria-label
  ```html
  <option value="very_positive" title="Very Positive">😄 Very Positive</option>
  ```
- **Testing Confirmation:** Screen reader announces "Very Positive" clearly

---

#### COMPLIANT ELEMENTS

**Strengths in Log Interaction Form:**

1. **Proper Form Structure** - Uses `<form>` element with submit prevention
2. **Field-Level Error Display** - DesignSystemFieldError component with IDs for aria-describedby
3. **Required Field Attributes** - Set on multiple select and input elements
4. **Error Summary** - FormErrorSummary with aria-live support
5. **Conditional Content Sections** - Uses v-if to manage form visibility (though lacking aria-live)
6. **Submit/Cancel Buttons** - Clearly labeled and functionally distinct

---

## Cross-Form Issues (All Three Pages)

### CRITICAL - Affects All Forms

**1. FormErrorSummary Component Issues**

- **Location:** `/components/Validation/FormErrorSummary.vue`
- **WCAG Criterion:** 4.1.3 Status Messages
- **Severity:** CRITICAL (affects all three forms)
- **Issue:** Error summary is announced but has no visual focus indicator on first error element
- **Impact:** Screen reader users get alert but keyboard users may not know where to look
- **Current State:**
  ```vue
  <div
    ref="containerRef"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    tabindex="-1"
  >
  ```
- **Required Fix:** Make error messages keyboard-focusable and provide links to fields

  ```vue
  <template>
    <Transition name="slide-down">
      <div
        v-if="errors.length > 0"
        ref="containerRef"
        id="form-error-summary"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabindex="-1"
        class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
      >
        <div class="flex items-start gap-3">
          <ExclamationTriangleIcon
            class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-red-800 mb-2">
              Please correct the following errors:
            </h3>
            <ul class="text-sm text-red-700 space-y-1">
              <li
                v-for="error in errors"
                :key="error.field"
                class="flex items-start gap-2"
              >
                <span class="text-red-700 mt-1">•</span>
                <div>
                  <button
                    type="button"
                    @click="focusField(error.field)"
                    class="font-semibold text-red-700 hover:text-red-900 hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
                  >
                    {{ formatFieldName(error.field) }}
                  </button>
                  : {{ error.message }}
                </div>
              </li>
            </ul>
          </div>
          <button
            type="button"
            @click="$emit('dismiss')"
            aria-label="Dismiss error summary"
            class="text-red-600 hover:text-red-800 transition flex-shrink-0 mt-0.5 focus:outline-2 focus:outline-offset-2 focus:outline-red-600"
          >
            <XMarkIcon class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>
  </template>

  <script setup>
  const focusField = (fieldName: string) => {
    const fieldId = fieldName.replace(/\./g, '-');
    const element = document.getElementById(fieldId) ||
                    document.querySelector(`[name="${fieldName}"]`);
    element?.focus();
  };
  </script>
  ```

- **Testing Confirmation:** Click error summary links; focus should move to corresponding form field

**2. DesignSystemFieldError Component Missing aria-live**

- **Location:** `/components/DesignSystem/FieldError.vue`
- **WCAG Criterion:** 4.1.3 Status Messages
- **Severity:** CRITICAL (affects all forms)
- **Issue:** Field errors appear but are not announced to screen readers in real-time
  ```vue
  <div
    v-if="error"
    :id="id"
    role="alert"
    class="mt-1 text-sm text-red-600 flex items-start gap-1"
  >
  ```
- **Impact:** Screen reader users must manually discover field errors
- **Current State:** Has role="alert" but missing aria-live and aria-atomic
- **Required Fix:** Add aria-live and aria-atomic
  ```vue
  <template>
    <Transition name="fade">
      <div
        v-if="error"
        :id="id"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        class="mt-1 text-sm text-red-600 flex items-start gap-1"
      >
        <ExclamationCircleIcon
          class="w-4 h-4 mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />
        <span>{{ error }}</span>
      </div>
    </Transition>
  </template>
  ```
- **Testing Confirmation:** Screen reader announces error immediately when validation fails

**3. FormPageLayout Missing Semantic Heading**

- **Location:** `/components/Layout/FormPageLayout.vue` line 51-56
- **WCAG Criterion:** 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
- **Severity:** CRITICAL (affects all forms)
- **Issue:** Page title rendered as div, not h1
  ```html
  <h1 class="text-2xl font-bold">{{ title }}</h1>
  ```
- **Impact:** Screen reader users cannot identify main page heading
- **Current State:** Title is styled as h1 but rendered as div in some layouts
- **Required Fix:** Ensure always rendered as h1 element (already correct in reviewed file, but verify across all uses)
- **Testing Confirmation:** Screen reader identifies h1 heading

**4. No Global Focus Management Strategy**

- **Location:** All forms
- **WCAG Criterion:** 2.4.3 Focus Order
- **Severity:** CRITICAL
- **Issue:** No consistent focus management on page navigation or error states
- **Impact:** Keyboard users may lose track of focus position
- **Current State:** Focus management ad-hoc per component
- **Required Fix:** Implement global focus manager composable

  ```typescript
  // composables/useFocusManagement.ts
  export const useFocusManagement = () => {
    const previousFocus = ref<HTMLElement | null>(null);

    const saveFocus = () => {
      previousFocus.value = document.activeElement as HTMLElement;
    };

    const restoreFocus = () => {
      previousFocus.value?.focus();
    };

    const focusElement = (elementOrId: HTMLElement | string) => {
      if (typeof elementOrId === "string") {
        document.getElementById(elementOrId)?.focus();
      } else {
        elementOrId.focus();
      }
    };

    return { saveFocus, restoreFocus, focusElement };
  };
  ```

- **Testing Confirmation:** All forms have consistent focus behavior

---

## Recommendations & Best Practices

### Immediate Actions (Critical Fixes)

1. **Fix FormErrorSummary** - Add aria-live and error field focus links (30 min)
2. **Fix DesignSystemFieldError** - Add aria-live to all error messages (15 min)
3. **Add Focus Management to Modals** - Implement focus trap and restore (1 hour)
4. **Fix Radio Button Grouping** - Add fieldset/legend to InteractionForm (20 min)
5. **Add Skip Link Focus Management** - Implement focus movement on coaches page (15 min)

### High Priority (Should Complete This Sprint)

6. **Standardize Required Field Indicators** - Add aria-required and sr-only text (1 hour)
7. **Fix Submit Button aria-busy** - Add to all three forms (20 min)
8. **Improve Color Contrast** - Audit and fix all text (1-2 hours)
9. **Fix Input Padding** - Standardize touch targets (30 min)
10. **Add Format Hints** - Document date/time input format (20 min)

### Medium Priority (Next Sprint)

11. **Fix Select Dropdown Styling** - Use safer CSS approach (45 min)
12. **Add Live Regions** - Announce conditional sections (1 hour)
13. **Audit FileUpload Component** - Review accessibility (1 hour)
14. **Improve Modal Accessibility** - Add aria-modal and aria-labelledby (45 min)
15. **Standardize Focus Indicators** - Consistent outline across all forms (30 min)

### Enhancement Opportunities (AAA Level)

- Add keyboard shortcuts for common actions (submit, cancel)
- Implement error prevention for irreversible actions
- Add estimated form completion time
- Provide multiple methods for form submission
- Add success confirmation with aria-live announcement
- Implement progress indicator for multi-step forms

---

## Testing Checklist

### Automated Testing (Use axe DevTools, WAVE, Lighthouse)

- [ ] No color contrast violations
- [ ] All form inputs have associated labels
- [ ] No duplicate IDs
- [ ] Image alt text present
- [ ] ARIA attributes used correctly
- [ ] Form structure is semantic

### Manual Testing with Screen Readers

- [ ] Test with NVDA (Windows) / JAWS
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Verify form flow announcement
- [ ] Verify error announcements
- [ ] Verify success/loading states
- [ ] Verify focus management in modals

### Keyboard Navigation Testing

- [ ] Tab order is logical
- [ ] Tab order doesn't cycle through hidden elements
- [ ] Focus visible on all interactive elements
- [ ] Can Tab out of modal only with Escape key
- [ ] Skip link works
- [ ] Escape key closes modals and dialogs

### Mobile/Touch Testing

- [ ] Touch targets are 44x44px minimum
- [ ] No hover-only interactions
- [ ] Can use form with screen reader on mobile
- [ ] Can operate touchscreen keyboard

### Browser & AT Testing

- [ ] Chrome + NVDA
- [ ] Firefox + NVDA
- [ ] Edge + Narrator
- [ ] Safari + VoiceOver
- [ ] Mobile Safari + VoiceOver (iOS)

---

## Summary of Issues by Severity

| Severity  | Count  | Status                 |
| --------- | ------ | ---------------------- |
| CRITICAL  | 16     | Requires immediate fix |
| HIGH      | 19     | Should fix this sprint |
| MEDIUM    | 13     | Address in planning    |
| LOW       | 5      | Nice to have           |
| **TOTAL** | **53** | -                      |

---

## References & Standards

- **WCAG 2.1 Level AA** - Web Content Accessibility Guidelines
- **ARIA Authoring Practices Guide** - W3C Standards
- **Screen Reader Testing** - NVDA, JAWS, VoiceOver
- **Color Contrast** - WCAG 1.4.3 (4.5:1 minimum for AA)
- **Focus Management** - 2.4.3 Focus Order, 2.4.7 Focus Visible
- **Form Accessibility** - 3.3.2 Labels or Instructions
- **Error Prevention** - 3.3.4 Error Prevention (Legal, Financial, Data)

---

## Document Control

- **Audited By:** Accessibility Specialist
- **Date:** February 10, 2026
- **Version:** 1.0
- **Status:** Review Required
- **Next Review:** After implementing critical fixes
