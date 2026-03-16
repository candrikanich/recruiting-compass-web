# iOS Family Management Parity — Handoff Document

> **Prepared:** 2026-03-02
> **Web branch:** `develop` (10 commits ahead of `main`, not yet pushed)
> **Purpose:** Bring the iOS app to full feature parity with the web app's family creation, invitation, and connection flows.

---

## Overview

The web app shipped a symmetric family management redesign. The two key principles:

1. **Either role (player OR parent) can create a family.** The old model where only players owned families is gone. `player_user_id` is dropped from `family_units`; replaced by `created_by_user_id` (audit only).
2. **Two connection paths:** email invite link (`/join?token=`) and direct family code entry.

All API endpoints are live. iOS only needs to call them and build the corresponding UI flows.

---

## Database Schema Changes (Already Migrated)

### `family_units` table
```sql
-- REMOVED: player_user_id uuid
-- ADDED:
created_by_user_id  uuid NOT NULL  -- who created the family (audit only)
pending_player_details jsonb        -- parent pre-enters player's name/sport/grad year
family_code         text            -- format: "FAM-XXXXXX" (6 alphanumeric chars)
code_generated_at   timestamptz
```

### `family_invitations` table (new)
```sql
id               uuid PRIMARY KEY
family_unit_id   uuid NOT NULL REFERENCES family_units(id) ON DELETE CASCADE
invited_by       uuid NOT NULL REFERENCES users(id)
invited_email    text NOT NULL
role             text NOT NULL  -- 'player' | 'parent'
token            text NOT NULL UNIQUE  -- UUID, used in invite link
status           text NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'declined' | 'expired'
expires_at       timestamptz DEFAULT now() + 30 days
created_at       timestamptz DEFAULT now()
accepted_at      timestamptz NULL
declined_at      timestamptz NULL
```

### `users` table
```sql
-- ADDED:
date_of_birth    DATE NULL  -- required for new signups, for COPPA age gate
```

---

## API Endpoints

All endpoints are under `https://therecruitingcompass.com/api/`. All require `Authorization: Bearer <supabase_access_token>` unless noted.

### Family Creation
```
POST /api/family/create
Body: (none)

Response 200:
{
  "success": true,
  "familyId": "uuid",
  "familyCode": "FAM-ABC123",
  "familyName": "My Family"
}
```
- Idempotent: if user already has a family, returns existing one with `message: "Family already exists"`
- Creates `family_units` row + adds creator to `family_members` + logs to `family_code_usage_log`
- Both players AND parents can call this

### Family Code — Fetch My Code
```
GET /api/family/code/my-code

Response for player:
{
  "success": true,
  "hasFamily": true,
  "familyId": "uuid",
  "familyCode": "FAM-ABC123",
  "familyName": "My Family",
  "codeGeneratedAt": "2026-03-01T..."
}

Response for parent:
{
  "success": true,
  "families": [
    { "familyId": "uuid", "familyCode": "FAM-ABC123", "familyName": "My Family", "codeGeneratedAt": "..." }
  ]
}
```

### Family Code — Join by Code
```
POST /api/family/code/join
Body: { "familyCode": "FAM-XXXXXX" }

Response 200: { "success": true, "familyId": "uuid", "familyName": "My Family" }
Errors:
  400 — Invalid format (must be FAM-XXXXXX)
  400 — Cannot join own family
  404 — Code not found
  429 — Rate limited (5-min window per IP)
```
- Format must be `FAM-` followed by 6 alphanumeric characters (case-insensitive accepted, server upcases)
- Rate limiting: 429 means wait 5 minutes

### Family Code — Regenerate
```
POST /api/family/code/regenerate
Body: { "familyId": "uuid" }

Response 200: { "familyCode": "FAM-NEW123" }
```
- Only for family creator

### Send Email Invite
```
POST /api/family/invite
Body: { "email": "player@example.com", "role": "player" | "parent" }

Response 200: { "success": true, "invitationId": "uuid" }
Errors:
  400 — email or role missing/invalid
  403 — caller not a family member
  409 — this person is already a member
```
- Sends invite email automatically (non-blocking, does not fail if email fails)
- Caller must already be a family member

