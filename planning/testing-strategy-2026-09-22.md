# Testing Strategy Plan — 2026-09-22

Source: QA slide (Brian Miller) taxonomy (Smoke/Regression/Feature/Exploratory/Happy-Path/Negative/UI/API/Load) mapped against current web+iOS coverage. Full gap table in session chat. This doc = execution plan for the 4 real gaps.

## Priority order

1. Smoke tests (web) — cheap, catches prod-deploy regressions fast
2. iOS automated test foundation — biggest gap, blocks parity confidence
3. Load/performance testing — never done, risk grows with user count
4. Exploratory test log — pure process, near-zero cost

---

## Phase 1 — Web Smoke Test Suite

**Goal:** post-deploy sanity check, <2min run, catches "prod is on fire" not logic bugs.

**Scope (Playwright, new `tests/e2e/smoke/` dir, tagged `@smoke`):**
- Unauthenticated: `/` loads, `/login` loads, `/signup` loads, no console errors
- Authenticated (player + parent fixture): `/dashboard`, `/schools`, `/tasks`, `/performance` load, no 500s, no blank screens
- One write path: create+delete a throwaway school (proves DB write path + RLS alive)
- One critical API: `GET /api/schools/:id/fit-score` returns 200 shape

**Wiring:**
- `npm run test:e2e:smoke` script → `playwright test tests/e2e/smoke --project=chromium`
- New GitHub Actions step: run smoke suite against the just-deployed Vercel preview URL immediately after deploy (both QA/develop and prod/main), before promoting confidence — not blocking merge, but posts to PR/Slack on fail
- Target runtime: under 2 min

**Effort:** ~0.5 day (fixtures already exist from full E2E suite, just narrow selection + CI wiring)

**Owner:** web session, own branch off develop, PR when green.

---

## Phase 2 — iOS Test Foundation

**Goal:** stand up XCTest/XCUITest from zero. Currently no automated iOS tests exist at all.

**Sub-phases (each its own PR, off iOS `main`):**

### 2a — Unit test target + first domain tests
- Add `RecruitingCompassTests` target if missing (verify first — don't assume)
- Cover pure logic first: date/deadline math, template resolver equivalents, any Swift port of `domain/` web logic
- Target: whatever mirrors web's `utils/contactWindow.ts`, `utils/growthAnalytics.ts` style pure functions

### 2b — API/networking layer tests (mocked)
- Mock URLSession or inject protocol-based client
- Cover auth token attach, 401 handling, decode-failure handling (Negative Testing from slide)

### 2c — XCUITest happy-path smoke (mirrors web Phase 1)
- Launch app → login → dashboard renders → tab bar nav works
- One critical flow: view a school, view a task

### 2d — CI wiring
- `xcodebuild test -scheme RecruitingCompass -destination 'generic/platform=iOS Simulator'` (per user's env notes: needs `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer` if run against beta Xcode)
- GitHub Actions macOS runner, gate on PR to iOS main

**Effort:** 2a: 1-2 days, 2b: 1 day, 2c: 1-2 days, 2d: 0.5 day. ~1 week total, sequenced not parallel (2b depends on nothing from 2a, could parallelize those two).

**Open question for Chris:** does an XCTest target already exist and just sit empty? Verify before scaffolding — don't duplicate.

---

## Phase 3 — Load/Performance Testing

**Goal:** know Nitro + Supabase's ceiling before it matters.

**Tool:** k6 (scriptable, free, good Node ecosystem fit) — no new heavy infra.

**Scope:**
- Script hits: `/api/schools`, `/api/athlete/phase/advance`, fit-score endpoint, dashboard aggregate endpoints (the union-query ones from growth/admin work — those are the likely first bottleneck given DAU/WAU union queries over multiple tables)
- Ramp: 10 → 100 → 500 virtual users, watch p95 latency + Supabase connection pool exhaustion
- Run against QA Supabase project (`xpxzhqghxecsjhvklsqg`), never prod — confirm with Chris before pointing at anything main-branch-adjacent given prod/QA split (see MEMORY `prod-infra-identity`)

**Deliverable:** `k6/` dir with scripts + a one-page findings doc (baseline numbers, first bottleneck found).

**Effort:** 1 day script + run, ongoing re-run before major launches (not CI-gated — manual trigger only, this is a one-off health check cadence, not per-PR).

---

## Phase 4 — Exploratory Testing Log

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
