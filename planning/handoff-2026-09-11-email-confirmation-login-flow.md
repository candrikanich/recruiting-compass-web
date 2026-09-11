# Handoff: Email-confirmation signup/login flow

## Where this started

Chris saw "Unable to verify user session" on the admin-signup verify-email
page and asked: is hard-blocking users behind email confirmation an
anti-pattern? Should we let them into the app immediately and nag them to
verify instead?

**Answer landed on:** yes, hard-blocking with a scary dead-end error is an
anti-pattern — but genuinely can't be avoided for anything that needs
server-side auth, because **prod enforces Supabase email confirmation**:
`auth.signUp()` returns `session: null` until the user clicks the
confirmation link. No session means no authenticated API calls at all —
there's no way to grant real app access before that, short of building a
parallel guest/local-only mode (not done — see "What's still open" below).

QA/E2E don't enforce confirm-email, so this bug class was invisible there —
it only ever showed up against prod (`lrzsenidegcqhwzwncve`).

## What was actually wrong (three real, separate bugs)

Chasing the one reported error uncovered that **regular signup was fully
broken on prod for every real new user**, not just admin signups:

1. **Bug A — regular signup 500/RLS crash.** `pages/signup.vue`'s
   post-signup flow assumed a session always exists and tried a client-side
   `users` upsert + `/api/family/create` — both RLS-gated, both fail with no
   session. Fixed in #744 (a concurrent session, landed before this one
   picked up the thread) — branches on `authData.data.session`; no session →
   skip the client-side writes, hand off to `/verify-email` instead of
   erroring.
