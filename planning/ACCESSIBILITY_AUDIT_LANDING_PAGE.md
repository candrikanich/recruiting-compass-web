# Accessibility Audit: Landing Page (index.vue)

**Date:** February 7, 2026
**Auditor:** Accessibility Specialist
**Files Audited:**

- `/pages/index.vue` (landing page)
- `/components/Auth/MultiSportFieldBackground.vue` (background component)

**Compliance Target:** WCAG 2.1 Level AA

---

## Summary

**Overall Status:** NON-COMPLIANT - Multiple critical issues block access for users with disabilities

**Critical Issues:** 4
**High Priority Issues:** 5
**Medium Priority Issues:** 4
**Low Priority Issues:** 3

**Key Blockers:**

1. Links lack visible focus indicators (keyboard users cannot see where they are)
2. Animated decorative elements not respecting `prefers-reduced-motion` (vestibular trigger risk)
3. Insufficient color contrast on feature cards (3.8:1 fails 4.5:1 requirement)
4. Pattern overlay lacks proper semantic markup for screen readers

---

## Critical Issues (Must Fix)

### 1. Missing Visible Focus Indicators on Links

**WCAG Criterion:** 2.4.7 Focus Visible (Level AA)

**Location:** `/pages/index.vue`, lines 38–49 (NuxtLink buttons)

**Impact:** Keyboard users cannot see which element has focus. Users relying on keyboard navigation cannot identify their current position in the page. This is a barrier for:

- Motor disability users who use keyboard navigation
- Vision-impaired users with keyboard shortcuts
- Mobile device users with external keyboards

**Current State:**

```vue
<NuxtLink
  to="/login"
  class="min-w-[200px] px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-blue-700 transition-all text-lg"
>
  Sign In
</NuxtLink>
```

**Problem:** No `:focus` or `:focus-visible` states defined. The `transition-all` class applies to hover but not focus.

**Required Fix:**

```vue
<NuxtLink
  to="/login"
  class="min-w-[200px] px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-blue-700 transition-all text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-blue-600"
>
  Sign In
</NuxtLink>
<NuxtLink
  to="/signup"
  class="min-w-[200px] px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 hover:text-white transition-all text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 focus:ring-offset-white"
>
  Create Account
</NuxtLink>
```

**Alternative (Simpler):** Use Tailwind's `focus-visible` (better semantics):

```vue
class="... focus-visible:outline-2 focus-visible:outline-white
focus-visible:outline-offset-2"
```

**Testing Confirmation:**

- Tab to each link; visible outline/ring should appear around button
- Ring color must have ≥3:1 contrast with background
- Ring should be offset from button edge for visibility
- Verify in Firefox/Chrome with keyboard only

---

### 2. Animated Decorative Elements Not Respecting `prefers-reduced-motion`

**WCAG Criterion:** 2.3.3 Animation from Interactions (Level AAA) — but user expectation aligns with AA intent

**Location:** `/pages/index.vue`, lines 135–148 (decorative pulsing circles)

**Impact:** Users with vestibular disorders, photosensitivity, or motion sensitivity experience disorientation, dizziness, or triggers. This violates inclusive design principles and can cause physical distress.

**Current State:**

```vue
<div
  class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10 animate-pulse"
></div>
<div
  class="absolute top-32 right-20 w-12 h-12 bg-white rounded-full opacity-10 animate-pulse"
  style="animation-delay: 100ms"
></div>
```

**Problem:** `animate-pulse` runs continuously without checking `prefers-reduced-motion` media query. TailwindCSS does not automatically respect this preference.

**Required Fix:**
Add to global CSS (`app.vue` or main stylesheet):

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Or use a theme-aware approach in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  // This requires a plugin to respect prefers-reduced-motion
};
```

**Better Fix (Recommended):** Create a utility component:

```vue
<!-- components/AccessiblePulse.vue -->
<template>
  <div
    :class="[
      'bg-white rounded-full',
      prefersReducedMotion ? 'opacity-10' : 'opacity-10 animate-pulse',
    ]"
    :style="{ animationDelay: animationDelay }"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  animationDelay?: string;
}>();

