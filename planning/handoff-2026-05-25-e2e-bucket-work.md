# Handoff: E2E seed buckets + WebSocket fix + admin-test cleanup
**Date:** 2026-05-25
**Branch:** develop
**Status:** STABLE — suite green, deferred items + bug tickets remain

## Summary

Session goal was retiring conditional-data-guard skips via per-spec seed pattern. Tripped over a hidden Node 20 WebSocket bug in `server/utils/auth.ts` that was silently 401'ing every Bearer-token API call; fix unlocked ~114 previously-failing-but-not-counted tests. Also cleaned 1637 test-debris users from the live Supabase.

## Numbers

| Metric | Start of session | End of session |
|---|---|---|
| Passing | 271 | **385** (+114) |
| Skipped | 117 | **92** (-25) |
| Failing | 0 (1 flake) | **0** |
| Did-not-run | 34 | 9 (-25) |
| auth.users rows | 1655 | 18 |

## Completed This Session (commits)

- `2e45b637` — notifications seed bucket + WebSocket server/client fix (initial pattern + ws transport for server/utils/supabase.ts + tests/e2e/seed/helpers/supabase-admin.ts; restored `generateRecoveryLink` export; planning/e2e-status-2026-05-25.html)
- `4a10ac9e` — sync lockfile for ws dep + unskip dashboard stat-count e2e (auto by user)
- `0e075990` — coaching-philosophy navigateToSchool race + DashboardPage stat xpath bug (was XPath in CSS-context locator — crashed every call)
- `7d49f922` — notifications delete-from-list parallel-worker race + add user-debris cleanup script
- `74365311` — un-gate expired-token test (server+page already render 410 correctly; false alarm)
- `59d54c06` — fix(auth): add `ws` transport to `server/utils/auth requireAuth` + un-skip bulk-delete-users (9 tests)
- `e7e19031` — restore BLOCKED_BY_APP_GAP=true (wip flip was for diagnostics)

## In Progress (Uncommitted)

None. Working tree clean, all pushed.

## Known Issues / Blockers / Deferred Buckets

### Family-invite valid/decline/revoke describes (~7 tests, behind `BLOCKED_BY_APP_GAP=true`)

Real `/join` + family-management UI gaps. When un-blocked the tests run and surface real assertion failures (8/10 fail). Each needs separate UI investigation:

- `:218` "shows invite details and login form" — selectors may have drifted
- `:247` valid invite authenticated → expects `data-testid="connect-button"` to render
- `:269` accept-invite → dashboard redirect path
- `:293` decline-invite UI
- `:333` unauthenticated login-connect flow
- `:372` family-management revoke
- `:410, :428` pending-invitation cards

To unblock: drop the `BLOCKED_BY_APP_GAP` flag once UI work is done.

### dashboard-8-3 RecentActivityFeed (4 tests skipped)

Widget renders empty for player despite real interactions in DB. Initial fix attempt (use `supabase.auth.getSession()` in `useActivityFeed` instead of broken per-call `useAuth().session` ref) was reverted because it broke previously-passing tests. Real root cause unclear — needs proper investigation:
- `useAuth()` IS broken (per-call scope, not a singleton) — but the fix had side effects
- Could be RLS, real-time subscription side effects, or session timing
- Skip annotations are in place with bug-ref comments

### parent-tasks (4 tests skipped, deferred)

Conditional skips on:
- `task-item` visibility — needs grade_level data alignment for player
- `deadline-badge` visibility — `deadline_date` not on `task` table (lives elsewhere)
- `athlete-select` with multi-athlete — needs 2+ linked athletes
- read-only checkbox for parent — needs parent storageState

Not blocked by infra, just needs ~2hr of setup work.

### coaching-philosophy flake (1 test)

Test `:34` "section should be present" occasionally fails on session-expired race during first navigation. Other 9 tests in the file pass cleanly. Pre-existing infrastructure issue, not seed-related.

### Smart-inputs flake fix (`:76`)

Earlier session added `toBeVisible` wait before click. User reverted it. The flake may resurface under heavy parallel load but isn't currently failing.

## Test Status

- E2E: **385 pass / 92 skip / 9 did-not-run / 0 fail** (4.3m) — verified 2026-05-25 end of session
- Type check: **PASS** (`npx nuxi typecheck` clean)
- Lint: not run this session
- Unit tests: not run this session

## Bug Tickets Filed (for follow-up)

| # | Bug | State |
|---|---|---|
| 5 | /join collapses expired→not-found | ✅ false alarm, closed |
| 6 | notifications delete-from-list selector | ✅ fixed (parallel-race assertion) |
| 7 | dashboard RecentActivityFeed renders 0 items | ⏳ deferred, root cause unclear |
| 13 | auth.users test debris (~1000) | ✅ cleaned (1637 deleted via MCP SQL) |
| 15 | /api/admin/users 401 with valid Bearer | ✅ fixed (Node 20 ws transport) |

## Resume Command

> Continue E2E work on the recruiting-compass-web repo. Suite is currently green (385/92/0). Next high-ROI options: (a) investigate dashboard RecentActivityFeed bug (4 skips), (b) fix family-invite UI gaps behind BLOCKED_BY_APP_GAP (7 skips), or (c) tackle parent-tasks bucket. See planning/handoff-2026-05-25-e2e-bucket-work.md for context.

## Next Steps (in order)

1. **Verify no regressions** — run `npm run test:e2e` once at session start. Expect ≥385 pass / 0 fail.
2. **Pick a bucket from "Deferred"** based on appetite — family-invite UI gaps and parent-tasks both retire ~4-7 skips each.
3. **dashboard-8-3 activity feed bug** is the biggest puzzle — would need an hour of focused debugging (RLS check, network tab inspection, possibly fixing the `useAuth()` per-call-scope architecture properly).
4. **Optionally**: kill the leftover background dev server / sweep processes from this session (`lsof -i :3003` then `kill PID` if anything is stuck).
