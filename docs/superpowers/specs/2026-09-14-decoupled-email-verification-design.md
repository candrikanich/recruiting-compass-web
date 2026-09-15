# Decoupled Email Verification — Design Spec

**Date:** 2026-09-14
**Status:** Approved for planning
**Author:** Claude (session), reviewed by Chris Andrikanich

## Problem

Prod enforces Supabase's native email-confirmation, which withholds the auth
session (and blocks login) until the user clicks the confirmation link. This
hard-blocks new signups at `/verify-email` with no way into the app —
contradicting the intended low-friction flows below. QA had the same toggle
enabled to test the prod behavior, exposing the block there too.

Separately, Supabase's own confirmation redirect currently lands on `/`
(welcome page) with no acknowledgment the account exists or was verified, no
session-aware routing, and no CTA.

## Target flows

**Parent-start:**
`Start Now → Create Account → Player Onboarding → Dashboard` (email-verify
notice + invite-player notice shown as dashboard tasks, not blockers).
Verification email sent in parallel.

**Player-start:**
`Start Now → Create Account → Bring Parent Along (guardian) → Player
Onboarding → Dashboard` (email-verify notice shown as a dashboard task).
Verification email sent in parallel.

**Player accepting a parent's invite:**
`Get invite email → Click link → Create Account → Onboarding → Join Family →
Dashboard`. No separate verify-email step — clicking the invite link already
proves ownership of that address.

**Parent confirming a player-initiated guardian invite:**
`Confirm Player Email (guardian claim link) → Create Account → Dashboard`.
Same: the claim-link click is the verification.

In every case the user reaches an authenticated dashboard immediately after
account creation. Verification becomes a background task, not a gate.

## Existing building blocks (confirmed present on `develop`, not rebuilt here)

- Guardian-invite (player names a guardian during signup): `components/Auth/SignupStepGuardian.vue`,
  `pages/guardian/claim/[token].vue`, `server/api/guardian/claim/[token]/accept.post.ts`,
  `server/api/guardian/claim/[token]/index.get.ts`, `server/api/guardian/resend.post.ts`,
  `server/utils/guardianGate.ts`.
- Family-invite (parent invites a player): `components/FamilyInviteModal.vue`,
  `composables/useFamilyInvite.ts`, `server/api/family/invite.post.ts`,
  `server/api/family/invite/[token].get.ts`, `server/api/family/invite/[token]/accept.post.ts`.
- Dashboard nag banner: `components/Dashboard/EmailVerificationBanner.vue`
  (shipped PR #825, currently reads `userStore.emailVerified`, which is
  currently backed by Supabase's `email_confirmed_at` — see stores/user.ts:49-51,
  219-221).

This spec wires verification-state ownership into these, it does not
reimplement them.

## Design

### 1. Account creation issues a session immediately

New `server/api/auth/signup.post.ts`: creates the user via
`supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true,
user_metadata })` — `email_confirm: true` auto-confirms at Supabase's level
so Supabase itself never withholds a session or blocks login for this user.
Client then calls the existing `signInWithPassword` path immediately after,
same as today's post-signup sign-in — no new session-establishment code path
beyond the admin create call.

This replaces the client-side `supabase.auth.signUp()` call in
`pages/signup.vue`. The `if (!authData.data.session) { ... navigateTo
"/verify-email" }` branch (signup.vue, current ~line 505-540) is deleted —
a session is always present after this endpoint succeeds.

Applies identically to parent-start and player-start. Invite-accept paths
(`guardian/claim/[token]/accept`, `family/invite/[token]/accept`) already
create/attach accounts server-side and are updated to also set
`email_confirm: true` for consistency, though those users won't hit the
verification gate at all (see §5).

### 2. Verified-flag: `users.email_verified_at`

New migration adds `email_verified_at timestamptz null` to `public.users`
(mirrors existing `family_unit_id`-style additive-column migrations in this
repo — see `claude/database.md` conventions).

