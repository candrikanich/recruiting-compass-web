# Comprehensive WCAG 2.1 AA Accessibility Audit
## The Recruiting Compass - Nuxt 3 Web Application

**Audit Date:** February 2025
**Compliance Target:** WCAG 2.1 Level AA (with notes on AAA opportunities)
**Baseline Assessment:** Generally accessible foundation with identified gaps requiring remediation

---

## Executive Summary

The Recruiting Compass demonstrates a **solid commitment to accessibility** with thoughtful patterns already in place. The application includes skip links, proper semantic HTML, focus trapping for modals, and form label associations. However, **several critical and high-priority gaps** exist that significantly impact users relying on assistive technology. Most issues are **remediable with targeted fixes** rather than architectural changes.

### Critical Blockers (Must Fix for AA Compliance)
- Menu button lacks proper `aria-label`
- Profile dropdown triggers with keyboard require visible focus indicator improvement
- Dropdown menus missing keyboard navigation (arrow keys)
- Multiple buttons with icon-only affordance lacking accessible names
- Some form fields missing explicit `aria-describedby` linking to error IDs

### Compliance Status by Area
| Area | Status | Priority |
|------|--------|----------|
| **Keyboard Navigation** | Partial | HIGH - gaps in dropdown menus and custom controls |
| **Screen Reader Support** | Good | MEDIUM - mostly proper ARIA, some missing labels |
| **Form Accessibility** | Good | MEDIUM - labels present, but some error associations missing |
| **Focus Management** | Good | LOW - focus trapping works, visible indicators need work |
| **Color Contrast** | Good | LOW - most combinations acceptable, minor edge cases |
| **Semantic HTML** | Good | LOW - proper heading hierarchy, role usage |
| **Motion/Animation** | Good | LOW - no animation-heavy patterns that trigger vestibular issues |

---

## Critical Issues (Blocks Access)

### 1. Profile Menu Button Missing `aria-label`
**Location:** `/components/Header/HeaderProfile.vue`, line 4-40
**WCAG Criterion:** 1.1.1 Non-text Content, 4.1.2 Name/Role/Value
**Impact:** Screen reader users cannot identify the button's purpose. Keyboard users cannot confirm the button function on focus.

**Current Code:**
```vue
<button
  data-testid="profile-menu"
  @click="isOpen = !isOpen"
  class="flex items-center gap-2 px-3 py-2 rounded-lg..."
>
  <!-- Avatar -->
  <div class="w-8 h-8 rounded-full...">
    <img :src="profilePhotoUrl" :alt="userName" />
    <span>{{ userInitials }}</span>
  </div>
  <!-- Chevron icon with no label -->
  <svg class="w-4 h-4...">...</svg>
</button>
```

**Problem:** The button contains only an image and icon with no text alternative. Assistive technology announces it as a button with no accessible name.

**Required Fix:**
```vue
<button
  data-testid="profile-menu"
  @click="isOpen = !isOpen"
  :aria-label="`User menu for ${userName}, currently ${isOpen ? 'open' : 'closed'}`"
  :aria-expanded="isOpen"
  aria-haspopup="true"
  class="flex items-center gap-2 px-3 py-2 rounded-lg..."
>
  <!-- Avatar and chevron remain same -->
</button>
```

**Testing:** With NVDA or VoiceOver, activate button focus—you should hear "User menu for [name], currently closed, button."

---

### 2. Mobile Menu Button Missing `aria-label` and `aria-expanded`
**Location:** `/components/Header.vue`, line 34-40
**WCAG Criterion:** 4.1.2 Name/Role/Value, 4.1.3 Status Messages (via aria-expanded)

**Current Code:**
```vue
<button
  @click="toggleMobileMenu"
  class="md:hidden p-2 text-slate-600..."
>
  <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" />
  <XMarkIcon v-else class="w-6 h-6" />
</button>
```

**Problem:** Icon-only button with no accessible name. Screen reader users cannot identify its purpose.

