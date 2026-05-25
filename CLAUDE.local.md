# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Standing Preferences (do not archive)

- **Output format by reader, not by default**: For artifacts Chris will read once on a phone or share with someone non-technical — session recaps, status overviews, weekly summaries, "where are we on X" snapshots — invoke the `visual-explainer` skill to produce self-contained HTML. For artifacts that future-Claude or Chris will edit (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, lesson files, plans) — stay markdown. When unsure: read = HTML, edit = markdown.

## Current Session (2026-05-25 — E2E seed buckets + ws fix + admin-test cleanup)

**Status:** STABLE — suite green, deferred items + bug tickets remain
**Branch:** develop (clean, pushed — HEAD `e7e19031`)
**Build:** not run this session
**Tests:** E2E **385 pass / 92 skip / 9 did-not-run / 0 fail** (4.3m, end of session)
**Lint:** not run this session
**Type-check:** PASS (`npx nuxi typecheck` clean)
**Handoff:** `planning/handoff-2026-05-25-e2e-bucket-work.md`

## Action Required

1. **Family-invite UI gaps** (~7 skips) behind `BLOCKED_BY_APP_GAP=true` in `tests/e2e/family-invite-flow.spec.ts` — drop the flag once /join + family-management UI is fixed.
2. **dashboard-8-3 RecentActivityFeed bug** (4 skips) — widget renders empty despite real interactions. Initial fix attempt reverted. See handoff for diagnostic trail.
3. **parent-tasks bucket** (4 skips) — needs multi-athlete + deadline_date + parent storageState setup. Deferred.
4. **Seed infrastructure project** — remaining conditional-data-guard skips (down from ~110 to ~92).

## Environment Notes

- **Flaky local DNS** — router resolver `192.168.4.1` intermittently drops `api.github.com`. `git`/`gh` time out at random; pinned-IP curl works. Workaround: retry. NOT a GitHub outage.
- **Autonomous "agent checkpoint" cron** committing WIP to develop (`wip: agent checkpoint HH:MM`). Sweeps uncommitted edits — fold into proper commits when reviewing.

See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history (CI/PR cleanup, family invite flow, E2E fixes archived there).
