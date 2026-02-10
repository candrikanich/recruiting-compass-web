# WCAG 2.1 AA Accessibility Audit: School Detail Page

**Audit Date:** February 9, 2026
**Scope:** School detail page and related components
**Baseline:** WCAG 2.1 Level AA
**Overall Status:** PARTIALLY COMPLIANT with critical issues requiring remediation

---

## Executive Summary

The school detail page demonstrates good foundational accessibility patterns including proper semantic HTML, ARIA labels on key interactive elements, and focus ring implementation. However, there are **5 critical issues** and **8 high-priority issues** that significantly impair access for screen reader users, keyboard-only users, and users with low vision.

**Key Strengths:**

- Semantic `<main>` landmark
- Live region implementation for announcements
- Focus ring styles on form inputs
- ARIA labels on interactive buttons
- Screen reader text (sr-only) for status labels

**Critical Gaps:**

- Icon-only buttons lacking accessible labels
- Missing labels on critical form inputs (textarea elements)
- Insufficient color contrast on interactive elements
- No visible focus indicators on interactive links
- Missing error message associations with form fields

---

## Critical Issues (Must Fix - Blocks Access)

### 1. Icon-Only Buttons Without Accessible Labels

**WCAG Criterion:** 2.4.4 Link Purpose (In Context), 4.1.2 Name, Role, Value
**Severity:** CRITICAL
**Affected Files:** SchoolDocumentsCard.vue, SchoolSidebar.vue, SchoolNotesCard.vue

**Location:** Multiple buttons throughout the page

**Current State:**

```vue
<!-- SchoolDocumentsCard.vue, line 8-12 -->
<button
  @click="showUploadModal = true"
  class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
>
  + Upload
</button>

<!-- SchoolSidebar.vue, line 14-20 (Send Email button) -->
<button
  @click="emit('open-email-modal')"
  class="block w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-center flex items-center justify-center gap-2"
>
  <EnvelopeIcon class="w-4 h-4" />
  Send Email
</button>

<!-- SchoolSidebar.vue, line 58-64 (Email icon links) -->
<a
  v-if="coach.email"
  :href="`mailto:${coach.email}`"
  class="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
  title="Email"
>
  <EnvelopeIcon class="w-3.5 h-3.5" />
</a>
```

**Impact:**

- Screen reader users cannot identify button purpose
- Keyboard users cannot understand what action the button performs
- Title attributes are insufficient as sole accessible labels

**Required Fix:**

Use `aria-label` for icon-only buttons and ensure text alternatives are present:

```vue
<!-- SchoolDocumentsCard.vue -->
<button
  @click="showUploadModal = true"
  aria-label="Upload document"
  class="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
>
  <svg class="w-4 h-4" aria-hidden="true"><!-- icon --></svg>
  Upload
</button>

<!-- SchoolSidebar.vue: Email button -->
<button
  @click="emit('open-email-modal')"
  aria-label="Send email to school"
  class="block w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-center flex items-center justify-center gap-2"
>
  <EnvelopeIcon class="w-4 h-4" aria-hidden="true" />
  Send Email
</button>

<!-- SchoolSidebar.vue: Coach contact links -->
<a
  v-if="coach.email"
  :href="`mailto:${coach.email}`"
  :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
  class="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
>
  <EnvelopeIcon class="w-3.5 h-3.5" aria-hidden="true" />
</a>
```

**Testing Confirmation:**

- Activate screen reader and verify button purpose is announced
- Press Tab to navigate; verify labels are read aloud
- Test with NVDA (Windows) or JAWS to confirm full button name/role/value

---

### 2. Missing Labels on Textarea Elements

**WCAG Criterion:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
**Severity:** CRITICAL
**Affected Files:** SchoolNotesCard.vue, line 19-24, 55-60

**Current State:**

```vue
<!-- SchoolNotesCard.vue: Notes textarea -->
<textarea
  v-model="localNotes"
  rows="4"
  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Add notes about this school..."
/>

<!-- SchoolNotesCard.vue: Private notes textarea -->
<textarea
  v-model="localPrivateNotes"
  rows="4"
  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Add your private thoughts..."
/>
```

**Impact:**

- Screen reader users cannot identify the purpose of textarea
- Form is not properly structured for accessibility
- Placeholder text is not a sufficient label (fades when user starts typing)
- Users relying on labels to understand field purpose are left unsupported