**Required Fix:**
```vue
<button
  @click="toggleMobileMenu"
  :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
  :aria-expanded="isMobileMenuOpen"
  aria-controls="mobile-menu"
  class="md:hidden p-2 text-slate-600..."
>
  <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" aria-hidden="true" />
  <XMarkIcon v-else class="w-6 h-6" aria-hidden="true" />
</button>

<!-- Mobile menu with matching id -->
<div id="mobile-menu" v-if="isMobileMenuOpen" class="md:hidden py-4...">
  <!-- menu content -->
</div>
```

**Testing:** Screen reader should announce: "Open menu, button, collapsed" when closed; "Close menu, button, expanded" when open.

---

### 3. Search Button in Header Lacks Accessible Name
**Location:** `/components/Header.vue`, line 22-29
**WCAG Criterion:** 1.1.1 Non-text Content, 4.1.2 Name/Role/Value

**Current Code:**
```vue
<NuxtLink
  to="/search"
  class="p-2 text-slate-600 hover:text-slate-900..."
  title="Search"
  data-testid="nav-search-button"
>
  <MagnifyingGlassIcon class="w-5 h-5" />
</NuxtLink>
```

**Problem:** Relies on `title` attribute which many screen readers don't announce. No `aria-label`.

**Required Fix:**
```vue
<NuxtLink
  to="/search"
  aria-label="Search coaches and schools"
  title="Search"
  class="p-2 text-slate-600 hover:text-slate-900 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
  data-testid="nav-search-button"
>
  <MagnifyingGlassIcon class="w-5 h-5" aria-hidden="true" />
</NuxtLink>
```

---

### 4. Icon-Only Buttons Throughout Header Lack Accessible Names
**Location:** `/components/Header.vue` multiple, `/components/CoachCard.vue` lines 108-115
**WCAG Criterion:** 4.1.2 Name/Role/Value
**Impact:** Users with screen readers cannot understand button purposes; cannot distinguish between multiple similar buttons.

**Examples Found:**
- Email button (line 108-115 in CoachCard)
- Text/phone button (line 118+)
- All quick action buttons in cards

**Pattern to Fix:**
```vue
<!-- BEFORE: Icon-only, no label -->
<button
  v-if="coach.email"
  @click="emit('email', coach)"
  title="Send email"
  class="p-2 rounded..."
>
  Email
</button>

<!-- AFTER: Proper accessible name -->
<button
  v-if="coach.email"
  @click="emit('email', coach)"
  :aria-label="`Send email to ${coach.email}`"
  class="p-2 rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  Email
</button>
```

---

### 5. Dropdown Menus Missing Keyboard Navigation
**Location:** `/components/Header/HeaderProfile.vue` (no keyboard arrow key support)
**WCAG Criterion:** 2.1.1 Keyboard, 2.4.3 Focus Order
**Impact:** Keyboard-only users cannot navigate menu items with arrow keys. Must Tab through each item sequentially.

**Current Pattern:** Dropdown relies on click only; no keyboard event handlers for arrow keys.

**Required Enhancement:**
```typescript
// In HeaderProfile.vue script setup
const menuRef = ref<HTMLElement | null>(null);
const selectedIndex = ref(-1);

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      isOpen.value = true;
      selectedIndex.value = 0;
    }
    return;
  }

  const menuItems = menuRef.value?.querySelectorAll('a, button');
  if (!menuItems) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, menuItems.length - 1);
      (menuItems[selectedIndex.value] as HTMLElement).focus();
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      (menuItems[selectedIndex.value] as HTMLElement).focus();
      break;
    case 'Escape':
      event.preventDefault();
      isOpen.value = false;
      break;
  }
};
```

---

## High Priority Issues (Significant Barriers)

### 1. Focus Indicators Insufficient on Interactive Elements
**Location:** Throughout codebase (focus rings present but contrast weak on some combinations)
**WCAG Criterion:** 2.4.7 Focus Visible
**Impact:** Keyboard users, especially with low vision, struggle to locate focus position.

