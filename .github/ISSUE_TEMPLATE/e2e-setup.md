---
name: E2E test environment / setup
about: Request: Complete Playwright E2E setup, CI job, and troubleshooting checklist
title: "E2E: Setup Playwright environment + CI job"
labels: testing, e2e, infra
assignees: ''
---

## Summary

Set up and verify Playwright E2E tests for the app, ensure CI runs them reliably, and document troubleshooting steps.

## Motivation

We ran local E2E tests but encountered missing browser binaries and intermittent webServer lifecycle issues. This ticket tracks completing installation, CI integration, and a short test-failure troubleshooting guide.

## Acceptance criteria

- [ ] Playwright browsers installed via `npx playwright install` in local dev docs and CI cache configuration
- [ ] `playwright.local.config.ts` committed (uses existing dev server) and documented
- [ ] CI workflow added: `ci/e2e.yml` or add E2E job to existing pipeline that:
  - Starts the app (or uses preview artifact)
  - Runs `npx playwright install --with-deps` (or uses cached browsers)
  - Runs `npx playwright test --project=chromium --reporter=dot`
  - Uploads Playwright HTML report as artifact
- [ ] Documentation updated in `DEPRECATION_AUDIT.md` or `PHASE_4_E2E_CHECKLIST.md` with local test steps
- [ ] Common failures documented and triaged (missing browsers, port binding, test flakiness)

## Local reproduction steps

1. Start dev server (port 3003):

```bash
npm run dev -- --port 3003
```

2. Install browsers (if not installed):

```bash
npx playwright install
```

3. Run Chromium E2E using local config (uses running server):

```bash
npx playwright test --config=playwright.local.config.ts --project=chromium --reporter=list
```

## CI considerations

- Cache Playwright browser artifacts between runs to avoid repeated downloads.
- Use `reuseExistingServer: false` in CI (letting CI start server), or use preview artifact if using static hosting.
- Set `retries: 2` in CI for flaky tests and `trace: on-first-retry` to capture traces.

## Troubleshooting checklist

- Missing browser binaries → run `npx playwright install` locally and add install to CI.
- `webServer` exiting early → use `playwright.local.config.ts` to reuse a running server, or extend `timeout` and ensure server logs show ready before tests begin.
- Port conflicts → ensure CI uses `PORT=3003` or updates `playwright.config.ts` `baseURL`.
- Large test suite → run a smoke subset in PR checks, full suite in nightly runs.

## Notes / Links

- Local helper config: `playwright.local.config.ts` (committed)
- Existing CI: review `.github/workflows/` for where to add job
- Dev server logs: check terminal where `npm run dev` runs for readiness