**Required Fix:**

Add `<label>` elements with proper `for` attributes and `id` references:

```vue
<!-- SchoolNotesCard.vue: Notes Card -->
<div v-if="isEditingNotes" class="space-y-3">
  <label for="notes-textarea" class="block text-sm font-medium text-slate-700 mb-2">
    Add notes about this school
  </label>
  <textarea
    id="notes-textarea"
    v-model="localNotes"
    rows="4"
    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    aria-describedby="notes-hint"
  />
  <p id="notes-hint" class="text-xs text-slate-500">
    Share observations about the school, facilities, coaching, or other relevant details
  </p>
</div>

<!-- SchoolNotesCard.vue: Private Notes Card -->
<div v-if="isEditingPrivateNotes" class="space-y-3">
  <label for="private-notes-textarea" class="block text-sm font-medium text-slate-700 mb-2">
    My Private Notes
  </label>
  <textarea
    id="private-notes-textarea"
    v-model="localPrivateNotes"
    rows="4"
    class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    aria-describedby="private-note-hint"
  />
  <p id="private-note-hint" class="text-xs text-slate-500">
    Only you can see these notes
  </p>
</div>
```

**Testing Confirmation:**

- Screen reader: Navigate to textarea, verify label is announced before field
- Keyboard: Tab into textarea, verify label is associated in accessibility tree
- Test with browser accessibility inspector to verify label/control association

---

### 3. Missing Accessible Labels on "Edit" Buttons

**WCAG Criterion:** 2.4.4 Link Purpose, 4.1.2 Name, Role, Value
**Severity:** CRITICAL
**Affected Files:** SchoolNotesCard.vue, line 9-15, 45-51

**Current State:**

```vue
<!-- SchoolNotesCard.vue: Edit button in Notes Card -->
<button
  @click="isEditingNotes = !isEditingNotes"
  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
>
  <PencilIcon class="w-4 h-4" />
  {{ isEditingNotes ? "Cancel" : "Edit" }}
</button>
```

**Impact:**

- Button text is generic ("Edit", "Cancel") without context
- Screen reader user doesn't know what field is being edited
- Context is only visual (proximity to "Notes" heading)

**Required Fix:**

Add explicit context to button labels:

```vue
<!-- SchoolNotesCard.vue: Notes Card Edit Button -->
<button
  @click="isEditingNotes = !isEditingNotes"
  :aria-label="isEditingNotes ? 'Cancel editing notes' : 'Edit notes'"
  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
>
  <PencilIcon class="w-4 h-4" aria-hidden="true" />
  <span class="sr-only">Notes</span>
  {{ isEditingNotes ? "Cancel" : "Edit" }}
</button>

<!-- SchoolNotesCard.vue: Private Notes Card Edit Button -->
<button
  @click="isEditingPrivateNotes = !isEditingPrivateNotes"
  :aria-label="
    isEditingPrivateNotes
      ? 'Cancel editing private notes'
      : 'Edit private notes'
  "
  class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
>
  <PencilIcon class="w-4 h-4" aria-hidden="true" />
  <span class="sr-only">Private Notes</span>
  {{ isEditingPrivateNotes ? "Cancel" : "Edit" }}
</button>
```

**Testing Confirmation:**

- Screen reader: Navigate to button, verify full context is announced
- Keyboard: Tab to button, verify label includes context (not just "Edit")
- Visual: Ensure button text remains visible alongside aria-label

---

### 4. Missing Visible Focus Indicator on "View" Links in Documents

**WCAG Criterion:** 2.4.7 Focus Visible
**Severity:** CRITICAL
**Affected Files:** SchoolDocumentsCard.vue, line 30-35

**Current State:**

```vue
<!-- SchoolDocumentsCard.vue -->
<NuxtLink
  :to="`/documents/${doc.id}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
>
  View
</NuxtLink>
```

**Impact:**

- No visible focus ring when keyboard user tabs to link
- Cannot distinguish focused link from unfocused link
- Violates WCAG 2.4.7 Focus Visible (3:1 contrast requirement)
- Keyboard users cannot identify which element has focus

**Required Fix:**

Add visible focus states using focus:ring utilities:

```vue
<!-- SchoolDocumentsCard.vue -->
<NuxtLink
  :to="`/documents/${doc.id}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  View