**Current Pattern (Examples):**
```vue
<!-- Header navigation links -->
<NuxtLink
  :class="[
    'flex items-center gap-2 px-3...',
    isActive(item.to)
      ? 'bg-brand-blue-100 text-brand-blue-700'  <!-- Light focus state -->
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  ]"
>
```

**Issue:** When a dark-text link on slate-100 bg gets focus, the focus ring may not have sufficient contrast. The bg-brand-blue-100 (very light blue) with brand-blue-700 text doesn't provide clear visual distinction against the blue-focused state.

**Required Fix:**
```vue
<NuxtLink
  :class="[
    'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-600', <!-- Add explicit focus ring with offset -->
    isActive(item.to)
      ? 'bg-brand-blue-100 text-brand-blue-700'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  ]"
>
```

**Best Practice:** Add `:focus-visible { outline: 3px solid; outline-offset: 2px; }` as a base utility in Tailwind or global styles. Minimum 3:1 contrast ratio required (WCAG 2.4.7 for visual focus indicator).

---

### 2. Profile Photo Dropdown Missing `aria-owns` Relationship
**Location:** `/components/Header/HeaderProfile.vue`, line 51-86
**WCAG Criterion:** 1.3.1 Info and Relationships
**Impact:** Screen reader users may not understand the relationship between the button and the dropdown menu.

**Current Code:**
```vue
<!-- Button -->
<button @click="isOpen = !isOpen" class="...">
  <!-- Avatar content -->
</button>

<!-- Dropdown (no relationship to button) -->
<div v-if="isOpen" class="absolute right-0...">
  <!-- Menu items -->
</div>
```

**Required Fix:**
```vue
<!-- Button with menu relationship -->
<button
  @click="isOpen = !isOpen"
  :aria-label="`User menu for ${userName}`"
  :aria-expanded="isOpen"
  aria-haspopup="menu"
  aria-owns="profile-menu"
  class="..."
>
  <!-- Avatar -->
</button>

<!-- Dropdown with proper role and id -->
<div
  v-if="isOpen"
  id="profile-menu"
  role="menu"
  class="absolute right-0..."
>
  <NuxtLink
    to="/settings"
    role="menuitem"
    @click="isOpen = false"
    class="..."
  >
    Settings
  </NuxtLink>
  <!-- Other menu items with role="menuitem" -->
</div>
```

---

### 3. Form Select Component Missing `aria-describedby` for Error State
**Location:** `/components/DesignSystem/Form/FormSelect.vue`, line 59-76
**WCAG Criterion:** 3.3.1 Error Identification, 3.3.4 Error Prevention
**Impact:** Screen reader users may not clearly associate error messages with the select field that triggered them.

**Current Code:**
```vue
<select
  :id="inputId"
  :aria-invalid="!!error"
  :aria-describedby="error ? `${inputId}-error` : undefined"
  class="..."
  :class="{ 'border-red-500': error }"
  @input="handleInput"
>
  <option v-for="option in options" :key="option.value" :value="option.value">
    {{ option.label }}
  </option>
</select>
<DesignSystemFieldError v-if="error" :id="`${inputId}-error`" :error="error" />
```

**Issue:** The `aria-describedby` linking is correct, but the FieldError component should explicitly announce that it's describing the field. Verify the error element has proper association.

**Verification Needed:** Confirm that when focus returns to a select with an error, screen reader announces the error message. Test in NVDA, JAWS, and VoiceOver.

---

### 4. Mobile Menu Navigation Links Don't Provide Active State Feedback
**Location:** `/components/Header.vue`, lines 59-74
**WCAG Criterion:** 3.2.3 Consistent Navigation, 4.1.2 Name/Role/Value
**Impact:** Keyboard users navigating mobile menu cannot identify the current active page in the menu.

