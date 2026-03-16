# CI/CD Accessibility Testing Setup

**Status:** ✅ Live
**Last Updated:** February 6, 2026
**Standard:** WCAG 2.1 Level AA
**Coverage:** ~50% of accessibility issues (automated detection)

---

## Overview

Automated accessibility testing is integrated into your GitHub Actions CI/CD pipeline. Every commit and pull request automatically runs accessibility audits to catch violations before they reach production.

---

## Architecture

```
GitHub Trigger (Push/PR)
    ↓
├─ Lint & Type Check (parallel)
│  ├─ ESLint
│  └─ TypeScript
│
├─ Unit Tests (parallel)
│  └─ Vitest
│
├─ Accessibility Tests (parallel) ← NEW
│  ├─ axe-core audit
│  └─ WCAG 2.1 AA compliance
│
└─ Deploy to Staging (if all pass)
   └─ Vercel deployment
```

**Key:** Accessibility tests run **in parallel** with unit tests, not blocking other checks. However, **deployment will fail** if accessibility violations are found.

---

## How It Works

### 1. Local Development

Before pushing, run tests locally:

```bash
# Start dev server
npm run dev

# In another terminal, run accessibility tests
npm run test:a11y
```

**Output Example:**

```
🔍 Starting Automated Accessibility Testing

📍 Base URL: http://localhost:3000
⏱️  Standard: WCAG 2.1 Level AA

────────────────────────────────────────────────────────────────

🧪 Testing: Login Page
📄 URL: http://localhost:3000/login
   ✅ Passes: 45
   ⚠️  Violations: 0
   🎉 PASSED - No accessibility violations found!

────────────────────────────────────────────────────────────────

📊 ACCESSIBILITY TEST SUMMARY

Total Pages Tested: 4
Pages Passed: 4/4
Total Violations: 0

✅ All accessibility tests passed!
```

### 2. Push to GitHub

When you push to `develop` or create a PR:

```bash
git push origin feature/my-feature
```

GitHub automatically triggers the "Test & Verify" workflow.

### 3. Workflow Execution

The workflow runs 4 jobs in this sequence:

| Order | Job                             | Time   | Depends On        |
| ----- | ------------------------------- | ------ | ----------------- |
| 1     | Code Quality (Lint, Type-check) | ~1 min | —                 |
| 2a    | Unit Tests                      | ~2 min | Quality passes    |
| 2b    | **Accessibility Tests**         | ~2 min | Quality passes    |
| 3     | Deploy to Staging               | ~3 min | Tests + A11y pass |

**Jobs 2a and 2b run in parallel** = faster feedback.

### 4. Results & Reporting

#### Success (0 violations)

```
✅ All accessibility tests passed!
→ Slack notification sent to #deployments
→ Pipeline proceeds to staging deployment
```

#### Failure (violations found)

```
❌ Found 3 accessibility violation(s) across 2 page(s)
→ Slack notification sent to #deployments (urgent)
→ Pipeline stops - no deployment to staging
→ PR blocked until violations fixed
→ Detailed report available as artifact
```

---

## Pages Tested

Current tests cover these critical user flows:

| Page      | URL          | Role             | Tests                      |
| --------- | ------------ | ---------------- | -------------------------- |
| Login     | `/login`     | Authentication   | Form labels, focus, errors |
| Signup    | `/signup`    | Account creation | Form structure, contrast   |
| Dashboard | `/dashboard` | Main interface   | Navigation, links          |
| Settings  | `/settings`  | Configuration    | Form fields, buttons       |

### Adding More Pages

Edit `tests/a11y/axe-test.js`:

```javascript
const PAGES_TO_TEST = [
  {
    name: "Schools Directory",
    url: "/schools",
    wcagLevel: "wcag2aa",
  },
  {
    name: "School Detail",
    url: "/schools/123",
    wcagLevel: "wcag2aa",
  },
];
```

Then commit and tests will automatically run on next push.

---

## GitHub Actions Integration

### View Results in GitHub

**1. Go to Pull Request**

```
GitHub → Your Repo → Pull Requests → Your PR
```

**2. Check Workflow Status**

```
Scroll down to "Checks" section
Find "Test & Verify" workflow
Click to expand job details
```

**3. View Accessibility Results**

```
Click "Automated Accessibility Tests" job
Scroll to "Run accessibility tests" step
See console output with violations (if any)
```

**4. Download Report**

```
Click "Artifacts" section
Download "accessibility-report" zip file
Extract and open accessibility-report.json
```

### Blocking Merges on Violations

GitHub can be configured to **require accessibility tests to pass** before merge:

**To enable:**

1. Go to Repo Settings → Branches
2. Find "Develop" branch protection
3. Check "Require status checks to pass"
4. Add "Automated Accessibility Tests"
5. Save

Now PRs won't merge if accessibility tests fail. ✅

---

## Reports & Artifacts

### Report Format

`accessibility-report.json`:

