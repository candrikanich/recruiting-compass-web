# CLAUDE.local.md

Active session notes only. See [COMPLETED_WORK.md](./COMPLETED_WORK.md) for full history.

## Current Session

**Status:** E2E test systemic overhaul — major networkidle fix applied, ~64% pass rate on spot-check
**Branch:** develop (NOT YET PUSHED)
**Build:** not run this session
**Tests:** Full suite was ~261 failing; spot-check 35/55 passing after fixes
**Lint:** UNKNOWN
**Type-check:** UNKNOWN
**Handoff:** `planning/handoff-2026-03-18-e2e-fixes.md`

## Action Required

1. **Push branch:** `git push`
2. **Supabase migration:** `player_user_id` migration may still need verifying on remote
3. **Replace `TEAMID`** in `public/.well-known/apple-app-site-association`

## E2E Test Fix Summary (2026-03-18)

5 root causes identified and fixed:
1. ✅ **RC-1 networkidle** — replaced with `domcontentloaded` in all 33 spec files + 8 page objects/fixtures
2. ✅ **RC-2 loginViaForm in beforeEach** — removed from 10 spec files (storageState handles auth)
3. ✅ **RC-3 password-reset button selector** — fixed `aria-label` mismatch, added blur+wait before submit
4. ✅ **RC-4 auth redirect query param** — `toHaveURL(/\/login/)` regex
5. ✅ **RC-5 signup flow redirect** — AuthPage.ts updated to accept `/dashboard` route

**Remaining issues:**
- `schools-crud`: autocomplete toggle timing fix applied; needs re-verification
- `dashboard-8-1`: "Offers" card hidden (`v-if="showOffers"` false for test user); mobile h1 issue
- `coaches-filtering/crud`: `beforeEach` creates school+coaches (slow, sometimes times out)
- `password-reset`: API-dependent tests need Supabase to respond correctly

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