**Current Code:**
```vue
<NuxtLink
  v-for="item in navItems"
  :to="item.to"
  :class="[
    isActive(item.to)
      ? 'bg-blue-50 text-blue-600'
      : 'text-slate-600 hover:bg-slate-50'
  ]"
  @click="closeMobileMenu"
>
  <component :is="item.icon" class="w-5 h-5" />
  <span>{{ item.label }}</span>
</NuxtLink>
```

**Problem:** Only color indicates active state. Screen reader users don't know which link is current without relying on visual context.

**Required Fix:**
```vue
<NuxtLink
  v-for="item in navItems"
  :to="item.to"
  :aria-current="isActive(item.to) ? 'page' : undefined"
  :class="[
    isActive(item.to)
      ? 'bg-blue-50 text-blue-600'
      : 'text-slate-600 hover:bg-slate-50'
  ]"
  @click="closeMobileMenu"
>
  <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
  <span>{{ item.label }}</span>
</NuxtLink>
```

**Result:** Screen reader announces "Dashboard, current page" when link is active.

---

### 5. CoachCard Button Labels Insufficient for Context
**Location:** `/components/CoachCard.vue`, lines 108-122
**WCAG Criterion:** 2.4.4 Link Purpose, 4.1.2 Name/Role/Value
**Impact:** Button labels like "Email" and "Text" are ambiguous without coach context. Screen reader users with low vision need more explicit labels.

**Current Code:**
```vue
<button
  v-if="coach.email"
  @click="emit('email', coach)"
  title="Send email"
  class="p-2 rounded..."
>
  Email
</button>
```

**Better Approach:**
```vue
<button
  v-if="coach.email"
  @click="emit('email', coach)"
  :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
  class="px-3 py-2 rounded... focus:ring-2 focus:ring-blue-500"
>
  Email
</button>
```

---

## Medium Priority Issues (Noticeable Friction)

### 1. Skip Link Styling Inconsistent Across Pages
**Location:**
- `/pages/login.vue` (custom styling)
- `/pages/coaches/new.vue` (custom inline styles)
- `/components/SkipLink.vue` (component styles)

**WCAG Criterion:** 2.4.1 Bypass Blocks
**Impact:** Skip links have different visual presentations, reducing user familiarity. Some skip links may have focus ring styling that clashes with background.

**Current Issues:**
```vue
<!-- In login.vue -->
<a
  href="#login-form"
  class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4..."
>

<!-- In coaches/new.vue -->
<a
  href="#main-content"
  @click="handleSkipLink"
  class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0..."
>

<!-- In SkipLink.vue -->
<a
  :href="to"
  class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4..."
>
```

**Recommendation:** Create a single, consistent skip link component or utility class used everywhere. Ensure all skip links have:
- Consistent positioning (suggest: top-2 left-2 with z-50)
- High contrast focus state (white text, dark background)
- Adequate padding for larger touch targets when focused
- Focus ring visible (3px, 2px offset)

**Standardized Version:**
```vue
<!-- SkipLink.vue - Updated -->
<template>
  <a
    :href="to"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
  >
    {{ text }}
  </a>
</template>
```

---

### 2. Loading States Lack Screen Reader Announcements
**Location:** `/pages/schools/index.vue`, lines 70-80
**WCAG Criterion:** 4.1.3 Status Messages
**Impact:** Screen reader users don't know content is loading; may attempt to interact with non-responsive UI.

**Current Code:**
```vue
<div
  v-if="loading"
  class="text-center py-12"
  role="status"
  aria-live="polite"
>
  <div
    class="animate-spin w-8 h-8 border-4 border-blue-500..."
    aria-hidden="true"
  />
  <p class="text-slate-600">Loading schools...</p>
</div>
```

**Good!** This component correctly uses `role="status"` and `aria-live="polite"`. However, verify that:
1. The message is concise and specific: "Loading schools..." (good)
2. The loading spinner has `aria-hidden="true"` (present, good)
3. When loading completes, a new polite announcement is made: "X schools loaded"