### Look Up Invite by Token (PUBLIC — no auth needed)
```
GET /api/family/invite/:token

Response 200:
{
  "invitationId": "uuid",
  "email": "player@example.com",
  "role": "player" | "parent",
  "familyName": "Smith Family",
  "inviterName": "Jane Smith",
  "emailExists": true,   // whether this email already has an account
  "prefill": {           // optional, only present for player invites when parent pre-entered details
    "firstName": "Alex",
    "lastName": "Smith",
    "graduationYear": 2027,
    "sport": "Soccer",
    "position": "Forward"
  }
}

Errors:
  404 — token not found
  409 — invite already accepted/declined (status != 'pending')
  410 — invite expired
```

### Accept Invite (REQUIRES AUTH)
```
POST /api/family/invite/:token/accept

Response 200: { "success": true, "familyUnitId": "uuid", "emailMismatch": false }
Errors:
  400 — no token
  404 — invite not found
  409 — invite not pending
  410 — expired
```
- Idempotent: if user is already a member, returns success
- `emailMismatch: true` when logged-in user's email differs from invited email (allowed but flagged)

### Decline Invite (NO AUTH REQUIRED)
```
POST /api/family/invite/:token/decline

Response 200: { "success": true }
Errors: 404, 409, 410 (same as above)
```

### List Pending Invitations (sent by my family)
```
GET /api/family/invitations

Response 200:
{
  "invitations": [
    {
      "id": "uuid",
      "invited_email": "player@example.com",
      "role": "player",
      "status": "pending",
      "expires_at": "2026-04-01T...",
      "created_at": "2026-03-01T...",
      "invited_by": "uuid"
    }
  ]
}
```
- Only returns `status = 'pending'` invitations for the caller's family

### Revoke Invitation
```
DELETE /api/family/invitations/:id

Response 200: { "success": true }
```

### Family Members List
```
GET /api/family/members?familyId=uuid

Response 200:
{
  "success": true,
  "familyId": "uuid",
  "members": [
    {
      "id": "membership_uuid",
      "family_unit_id": "uuid",
      "user_id": "uuid",
      "role": "parent" | "player",
      "added_at": "timestamp",
      "users": { "id": "uuid", "email": "...", "full_name": "...", "role": "..." }
    }
  ],
  "count": 2
}
```

### Remove Family Member
```
DELETE /api/family/members/:memberId

Response 200: { "success": true }
```

### Save Player Details (parent pre-fill for invite)
```
POST /api/family/player-details
Body: {
  "playerName": "Alex Smith",
  "playerDob": "2010-06-15",    // YYYY-MM-DD, for COPPA check
  "graduationYear": "2027",
  "sport": "Soccer",
  "position": "Forward"
}

Response 200: { "success": true }
```
- Saves to `family_units.pending_player_details` (JSONB)
- Used to pre-populate the invited player's onboarding form

---

## User Flows

### Flow 1: New Account Signup

**Web page:** `/signup`

1. User selects role: **Player** or **Parent**
2. Fills in: First Name, Last Name, Email, Date of Birth, Password, Confirm Password, Terms agreement
3. **COPPA age gate:** If DOB < 13 years old → block with error message. Parent signups blocked from using a minor's info (they use their own DOB).
4. On success:
   - Creates Supabase auth user
   - Upserts `users` table row (id, email, full_name, role, date_of_birth)
   - Calls `POST /api/family/create` to create their family immediately
   - Redirects → `/onboarding/parent` (parent) or `/onboarding` (player)

**iOS equivalent:** Signup screen with role picker → form → COPPA check → create family → route to onboarding.

---

### Flow 2: Parent Onboarding Wizard

**Web page:** `/onboarding/parent` (requires auth, parent role)

**Step 1 — Player Details:**
- Fields: Player name (optional), Player DOB (required, COPPA enforcement), Graduation Year, Sport, Position
- DOB required: player must be ≥ 13. Shows age-gate error if < 13.
- On "Next": calls `POST /api/family/player-details` with all entered values, advances to step 2
- Next button is disabled until DOB is entered AND player is ≥ 13

