# Guardian-Optional Signup Wizard — Design Spec

**Date:** 2026-09-12
**Author:** Chris Andrikanich + Claude (session `session_01HSvz41NDH4pBfc4uokbn4K`)
**Status:** Approved, pending implementation plan
**Scope:** Web only. iOS is a deliberate follow-up (see "iOS Parity" below).

## Problem

`pages/signup.vue` collects ~10 fields (name, DOB, guardian email, player email,
password ×2, grad year, sport, gender, zip) on a single scrolling form. Testing the
funnel pre-launch, this reads as a wall of friction before a 13-17 athlete ever sees
the product — the audience this app most needs to hook.

The guardian-email field is the biggest offender: it's presented as a blocking
requirement at the very top of account creation ("You're under 18, so a parent or
guardian needs to confirm your account"), which reads as "you can't have an account
without your parent" even though that's not actually true today (PR #784 already lets
the player initiate the link themselves) and was never a legal requirement (COPPA
covers under-13 only; the 13-17 gate was an unreviewed product decision, not
liability-driven).

Competitor recruiting platforms (NCSA, CaptainU, SportsRecruits) let the athlete sign
up solo, profile-first, with no parent gate at all — parent involvement is added later,
optionally. This app's actual goal is different from theirs: the point isn't just
"get the athlete recruited," it's family collaboration and transparency. So the
guardian link should stay a first-class, encouraged feature — just not a blocking
step wedged into account creation.

## Goals

- Player can create an account with the fewest fields possible (name, DOB, email,
  password) and land on their dashboard fast.
- Guardian involvement is presented as a value-add ("bring a parent along"), not a
  compliance gate — its own step, immediately after account creation, and skippable.
- Skipping is a real, permanent-until-they-act state, not a soft nag that secretly
  still blocks something. A player can use the app solo indefinitely.
- Coach-messaging and profile-publishing stay locked until a guardian actually
  confirms — skipping the invite step must not silently unlock these (see Guardian
  Gate Fix below; this is the one place the current implementation would get this
  wrong if we shipped the wizard without it).
- Onboarding fields (grad year, sport, gender, zip) move to their own step — these
  stay **required** (grad year: recruiting timeline; sport: why the user is here;
  zip: recommended-schools proximity) except gender and zip, which stay optional,
  matching today's schema exactly.
- No change to the 13-and-up floor (`trg_enforce_minimum_age`, COPPA-driven, out of
  scope) or to the existing parent-initiated invite flow (a parent signing up first
  and inviting a player is untouched).

## Non-Goals

- Not building iOS screens in this plan (see "iOS Parity").
- Not changing the parent/adult-player signup path — this only affects the 13-17
  player path.
- Not backfilling `guardian_consent_at` for legacy accounts — there are none. This app
  has not launched; the only non-Chris user is his son's test account. If that
  assumption changes before this ships, the Guardian Gate Fix section needs revisiting
  first.

## Current State (for reference)

- `pages/signup.vue` / `components/Auth/SignupForm.vue` — single form, all fields,
  one submit.
