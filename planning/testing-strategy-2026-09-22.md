# Testing Strategy Plan — 2026-09-22

Source: QA slide (Brian Miller) taxonomy (Smoke/Regression/Feature/Exploratory/Happy-Path/Negative/UI/API/Load) mapped against current web+iOS coverage. Full gap table in session chat. This doc = execution plan for the real gaps.

**2026-09-22 correction:** Phase 2's premise ("iOS has zero tests") was never verified against the actual iOS repo — it was wrong. iOS already has ~250 test files wired into CI. See Phase 2 for the correction. Only 3 real gaps remain: web page-health smoke coverage, load testing, exploratory log.

## Priority order

1. Smoke tests (web) — cheap, catches prod-deploy regressions fast — DONE
2. ~~iOS automated test foundation~~ — premise wrong, already exists, see Phase 2 correction
3. Load/performance testing — never done, risk grows with user count — scripted, not run
4. Exploratory test log — pure process, near-zero cost — DONE

---

## Phase 1 — Web Smoke Test Suite — DONE (2026-09-22)

**Correction from original plan:** repo already had an `@smoke` tag convention wired into `.github/workflows/e2e.yml` (`e2e-smoke` job, gates PRs into develop) covering signup/login/auth-enforcement/schools-CRUD/coaches-CRUD. The job's own comment says "expand coverage over time by tagging more tier1-critical specs, not by inventing a parallel test suite" — a new `tests/e2e/smoke/` dir was built then deleted once this was found.

**What shipped instead:** `tests/e2e/tier1-critical/page-health.spec.ts`, tagged `@smoke`, fills the actual gap — page-load + zero-console-error checks for `/`, `/signup` (unauth) and `/dashboard`, `/schools`, `/tasks`, `/performance` (auth) — nothing else in the existing `@smoke` set checks console errors or covers those routes. Write-path and fit-score-API coverage already existed via `schools-crud-atomic.spec.ts` @smoke, not duplicated.

Runs automatically via the existing `e2e-smoke` CI job on next PR to develop — no new script/workflow needed.

**Verification done:** `tsc --noEmit` clean, `eslint` clean (E2E dir excluded from lint by config, expected). **Not yet run live** — needs `npm run dev` + seeded E2E DB; do before merging per repo's own "tests passing ≠ code working" rule.

---

## Phase 2 — iOS Test Foundation

**CORRECTION (2026-09-22) — original premise was WRONG.** This phase assumed "iOS has zero automated tests," asserted in the original chat response without checking. Verified on-disk: `TheRecruitingCompassTests/` has **~250 real test files** (unit, ViewModels, Accessibility, Integration) covering nearly every feature module, plus `TheRecruitingCompassUITests/`. Both are wired into `.github/workflows/ci.yml` — unit tests run with `-skip-testing:TheRecruitingCompassUITests`, UI tests run separately with `-only-testing:TheRecruitingCompassUITests`. **iOS test foundation already exists and is CI-gated. No scaffolding work done — none needed.** Created and then deleted an empty `feat/ios-test-foundation` worktree/branch once this was discovered; nothing was committed.

**Real remaining iOS gap, if any:** not "build from zero" — it's whatever coverage gaps exist within the ~250 files (untested edge cases, flaky specs, coverage-percentage blind spots). That needs its own audit, not assumed from a slide comparison. Not attempted here — out of scope for this correction pass.

**Lesson:** should have run the repo's own "Orient Before Acting" step (`grep -ril` / directory check) before asserting a gap existed, exactly like `CLAUDE.md`'s own rule says. Didn't, because the claim was made about a different repo than the one loaded in context.

---

## Phase 3 — Load/Performance Testing — SCRIPTED, NOT RUN (2026-09-22)

`k6/api-load.js` + `k6/README.md` written. **Not executed** — needs explicit go-ahead on target project (shared with E2E suite, risk of cross-contamination) and a throwaway test account's credentials before running. See open question 2.

Original scope below, unchanged:

**Goal:** know Nitro + Supabase's ceiling before it matters.

**Tool:** k6 (scriptable, free, good Node ecosystem fit) — no new heavy infra.

**Scope:**
- Script hits: `/api/schools`, `/api/athlete/phase/advance`, fit-score endpoint, dashboard aggregate endpoints (the union-query ones from growth/admin work — those are the likely first bottleneck given DAU/WAU union queries over multiple tables)
- Ramp: 10 → 100 → 500 virtual users, watch p95 latency + Supabase connection pool exhaustion
- Run against QA Supabase project (`xpxzhqghxecsjhvklsqg`), never prod — confirm with Chris before pointing at anything main-branch-adjacent given prod/QA split (see MEMORY `prod-infra-identity`)

**Deliverable:** `k6/` dir with scripts + a one-page findings doc (baseline numbers, first bottleneck found).

**Effort:** 1 day script + run, ongoing re-run before major launches (not CI-gated — manual trigger only, this is a one-off health check cadence, not per-PR).

---

## Phase 4 — Exploratory Testing Log — DONE (2026-09-22)

`planning/exploratory-log.md` created. Just start appending after manual test sessions.

Original scope below, unchanged:

**Goal:** make ad-hoc poking-around testing leave a trace.

**Mechanism:** lightweight — new `planning/exploratory-log.md`, one entry per session:
```
## 2026-09-22 — <feature poked>
Found: <bug or "nothing">
Filed: <issue # or N/A>
```
No tooling, no new skill — just a discipline habit, append after any manual "let me click around" session. Tie into existing `doc-cleanup` cron (already scheduled) so it doesn't bloat unbounded — compress old entries same as other docs.

**Effort:** 0. Just start doing it.

---

## Sequencing / branches

- Phase 1: `feat/smoke-tests` off develop (web repo)
- Phase 2: `feat/ios-test-foundation` off main (iOS repo) — separate repo, don't cross-worktree it (see MEMORY `cross-repo-agent-worktree-trap`)
- Phase 3: `feat/load-testing` off develop (web repo)
- Phase 4: no branch, just start writing to the log file

Phases 1/3/4 can run in parallel (independent). Phase 2 is its own long-running effort in the iOS repo, start whenever bandwidth allows — highest value but highest cost.

## Unresolved questions

1. iOS: does a test target already exist unused? (verify before scaffolding)
2. Load test: confirm QA Supabase project is safe to hammer at 500 VUs without disrupting other work (E2E runs against same project)
3. Smoke test in CI: run per-deploy or per-PR-merge? Recommend per-deploy (matches "is prod stable" intent from slide's definition)