**Step 2 — Invite Player:**
- Input: Player's email address
- "Send invite" button → calls `POST /api/family/invite` with `{ email, role: "player" }`
- Also displays family code (from `GET /api/family/code/my-code`) for manual sharing
- Copy button copies code to clipboard
- "I'll invite them later" skips and goes to `/dashboard`
- After sending invite, goes to `/dashboard`

**Note:** Family is created automatically when the parent arrives at `/onboarding/parent` (via signup flow). If they already have a family, `createFamily` is idempotent.

---

### Flow 3: Email Invite — Recipient Opens Link

**Web page:** `/join?token=<uuid>`
**iOS:** Universal link `https://therecruitingcompass.com/join?token=<uuid>` intercepted natively.

**Step 1 — Load invite details:**
Call `GET /api/family/invite/:token` (no auth needed).

**Error states to handle:**
- No token → "Invite not found"
- 404 → "This link is invalid or already used"
- 409 → "Already connected" (invite accepted/declined)
- 410 → "This invite has expired — ask sender to resend"

**Step 2 — Branch on `emailExists`:**

#### A. User already has account (`emailExists: true`):
- Show: "Log in to connect your account"
- Show email pre-filled (read-only), password input
- Buttons: **Log in and connect** | **Decline**
- On submit: login → `POST /api/family/invite/:token/accept` → show "You're connected!" toast → navigate to Dashboard

#### B. New user (`emailExists: false`):
- Show signup form with email pre-filled (read-only)
- Fields: First Name, Last Name, Date of Birth (required for player role), Password, Confirm Password, Terms
- If `prefill` present in invite response, pre-populate First Name, Last Name
- Buttons: **Create account and connect** | **Decline invitation** | Link to login
- On submit:
  1. Sign up with Supabase auth
  2. Upsert `users` table row (include DOB for player role)
  3. Call `POST /api/family/invite/:token/accept`
  4. Show "You're connected!" toast
  5. If role == "parent" → navigate to Dashboard
  6. If role == "player" → navigate to onboarding with prefill query params:
     - `?graduationYear=2027&sport=Soccer&position=Forward`

#### C. User is already authenticated:
- Show: "Connecting as [user email]"
- If authenticated user's email ≠ invite email, show amber warning: "Invite was sent to [email]"
- Buttons: **Connect to [Family Name]** | **Decline**
- On connect: `POST /api/family/invite/:token/accept` → toast → Dashboard

**Decline flow (any branch):**
- Call `POST /api/family/invite/:token/decline` (no auth needed)
- Show "Invitation declined" confirmation screen

---

### Flow 4: Join via Family Code

**Web page:** `/settings/family-management`

User enters a family code (format: `FAM-XXXXXX`).
- Validate format before submitting
- Call `POST /api/family/code/join` with `{ familyCode }`
- On success: show "Joined [Family Name]!" and refresh family context
- Errors:
  - 400 invalid format: "Invalid code format. Must be FAM-XXXXXX"
  - 404: "Code not found — double-check and try again"
  - 400 own family: "You can't join your own family"
  - 429: "Too many attempts. Wait 5 minutes."

---

### Flow 5: Family Management Screen

**Web page:** `/settings/family-management`

**For players:**
- Shows their family code (copy button)
- Lists family members
- Regenerate code button
- Send invite (by email) to add parents
- Remove a family member

**For parents (no athlete connected):**
- Dashboard shows `ParentOnboardingBanner`:
  - If no player in family: amber banner "Connect your athlete to get started — invite them or share your family code" → link to family management
  - When player joins: brief green "You're connected! Your athlete has joined your family" (auto-hides, acknowledged once via localStorage)

**Family management page — pending invites section:**
- Lists pending email invitations (from `GET /api/family/invitations`)
- Each pending invite shows: email, role, sent date, expiry date
- Revoke button → `DELETE /api/family/invitations/:id`