**Enhancement Needed:**
```vue
<div
  v-if="loading"
  class="text-center py-12"
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <div class="animate-spin..." aria-hidden="true" />
  <p class="text-slate-600">Loading schools...</p>
</div>

<!-- When loading completes, ensure this is announced -->
<div v-if="!loading && filteredSchools.length > 0" role="status" aria-live="polite">
  <p class="sr-only">{{ filteredSchools.length }} schools loaded and displayed</p>
</div>
```

---

### 3. Form DateInput Lacks Aria-Describedby on Error
**Location:** `/components/DesignSystem/Form/FormDateInput.vue`, line 43-52
**WCAG Criterion:** 3.3.1 Error Identification

**Current Code:**
```vue
<input
  :id="id"
  type="date"
  :aria-invalid="!!error"
  class="..."
  @input="handleInput"
/>
<DesignSystemFieldError :error="error" />
```

**Problem:** Missing `aria-describedby` connection to the error message element.

**Required Fix:**
```vue
<input
  :id="id"
  type="date"
  :aria-invalid="!!error"
  :aria-describedby="error ? `${id}-error` : undefined"
  class="..."
  @input="handleInput"
/>
<DesignSystemFieldError
  v-if="error"
  :id="`${id}-error`"
  :error="error"
/>
```

---

### 4. Textarea Component Missing Label Structure
**Location:** `/components/DesignSystem/Form/FormTextarea.vue`
**WCAG Criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions

**Issue:** If this component doesn't pair label and textarea via `for/id` attributes, form users won't have proper label association.

**Recommended Pattern:**
```vue
<template>
  <div>
    <label :for="textareaId" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${textareaId}-error` : undefined"
      class="..."
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <DesignSystemFieldError
      v-if="error"
      :id="`${textareaId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    required?: boolean
    disabled?: boolean
    error?: string
  }>(),
  { required: false, disabled: false, error: '' }
)

defineEmits<{ 'update:modelValue': [value: string] }>()

const textareaId = useId()
</script>
```

---

### 5. Time Input Component Needs Validation
**Location:** `/components/DesignSystem/Form/FormTimeInput.vue`
**WCAG Criterion:** 2.5.4 Motion Actuation (if using spinners)

**Recommendation:** If the time input uses spinner controls (up/down arrows), ensure:
- Spinner buttons have proper `aria-label` (e.g., "Increase hours")
- Keyboard equivalents work (arrow keys, +/- keys)
- All controls keyboard accessible without motion requirement

---

## Low Priority Issues (Best Practice Improvements)

### 1. Notification Center Button Lacks Label
**Location:** `/components/Header.vue`, line 30
**WCAG Criterion:** 4.1.2 Name/Role/Value

**Current:** Uses component `<NotificationCenter />` without visible text or aria-label.

**Recommendation:** Ensure NotificationCenter has an accessible button with aria-label like:
```vue
<button
  aria-label="View notifications, you have 3 unread messages"
  class="..."
>
  <BellIcon aria-hidden="true" />
</button>
```

---

### 2. FitScore Display May Lack Context
**Location:** `/components/FitScore/FitScoreDisplay.vue`
**WCAG Criterion:** 1.4.5 Images of Text (if FitScore is displayed as image), 4.1.2 Name/Role/Value

**Recommendation:** Ensure numeric fit scores are always accompanied by text description. Example:
```vue
<div class="fit-score">
  <p>Fit Score: <strong>85</strong> out of 100 (Good match)</p>
