# E2E Skip Triage — 2026-05-27

Branch: `develop`. Origin of work: full unit + e2e run after merging `chore/deps-cleanup`.

## TL;DR

- **Unit:** 3 real regressions from the heroicons→UIcon migration, fixed and verified green (7627/7627). Commit `b809e680`.
- **E2E:** 303 pass / 80 fail / 63 skip / 43 did-not-run. The **80 failures are NOT caused by this branch** — root cause is the seed/auth infra (see below), proven by zero import/500 errors and the one public no-seed icon test passing.
- **Skips:** 90 total `.skip` = **24 static** (disabled tests) + **35 conditional** `!seedReady` guards (healthy — leave) + broad-match noise.
- **This session retired buckets D + A** (commit `1e9927ed`). **B + C remain** — both gated on infra, detailed below.

## Why the 80 e2e failures are environmental, not a regression

- Log marker: `⏭️  Skipping full database seed (set E2E_SEED=true to seed)`
- `beforeAll setup failed: locator.waitFor Timeout` — storageState/auth capture flake
- **Zero** `ERR_MODULE_NOT_FOUND` / import / 500 errors → deps removal safe, app boots
- Failures stop at setup (`getByLabel('School status')`, login, `createSchool`) before reaching assertions
- Public no-seed test `signup-accessibility › hide decorative icons` **passes** → icon migration introduced no reachable regression

This is the documented `e2e-seed-infra-auth-flake` blocker = **CLAUDE.local.md Action Required #1**. Cannot be fixed without `E2E_SEED=true` + reliable storageState capture. Owns the bulk of the 80 failures.

## UIcon render note (root cause of the unit fixes)

`@nuxt/icon` default `mode: "css"` → `<UIcon>` renders `<span class="iconify">`, **not** `<svg>`. Any test/selector that targeted the old heroicon `<svg>` output is a latent regression. Page-wide `svg` counts still pass (nuxt/ui internals + decorative inline SVGs remain), but granular `svg.<class>` selectors break.

- Latent (currently masked by seed failures): `tests/e2e/fixtures/schools.fixture.ts:276` `arrowIcon: "svg.w-4.h-4"` — status-history arrow is now a `<span>`. Update to a non-svg selector when seed infra lands and that test becomes reachable.

## Skip buckets

| Bucket | File | Count | Status |
|---|---|---|---|
| D — flake | `schools-filtering.spec.ts` | 1 | ✅ DONE (`1e9927ed`) |
| A — verify/delete | `user-stories/dashboard-8-3.spec.ts` | 10 | ✅ DONE (`1e9927ed`) — 6 un-skipped, 2 un-skipped+guarded, 2 deleted |
| **B — seed-dependent** | `tier1-critical/user-story-6-1.spec.ts` | 9 | ⏳ REMAINS |
| **C — unreachable UI** | `tier1-critical/password-reset.spec.ts` | 4 | ⏳ REMAINS |

### Bucket B — user-story-6-1 (Parent Recruiting Stage Guidance) — 9 skips

Lines: 11, 34, 55, 78, 98, 146, 178, 208, 245. All quarantined 2026-05-22 with reason **"depends on seeded recruiting-stage data"** / "seed-dependent /timeline content".

**Action:** these are valid scenarios blocked only on data. Convert each `test.skip("...")` to a runtime conditional guard matching the existing pattern used elsewhere:

```ts
test("Scenario N: ...", async ({ page }) => {
  test.skip(!seedReady, `recruiting-stage seed unavailable: ${seedError}`);
  ...
});
```

Requires a `beforeAll` that seeds recruiting-stage/timeline data and sets `seedReady` (mirror `dashboard-8-3.spec.ts` and `parent-tasks.spec.ts` seed helpers). **Do this as part of the seed-infra project (Action Required #1), not standalone** — without the seed step the conversion just trades a static skip for a conditional skip with no coverage gain.

### Bucket C — password-reset — 4 skips

| Line | Test | Reason | Fix |
|---|---|---|---|
| 188 | should show resend button after success | success-state UI not reachable without real Supabase response | Mock the Supabase reset response (intercept `**/auth/v1/recover` or stub the composable) so the success state renders, then assert the resend button |
| 209 | should have resend cooldown | same — cooldown UI behind success state | Same mock; then assert cooldown timer/disabled state |
| 464 | should not allow password reuse of reset token | needs a real consumed reset token | Needs seeded/used token via Supabase admin — fold into seed infra |
| 550 | should show back links throughout flow | back-link selector drift | Re-audit current back-link markup, update selector, un-skip (no data needed — quick win, do first in this bucket) |

**Sequencing within C:** `550` first (selector-only, no infra). Then `188`+`209` together (one Supabase mock unlocks both). `464` last (token seeding → with B's infra work).

## Conditional `!seedReady` guards (35) — LEAVE AS-IS

`family-invite-flow`, `coaching-philosophy`, `admin/bulk-delete-users`, `notifications`, `user-story-9-1`, `parent-tasks`, etc. These run when seed data is present and skip cleanly when absent. Healthy pattern — not triage targets. They turn green automatically once the seed infra reliably populates data.

## Recommended next session

1. **Seed infrastructure project** (Action Required #1) — unblocks the 80 e2e failures, all 35 conditional guards, bucket B, and C-464 simultaneously. Highest leverage.
2. Bucket C-550 (back-link selector) — standalone quick win, do anytime.
3. Bucket C-188/209 (Supabase mock) — standalone, medium effort.
4. When seed lands: convert bucket B, fix `arrowIcon` svg→span selector.