---

### Flow 6: Family Code in Profile

**Web component:** `Header/HeaderProfile.vue`

The family code appears in the user's profile dropdown menu:
- Fetches on open via `GET /api/family/code/my-code`
- Displays `FAM-XXXXXX` with a copy button
- Players: shows their family's code
- Parents: shows code for their first family (if multi-family, show primary)

---

## Business Rules & Validation

### Family Code Format
- Pattern: `FAM-` + exactly 6 alphanumeric characters (uppercase)
- Example: `FAM-A3X9K2`
- Client-side regex: `/^FAM-[A-Z0-9]{6}$/i`

### COPPA Age Gate (13+)
- Applies to: player signup, invite signup for players, parent's player details step
- Check: `age = today.year - dob.year - (today < dob_this_year ? 1 : 0)`
- If `age < 13`: block with message "Players must be 13 or older"
- For parent signup: parent's own DOB is collected (not the player's) — parent age gate is also 13+

### Invite Token
- Format: UUID v4
- Expires: 30 days after creation (NOT 7 days — updated in migration `20260301000003`)
- Statuses: `pending` → `accepted` | `declined` | `expired`
- Decline does NOT require authentication
- Accept DOES require authentication

### Symmetric Family Creation
- Both players and parents create their own family on signup
- A player's family = the player IS the family (they're the player member)
- A parent invites the player → player accepts → player is added to parent's family (or vice versa)
- A user can be a member of multiple families (parents especially)
- `created_by_user_id` is just an audit field — not used for access control
- RLS uses `family_members` membership for all access

### Email Mismatch
- When accepting an invite, the API checks if the logged-in user's email matches `invited_email`
- If mismatch: still succeeds, but `emailMismatch: true` is returned
- Show a non-blocking info message: "This invite was sent to [invited email], but you accepted it with [your email]"

---

## iOS Implementation Checklist

### Network Layer
- [ ] `FamilyService` / `FamilyRepository` — wraps all family API calls
  - `createFamily()` → POST /api/family/create
  - `fetchMyCode()` → GET /api/family/code/my-code
  - `joinByCode(code:)` → POST /api/family/code/join
  - `regenerateCode(familyId:)` → POST /api/family/code/regenerate
  - `sendInvite(email:role:)` → POST /api/family/invite
  - `fetchInviteDetails(token:)` → GET /api/family/invite/:token (no auth)
  - `acceptInvite(token:)` → POST /api/family/invite/:token/accept
  - `declineInvite(token:)` → POST /api/family/invite/:token/decline
  - `fetchInvitations()` → GET /api/family/invitations
  - `revokeInvitation(id:)` → DELETE /api/family/invitations/:id
  - `fetchMembers(familyId:)` → GET /api/family/members?familyId=
  - `removeMember(memberId:)` → DELETE /api/family/members/:id
  - `savePlayerDetails(...)` → POST /api/family/player-details

### Models
- [ ] `FamilyUnit` — id, familyCode, familyName, createdByUserId, pendingPlayerDetails
- [ ] `FamilyMember` — id, familyUnitId, userId, role, addedAt, user (nested)
- [ ] `FamilyInvitation` — id, invitedEmail, role, status, expiresAt, createdAt, invitedBy
- [ ] `InviteDetails` — invitationId, email, role, familyName, inviterName, emailExists, prefill?
- [ ] `PendingPlayerDetails` — playerName, playerDob, graduationYear, sport, position
- [ ] Prefill model: firstName, lastName, graduationYear?, sport?, position?

### Views / Screens

#### Signup
- [ ] `SignupView` — role picker (Player/Parent), then form
- [ ] COPPA age gate: DOB field + validation (block if < 13)
- [ ] On success: `createFamily()` + route to onboarding

#### Parent Onboarding
- [ ] `ParentOnboardingView` — 2-step wizard
  - Step 1: Player details (name, DOB, grad year, sport, position)
  - Step 2: Invite by email OR show family code to share
- [ ] DOB validation in step 1 (player age gate)
- [ ] Family code display with copy-to-clipboard

