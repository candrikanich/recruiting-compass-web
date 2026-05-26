# Handoff: E2E buckets a/b/c + task-deadline feature

**Date:** 2026-05-26
**Branch:** develop
**Status:** STABLE — the three deferred buckets (a/b/c) from the 2026-05-25 handoff are all retired.

## Summary

Resolved all three deferred E2E buckets in order. (a) and (b) were app bugs; (c) was a feature build (deadline wiring) plus an architecture fix (dead parent-context path).

## Commits (local on develop, unpushed unless noted)

| Commit | What |
|---|---|
| `f2a622dc` | (a) dashboard RecentActivityFeed — **already on origin** |
| `921f4bec` | (b) family-invite: decline + un-gate /join flow |
| `1d66e81a` | (c) design spec |
| `ba09ad46` | (c) task-deadline feature |
| (latest) | (c) parent-context refactor to useActiveFamily |

## (a) Dashboard RecentActivityFeed — 4 skips retired

Root cause: `useActivityFeed` read the user id from `useAuth().session`, but `useAuth()` returns a fresh non-singleton session ref per call, initialized null, and nobody called `restoreSession()` on that instance — so `fetchActivities` always early-returned. Fixed to read from the `useUserStore` singleton (same pattern `useDashboardData` uses). Verified dashboard-8-3 9 passed / 0 failed.

## (b) Family-invite flow — 8 skips retired, BLOCKED_BY_APP_GAP removed

Two real app bugs (the prior auth/ws fix had masked half by then):
- `join.vue` `decline()` used `csrfPost` (CSRF header only, no Bearer token) against a `requireAuth` endpoint → every authenticated decline 401'd. Switched to `$fetchAuth`.
- `family_invitations_status_check` only allowed `(pending, accepted, expired)`; the decline endpoint writes `status='declined'` → constraint violation → 500. Migration widened it. **Applied to QA.**

Test fixes: cleared the config-default player storageState on unauthenticated tests; fill inner `<input>` of DesignSystemInput wrappers; parallel-safe revoke assertion scoped to the seeded email; dedicated `DECLINE_VIEW_TOKEN` (shared token was mutated by the decline test). Removed the `BLOCKED_BY_APP_GAP` flag. 12/12 across 3 runs.

## (c) Task deadlines + parent-context — 4 skips retired

**Feature (Approach C, see spec):** tasks never carried a deadline. Added `task.deadline_offset_months` (migration + grade-band backfill 12→6/11→18/10→30/9→42, applied to QA), pure `server/utils/taskDeadlines.ts` `computeTaskDeadline(gradYear, offset)` (June 1 anchor − offset; 6/6 unit), and server compute in `/api/tasks` + `/api/tasks/with-status` from the athlete's `graduation_year`. Endpoints accept `?athleteId` authorized by shared `family_unit_id` (`server/utils/athleteAccess.ts` `resolveTargetAthleteId`). Template cache stays deadline-free; deadlines computed onto new objects per request (no cross-athlete leak). `useTasks` + tasks page forward the active athlete id.

**Architecture fix:** the tasks page used `useParentContext`, which reads `user.linked_accounts` — a field populated **nowhere** — and never called `initialize()`. So the athlete switcher and parent read-only mode were dead (`isViewingAsParent` always false). Rewired the page to `useActiveFamily` (the dashboard's mechanism, auto-initializes, resolves the viewed athlete via `/api/family/accessible`).

**Tests:** un-skipped `:40` (task-item — was a 3s probe racing the spinner; now web-first wait), `:55` (deadline-badge), `:68` (athlete switcher ≥2), `:82` (parent checkboxes disabled). Seeded a race-safe 2nd athlete linked to the parent's family unit. 8/8 across 2 runs, no DB debris.

## QA migrations (committed; apply to prod on next main deploy)

- `supabase/migrations/20260525000000_family_invitations_allow_declined.sql`
- `supabase/migrations/20260525000001_task_deadline_offset_months.sql`

Both applied to QA project `xpxzhqghxecsjhvklsqg`. player@test.com `graduation_year` set to 2028 (seed; parent-tasks beforeAll re-sets each run).

## Verification

- Type-check: PASS. Lint: 0 errors on changed files. Unit: 121 task/deadline-related pass.
- E2E specs touched: dashboard-8-3 9/0, family-invite 12/12 (×3), parent-tasks 8/8 (×2).
- Full-suite run: in progress / see CLAUDE.local.md for final numbers.

## Next

1. **Seed-infra project** — ~92 remaining conditional-data-guard skips. Largest bucket.
2. **2 flakes** — coaching-philosophy `:34` (session-expired race), smart-inputs `:76` (parallel load).
3. **`athleteProfile` never fetched** in tasks page — `currentGradeLevel` stays default 10; parent progress banner shows "undefined has…". Pre-existing, cosmetic, out of scope this session. Worth fixing when touching the tasks page next.