- `server/api/auth/signup-minor.post.ts` (PR #784) — for a 13-17 player: creates the
  `auth.users` row via `supabase.auth.signUp()` (metadata carries `pending_*` fields,
  deliberately omits `date_of_birth` so `handle_new_user()`'s auto-created
  `public.users` row lands with a NULL DOB, which the age gate fails open on), then
  creates a `guardian_claims` row, then upserts `public.users` with the real DOB now
  that the claim exists to satisfy the gate. `guardianEmail` is currently **required**
  by this endpoint (400 if missing).
- `trg_enforce_minor_requires_invite` (migration `20260822000000`, extended by PR
  #784) — a `BEFORE INSERT OR UPDATE` trigger on `public.users` that rejects a 13-17
  player row unless one of three things exists: a `family_members` row, a pending/
  accepted `family_invitations` row, or a pending `guardian_claims` row. This is the
  "always linked to a guardian" invariant we are now deliberately reversing.
- `server/utils/guardianGate.ts` (`assertGuardianConfirmed`) — locks an action
  (message-send, profile-publish) only when a **live, outstanding** `guardian_claims`
  row exists for the player. If no claim row exists at all, the function finds
  nothing and returns without throwing — **the action is unlocked**. This is the bug
  this plan must close: today it can only happen for pre-#784 accounts; after this
  plan ships a "skip" path that produces exactly that state on purpose, so shipping
  the wizard without fixing this gate would silently make guardian confirmation
  meaningless for anyone who skips.
- `server/api/family/invite/[token]/accept.post.ts` — already stamps
  `guardian_consent_at` / `guardian_consent_by` / `guardian_consent_terms_version` on
  accept (migration `20260822000000`). No change needed here.

## Design

### 1. Signup wizard (`pages/signup.vue`)

Client-side step state on the same page/route — no new routes, one Vue component
tree, existing `SignupForm.vue` split into per-step subcomponents. Applies only to
the 13-17 player path; adult players and parents keep today's single-step-then-
`/onboarding` flow unchanged.

- **Step 1 — Account.** First name, last name, DOB, email, password, confirm
  password. Submits to `supabase.auth.signUp()` (via the existing `/api/auth/
  signup-minor` endpoint, guardian fields now optional — see below). On success the
  player has a real session and a real `public.users` row. No mention of a guardian
  anywhere on this screen.
- **Step 2 — Guardian invite** (13-17 only). Framed positively: "Bring a parent or
  guardian along — they'll see what you're working on and can help." One field
  (guardian email) plus a **Skip for now** action that is equally prominent, not a
  small dismiss link. Filled in → calls the claim-creation path (folded into the
  signup-minor endpoint's second phase, or a small follow-up endpoint — implementer's
  call, no behavior difference to the user). Skipped → no write, continue.
- **Step 3 — Player info.** Graduation year (required), primary sport (required),
  gender (optional), zip code (optional) — identical fields/labels/validation to
  today's form, just isolated on their own screen.
- **Step 4 — Dashboard.** `navigateTo("/dashboard")` (or wherever the existing
  post-onboarding redirect goes today).

Back navigation between steps 1-3 should be supported (it's just local component
state), but step 1 cannot be revisited after its network call succeeds without
starting a fresh signup — same constraint as today.

### 2. `/api/auth/signup-minor` — optional guardian

`guardianEmail` changes from required (400 if absent) to optional:

- **Provided:** unchanged from today — validate it, reject if it equals the
  player's own email (existing self-guardian check stays), create the
  `guardian_claims` row, then upsert the DOB-bearing profile, then send the claim
  email.
- **Omitted:** skip the `guardian_claims` insert entirely. Upsert the full profile
  (DOB included) directly. This requires the DB migration below — without it, this
  upsert is rejected by `trg_enforce_minor_requires_invite` for having no claim to
  point to.

The endpoint's existing ordering comments (claim-before-DOB-upsert, metadata
omitting DOB so `handle_new_user()` writes a NULL-DOB row first) stay correct and
unchanged for the "provided" branch. Update the endpoint's file-header comment to
describe both branches once implemented.

### 3. DB migration — relax the invite requirement

New migration, e.g. `20260913000000_guardian_link_optional.sql`:

- Modify `enforce_minor_requires_invite()` so a 13-17 player row is no longer
  rejected for having none of (family membership / invitation / claim). The under-13
  floor (`trg_enforce_minimum_age`) is a separate trigger and is untouched.
- Keep the function and trigger in place rather than dropping them outright **only
  if** there's a still-useful invariant to enforce (there may not be one left after
  this change — implementer should check whether the trigger becomes a pure no-op and,
  if so, drop it rather than leave dead code; if some other constraint still wants
  this trigger's home, keep the shell). Document in the migration comment that this
  is a deliberate reversal of the "always linked to a guardian" rule from migration
  `20260822000000`, and why: no legal requirement (COPPA is 13-13, not 13-17), and the
  product goal is voluntary family collaboration, not a gate.
- No RLS policy changes expected — `guardian_claims` already has no SELECT policy for
  the player (service-role only); that's unaffected by whether a claim exists.
- Per [[e2e-test-project-schema-drift]]: apply this migration to the E2E test project
  (`ahpethltxopkjxxzwmmb`) as well as prod/QA (`xpxzhqghxecsjhvklsqg`), not prod-only.

### 4. Guardian gate fix (`server/utils/guardianGate.ts`)

Invert `assertGuardianConfirmed` to lock by default rather than unlock by default:

```
locked unless guardian_consent_at IS NOT NULL (or the player isn't 13-17)
```

instead of the current:

```
locked only if a live guardian_claims row happens to exist
```

Since `accept.post.ts` already stamps `guardian_consent_at` on confirmation (both the
guardian-initiated invite path and the new player-initiated claim path funnel through
compatible accept logic — confirm both call sites stamp this column during
implementation), and there is no pre-existing user population to worry about
retroactively locking, this is a straight swap: query `users.guardian_consent_at`
(or `family_members` existence, whichever the accept flow's completion state is
easiest to check) instead of `guardian_claims` presence. A player who skips step 2
has `guardian_consent_at = NULL` forever until someone actually confirms — correctly
locked. A player who invites and gets confirmed has it stamped — correctly unlocked.

### 5. Dashboard banner

The existing non-dismissible pending-guardian banner (built in PR #784 for the
"invited, awaiting confirmation" state) extends to also render for the "never named a
guardian" state — same visual treatment, same "Invite a parent or guardian" CTA,
just no claim-status line to show since there's nothing pending. One banner
component, one additional state it needs to render (no claim + no consent, vs.
claim pending + no consent, vs. consented → hidden).

## iOS Parity

Out of scope for this plan. Web is this app's source of truth for spec/implementation
(per `CLAUDE.md`); once this plan is built, tested, and merged, run the
`web-to-ios-handoff` skill against the shipped code to produce a dedicated iOS spec
(new signup wizard screens, the optional-guardian signup call, the equivalent of
`assertGuardianConfirmed`, and the banner state) as its own plan, targeting the iOS
repo, filed as its own iOS issue — matching how every other parity item in this
project's history has been handled (e.g. the sibling
`planning/2026-09-11-guardian-linked-signup-spec.md` already produced for PR #784's
own iOS follow-up). Do not build Swift in this plan or in this repo's worktree.

