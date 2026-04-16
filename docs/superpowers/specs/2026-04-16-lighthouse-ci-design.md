# Lighthouse CI — Performance Monitoring Design

**Date:** 2026-04-16
**Status:** Approved
**Ticket:** Performance Monitoring (Lighthouse CI) — catch regressions, track Core Web Vitals

---

## Goal

Detect performance regressions before they reach production by running Lighthouse against the staging deployment on every push to `develop`. Complement synthetic CI audits with real-user Core Web Vitals data via Vercel Speed Insights.

---

## Approach

- **Option A (primary):** `@lhci/cli` + GitHub Artifacts + Slack reporting — no external server, informational in Phase 1, blocking in Phase 2
- **Option C (bonus):** Vercel Speed Insights for real-user field data in production

---

## Phase 1: Informational (implement now)

### CI Architecture

New `lighthouse` job added to `.github/workflows/test.yml`, running in parallel with `staging-smoke-e2e` after `deploy-staging`. Only fires on pushes to `develop`.

```
quality → test → deploy-staging → [staging-smoke-e2e, lighthouse]  (parallel)
```

The job is `continue-on-error: true` — scores are reported but never block the pipeline.

**Job steps:**
1. Install `@lhci/cli` and Chromium
2. Run `scripts/lhci-auth.js` — puppeteer script that logs into staging with CI credentials, saves cookies to a temp file
3. Run `lhci collect` against all 5 URLs, passing the auth cookie file for protected routes
4. Run `lhci upload --target=filesystem` to save JSON + HTML reports locally
5. Run `scripts/lhci-slack-report.js` — parse JSON, post Slack summary
6. Upload HTML reports as a GitHub artifact (7-day retention)

### New Files

| File | Purpose |
|------|---------|
| `lighthouserc.js` | LHCI config — URLs, Chromium flags, assertion stubs |
| `scripts/lhci-auth.js` | Puppeteer login script (~25 lines), saves cookies to temp file |
| `scripts/lhci-slack-report.js` | Parses LHCI JSON manifests, posts formatted Slack message |

### Pages Audited

| URL | Auth | Rationale |
|-----|------|-----------|
| `/login` | No | Public entry point, SSR-rendered |
| `/p/[slug]` | No | Public player profile, image-heavy; slug derived from CI account login response |
| `/dashboard` | Yes | Most-used authenticated page |
| `/schools` | Yes | Data-heavy list view, most likely to regress at scale |
| `/coaches` | Yes | Same pattern as schools |

Auth strategy: puppeteer script logs in once, saves session cookies. LHCI reuses cookies for the three authenticated routes. Public routes audited without auth.

CI test account: dedicated staging account with seeded schools and coaches data. Credentials stored as GitHub secrets `LHCI_CI_EMAIL` and `LHCI_CI_PASSWORD`.

### Slack Report Format

One message per CI run (not per page). Uses emoji color indicators since Slack incoming webhooks don't support block kit color bars directly.

```
Lighthouse CI — staging/abc1234
/login          Perf: 94  A11y: 98  BP: 100  SEO: 92
/p/testslug     Perf: 88  A11y: 96  BP: 100  SEO: 90
/dashboard      Perf: 76  A11y: 94  BP:  95  SEO: n/a
/schools        Perf: 71  A11y: 94  BP:  95  SEO: n/a
/coaches        Perf: 73  A11y: 93  BP:  95  SEO: n/a

Full reports → [GitHub Actions Run #12345]
```

Score coloring: 🟢 ≥90 / 🟡 75–89 / 🔴 <75

`lhci-slack-report.js` accepts an optional prior-run JSON for delta reporting (`+3`, `-8`) — stubbed for Phase 2.

### New GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `LHCI_CI_EMAIL` | Dedicated staging CI test account email |
| `LHCI_CI_PASSWORD` | Dedicated staging CI test account password |

---

## Phase 2: Regression Blocking (future)

When 2–3 weeks of baseline data is available and thresholds are understood:

1. Remove `continue-on-error: true` from the `lighthouse` CI job
2. Add assertions to `lighthouserc.js`:

```js
assert: {
  assertions: {
    "categories:performance":   ["warn",  { minScore: 0.75 }],
    "categories:accessibility": ["error", { minScore: 0.90 }],
    "categories:best-practices":["warn",  { minScore: 0.90 }],
  }
}
```

Accessibility is an immediate hard fail — regressions there are never acceptable. Performance and Best Practices start as warnings, tightened as confidence in baselines grows.

Optionally add delta Slack reporting by persisting the previous run's JSON as a GitHub Actions cache artifact.

---

## Vercel Speed Insights (Option C — bonus)

Real-user Core Web Vitals from production users. Complements synthetic LHCI runs.

**Setup:**
1. `npm install @vercel/speed-insights`
2. Add `<SpeedInsights />` to `app.vue` or root layout
3. Enable Speed Insights toggle in Vercel project dashboard

Data visible in Vercel dashboard: per-page LCP, INP, CLS, FCP, TTFB segmented by device and geography. Only fires in production and preview deployments — not staging CI runs. Estimated setup time: 15 minutes.

---

## What Is Not In Scope

- Self-hosted LHCI server (no infrastructure to maintain; revisit if historical trend dashboards become valuable)
- Lighthouse on PRs to `develop` (PRs don't deploy to staging today; would require a separate preview deploy step)
- Auditing detail/profile pages beyond the public player profile (covered by the list + dashboard pattern)