```json
{
  "timestamp": "2026-02-06T16:55:00Z",
  "baseUrl": "http://localhost:3000",
  "wcagLevel": "wcag2aa",
  "summary": {
    "totalPages": 4,
    "passedPages": 3,
    "totalViolations": 2
  },
  "results": [
    {
      "page": "Login Page",
      "url": "/login",
      "violations": [],
      "passes": 45
    },
    {
      "page": "Dashboard",
      "url": "/dashboard",
      "violations": [
        {
          "id": "color-contrast",
          "impact": "serious",
          "description": "Elements must have sufficient color contrast",
          "nodes": [
            {
              "element": "a.btn-secondary"
            }
          ]
        }
      ],
      "passes": 42
    }
  ]
}
```

### Accessing Reports

**In GitHub Actions:**

```
Actions → Test & Verify → [run] → Artifacts → accessibility-report
```

**Programmatically:**

```bash
# Download latest report
gh run list --workflow=test.yml --json artifactObjects | \
  jq '.[0].artifactObjects[].name'
```

---

## Interpreting Violations

### Violation Structure

```json
{
  "id": "color-contrast",
  "impact": "serious",
  "description": "Elements must have sufficient color contrast",
  "help": "https://dequeuniversity.com/rules/axe/4.7/color-contrast",
  "nodes": [
    {
      "element": "button.btn",
      "html": "<button class=\"btn btn-secondary\">Submit</button>",
      "failureSummary": "Element has a contrast ratio of 3:1, but 4.5:1 is required"
    }
  ]
}
```

### Impact Levels

| Level    | Meaning                      | Action           |
| -------- | ---------------------------- | ---------------- |
| CRITICAL | Blocks access for some users | Fix immediately  |
| SERIOUS  | Significant barrier          | Fix before merge |
| MODERATE | Noticeable impact            | Consider fixing  |
| MINOR    | Small impact                 | Can defer        |

### Common Violations

**Color Contrast**

- **Why:** Text is hard to read for users with low vision
- **Fix:** Increase contrast ratio to 4.5:1 or higher
- **Tool:** WebAIM Contrast Checker

**Missing Form Labels**

- **Why:** Screen reader users can't identify form fields
- **Fix:** Add `<label for="id">` associated with `<input id="id">`
- **Tool:** Browser DevTools

**Missing Alt Text**

- **Why:** Users with vision impairment can't understand images
- **Fix:** Add descriptive alt text: `<img alt="...">`
- **Tool:** Manual inspection

**Focus Indicators**

- **Why:** Keyboard users can't see what's focused
- **Fix:** Add visible focus styling with good contrast
- **Tool:** Keyboard navigation test

---

## Fixing Violations

### Quick Fix Workflow

1. **View Report**

   ```
   Download accessibility-report.json from GitHub Actions
   ```

2. **Identify Issue**

   ```
   Read violation ID and description
   Note which pages/elements are affected
   ```

3. **Locate Code**

   ```
   Open element in IDE
   Use `element` field from report to find code
   ```

4. **Implement Fix**

   ```
   Apply recommended change
   Test locally: npm run test:a11y
   ```

5. **Verify**
   ```
   Run local tests again
   Commit and push
   GitHub Actions will verify
   ```

### Example: Fixing Color Contrast

**Report says:**

```
color-contrast violation on button.btn-secondary
Contrast ratio: 3:1, needs 4.5:1
```

**Find code:**

```css
/* buttons.css */
.btn-secondary {
  background: #94a3b8; /* too light */
  color: white;
}
```

**Fix:**

```css
/* buttons.css */
.btn-secondary {
  background: #64748b; /* darker color */
  color: white;
}

/* Verify contrast ratio increased to 4.5:1 or higher */
```

**Test:**

```bash
npm run test:a11y
# Should show 1 fewer violation
```

**Commit:**

```bash
git add . && git commit -m "fix: improve button contrast for accessibility"
git push
```

---

## Slack Notifications

Accessibility test results are posted to Slack:

### Success

```
✅ Pipeline Passed - Deployed to Staging
Repository: recruiting-compass-web
Branch: feature/a11y-improvements
Commit: abc1234...
Author: @chris

All tests passed including accessibility checks.
Deployed to: https://recruiting-compass-staging.vercel.app
```

### Failure

```
❌ Pipeline Failed
Repository: recruiting-compass-web
Branch: feature/my-feature
Commit: xyz9876...
Author: @chris

Automated Accessibility Tests FAILED
- Found 2 violations on login page
- Found 1 violation on dashboard

View Details: [GitHub Actions Link]
```

---

## Customization

### Allowed Violations (False Positives)

If a violation is a false positive:

```javascript
// tests/a11y/axe-test.js
const ALLOWED_VIOLATIONS = [
  "color-contrast", // False positive: contrast verified manually
  "aria-required-parent", // Intentional: custom widget
];
```

Then re-run tests:

```bash
npm run test:a11y
```

### Changing Test Pages

Edit `tests/a11y/axe-test.js`:

```javascript
const PAGES_TO_TEST = [
  {
    name: "Home Page",
    url: "/",
    wcagLevel: "wcag2aa",
  },
  {
    name: "About Page",
    url: "/about",
    wcagLevel: "wcag2aa",
  },
];
```

