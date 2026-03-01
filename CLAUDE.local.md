# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Current Session

**Status:** NEARLY DONE — family unit symmetric redesign, Tasks 1–16 done (1 remains)
**Branch:** develop (10 commits ahead of origin — NOT YET PUSHED)
**Build:** not explicitly run this session
**Tests:** ✅ 5860 passing (305 files)
**Lint:** ✅ Clean (0 errors)
**Type-check:** ✅ Clean (0 errors)
**Handoff:** `planning/2026-02-28-family-unit-symmetric-handoff.md`

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