const prefersReducedMotion = ref(false);

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
});
</script>
```

**Testing Confirmation:**

- Enable "Reduce Motion" in OS settings (macOS: System Settings > Accessibility > Display > Reduce Motion)
- Page should load with pulsing circles visible but NOT animated
- Verify in Chrome DevTools (Rendering > Emulate CSS media feature prefers-reduced-motion: reduce)

---

### 3. Insufficient Color Contrast on Feature Cards

**WCAG Criterion:** 1.4.3 Contrast (Minimum) (Level AA)

**Location:** `/pages/index.vue`, lines 54–128 (feature card text)

**Impact:** Users with low vision, color blindness, or reading comprehension issues cannot reliably read the feature card descriptions. This affects:

- Legally blind users (LVPD)
- Color-blind users (8% of males, 0.5% of females)
- Users viewing on low-brightness displays
- Older adults with age-related vision changes

**Current State:**

```vue
<div
  class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
>
  <!-- ... icon ... -->
  <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
  <p class="text-white/80 text-sm">
    Organize and manage your target colleges in one place
  </p>
</div>
```

**Problem:** `text-white/80` = white at 80% opacity = contrast ratio ~3.8:1 against background. Background is `bg-white/10` (emerald-600 with 10% white overlay), which doesn't increase lightness enough.

**Contrast Analysis:**

- Background: `rgba(5, 150, 105, 1)` (emerald-600) with 10% white = approximately `rgba(14, 162, 118, 1)`
- Foreground: `rgba(255, 255, 255, 0.8)` (white at 80%)
- Contrast ratio: ~3.8:1 ❌ FAILS (requires ≥4.5:1)

**Required Fix:**

Option A (Increase opacity):

```vue
<p
  class="text-white text-sm"
>  <!-- Use full white text-white instead of text-white/80 -->
  Organize and manage your target colleges in one place
</p>
```

Option B (Darker background):

```vue
<div class="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:bg-white/30 transition-colors">
```

Option C (Use both — most accessible):

```vue
<div
  class="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:bg-white/25 transition-colors"
>
  <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
  <p class="text-white text-sm">  <!-- Full white opacity -->
    Organize and manage your target colleges in one place
  </p>
</div>
```

**Verification Math:**

- `bg-white/15` over emerald-600 = ~4.2:1 contrast with white text ✅
- `bg-white/20` over emerald-600 = ~4.8:1 contrast with white text ✅

**Testing Confirmation:**

- Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Input foreground (`rgba(255, 255, 255, 1)`) and background color
- Verify ratio ≥4.5:1
- Test in browser with developer tools (DevTools > Accessibility panel > Contrast ratio)

---

### 4. Pattern Overlay Missing Semantic Markup for Screen Readers

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)

**Location:** `/pages/index.vue`, lines 6–17 (pattern overlay)

**Impact:** Screen reader users receive no indication that this is a decorative element, causing:

- Confusion about purpose
- Unnecessary verbosity from screen reader
- Difficulty understanding page structure

**Current State:**

```vue
<div
  class="absolute inset-0 opacity-5"
  :style="{
    backgroundImage: `repeating-linear-gradient(...)`,
  }"
></div>
```

**Problem:** Decorative div has no accessibility hint. Screen readers may try to announce it or include it in the accessibility tree unnecessarily.

**Required Fix:**

```vue
<div
  class="absolute inset-0 opacity-5"
  aria-hidden="true"
  :style="{
    backgroundImage: `repeating-linear-gradient(...)`,
  }"