### Adjusting Standards

Change from AA to AAA:

```javascript
// In PAGES_TO_TEST
{
  name: "Login Page",
  url: "/login",
  wcagLevel: "wcag2aaa",  // More strict
}
```

---

## Troubleshooting

### Tests Timeout in CI

**Symptom:**

```
❌ ERROR: Page load timeout for /login
```

**Cause:** Dev server slow to start or network issues

**Fix:**

```yaml
# In .github/workflows/test.yml
- name: Wait for server
  run: |
    for i in {1..60}; do  # Increase from 30 to 60
      if curl -s http://localhost:3000 > /dev/null; then
        exit 0
      fi
      sleep 2
    done
```

### Tests Fail Locally but Pass in CI

**Symptom:**

```
npm run test:a11y fails locally
But GitHub Actions shows pass
```

**Cause:** Different page state or environment differences

**Fix:**

```bash
# Ensure dev server is running
npm run dev

# In another terminal
npm run test:a11y

# Check that BASE_URL matches
echo $BASE_URL  # Should be http://localhost:3000
```

### Artifacts Not Generated

**Symptom:**

```
No accessibility-report artifact in GitHub Actions
```

**Cause:** Test failed before report generated

**Fix:** Check console output for errors and fix issues

---

## Performance Impact

### CI/CD Time Impact

Adding accessibility tests adds **~2 minutes** to pipeline:

```
Before:
- Quality checks: 1 min
- Unit tests: 2 min
- Total: 3 min

After:
- Quality checks: 1 min
- Unit tests: 2 min (parallel)
- Accessibility: 2 min (parallel)
- Total: 3 min (no additional time)
```

Tests run **in parallel**, so no pipeline slowdown! ✅

### Local Development Impact

Running tests locally:

```bash
npm run test:a11y
# Takes ~10-15 seconds

npm run test:a11y:pa11y
# Takes ~30-45 seconds
```

Fast enough for pre-commit checks. ✅

---

## Best Practices

### 1. Run Tests Before Pushing

```bash
# Before each push
npm run test:a11y

# If violations found, fix immediately
# Then push
```

### 2. Fix Violations Quickly

Don't accumulate accessibility debt. Fix issues in same PR where introduced.

### 3. Add Pages When Creating Features

When you add new pages/forms:

```javascript
// Add to PAGES_TO_TEST in axe-test.js
{
  name: "New Feature Page",
  url: "/new-feature",
  wcagLevel: "wcag2aa",
}
```

### 4. Manual Testing Required

Automated tools catch ~50% of issues. Always do manual testing:

```bash
# 1. Keyboard navigation
# 2. Screen reader testing (NVDA/JAWS/VoiceOver)
# 3. Color blindness simulation
# 4. Touch target size checking
```

See [Accessibility Testing Checklist](ACCESSIBILITY_TESTING_CHECKLIST.md) for full manual testing guide.

### 5. Keep False Positive List Small

Only allow violations that are truly false positives. Keep standards high.

---

## Maintenance

### Monthly Review

- Check if any new pages should be tested
- Review past violations for patterns
- Update documentation if standards change

### Dependency Updates

```bash
# Check for updates
npm outdated | grep -E '(axe-core|pa11y)'

# Update if available
npm update axe-core @axe-core/playwright pa11y pa11y-ci
```

### Audit Rules

Periodically review which rules are enabled:

```javascript
// tests/a11y/axe-test.js
.withTags(['wcag2aa'])  // Current rules

// Could also use:
.withRules(['color-contrast', 'label', 'aria-required-parent'])
```

---

## Integration with GitHub Issues

When accessibility violations block deployment:

1. **Create GitHub Issue**

   ```
   Title: Fix accessibility violations blocking deploy
   Labels: accessibility, bug
   Milestone: Next Sprint
   ```

2. **Link to Report**

   ```
   Artifacts → accessibility-report.json
   ```

3. **Assign to Team**

   ```
   Assign to accessibility champion
   ```

4. **Track Progress**
   ```
   Add to GitHub Project board
   ```

---

## Resources

### Documentation

- [Accessibility Testing Guide](tests/a11y/README.md)
- [Accessibility Testing Checklist](ACCESSIBILITY_TESTING_CHECKLIST.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools

- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [pa11y](https://pa11y.org/)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)

### Learning

- [WebAIM](https://webaim.org/)
- [Deque University](https://dequeuniversity.com/)
- [A11y Project](https://www.a11yproject.com/)

---

## Support

### Questions?

Check the [tests/a11y/README.md](../tests/a11y/README.md) for detailed testing documentation.

### Found an Issue?

1. Run tests locally to reproduce
2. Check [Troubleshooting](#troubleshooting) section
3. Create GitHub Issue with:
   - Error message
   - Steps to reproduce
   - Expected behavior
   - accessibility-report.json if available

---

**Version:** 1.0
**Last Updated:** February 6, 2026
**Status:** Active & Maintained
