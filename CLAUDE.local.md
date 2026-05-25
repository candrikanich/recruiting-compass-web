# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Standing Preferences (do not archive)

- **Output format by reader, not by default**: For artifacts Chris will read once on a phone or share with someone non-technical — session recaps, status overviews, weekly summaries, "where are we on X" snapshots — invoke the `visual-explainer` skill to produce self-contained HTML. For artifacts that future-Claude or Chris will edit (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, lesson files, plans) — stay markdown. When unsure: read = HTML, edit = markdown.

## Current Session (2026-05-25 — CI/PR cleanup)

**Status:** develop CI green, both dependabot PRs merged, main↔develop reconciled
**Branch:** develop (clean, pushed — HEAD `18e32873`)
**Build:** not run
**Tests:** Full unit suite 7165 pass (local + CI Unit job green)
**Lint / Type-check / Token-audit:** PASS

**Fixed (3 stale unit failures that reddened develop):**
- `SchoolNotesCard.spec` + `CoachNotesEditor` stub asserted dead emit contract; rewrote to `saveFn` callback contract
- `tasks-index-advanced.spec` → `useHead is not defined`; added `useHead`/`useSeoMeta` to global Nuxt stubs in `tests/setup.ts`
- Commit `066d8d43`

**Merged:** PR #259 (supabase 2.100→2.101), PR #260 (posthog-js 1.374→1.376) — branches deleted. No open PRs.
**Reconciled:** back-merged `main` (6 dependabot commits) into develop — clean, lockfile in sync, qs override intact, 0 vulns. main now fully contained in develop.

## Action Required

1. **Seed infrastructure project** — ~110 conditional-data-guard skips waiting; separate scope (dashboard-8-x, family-invite-flow, coaching-philosophy, bulk-delete-users, user-story-6-1/9-1)

## Environment Notes

- **Flaky local DNS** — router resolver `192.168.4.1` intermittently drops `api.github.com`. `git`/`gh` time out at random; pinned-IP curl works. Workaround: retry. NOT a GitHub outage.
- **Autonomous "agent checkpoint" cron** committing WIP to develop (`wip: agent checkpoint HH:MM`). Sweeps uncommitted edits — fold into proper commits when reviewing.

See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history (CI/PR cleanup, family invite flow, E2E fixes archived there).