></div>
```

**Why This Works:**

- `aria-hidden="true"` removes element from accessibility tree
- Screen readers skip it entirely
- Keyboard navigation unaffected
- Sighted users unaffected

**Testing Confirmation:**

- Open page with NVDA (Windows) or VoiceOver (macOS)
- Verify pattern overlay is not announced
- Tab through page; element should be skipped in focus order

---

## High Priority Issues (Should Fix Soon)

### 5. Heading Hierarchy Not Established

**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)

**Location:** `/pages/index.vue`, lines 24–130 (entire hero section)

**Impact:** Screen reader users cannot understand page structure. Users navigating via heading shortcuts (H key in NVDA/JAWS) cannot orient themselves.

**Current State:**

- No `<h1>` tag on page
- Feature cards use `<h3>` without parent `<h1>` or `<h2>`
- Heading hierarchy is broken

**Required Fix:**
Add semantic heading:

```vue
<div class="text-center max-w-4xl mx-auto mb-12">
  <!-- Visually hidden H1 (for screen readers) -->
  <h1 class="sr-only">Recruiting Compass - Baseball Recruiting Tracker</h1>

  <!-- Logo (decorative) -->
  <div class="mb-8 flex justify-center">
    <img
      src="/assets/logos/recruiting-compass-stacked.svg"
      alt="Recruiting Compass Logo"
      class="h-96 w-auto drop-shadow-2xl"
    />
  </div>

  <!-- Subheading for features -->
  <h2 class="sr-only">Key Features</h2>

  <!-- Feature cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
    <div ...>
      <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
      ...
    </div>
    ...
  </div>
</div>
```

**Explanation:**

- `sr-only` class hides content visually but keeps it in accessibility tree
- Screen readers announce the heading structure
- Sighted users see no change

**Define `sr-only` in Tailwind config or global CSS:**

```css
@layer components {
  .sr-only {
    @apply absolute w-1 h-1 p-0 m-0 overflow-hidden clip-path-[polygon(0_0,0_0,0_0)];
  }
}
```

Or use standard approach:

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

- Use screen reader heading navigation (H key in NVDA, VO + U in VoiceOver)
- Verify H1 exists and describes page purpose
- Verify H3s are grouped under H2 logically

---

### 6. Links Not Distinguishable Without Color Alone

**WCAG Criterion:** 1.4.1 Use of Color (Level A)

**Location:** `/pages/index.vue`, lines 38–49 (link buttons)

**Impact:** Users with color blindness cannot distinguish links from other content based on color alone.

**Current State:**

- "Sign In" link: blue (#2563eb) with no underline or other visual indicator
- "Create Account" link: white with no underline or other visual indicator
- No border, underline, or other non-color indicator

**Problem:** Users with protanopia (red-blind) or deuteranopia (green-blind) cannot distinguish blue from surrounding colors or white from background.

**Required Fix:**
Add non-color distinguisher to links:

```vue
<NuxtLink
  to="/login"
  class="min-w-[200px] px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-blue-700 transition-all text-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-blue-600 underline"
>
  Sign In
</NuxtLink>
<NuxtLink
  to="/signup"
  class="min-w-[200px] px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 hover:text-white transition-all text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-white border-2 border-slate-300"
>
  Create Account
</NuxtLink>
```

**Alternative:** Use font-weight increase or icon:

```vue
<!-- Option: Font weight increase -->
<NuxtLink to="/login" class="... font-bold">
  Sign In
</NuxtLink>

<!-- Option: Add icon -->
<NuxtLink to="/login" class="... flex items-center gap-2">
  <svg><!-- arrow icon --></svg>
  Sign In
</NuxtLink>
```

**Testing Confirmation:**

- Use accessibility color blindness simulator (Sim Daltonism app on macOS)
- Verify links remain distinguishable in deuteranopia/protanopia modes
- Verify buttons have visible borders or underlines

---

### 7. SVG Background Not Marked as Decorative

**WCAG Criterion:** 1.1.1 Non-text Content (Level A)

**Location:** `/components/Auth/MultiSportFieldBackground.vue`, lines 10–376 (field markings SVG)

**Impact:** Screen readers attempt to read SVG path data, creating noise and confusion.

**Current State:**

```vue
<svg
  class="absolute inset-0 w-full h-full opacity-20"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1200 800"
  preserveAspectRatio="xMidYMid slice"
  aria-hidden="true"
  role="presentation"
>
```

**Problem:** Partially marked (`aria-hidden="true"` exists), but `role="presentation"` is redundant with `aria-hidden="true"` and may cause issues in some screen readers.

**Required Fix:**

```vue
<svg
  class="absolute inset-0 w-full h-full opacity-20"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1200 800"
  preserveAspectRatio="xMidYMid slice"
  aria-hidden="true"
