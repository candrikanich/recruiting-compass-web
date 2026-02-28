# Family Unit Symmetric Redesign

**Date:** 2026-02-28
**Status:** Approved
**Context:** Parents testing before players create accounts hit a dead end. The current model requires a player to exist before a family unit can be created. This redesign makes family creation symmetric — either a player or parent can start the journey.

---

## Problem

The current architecture is player-centric:

- `family_units.player_user_id` is a required FK — a family *is* a player
- Parents cannot create a family unit; they can only join one via a player's code
- A parent who signs up before the player is redirected to `/family-code-entry` and stuck until the player creates an account and shares their code
- This is a real UX failure for the likely real-world pattern: parent discovers the app, signs up, wants to get started, and hits a wall

---

## Design Decision

**Approach 2 — Full Symmetric Redesign**

The family unit becomes a neutral entity. Either a player or parent can create it. The other person joins via email invite or family code. All data (schools, coaches, interactions, documents) is scoped to `family_unit_id` as today — that does not change.

Payment (future): per family unit, not per member. Billing anchor will be a `billing_user_id` or separate `subscriptions` table added later without requiring schema rework.

---

## Schema Changes

### `family_units` table

| Field | Change |
|-------|--------|
| `player_user_id` | **Dropped** — player is now identified via `family_members` with `role = 'player'` |
| `created_by_user_id` | **Added** — FK → users. Audit/billing anchor. Set at creation time. |
| `family_name`, `family_code`, `code_generated_at`, `created_at`, `updated_at` | Unchanged |

### `family_members` table

No structural changes. The constraint that only players could be "owner" is removed — either role can be an initial member.

### New `family_invitations` table

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
family_unit_id   uuid NOT NULL REFERENCES family_units(id) ON DELETE CASCADE
invited_by       uuid NOT NULL REFERENCES users(id)
invited_email    text NOT NULL
role             text NOT NULL CHECK (role IN ('player', 'parent'))
token            text NOT NULL UNIQUE
status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired'))
expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days')
created_at       timestamptz NOT NULL DEFAULT now()
accepted_at      timestamptz
```

---

## Signup & Family Creation Flow

Family creation is now the same step as signup for both roles.

### Player signs up first

1. Selects "Player" → enters name, email, password
2. Account created → family unit auto-created → `FAM-XXXXXXXX` generated
3. Onboarding wizard (5 steps — profile data)
4. Step 5 becomes the invite step: enter parent's email (sends invite) or copy family code
5. Player lands on dashboard — full access immediately

### Parent signs up first

1. Selects "Parent" → enters name, email, password
2. Account created → family unit auto-created → `FAM-XXXXXXXX` generated
3. Short parent onboarding (2 steps):
   - Step 1: "Tell us about your player" — name, graduation year, sport, position (optional but encouraged; pre-fills player profile)
   - Step 2: Invite your player — enter player's email (sends invite) or copy family code
4. Parent lands on dashboard — can follow schools, enter coaches, log interactions immediately

### Player receives parent's invite and joins

1. Player clicks email link → lands on `/join?token=abc123`
2. If no account: signup form with email pre-filled, role set to "player" (locked)
3. If account exists: login prompt → confirm connection
4. Player reviews pre-filled profile data (entered by parent) → confirms or edits
5. `family_members` record created, invitation marked accepted
6. Both see shared dashboard immediately

**`/family-code-entry` page is removed.** Code entry moves to Settings → Family only (for edge cases like adding a second parent).

---

## Invite Flow

### Email invite

1. Inviter enters email in-app
2. `POST /api/family/invite` creates `family_invitations` record and sends transactional email
3. Email contains: family name, who invited them, single CTA → `/join?token=<token>`
4. `/join` validates token (exists, status=pending, not expired) and shows context
5. On accept: `family_members` record created, invitation marked accepted

**Edge cases:**
- Expired token → "This invite has expired" → option to request a new one
- Token already used → "You're already connected to this family"
- Wrong email signs up via invite link → warn, let them proceed or use correct email
- Inviter can resend or revoke pending invites from Settings → Family

### Code path (unchanged UX)

1. Inviter copies `FAM-XXXXXXXX` from dashboard
2. Recipient enters code at signup OR in Settings → Family
3. `POST /api/family/code/join` validates and creates `family_members` record
4. Role restrictions removed — a player can join a parent-created family via code too

---

## API Changes

### Updated endpoints (role restrictions removed)

| Endpoint | Change |
|----------|--------|
| `POST /api/family/create` | Called for both roles at signup. Remove player-only guard. |
| `POST /api/family/code/join` | Remove parent-only guard — players can also join via code. |
| `GET /api/family/code/my-code` | Works for both roles. |
| `GET /api/family/accessible` | Deprecated — both roles use `GET /api/family/members`. |

### New endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/family/invite` | POST | Required | Send email invite. Body: `{ email, role }`. |
| `/api/family/invite/[token]` | GET | None | Validate token for `/join` page. Returns family info + inviter name + intended role. |
| `/api/family/invite/[token]/accept` | POST | Required | Accept invite. Creates `family_members`, marks invite accepted. |
| `/api/family/invitations` | GET | Required | List pending invitations for the family. |
| `/api/family/invitations/[id]` | DELETE | Required | Revoke a pending invitation. |

### Signup change

`POST /api/auth/signup` auto-creates a family unit for both player and parent roles. The branch redirecting parents to `/family-code-entry` is removed.

---

## Onboarding Changes

### Player joining a parent-created family

- Profile data parent entered is pre-filled in the onboarding wizard
- Player reviews and confirms (or edits) — does not re-enter from scratch
- If all fields already filled, 5-step wizard collapses to a single "review your profile" step

### Parent onboarding (new, shortened)

- Step 1: Player details (name, grad year, sport, position) — optional
- Step 2: Invite player (email or code)
- No academic data, no location — player fills their own academic profile

---

## iOS Considerations

### Deep linking for `/join?token=`

- Invite email links open the iOS app if installed, fall back to web if not
- Implementation: Universal Links (iOS) pointing to `recruitingcompass.com/join`
- Web `/join` page shows "Open in App" banner as fallback
- Both web and iOS `/join` flows hit the same `GET /api/family/invite/[token]` endpoint

### Family code on iOS

- Moves from signup flow into Settings → Family (matches web)
- Signup on iOS always creates a new family — join/connect happens after in settings

---

## What Does Not Change

- All data (schools, coaches, interactions, documents) remains scoped to `family_unit_id` — no data model changes beyond the family tables
- RLS policies use `family_unit_id` — update policies to derive player from `family_members` instead of `player_user_id`
- Payment deferred — family unit is the correct future billing anchor; no changes needed now

---

## Open Questions

None — all design decisions resolved before writing this doc.
