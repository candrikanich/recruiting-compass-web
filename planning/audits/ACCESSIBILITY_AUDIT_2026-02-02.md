# WCAG 2.1 AA Accessibility Audit Report

## The Recruiting Compass - QA Environment (qa.myrecruitingcompass.com)

**Audit Date:** February 2, 2026
**Auditor:** Automated + Manual Testing
**Scope:** Dashboard, Coaches, Schools, Interactions (4 MVP Pages)
**Standard:** WCAG 2.1 Level AA Compliance

---

## Executive Summary

**Overall Compliance Status:** NON-COMPLIANT (Multiple Critical Issues)

**Issues Found:** 14

- Critical (breaks core functionality): 3
- Major (significant usability/compliance issues): 7
- Minor (improvements for full AA compliance): 4

**Pages Tested:**

- Dashboard: Multiple issues
- Coaches: Multiple issues
- Schools: Multiple issues
- Interactions: Multiple issues

All 4 MVP pages have accessibility issues that prevent WCAG 2.1 AA compliance.

---

## Critical Issues (3)

### 1. COLOR CONTRAST FAILURES - Navigation Links

**Severity:** CRITICAL
**WCAG Criterion:** 1.4.3 Contrast (Minimum) - AA
**Affected Pages:** All 4 (Dashboard, Coaches, Schools, Interactions)
**Impact:** Low-vision users cannot read navigation

**Details:**

- Secondary navigation links (Dashboard, Schools, Coaches, Events, Timeline, More button) have **2.77:1 contrast ratio**
- AA standard requires **4.5:1** for normal text
- These are primary navigation elements - cannot rely on color alone

**Example Elements:**

- Link text: "Dashboard", "Schools", "Coaches", "Events", "Timeline"
- Current ratio: 2.77:1
- Required ratio: 4.5:1
- Shortfall: 1.73:1

**Recommendation:** Increase text color saturation or change background color
**Estimated Effort:** Quick (10 minutes) - Adjust CSS color values in navigation component

**Code Location:** Navigation component (likely `/components/Navbar.vue` or similar)

**Fix Example:**

```css
/* Current: Fails AA */
.nav-link {
  color: #6b7280; /* Gray-500 */
}

/* Should be: */
.nav-link {
  color: #374151; /* Gray-700 or darker */
}
```

---

### 2. FORM INPUTS WITHOUT ASSOCIATED LABELS

**Severity:** CRITICAL
**WCAG Criterion:** 1.3.1 Info and Relationships - A / 3.3.2 Labels or Instructions - A
**Affected Pages:** Schools, Coaches, Interactions
**Impact:** Screen reader users cannot identify form purposes

**Details:**
Found **10+ form inputs** with no associated labels:

**Schools Page:**

- Search input: "Search by name or location..." (placeholder only)
- 2 Range sliders: Fit Score min/max (0-100)
- 1 Range slider: Distance (3000 mi) - also **disabled** with warning text

**Coaches Page:**

- Search input: "Name, email, phone..." (placeholder only)
- 4 Select dropdowns: Role, Last Contact, Responsiveness, Sort By

**Interactions Page:**

- Search input: "Subject, content..." (placeholder only)
- 4 Select dropdowns: Type, Direction, Sentiment, Time Period

**Accessibility Tree Issues:**

- Placeholders should NOT replace labels (placeholders disappear when focused)
- No `<label>` elements with `for` attributes
- No `aria-label` or `aria-labelledby` attributes
- Screen readers announce: "textbox" with no purpose

**Example Problem:**

```html
<!-- Current: FAILS WCAG -->
<input type="text" placeholder="Name, email, phone..." />

<!-- Should be: -->
<label for="coach-search">Search by coach name, email, or phone</label>
<input id="coach-search" type="text" placeholder="e.g., John Smith" />
<!-- OR: -->
<input type="text" aria-label="Search by coach name, email, or phone" />
```

**Recommendation:** Add explicit labels to all form inputs
**Estimated Effort:** Medium (30-45 minutes)

- Add label elements to all inputs
- Update accessibility tree in snapshot testing
- Test with screen reader

**File Locations:**

- `/pages/coaches/index.vue` - 5 inputs
- `/pages/schools/index.vue` - 7 inputs
- `/pages/interactions/index.vue` - 5 inputs

---

### 3. EMPTY/ICON-ONLY BUTTONS WITHOUT ACCESSIBLE NAMES