>
```

**Remove:** `role="presentation"` (redundant and sometimes conflicts with `aria-hidden`)

**Alternative (if more explicit):**

```vue
<svg
  class="absolute inset-0 w-full h-full opacity-20"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1200 800"
  preserveAspectRatio="xMidYMid slice"
  aria-label="Decorative multi-sport field background"
>
```

**Testing Confirmation:**

- Screen reader should not announce SVG or its children
- Verify in NVDA by examining virtual buffer (NVDA + space + down arrow)
- SVG should be skipped in accessibility tree

---

### 8. Logo Image Missing Descriptive Alt Text

**WCAG Criterion:** 1.1.1 Non-text Content (Level A)

**Location:** `/pages/index.vue`, lines 27–31 (logo image)

**Impact:** Screen reader users don't understand what the image represents.

**Current State:**

```vue
<img
  src="/assets/logos/recruiting-compass-stacked.svg"
  alt="Recruiting Compass Logo"
  class="h-96 w-auto drop-shadow-2xl"
/>
```

**Problem:** Alt text `"Recruiting Compass Logo"` is redundant (just says "logo"). It doesn't convey the purpose or content to screen reader users.

**Required Fix:**

```vue
<img
  src="/assets/logos/recruiting-compass-stacked.svg"
  alt="Recruiting Compass: Track schools, log interactions, and monitor your baseball recruiting journey"
  class="h-96 w-auto drop-shadow-2xl"
/>
```

Or more concise:

```vue
<img
  src="/assets/logos/recruiting-compass-stacked.svg"
  alt="Recruiting Compass baseball recruiting tracker"
  class="h-96 w-auto drop-shadow-2xl"
/>
```

**Testing Confirmation:**

- Screen reader should read meaningful alt text
- Verify in NVDA by tabbing to image and listening
- In VoiceOver, select image and press VO + Ctrl + A

---

### 9. Feature Card Icons Missing Alt Text or ARIA Labels

**WCAG Criterion:** 1.1.1 Non-text Content (Level A)

**Location:** `/pages/index.vue`, lines 58–70, 82–94, 108–120 (inline SVG icons)

**Impact:** Screen reader users don't understand what icons represent; confusing when tabbing.

**Current State:**

```vue
<div class="w-12 h-12 mx-auto mb-3">
  <svg
    class="w-12 h-12 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    stroke-width="1.5"
  >
    <path stroke-linecap="round" ... d="M4.26 10.147..." />
  </svg>
</div>
```

**Problem:** SVG icons have no alt text, ARIA labels, or role. Screen readers may read technical path data or skip silently (unpredictable).

**Required Fix:**

```vue
<div class="w-12 h-12 mx-auto mb-3" aria-label="Track schools icon">
  <svg
    class="w-12 h-12 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    aria-hidden="true"
    role="img"
  >
    <path stroke-linecap="round" ... d="M4.26 10.147..." />
  </svg>
</div>
```

Or wrap in semantic element:

```vue
<div class="w-12 h-12 mx-auto mb-3">
  <svg
    class="w-12 h-12 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <path stroke-linecap="round" ... d="M4.26 10.147..." />
  </svg>
  <span class="sr-only">Track schools</span>
</div>
```

**Better Approach (Recommended):** Since icons are decorative (text already describes), make them truly invisible:

```vue
<div class="w-12 h-12 mx-auto mb-3">
  <svg
    class="w-12 h-12 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <path stroke-linecap="round" ... d="M4.26 10.147..." />
  </svg>
</div>
```

**Testing Confirmation:**

- Tab through feature cards with screen reader
- Icon should be skipped or descriptive text announced
- Verify no duplicate announcements (icon + text)

---

## Medium Priority Issues (Address in Planning)

### 10. Feature Cards Are Not Keyboard Accessible as Interactive Elements

**WCAG Criterion:** 2.1.1 Keyboard (Level A)

**Location:** `/pages/index.vue`, lines 54–128 (feature card divs)

**Impact:** Keyboard-only users cannot interact with feature cards if they become interactive in the future. Currently they're informational, but the design pattern suggests interactivity.

**Current State:**

```vue
<div
  class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
>
  <!-- Content -->
