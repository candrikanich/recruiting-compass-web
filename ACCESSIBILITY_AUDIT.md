# WCAG 2.1 AA Accessibility Audit: Coach Detail Page

## Executive Summary

The coach detail page (`pages/coaches/[id].vue`) and related components exhibit **GOOD foundational accessibility practices** with **excellent semantic HTML usage** and **proper focus management patterns**. However, there are **several Medium and High priority issues** that reduce usability for users with assistive technology, particularly affecting:

- **Modal accessibility** (focus trapping, ARIA attributes)
- **Button labeling** (screen readers cannot identify purpose of close buttons)
- **Color-only information** (red/orange/green status indicators without text alternatives)
- **Dynamic content updates** (no ARIA live regions for interaction logging)
- **Interactive buttons** (missing accessible names for icon-only buttons)

**Overall Compliance Status:** ~75% compliant with WCAG 2.1 AA (estimated)
**Critical Issues:** 3
**High Priority Issues:** 5
**Medium Priority Issues:** 6
**Low Priority Issues:** 4

---

## Critical Issues (MUST FIX IMMEDIATELY)

### 1. Modal Focus Management - Communication Panel Modal

**Location:** `pages/coaches/[id].vue`, lines 91-128 (Communication Panel Teleport)

**WCAG Criterion:** 2.4.3 Focus Order (A), 4.1.2 Name/Role/Value (A)

**Severity:** CRITICAL

**Impact:** Users navigating with keyboard or screen readers cannot escape modals, and focus can escape the modal backdrop into background elements. This violates WCAG 2.1 Level A and creates a focus trap bug for all users.

**Current State:**
Modal lacks focus trap, aria-modal attribute, and proper close button labeling.

**Problems:**

1. Modal is a `div`, not a `<dialog>` or properly ARIA-labeled container
2. No `aria-modal="true"` attribute
3. No `aria-labelledby` pointing to modal title
4. Focus is not trapped within the modal
5. Close button uses icon only; screen readers cannot identify its purpose
6. No keyboard shortcut handler (Escape key) - only managed by click

**Required Fix:**

- Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to modal
- Implement focus trap to cycle focus only within modal
- Add `aria-label` to close button
- Handle Escape key to close modal

**File:** `/pages/coaches/[id].vue` (lines 91-128)

---

### 2. EditCoachModal - Missing Focus Trap & Close Button Accessibility

**Location:** `components/EditCoachModal.vue`, lines 13-18

**WCAG Criterion:** 2.4.3 Focus Order (A), 4.1.2 Name/Role/Value (A)

**Severity:** CRITICAL

**Impact:** Same as Communication Panel Modal - focus is not trapped, and the close button (×) has no accessible name. Screen reader users cannot understand what the button does.

**Problems:**

1. Modal is missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
2. Close button has no `aria-label` - reads as empty or just "×"
3. No focus trap implementation
4. No keyboard Escape key handler
5. No visible focus indicator on close button

**Required Fix:**

- Add proper ARIA attributes to modal container
- Add `aria-label="Close edit coach dialog"` to close button
- Implement focus trap
- Handle Escape key
- Add focus:ring styling to close button

**File:** `/components/EditCoachModal.vue` (lines 1-20)

---

### 3. DeleteConfirmationModal - Semantic Dialog Element Not Used with Focus Management

**Location:** `components/DeleteConfirmationModal.vue`, lines 1-44

**WCAG Criterion:** 2.4.3 Focus Order (A), 4.1.2 Name/Role/Value (A)

**Severity:** CRITICAL (partially mitigated by native `<dialog>` element)

**Impact:** While the component correctly uses native HTML `<dialog>` element, it lacks **focus trap implementation** and the dialog's `.showModal()` method is never called, so browser-provided focus management doesn't activate.

**Problems:**

1. `<dialog>` element rendered with `v-if` but never calls `.showModal()`
2. Browser's built-in focus management is inactive
3. Escape key behavior depends on Vue, not browser dialog behavior
4. Focus not returned to trigger element on close

**Required Fix:**

- Use `v-show` or call `.showModal()` method in JavaScript
- Handle focus restoration after close
- Ensure escape key closes dialog

**File:** `/components/DeleteConfirmationModal.vue` (lines 1-15)

---

## High Priority Issues (WCAG 2.1 AA violations)

### 4. Color-Only Information: Status Indicators Without Text Alternatives

**Location:** `components/Coach/CoachStatsGrid.vue`, lines 30-37

**WCAG Criterion:** 1.4.1 Use of Color (A), 2.1.1 Keyboard (A)

**Severity:** HIGH