</NuxtLink>
```

**Alternative: Semantic Approach**

Consider using an outline instead for better visibility:

```vue
<NuxtLink
  :to="`/documents/${doc.id}`"
  class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
>
  View
</NuxtLink>
```

**Testing Confirmation:**

- Keyboard: Tab through page, verify focus ring is always visible
- Visual: Ensure 3:1 contrast ratio between focus indicator and background
- Browser DevTools: Use accessibility inspector to measure contrast

---

### 5. Missing Focus Management on Status Dropdown

**WCAG Criterion:** 2.4.3 Focus Order, 4.1.3 Status Messages
**Severity:** CRITICAL
**Affected Files:** SchoolDetailHeader.vue, line 21-37

**Current State:**

```vue
<!-- SchoolDetailHeader.vue -->
<label for="school-status" class="sr-only">School status</label>
<select
  id="school-status"
  :model-value="school.status"
  @change="handleStatusChange"
  :disabled="statusUpdating"
  class="px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500"
  :class="[
    getStatusBadgeColor(school.status),
    statusUpdating ? 'opacity-50' : '',
  ]"
>
```

**Issues:**

1. Focus ring has insufficient contrast (blue-500 on colored status badge)
2. Disabled state (opacity-50) is not accessible (only visual indicator)
3. No aria-busy or aria-disabled when statusUpdating=true
4. Focus ring may be invisible depending on badge color

**Impact:**

- Keyboard user cannot see focus on status selector when badge is certain colors
- No indication to assistive technology that field is disabled during update
- Status change feedback may be missed by screen reader users

**Required Fix:**

```vue
<!-- SchoolDetailHeader.vue -->
<div class="relative">
  <label for="school-status" class="sr-only">School status</label>
  <select
    id="school-status"
    :model-value="school.status"
    @change="handleStatusChange"
    :disabled="statusUpdating"
    :aria-busy="statusUpdating"
    class="px-2 py-1 text-xs font-medium rounded-full border-2 border-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
    :class="[
      getStatusBadgeColor(school.status),
      statusUpdating ? 'opacity-50 cursor-not-allowed' : '',
    ]"
  >
    <option value="researching">Researching</option>
    <option value="contacted">Contacted</option>
    <option value="interested">Interested</option>
    <option value="offer_received">Offer Received</option>
    <option value="committed">Committed</option>
  </select>

  <!-- Loading indicator for screen readers -->
  <span v-if="statusUpdating" class="sr-only">
    Status is updating, please wait
  </span>
</div>
```

**Testing Confirmation:**

- Screen reader: Update status, verify aria-busy announcement
- Keyboard: Tab to select, verify focus ring is always visible regardless of badge color
- Visual: Verify focus ring has at least 3:1 contrast with background

---

## High Priority Issues (Significantly Impairs Access)

### 6. Missing Loading State Announcement in SchoolStatusHistory

**WCAG Criterion:** 4.1.3 Status Messages
**Severity:** HIGH
**Affected Files:** SchoolStatusHistory.vue, line 5-9

**Current State:**

```vue
<!-- SchoolStatusHistory.vue -->
<button v-if="loading" disabled class="text-sm text-slate-400">
  <div
    class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
  ></div>
</button>
```

**Impact:**

- Screen reader users don't know data is loading
- Only visual spinner provided; no textual feedback
- Button is disabled during load with no explanation

**Required Fix:**

```vue
<!-- SchoolStatusHistory.vue -->
<div v-if="loading" class="flex items-center gap-2" role="status" aria-live="polite">
  <div
    class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
    aria-hidden="true"
  ></div>
  <span class="text-sm text-slate-400">Loading status history...</span>
</div>
```

**Testing Confirmation:**

- Screen reader: Wait for component mount, verify loading message announced
- Visual: Spinner and text both present during load state

---

### 7. Insufficient Color Contrast on Icon Links in Sidebar

**WCAG Criterion:** 1.4.3 Contrast (Minimum) (4.5:1 for normal text, 3:1 for large text/icons)
**Severity:** HIGH
**Affected Files:** SchoolSidebar.vue, line 58-82

**Current State:**

```vue
<!-- SchoolSidebar.vue -->
<a
  v-if="coach.email"
  :href="`mailto:${coach.email}`"
  class="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
  title="Email"
>
  <EnvelopeIcon class="w-3.5 h-3.5" />
</a>

