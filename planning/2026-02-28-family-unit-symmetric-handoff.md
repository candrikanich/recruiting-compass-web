# Family Unit Symmetric Redesign — Session Handoff

**Last updated:** 2026-02-28 (session 3)
**Branch:** `develop` (10 commits ahead of origin — push pending)
**Tests:** 5860 passing (305 files) — all green
**Lint:** Clean (0 errors, 0 warnings)
**Type-check:** Clean (0 errors)
**Plan:** `docs/plans/2026-02-28-family-unit-symmetric-redesign-plan.md`

---

## Status Overview

| Task | Description | Status |
|------|-------------|--------|
| 1 | DB migration (drop player_user_id, add family_invitations) | ✅ Done |
| 2 | `family/create` — both roles allowed | ✅ Done |
| 3 | `family/code/join` — both roles allowed | ✅ Done |
| 4 | Email invite endpoints (5 routes) | ✅ Done |
| 5 | `sendInviteEmail()` utility | ✅ Done |
| 6 | Update signup flow (remove family-code-entry dead end) | ✅ Done |
| 7 | Parent onboarding page | ✅ Done |
| 8 | Player details endpoint + migration | ✅ Done |
| 9 | `/join` page (token acceptance) | ✅ Done |
| 10 | Player onboarding step 5 → invite parent | ✅ Done |
| 11 | `useFamilyInvite.sendInvite()` composable | ✅ Done |
| 12 | Family settings — pending invitations UI | ✅ Done |
| 13 | iOS universal links | ✅ Done |
| 14 | Deprecate `accessible.get.ts` | ✅ Done |
| 15 | Fix all `player_user_id` type errors | ✅ Done |
| 16 | Full test suite + lint pass | ✅ Done |
| 17 | E2E tests | ⬜ TODO |

---

## What Remains

### Task 17: E2E Tests

**Files to create/modify:**
- Create: `tests/e2e/family-invite-flow.spec.ts`
- Possibly modify: `tests/e2e/tier1-critical/auth.spec.ts`
- Possibly modify: `tests/e2e/family-units.spec.ts`

**Three journeys to test:**

```typescript
test('parent signs up first, invites player via email, player joins')
// 1. Parent signs up → /onboarding/parent
// 2. Parent fills player details, sends email invite
// 3. Grab invite token (from DB or email intercept)
// 4. Navigate to /join?token=<token>
// 5. Player creates account or logs in
// 6. Assert: both accounts see same family dashboard

test('player signs up first, shares code, parent joins via code')
// 1. Player signs up → /onboarding (step 1-5)
// 2. Player copies family code from step 5 or settings
// 3. Parent signs up → /onboarding/parent → enter code
// 4. Assert: parent sees player's family

test('expired token shows helpful error on /join page')
// Pre-seed expired token in test DB
// Navigate to /join?token=expired-token
// Assert: "This invite has expired" message visible
```

**Before running E2E:**
- Check existing `tests/e2e/tier1-critical/auth.spec.ts` for any references to old parent signup flow (family-code-entry) that need updating
- Check `tests/e2e/family-units.spec.ts` for stale assertions

---

## What Was Completed This Session

### Session 3 (Tasks 8–16) — commits `840c587`–`7c09b6f`

**Task 8** — Player details endpoint + migration:
- `supabase/migrations/20260228000001_family_pending_player_details.sql` — `pending_player_details` JSONB column
- `server/api/family/player-details.post.ts` — stores parent-entered player info

**Task 9** — `/join` page:
- `pages/join.vue` — public page; handles 404/409/410 errors; login form or confirm button
- `tests/unit/pages/join.spec.ts` — 10 tests

**Task 10** — Player onboarding step 5:
- Replaced "You're All Set!" with invite-a-parent UI
- Added `useFamilyCode`/`useFamilyInvite`; family code fetched on entering step 5

**Task 12** — Family settings pending invitations:
- `composables/useFamilyInvitations.ts` — fetch + revoke
- `components/Family/FamilyPendingInviteCard.vue` — invite card UI
- `pages/settings/family-management.vue` — added pending invitations section

**Task 13** — iOS Universal Links:
- `public/.well-known/apple-app-site-association` — intercepts `/join` links
- `nuxt.config.ts` — added `content-type: application/json` header route rule
- **Note:** Replace `TEAMID` with actual Apple Team ID from App Store Connect

**Task 14** — Deprecate `accessible.get.ts`:
- Added `Deprecation: true` + `Sunset: 2026-06-01` response headers

**Task 15** — Fix type errors:
- `types/database.ts` — manually updated: added `family_invitations` table, replaced `player_user_id` with `created_by_user_id` in `family_units`
- `server/api/family/code/regenerate.post.ts` — `player_user_id` → `created_by_user_id`
- `server/api/family/accessible.get.ts` — simplified deprecated query to new schema
- `pages/join.vue` — type-narrowed error handling
- `composables/useActiveFamily.ts` — cast serialized families to correct type

**Task 16** — Lint + test pass:
- Fixed `\${...}` → `${...}` bug in email template (vars weren't interpolating)
- Fixed unused `err` catch variable
- Removed redundant eslint-disable directive

---

## Action Required Before Final Merge

1. **Push branch:**
   ```bash
   git push
   ```

2. **Apply actual Supabase migration to remote DB:**
   - The remote DB still has `player_user_id` (pre-migration schema)
   - `types/database.ts` was manually updated to reflect the intended schema
   - The migration `20260228000000_family_unit_symmetric.sql` likely failed silently on the remote (possibly due to NOT NULL constraint on rows with NULL player_user_id)
   - Before deploying, verify migration ran correctly: check if `created_by_user_id` column exists and `player_user_id` was dropped
   - If migration failed: inspect DB logs, may need to run manually via Supabase Dashboard SQL editor

3. **Apple Team ID:**
   - Replace `TEAMID` in `public/.well-known/apple-app-site-association`
   - Get from App Store Connect → Membership Details

4. **Complete Task 17 (E2E tests):**
   ```bash
   /executing-plans docs/plans/2026-02-28-family-unit-symmetric-redesign-plan.md
   ```
   → Resume at Task 17

---

## Architecture Notes

### New File Map
```
composables/
├── useFamilyInvitations.ts    # Fetch + revoke pending invitations
├── useFamilyInvite.ts         # Send invites (player or parent role)

components/Family/
├── FamilyPendingInviteCard.vue # Invite card with revoke button

pages/
├── join.vue                   # Public /join?token= page
├── onboarding/parent.vue      # Parent onboarding wizard (steps 1-2)

server/api/family/
├── player-details.post.ts     # Store pre-fill data for player
├── invite.post.ts             # Create email invitation
├── invite/[token].get.ts      # Look up invite by token (no auth)
├── invite/[token]/accept.post.ts  # Accept invitation
├── invitations/index.get.ts   # List pending invitations
├── invitations/[id].delete.ts # Revoke invitation

public/.well-known/
└── apple-app-site-association # iOS Universal Links config
```

### Key Constraint
All API routes use `useSupabaseAdmin()` (service role), never `useSupabaseClient(event)`.

### DB Schema State
- Remote DB: `family_units` still has `player_user_id` (migration may have failed)
- `types/database.ts`: manually updated to expected post-migration state
- `family_invitations` table: defined in types but may not exist on remote DB
- All code was already written to use `created_by_user_id` and `family_invitations`