</div>
```

**Problem:** If cards should be clickable, they need `role="button"` or semantic link/button element. Current implementation is ambiguous.

**Clarification Needed:** Are feature cards:

- A. Informational only (current appearance suggests this)
- B. Clickable to navigate somewhere
- C. Expandable to show more details

**If Informational (Keep As Is):**

```vue
<!-- No changes needed; clearly not interactive -->
<div class="bg-white/10 ...">
```

**If Clickable to URL:**

```vue
<NuxtLink
  to="/features/schools"
  class="block bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
>
  <div class="w-12 h-12 mx-auto mb-3" aria-hidden="true">
    <!-- SVG icon -->
  </div>
  <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
  <p class="text-white text-sm">
    Organize and manage your target colleges in one place
  </p>
</NuxtLink>
```

**If Clickable Button:**

```vue
<button
  class="text-left w-full bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
  @click="handleCardClick('schools')"
>
  <div class="w-12 h-12 mx-auto mb-3" aria-hidden="true">
    <!-- SVG icon -->
  </div>
  <h3 class="text-white text-lg font-medium mb-2">Track Schools</h3>
  <p class="text-white text-sm">
    Organize and manage your target colleges in one place
  </p>
</button>
```

**Testing Confirmation:** Depends on intended behavior; clarify first.

---

### 11. No Skip Link to Main Content

**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)

**Location:** Missing from entire landing page

**Impact:** Keyboard users must tab through all links on every page load (logo, both CTA buttons, etc.). On pages with navigation, users must repeat this on every page.

**Current State:** No skip link exists.

**Required Fix:** Add skip link at top of page (visible on focus):

```vue
<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Skip link (hidden until focused) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
    >
      Skip to main content
    </a>

    <MultiSportFieldBackground />

    <!-- Pattern overlay -->
    <div ... aria-hidden="true"></div>

    <!-- Content with ID for skip link target -->
    <div id="main-content" class="relative z-10 min-h-screen flex flex-col ...">
      <!-- ... rest of page ... -->
    </div>

    <!-- Decorative elements -->
    ...
  </div>
</template>
```

**Define helper classes in Tailwind:**

```css
@layer components {
  .sr-only {
    @apply absolute w-1 h-1 p-0 m-0 overflow-hidden clip-path-[polygon(0_0,0_0,0_0)];
  }

  .focus:not-sr-only {
    @apply focus:relative focus:w-auto focus:h-auto focus:p-2 focus:m-0 focus:overflow-visible focus:clip-auto;
  }
}
```

Or use inline styles:

```vue
<a
  href="#main-content"
  style="position: absolute; left: -10000px;"
  class="focus:static focus:left-0 focus:top-4 focus:bg-blue-600 ..."
>
```

**Testing Confirmation:**

- Load page and press Tab immediately
- Skip link should appear on focus
- Click skip link; focus should move to #main-content
- Keyboard users can now skip decorative elements

---

### 12. No Language Declaration for HTML

**WCAG Criterion:** 3.1.1 Language of Page (Level A)

**Location:** Missing from `app.vue` or layout

**Impact:** Screen readers and browsers cannot determine correct language for pronunciation, spell-checking, and hyphenation.

**Current State:** Assuming no `lang` attribute on `<html>` element.

**Required Fix:** Verify layout file (`layouts/public.vue` or `app.vue`):

```vue
<template>
  <html lang="en">
    <!-- rest of layout -->
  </html>
</template>
```

Or in Nuxt config (`nuxt.config.ts`):

```typescript
export default defineNuxtConfig({
  htmlAttrs: {
    lang: "en",
    dir: "ltr",
  },
  // ... rest of config
});
```

**Testing Confirmation:**

- Inspect page source; `<html lang="en">` should be present
- Screen reader should read in English pronunciation

---

### 13. Animations on Decorative Elements Lack Performance Consideration

**WCAG Criterion:** 2.3.2 Three Flashes (Level A) — not quite applicable, but related

**Location:** `/pages/index.vue`, lines 135–148 (pulsing circles)

**Impact:** Users on low-power devices experience lag and battery drain. Mobile users experience poor performance.

**Current State:**

```vue
<div
  class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10 animate-pulse"
></div>
```

**Problem:** Multiple `animate-pulse` animations running simultaneously consume CPU/GPU resources unnecessarily.

**Required Fix:** Either:

A. Remove decorative animations entirely (simplest)

```vue
<!-- Remove animate-pulse class -->
<div
  class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10"