Backfill, same migration:
- `email_verified_at = auth.users.email_confirmed_at` where Supabase already
  confirmed the account (real prior confirmations, prod historical data).
- `email_verified_at = now()` for every other existing row (QA accounts
  created while `enable_confirmations = false` never had a Supabase
  confirmation to backfill from — grandfathered per decision, not nagged
  retroactively).

Only accounts created **after** this ships via the new `signup.post.ts` path
start `email_verified_at` as `null` and go through the real flow.

### 3. Verification email + token

New table `email_verification_tokens`:

```sql
create table email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);
```

RLS: service-role only (no client-side reads/writes — mirrors
`admin_audit_log` pattern). 24h expiry (`expires_at = now() + interval
'24 hours'`).

`signup.post.ts` (and a separate `server/api/auth/verify-email/resend.post.ts`
for the resend button) generate a token, insert it, and send via the
existing branded email layout (`server/utils/emailService.ts` /
`sendEmail()`) with a link to `/verify-email/[token]`.

`resend.post.ts` is session-authenticated (called from the dashboard banner
or the expired-link inline resend), not token-authenticated — it looks up
the current user, invalidates their outstanding unconsumed token(s), issues
a new one.

### 4. Verify page

New `pages/verify-email/[token].vue`. On mount, calls
`server/api/auth/verify-email/[token].post.ts`:

- **Valid, unconsumed, unexpired token** → sets `email_verified_at = now()`,
  marks token consumed, returns success. Page shows a success state, then
  routes: session present (normal case — same browser that signed up) →
  dashboard; no session (link opened on a different device/browser) →
  `/login` with a success banner ("Email verified — log in to continue").
- **Expired token** → inline "Resend verification email" button (calls the
  authenticated resend endpoint if a session exists; otherwise prompts for
  email + password... no — simplest: if no session, direct to `/login`,
  since resend requires knowing who you are and login already re-establishes
  that context safely). No dead end either way.
- **Already consumed** (double-click, stale tab) → treat as success, same
  routing as the valid case — idempotent, not an error.

### 5. Invite-accept paths stamp verification directly

`server/api/guardian/claim/[token]/accept.post.ts` and
`server/api/family/invite/[token]/accept.post.ts` both set
`email_verified_at = now()` on the accepting user's row as part of the
existing accept transaction — the invite-link click to an address only the
recipient controls is the proof. These users never see the verify-email
flow or the dashboard banner.

### 6. Dashboard banner repointed

`stores/user.ts` gains a fetch/read of `email_verified_at` from the user's
row (alongside the existing `email_confirmed_at`-based Supabase read) and
`isEmailVerified` is repointed to the new column as the source of truth.
`components/Dashboard/EmailVerificationBanner.vue` needs no changes — it
already only reads `userStore.emailVerified`.

### 7. Native Supabase confirm-email OFF

Manual step (Supabase Studio dashboard, not code) once this ships: disable
`enable_confirmations` in both prod and QA projects. `supabase/config.toml`
already has this `false` locally — no repo change needed there, just
confirming the two hosted projects match. Documented as a launch-checklist
item, not part of the PR diff.

### 8. Retired

- `pages/verify-email.vue` (the old blocking page) is deleted.
- `docs/history/auth.md`'s stale "players must verify before accessing app
  features" line is corrected to describe the new async model.

## Out of scope

- Rate-limiting the resend endpoint beyond basic abuse prevention (flagged
  for the implementation plan to size, not a blocker for this spec).
- Any change to the guardian/family-invite UX itself beyond the
  verification stamp.
- Player-start's "Bring Parent Along" UI/copy — already built, unchanged.

## Open items for the implementation plan

- Exact copy/design for the verify-page success and expired states.
- Whether `resend.post.ts` needs rate-limiting (e.g. 1/min) — likely yes,
  size during planning.