2. **Bug B — admin `is_admin` never got set.** `pages/admin/signup.vue`
   called the authed `/api/auth/admin-profile` endpoint via bare `$fetch`
   instead of `$fetchAuth` — 401'd every time, independent of confirm-email.
   Fixed in #749. Since admin signup can also hit the no-session case, the
   validated `adminToken` intent is now carried across the confirmation gap
   as `pending_admin` in `signUp()`'s metadata and applied lazily on first
   sign-in (`server/api/auth/admin-profile.post.ts` trusts it from the
   caller's own verified JWT — not the client request body).
   **Unverified on prod** — needs `ADMIN_TOKEN_SECRET` to test. Tracked in
   [#758](https://github.com/candrikanich/recruiting-compass-web/issues/758).
3. **Bug C — the reported error itself.** `useEmailVerification.ts`'s
   `checkEmailVerificationStatus()` treated "no session yet" (the expected
   pre-confirmation state) as a hard error. A first attempted fix (#746)
   didn't actually work — it assumed `getUser()` returns
   `{user: null, error: null}` with no session, but `supabase-js` actually
   returns `error: AuthSessionMissingError` (verified against `auth-js`
   source). Real fix in #749: distinguish `AuthSessionMissingError` from
   genuine failures.
4. **A P0 found along the way, unrelated to any of the above:**
   `family_units.inbound_token` (added by the inbound-email feature,
   #586/#622, 2026-09-06/07) is `NOT NULL` with a ready-made
   `generateInboundToken()` util — but `server/api/family/create.post.ts`
   never called it. **Every new family creation had been 500ing on prod
   since Sept 7.** Fixed in #752. Also had to backfill the E2E Supabase
   project's schema (it never got the `inbound_token` column at all —
   separate, already-documented drift) and its test-seed helpers, since
   bringing that schema in line broke E2E tests that insert into
   `family_units` directly (#754).

## The shape of the fix (what to reuse if touching this again)

Branch on **whether `signUp()`/`signInWithPassword()` actually returned a
session**, never on environment — QA/E2E happen to get one immediately,
prod doesn't, and that must stay a runtime check, not a hostname check.

- **No session at signup** → skip client-side writes that need `auth.uid()`,
  hand off to `/verify-email` (existing page already had good pending-state
  UI — amber icon, "check your email", resend button — the bug was just that
  an error was stacked on top of it).
- **Deferred writes complete on first real sign-in**, not at signup time.
  Originally this only ran from `pages/login.vue`'s explicit form submit —
  but Supabase's own confirmation-link email lands the user on `/` (redirect
  to the Site URL) and establishes a session there directly, **never
  touching `/login`**. That silently skipped provisioning for anyone who
  didn't separately re-enter credentials afterward.

  Fixed by moving the deferred-write logic into
  `composables/useAccountProvisioning.ts`, called from
  `plugins/auth.client.ts`'s existing `supabase.auth.onAuthStateChange`
  listener on `SIGNED_IN` — that fires for *every* session-establishing
  event (explicit login, the confirmation-link redirect, magic links,
  anything else that shows up later), so it closes the gap at its one real
  chokepoint instead of special-casing more pages. `login.vue`'s own
  duplicate call was removed once this landed (#756).
- `/api/family/create` is idempotent (checks for an existing family first) —
  safe to call on every sign-in unconditionally.
- `pending_admin` metadata: set once at signup (server-validated
  `adminToken`, never re-trusted from the client later), read back from the
  session's own verified JWT on first sign-in to apply `is_admin` — this is
  the only piece with a real privilege-escalation surface, reviewed
  specifically for that.

## Current state (as of this handoff)

Shipped and confirmed working on prod (live DB queries + a real disposable
signup/confirm/login cycle):
- Regular signup no longer 500s / RLS-crashes.
- `/verify-email` shows the pending state with no false error.
- `family_units` (and `family_members`) get created on first sign-in.
- The confirm-link → `/` (not `/login`) path now also triggers provisioning
  — was a real gap, closed same day it was found.

Not yet confirmed on prod:
- Bug B's `is_admin` lazy-apply — [#758](https://github.com/candrikanich/recruiting-compass-web/issues/758), needs `ADMIN_TOKEN_SECRET`.

## What's still open / explicitly not done

- **True pre-confirmation app access was never built.** The current design
  is "no dead-end, graceful handoff, then real access the moment a session
  exists" — not "browse the app before confirming." If product actually
  wants the latter (e.g., let a new user start onboarding immediately,
  store answers locally, sync once confirmed), that's a real feature, not a
  bug fix — needs its own design pass (local-storage draft state, a sync
  step on first login, deciding what's safe to let an unauthenticated
  visitor see/do). Flag this explicitly if that's the actual ask, don't
  half-build it as a side effect of another fix.
- **Vercel deploy pipeline got flaky mid-session** — pushes to `main` (and
  at one point `develop` too) stopped auto-triggering builds; had to
  manually promote a develop build via dashboard/CLI each time. Not
  diagnosed (no Vercel git-integration access from this session) — worth
  checking Project Settings → Git if it keeps happening.
- **`SUPABASE_ACCESS_TOKEN` CI secret is broken** (org-scoped vs
  project-scoped PAT mismatch, pre-existing per `claude/database.md`) —
  `migrate-qa-e2e.yml` and `migrate-prod.yml` both fail on every push
  regardless of whether a migration is actually pending. Worked around by
  applying migrations directly via Supabase MCP this session; needs a real
  token rotation to stop being a recurring false-alarm.
- **Cloudflare Turnstile behaves differently Chrome vs Safari** (Chrome's
  bot-signals let the managed challenge pass silently more often; Safari
  triggers the visible checkbox more) — observed during manual prod
  testing, not investigated further. Cloudflare's own heuristic, not
  necessarily an app bug, but worth knowing if it becomes a support
  complaint.

## Key files

- `pages/signup.vue`, `pages/admin/signup.vue` — session-branch on signup
- `pages/verify-email.vue`, `composables/useEmailVerification.ts` — pending-state UI, `AuthSessionMissingError` handling
- `composables/useAccountProvisioning.ts`, `plugins/auth.client.ts` — deferred-write backfill on every `SIGNED_IN`
- `composables/useAuth.ts` — `dateOfBirth`/`pendingAdmin` metadata threading
- `server/api/family/create.post.ts`, `server/utils/familyInboundToken.ts` — the P0 fix
- `server/api/auth/admin-profile.post.ts` — `pending_admin` trust path
- `supabase/migrations/20260910200619_handle_new_user_date_of_birth.sql`,
  `supabase/migrations/20260906000000_family_inbound_token.sql` — relevant migrations

## PRs, in order

#744, #746 (concurrent session, partial fixes) → #749, #750 (this session:
real fixes + migration collision) → #752 (P0 inbound_token) → #754 (E2E
schema catch-up) → #756 (confirm-link provisioning gap).