</div>
```

---

### 3. Badge Component Lacks Context for Color-Coded Information
**Location:** `/components/DesignSystem/Badge.vue`
**WCAG Criterion:** 1.4.1 Use of Color
**Impact:** Color-coding alone (blue vs. red badges) doesn't convey meaning to colorblind users.

**Current Code:**
```vue
<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>
```

**Issue:** If used like `<Badge color="red">Rejected</Badge>`, someone relying solely on color interpretation might miss the status. However, if the text reads "Rejected," it's clear.

**Best Practice:** Ensure badge content (the slot) always includes text that describes the status independently from color.

---

### 4. Heading Hierarchy: Some Pages May Skip H2 or H3
**Location:** Various pages and sections
**WCAG Criterion:** 1.3.1 Info and Relationships (via proper heading structure)

**Good Pattern Found in `/pages/dashboard.vue`:**
```vue
<section aria-labelledby="timeline-heading">
  <h2 id="timeline-heading" class="sr-only">Timeline Summary</h2>
  <DashboardTimelineCard />
</section>
```

**Recommendation:** Continue this pattern across all pages. Structure should follow:
```
h1 (page title)
└── section (heading h2)
    └── subsection (heading h3, if needed)
```

Avoid skipping heading levels (e.g., h1 → h3, skipping h2).

---

### 5. Table Accessibility Not Directly Observed
**Location:** If data tables exist in the codebase
**WCAG Criterion:** 1.3.1 Info and Relationships (via `<thead>`, `<th scope>`)

**Recommendation (Preventive):** When creating tables, always use:
```html
<table>
  <thead>
    <tr>
      <th scope="col">Column Header</th>
      <th scope="col">Another Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
      <td>Data</td>
    </tr>
  </tbody>
</table>
```

Never use `<div>` or `<span>` to create table-like layouts.

---

## Compliant & Well-Implemented Patterns

### 1. Form Input Component (FormInput.vue)
**Strengths:**
- Proper label-to-input association via `for/id`
- Required field indicator with both visual (`*`) and sr-only text
- `aria-invalid` and `aria-describedby` for error states
- Error messages linked with proper IDs

```vue
<!-- Example from FormInput.vue -->
<label :for="inputId" class="block text-sm font-medium text-slate-700 mb-2">
  {{ label }}
  <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
  <span v-if="required" class="sr-only">(required)</span>
</label>
<input
  :id="inputId"
  :aria-invalid="error ? 'true' : undefined"
  :aria-describedby="error ? `${inputId}-error` : undefined"
/>
<DesignSystemFieldError v-if="error" :id="`${inputId}-error`" :error="error" />
```

**Result:** Meets WCAG 3.3.2 (Labels or Instructions) and 3.3.4 (Error Prevention).

---

### 2. Dialog Component with Focus Trap
**Location:** `/components/DesignSystem/ConfirmDialog.vue`
**Strengths:**
- Uses `useFocusTrap()` to manage focus within modal
- Proper `role="dialog"`, `aria-modal="true"`
- Heading and message linked with `aria-labelledby` and `aria-describedby`
- Escape key closes modal
- Focus restored when modal closes

```vue
<!-- From ConfirmDialog.vue -->
<div
  role="dialog"
  aria-modal="true"
  :aria-labelledby="titleId"
  :aria-describedby="messageId"
>
  <h2 :id="titleId">{{ title }}</h2>
  <p :id="messageId">{{ message }}</p>
</div>
```

**Result:** Meets WCAG 2.4.3 (Focus Order) and 3.2.2 (Predictable Behavior).

---

### 3. Toast Notifications with Proper Live Regions
**Location:** `/components/DesignSystem/Toast.vue`
**Strengths:**
- Uses `role="status"` and `role="alert"` correctly
- `aria-live="polite"` for non-critical, `aria-live="assertive"` for errors
- `aria-atomic="true"` ensures entire message is read
- Dismissible with button (not auto-dismissed after fixed time without announcement)

```vue
<!-- From Toast.vue -->
<div
  :role="getToastRole(toast.type)"
  :aria-live="getAriaLive(toast.type)"
  aria-atomic="true"
>
  <!-- Content -->
  <button
    @click="removeToast(toast.id)"
    :aria-label="`Dismiss ${toast.type} notification: ${toast.message}`"
  >
