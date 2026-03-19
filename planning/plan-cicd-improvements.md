# Plan: CI/CD Pipeline Improvements

**Date:** 2026-03-19
**Branch:** develop
**Status:** DRAFT — awaiting approval

---

## Context

After reviewing the CI/CD diagram against the actual workflow files, several gaps exist between intent and implementation. The smoke test was already present in `deploy-prod.yml` (diagram was simplified). This plan addresses the real gaps.

---

## Changes Required

### 1. Raise coverage gate: 75% → 80%
**File:** `.github/workflows/test.yml`
**Change:** `COVERAGE_THRESHOLD: 75` → `COVERAGE_THRESHOLD: 80`
**Why:** CLAUDE.md standard is 80%+. CI currently lets work through that fails our own bar.
**Risk:** Low. If current coverage is between 75–79%, this will cause a CI failure that exposes real gaps.

---

### 2. Fix license check (remove silent `|| true`)
**File:** `.github/workflows/security.yml` line 201
**Change:** Remove `|| true` from the `npx license-checker` command
**Why:** The check currently *always passes* regardless of what it finds — it's theater, not enforcement.
**Risk:** Low-medium. First run may surface existing GPL/unknown licenses that need resolution before this lands.
**Pre-work:** Run `npx license-checker --summary --production --onlyAllow "MIT;ISC;BSD;Apache;Apache-2.0;0BSD;BSD-2-Clause;BSD-3-Clause;CC0-1.0;Unlicense"` locally first to confirm zero violations before removing `|| true`.

---

### 3. Add WebKit (Safari) to E2E tests
**File:** `.github/workflows/e2e.yml`
**Change:**
```yaml
# Before
run: npx playwright install --with-deps chromium

# After
run: npx playwright install --with-deps chromium webkit
```
And split into a matrix or add a second run step for webkit.
**Why:** Target users are student athletes and families — heavy Safari/iOS users.
**Risk:** Medium. WebKit may reveal CSS/interaction issues. Initial run will likely surface failures to fix.
**Note:** Webkit adds ~2–3 min to E2E job. Consider running webkit as `continue-on-error: true` initially, then harden once failures are resolved.

---

### 4. Run E2E against staging after deploy
**File:** `.github/workflows/test.yml`
**Change:** Add a `staging-e2e` job after `deploy-staging` that runs a smoke subset of Playwright tests against the live staging URL.
**Why:** Staging is deployed on every `develop` push but never validated. Issues sit in staging until a PR opens.
**Implementation:**
```yaml
staging-e2e:
  name: Staging Smoke E2E
  needs: deploy-staging
  if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - name: Run smoke E2E against staging URL
      run: npx playwright test --grep @smoke
      env:
        BASE_URL: ${{ needs.deploy-staging.outputs.deployment-url }}
        NUXT_PUBLIC_SUPABASE_URL: ${{ secrets.NUXT_PUBLIC_SUPABASE_URL }}
        NUXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NUXT_PUBLIC_SUPABASE_ANON_KEY }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        CI: true
```
**Pre-work needed:** Tag a `@smoke` subset of Playwright tests (login flow, dashboard load, key CRUD operations) so staging E2E completes in <5 min. Full E2E stays as the PR gate.
**Also needed:** `deploy-staging` job must expose `deployment-url` as a job output (currently stored only in step output, not promoted to job output).

---

### 5. Add auto-rollback when smoke test fails
**File:** `.github/workflows/deploy-prod.yml`
**Change:** Add a `rollback` job that runs `if: needs.smoke-test.result == 'failure'`
**Why:** Currently smoke test creates a GitHub issue but the bad deploy stays live.
**Implementation:**
```yaml
rollback:
  name: Auto-Rollback on Smoke Failure
  needs: smoke-test
  if: failure() && needs.smoke-test.result == 'failure'
  runs-on: ubuntu-latest
  steps:
    - name: Rollback to previous production deployment
      run: vercel rollback --token="${{ secrets.VERCEL_TOKEN }}" --yes
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}

    - name: Notify Slack - Rollback executed
      uses: slackapi/slack-github-action@v3
      with:
        webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
        webhook-type: incoming-webhook
        payload: |
          {
            "text": "⏪ Production auto-rolled back after smoke test failure",
            "blocks": [{
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "*⏪ Auto-Rollback Executed*\nSmoke test failed — rolled back to previous deployment.\n*Commit:* ${{ github.sha }}\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>"
              }
            }]
          }
```
**Risk:** Low. `vercel rollback` without a target rolls back to the immediately prior production deployment, which is safe.

---

### 6. Document Supabase migration process
**Not a workflow change** — migrations are applied manually via `npx supabase db push` and cannot be automated without a staging DB separate from production.
**Action:** Add a step comment in `deploy-prod.yml` pre-deploy-checks referencing the migration runbook. Add to `CLAUDE.local.md` that migrations must be manually applied before triggering production deploy.

---

### 7. Update the CI/CD diagram
**File:** `/Users/chrisandrikanich/.agent/diagrams/cicd-pipeline.html`
**Changes:**
- Add smoke test step to Lane 3 (it exists but wasn't shown)
- Add rollback step below smoke test (on failure path)
- Add `staging-e2e` step to Lane 1 (after deploy-staging)
- Update coverage gate label: `≥ 75%` → `≥ 80%`
- Add WebKit badge to E2E job in Lane 2
- Fix license check to show it as an enforced gate (not `|| true`)

---

## Execution Order

| Step | File | Risk | Pre-work? |
|------|------|------|-----------|
| 1. Coverage gate 75→80 | `test.yml` | Low | Run tests locally, confirm >80% |
| 2. Fix license `\|\| true` | `security.yml` | Low-med | Run checker locally first |
| 3. Add rollback job | `deploy-prod.yml` | Low | None |
| 4. Add WebKit to E2E | `e2e.yml` | Medium | None (use `continue-on-error: true` initially) |
| 5. Expose staging URL as job output | `test.yml` | Low | None |
| 6. Tag @smoke E2E tests | test files | Low | Identify 3–5 tests to tag |
| 7. Add staging-e2e job | `test.yml` | Medium | Requires steps 5+6 first |
| 8. Update diagram | `.html` | None | Do last, reflects all changes |
| 9. Document migration process | `CLAUDE.local.md` | None | None |

---

## Unresolved Questions

1. **Coverage at 80%?** — Run `npm run test:coverage` locally and confirm current coverage before changing the gate. If it's 77%, the gate change will immediately break CI.

2. **WebKit initially as `continue-on-error`?** — Confirm you want to see webkit failures reported but not blocking for the first iteration.

3. **Which E2E tests should get the `@smoke` tag?** — Suggest: login, dashboard load, view school list, view coach list. You decide.

4. **Staging DB vs prod DB** — Supabase staging and production share the same DB instance currently (confirmed by single `NUXT_PUBLIC_SUPABASE_URL`). This means staging E2E tests run against prod data. Are you OK with that, or do you want a separate staging Supabase project first?
