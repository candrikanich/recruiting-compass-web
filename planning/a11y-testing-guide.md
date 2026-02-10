# Accessibility Testing Guide for School Detail Page

A practical guide for manual and automated testing of WCAG 2.1 AA compliance.

---

## Keyboard Navigation Testing

### Test Procedure

1. **Unplug your mouse** (or use trackpad with cursor keys only)
2. Navigate using only:
   - Tab / Shift+Tab (move between elements)
   - Enter / Space (activate buttons)
   - Arrow Keys (select dropdowns, radio buttons)
   - Escape (close modals)

### Expected Behavior

**Loading State:**

- Tab to the page → Should see visible focus indicator (outline/ring)
- Focus visible throughout loading spinner area

**School Header:**

- Tab to school name area → Focus ring visible on status dropdown
- Select new status → Page announces "Status is updating, please wait"
- Tab away → Status updates and disappears from screen reader

**Document Cards:**

- Tab to "View" links → Focus ring appears (2-3px blue outline)
- Verify all links are reachable before reaching document upload button
- Tab to "Upload" button → Button purpose is clear

**Notes Cards:**

- Tab to "Edit" button → Button label includes "notes" context
- Press Enter → Edit mode activates
- Tab to textarea → Textarea has associated label (not just placeholder)
- Tab to "Save Notes" button → Button text changes, label updates
- Press Enter → Notes save, focus returns to Edit button

**Coach Links (Sidebar):**

- Tab to each coach contact link (email, SMS, phone)
- Verify each has descriptive label with coach name
- Tab order makes sense (left to right, top to bottom)

**Sidebar Buttons:**

- All buttons reachable by Tab
- "Manage Coaches" link clearly states destination
- "Delete School" button at bottom is last in tab order

### Checkpoint: Tab Order

- [ ] Every interactive element reachable via Tab
- [ ] Tab order follows logical page flow (left-to-right, top-to-bottom)
- [ ] No elements are unreachable
- [ ] No focus trap (can always Tab forward out of any section)
- [ ] Escape key closes modals (if tested)

---

## Screen Reader Testing

### Setup

**Windows:**

- Download NVDA (free): https://www.nvaccess.org/

**macOS:**

- VoiceOver built-in: Press Command+F5 to enable

**ChromeOS:**

- ChromeVox built-in: Press Alt+Z

### NVDA Testing (Windows)

#### Test 1: Page Structure

```
Steps:
1. Enable NVDA (Insert+N, then check "Enable Screen Reader")
2. Load school detail page
3. Press H to start heading navigation
4. Verify announcement: "h1: School Name"
5. Press H multiple times
6. Listen for: h2 sections (Status History, Fit Analysis, Documents, Notes)
```

**Expected Output:**

```
h1 "High School Name" (school)
h2 "Status History"
h2 "School Fit Analysis"
h2 "Shared Documents"
h2 "Notes"
h2 "My Private Notes"
(etc)
```

**What to Listen For:**

- No skipped heading levels (h1 → h2 → h3 should not jump h2)
- All major sections have headings
- Sidebar sections use h2 (not h3) for consistency

#### Test 2: Form Labels and Inputs

```
Steps:
1. Scroll to "Notes" card (arrow keys)
2. Press Tab to focus "Edit" button
3. Press Enter to enter edit mode
4. Tab to textarea
5. NVDA should announce: "Notes text area, edit, required"
```

**Expected Output:**

```
NVDA: "Edit notes button"
[User presses Enter]
NVDA: "Notes text area"
```

**What to Listen For:**

- Label is announced WITH the input (not separately)
- Type of input is clear (textarea, not "edit")
- No "placeholder" as sole label

#### Test 3: Loading States

```
Steps:
1. Scroll to Status History card
2. NVDA announces: "Status History status region, Loading status history..."
3. Wait for load to complete
4. NVDA announces updated content
```

**Expected Output:**

```
NVDA: "Status History heading level 2, status region, Loading status history..."
[After load]
NVDA: "Status History heading level 2, history list..."
```

#### Test 4: Button Purpose

```
Steps:
1. Tab to document upload area
2. Focus on Upload button
3. NVDA announces full button purpose
```

**Expected Output:**

```
NVDA: "Upload document button"
```

NOT: `"button"` (no purpose)

#### Test 5: Link Destination