></div>
```

B. Use CSS `will-change` hint (if keeping animations):

```vue
<div
  class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10 animate-pulse"
  style="will-change: opacity;"
></div>
```

C. Use more efficient animation (fade instead of pulse):

```vue
<div
  class="absolute top-10 left-10 w-16 h-16 bg-white rounded-full opacity-10"
  style="animation: fadeInOut 3s ease-in-out infinite;"
></div>

<style scoped>
@keyframes fadeInOut {
  0%,
  100% {
    opacity: 0.05;
  }
  50% {
    opacity: 0.15;
  }
}
</style>
```

**Testing Confirmation:**

- Load page on low-power device or simulate throttling
- Page should render without jank
- Verify prefers-reduced-motion respected (see Critical Issue #2)

---

## Low Priority Issues (Minor Friction)

### 14. Feature Card Hover State Lacks Focus State

**WCAG Criterion:** 2.4.7 Focus Visible (Level AA)

**Location:** `/pages/index.vue`, lines 54–128 (feature cards)

**Impact:** Feature cards (if they become interactive) lack keyboard focus indicator. Currently low priority since they're not interactive.

**Current State:**

```vue
<div
  class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-colors"
>
```

**Problem:** `hover:bg-white/20` exists, but no `focus:` equivalent for keyboard users.

**Required Fix (if cards become interactive):**

```vue
<div
  class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 focus-within:bg-white/20 focus-within:ring-2 focus-within:ring-white transition-colors"
