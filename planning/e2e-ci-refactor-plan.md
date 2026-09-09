# E2E CI Refactor Plan

**Goal:** cut E2E wall-clock time and false-positive failure emails without losing coverage that gates prod.

**Current state (measured 2026-09-09):**
- `.github/workflows/e2e.yml` gates **every PR to develop AND main** with the full 71-spec suite.
- `e2e-tests` job: single runner, 3 workers, `fullyParallel`, ~50m per the file's own comment, `timeout-minutes: 60`.
- Suite runs in 3 sequential phases via `scripts/run-e2e.sh`: main chromium (parallel) → `cross-account-logout` (sequential, global signOut poisons shared sessions) → `profile-publish-toggle` (workers=1, shared-row race on issue #635).
- `e2e-webkit` job has `needs: e2e-tests` — waits for the full ~50m run before it even starts its own ~75m budget, even though it's `continue-on-error: true` (non-blocking) and only depends on `e2e-tests` for the build artifact, not its test results.
- Only 4 specs tagged `@smoke` (all in `auth-enforcement.spec.ts`), used today only for post-deploy `staging-smoke-e2e`, not for PR gating.
- Known flaky specs already identified in memory but not quarantined: `coaching-philosophy.spec.ts:34`, `smart-inputs*.spec.ts:76`.
- Root-cause flake buckets already diagnosed but not fixed: [[e2e-cross-worker-afterall-race]], [[e2e-test-account-school-leak]].

**Non-goals for this plan:** rewriting flaky specs' internals, changing the test-account architecture (that's the separate root-cause effort in Phase 5, own plan later).

---

## Phase 1 — Decouple WebKit build from the chromium job

**Why first:** zero test-logic risk, pure YAML, removes ~50m of pure waiting off the WebKit job's start time. Every PR currently can't even start seeing a WebKit result until the chromium job finishes.

**Files:**
- Modify: `.github/workflows/e2e.yml` (`e2e-webkit` job)

**Steps:**
- [x] Give `e2e-webkit` its own build step (checkout → setup-node-deps → `npm run build` with the same `NITRO_PRESET`/Supabase env), duplicating what `e2e-tests` does instead of downloading its artifact.
- [x] Remove `needs: e2e-tests` from `e2e-webkit`. Keep `continue-on-error: true` and `if: always()` → simplify to `if: github.actor != 'dependabot[bot]'` since it no longer depends on the other job's outcome.
- [x] Drop the now-unused "Download build output" step and the `e2e-build-output` artifact upload from `e2e-tests` if nothing else consumes it (check `migrate-qa-e2e.yml` and any other workflow first — grep for `e2e-build-output`).
- [x] **Shipped PR #711, merged to develop.**

---

## Phase 2 — Shard the main chromium phase

**Why:** the single biggest wall-clock cost. `fullyParallel` + 3 workers on one runner is CPU-bound by the runner, not by test count — GitHub Actions runners are cheap and parallel jobs are the standard fix (see comparison table from prior turn).

**Constraint:** only the **main chromium phase** (phase 1 of `run-e2e.sh`) is safe to shard. `cross-account-logout` and `profile-publish-toggle` each mutate shared test-account state and must run exactly once, never concurrently with each other or with a sharded copy of themselves.

**Files:**
- Modify: `scripts/run-e2e.sh` — accept a `--shard` passthrough for phase 1 only; phases 2/3 always run unsharded, exactly once.
- Modify: `.github/workflows/e2e.yml` — turn `e2e-tests` into a 4-way matrix job for the main phase; add a new `e2e-sequential` job (unsharded) for `cross-account-logout` + `profile-publish-toggle`, running in parallel with the matrix.
- Modify: `package.json` — add `test:e2e:main` (phase 1 only, shard-aware) and `test:e2e:sequential` (phases 2+3 only) scripts so CI and local runs share the same entry points as `test:e2e`.

**Steps:**
- [x] Add `test:e2e:main` (`playwright test --project=chromium`) and `test:e2e:sequential` (`playwright test --project=cross-account-logout && playwright test --project=profile-publish-toggle --workers=1`) to `package.json`. **Deviation from plan:** left `run-e2e.sh` untouched instead of refactoring it — the two new scripts are thin CI-only wrappers, local `npm run test:e2e` behavior is unchanged, no dual-maintenance of the phase-splitting logic.
- [x] Verified `--shard` flag parses against the chromium project (`npx playwright test --project=chromium --shard=1/4 --list`).
- [x] In `e2e.yml`, added `strategy: matrix: shard: [1, 2, 3, 4]` to `e2e-tests`, `--shard=${{ matrix.shard }}/4` into `npm run test:e2e:main`, namespaced `playwright-report`/`playwright-results` artifacts with `-${{ matrix.shard }}`.
- [x] Added `e2e-sequential` job (unsharded, `timeout-minutes: 20`).
- [x] **Found and fixed a risk not in the original plan:** sharding means `global-setup.ts`'s per-run full DB seed would fire 4x concurrently against the shared test project — a new race the single-job setup never had. Added a dedicated `e2e-seed` job that seeds once; `e2e-tests` and `e2e-sequential` both `needs: e2e-seed` and pass `E2E_SKIP_SEED=true` (new global-setup.ts guard) to skip their own reseed.
- [x] **Shipped PR #712, merged to develop.**