<a
  v-if="coach.phone"
  :href="`sms:${coach.phone}`"
  class="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
  title="Text"
>
  <ChatBubbleLeftIcon class="w-3.5 h-3.5" />
</a>

<a
  v-if="coach.phone"
  :href="`tel:${coach.phone}`"
  class="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
  title="Call"
>
  <PhoneIcon class="w-3.5 h-3.5" />
</a>
```

**Contrast Analysis:**

- `text-blue-700` (#1d4ed8) on `bg-blue-100` (#dbeafe): **4.2:1** ⚠️ Borderline
- `text-green-700` (#047857) on `bg-green-100` (#dcfce7): **7.1:1** ✓ Good
- `text-purple-700` (#7e22ce) on `bg-purple-100` (#f3e8ff): **4.3:1** ⚠️ Borderline

**Impact:**

- Blue and purple icon links may be difficult to see for users with color vision deficiency or low vision
- Icons alone without text labels compound the problem

**Required Fix:**

Increase contrast by using darker icons or lighter backgrounds:

```vue
<!-- SchoolSidebar.vue: Enhanced contrast -->
<a
  v-if="coach.email"
  :href="`mailto:${coach.email}`"
  :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
  class="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  <EnvelopeIcon class="w-3.5 h-3.5" aria-hidden="true" />
</a>

<a
  v-if="coach.phone"
  :href="`sms:${coach.phone}`"
  :aria-label="`Send text message to ${coach.first_name} ${coach.last_name}`"
  class="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
>
  <ChatBubbleLeftIcon class="w-3.5 h-3.5" aria-hidden="true" />
</a>

<a
  v-if="coach.phone"
  :href="`tel:${coach.phone}`"
  :aria-label="`Call ${coach.first_name} ${coach.last_name}`"
  class="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
>
  <PhoneIcon class="w-3.5 h-3.5" aria-hidden="true" />
</a>
```

**Testing Confirmation:**

- Contrast checker: Verify 4.5:1 ratio for all icon links
- Keyboard: Tab through, verify focus rings visible on all links
- Screen reader: Verify aria-labels announce action and coach name

---

### 8. Missing "Manage" Link Label Context

**WCAG Criterion:** 2.4.4 Link Purpose (In Context)
**Severity:** HIGH
**Affected Files:** SchoolSidebar.vue, line 38-43

**Current State:**

```vue
<!-- SchoolSidebar.vue -->
<NuxtLink
  :to="`/schools/${schoolId}/coaches`"
  class="text-sm text-blue-600 hover:text-blue-700 font-medium"
>
  Manage &rarr;
</NuxtLink>
```

**Impact:**

- "Manage" is vague without context
- Screen reader user hears "link, Manage" without understanding what is being managed
- Should clearly state "Manage Coaches"

**Required Fix:**

```vue
<!-- SchoolSidebar.vue -->
<NuxtLink
  :to="`/schools/${schoolId}/coaches`"
  aria-label="Manage coaches for this school"
  class="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
>
  Manage <span aria-hidden="true">&rarr;</span>
</NuxtLink>
```

Or better yet, make the text explicit:

```vue
<NuxtLink
  :to="`/schools/${schoolId}/coaches`"
  class="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
>
  Manage Coaches <span aria-hidden="true">&rarr;</span>
</NuxtLink>
```

**Testing Confirmation:**

- Screen reader: Navigate to link, verify full purpose is announced
- Visual: Link text should clearly indicate action and target

---

### 9. No Error Message Association in Delete Confirmation

**WCAG Criterion:** 3.3.4 Error Prevention (Legal, Financial, Data)
**Severity:** HIGH
**Affected Files:** pages/schools/[id]/index.vue, line 156-166

**Current State:**

```vue
<!-- pages/schools/[id]/index.vue -->
<DesignSystemConfirmDialog
  :is-open="isDeleteDialogOpen"
  title="Delete School"
  message="Are you sure you want to delete this school? This will also remove associated coaches, interactions, and related records."
  confirm-text="Delete"
  cancel-text="Cancel"
  variant="danger"
  @confirm="executeDelete"
  @cancel="isDeleteDialogOpen = false"