</div>
```

**Result:** Meets WCAG 4.1.3 (Status Messages).

---

### 4. Skip Link Implementation
**Location:** `/components/SkipLink.vue` and used across pages
**Strengths:**
- Hidden from visual display via `.sr-only`
- Visible on focus (`:focus:not-sr-only`)
- High contrast when visible (white text on dark background)
- Correctly targets main content anchors

**Result:** Meets WCAG 2.4.1 (Bypass Blocks).

---

### 5. Page Header with Semantic HTML
**Location:** `/components/PageHeader.vue`
**Strengths:**
- Uses `<h1>` for page title
- Proper semantic `role="banner"` on header
- Logical heading hierarchy

**Result:** Meets WCAG 1.3.1 (Info and Relationships).

---

### 6. Focus Trap Composable
**Location:** `/composables/useFocusTrap.ts`
**Strengths:**
- Correctly identifies focusable elements (including those with `tabindex="0"`)
- Prevents Tab from exiting modal (cycles to last/first element)
- Restores focus to previously focused element on close
- Handles edge cases (container with no focusable elements)

**Result:** Meets WCAG 2.4.3 (Focus Order) for modal dialogs.

---

## Recommendations & Action Plan

### Immediate Actions (Week 1)
1. **Add `aria-label` to all icon-only buttons**
   - Mobile menu toggle
   - Search button
   - Profile button
   - Quick action buttons in cards
   - Estimated effort: 2-3 hours
   - Impact: CRITICAL → HIGH

2. **Enhance menu keyboard navigation**
   - Add arrow key support to profile dropdown
   - Add arrow key support to mobile menu
   - Estimated effort: 4-6 hours
   - Impact: CRITICAL

3. **Link all form errors with `aria-describedby`**
   - Audit all Form* components
   - Verify error IDs match field associations
   - Estimated effort: 2 hours
   - Impact: HIGH

### Near-term Actions (Week 2-3)
4. **Improve focus indicators**
   - Add consistent focus ring utilities to Tailwind config
   - Apply to all interactive elements
   - Test contrast ratios (aim for 3:1 minimum)
   - Estimated effort: 3-4 hours
   - Impact: HIGH

5. **Add `aria-current="page"` to active navigation links**
   - Mobile menu links
   - Header navigation
   - Estimated effort: 1-2 hours
   - Impact: MEDIUM

6. **Standardize skip link styling**
   - Create consistent skip link component
   - Use across all pages
   - Estimated effort: 1 hour
   - Impact: MEDIUM

### Medium-term Actions (This Month)
7. **Keyboard navigation for all custom components**
   - Dropdowns (arrow keys, home/end)
   - Date/time pickers (if applicable)
   - Custom select components
   - Estimated effort: 6-8 hours
   - Impact: HIGH

8. **Testing & Verification**
   - Manual testing with keyboard only
   - Screen reader testing (NVDA, JAWS, VoiceOver)
   - Automated scanning with axe-core or similar
   - Estimated effort: 4-6 hours

### Ongoing
- Add accessibility checks to CI/CD pipeline
- Include accessibility in PR review checklist
- Train team on WCAG basics and patterns
- Monitor for accessibility regressions

---

## Testing Recommendations

### Manual Testing Checklist
- [ ] Navigate entire app using keyboard only (no mouse)
- [ ] Verify all buttons have accessible names when focused
- [ ] Confirm focus visible indicator on all interactive elements
- [ ] Test with screen reader (Windows: NVDA, Mac: VoiceOver)
- [ ] Test with browser zoom at 200%
- [ ] Test with high contrast mode enabled
- [ ] Verify form errors are announced by screen reader
- [ ] Test color contrast ratios (use WebAIM contrast checker)
- [ ] Verify skip links work and are visible on focus

### Automated Tools
- **axe DevTools** (Chrome extension) - quick accessibility scan
- **Lighthouse** (Chrome DevTools) - accessibility audit
- **WAVE** (WebAIM) - detailed accessibility analysis
- **Siteimprove** - color contrast checker
- **HTML Validator** - semantic HTML verification

### Real User Testing
- Consider recruiting users with disabilities for user testing
- Test with actual assistive technology users in your audience
- Gather feedback on pain points and frustrations

---

## Color Contrast Verification

**Summary:** Tailwind color palette defaults are generally WCAG AA compliant. Key combinations to verify:

| Background | Text Color | Contrast Ratio | Status |
|---|---|---|---|
| bg-white | text-slate-600 | ~6.5:1 | ✓ AA |
| bg-slate-50 | text-slate-700 | ~8:1 | ✓ AAA |
| bg-blue-50 | text-blue-600 | ~5:1 | ✓ AA |
| bg-red-50 | text-red-600 | ~5:1 | ✓ AA |
| bg-slate-600 | text-white | ~7:1 | ✓ AAA |
| bg-brand-blue-600 | text-white | ~6:1 | ✓ AA |

**Verify Before Use:** When introducing custom color combinations or light-on-light/dark-on-dark, test with WebAIM Contrast Checker.

---

## WCAG 2.1 Level AAA Opportunities

If the team decides to exceed AA compliance, consider these AAA enhancements:

1. **2.4.8 Focus Visible** - Increase focus ring visibility to 4px with 3px offset
2. **2.5.5 Target Size** - Expand touch targets to minimum 48x48 CSS pixels (vs. 44x44 for AA)
3. **3.2.5 Change on Request** - Avoid automatic page refreshes; always require user action
4. **3.3.5 Help** - Provide context-sensitive help tooltips beyond required field indicators
5. **3.3.6 Error Prevention** - Add confirmation dialogs for high-risk actions

---

## Conclusion

The Recruiting Compass has a **solid accessibility foundation** with thoughtful semantic HTML, proper focus management, and form accessibility patterns already in place. The identified gaps are **remediable with focused effort**, primarily involving:

- Adding missing `aria-label` and `aria-expanded` attributes (quick wins)
- Enhancing keyboard navigation for custom components (medium effort)
- Verifying form error associations (quick verification)

With implementation of the **critical and high-priority fixes**, the application will achieve WCAG 2.1 AA compliance. The well-implemented patterns (skip links, focus trap, form labels) demonstrate a team that values accessibility and should scale these patterns across new features.

**Estimated Total Effort:** 25-40 hours for full WCAG 2.1 AA compliance
**Recommended Timeline:** 4-6 weeks with part-time focus

---

## Appendix: File References for Fixes

### Files Requiring `aria-label` Additions
- `/components/Header.vue` - mobile menu button (line 34)
- `/components/Header/HeaderProfile.vue` - profile button (line 4)
- `/components/Header.vue` - search button (line 22)
- `/components/CoachCard.vue` - quick action buttons (lines 108+)

### Files Requiring Keyboard Navigation Enhancement
- `/components/Header/HeaderProfile.vue` - dropdown menu
- `/components/Header.vue` - mobile menu links

### Files Requiring `aria-describedby` Verification
- `/components/DesignSystem/Form/FormDateInput.vue`
- `/components/DesignSystem/Form/FormTimeInput.vue`
- All custom form input components

### Well-Implemented Reference Files (Examples to Follow)
- `/components/DesignSystem/Form/FormInput.vue` - form patterns
- `/components/DesignSystem/ConfirmDialog.vue` - modal focus trap
- `/components/DesignSystem/Toast.vue` - live regions
- `/components/SkipLink.vue` - skip link pattern
- `/pages/dashboard.vue` - semantic sections with headings

---

**Audit Completed:** February 2025
**Auditor Note:** This audit reflects WCAG 2.1 Level AA standards as of February 2025. Accessibility is an ongoing practice; re-audit after major feature additions or UI refactors to ensure continued compliance.
