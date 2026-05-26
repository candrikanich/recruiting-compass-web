# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Standing Preferences (do not archive)

- **Output format by reader, not by default**: For artifacts Chris will read once on a phone or share with someone non-technical — session recaps, status overviews, weekly summaries, "where are we on X" snapshots — invoke the `visual-explainer` skill to produce self-contained HTML. For artifacts that future-Claude or Chris will edit (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, lesson files, plans) — stay markdown. When unsure: read = HTML, edit = markdown.

## Current Session (2026-05-26 — E2E buckets a/b/c + task-deadline feature)

**Status:** STABLE — a/b/c buckets all retired (3 deferred buckets → 0)
**Branch:** develop — 4 commits unpushed: `921f4bec` (family-invite), `1d66e81a` (deadline spec), `ba09ad46` (deadline feature), parent-context refactor. `f2a622dc` (dashboard fix) already on origin.
**Tests:** dashboard-8-3 9/0, family-invite 12/12 (×3), parent-tasks 8/8 (×2); 121 related unit pass. Full e2e run status: see latest.
**Lint:** 0 errors on changed files
**Type-check:** PASS
**Handoff:** `planning/handoff-2026-05-26-buckets-abc-deadline-feature.md`
**Spec:** `docs/superpowers/specs/2026-05-25-task-deadlines-from-graduation-year-design.md`

### Done this session
- **(a)** dashboard RecentActivityFeed: read user id from `useUserStore` (was non-singleton `useAuth().session`). 4 unskipped.
- **(b)** family-invite: `decline()` → `$fetchAuth` (was csrf-only → 401); migration widened `family_invitations` status CHECK to allow `'declined'` (was 500). 8 unskipped, flag removed.
- **(c)** task-deadline feature (Approach C): `task.deadline_offset_months` + server compute from athlete `graduation_year` + `?athleteId` authz; tasks page rewired `useParentContext`→`useActiveFamily` (linked_accounts was dead). 4 unskipped.

### QA migrations applied (also committed, will hit prod on next main deploy)
- `family_invitations_allow_declined` — status CHECK + `'declined'`
- `task_deadline_offset_months` — column + grade-band backfill (12→6,11→18,10→30,9→42)
- player@test.com `graduation_year` set to 2028 (seed, reset each parent-tasks run)

## Action Required

1. **Seed infrastructure project** — remaining ~92 conditional-data-guard skips (the big bucket).
2. **2 known flakes** — coaching-philosophy `:34` (session-expired race), smart-inputs `:76` (heavy parallel load).

## Environment Notes

- **Flaky local DNS** — router resolver `192.168.4.1` intermittently drops `api.github.com`. `git`/`gh` time out at random; pinned-IP curl works. Workaround: retry. NOT a GitHub outage.
- **Autonomous "agent checkpoint" cron** committing WIP to develop (`wip: agent checkpoint HH:MM`). Sweeps uncommitted edits — fold into proper commits when reviewing.

See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history (CI/PR cleanup, family invite flow, E2E fixes archived there).