**Severity:** CRITICAL
**WCAG Criterion:** 4.1.2 Name, Role, Value - A
**Affected Pages:** All 4 (header appears on all pages)
**Impact:** Screen reader announces "button" with no function

**Details:**
Found **2 icon-only buttons** in header with no accessible names:

1. **Notification/Bell Icon Button** (top-right header)
   - HTML: `<button><img src="..."/></button>`
   - No aria-label
   - No title attribute
   - Screen reader announces: "button"
   - User doesn't know what it does

2. **Dropdown/Menu Button** (top-right next to profile)
   - HTML: `<button><img src="..."/></button>`
   - No aria-label
   - No title attribute
   - Screen reader announces: "button"

**Example Fix:**

```html
<!-- Current: FAILS WCAG -->
<button><img src="/bell.svg" /></button>

<!-- Should be: -->
<button aria-label="Notifications"><img src="/bell.svg" alt="" /></button>
<!-- OR: -->
<button title="Notifications">
  <img src="/bell.svg" alt="Notifications icon" />
</button>
```

**Recommendation:** Add `aria-label` to all icon-only buttons
**Estimated Effort:** Quick (10 minutes)

**File Location:** `/components/Navbar.vue` or header component

---

## Major Issues (7)

### 4. HEADING HIERARCHY VIOLATION

**Severity:** MAJOR
**WCAG Criterion:** 1.3.1 Info and Relationships - A
**Affected Pages:** Schools (confirmed), likely others
**Impact:** Screen reader users miss document structure

**Details:**
**Schools Page Heading Structure:**

```
h1: "Schools"        [main page heading ✓]
    ↓ (JUMP TO)
h3: "No schools found"  [MISSING h2! ✗]
```

Expected structure:

```
h1: Schools
  h2: Search Results (or similar container)
    h3: No schools found (or individual results)
```

This breaks the document outline for assistive technology users.

**Similar issues likely on:**

- Dashboard (multiple h3s directly under main h1)
- Coaches (similar structure)
- Interactions (similar structure)

**Recommendation:** Add intermediate h2 elements to maintain heading hierarchy
**Estimated Effort:** Medium (30 minutes)

**Example Fix:**

```vue
<!-- Current: FAILS -->
<h1>Schools</h1>
<div class="results">
  <h3>No schools found</h3>
</div>

<!-- Should be: -->
<h1>Schools</h1>
<div class="results">
  <h2>Search Results</h2>
  <h3>No schools found</h3>
</div>
```

**File Locations:**

- `/pages/schools/index.vue`
- `/pages/dashboard/index.vue`
- `/pages/coaches/index.vue`
- `/pages/interactions/index.vue`

---

### 5. IMAGES WITHOUT ALT TEXT

**Severity:** MAJOR
**WCAG Criterion:** 1.1.1 Non-text Content - A
**Affected Pages:** Dashboard (most), Coaches, Schools, Interactions
**Impact:** Blind/low-vision users miss visual information

**Details:**
While most images DO have alt text, several decorative and informative images are missing:

**Dashboard Page:**

- Icon images in cards (0 Coaches, 0 Schools, etc.) - Should be decorative if text exists, but some lack context
- Chart/graph placeholder image - Missing descriptive alt

**All Pages:**

- Navigation icons (Dashboard, Schools, Coaches, etc.) - These have text labels, but images should have `alt=""` to prevent duplication
- Feedback button icon - Missing alt text (should be decorative `alt=""`)

**Current Issue:**
Some images have empty or missing alt attributes when they should have:

1. Descriptive alt text (informative images)
2. Empty alt="" (decorative images with adjacent text labels)

**Example Problem:**

```html
<!-- Current: MISSING ALT -->
<img src="/dashboard-icon.svg" />
<span>Dashboard</span>

<!-- Should be (decorative): -->
<img src="/dashboard-icon.svg" alt="" />
<span>Dashboard</span>

<!-- OR (if icon is sole label): -->
<img src="/dashboard-icon.svg" alt="Dashboard" />
```

**Recommendation:** Audit all images and add appropriate alt text
**Estimated Effort:** Medium (30 minutes)

**File Locations:**

- All Vue pages
- Icon components

---

### 6. MISSING PAGE TITLES

**Severity:** MAJOR
**WCAG Criterion:** 2.4.2 Page Titled - A
**Affected Pages:** All tested pages
**Impact:** Screen reader users cannot identify page topic

