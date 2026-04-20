# Lighthouse CI — Performance Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Lighthouse CI to the staging deploy pipeline to detect performance regressions before they reach production, plus wire in Vercel Speed Insights for real-user Core Web Vitals data.

**Architecture:** A new `lighthouse` job in `test.yml` runs after `deploy-staging` (parallel with `staging-smoke-e2e`) on every push to `develop`. It audits 5 URLs using `@lhci/cli` — a puppeteer script handles login for the 3 authenticated pages. Results are posted to Slack and uploaded as GitHub artifacts. `@vercel/speed-insights` (already in `package.json`) is wired into `app.vue` for real-user field data. Everything is `continue-on-error: true` in Phase 1 — informational only, nothing fails the build.

**Tech Stack:** `@lhci/cli`, Vitest, `@vercel/speed-insights` (already installed), GitHub Actions

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lighthouserc.cjs` | Create | LHCI config: URLs from env vars, Chrome flags, filesystem upload target |
| `scripts/lhci-auth.cjs` | Create | Puppeteer auth script — skips public routes, logs in for protected pages |
| `scripts/lhci-slack-report.js` | Create | ESM script: parses LHCI manifest JSON, formats and posts Slack summary |
| `tests/unit/scripts/lhci-slack-report.test.mjs` | Create | Vitest tests for score formatting and Slack payload builder |
| `package.json` | Modify | Add `@lhci/cli` as devDependency |
| `.github/workflows/test.yml` | Modify | Add `lighthouse` job after `deploy-staging` |
| `app.vue` | Modify | Import and render `<SpeedInsights />` |

**Note on `.cjs` extension:** The project uses `"type": "module"` (ESM), so `.js` files are treated as ES modules. `lighthouserc.cjs` and `scripts/lhci-auth.cjs` use `.cjs` so Node treats them as CommonJS — required by LHCI's config loader and puppeteer script runner respectively.

---

### Task 1: Install @lhci/cli

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install --save-dev @lhci/cli
```

- [ ] **Step 2: Verify installation**

```bash
npx lhci --version
```

Expected: prints a semver string like `0.14.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @lhci/cli for performance CI"
```

---

### Task 2: Create lighthouserc.cjs

**Files:**
- Create: `lighthouserc.cjs`

LHCI reads this config for both `lhci collect` and `lhci upload`. URLs are constructed from environment variables so the same config works locally (point at staging manually) and in CI (staging URL injected by the deploy job).

- [ ] **Step 1: Create the config**

```js
// lighthouserc.cjs
'use strict';

const BASE_URL = process.env.LHCI_BASE_URL;
const PROFILE_SLUG = process.env.LHCI_PROFILE_SLUG;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      puppeteerScript: './scripts/lhci-auth.cjs',
      url: [
        `${BASE_URL}/login`,
        `${BASE_URL}/p/${PROFILE_SLUG}`,
        `${BASE_URL}/dashboard`,
        `${BASE_URL}/schools`,
        `${BASE_URL}/coaches`,
      ],
      settings: {
        // Required for Chrome in CI / Docker environments
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
```

- [ ] **Step 2: Verify config is parseable**

```bash
LHCI_BASE_URL=https://example.com LHCI_PROFILE_SLUG=test node -e "const c = require('./lighthouserc.cjs'); console.log(JSON.stringify(c, null, 2))"
```

Expected: JSON output with 5 URLs under `ci.collect.url`.

- [ ] **Step 3: Add .lighthouseci to .gitignore**

Open `.gitignore` and add:
```
# Lighthouse CI reports (generated in CI, uploaded as artifacts)
.lighthouseci/
```

- [ ] **Step 4: Commit**

```bash
git add lighthouserc.cjs .gitignore
git commit -m "chore: add Lighthouse CI config"
```

---

### Task 3: Create scripts/lhci-auth.cjs

**Files:**
- Create: `scripts/lhci-auth.cjs`