```
Steps:
1. Tab to "Manage Coaches" link in sidebar
2. NVDA announces link purpose
```

**Expected Output:**

```
NVDA: "Manage Coaches link"
```

NOT: `"Manage link"` (too vague)

#### Test 6: Dynamic Content

```
Steps:
1. Delete a note, school, or coach (trigger delete modal)
2. Modal opens
3. NVDA announces dialog role and title
```

**Expected Output:**

```
NVDA: "Dialog, Delete School"
NVDA: "Are you sure you want to delete this school? This will also remove associated coaches..."
```

### VoiceOver Testing (macOS)

Enable with Command+F5, then:

```
VO = Control+Option (default modifier)

Navigate: VO+Arrow Keys
Read all: VO+A
Web rotor: VO+U
  • Headings: H
  • Links: L
  • Buttons: B
  • Form controls: C
```

**Quick Test:**

1. Press VO+U to open rotor
2. Press H to filter headings
3. Arrow through headings
4. Verify structure matches NVDA test

---

## Color Contrast Testing

### Tool: WebAIM Contrast Checker

Visit: https://webaim.org/resources/contrastchecker/

### Test Procedure

**School Status Links (Sidebar):**

```
1. Go to WebAIM Color Contrast Checker
2. Enter Foreground: #1d4ed8 (text-blue-700)
3. Enter Background: #dbeafe (bg-blue-100)
4. Result: 4.2:1 ⚠️ BORDERLINE (AA requires 4.5:1)
5. Recommendation: Change to bg-blue-600 with text-white
   OR: Use text-blue-900 with bg-blue-50
```

**Coach Contact Icons (Sidebar):**

Current state:

- Email: `text-blue-700` on `bg-blue-100` = **4.2:1** ❌
- SMS: `text-green-700` on `bg-green-100` = **7.1:1** ✓
- Phone: `text-purple-700` on `bg-purple-100` = **4.3:1** ⚠️

Fixed state (recommended):

- Email: `text-white` on `bg-blue-600` = **8.6:1** ✓
- SMS: `text-white` on `bg-green-600` = **5.9:1** ✓
- Phone: `text-white` on `bg-purple-600` = **8.1:1** ✓

### Browser DevTools Contrast Check

**Chrome/Edge:**

1. Press F12 (open DevTools)
2. Click Elements tab
3. Click on element (e.g., colored button)
4. Look at Styles panel
5. Scroll to "Color" property
6. Click the color swatch
7. Check "Contrast ratio" at bottom

**Expected Results:**

- All interactive text: **4.5:1 or higher**
- Large text (18pt+): **3:1 or higher**
- Non-text elements: **3:1 minimum**
- Focus indicators: **3:1 minimum**

---

## Focus Indicator Testing

### Visual Check

**Tab through the page and verify:**

1. **Focus ring is visible** - Can you always see which element has focus?
2. **Sufficient contrast** - Is the focus ring 3:1 contrast or higher?
3. **Not just outline** - Is there more than just a 1px outline?
4. **Consistent style** - All focus states look similar?

### Measurement in DevTools

```
1. Open DevTools (F12)
2. Focus an element (Tab key)
3. Right-click focused element → Inspect
4. In Styles panel, look for focus: or focus-visible: rules
5. Check these properties:
   - outline: should be 2px or more
   - outline-color: should contrast with background
   - box-shadow: can be used for focus ring
```

### Test Cases

**Links:**

- School name (h1) → No focus state (not clickable) ✓
- "View" document links → Blue ring with offset ✓
- "Manage Coaches" link → Blue ring with offset ✓

**Buttons:**

- "Edit Notes" → Blue ring ✓
- "Save Notes" → Blue ring, changes on disabled ✓
- "Upload Document" → Blue ring ✓
- "Delete School" → Red ring (danger variant) ✓

**Form Inputs:**

- Status dropdown → Ring visible, offset from text ✓
- Textarea (notes) → Ring visible, offset from border ✓

### Checkpoint

- [ ] Focus ring visible on all interactive elements
- [ ] Focus ring has 3:1 contrast with background
- [ ] Focus ring size is at least 2px
- [ ] Focus ring does not completely hide element
- [ ] Focus indicator is not just a color change

---

## ARIA Attribute Testing

### What to Verify