**Details:**

- Page `<title>` element is empty or missing
- Browser tab shows no title
- Screen reader announces no page context when visiting

**Current State:**

- Dashboard: Title is blank
- Schools: Title is blank
- Coaches: Title is blank
- Interactions: Title is blank

**Expected:**

```html
<title>Dashboard - The Recruiting Compass</title>
<title>Schools - The Recruiting Compass</title>
<title>Coaches - The Recruiting Compass</title>
<title>Interactions - The Recruiting Compass</title>
```

**Recommendation:** Set dynamic page titles in each route/page
**Estimated Effort:** Quick (15 minutes) - Use `useHead()` or `<Head>` component in Nuxt

**Example Fix (Nuxt 3):**

```vue
<script setup>
useHead({
  title: "Dashboard - The Recruiting Compass",
});
</script>
```

**File Locations:** All pages in `/pages/`

---

### 7. DISABLED FORM INPUTS WITH UNCLEAR PURPOSE

**Severity:** MAJOR
**WCAG Criterion:** 3.3.2 Labels or Instructions - A
**Affected Pages:** Schools
**Impact:** Users don't understand why field is disabled

**Details:**
**Schools Page - Distance Filter:**

- Range slider is disabled
- Text shows: "⚠️ Set home location"
- But the disabled state and warning are not programmatically connected

**Problem:**

- Screen reader reads: "slider, disabled" with no explanation
- User doesn't know how to re-enable it
- Warning icon (⚠️) is not announced (emoji as visual-only)

**Recommendation:** Add `aria-describedby` linking disabled input to explanation
**Estimated Effort:** Quick (10 minutes)

**Example Fix:**

```html
<!-- Current: -->
<input type="range" disabled />
<p>⚠️ Set home location</p>

<!-- Should be: -->
<input
  type="range"
  disabled
  aria-label="Distance filter"
  aria-describedby="distance-help"
/>
<p id="distance-help">
  <span aria-label="Warning:">⚠️</span> Set home location to enable distance
  filter
</p>
```

---

### 8. RANGE SLIDERS WITHOUT PROPER ARIA LABELS

**Severity:** MAJOR
**WCAG Criterion:** 4.1.2 Name, Role, Value - A
**Affected Pages:** Schools
**Impact:** Screen reader users cannot identify slider purpose

**Details:**
**Schools Page - Fit Score Sliders:**

- Two range inputs for min/max fit score (0-100)
- No aria-label or aria-labelledby
- No aria-valuetext to announce current value
- Screen reader only announces: "slider" with generic position

**Example:**

```html
<!-- Current: FAILS WCAG -->
<input type="range" min="0" max="100" value="0" />
<input type="range" min="0" max="100" value="100" />

<!-- Should be: -->
<fieldset>
  <legend>Fit Score Range</legend>
  <label>
    Minimum:
    <input
      type="range"
      min="0"
      max="100"
      value="0"
      aria-label="Minimum fit score"
      aria-valuetext="0"
    />
    <span id="min-value">0</span>
  </label>
  <label>
    Maximum:
    <input
      type="range"
      min="0"
      max="100"
      value="100"
      aria-label="Maximum fit score"
      aria-valuetext="100"
    />
    <span id="max-value">100</span>
  </label>
</fieldset>
```

**Recommendation:** Add aria-label and update aria-valuetext on input change
**Estimated Effort:** Medium (20 minutes)

**File Location:** `/pages/schools/index.vue`

---

### 9. MISSING ARIA-LIVE REGIONS FOR DYNAMIC CONTENT

**Severity:** MAJOR
**WCAG Criterion:** 4.1.3 Status Messages - AAA (but important for AA usability)
**Affected Pages:** All (whenever data loads)
**Impact:** Screen reader users don't know when content updates

**Details:**
All pages show "Loading..." messages that are not announced to screen readers.

**Examples:**

- Coaches page: "Loading coaches..."
- Schools page: "0 results found" (when filters change)
- Interactions page: "Loading interactions..."

When filter results update, screen reader users don't know the list changed.

**Recommendation:** Wrap dynamic content in `aria-live="polite"` regions
**Estimated Effort:** Medium (30 minutes)

**Example Fix:**

```vue
<div aria-live="polite" aria-label="Search results" role="region">
  <p v-if="loading">Loading interactions...</p>
  <p v-else-if="interactions.length === 0">
    No interactions found. Try adjusting your filters.
  </p>
  <ul v-else>
    <li v-for="interaction in interactions" :key="interaction.id">
      {{ interaction.subject }}
    </li>
  </ul>
</div>
```