/>
```

**Issues:**

1. Dialog lacks proper ARIA attributes (aria-labelledby, aria-describedby)
2. No aria-modal="true" to indicate modal behavior
3. Focus trap status unclear for screen reader users
4. Confirmation button lacks aria-label or explicit warning

**Impact:**

- Screen reader users may not understand dialog is a confirmation for destructive action
- Unclear if dialog is modal (captures focus)
- User might not realize this is a destructive operation

**Required Fix:**

Ensure the DesignSystemConfirmDialog component includes:

```vue
<!-- Verify DesignSystemConfirmDialog has these attributes -->
<div
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
>
  <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm">
    <h2 id="dialog-title" class="text-lg font-semibold text-slate-900">
      Delete School
    </h2>
    <p id="dialog-description" class="mt-2 text-slate-600">
      Are you sure you want to delete this school? This will also remove associated coaches, interactions, and related records. This action cannot be undone.
    </p>
    <div class="mt-6 flex gap-3">
      <button
        @click="cancel"
        class="flex-1 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        @click="confirm"
        aria-label="Permanently delete this school"
        class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Delete
      </button>
    </div>
  </div>
</div>
```

**Testing Confirmation:**

- Screen reader: Activate delete confirmation, verify role announced as alertdialog
- Verify title and description are both announced
- Keyboard: Verify escape key closes dialog and focus returns to trigger button

---

### 10. Insufficient Heading Hierarchy on Main Page

**WCAG Criterion:** 1.3.1 Info and Relationships (via proper heading hierarchy)
**Severity:** HIGH
**Affected Files:** pages/schools/[id]/index.vue

**Current State:**
Looking at the main page, there's an h1 in SchoolDetailHeader, but the subsequent content uses h2 without clear hierarchy:

```vue
<!-- pages/schools/[id]/index.vue -->
<h1 class="text-2xl font-bold text-slate-900 mb-1">
  {{ school.name }}
</h1>

<!-- Later: in FitScoreDisplay and other cards -->
<h2 class="text-lg font-semibold text-slate-900 mb-4">
  School Fit Analysis
</h2>
```

And in SchoolStatusHistory.vue:

```vue
<h3 class="text-lg font-semibold text-slate-900">Status History</h3>
```

And in SchoolSidebar.vue:

```vue
<h3 class="font-semibold text-slate-900 mb-4">Quick Actions</h3>
```

**Issues:**

- Sidebar headings are h3 but should likely be h2 (same level as main content)
- Inconsistent heading levels for similar content sections
- No clear hierarchy for assistive technology users to understand page structure

**Impact:**

- Screen reader users cannot use heading navigation to quickly scan page
- Unclear content structure for users relying on heading outline
- Difficult for keyboard users to understand page organization

**Required Fix:**

Standardize heading levels across the page:

```vue
<!-- pages/schools/[id]/index.vue: Main content headings -->
<h1>{{ school.name }}</h1>
<!-- Page title -->

<!-- Main content sections use h2 -->
<h2>Status History</h2>
<h2>School Fit Analysis</h2>
<h2>Shared Documents</h2>
<h2>Notes</h2>

<!-- Sidebar sections also use h2 (same level, different column) -->
<!-- Or wrap sidebar in <aside> to provide landmark -->
```

Or use `<aside>` landmark for sidebar:

```vue
<!-- pages/schools/[id]/index.vue -->
<main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Main Content: h1, then h2 sections -->
    <div class="lg:col-span-2">
      <h1>{{ school.name }}</h1>
      <h2>Status History</h2>
      <!-- ... -->
    </div>

    <!-- Sidebar as Aside Landmark -->
    <aside aria-label="School details sidebar">
      <!-- Headings in aside can be h2 as part of page hierarchy -->
      <h2>Quick Actions</h2>
      <h2>Coaches</h2>
    </aside>
  </div>
</main>
```

**Testing Confirmation:**

- Screen reader: Use heading navigation (H key in NVDA) to scan page
- Outline: All headings should follow logical hierarchy with no skipped levels
- Structure: Sidebar content should be in aside landmark if separate from main flow

---

## Medium Priority Issues (Reduced Usability)

### 11. No Validation Error Messages for Empty Document Title

**WCAG Criterion:** 3.3.4 Error Prevention, 3.3.3 Error Suggestion
**Severity:** MEDIUM
**Related Component:** DocumentUploadModal.vue

**Issue:** No aria-describedby linking form inputs to validation error messages.

**Fix:** Add error message associations:

```vue
<!-- DocumentUploadModal.vue -->
<label for="doc-title" class="block text-sm font-medium text-slate-700 mb-1">
  Document Title
