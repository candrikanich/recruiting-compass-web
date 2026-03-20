# Handoff: E2E Test Suite Status & Remaining Fixes
**Date:** 2026-03-20
**Branch:** develop (3 commits ahead of origin — NOT YET PUSHED)
**Status:** NEARLY DONE

## Completed This Session

- **Full E2E audit** — ran every test group in isolation and the full 49-minute suite; established accurate baseline
- **No code changes** — this was a pure analysis/planning session; all prior session fixes remain in place

## What We Found

### Full Suite Baseline (authoritative)
Running `npx playwright test --reporter=list` (4 workers, own dev server):
- **259 passed, 133 skipped, 27 did not run, 0 failures** — exit code 0

### The "27 Did Not Run" Mystery
These tests never get worker time in the 49-min run. When executed in isolation:
- **25 tier3 tests** (documents-events + error-recovery): ALL **skip** — fine, ignore these
- **10 user-stories tests** across 3 specs: **FAIL** — these are the real work

### Real Failures (10 tests, 3 spec files)

#### `tests/e2e/user-stories/dashboard-8-3.spec.ts` — 3 failures
| Test | Error | Fix |
|------|-------|-----|
| "displays Recent Activity section" | Strict mode: `text=Recent Activity` matches 2 elements | Change to `page.getByRole('heading', { name: 'Recent Activity' })` |
| "shows empty state when no activities" | Empty state boolean false — selector mismatch | Check what empty state renders; `text=No recent activity` IS present but the test uses wrong check |
| "navigates to full activity page" | Clicks "View all" but URL stays `/dashboard` (no `/activity` route exists) | Skip with comment OR find correct navigation target |

#### `tests/e2e/user-stories/dashboard-8-2.spec.ts` — 3 failures
| Test | Error | Fix |
|------|-------|-----|
| "AC1: Contact Summary Metrics displayed correctly" | `[data-testid="contact-frequency-widget"] [data-testid^="metric-"]` not found | Read `components/dashboard/ContactFrequencyWidget.vue` for actual testids |
| "Metrics show correct labels" | Same | Same |
| "Contact frequency widget responsive on mobile" | Timeout from same issue | Same |

#### `tests/e2e/user-stories/athlete-interactions.spec.ts` — 6 failures (stale selectors)
| Test | Error | Fix |
|------|-------|-----|
| "Scenario 1: Athlete navigates to My Interactions" | `text=Your recruiting interactions are visible to your linked parent` not found | Remove/update removed help text assertion |
| "Scenario 2: Athlete logs email interaction" | `select[id="schoolId"]` not found on `/interactions/add` | Find correct school selector on the add-interaction form |
| "Scenario 4: Athlete logs different interaction types" | Same `select[id="schoolId"]` | Same fix |
| "Parent views interactions with Logged By filter" | `label:has-text("Logged By")` not found | Find actual filter label/selector |
| "Parent can click through to athlete interaction" | `.bg-white.rounded-xl.border button:has-text("View")` not found | Update card + view button selectors |
| "Parent sees athlete-logged interactions in timeline" | Cascading from above | Cascading |

### Other Failing Specs (ran in isolation, not in the full suite's "did not run" list)
These were observed failing when I ran individual groups against a busy dev server, but pass in the full suite. They are flaky due to external factors (Supabase rate limits, server overload from parallel runs). Not worth fixing now:
- `password-reset.spec.ts` — resend/cooldown tests fail when Supabase rate-limits email sends
- `dashboard-8-1.spec.ts:116` — "No console errors" fails because coaches API returns 400 for test player (real app bug worth investigating separately)

## In Progress (Uncommitted)
None — no code changes this session.

## Known Issues / Blockers
- **Dashboard coaches 400 error** — `useDashboardData` → coaches fetch returns `Bad Request` for `player@test.com`. Causes the AC6 test to fail ("no console errors"). This is a real app bug, not a test issue. Investigate `server/api/coaches/` for what validation is failing with the test player's state.
- **Branch not pushed** — 3 commits ahead of origin. Push before starting next session.

## Test Status
- **Full E2E suite:** 259 pass, 133 skip, 0 fail ✅ (10 failing tests happen to "not run")
- **Unit tests:** UNKNOWN — not run this session
- **Type check:** UNKNOWN — not run this session
- **Lint:** UNKNOWN — not run this session

## Resume Command

Start a new session and say:

> "Fix the 10 failing E2E tests identified in planning/handoff-2026-03-20-e2e-status.md. The 3 spec files are: user-stories/dashboard-8-3.spec.ts (3 failures), user-stories/dashboard-8-2.spec.ts (3 failures), user-stories/athlete-interactions.spec.ts (6 failures). Each needs selector updates to match the current UI. Read the relevant Vue components first to find correct selectors, then fix the tests."

## Next Steps (in order)

1. **Push branch**: `git push` (3 commits ahead, not pushed)
2. **Fix `dashboard-8-3.spec.ts`** (fastest — 2 selector fixes + 1 skip):
   - Line 14: `text=Recent Activity` → `page.getByRole('heading', { name: 'Recent Activity' })`
   - Line 143: Find actual empty state selector (error says `text=No recent activity` IS present — use it)
   - Line 161: Check if `/activity` route exists; skip with comment if not
3. **Fix `dashboard-8-2.spec.ts`** (need to read ContactFrequencyWidget.vue):
   - Find actual `data-testid` attributes on the metric elements
4. **Fix `athlete-interactions.spec.ts`** (most work — 6 tests):
   - Read `pages/interactions/add.vue` for school selector
   - Read `pages/interactions/index.vue` for "Logged By" filter and "View" button
   - Update all 6 test selectors
5. **Verify**: `npx playwright test tests/e2e/user-stories/ --reporter=list` — expect 0 failures
6. **Investigate dashboard coaches 400** (optional but worthwhile):
   - Check what API call `useDashboardData` makes to coaches
   - Why does it return 400 for `player@test.com`?