LHCI calls this function before auditing each URL. It receives the already-launched browser instance — no puppeteer import needed. The script skips auth for public routes (`/login`, `/p/`). For protected routes it checks if already authenticated first to avoid redundant logins across the 3 runs.

Login form selectors (from `components/Auth/LoginForm.vue`):
- Email field: `#email`
- Password field: `#password`
- Submit button: `[data-testid="login-button"]`

- [ ] **Step 1: Create the script**

```js
// scripts/lhci-auth.cjs
'use strict';

/**
 * LHCI puppeteer script — authenticates before auditing protected pages.
 * Called by LHCI before each URL. The browser argument is LHCI's own
 * Chromium instance; do not import puppeteer here.
 *
 * @param {import('puppeteer').Browser} browser
 * @param {{ url: string }} context
 */
module.exports = async (browser, context) => {
  const url = new URL(context.url);

  // Skip auth for public routes — login page and public player profiles
  const publicPrefixes = ['/login', '/p/'];
  if (publicPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  const page = await browser.newPage();

  // Check if already authenticated: navigate to the target and see if
  // we land on it (authenticated) or get redirected to /login (not authenticated).
  await page.goto(context.url, { waitUntil: 'domcontentloaded' });

  if (!page.url().includes('/login')) {
    // Session cookies are still active — no login needed
    await page.close();
    return;
  }

  // Not authenticated — perform login
  await page.goto(`${url.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 10_000 });
  await page.type('#email', process.env.LHCI_CI_EMAIL ?? '');
  await page.type('#password', process.env.LHCI_CI_PASSWORD ?? '');
  await page.click('[data-testid="login-button"]');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.close();
};
```

- [ ] **Step 2: Verify Node can load the file**

```bash
node -e "const fn = require('./scripts/lhci-auth.cjs'); console.log(typeof fn)"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add scripts/lhci-auth.cjs
git commit -m "feat: add LHCI puppeteer auth script for protected pages"
```

---

### Task 4: Create lhci-slack-report.js (TDD)

**Files:**
- Create: `scripts/lhci-slack-report.js`
- Create: `tests/unit/scripts/lhci-slack-report.test.mjs`

The script parses `.lighthouseci/manifest.json` (written by `lhci upload`), filters to the representative run per URL, formats a Slack message, and posts it. Formatting functions are exported for unit testing.

LHCI manifest entry shape:
```json
{
  "url": "https://staging.vercel.app/dashboard",
  "isRepresentativeRun": true,
  "htmlPath": "./.lighthouseci/dashboard-0.report.html",
  "jsonPath": "./.lighthouseci/dashboard-0.report.json",
  "summary": {
    "performance": 0.76,
    "accessibility": 0.94,
    "best-practices": 0.95,
    "seo": 0.9
  }
}
```

Scores in `summary` are decimals (0–1). Multiply by 100 for display.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/scripts/lhci-slack-report.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { getScoreEmoji, formatRow, buildSlackPayload } from '../../../scripts/lhci-slack-report.js';

describe('getScoreEmoji', () => {
  it('returns green for scores >= 90', () => {
    expect(getScoreEmoji(90)).toBe('🟢');
    expect(getScoreEmoji(100)).toBe('🟢');
  });

  it('returns yellow for scores 75–89', () => {
    expect(getScoreEmoji(75)).toBe('🟡');
    expect(getScoreEmoji(89)).toBe('🟡');
  });

  it('returns red for scores below 75', () => {
    expect(getScoreEmoji(74)).toBe('🔴');
    expect(getScoreEmoji(0)).toBe('🔴');
  });
});

describe('formatRow', () => {
  it('formats a row with all four categories', () => {
    const summary = { performance: 0.94, accessibility: 0.98, 'best-practices': 1.0, seo: 0.92 };
    const row = formatRow('https://staging.example.com/login', summary);
    expect(row).toContain('/login');
    expect(row).toContain('94');
    expect(row).toContain('98');
    expect(row).toContain('100');
    expect(row).toContain('92');
  });

  it('shows n/a for missing seo score', () => {
    const summary = { performance: 0.76, accessibility: 0.94, 'best-practices': 0.95 };
    const row = formatRow('https://staging.example.com/dashboard', summary);
    expect(row).toContain('n/a');
    expect(row).not.toContain('undefined');
  });

  it('uses the pathname not the full URL', () => {
    const summary = { performance: 0.8, accessibility: 0.9, 'best-practices': 0.9, seo: 0.85 };
    const row = formatRow('https://staging.example.com/schools', summary);
    expect(row).toContain('/schools');
    expect(row).not.toContain('https://');
  });
});

describe('buildSlackPayload', () => {
  const entries = [
    {
      url: 'https://staging.example.com/login',
      summary: { performance: 0.94, accessibility: 0.98, 'best-practices': 1.0, seo: 0.92 },
    },
    {
      url: 'https://staging.example.com/dashboard',
      summary: { performance: 0.76, accessibility: 0.94, 'best-practices': 0.95 },
    },
  ];

  it('includes the short SHA in the header', () => {
    const payload = buildSlackPayload(entries, 'abc1234567890', 'https://github.com/run/1');
    expect(payload.text).toContain('abc1234');
  });

  it('includes a link to the GitHub Actions run', () => {
    const payload = buildSlackPayload(entries, 'abc1234567890', 'https://github.com/run/1');
    const bodyText = JSON.stringify(payload.blocks);
    expect(bodyText).toContain('https://github.com/run/1');
  });

  it('returns a valid Slack blocks payload shape', () => {
    const payload = buildSlackPayload(entries, 'abc1234567890', 'https://github.com/run/1');
    expect(payload).toHaveProperty('text');
    expect(payload).toHaveProperty('blocks');
    expect(Array.isArray(payload.blocks)).toBe(true);
    expect(payload.blocks.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/unit/scripts/lhci-slack-report.test.mjs
```