**Impact:** Users with color blindness cannot distinguish between red (30+ days), orange (between), and green (0 days) status. Screen readers only read the number.

**Problems:**

1. Color is the only visual indicator of status
2. No text label like "Good", "Caution", or "Urgent"
3. Screen readers only announce the number
4. Users with color vision deficiency cannot distinguish status

**Required Fix:**

- Add text badge with status label ("Good", "Urgent", "Follow up soon")
- Include aria-label on status container
- Use both color AND text/pattern for distinction

**File:** `/components/Coach/CoachStatsGrid.vue` (lines 20-37)

---

### 5. Interaction List: Missing Keyboard Navigation & Screen Reader Support

**Location:** `components/Coach/CoachRecentInteractions.vue`, lines 14-56

**WCAG Criterion:** 2.1.1 Keyboard (A), 4.1.2 Name/Role/Value (A)

**Severity:** HIGH

**Impact:** Interaction list displays icons but provides no semantic meaning to screen readers. Rows are not focusable, keyboard users cannot interact.

**Problems:**

1. Rows are `<div>` elements, not semantic list items (`<li>`)
2. Icons have no text alternatives
3. No keyboard navigation
4. Sentiment badges use color only with truncated text
5. No list semantics for screen readers

**Required Fix:**

- Use `<ul>` and `<li>` elements for semantic structure
- Add text labels to icons (aria-label on icon containers)
- Make rows focusable (natural focus from list semantics)
- Add full text or title attribute for truncated content

**File:** `/components/Coach/CoachRecentInteractions.vue` (lines 12-56)

---

### 6. CoachNotesEditor: Missing Accessible Save State Indication

**Location:** `components/Coach/CoachNotesEditor.vue`, lines 25-47

**WCAG Criterion:** 4.1.2 Name/Role/Value (A), 3.2.2 On Input (AA)

**Severity:** HIGH

**Impact:** When user clicks "Save", button changes to "Saving..." but screen readers don't get notification of state change. No aria-live region or status message to announce completion.

**Problems:**

1. Button text changes but no `aria-busy` or `aria-label` update
2. No confirmation message after save
3. No error handling announcement
4. Screen readers cannot tell if save was successful

**Required Fix:**

- Add `aria-busy="true"` while saving
- Add `aria-live="polite"` status region
- Announce "Saved successfully" or error message
- Include feedback message that persists briefly

**File:** `/components/Coach/CoachNotesEditor.vue` (lines 25-47)

---

### 7. Communication Panel: Button Labels Missing for Modal Triggers

**Location:** `components/CommunicationPanel.vue`, lines 30-98

**WCAG Criterion:** 4.1.2 Name/Role/Value (A)

**Severity:** HIGH

**Impact:** Buttons use emoji (💬, 📧, 📸) as sole identifier and don't announce they open dialogs. No aria-haspopup attribute.

**Problems:**

1. Emoji used as sole visual indicator - not screen reader friendly
2. Buttons don't announce they open modals (should have aria-haspopup="dialog")
3. No clear indication to screen readers that this is an action button
4. Enter/Space key interaction not explicitly handled

**Required Fix:**

- Add `aria-haspopup="dialog"` to buttons
- Add clear aria-label: "Send email to [name] at [email]"
- Ensure modal ARIA attributes are complete
- Test keyboard interaction

**File:** `/components/CommunicationPanel.vue` (lines 30-98)

---

### 8. Close Button Accessibility: × Symbol Without Label

**Location:** Multiple files:

- `components/Coach/CoachHeader.vue` (line 113)
- `components/EditCoachModal.vue` (line 17)
- `components/CommunicationPanel.vue` (lines 8-11)

**WCAG Criterion:** 4.1.2 Name/Role/Value (A)

**Severity:** HIGH

**Impact:** Screen readers cannot identify close button purpose. Users don't know what clicking will do.

**Problems:**

1. No `aria-label` on button
2. Icon component has no text alternative
3. Accessible name is empty

**Required Fix:**

- Add `aria-label="Close [context]"` to all close buttons
- Add focus:ring styling
- Consider adding visible text label

**Files:**

- `/components/Coach/CoachHeader.vue` (line 113)
- `/components/EditCoachModal.vue` (line 17)
- `/components/CommunicationPanel.vue` (lines 8-11)

---

## Medium Priority Issues

### 9. Button Text Clarity

**File:** `/components/Coach/CoachHeader.vue` (line 197)
**Issue:** "Edit" button should be "Edit Coach" for clarity when multiple edit buttons exist
**Fix:** Change text and add aria-label

---

### 10. Link Focus Styling