---

## Phase 3 — Quarantine known flaky specs

**Why:** stop retry-masking real flakes on the blocking gate; make their failure rate visible without blocking merges.

**Files:**
- Modify: `tests/e2e/coaching-philosophy.spec.ts:34` — tag `@flaky`
- Modify: `tests/e2e/smart-inputs*.spec.ts:76` (confirm exact filename first — `grep -rn "smart-inputs" tests/e2e`)
- Modify: `.github/workflows/e2e.yml` — new `e2e-flaky` job

**Steps:**
- [x] Appended `@flaky` — whole describe for `coaching-philosophy.spec.ts` (shared `beforeAll` race affects every test in it), just the one test for `smart-inputs.spec.ts`.
- [x] `test:e2e:main` / `test:e2e:sequential` now bake in `--grep-invert @flaky` (package.json, not per-callsite in the workflow — single source of truth since both scripts are CI-only).
- [x] Added `e2e-flaky` job (`continue-on-error: true`, `needs: e2e-seed`, new `test:e2e:flaky` script).
- [x] Verified locally via `--list` with dummy Supabase env vars (bare `--list` crashes on collection without real creds — unrelated pre-existing issue, not a bug in this change).
- [x] **Shipped PR #713.**

---

## Phase 4 — Split PR-gate (smoke) from promote-gate (full)

**Why:** this is the structural fix — most PRs target `develop` (feature work), where a fast smoke pass is enough; the full suite's job is protecting the `develop → main` promotion, per your existing `release-flow` skill model.

**Files:**
- Modify: several spec files to add `@smoke` tags (starter set below — expand later, don't block this phase on full coverage)
- Modify: `.github/workflows/e2e.yml`

**Starter `@smoke` set (beyond the 4 existing auth-enforcement tests) — one critical-path assertion per core domain, not full CRUD:**
- Dashboard loads with data for an authenticated player (tier1-critical, already likely has a candidate)
- Schools list renders + a single add-school flow
- Coaches list renders
- Tasks list renders
- One login + one signup happy path (not already covered by auth-enforcement)

- [x] Grepped `tests/e2e/tier1-critical/` for candidates instead of writing new specs. Starter set landed smaller than the ~10-15 estimate: **8 tests** — 4 pre-existing (`auth-enforcement.spec.ts`), + login/signup (`auth.spec.ts`) + one atomic CRUD test each for schools/coaches. No dashboard/tasks smoke coverage — no dedicated "dashboard loads" spec exists to tag; noted as a follow-up, not invented here.
- [x] Tagged those 8 with `@smoke`.
- [x] `e2e.yml`: new `e2e-smoke` job gated `if: ... && github.base_ref == 'develop'`; all 5 full-suite jobs (`e2e-seed`/`e2e-tests`/`e2e-sequential`/`e2e-flaky`/`e2e-webkit`) gated `if: ... && (github.event_name == 'workflow_dispatch' || github.base_ref == 'main')` — manual dispatch still runs the full suite regardless of target branch.
- [x] **Live-verified on this PR itself** (#715, into develop): only `e2e-smoke` ran, all 5 full-suite jobs showed `skipping` (not failed).
- [x] **Shipped PR #715.**

---

## Phase 5 — Root-cause flake fixes (separate plan, after 1-4 stabilize)

Not detailed here — do this only once Phases 1-4 have run clean for a few days, so you're fixing root causes in a fast, non-noisy CI instead of a 50m bottleneck. Pick up from existing memory: [[e2e-cross-worker-afterall-race]] (per-run RUN_ID-scoped school data + teardown, or per-worker accounts) and [[e2e-test-account-school-leak]].

---

## Sequencing note

Phases 1-3 are independent of each other and low-risk — can land as 3 separate small PRs in any order. Phase 4 depends on Phase 2 (sharding) existing so the full-suite path stays fast even when it does run. Phase 5 is deliberately last.