Expected: FAIL — `Cannot find module '../../../scripts/lhci-slack-report.js'`

- [ ] **Step 3: Implement lhci-slack-report.js**

Create `scripts/lhci-slack-report.js`:

```js
// scripts/lhci-slack-report.js
import fs from 'fs';
import https from 'https';
import path from 'path';

/**
 * @param {number} score  0–100 integer
 * @returns {string}
 */
export function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 75) return '🟡';
  return '🔴';
}

/**
 * @param {string} url  Full URL (e.g. https://staging.vercel.app/dashboard)
 * @param {Record<string, number>} summary  LHCI summary values (0–1 decimals)
 * @returns {string}
 */
export function formatRow(url, summary) {
  const pathname = new URL(url).pathname;
  const perf = Math.round((summary['performance'] ?? 0) * 100);
  const a11y = Math.round((summary['accessibility'] ?? 0) * 100);
  const bp = Math.round((summary['best-practices'] ?? 0) * 100);
  const seo = summary['seo'] != null ? Math.round(summary['seo'] * 100) : null;

  const seoStr = seo != null ? `${getScoreEmoji(seo)} ${seo}` : 'n/a';

  return (
    `\`${pathname.padEnd(20)}\`` +
    `  Perf: ${getScoreEmoji(perf)} ${String(perf).padStart(3)}` +
    `  A11y: ${getScoreEmoji(a11y)} ${String(a11y).padStart(3)}` +
    `  BP: ${getScoreEmoji(bp)} ${String(bp).padStart(3)}` +
    `  SEO: ${seoStr}`
  );
}

/**
 * @param {Array<{url: string, summary: Record<string, number>}>} entries
 * @param {string} commitSha
 * @param {string} runUrl
 * @returns {{ text: string, blocks: object[] }}
 */
export function buildSlackPayload(entries, commitSha, runUrl) {
  const shortSha = commitSha.slice(0, 7);
  const rows = entries.map((e) => formatRow(e.url, e.summary)).join('\n');

  return {
    text: `Lighthouse CI — staging/${shortSha}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Lighthouse CI — staging/${shortSha}*\n\`\`\`\n${rows}\n\`\`\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${runUrl}|Full reports →>`,
        },
      },
    ],
  };
}