**aria-label** - Button has descriptive label:

```html
<!-- Good -->
<button aria-label="Upload document">Upload</button>

<!-- Bad -->
<button title="Upload">Upload</button>
<!-- title alone is insufficient -->
```

**aria-hidden** - Icons are hidden from screen readers:

```html
<!-- Good -->
<button aria-label="Send email">
  <EnvelopeIcon aria-hidden="true" />
  Send
</button>

<!-- Bad -->
<button aria-label="Send email">
  <EnvelopeIcon />
  <!-- Icon announced redundantly -->
  Send
</button>
```

**aria-describedby** - Error messages linked to form inputs:

```html
<!-- Good -->
<input id="email" type="email" aria-describedby="email-error" />
<p id="email-error" class="error">Email is required</p>

<!-- Bad -->
<input type="email" />
<p class="error">Email is required</p>
<!-- No association -->
```

**aria-live** - Dynamic content announcements:

```html
<!-- Good -->
<div role="status" aria-live="polite" aria-atomic="true">
  School deleted successfully
</div>

<!-- Bad -->
<div>School deleted successfully</div>
<!-- No announcement -->
```

**aria-busy** - Loading states:

```html
<!-- Good -->
<select aria-busy="true" disabled>
  <option>Loading...</option>
</select>

<!-- Bad -->
<select disabled style="opacity: 0.5">
  <!-- No indication to screen reader -->
</select>
```

### Test with Firefox Accessibility Inspector

```
1. Open DevTools (F12)
2. Go to Accessibility tab
3. Expand element tree
4. Verify:
   - Button "Name" (derived from aria-label or text)
   - Button "Role" (button)
   - Form input has "Label"
   - No "Name" from aria-label means broken accessibility
```

---

## Mobile/Touch Accessibility

### Minimum Touch Target Size

**WCAG AAA requires:** 44x44 CSS pixels minimum
**Current implementation:** Check each interactive element

```
Testing:
1. Open DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Inspector element → Computed tab → Search "width" and "height"
4. Verify all buttons/links are 44x44 or larger
5. Verify spacing between targets (minimum 8px recommended)
```

### Test Procedure

1. **Switch to mobile view** (DevTools device toggle)
2. **Tap each button** - Should activate without accidentally tapping neighbors
3. **Zoom to 200%** - Page should still be scrollable, no horizontal scroll
4. **Resize text** - Text should be readable, layout should adapt
5. **Test in landscape** - All content still accessible

### Checkpoint

- [ ] All touch targets are 44x44px or larger
- [ ] Touch targets have adequate spacing (8px+ between)
- [ ] Page content reflows at 200% zoom
- [ ] Text resizing doesn't break layout
- [ ] No keyboard functionality only on desktop

---

## Automated Testing

### axe DevTools Browser Extension

1. Install: https://www.deque.com/axe/devtools/
2. Open school detail page
3. Click axe DevTools icon
4. Click "Scan ALL of my page"
5. Review results:
   - Red (must fix) = violations
   - Orange (should fix) = best practices
   - Green (good) = passes

### Expected Results After Fixes

Should have zero critical/high violations:

- [x] All buttons have accessible names
- [x] All form inputs have labels
- [x] All links have purpose
- [x] Color contrast meets WCAG AA
- [x] Focus indicators visible
- [x] No missing alt text
- [x] Proper heading hierarchy

### Lighthouse Accessibility Audit

```
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility"
4. Click "Analyze page load"
5. Score should be 90+ (A-grade)
```

---

## Test Case Scenarios

### Scenario 1: Screen Reader User Viewing School

**Setup:** Enable NVDA, navigate to school detail page

**Test:**

1. Press H to scan headings
2. Verify: h1 (school name), h2s (sections)
3. Press L to scan links
4. Verify: Links have descriptive text ("View Document", not "View")
5. Press B to scan buttons
6. Verify: Buttons have labels ("Edit Notes", not "Edit")
7. Fill out notes form
8. Verify: Label announced with textarea

**Pass Criteria:**

- All headings present and properly structured
- All links have clear purpose
- All buttons have descriptive labels
- Form fields have associated labels

### Scenario 2: Keyboard-Only User Navigation

**Setup:** Keyboard only (no mouse)

**Test:**