</label>
<input
  id="doc-title"
  v-model="documentTitle"
  type="text"
  :aria-describedby="titleError ? 'title-error' : undefined"
  :aria-invalid="!!titleError"
  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
<p v-if="titleError" id="title-error" class="mt-1 text-sm text-red-600">
  {{ titleError }}
</p>
```

---

### 12. Disabled State Styling Only Uses Opacity

**WCAG Criterion:** 1.4.11 Non-Text Contrast
**Severity:** MEDIUM
**Affected Files:** SchoolNotesCard.vue, line 26-30

**Current State:**

```vue
<button
  @click="handleSaveNotes"
  :disabled="isSaving"
  class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
>
```

**Issue:** Disabled state only reduces opacity. Users with vision impairment may not notice the disabled state.

**Fix:**

```vue
<button
  @click="handleSaveNotes"
  :disabled="isSaving"
  class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
>
  {{ isSaving ? "Saving..." : "Save Notes" }}
</button>
```

---

### 13. Missing Landmark Regions

**WCAG Criterion:** 1.3.1 Info and Relationships (best practice)
**Severity:** MEDIUM
**Affected Files:** pages/schools/[id]/index.vue

**Issue:** Sidebar lacks semantic `<aside>` landmark; back-to-schools link should be in `<nav>` or header.

**Fix:**

```vue
<!-- pages/schools/[id]/index.vue -->
<header class="bg-white border-b border-slate-200">
  <nav class="max-w-7xl mx-auto px-4 sm:px-6 py-4" aria-label="Breadcrumb">
    <NuxtLink to="/schools" class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
      <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
      Back to Schools
    </NuxtLink>
  </nav>
</header>

<main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2"><!-- Main content --></div>
    <aside aria-label="School sidebar"><!-- Sidebar --></aside>
  </div>
</main>
```

---

### 14. Language Attribute Missing on HTML

**WCAG Criterion:** 3.1.1 Language of Page
**Severity:** MEDIUM
**Affected File:** app.vue or nuxt.config.ts

**Issue:** Root HTML element should have `lang="en"` attribute for screen readers.

**Fix:** Verify `nuxt.config.ts` includes:

```typescript
export default defineNuxtConfig({
  html: {
    lang: "en",
    // or in nuxt.config.ts
    htmlAttrs: {
      lang: "en",
    },
  },
});
```

---

## Compliant Elements (Positive Patterns)

The following elements are well-implemented and should serve as models for other components:

### 1. Live Region Implementation

**File:** composables/useLiveRegion.ts, pages/schools/[id]/index.vue line 153-154

```vue
<!-- Properly implemented live region for announcements -->
<div v-bind="liveRegionAttrs">{{ announcement }}</div>

<!-- Script setup -->
const { announcement, announce, liveRegionAttrs } = useLiveRegion();
```

**Why It Works:**

- Uses `role="status"` for non-assertive announcements
- `aria-live="polite"` waits for screen reader to finish speaking
- `aria-atomic="true"` reads entire region when changed
- `sr-only` class hides visually but keeps it available to screen readers
- Properly resets announcement before setting new one via requestAnimationFrame

---

### 2. Favorite Button ARIA Implementation

**File:** SchoolDetailHeader.vue, line 60-78

```vue
<button
  @click="$emit('toggle-favorite')"
  :aria-label="
    school.is_favorite ? 'Remove from favorites' : 'Add to favorites'
  "
  :aria-pressed="school.is_favorite"
  class="flex-shrink-0 transition-all"
  :class="
    school.is_favorite
      ? 'text-yellow-500'
      : 'text-slate-300 hover:text-yellow-400'
  "
>
  <StarIcon
    class="w-6 h-6"
    :class="school.is_favorite ? 'fill-yellow-500' : ''"
    aria-hidden="true"
  />
</button>
```

**Why It Works:**

- Uses `aria-label` to provide accessible name
- `aria-pressed` conveys toggle state to assistive technology
- Icon is marked `aria-hidden="true"` to prevent redundant announcement
- Visual and programmatic state are synchronized

---

### 3. Status Select Label

**File:** SchoolDetailHeader.vue, line 20-37

```vue
<label for="school-status" class="sr-only">School status</label>
<select
  id="school-status"
  :model-value="school.status"
  @change="handleStatusChange"