/**
 * @param {string} webhookUrl
 * @param {object} payload
 * @returns {Promise<void>}
 */
function postToSlack(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`Slack webhook returned HTTP ${res.statusCode}`));
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Only run main() when executed directly (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const manifestPath = path.join('.lighthouseci', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const representative = manifest.filter((e) => e.isRepresentativeRun);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not set — skipping Slack notification');
    process.exit(0);
  }

  const commitSha = process.env.GITHUB_SHA ?? 'unknown';
  const runUrl = [
    process.env.GITHUB_SERVER_URL,
    process.env.GITHUB_REPOSITORY,
    'actions/runs',
    process.env.GITHUB_RUN_ID,
  ].join('/');

  const payload = buildSlackPayload(representative, commitSha, runUrl);
  postToSlack(webhookUrl, payload)
    .then(() => console.log('Slack notification sent'))
    .catch((err) => {
      console.error('Failed to post to Slack:', err.message);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/scripts/lhci-slack-report.test.mjs
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/lhci-slack-report.js tests/unit/scripts/lhci-slack-report.test.mjs
git commit -m "feat: add Lighthouse CI Slack report script with unit tests"
```

---

### Task 5: Add Vercel Speed Insights to app.vue

**Files:**
- Modify: `app.vue`

`@vercel/speed-insights` is already in `package.json`. This task wires the Vue component into the app root so it instruments every page. It only activates in production and Vercel preview deployments — no-op in local dev and staging CI runs.

- [ ] **Step 1: Add the import to app.vue**

Open `app.vue`. Add the import to the `<script setup>` block alongside existing imports:

```typescript
import { SpeedInsights } from '@vercel/speed-insights/vue';
```

- [ ] **Step 2: Add the component to the template**

In the `<template>`, add `<SpeedInsights />` as the last child of the root `<div>`, after `<SessionTimeoutWarning>`:

```html
<SessionTimeoutWarning
  :visible="isWarningVisible"
  :seconds-remaining="secondsUntilLogout"
  @stay-logged-in="dismissWarning"
  @logout-now="handleTimeout"
/>
<SpeedInsights />
```

- [ ] **Step 3: Verify type-check passes**

```bash
npm run type-check
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add app.vue
git commit -m "feat: add Vercel Speed Insights for real-user Core Web Vitals"
```

---

### Task 6: Add lighthouse CI job to test.yml

**Files:**
- Modify: `.github/workflows/test.yml`

The new job runs in parallel with `staging-smoke-e2e` after `deploy-staging`. It uses `continue-on-error: true` so scores are reported without ever failing the pipeline (Phase 1 — informational only).

**New GitHub secrets required before this job will work** (set in GitHub → Settings → Secrets and variables → Actions):
- `LHCI_CI_EMAIL` — email address of the dedicated staging test account
- `LHCI_CI_PASSWORD` — password for the staging test account
- `LHCI_PROFILE_SLUG` — the `hash_slug` or `vanity_slug` of the test account's player profile (used for the `/p/[slug]` audit URL)

- [ ] **Step 1: Add the lighthouse job to test.yml**

Open `.github/workflows/test.yml`. After the `staging-smoke-e2e` job (around line 175), add this new job:

```yaml
  # Step 5: Lighthouse CI against the live staging URL
  lighthouse:
    name: Lighthouse CI
    needs: deploy-staging
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    continue-on-error: true
    permissions:
      contents: read
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Verify Chrome is available
        run: google-chrome-stable --version

      - name: Run Lighthouse CI collect
        run: npx lhci collect --config=lighthouserc.cjs
        env:
          LHCI_BASE_URL: ${{ needs.deploy-staging.outputs.deployment-url }}
          LHCI_CI_EMAIL: ${{ secrets.LHCI_CI_EMAIL }}
          LHCI_CI_PASSWORD: ${{ secrets.LHCI_CI_PASSWORD }}
          LHCI_PROFILE_SLUG: ${{ secrets.LHCI_PROFILE_SLUG }}

      - name: Run Lighthouse CI upload
        run: npx lhci upload --config=lighthouserc.cjs

      - name: Post Slack report
        run: node scripts/lhci-slack-report.js
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          GITHUB_SHA: ${{ github.sha }}
          GITHUB_SERVER_URL: ${{ github.server_url }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          GITHUB_RUN_ID: ${{ github.run_id }}

      - name: Upload HTML reports as artifact
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-reports-${{ github.sha }}
          path: .lighthouseci/
          retention-days: 7
```

- [ ] **Step 2: Update the notify-failure job to exclude lighthouse from required needs**

The existing `notify-failure` job references `needs: [quality, test, deploy-staging, staging-smoke-e2e]`. The `lighthouse` job uses `continue-on-error: true` so it never causes a pipeline failure — no changes needed to the notify jobs.

- [ ] **Step 3: Verify the YAML parses correctly**

```bash
npx js-yaml .github/workflows/test.yml > /dev/null && echo "YAML OK"
```

Expected: `YAML OK`

If `js-yaml` is not available:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))" && echo "YAML OK"
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "feat: add Lighthouse CI job to staging pipeline"
```

---

### Task 7: Add GitHub secrets and verify end-to-end

This task is manual setup + verification. No code changes.

- [ ] **Step 1: Add the three new secrets in GitHub**

Go to: `https://github.com/<org>/<repo>/settings/secrets/actions`

Add:
- `LHCI_CI_EMAIL` — email of the dedicated staging CI test account
- `LHCI_CI_PASSWORD` — password for that account
- `LHCI_PROFILE_SLUG` — the profile's `hash_slug` (find it by logging into staging as the CI account and copying the slug from the URL at `/p/<slug>`)

- [ ] **Step 2: Push the branch to trigger the pipeline**

```bash
git push origin develop
```

- [ ] **Step 3: Monitor the lighthouse job**

In GitHub Actions, watch the `lighthouse` job. Expected flow:
1. `Install dependencies` — ~60s
2. `Install Chrome` — ~30s
3. `Run Lighthouse CI collect` — ~3–5 min (5 URLs × 1 run each)
4. `Run Lighthouse CI upload` — <5s
5. `Post Slack report` — <5s
6. `Upload HTML reports as artifact` — <10s

- [ ] **Step 4: Verify Slack message arrives**

Check your Slack channel. Expected format:
```
Lighthouse CI — staging/abc1234
`/login              `  Perf: 🟢  94  A11y: 🟢  98  BP: 🟢 100  SEO: 🟢  92
`/p/testslug         `  Perf: 🟢  88  A11y: 🟢  96  BP: 🟢 100  SEO: 🟢  90
`/dashboard          `  Perf: 🟡  76  A11y: 🟢  94  BP: 🟡  95  SEO: n/a
`/schools            `  Perf: 🟡  71  A11y: 🟢  94  BP: 🟡  95  SEO: n/a
`/coaches            `  Perf: 🟡  73  A11y: 🟢  93  BP: 🟡  95  SEO: n/a

Full reports →
```

- [ ] **Step 5: Download and open a Lighthouse HTML report**

In the GitHub Actions run → Artifacts → `lighthouse-reports-<sha>` → download the ZIP. Open any `.report.html` in a browser. Verify it shows the full Lighthouse breakdown for that page.

---

## Phase 2 Upgrade (future — do not implement now)

When 2–3 weeks of baseline data is available, enable regression blocking:

1. Remove `continue-on-error: true` from the `lighthouse` job in `test.yml`
2. Add assertions to `lighthouserc.cjs`:

```js
assert: {
  assertions: {
    'categories:performance':    ['warn',  { minScore: 0.75 }],
    'categories:accessibility':  ['error', { minScore: 0.90 }],
    'categories:best-practices': ['warn',  { minScore: 0.90 }],
  },
},
```

Accessibility is a hard fail immediately. Tighten performance thresholds once you have confidence in the baselines.