#### Join via Invite Link
- [ ] Universal link handler for `therecruitingcompass.com/join?token=`
- [ ] `InviteJoinView` — handles all 3 auth states:
  - Authenticated → Connect button + Decline
  - Not authenticated, email exists → Login form
  - Not authenticated, no account → Signup form with prefill
- [ ] Error screens: expired (410), already used (409), not found (404)
- [ ] Decline flow (no auth required)
- [ ] Post-accept routing: player → onboarding with prefill params; parent → dashboard

#### Family Code Entry
- [ ] `JoinByCodeView` — text field, validate format, submit, handle errors
- [ ] Rate limit UI: disable for 5 minutes on 429

#### Family Management
- [ ] `FamilyManagementView`
  - Family code display + copy + regenerate
  - Member list
  - Pending invitations list (with revoke)
  - Add member by email (player or parent role)
  - Join by code (for parents)

#### Dashboard
- [ ] `ParentOnboardingBanner` — shown to parents with no player in family
  - Amber "Connect your athlete" banner → link to family management
  - Green "You're connected!" flash after player joins (dismiss once, persist in UserDefaults)
- [ ] `ParentNoAthleteEmptyState` — empty dashboard for unconnected parents

#### Profile
- [ ] Family code display in profile/settings panel with copy button

---

## State Management

```
FamilyStore / FamilyViewModel:
  - currentFamilyId: String?
  - currentFamilyCode: String?
  - familyMembers: [FamilyMember]
  - parentAccessibleFamilies: [FamilyContext]
  - pendingInvitations: [FamilyInvitation]
  - isParentWithNoAthlete: Bool (computed: isParent && no player in familyMembers)
```

Parent can belong to multiple families. The "active" family for parents is whichever one they're currently viewing (selectable, like AthleteSwitcher on web).

---

## Universal Link Setup

Already configured in web app at `public/.well-known/apple-app-site-association`.

**iOS app side:**
- Add `therecruitingcompass.com` as Associated Domain: `applinks:therecruitingcompass.com`
- Handle in `AppDelegate` / `Scene` with `onOpenURL`
- Parse token from URL: `URLComponents(url:...).queryItems?.first(where: { $0.name == "token" })?.value`
- Present `InviteJoinView(token:)`

---

## Email Template Reference

Invite email subject line: `"[inviterName] invited you to join [familyName] on The Recruiting Compass"`

The invite email includes a link: `https://therecruitingcompass.com/join?token=<uuid>`

---

## Testing Scenarios

1. Parent creates account → auto-creates family → enters player details → sends email invite → player receives link → opens app via universal link → signs up → connected → parent sees green banner then it disappears permanently
2. Parent creates family code → shares manually → player enters code in app → joined → family shows player
3. Player creates account → shares family code → parent enters code → parent joins player's family
4. User opens expired invite link (410)
5. User opens already-accepted invite link (409)
6. User on invite link is already logged in with a different email → email mismatch warning
7. Parent sends invite to existing user → login flow → accept
8. Rate limiting: enter wrong code 5x → 429 → disabled for 5 min
9. Decline invite → confirmation, no family membership created

---

## Notes for iOS Claude

- The **decline endpoint does not require auth**. Use a plain `URLRequest` without the auth header.
- The **invite lookup endpoint** (`GET /api/family/invite/:token`) also does not require auth. Use plain fetch.
- All other endpoints require `Authorization: Bearer <accessToken>`.
- CSRF is not enforced on mobile clients (the CSRF middleware is configured to skip non-browser requests).
- Family code format must be validated client-side before submission to avoid unnecessary 400 errors.
- `emailMismatch` in the accept response is informational only — the accept still succeeds.
- The `pending_player_details` JSONB field is internal — it doesn't need to be displayed to users, only used to pre-populate the invited player's onboarding form via the `prefill` field in `GET /api/family/invite/:token`.
- Sport/position lists live in the web app at `pages/onboarding/parent.vue` — see `commonSports` and `sportPositions` dictionaries. Replicate these on iOS.
