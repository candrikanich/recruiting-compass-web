# Plan — Minor Consent via Parent-Led Family Invite (N1)

**Date:** 2026-08-16
**Owner:** Chris
**Decision:** Option 1 — athletes under 18 cannot create a standalone account; they join
through a parent/guardian who creates the family unit and invites them. The parent's
invite is the record of consent. Matches the product concept (parent + player work the
recruiting process together).
**Platforms:** Web (Nuxt) + iOS (SwiftUI) — kept in sync.
**Companion:** `planning/2026-08-16-legal-policy-review.md`, `planning/handoff-2026-08-16-legal-missing-pieces.md`

## Age bands (final)

| Age | Can self-register? | Path |
|---|---|---|
| Under 13 | **No** — blocked | Hard block + attestation (already built: DB trigger `trg_enforce_minimum_age`, client gate) |
| 13–17 | **No** — this plan | Parent creates family unit → invites minor → minor accepts invite |
| 18+ (player) | Yes | Standalone player signup allowed |
| Parent (any) | Yes | Standalone parent signup allowed |

## Consent model

- **The parent/guardian is the contracting party** for a minor's account (already stated in
  Terms §1 + §11).
- **Consent event = the parent inviting the minor** from within their family unit, having
  themselves accepted the Terms. That act is logged.
- Record on the minor's `users` row at invite-accept time:
  - `guardian_consent_at timestamptz`
  - `guardian_consent_by uuid` (the parent user id)
  - `guardian_consent_terms_version text` (e.g. "2026-03-01")

---

## Phase 0 — Verify current flows (no code)

- [ ] Confirm invite-accept path sets `family_unit_id` on the new minor user row (grep
      `useFamilyInvite`, join accept endpoint / RPC).
- [ ] Confirm parent signup never collects DOB (so 18+ check only gates `role=player`).
- [ ] Confirm where the player row is first inserted (browser→Supabase direct vs endpoint) —
      determines where the server guard must live.

## Phase 1 — Web: client gate on solo player signup

Files: `components/Auth/SignupForm.vue`, `pages/signup.vue`, `utils/age.ts`

- [ ] Compute age from DOB (reuse `utils/age.ts`).
- [ ] If `userType === 'player'` and age `>= 13 && < 18`:
  - Disable "Create Account" submit.
  - Show an inline panel (DesignSystem component, not raw): "Recruiting Compass is built for
    families. Athletes under 18 join when a parent or guardian sets up the account and invites
    them." CTA → route to a parent-start page (`/signup?role=parent` or a short explainer).
- [ ] Keep the existing under-13 block + attestation unchanged (age `< 13`).
- [ ] 18+ player and any parent: unchanged.

## Phase 2 — Web: server/DB enforcement (client gate is bypassable)

Prefer DB-layer so signup (direct-to-Supabase), invite, and profile all covered in one place.

- [ ] Extend the users trigger: if `role='player'` and age `>= 13 && < 18` and
      `family_unit_id IS NULL` → `RAISE check_violation` ("minors must join via a family
      invitation"). Fails open on NULL DOB (same convention as `trg_enforce_minimum_age`).
- [ ] Ensure invite-accept sets `family_unit_id` **in the same transaction** as the insert, so
      a legitimately-invited minor passes the trigger. Verify ordering; adjust accept RPC if it
      inserts-then-updates.
- [ ] Migration file: `supabase/migrations/2026XXXX_minor_requires_family.sql`. Apply live via
      Supabase MCP `apply_migration` (local `db push` is broken — see CLAUDE.local.md).
- [ ] Backfill check: query for existing `role=player` rows age 13–17 with NULL
      `family_unit_id` before applying; resolve or the trigger only affects new writes anyway
      (trigger is INSERT/UPDATE-time; existing rows untouched).

## Phase 3 — Web: record consent at invite-accept

Files: family-invite accept path (`useFamilyInvite`, accept endpoint/RPC), migration

- [ ] Add `guardian_consent_at`, `guardian_consent_by`, `guardian_consent_terms_version`
      columns to `users` (same migration as Phase 2 or adjacent).
- [ ] On invite accept for a minor: stamp the three columns (parent = inviter, version =
      current Terms date).
- [ ] Surface nothing in UI yet; this is a compliance record.

## Phase 4 — iOS parity

Files: `Features/Auth/Views/SignupView.swift`, `Features/Auth/ViewModels/SignupViewModel.swift`,
`Core/Utilities/COPPAHelper.swift`, `Features/Family/*` (InviteJoin, ParentOnboardingWizard)

- [ ] Extend `COPPAHelper` (or view model) with an `isUnder18(dob:)` check alongside the
      existing under-13 logic. Keep the hard under-13 block.
- [ ] `SignupView`: if player DOB is 13–17, block standalone creation and show the same
      "join via a parent" messaging + route to the parent/family path.
- [ ] Confirm the iOS invite-accept path also lands `family_unit_id` (server trigger from
      Phase 2 protects both clients, so iOS gets enforcement for free once applied).
- [ ] No under-13 changes.

## Phase 5 — iOS legal text sync (folds in the whole legal update)

Files: iOS `PrivacyPolicyView` / `TermsOfServiceView` string sources + their view models/tests

- [ ] Replace hardcoded legal strings with the **current web content** (Mar 1 2026 +
      today's additions): arbitration + class waiver + **30-day opt-out**, Fit Score
      disclaimer, CCPA + other-state rights + minors + GPC, DMCA, General Provisions, and the
      **new minor-consent clauses** (Terms §1 + §11).
- [ ] Fix `lastUpdated` timestamp (currently resolves to Feb 2025) to the new revision date.
- [ ] Update the Legal test suites (`PrivacyPolicyTests`, `TermsOfServiceTests`, section-count
      assertions) to the new content.

## Phase 6 — Tests

- [ ] Web unit: age-band routing (12→block, 13–17→invite-path, 18→allow, parent→allow).
- [ ] Web: DB trigger rejects a 13–17 player insert with NULL `family_unit_id`; allows one
      with a family unit (RED before migration, GREEN after).
- [ ] Web: invite-accept stamps the three consent columns.
- [ ] iOS: `COPPAHelper` under-13 + under-18 branch tests; SignupViewModel routing test.
- [ ] E2E (web): minor solo signup is blocked and shows the parent-invite message.

## Open items (not this plan)

- Physical/registered-agent **address** — staying placeholder per Chris (blocks CAN-SPAM +
  public launch when marketing starts).
- ⚖️ Arbitration baseline boilerplate (informal-resolution-first, delegation, mass-arb,
  fee allocation, jury waiver, class-waiver severability) — add to §12 pending, then counsel.
- ⚖️ Fit Score/NCAA — counsel confirms disclaimer + user-responsibility + contact-window
  enforcement is sufficient; then reword §16 note.
- ⚖️ Attorney checklist — see legal-policy-review.md.

## Sequencing

Phase 0 → 1 → 2 (migration, live-apply) → 3 → 6 (web tests) — ship web. Then 4 → 5 → 6
(iOS) — ship iOS with legal sync in the same release.