## Testing

- **Unit:** `guardianGate.spec.ts` — add cases for "no claim, no consent → locked"
  (the case this plan fixes) and "no claim, consent stamped → unlocked" (legacy/
  already-confirmed path). `signup-minor.post.ts` — add a no-`guardianEmail` branch:
  asserts the profile is created with DOB in one call, no `guardian_claims` row
  written, no email sent.
- **Integration/DB:** a test asserting a 13-17 `public.users` INSERT with zero
  family/invitation/claim rows now succeeds post-migration (this is the trigger
  relaxation's core assertion — write it before touching the migration, per this
  repo's Bug-Driven TDD convention).
- **Component:** wizard step transitions (Vitest) — step 1 → 2 → 3 → 4 happy path;
  skip-at-step-2 path; back-navigation within steps 1-3.
- **E2E:** full skip-path journey — signup step 1 → skip step 2 → complete step 3 →
  dashboard renders with the guardian banner → attempting to send a coach message is
  blocked → player invites a guardian from the banner later → guardian confirms via
  claim link → banner clears → message send now succeeds. Also cover the "guardian
  provided at step 2" happy path end to end, and the existing "guardian-invited path"
  regression (family-invite-first flow, still untouched) to confirm no cross-breakage.

## Open Questions

None outstanding — all resolved in the brainstorming conversation this spec is
based on. If the "no live users yet" assumption in Non-Goals changes before this
ships, re-check the Guardian Gate Fix section's blast radius before merging.
