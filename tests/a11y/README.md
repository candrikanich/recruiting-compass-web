# Automated Accessibility Testing

This directory contains automated accessibility testing scripts and configuration for the Recruiting Compass web application.

## Overview

We use two complementary tools for automated accessibility testing:

1. **axe-core** - Accessibility rules engine for automated testing
2. **pa11y-ci** - Continuous integration accessibility testing suite

Both tools check for WCAG 2.1 Level AA compliance.

## Tools

### axe-core

- **Purpose:** Automated accessibility rule engine
- **What it tests:** 50+ rules covering common accessibility issues
- **Coverage:** ~50% of possible accessibility issues (catches high-confidence violations)
- **Script:** `tests/a11y/axe-test.js`
- **Command:** `npm run test:a11y`

### pa11y-ci

- **Purpose:** Automated accessibility testing in CI/CD pipelines
- **What it tests:** WCAG 2.1 AA standards via multiple runners
- **Coverage:** ~50% of possible accessibility issues
- **Config:** `tests/a11y/.pa11yci.json`
- **Command:** `npm run test:a11y:pa11y`

## Quick Start

### Running Tests Locally

**Before running tests, start the development server:**

```bash
npm run dev
```

**In another terminal, run accessibility tests:**

```bash
# Run axe accessibility audit
npm run test:a11y

# Run pa11y-ci audit
npm run test:a11y:pa11y

# Run both
npm run test:a11y && npm run test:a11y:pa11y
```

### Expected Output

```
🔍 Starting Automated Accessibility Testing

📍 Base URL: http://localhost:3000
⏱️  Standard: WCAG 2.1 Level AA

────────────────────────────────────────────────────────────────────────────────

🧪 Testing: Login Page
📄 URL: http://localhost:3000/login
   ✅ Passes: 45
   ⚠️  Violations: 0
   🎉 PASSED - No accessibility violations found!

────────────────────────────────────────────────────────────────────────────────

📊 ACCESSIBILITY TEST SUMMARY

Total Pages Tested: 4
Pages Passed: 4/4
Total Violations: 0

✅ All accessibility tests passed!
```

## Pages Tested

The automated tests currently cover these critical user flows:

| Page      | URL          | Purpose              |
| --------- | ------------ | -------------------- |
| Login     | `/login`     | User authentication  |
| Signup    | `/signup`    | New account creation |
| Dashboard | `/dashboard` | Main app interface   |
| Settings  | `/settings`  | User preferences     |

### Adding More Pages

Edit `tests/a11y/axe-test.js` and add to `PAGES_TO_TEST`:

```javascript
{
  name: "Schools Directory",
  url: "/schools",
  wcagLevel: "wcag2aa",
}
```

## CI/CD Integration

Accessibility tests run automatically in the GitHub Actions pipeline:

1. **When:** On every push to `develop` and all PRs to `develop`/`main`
2. **Where:** After lint and type checks pass
3. **Failure handling:** Pipeline fails if violations found
4. **Reports:** JSON report generated as artifact

### View CI Results

1. Go to GitHub Actions tab
2. Click "Test & Verify" workflow
3. Expand "Run Accessibility Tests" step
4. View violations in console output

### Download Report

1. Go to workflow run details
2. Download "accessibility-report" artifact
3. Open `accessibility-report.json` in editor or online JSON viewer

## Understanding Results

### Violation Impact Levels

```
CRITICAL  - Serious accessibility barriers (must fix)
SERIOUS   - Significant accessibility issues (should fix)
MODERATE  - Notable impact on accessibility (consider fixing)
MINOR     - Minimal impact on accessibility (can defer)
```

### Common Violations

**Color Contrast**

```
Rule: color-contrast
Impact: SERIOUS
Fix: Increase text-to-background color contrast to 4.5:1
Tool: WebAIM Contrast Checker
```

**Missing Alt Text**

```
Rule: image-alt
Impact: SERIOUS
Fix: Add descriptive alt text to images
Example: <img alt="School logo" src="...">
```

**Missing Form Labels**

```
Rule: label
Impact: SERIOUS
Fix: Associate labels with form inputs
Example: <label for="email">Email</label><input id="email">
```

**Focus Indicators**

```
Rule: focus-visible
Impact: SERIOUS
Fix: Add visible focus styling
Example: input:focus { outline: 2px solid blue; }
```

## Fixing Violations

### Quick Fix Guide

1. **Read the violation message** - Describes what's wrong
2. **Check the "Affected Elements"** - Shows which elements have issues
3. **Review the WCAG criterion** - Links to detailed guidance
4. **Implement the fix** - Update code
5. **Re-run tests** - Verify fix works

### Example: Fixing Missing Label

**Violation:**

```
Form elements must have labels (wcag2aa: label)
Affected elements: input#email
```

**Fix:**

```html
<!-- Before: Missing label -->
<input id="email" type="email" />

<!-- After: With label -->
<label for="email">Email Address</label>
<input id="email" type="email" />
```

**Verify:**

```bash
npm run test:a11y
# Should show 1 fewer violation
```

## Configuration

### Allowed Violations

If a violation is a false positive or intentional design decision, add to `ALLOWED_VIOLATIONS` in `axe-test.js`:

```javascript
const ALLOWED_VIOLATIONS = [
  "color-contrast", // False positive: contrast is sufficient
  "aria-required-parent", // Intentional: custom widget
];
```

Then update tests and re-run:

```bash
npm run test:a11y
```

### Custom Rules

To add custom accessibility rules:

1. Edit `PAGES_TO_TEST` in `axe-test.js`
2. Add page URL to test
3. Run tests

## Limitations

Automated testing catches ~50% of accessibility issues:

**What automated tools catch:**

- Color contrast problems
- Missing alt text
- Missing form labels
- Missing ARIA attributes
- Heading structure issues
- Button/link naming issues

**What requires manual testing:**

- Keyboard navigation
- Screen reader compatibility
- Visual focus indicators
- Color blindness accessibility
- Text readability
- Mobile touch targets

**For comprehensive testing, use the [Accessibility Testing Checklist](../../docs/ACCESSIBILITY_TESTING_CHECKLIST.md)**

## Resources

- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Standard
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/) - Implementation guide
- [WebAIM](https://webaim.org/) - Accessibility education

## Troubleshooting

### Tests Won't Start

```bash
# 1. Make sure dev server is running
npm run dev

# 2. Check Node version (needs 18+)
node --version

# 3. Install dependencies
npm install

# 4. Clear cache and retry
rm -rf node_modules
npm install
```

### Timeout Errors

```
❌ ERROR: Failed to test Login Page
   Timeout waiting for 'networkidle'
```

**Fix:**

- Check if dev server is running on `http://localhost:3000`
- Increase timeout in `axe-test.js`: Change `timeout` from 10000 to 15000

### False Positives

Some violations may not be real issues. To allowlist:

```javascript
// In axe-test.js
const ALLOWED_VIOLATIONS = ["rule-id-of-false-positive"];
```

## Contributing

When adding new pages or features:

1. Add page to `PAGES_TO_TEST` in `axe-test.js`
2. Run local tests: `npm run test:a11y`
3. Fix any violations before committing
4. Push to feature branch
5. CI/CD will verify accessibility in PR

## References

- [Deque axe](https://github.com/dequelabs/axe-core)
- [pa11y](https://pa11y.org/)
- [WCAG 2.1 AA Standard](https://www.w3.org/WAI/WCAG21/quickref/#wcag2aa)