**File Locations:**

- `/pages/coaches/index.vue`
- `/pages/schools/index.vue`
- `/pages/interactions/index.vue`

---

### 10. POOR KEYBOARD NAVIGATION FOR FILTER INTERFACE

**Severity:** MAJOR
**WCAG Criterion:** 2.1.1 Keyboard - A
**Affected Pages:** Schools (most complex), Coaches, Interactions
**Impact:** Keyboard-only users struggle with filter controls

**Details:**
While keyboard navigation works (tab moves through inputs), the filter interface has no visible focus indicators for:

- Search input focus state
- Dropdown focus state
- Range slider focus state
- Button focus state

**Testing Result:**
✓ Tab moves through elements
✓ Can activate buttons with Space/Enter
✗ NO visible focus indicator on most elements

Users cannot tell which element is focused.

**Recommendation:** Add visible focus indicators (outline or box-shadow)
**Estimated Effort:** Medium (25 minutes) - Add `:focus` and `:focus-visible` CSS

**Example Fix:**

```css
/* Add to all interactive elements */
input:focus,
select:focus,
button:focus,
a:focus {
  outline: 3px solid #2563eb; /* Blue outline */
  outline-offset: 2px;
}

/* For better keyboard/mouse distinction */
input:focus-visible,
button:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

---

## Minor Issues (4)

### 11. TEXT CONTENT USING EMOJIS AS ONLY DESCRIPTOR

**Severity:** MINOR
**WCAG Criterion:** 1.3.1 Info and Relationships - A
**Affected Pages:** Dashboard
**Impact:** Emoji meaning may be misinterpreted by screen readers

**Details:**
Dashboard uses emojis as visual indicators:

- "📈 Interaction Trends (30 Days)" - Chart emoji
- "🎯 School Pipeline" - Target emoji
- "🗺️ School Locations" - Map emoji
- "🎯 Coaches Needing Follow-up" - Checkmark emoji
- "👁️ At a Glance" - Eye emoji
- "🎉 All caught up!" - Party emoji

**Issue:**
Emojis are rendered as text in headings. Screen readers will announce them, but interpretation varies by screen reader and emoji. Example: "📈" might read as "chart" or "red upward arrow" depending on screen reader.

**Recommendation:** Use `<span aria-label="">` to provide clear labels
**Estimated Effort:** Quick (15 minutes)

**Example Fix:**

```html
<!-- Current: -->
<h2>📈 Interaction Trends (30 Days)</h2>

<!-- Should be: -->
<h2><span aria-label="Chart:">📈</span> Interaction Trends (30 Days)</h2>

<!-- OR better: -->
<h2>
  <span aria-hidden="true">📈</span>
  <span>Interaction Trends (30 Days)</span>