1. Tab through entire page
2. Verify focus visible at each step
3. Use Enter to activate buttons
4. Use Arrow keys for dropdowns
5. Use Escape to close modals
6. Verify return focus to trigger button after modal closes

**Pass Criteria:**

- Every interactive element reachable
- Focus order logical (top-to-bottom, left-to-right)
- All actions possible via keyboard
- No focus traps

### Scenario 3: Low Vision User (Zoom + Contrast)

**Setup:** Browser zoom to 200%, high contrast mode

**Test:**

1. Zoom page to 200% (Ctrl++ or Cmd++)
2. Scroll page - should only require vertical scrolling
3. Verify text is readable
4. Verify buttons/links are distinguishable
5. Check color combinations for sufficient contrast

**Pass Criteria:**

- No horizontal scrolling at 200% zoom
- Text remains readable
- Focus indicators visible
- Color not only indicator of state

### Scenario 4: Motor Impairment (Keyboard + Large Touch Targets)

**Setup:** Keyboard navigation on mobile

**Test:**

1. Mobile view
2. Tab to all interactive elements
3. Verify all targets are 44x44px+
4. Verify adequate spacing between targets
5. Verify no hover-only functionality

**Pass Criteria:**

- All targets large enough to tap accurately
- Adequate spacing prevents accidental activation
- All functionality available via keyboard

---

## Regression Testing Checklist

After implementing fixes, verify:

### Critical (Must Have)

- [ ] All buttons/links have accessible names
- [ ] All form inputs have associated labels
- [ ] Focus visible on all interactive elements
- [ ] Modal dialogs trap focus properly
- [ ] Dynamic content announced via aria-live
- [ ] Status dropdown shows busy state during update
- [ ] Loading messages announced (not just spinner)

### High Priority

- [ ] Color contrast 4.5:1 on all interactive elements
- [ ] Heading hierarchy proper (h1 → h2s, no h2 → h4)
- [ ] Landmark regions present (main, aside, nav, header)
- [ ] Escape key closes modals
- [ ] Touch targets 44x44px on mobile

### Medium Priority

- [ ] Disabled states visually distinct
- [ ] Error messages linked to form fields
- [ ] Page reflows at 200% zoom
- [ ] Language attribute set (lang="en")
- [ ] No keyboard shortcuts conflicting with browser/AT

---

## Documentation for Fixes Applied

When you implement a fix, document:

**File Changed:** `SchoolNotesCard.vue`
**Issue #:** 2 (Missing textarea labels)
**WCAG Criterion:** 1.3.1 Info and Relationships
**What Changed:**

- Added `<label for="notes-textarea">` element
- Added `id="notes-textarea"` to textarea
- Added `aria-describedby="notes-hint"` for helper text
  **Test Results:**
- [x] NVDA announces label with input
- [x] Label visible in browser
- [x] Hint text assistive

---

## Quick Reference: Common Issues and Fixes

| Issue                             | Test Method                     | Fix                                                   |
| --------------------------------- | ------------------------------- | ----------------------------------------------------- |
| Icon-only button                  | NVDA: button announcements      | Add aria-label                                        |
| Missing textarea label            | Keyboard: Tab to field          | Add `<label>` with `for` attribute                    |
| No focus indicator                | Keyboard: Tab through page      | Add `focus:ring-2` class                              |
| Low contrast link                 | WebAIM checker                  | Increase color saturation or change background        |
| Loading not announced             | NVDA: listen for status         | Add `role="status" aria-live="polite"`                |
| Dropdown disabled state invisible | Visual: look at disabled button | Add `disabled:opacity-50 disabled:cursor-not-allowed` |
| Modal not dismissible             | Keyboard: press Escape          | Add Escape handler to modal                           |
| Heading hierarchy broken          | NVDA: H key navigation          | Ensure h1 → h2 → h3 (no skips)                        |

---

## References & Tools

**Testing Tools:**

- [NVDA Screen Reader](https://www.nvaccess.org/) - Free Windows
- [JAWS Screen Reader](https://www.freedomscientific.com/products/software/jaws/) - Paid, industry standard
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) - Built-in macOS/iOS
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

**References:**

- [WCAG 2.1 Specification](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Screen Reader Testing](https://www.a11y-101.com/testing/screen-readers)
- [Keyboard Navigation](https://www.a11y-101.com/testing/keyboard)