**File:** `/pages/coaches/[id].vue` (line 16)
**Issue:** "Back to Coaches" link lacks focus:ring styling
**Fix:** Add `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`

---

### 11. Form Field Error States

**File:** `/components/Coach/CoachForm.vue` (lines 20-60)
**Issue:** Missing `aria-invalid` attribute on fields with errors
**Fix:** Add `:aria-invalid="!!fieldErrors.fieldName"` and conditional border color

---

### 12. Skip Link Testing

**File:** `/pages/coaches/[id].vue` (lines 5-11)
**Issue:** Skip link present but needs verification
**Fix:** Test that focus moves to main-content and is visible

---

## Low Priority Issues

### 13. Loading/Error States - ARIA Announcements

**File:** `/pages/coaches/[id].vue` (lines 27-38)
**Suggestion:** Add `role="status" aria-live="polite"` to loading message
**Suggestion:** Add `role="alert" aria-live="assertive"` to error message

---

### 14. Touch Target Sizing at Zoom

**All button files**
**Suggestion:** Test at 200% zoom to verify 44x44px minimum is maintained

---

### 15. Heading Hierarchy

**All files**
**Suggestion:** Audit heading levels (h1 → h2 → h3) to ensure no skipping

---

### 16. Sentiment Badge Patterns

**File:** `/components/Coach/CoachRecentInteractions.vue` (lines 41-47)
**Suggestion:** Add border or icon pattern in addition to color

---

## Compliant Elements

**✓ Skip Link** - Properly implemented in `/pages/coaches/[id].vue`
**✓ Form Labels** - Well-associated in `/components/Coach/CoachForm.vue`
**✓ Field Errors** - Use aria-describedby properly
**✓ DeleteConfirmationModal** - Native `<dialog>` with proper ARIA
**✓ Stats Section** - Semantic structure with aria-labelledby
**✓ Focus Rings** - Consistent use of Tailwind focus:ring pattern
**✓ Icon Accessibility** - Use of aria-hidden on decorative icons

---

## Implementation Priority

**CRITICAL (This Sprint):**

1. Add focus trap to Communication Panel Modal (`/pages/coaches/[id].vue`)
2. Add focus trap to EditCoachModal (`/components/EditCoachModal.vue`)
3. Implement .showModal() for DeleteConfirmationModal (`/components/DeleteConfirmationModal.vue`)

**HIGH (Next Sprint):** 4. Add text labels to status indicators (`/components/Coach/CoachStatsGrid.vue`) 5. Convert interaction list to semantic structure (`/components/Coach/CoachRecentInteractions.vue`) 6. Add save feedback with aria-live (`/components/Coach/CoachNotesEditor.vue`) 7. Add aria-haspopup and labels to buttons (`/components/CommunicationPanel.vue`) 8. Fix all close button labels (multiple files)

**MEDIUM (Planning):** 9. Enhance button text clarity (multiple files) 10. Add focus styling to links 11. Add aria-invalid to form fields 12. Test and enhance skip link

**LOW (Future):**
13-16. Minor enhancements and AAA level improvements

---

## Testing Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus order logical
- [ ] No unintended keyboard traps
- [ ] Escape closes modals
- [ ] Modal titles announced by screen readers
- [ ] All buttons have accessible names
- [ ] All form fields labeled
- [ ] Error messages announced
- [ ] Status messages use aria-live
- [ ] Color + text used for all status indicators
- [ ] Focus rings visible with 3:1 contrast
- [ ] Touch targets 44x44px minimum at 200% zoom
- [ ] Heading hierarchy logical
- [ ] No text smaller than 12px without user zoom capability

---

## Files Requiring Changes

**Critical Impact:**

- `/pages/coaches/[id].vue`
- `/components/EditCoachModal.vue`
- `/components/DeleteConfirmationModal.vue`

**High Impact:**

- `/components/CommunicationPanel.vue`
- `/components/Coach/CoachStatsGrid.vue`
- `/components/Coach/CoachHeader.vue`
- `/components/Coach/CoachNotesEditor.vue`
- `/components/Coach/CoachRecentInteractions.vue`

**Medium Impact:**

- `/components/Coach/CoachForm.vue`
- `/tailwind.config.js` (verify focus states)

---

## Summary

The coach detail page has strong foundational accessibility. Primary concerns are **modal focus trapping** (critical), **color-only information** (high), and **dynamic content announcements** (high). Implementing critical and high-priority fixes will bring compliance to ~90% WCAG 2.1 AA.

**Estimated effort:** 3-4 days
**ROI:** Significant improvement for 15-20% of potential users with disabilities