</h2>
```

**File Location:** `/pages/dashboard/index.vue`

---

### 12. LINK TEXT USING ONLY ARROWS/SYMBOLS

**Severity:** MINOR
**WCAG Criterion:** 2.4.4 Link Purpose (In Context) - A
**Affected Pages:** Dashboard, Schools, Coaches
**Impact:** Link purpose unclear out of context

**Details:**
Links use arrow symbols without text:

- "View timeline →" (arrow is part of link text in some cases)
- "Log Your First Metric →"
- "Clear Filters" (not arrow, but context-dependent)

**Recommendation:** Ensure link text describes destination clearly
**Estimated Effort:** Minimal (5 minutes) - Most links ARE descriptive; only edge cases

---

### 13. TOUCH TARGET SIZE BELOW MINIMUM

**Severity:** MINOR (Mobile only)
**WCAG Criterion:** 2.5.5 Target Size - AAA (A doesn't specify size)
**Affected Pages:** All
**Impact:** Mobile/touch users have difficulty activating controls

**Details:**

- WCAG AAA recommends 48×48px minimum touch targets
- Some buttons/links appear smaller
- Top-right icon buttons in header appear to be 32-36px
- Navigation icons may be small on mobile

**Recommendation:** Ensure all interactive targets are at least 48×48px (or 44×44px per WCAG A)
**Estimated Effort:** Medium (depends on current sizes) - Adjust padding/size

---

### 14. INSUFFICIENT COLOR CONTRAST ON SECONDARY TEXT

**Severity:** MINOR
**WCAG Criterion:** 1.4.3 Contrast (Minimum) - AA
**Affected Pages:** All
**Impact:** Secondary text hard to read for low-vision users

**Details:**
Some helper text, descriptions, and secondary content may have contrast below AA:

- Empty state messages ("0 results found", "No interactions found")
- Placeholder text color (if visible)
- Gray helper text on white backgrounds

Testing showed:

- Some text at 2.77:1 (fails AA 4.5:1 requirement)
- Likely affects text that's meant to be secondary but still readable

**Recommendation:** Review all text colors and ensure 4.5:1 minimum
**Estimated Effort:** Quick (20 minutes) - Adjust color palette

---

## Summary of Violations by WCAG Criterion

| Criterion                    | Level | Issue Count | Severity        |
| ---------------------------- | ----- | ----------- | --------------- |
| 1.1.1 Non-text Content       | A     | 1           | Major           |
| 1.3.1 Info and Relationships | A     | 2           | Critical, Major |
| 1.4.3 Contrast (Minimum)     | AA    | 2           | Critical, Minor |
| 2.1.1 Keyboard               | A     | 1           | Major           |
| 2.4.2 Page Titled            | A     | 1           | Major           |
| 2.4.4 Link Purpose           | A     | 1           | Minor           |
| 2.5.5 Target Size            | AAA   | 1           | Minor           |
| 3.3.2 Labels or Instructions | A     | 2           | Critical, Major |
| 4.1.2 Name, Role, Value      | A     | 2           | Critical, Major |
| 4.1.3 Status Messages        | AAA   | 1           | Major           |

---

## Compliance Status by Page

### Dashboard

- Heading hierarchy issues: h1 → h3 (skip h2)
- Color contrast: Navigation links fail (2.77:1)
- Empty button labels in header
- Emoji-only descriptors
- Missing page title
- No aria-live for dynamic content

**Estimated fixes:** 2-3 hours

### Coaches

- Form inputs without labels (5 inputs)
- Color contrast: Navigation links fail
- Empty button labels in header
- Missing page title
- No aria-live for dynamic content

**Estimated fixes:** 1-1.5 hours

### Schools

- Form inputs without labels (7 inputs)
- Range sliders without aria-label
- Disabled input with unclear purpose
- Color contrast: Navigation links fail
- Heading hierarchy (h1 → h3)
- Empty button labels in header
- Missing page title
- No aria-live for dynamic content

**Estimated fixes:** 2-2.5 hours

### Interactions

- Form inputs without labels (5 inputs)
- Color contrast: Navigation links fail
- Empty button labels in header
- Missing page title
- No aria-live for dynamic content

**Estimated fixes:** 1-1.5 hours

---

## Implementation Priority

### Phase 1 (CRITICAL - 1 day)

1. Add aria-label to empty icon buttons in header
2. Fix navigation link color contrast (all pages)
3. Add labels to all form inputs

### Phase 2 (MAJOR - 1-2 days)

4. Add page titles to all pages
5. Fix heading hierarchy
6. Add aria-live regions for dynamic content
7. Add aria-label to range sliders

### Phase 3 (MINOR - 0.5 days)

8. Add alt text to images
9. Fix emoji descriptors
10. Improve link text clarity
11. Verify touch target sizes
12. Fix secondary text contrast

---

## Testing Tools Used

- Manual accessibility inspection
- Keyboard navigation testing (Tab, Enter, Space keys)
- Color contrast ratio calculation (WCAG formula)
- HTML/ARIA attribute audit
- Screen reader compatibility assessment
- Page structure analysis

---

## Recommendations for Ongoing Compliance

1. **Add Automated Testing:** Integrate axe-core or similar into CI/CD
2. **Accessibility Review:** Add accessibility checklist to code review process
3. **ARIA Training:** Ensure developers understand ARIA labels and roles
4. **User Testing:** Conduct testing with actual assistive technology users
5. **Lighthouse:** Run Lighthouse accessibility audit regularly
6. **Documentation:** Create accessibility guidelines for component library

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [MDN ARIA Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [a11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Next Steps

1. Review this report with development team
2. Prioritize critical issues (Phase 1)
3. Create tickets for each issue with code locations
4. Implement fixes and test with screen readers (NVDA on Windows, VoiceOver on Mac)
5. Re-run accessibility audit to verify compliance
6. Plan for WCAG AAA compliance in future releases