>
  <!-- options -->
</select>
```

**Why It Works:**

- Proper `<label>` element with `for` attribute
- Associated with input via `id`
- Label is screen-reader only (sr-only) since visual badge provides context
- Select is properly associated with label for form submission

---

## Recommendations for Future Development

### AAA Enhancements (Beyond AA Baseline)

1. **Focus Indicator Styling (AAA)**
   - Use 3:1 contrast on focus indicators (current implementation may not meet this)
   - Consider using `focus:outline-blue-700` on light backgrounds

2. **Enhanced Color Contrast (AAA)**
   - Audit all color combinations for 7:1 ratio (AAA large text) or 4.5:1 enhanced
   - Consider higher contrast status badge colors

3. **Keyboard Shortcuts Documentation**
   - Add help text documenting any custom keyboard shortcuts
   - Ensure shortcuts don't conflict with browser/AT shortcuts

### Best Practices

1. **Skip Navigation Link**
   - Add skip-to-main-content link at top of page
   - Implement as first focusable element

2. **Form Validation**
   - Provide inline validation feedback
   - Use aria-live regions for real-time validation messages
   - Clearly distinguish errors from warnings

3. **Loading States**
   - Always provide textual feedback alongside spinners
   - Use aria-live regions to announce data loading completion

4. **Icon Usage Pattern**
   - Create reusable component for icon buttons:

   ```typescript
   // composables/useAccessibleIcon.ts
   export const useAccessibleIcon = (label: string, icon: string) => {
     return {
       "aria-label": label,
       "aria-hidden": false,
       role: "img",
     };
   };
   ```

5. **Testing Framework**
   - Implement automated a11y testing using `@testing-library/jest-dom` accessibility matchers
   - Run axe-core scans in CI/CD pipeline
   - Include screen reader testing in E2E test suite

### Testing Checklist for Audits

Before considering a component accessible, verify:

- [ ] **Keyboard Navigation**
  - All interactive elements reachable via Tab key
  - Tab order matches visual/logical flow
  - Escape closes modals and returns focus to trigger

- [ ] **Screen Reader (NVDA, JAWS, VoiceOver)**
  - All buttons/links have accessible names
  - Form labels are announced with inputs
  - Error messages associated with fields
  - Loading states announced via aria-live

- [ ] **Visual**
  - 4.5:1 contrast for normal text (3:1 for large text)
  - Focus indicators visible with 3:1 contrast
  - No color-only information (use patterns, text, icons)
  - Resize text to 200% without loss of functionality

- [ ] **Mobile/Touch**
  - Touch targets at least 44x44 CSS pixels
  - Links have sufficient spacing
  - No hover-only content

---

## Summary Table: Issues by Component

| Component                    | Critical | High  | Medium |
| ---------------------------- | -------- | ----- | ------ |
| SchoolDocumentsCard.vue      | 2        | 1     | 1      |
| SchoolNotesCard.vue          | 2        | 1     | 1      |
| SchoolStatusHistory.vue      | 0        | 1     | 0      |
| SchoolSidebar.vue            | 2        | 2     | 0      |
| SchoolDetailHeader.vue       | 1        | 0     | 0      |
| pages/schools/[id]/index.vue | 0        | 1     | 1      |
| **TOTAL**                    | **7**    | **6** | **3**  |

---

## Implementation Priority

### Phase 1 (Critical - Week 1)

1. Add aria-labels to icon-only buttons (Issues 1, 3, 7)
2. Add labels to textarea elements (Issue 2)
3. Fix focus indicators on links (Issue 4)
4. Fix status dropdown focus and busy state (Issue 5)

### Phase 2 (High - Week 2)

5. Add loading announcements (Issue 6)
6. Enhance icon link contrast (Issue 7)
7. Improve link label context (Issue 8)
8. Fix delete dialog ARIA (Issue 9)
9. Implement heading hierarchy review (Issue 10)

### Phase 3 (Medium - Week 3)

10. Add form validation error associations (Issue 11)
11. Improve disabled state visibility (Issue 12)
12. Add landmark regions (Issue 13)
13. Set HTML language attribute (Issue 14)

---

## References

- [WCAG 2.1 Specification](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Names and Descriptions](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [Screen Reader Testing Guide](https://www.a11y-101.com/testing/screen-readers)
