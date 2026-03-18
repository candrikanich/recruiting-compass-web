# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Current Session

**Status:** NEARLY DONE — E2E test suite overhaul, ~130/149 targeted tests passing
**Branch:** develop (11 commits ahead of origin — NOT YET PUSHED)
**Build:** not run this session
**Tests:** E2E targeted specs ~130 pass / 14 fail (recruiting-packet pre-existing) / 23 skip (a11y)
**Lint:** UNKNOWN — not run this session
**Type-check:** UNKNOWN — not run this session
**Handoff:** `planning/handoff-2026-03-17-e2e-test-fixes.md`

## Action Required

1. **Push branch first:** `git push`
2. **Verify Supabase migration on remote:** The remote DB may still have `player_user_id` (migration `20260228000000` may have failed silently). Check via Supabase Dashboard before deploying.
3. **Replace `TEAMID`** in `public/.well-known/apple-app-site-association` with real Apple Team ID

## Resume at Task 17

```
/executing-plans docs/plans/2026-02-28-family-unit-symmetric-redesign-plan.md
```
→ Only Task 17 (E2E tests) remains

## Tasks Remaining (17 only)

17. E2E tests — create `tests/e2e/family-invite-flow.spec.ts`, check auth.spec.ts + family-units.spec.ts for stale assertions

## Recently Completed (this session)

- **Task 8:** `player-details.post.ts` + migration `20260228000001`
- **Task 9:** `pages/join.vue` + 10 unit tests
- **Task 10:** Player onboarding step 5 → invite parent UI
- **Tasks 12–14:** Pending invitations UI, iOS universal links, deprecate accessible.get.ts
- **Task 15:** Fixed all type errors (updated database.ts manually for `family_invitations` + `created_by_user_id`)
- **Task 16:** Lint clean — fixed `\${...}` email template bug, unused vars

## Prior Sessions

- **Tasks 1–5, 11** (session 1): DB migration, invite endpoints, sendInviteEmail, useFamilyInvite
- **Tasks 6–7** (session 2): Signup flow overhaul, parent onboarding wizard

See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.