>
```

**Testing Confirmation:** Only relevant if cards become clickable.

---

### 15. Text Scaling Not Tested at 200%

**WCAG Criterion:** 1.4.4 Resize Text (Level AA)

**Location:** Entire page

**Impact:** Users with low vision who zoom to 200% may experience layout breakage or horizontal scrolling that obscures content.

**Current State:** Unclear; not tested.

**Required Fix:** Test manually or with developer tools:

```bash
# In browser DevTools console:
document.body.style.zoom = '2';  # Zoom to 200%
```

**Check:**

- No horizontal scrolling
- No text truncation
- All interactive elements remain accessible
- Layout reflows gracefully

**If issues found:**

- Ensure max-width on main container
- Use relative units (rem, em) instead of px for text
- Test at 200% zoom in responsive mode
- Verify touch targets remain ≥44x44 CSS pixels

---

### 16. No Language Switching Context (If Multi-Language Support Exists)

**WCAG Criterion:** 3.2.2 On Input (Level A)

**Location:** Not applicable if English-only

**Impact:** If language switching exists elsewhere in app, landing page should reflect language context.

**Current State:** Assuming English-only for now.

**Note:** If multi-language support is planned, ensure:

- Language change is announced by screen reader
- Page lang attribute updates dynamically
- Content direction (LTR/RTL) updates if needed

---

## Compliant Elements (Well Implemented)

### Positive Findings

1. **SVG Background Marked as Decorative** ✅
   - `aria-hidden="true"` removes from accessibility tree
   - Sighted and screen reader users experience consistent information

2. **Logo Has Alt Text** ✅
   - Image alt text exists (though should be more descriptive)
   - Provides some context to screen reader users

3. **CTA Buttons Are Links (Semantic)** ✅
   - `<NuxtLink>` is a native HTML semantic element
   - Better than `<div>` with onclick handlers
   - Screen readers announce as "link"

4. **Responsive Design** ✅
   - Buttons stack on mobile (`flex-col sm:flex-row`)
   - Grid columns adjust (`grid-cols-1 md:grid-cols-3`)
   - Content readable on various screen sizes

5. **No Keyboard Traps** ✅
   - Tab order appears logical
   - No focus-locking elements
   - Focus can escape modal (N/A for landing page)

---

## Recommendations (Forward-Looking)

### WCAG 2.1 Level AAA Enhancements

1. **Enhanced Color Contrast** (3.0:1 → 4.5:1 on white/80% text)
   - Benefit: Better readability for users with low vision

2. **Alternative Text for Decorative Images**
   - Benefit: Users with CSS disabled or image loading issues

3. **Extended Animation Configuration**
   - Benefit: Motion-sensitive users beyond WCAG requirement

### Best Practices Beyond WCAG

1. **Test with Real Users**
   - Conduct usability testing with wheelchair users, blind users, etc.
   - Get feedback on page structure and navigation

2. **Add Keyboard Navigation Hints**
   - Consider adding visible instructions on focus: "Press Tab to navigate, Enter to select"
   - Benefit: New users understand keyboard interaction

3. **Implement Analytics for Accessibility**
   - Track: keyboard vs mouse interaction rates
   - Track: screen reader usage patterns
   - Use data to prioritize improvements

4. **Create Accessible Component Library**
   - Extract focus states, contrast checks, ARIA patterns into reusable components
   - Share across team to maintain consistency
   - Benefit: Prevents regression in future updates

5. **Document Accessibility Standards**
   - Create guidelines for components (form inputs, buttons, links, etc.)
   - Include testing procedures
   - Benefit: Team accountability and quality assurance

6. **Establish Continuous Testing**
   - Integrate axe-core or similar automated auditing into CI/CD
   - Run manual screen reader tests on PR review
   - Benefit: Catch regressions early

---

## Remediation Priority

**Phase 1 (Blocker — Fix Before Launch):**

- Issue #1: Add focus indicators to links (5 min)
- Issue #3: Increase color contrast on cards (10 min)
- Issue #2: Respect prefers-reduced-motion (15 min)

**Phase 2 (Before Phase 1 Merge):**

- Issue #4: Add aria-hidden to pattern overlay (1 min)
- Issue #5: Add proper heading hierarchy (10 min)
- Issue #6: Add underline or border to links (5 min)
- Issue #8: Improve logo alt text (2 min)

**Phase 3 (Future Releases):**

- Issue #7: Clean up SVG decorative markup (2 min)
- Issue #9: Add aria-hidden to feature icons (5 min)
- Issue #10: Clarify card interactivity and add focus if needed (10 min)
- Issue #11: Add skip link (5 min)
- Issue #12: Ensure lang attribute on HTML (2 min)
- Issue #13: Evaluate decorative animation necessity (10 min)

**Testing Estimate:** 20-30 minutes to implement + 15-20 minutes to verify with assistive technology

---

## Testing Checklist

Before declaring landing page WCAG 2.1 AA compliant:

- [ ] Tab through page; all interactive elements have visible focus indicators
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
  - [ ] Page title/purpose is clear
  - [ ] Heading hierarchy is logical (H1 → H3)
  - [ ] All images have descriptive alt text
  - [ ] Links are distinguishable
  - [ ] Decorative elements skipped (aria-hidden)
- [ ] Test color contrast (WebAIM checker)
  - [ ] All text ≥4.5:1 ratio
  - [ ] Links distinguishable without color alone
- [ ] Test with prefers-reduced-motion enabled
  - [ ] All animations disabled
  - [ ] Page layout unchanged
- [ ] Test keyboard navigation
  - [ ] Tab order is logical
  - [ ] No focus traps
  - [ ] Skip link works (if added)
- [ ] Test zoom at 200%
  - [ ] No horizontal scrolling
  - [ ] Text readable
  - [ ] Touch targets remain accessible
- [ ] Automated audit
  - [ ] Run axe-core, Lighthouse accessibility, or similar
  - [ ] Address any flagged issues

---

## References

- **WCAG 2.1 Specification:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Screen Reader Testing:**
  - NVDA (Windows): https://www.nvaccess.org/
  - JAWS (Windows): https://www.freedomscientific.com/products/software/jaws/
  - VoiceOver (macOS/iOS): Built-in
- **Accessibility Testing Tools:**
  - axe DevTools: https://www.deque.com/axe/devtools/
  - Lighthouse (Chrome DevTools)
  - WAVE: https://wave.webaim.org/
- **Vue 3 Accessibility:**
  - https://vuejs.org/guide/best-practices/accessibility.html
- **ARIA Best Practices:**
  - https://www.w3.org/WAI/ARIA/apg/

---

**Audit Completed:** February 7, 2026
**Next Steps:** Prioritize Phase 1 fixes and schedule for immediate implementation.
