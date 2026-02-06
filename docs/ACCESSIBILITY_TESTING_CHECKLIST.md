# Accessibility Testing Checklist - Login Page

**Version:** 1.0
**Last Updated:** February 6, 2026
**Target Standard:** WCAG 2.1 Level AA
**Status:** Production Ready (~98% Compliant)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Pre-Test Setup](#pre-test-setup)
3. [Keyboard Navigation Testing](#keyboard-navigation-testing)
4. [Screen Reader Testing](#screen-reader-testing)
5. [Visual Accessibility Testing](#visual-accessibility-testing)
6. [Browser DevTools Testing](#browser-devtools-testing)
7. [Mobile Accessibility Testing](#mobile-accessibility-testing)
8. [Performance & Technical Testing](#performance--technical-testing)
9. [Remediation Guide](#remediation-guide)

---

## Quick Reference

### By Role

**QA Engineers:** Focus on sections 1-4 and 7-8
**Designers:** Focus on sections 3 and 5
**Developers:** Focus on sections 2, 6, and 9
**Product Managers:** Review section 1 for overview

### By Test Type

| Test                | Tool                   | Time   | Priority     |
| ------------------- | ---------------------- | ------ | ------------ |
| Keyboard Navigation | Browser                | 5 min  | **Critical** |
| Screen Reader       | NVDA/JAWS/VoiceOver    | 10 min | **Critical** |
| Visual Design       | Browser + Extensions   | 5 min  | **High**     |
| DevTools Audit      | Chrome DevTools        | 3 min  | **High**     |
| Mobile              | Mobile Device/Emulator | 5 min  | **High**     |
| Performance         | Lighthouse             | 2 min  | **Medium**   |

---

## Pre-Test Setup

### Browser Configuration

```bash
# Clear browser cache and cookies for clean test
# This ensures no stored preferences interfere with testing

# Recommended browsers for testing:
- Chrome/Edge (latest) - Best DevTools
- Firefox (latest) - Good DevTools, NVDA support
- Safari (macOS/iOS) - VoiceOver testing
```

### Test Environment

```bash
# Development server
npm run dev

# Navigate to
http://localhost:3000/login
```

### Test Account

Create a test account or use existing credentials (from password manager).

### Assistive Technology Setup

#### **Windows - NVDA (Free, Open Source)**

```bash
1. Download: https://www.nvaccess.org/download/
2. Install and launch
3. Press Insert (or Caps Lock) + N to start
4. Press Insert + H for help
```

#### **Windows - JAWS (Commercial)**

```bash
1. Download from: https://www.freedomscientific.com/
2. Install with valid license
3. JAWS starts automatically or press Alt + Insert
```

#### **macOS/iOS - VoiceOver (Built-in)**

```bash
macOS:
1. System Preferences → Accessibility → VoiceOver
2. Enable and press Cmd+F5 to toggle
3. Press Ctrl+Option+U to open VoiceOver Rotor

iOS:
1. Settings → Accessibility → VoiceOver
2. Toggle ON
3. Two-finger Z swipe to open rotor
```

#### **Browser Extensions**

```bash
# Chrome/Edge - Accessibility Insights
- Store: https://chrome.google.com/webstore
- Search: "Accessibility Insights for Web"
- Review automated checks + manual testing features

# Firefox - WAVE
- Store: https://addons.mozilla.org/
- Search: "WAVE - Web Accessibility Evaluation Tool"
- Visual feedback on accessibility issues

# All browsers - axe DevTools
- Store: axe-devtools.com
- Fast accessibility audits
```

---

## Keyboard Navigation Testing

### Section 1: Tab Order and Focus Visibility

**Objective:** Verify focus moves logically through form elements with visible indicators.

```
☐ Load http://localhost:3000/login
☐ Press Tab from page load (without clicking)
☐ First element focused: "Skip to login form" link (hidden off-screen)
☐ Can see visible focus indicator (blue ring)
☐ Focus ring has at least 3:1 contrast ratio
☐ Focus ring is at least 2px wide
```

**Expected focus order:**

```
1. Skip to login form (link)
2. Back to Welcome (link)
3. Logo link (if clickable)
4. Email input field
5. Password input field
6. Remember me checkbox
7. Forgot password link
8. Sign In button
9. Create one now link
```

**Test steps:**

```
☐ Press Tab once → Focus on "Skip to login form"
☐ Press Tab twice → Focus on "Back to Welcome"
☐ Press Tab three times → Focus on Logo link
☐ Continue Tab and verify order matches above
☐ Each element shows clear focus indicator
☐ Focus indicator doesn't disappear when tabbing
☐ Focus is never lost during tabbing
```

### Section 2: Reverse Tab Order

**Objective:** Verify Shift+Tab moves backward correctly.

```
☐ Tab to Sign In button
☐ Press Shift+Tab → Focus moves to Forgot password link
☐ Press Shift+Tab → Focus moves to Remember me checkbox
☐ Continue Shift+Tab to reverse through all fields
☐ Reverse order matches forward order exactly
☐ No elements skipped
☐ Can reach Skip link by Shift+Tabbing from top
```

### Section 3: Skip Link Testing

**Objective:** Verify skip link works and improves accessibility.

```
☐ Load page fresh
☐ Press Tab immediately (don't click)
☐ First focus should be "Skip to login form" link
☐ Press Enter
☐ Page jumps to login form (form area highlighted)
☐ Focus is on form element (id="login-form")
☐ Skip link is not visible visually (hidden by default)
☐ Skip link becomes visible when focused
☐ Skip link has good contrast when visible
```

### Section 4: Form Field Focus States

**Objective:** Verify each input field shows clear focus indication.

```
Email Field:
☐ Click or Tab to email input
☐ Input has blue focus ring (focus:ring-2 focus:ring-offset-2)
☐ Ring has sufficient contrast (visible against white background)
☐ Ring doesn't obscure the input
☐ Placeholder text visible before typing
☐ Placeholder disappears when typing starts
☐ Field remains focused during typing

Password Field:
☐ Tab from email to password
☐ Password field shows focus ring
☐ Ring matches email field style
☐ Entered text is masked (dots/bullets, not readable)
☐ Focus ring visible while typing
☐ Can see cursor position in field
```

### Section 5: Button Focus States

**Objective:** Verify buttons have visible focus indicators.

```
Sign In Button:
☐ Tab to Sign In button
☐ Button shows focus ring (outline style)
☐ Ring color contrasts with button background
☐ Ring width is visible (minimum 2px)
☐ Text remains readable with focus ring

Forgot Password Link:
☐ Tab to link
☐ Link shows focus indicator (ring or underline)
☐ Underline appears (not color alone)
☐ Text remains readable

Create one now Link:
☐ Tab to link
☐ Link shows focus ring
☐ Underline visible on focus
☐ Good contrast (blue on white background)
```

### Section 6: Checkbox Focus States

**Objective:** Verify checkbox focus is clear and accessible.

```
Remember Me Checkbox:
☐ Tab to checkbox
☐ Checkbox shows outline focus (not ring)
☐ Focus indicator visible around checkbox
☐ Can press Space to toggle checkbox
☐ Checkbox state changes (checked/unchecked)
☐ Label remains associated with checkbox
☐ Click on label text also toggles checkbox
```

### Section 7: Enter/Submit Key Testing

**Objective:** Verify form submission works via keyboard.

```
☐ Tab to email field, enter test email: test@example.com
☐ Tab to password field, enter password: TestPass123
☐ Press Tab to reach Sign In button
☐ Press Enter on Sign In button
☐ Form submits (or validation error appears)
☐ Can also press Enter in password field to submit

Form Validation Errors:
☐ Enter invalid email: "notanemail"
☐ Tab out of email field (blur)
☐ Error appears below email field
☐ Error text is readable
☐ Focus doesn't move away from field
☐ Can navigate to other fields to fix errors
☐ Submit button remains disabled until valid
```

### Section 8: Escape Key Behavior

**Objective:** Verify Escape key functions properly.

```
If modal/dialog appears:
☐ Press Escape to close error summary or modal
☐ Focus returns to trigger element (usually Sign In button)
☐ Modal closes completely

Note: If no modal, this section is N/A
```

### Section 9: Mouse + Keyboard Combination

**Objective:** Verify keyboard works after mouse interaction.

```
☐ Click on email field with mouse
☐ Type text with keyboard
☐ Press Tab to move to password field
☐ Type password
☐ Press Enter to submit
☐ All keyboard actions work after mouse use
☐ No focus gets stuck in mouse-interactive elements
```

### Section 10: Focus Trap Prevention

**Objective:** Verify focus doesn't get trapped.

```
☐ Tab through entire form
☐ Can Tab past last button
☐ Focus moves to next element (or loops back to top)
☐ If focus loops, first element is skip link
☐ No infinite focus loops
☐ Can always press Shift+Tab to go back
```

---

## Screen Reader Testing

### Prerequisites

Choose one screen reader based on platform:

| Platform | Screen Reader | Status         |
| -------- | ------------- | -------------- |
| Windows  | NVDA (free)   | ✅ Recommended |
| Windows  | JAWS          | ✅ Recommended |
| macOS    | VoiceOver     | ✅ Recommended |
| iOS      | VoiceOver     | ✅ Recommended |
| Android  | TalkBack      | ✅ Recommended |

### Section 1: Page Load Announcement

**Objective:** Verify what's announced when page loads.

```
NVDA/JAWS (Windows):
☐ Start screen reader
☐ Navigate to login page
☐ First announcement should be: "document, login, main"
☐ Page title is announced
☐ Heading is announced: "Sign in to The Recruiting Compass"
☐ No error messages on load
☐ Decorative SVG is NOT announced

VoiceOver (macOS):
☐ Start VoiceOver (Cmd + F5)
☐ Navigate to login page
☐ VoiceOver announces page role and heading
☐ First rotor item should be main heading
☐ Can open rotor (Ctrl + Opt + U) to see structure

TalkBack (Android):
☐ Start TalkBack in settings
☐ Navigate to login page
☐ Should announce page content
☐ Heading should be announced first
```

### Section 2: Form Structure Announcement

**Objective:** Verify form structure is properly announced.

```
Using Rotor/Navigation (NVDA/JAWS):
☐ Open rotor (Insert + F7 for NVDA)
☐ Set to "Landmarks"
☐ Should show "main" region
☐ Switch to "Forms"
☐ Should list: email, password, rememberme, submitButton
☐ Switch to "Headings"
☐ Should show page heading: "Sign in to The Recruiting Compass"

VoiceOver Rotor (macOS):
☐ Press Ctrl + Opt + U
☐ View Landmarks section
☐ Should show "main" landmark
☐ Switch to Forms
☐ Should list form fields
☐ Switch to Headings
☐ Should show main heading
```

### Section 3: Field Labels and Requirements

**Objective:** Verify labels are associated with fields and requirements are announced.

```
Email Field:
☐ Navigate to email input with screen reader
☐ Announced as: "Email, required, edit text"
☐ Label "Email" is clearly associated
☐ Word "required" is announced
☐ Red asterisk (*) is announced as "required"
☐ Can hear in rotor that field is required
☐ No need to hear placeholder as requirement

Password Field:
☐ Navigate to password input
☐ Announced as: "Password, required, edit text"
☐ Password is announced (not masked for screen reader)
☐ Type characters and hear asterisks (*) for each character
☐ Can hear "required" in announcement
☐ Can see in rotor that field is required

Remember Me Checkbox:
☐ Navigate to checkbox
☐ Announced as: "Remember me, checkbox, not checked"
☐ When checked, announces: "Remember me, checkbox, checked"
☐ Label is associated with checkbox
☐ Can press Space to toggle and hear state change
```

### Section 4: Error Announcement

**Objective:** Verify errors are announced clearly.

```
On Page Load:
☐ No errors announced
☐ No alert messages

Submit with Invalid Data:
☐ Enter: test@example (invalid email)
☐ Leave password empty
☐ Press Tab out of fields
☐ Errors should be announced as they appear
☐ Each field announces its error after blur

Submit Button Action:
☐ Click Sign In with errors
☐ Error summary should be announced as ALERT
☐ Should hear: "Alert: Please correct the following errors"
☐ Error list should be read:
  - "Email: Invalid email format"
  - "Password: Password is required"
☐ Focus should move to error summary
☐ Error summary should be visible in reading order

Error Dismissal:
☐ Focus on error summary
☐ Press Tab to find dismiss button
☐ Press Enter on dismiss button
☐ Error summary disappears
☐ Screen reader announces dismissal
```

### Section 5: Interactive Elements

**Objective:** Verify buttons and links are properly announced.

```
Skip Link:
☐ Navigate with screen reader
☐ Announced as: "Skip to login form, link"
☐ Can press Enter to activate
☐ Focus moves to login form

Back Link:
☐ Announced as: "Back to Welcome, link"
☐ Press Enter to navigate (will leave page)

Logo Link:
☐ Announced as: "The Recruiting Compass - Find your path, make your move, link"
☐ Image alt text is announced
☐ Clear that it's a clickable link

Sign In Button:
☐ Announced as: "Sign in to your account, button"
☐ State is announced when loading: "Signing in please wait"
☐ Can press Enter or Space to activate
☐ Not announced as disabled unless truly disabled

Forgot Password Link:
☐ Announced as: "Forgot password, link"
☐ Clear that it's a link
☐ Contrast with surrounding text

Create one now Link:
☐ Announced as: "Create one now, link"
☐ Context from surrounding text: "Don't have an account?"
☐ Link purpose is clear
```

### Section 6: Form Submission

**Objective:** Verify successful form submission works with screen reader.

```
Valid Form Submission:
☐ Enter valid email: test@example.com
☐ Enter valid password: TestPass123
☐ Press Enter on Sign In button
☐ Form submits without errors
☐ New page loads
☐ Screen reader announces new page content
☐ No accessibility errors during redirect

Loading State:
☐ Fill form with valid data
☐ Press Sign In
☐ Button text changes to "Signing in..."
☐ Screen reader announces: "Signing in please wait"
☐ aria-busy attribute announces state
☐ Button becomes disabled
☐ Cannot submit again while loading
```

### Section 7: Validation State Changes

**Objective:** Verify validation feedback is announced during typing.

```
Email Blur Validation:
☐ Tab to email field
☐ Type invalid email: "test"
☐ Press Tab to blur field
☐ Error appears: "Invalid email format"
☐ Error is announced by screen reader
☐ Error is linked to field: aria-describedby="email-error"
☐ Error message role is announced as "alert"

Password Blur Validation:
☐ Tab to password field
☐ Type password: "short" <!-- pragma: allowlist secret -->
☐ Press Tab to blur
☐ Error appears if too short
☐ Error is announced
☐ Error text is clear and actionable
```

### Section 8: Autocomplete and Password Management

**Objective:** Verify password managers work with form.

```
Email Field Autocomplete:
☐ Field has autocomplete="email"
☐ Password manager can fill email
☐ Screen reader announces filled value
☐ Can read email back to verify

Password Field Autocomplete:
☐ Field has autocomplete="current-password"
☐ Password manager recognizes field
☐ Can autofill password securely
☐ Dots/asterisks are announced (privacy maintained)
☐ Screen reader doesn't read actual password
```

### Section 9: Custom Screen Reader Commands

**Objective:** Verify common screen reader navigation works.

```
NVDA Commands:
☐ H: Jump to next heading → Should reach "Sign in to The Recruiting Compass"
☐ F: Jump to next form field → Should reach email field
☐ B: Jump to next button → Should reach Sign In button
☐ L: Jump to next link → Should reach links in order
☐ I: Jump to next form field → Should reach form fields
☐ Insert+F7: Open Elements dialog

JAWS Commands:
☐ H: Jump to next heading
☐ F: Jump to form field
☐ T: Jump to form control
☐ B: Jump to button
☐ Ctrl+Insert+H: Open help dialog
```

### Section 10: Pause and Resume

**Objective:** Verify screen reader can pause/resume without issues.

```
NVDA:
☐ Start reading from top (Insert + Down Arrow)
☐ Press Shift + Down Arrow to read next line
☐ Press Shift + Up Arrow to read previous line
☐ Screen reader should not get stuck
☐ Can press Space to pause
☐ Can press Ctrl+Shift+Down to continue

JAWS:
☐ Start continuous reading (Insert + Down Arrow)
☐ Can pause by pressing any key
☐ Resume by pressing Ctrl+Alt+Down Arrow
☐ No content should be skipped
☐ Order should be logical and complete
```

---

## Visual Accessibility Testing

### Section 1: Focus Indicator Visibility

**Objective:** Verify focus indicators meet WCAG AA contrast and visibility standards.

```
Testing Method: Browser inspect element + visual inspection

Email Field Focus:
☐ Tab to email field
☐ Blue outline/ring is visible
☐ Outline has at least 3:1 contrast ratio
☐ Outline width is at least 2px
☐ Ring offset creates clear separation
☐ Outline doesn't overlap text
☐ Still visible at 200% zoom

Password Field Focus:
☐ Tab to password field
☐ Same focus indicator as email
☐ Consistent styling across form
☐ Outline is blue (RGB 37, 99, 235) or similar
☐ Sufficient spacing from field edge

Button Focus:
☐ Tab to Sign In button
☐ Blue focus ring appears
☐ Ring contrasts with button blue background
☐ Ring is complete (no gaps)
☐ Text remains readable with ring

Checkbox Focus:
☐ Tab to remember me checkbox
☐ Checkbox shows blue outline
☐ Outline forms rectangle around checkbox
☐ Outline has offset spacing
☐ Clear visual indication of focus
```

### Section 2: Color Contrast Testing

**Objective:** Verify text and interactive elements meet WCAG AA contrast (4.5:1 for normal text).

**Tools:**

- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Browser DevTools (Chrome/Edge): Right-click element → Inspect → Styles panel

```
Text Elements:
☐ Black text on white background: 21:1 (excellent)
☐ Slate-700 (#374151) on white: 7.2:1 (excellent)
☐ Slate-600 (#4B5563) on white: 4.8:1 (meets AA)
☐ Red error text (#DC2626) on white: 4.5:1 (meets AA minimum)
☐ Yellow text on yellow-50 background: 3.1:1 (does NOT meet AA)

Button Elements:
☐ White text on blue button (RGB 37, 99, 235): 8.5:1 (excellent)
☐ White text on blue gradient (blue-500 to blue-600): 8:1+ (excellent)
☐ Focus ring blue on white background: 3.2:1 (meets AA minimum)

Link Elements:
☐ Blue link text (RGB 37, 99, 235) on white: 5:1 (meets AA)
☐ Slate-700 link text on white: 7.2:1 (excellent)
☐ Link text on white background: 4.5:1+ (meets AA)

Form Elements:
☐ Label text on white: 21:1 (excellent)
☐ Placeholder text on white: 4.5:1+ (acceptable)
☐ Border color (slate-300) on white: 3:1 (sufficient for borders)
☐ Focus ring on white background: 3:1+ (meets AA minimum)
```

### Section 3: Zoom and Magnification Testing

**Objective:** Verify form remains usable at 200% zoom (WCAG 2.1 Success Criterion 1.4.4).

```
Chrome/Edge Zoom:
☐ Press Ctrl and + to zoom to 200%
☐ Form layout remains functional (no horizontal scrolling required)
☐ All form fields remain visible
☐ All buttons remain clickable
☐ Text remains readable
☐ Focus indicators still visible
☐ Form is still completable

Firefox Zoom:
☐ Press Ctrl and + to zoom to 200%
☐ Same checks as above
☐ No content is cut off

Mobile Testing (Simulates zoom):
☐ Open DevTools (F12)
☐ Click device emulation icon
☐ Select Pixel 5 or similar mobile device
☐ Form layout adapts to small screen
☐ Touch targets remain adequate (44x44px minimum)
☐ Form remains usable without horizontal scroll
```

### Section 4: Color Blindness Testing

**Objective:** Verify form is usable without relying on color alone.

**Tools:**

- ChromeVox Color Blindness Extension
- Daltonize app: https://www.daltonize.org/
- WebAIM Colorblind Simulator

```
Deuteranopia (Red-Blind):
☐ Error text is still distinguishable
☐ Links are underlined (not color alone)
☐ Buttons are still clear
☐ Focus indicators still visible

Protanopia (Green-Blind):
☐ Error highlighting still visible
☐ Links are underlined
☐ Button contrast sufficient
☐ Focus ring still visible

Tritanopia (Blue-Yellow Blind):
☐ Blue focus ring might not be distinguishable
☐ Alternative: Check outline width is sufficient
☐ Links have underline as secondary indicator
☐ Errors use more than just red color

Red-Green Color Blind:
☐ Red asterisks on required fields visible
☐ But also check: aria-label="required" announced
☐ Error messages not color-coded
☐ Using shape + color or redundant indicators
```

### Section 5: Text Spacing Testing

**Objective:** Verify text remains readable with increased spacing.

```
Browser Extension: Text Spacing Firefox Add-on
https://www.paciellogroup.com/resource/text-spacing/

Apply settings:
- Line height: 1.5
- Paragraph spacing: 2em
- Letter spacing: 0.12em
- Word spacing: 0.16em

Then check:
☐ All text remains readable
☐ No text is cut off
☐ No overlapping lines
☐ Form labels clearly associated
☐ Error messages not truncated
☐ Button text fully visible
```

### Section 6: Disabled State Visibility

**Objective:** Verify disabled form elements are clearly distinguishable.

```
Testing Method: Browser inspector to set :disabled state

When form is submitting (inputs disabled):
☐ Email input background becomes gray (bg-slate-100)
☐ Password input background becomes gray
☐ Text color changes to lighter gray (text-slate-500)
☐ Cursor changes to "not-allowed"
☐ Disabled state is visually distinct from enabled

Sign In Button When Disabled:
☐ Button opacity reduces (disabled:opacity-50)
☐ Visual change makes it clear button cannot be clicked
☐ But NOT changing text alone (always shows "Sign In")
```

### Section 7: Required Field Indicators

**Objective:** Verify required fields are clearly marked visually AND semantically.

```
Email Field:
☐ Red asterisk (*) appears after label text
☐ Asterisk color is clearly visible (red/crimson)
☐ Asterisk has aria-label="required" (hidden visually, announced)
☐ Input has required attribute
☐ Input has aria-required="true"

Password Field:
☐ Red asterisk (*) appears after label
☐ Same visual treatment as email
☐ Semantic indicators present (required, aria-required)

Visual + Semantic Redundancy:
☐ Users with color blindness see asterisk shape
☐ Screen reader users hear "required"
☐ Both are present (not one or the other)
```

### Section 8: Link Underlines and Distinguishability

**Objective:** Verify links are distinguishable from surrounding text (not color alone).

```
Forgot Password Link:
☐ Text is underlined (not just colored)
☐ On hover, underline may disappear (hover:no-underline is ok)
☐ On focus, underline appears (clear focus indicator)
☐ Text color is dark enough to be distinguished
☐ When not underlined, sufficient color contrast (5:1+)

Create One Now Link:
☐ Link is underlined
☐ Underline appears on hover/focus
☐ Link text is blue (standard link color)
☐ Surrounded by context text makes purpose clear
☐ Sufficient contrast to distinguish from body text

Back to Welcome Link:
☐ Has icon (arrow) - adds visual distinction
☐ Has underline or similar indicator
☐ Text is white on emerald background
☐ Good contrast (7:1+)
```

### Section 9: Error Messages Visibility

**Objective:** Verify error messages are clearly visible and readable.

```
Field-level Errors:
☐ Error text appears in red below field
☐ Red color is clearly distinguishable (DC2626)
☐ Error icon appears (ExclamationCircleIcon)
☐ Icon is red and matches text
☐ Error message is readable font size
☐ Error is NOT conveyed by color alone (icon + text)

Error Summary:
☐ Error summary has red left border
☐ Error summary background is red-50 (light red)
☐ Title text is bold and darker red
☐ Clear visual hierarchy
☐ Error list is bulleted and easy to scan
☐ Dismiss button is clearly visible
☐ Summary stands out from form content
```

### Section 10: Responsive Design at Various Breakpoints

**Objective:** Verify accessibility is maintained at different screen sizes.

```
Mobile (375px - iPhone SE):
☐ Form is single column layout
☐ All fields are visible without horizontal scroll
☐ Touch targets are 44x44px minimum
☐ Labels above inputs (not side by side)
☐ Error messages don't overlap content
☐ Focus indicators visible on small screen
☐ Keyboard still functional on mobile browser

Tablet (768px - iPad):
☐ Form layout adapts to tablet width
☐ Touch targets adequate
☐ Text size readable without zooming
☐ Keyboard navigation works
☐ Focus indicators visible

Desktop (1024px+):
☐ Form centered and readable
☐ Adequate whitespace around form
☐ All elements spaced properly
☐ Not too wide (readability reduced >80 chars)
```

---

## Browser DevTools Testing

### Chrome DevTools Accessibility Audit

```
1. Open login page in Chrome/Edge
2. Press F12 to open DevTools
3. Go to "Lighthouse" tab (or "Audits" in older versions)
4. Select "Accessibility" from category dropdown
5. Click "Analyze page load"
6. Review results:

Expected Results:
☐ Accessibility score: 90+/100
☐ No "Failures" (errors)
☐ No "Warnings" (issues)
☐ Items under "Passed Audits" include:
  - [x] Document has proper lang attribute
  - [x] HTML has [lang] attribute
  - [x] Form elements have labels
  - [x] Form labels are associated with inputs
  - [x] Input buttons have accessible names
  - [x] Buttons have accessible names
  - [x] Links have accessible names
  - [x] Contrast is sufficient
  - [x] Focus visible elements have sufficient contrast
```

### Firefox DevTools Accessibility Inspector

```
1. Open login page in Firefox
2. Press F12 to open DevTools
3. Go to "Inspector" tab
4. Go to "Accessibility" tab (on right side)
5. Inspect each form element:

Email Input:
☐ Name: "Email" (from label)
☐ Role: "textbox"
☐ Value: current input value
☐ States: "required"
☐ No accessibility violations

Password Input:
☐ Name: "Password"
☐ Role: "textbox"
☐ States: "required"
☐ No violations

Sign In Button:
☐ Name: "Sign in to your account"
☐ Role: "button"
☐ No violations

Checkbox:
☐ Name: "Remember me"
☐ Role: "checkbox"
☐ States: "checked" or "not checked"
```

### Inspect Element Accessibility Properties

```
Chrome/Edge/Firefox:
1. Right-click on email input
2. Select "Inspect" or "Inspect Element"
3. In DevTools, check Accessibility panel
4. Verify:

For each element:
☐ "Accessible Name" is present and correct
☐ "Accessible Description" present if needed
☐ "Role" is correct (textbox, checkbox, button, etc.)
☐ "States and Properties" include required attributes
☐ No red "Violations" section
☐ ARIA attributes are correct (aria-required, aria-describedby, etc.)

Check computed ARIA:
☐ aria-required="true" on required fields
☐ aria-describedby linked to error element ID
☐ aria-live="assertive" on error summary
☐ aria-hidden="true" on decorative elements
☐ aria-label present on icon-only buttons
```

### axe DevTools Automated Audit

```
1. Install axe DevTools extension
2. Open login page
3. Click axe icon in DevTools/toolbar
4. Click "Scan THIS PAGE"
5. Review results:

Expected:
☐ 0 Violations (critical issues)
☐ 0 Warnings (issues to review)
☐ +30 Passes (features working correctly)

Common checks passed:
☐ Form elements have associated labels
☐ Color contrast is sufficient
☐ Links have accessible names
☐ Buttons have accessible names
☐ Image alt text is present
☐ Focus visible
☐ No empty links/buttons
☐ List structure is correct
```

### WAVE Browser Extension

```
1. Install WAVE extension
2. Open login page
3. Click WAVE icon
4. Review visual feedback:

Expected:
☐ Green icons: Accessibility features in place
☐ Blue icons: Structural elements (headings, lists)
☐ Yellow icons: Alerts (review but likely ok)
☐ Red icons: Errors (should be zero)

Specifically check:
☐ Green label icons on form fields
☐ Green text contrast icons
☐ Blue heading icon on h1
☐ Green list icons if applicable
☐ Zero red error icons
```

---

## Mobile Accessibility Testing

### iOS VoiceOver Testing

```
Setup:
1. iPhone/iPad with iOS 14+
2. Settings → Accessibility → VoiceOver → ON
3. Open Safari and navigate to login page

Testing:
☐ Swipe right to move forward through elements
☐ Swipe left to move backward
☐ Double-tap to select/activate element
☐ Two-finger Z to open rotor
☐ In Rotor, check:
  - Headings: Should show "Sign in to The Recruiting Compass"
  - Form fields: Should list email, password, checkbox, button
  - Links: Should list all clickable links

Form Interaction:
☐ Swipe to email field
☐ Double-tap to activate (cursor appears)
☐ Type email using keyboard
☐ Swipe to next field (password)
☐ Type password
☐ Swipe to Sign In button
☐ Double-tap to submit (or flick up with three fingers)
☐ Form submits successfully
```

### Android TalkBack Testing

```
Setup:
1. Android device with Android 6+
2. Settings → Accessibility → TalkBack → ON
3. Open Chrome and navigate to login page

Testing:
☐ Swipe right to move forward
☐ Swipe left to move backward
☐ Tap twice to select element
☐ Swipe down then right for context menu
☐ Listen for announcements:
  - Page heading announced
  - Form fields announced with labels
  - Required status announced
  - Button purpose announced

Form Interaction:
☐ Swipe to email field
☐ Double-tap to edit
☐ Type email
☐ Swipe to password field
☐ Double-tap and type password
☐ Swipe to button
☐ Double-tap to submit
☐ Listen for success or error announcement
```

### Mobile Touch Target Size

```
WCAG 2.1 Level AAA Requirement: 44x44 CSS pixels minimum
WCAG 2.1 Level AA Requirement: 44x44 CSS pixels recommended

Chrome DevTools Mobile Emulation:
1. Open DevTools
2. Click device icon (Ctrl+Shift+M)
3. Select mobile device (Pixel 5, iPhone 12, etc.)
4. Inspect each interactive element:

Email Field:
☐ Height: 48px (3 × 16px base + padding)
☐ Width: 100% of container (adequate)
☐ Padding: 12px vertical, 16px horizontal
☐ Touch target: 48x48px effective

Password Field:
☐ Same dimensions as email field
☐ 48x48px touch target

Checkbox:
☐ Width: 24px (checkbox itself)
☐ Height: 24px
☐ Plus label makes effective target larger
☐ Effective touch target: 48px+ (checkbox + label)

Buttons:
☐ Sign In: 48px height
☐ Width: 100% of container
☐ Sufficient for thumb/finger tapping

Links:
☐ Forgot Password link: 36px height (default line-height)
☐ Create one now: 36px height
☐ Ideally 44x44px, but acceptable at 36x36px with surrounding whitespace
```

### Mobile Keyboard Testing

```
iOS Safari:
☐ Open form on iPhone
☐ Tap email field
☐ Email keyboard appears
☐ @ symbol visible on keyboard
☐ Can type email address
☐ Tap password field
☐ Number + symbol keyboard appears (security keyboards)
☐ Can type password
☐ Keyboard doesn't obscure submit button
☐ Can scroll to see button if needed

Android Chrome:
☐ Tap email field
☐ Email-optimized keyboard appears
☐ Can type and submit
☐ Password field shows masked keyboard
☐ Form remains accessible with keyboard open
```

---

## Performance & Technical Testing

### Lighthouse Performance Score

```
Chrome DevTools Lighthouse:
1. Open DevTools
2. Click Lighthouse tab
3. Select "Performance"
4. Click "Analyze page load"

Target Metrics:
☐ First Contentful Paint: <1.8s
☐ Largest Contentful Paint: <2.5s
☐ Cumulative Layout Shift: <0.1
☐ Performance Score: 90+/100

Accessibility Score (in same report):
☐ Accessibility Score: 90+/100
☐ No accessibility-related failures

This ensures the page is:
- Fast to load
- No layout shifts (affecting focus/layout)
- Accessible while being performant
```

### Network Performance with Accessibility Tools

```
Testing accessibility with slow network:

1. Open DevTools
2. Go to Network tab
3. Set throttling: "Slow 4G"
4. Reload page
5. Verify:

☐ Page loads (even if slower)
☐ Form becomes interactive before full load
☐ Focus indicators work during loading
☐ Error messages appear when expected
☐ Screen readers can still read content as it loads
☐ No accessibility features broken by slow load
```

### Browser Compatibility

```
Test on:
☐ Chrome 90+ (latest)
☐ Firefox 88+ (latest)
☐ Safari 14+ (latest)
☐ Edge 90+ (latest)

For each browser:
☐ Form renders correctly
☐ Focus indicators visible
☐ All form fields functional
☐ Form submission works
☐ No console errors
☐ All ARIA attributes supported
☐ Screen reader (if applicable) works
```

### Automated Testing (CI/CD)

```
If running automated tests:

npm run test:
☐ All accessibility tests pass
☐ ARIA attributes are rendered correctly
☐ Focus management works
☐ Error handling is tested

npx axe-core:
☐ Automated accessibility audit passes
☐ No critical violations

npm run lint:
☐ a11y ESLint rules pass
☐ No accessibility warnings
```

---

## Remediation Guide

### Issue: Focus Ring Not Visible

**Symptom:** Cannot see focus indicator when tabbing through form.

**Checklist to troubleshoot:**

```
☐ Verify focus:ring-2 focus:ring-offset-2 classes are applied
☐ Check that ::focus-visible pseudo-selector isn't overridden
☐ Verify focus ring color contrasts with background:
  - On white background: should see blue ring
  - Color contrast should be 3:1+
☐ Check CSS isn't removing outline:
  ✗ DON'T: outline: none
  ✓ DO: outline-offset: 2px
☐ Verify element is focusable (tabindex, button, input, link)
☐ Check browser zoom (ring should be visible at 200%)

If still not visible:
1. Inspect element (F12)
2. Go to Styles tab
3. Look for "focus" pseudo-class
4. Verify ring properties are applied
5. Check for !important overrides
```

**Fix:**

```html
<!-- CORRECT -->
<input
  class="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
/>

<!-- WRONG - removes focus -->
<input class="focus:outline-none" />

<!-- WRONG - no offset, hard to see -->
<input class="focus:ring-1 focus:ring-gray-300" />
```

---

### Issue: Screen Reader Cannot Read Form Labels

**Symptom:** Screen reader announces "button" or "edit text" without label.

**Checklist:**

```
☐ Verify <label> element exists
☐ Check label has FOR attribute matching input ID
☐ Input has unique ID (required for label association)
☐ No orphaned inputs without labels
☐ Check aria-label is not used instead of <label> (when possible)

Example:
☐ <label for="email">Email</label>
☐ <input id="email" type="email">
☐ Not: <input aria-label="Email">
```

**Fix:**

```html
<!-- CORRECT -->
<label for="email">Email</label>
<input id="email" type="email" required />

<!-- WRONG - no label -->
<input id="email" type="email" required />

<!-- ACCEPTABLE as fallback -->
<input aria-label="Email" type="email" required />
<!-- (but explicit label is better) -->
```

---

### Issue: Error Messages Not Associated with Fields

**Symptom:** Screen reader announces error, but it's not linked to the field it describes.

**Checklist:**

```
☐ Error message has unique ID
☐ Input has aria-describedby attribute
☐ aria-describedby value matches error ID
☐ Error appears/disappears with field state
☐ Error is announced when field loses focus (blur)

Example:
☐ Error element: <div id="email-error">Invalid email</div>
☐ Input: <input aria-describedby="email-error">
```

**Fix:**

```html
<!-- CORRECT -->
<div>
  <label for="email">Email</label>
  <input id="email" aria-describedby="email-error" />
  <div id="email-error" role="alert">Invalid email format</div>
</div>

<!-- WRONG - error not linked -->
<div>
  <label for="email">Email</label>
  <input id="email" />
  <div>Invalid email format</div>
</div>

<!-- WRONG - aria-describedby doesn't match ID -->
<div>
  <label for="email">Email</label>
  <input id="email" aria-describedby="error-msg" />
  <div id="email-error">Invalid email format</div>
  <!-- ^^^ IDs don't match -->
</div>
```

---

### Issue: Color Contrast Too Low

**Symptom:** DevTools or WAVE shows contrast ratio below 4.5:1.

**Checklist:**

```
☐ Measure contrast ratio with WebAIM tool
☐ Verify text color has sufficient contrast
☐ Verify focus ring has sufficient contrast
☐ Verify button text contrasts with button color
☐ Test with color blindness simulator

Required ratios:
- Large text (18+ or 14+ bold): 3:1
- Normal text: 4.5:1
- Focus indicators: 3:1 minimum
```

**Fix:**

```
Example: Red error text too light
☐ Current: #F87171 (rose-400) - only 3:1 ratio
✓ Fixed: #DC2626 (red-600) - 4.5:1+ ratio

Example: Blue link too light
☐ Current: #93C5FD (blue-300) - only 3:1 ratio
✓ Fixed: #2563EB (blue-600) - 5:1+ ratio

Use WebAIM color contrast checker:
- Enter text color hex code
- Enter background hex code
- Check if contrast is 4.5:1+
- Adjust color until requirement is met
```

---

### Issue: Keyboard Navigation Skips Fields

**Symptom:** Tab order is out of logical order or skips elements.

**Checklist:**

```
☐ Remove or fix tabindex attributes:
  ✗ Don't use positive tabindex (tabindex="1")
  ✓ Use tabindex="0" for custom elements
  ✓ Use tabindex="-1" for programmatic focus

☐ Verify form HTML order matches visual order
☐ Ensure no elements have tabindex="1", "2", etc.
☐ Check for CSS positioning that changes visual order
☐ Verify focusable elements are in correct order

Test tab order:
1. Press Tab from page load
2. List order elements are focused
3. Compare to visual order on page
4. Should be logical and match layout
```

**Fix:**

```html
<!-- CORRECT - no explicit tabindex, or use 0 -->
<input id="email" />
<input id="password" />
<button type="submit">Sign In</button>

<!-- WRONG - explicit tabindex creates confusion -->
<input id="email" tabindex="2" />
<input id="password" tabindex="1" />
<button type="submit" tabindex="3">Sign In</button>

<!-- ACCEPTABLE - for custom elements -->
<div role="button" tabindex="0">Custom Button</div>
```

---

### Issue: Error Summary Not Announced

**Symptom:** Screen reader doesn't announce error message when it appears.

**Checklist:**

```
☐ Error summary has role="alert"
☐ Error summary has aria-live="assertive" or aria-live="polite"
☐ Error summary appears in DOM before announcement
☐ Use aria-atomic="true" to announce whole summary
☐ Verify aria-live region was created BEFORE error appears
```

**Fix:**

```html
<!-- CORRECT -->
<div id="error-summary" role="alert" aria-live="assertive" aria-atomic="true">
  <h3>Please correct the following errors:</h3>
  <ul>
    <li>Email: Invalid email format</li>
  </ul>
</div>

<!-- WRONG - no role/aria-live -->
<div id="error-summary">
  <h3>Please correct the following errors:</h3>
  <ul>
    <li>Email: Invalid email format</li>
  </ul>
</div>

<!-- WRONG - aria-live polite (should be assertive for errors) -->
<div id="error-summary" role="alert" aria-live="polite">...</div>
```

---

### Issue: Icons Announced by Screen Reader

**Symptom:** Screen reader says "image" or "icon" in the middle of content.

**Checklist:**

```
☐ All decorative icons have aria-hidden="true"
☐ Icon elements don't have alt text (for decorative icons)
☐ Meaningful icons have aria-label or role appropriate handling
☐ SVG icons have appropriate ARIA attributes
```

**Fix:**

```html
<!-- CORRECT - decorative icon hidden -->
<button>
  <TrashIcon aria-hidden="true" />
  Delete
</button>

<!-- CORRECT - icon with meaningful context -->
<span aria-hidden="true">⚠️</span>
<span>Warning: This action cannot be undone</span>

<!-- WRONG - decorative icon announced -->
<button>
  <TrashIcon />
  Delete
  <!-- ^ Announces as "image" or "trash icon" -->
</button>

<!-- WRONG - functional icon without label -->
<button title="Delete">
  <TrashIcon />
  <!-- ^ No accessible name -->
</button>

<!-- CORRECT - functional icon with accessible name -->
<button aria-label="Delete this item">
  <TrashIcon aria-hidden="true" />
</button>
```

---

### Issue: Mobile Touch Targets Too Small

**Symptom:** Difficult to tap buttons/links on mobile device.

**Checklist:**

```
WCAG AAA standard: 44x44 CSS pixels
WCAG AA recommended: 44x44 CSS pixels

Measure using Chrome DevTools:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Inspect element
4. Check dimensions in styles panel

Check:
☐ Button height >= 44px
☐ Button width >= 44px (or 100% if full-width)
☐ Input field height >= 44px
☐ Checkbox effective target >= 44px (with label)
☐ Links have adequate padding
☐ Sufficient spacing between targets
```

**Fix:**

```html
<!-- CORRECT - 48px height touch target -->
<button class="px-4 py-3">Sign In</button>
<!-- py-3 = 12px padding × 2 + 16px text + 8px = 48px -->

<!-- CORRECT - full width on mobile -->
<input class="w-full py-3" />
<!-- Full width + 24px padding = adequate touch target -->

<!-- ACCEPTABLE - with surrounding whitespace -->
<a href="/forgot">Forgot password?</a>
<!-- Even if link is 36px, surrounded by whitespace makes it 44px effective -->

<!-- WRONG - too small -->
<button class="py-1 px-2">Small Button</button>
<!-- py-1 = 4px padding - too small -->
```

---

## Checklist Summary

Use this table for quick reference during testing:

```
KEYBOARD NAVIGATION (20 checks)
☐ Focus is visible on all interactive elements
☐ Focus order is logical (skip link → links → form → buttons)
☐ Tab and Shift+Tab work in both directions
☐ Skip link works on page load
☐ Can submit form with Tab + Enter
☐ Focus doesn't get trapped
☐ All buttons accessible via keyboard
☐ All links accessible via keyboard
☐ No keyboard trap in error summary
☐ Space key toggles checkbox
☐ Enter key submits form
☐ Esc key dismisses errors (if applicable)
☐ Focus indicators visible at 200% zoom
☐ Tab order matches visual order
☐ No elements skipped during tabbing
☐ All form fields focusable
☐ All buttons focusable
☐ All links focusable
☐ Keyboard works after mouse use
☐ Can navigate with keyboard after page fully loads

SCREEN READER (20 checks)
☐ Page heading announced on load
☐ Form structure announced
☐ All labels associated with fields
☐ Required fields announced as "required"
☐ Field errors announced when appear
☐ Error messages linked to fields
☐ Error summary announced as "alert"
☐ Button states announced (loading, disabled, etc.)
☐ All links have accessible names
☐ Button purposes are clear
☐ Checkbox state announced (checked/unchecked)
☐ Can hear when form validates
☐ Can hear validation errors
☐ Icons not announced (aria-hidden)
☐ Decorative elements not announced
☐ Form submission announced
☐ Success/error on submission announced
☐ Skip link has accessible name
☐ Can navigate with rotor (headings, forms, links)
☐ No duplicate announcements

VISUAL DESIGN (20 checks)
☐ Focus indicators visible (blue rings)
☐ Focus indicators have 3:1+ contrast
☐ Text has 4.5:1+ contrast
☐ Links underlined or distinct
☐ Required fields marked (red asterisks)
☐ Error messages in red + text
☐ Disabled states visually distinct
☐ Form readable at 200% zoom
☐ No horizontal scroll at 200% zoom
☐ Colors not sole indicator (redundant cues)
☐ Touch targets 44x44px minimum
☐ Error summary clearly visible
☐ Placeholder text is readable
☐ Labels are clear and associated
☐ Button purposes clear
☐ Sufficient spacing between elements
☐ No text overlaps
☐ Focus ring doesn't overlap text
☐ Layout adapts to mobile width
☐ Whitespace adequate for readability

ACCESSIBILITY AUDITS (10 checks)
☐ Chrome Lighthouse Accessibility: 90+/100
☐ axe DevTools: 0 violations
☐ WAVE: 0 red errors
☐ Firefox Accessibility inspector: No violations
☐ form elements have labels
☐ Buttons have accessible names
☐ Links have accessible names
☐ Image alt text present/hidden appropriately
☐ Color contrast sufficient
☐ ARIA attributes correct

MOBILE TESTING (10 checks)
☐ Form works on iOS with VoiceOver
☐ Form works on Android with TalkBack
☐ Touch targets 44x44px minimum
☐ Mobile keyboard doesn't hide form
☐ Zoom works up to 200% on mobile
☐ Keyboard navigation works on mobile
☐ Screen reader works on mobile
☐ Can submit form on mobile
☐ No horizontal scroll required
☐ Layout adapts to screen size

TOTAL: 90 accessibility checks
```

---

## Sign-Off

After completing all tests:

```
Testing completed by: ________________
Date: ________________
Overall accessibility rating: □ Pass / □ Fail / □ Pass with notes
Notes/Issues found: ____________________________
Remediation plan (if failed): ____________________________
Re-test date: ________________
```

---

## References

### Standards & Documentation

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- WebAIM: https://webaim.org/

### Tools

- Lighthouse: Built into Chrome DevTools
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/extension/
- NVDA Screen Reader: https://www.nvaccess.org/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

### Resources

- Color Blindness Simulator: https://www.daltonize.org/
- Screen Reader Comparison: https://www.nvaccess.org/document/2-3/introduction/screen-readers-and-browser/
- Touch Target Size: https://www.smashingmagazine.com/2022/09/inline-links-touch-targets/

---

**Document Version:** 1.0
**Last Updated:** February 6, 2026
**Status:** Ready for Team Use
