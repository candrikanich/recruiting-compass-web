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
- Record on the minor's `users` row, stamped by the **accept endpoint** (server, service-role):
  - `guardian_consent_at timestamptz`
  - `guardian_consent_by uuid` (the parent = `family_invitations.invited_by`)
  - `guardian_consent_terms_version text` (e.g. "2026-03-01")

## ⚠️ Architecture correction (Phase 0 finding, 2026-08-16)

- **`public.users` has NO `family_unit_id` column.** Family membership lives only in the
  `family_members` join table.
- **Invite-accept is two separate requests, not one transaction:** (1) browser→Supabase-direct
  `supabase.from("users").upsert(...)` creates the minor's `users` row (`pages/join.vue:163`),
  then (2) `POST /api/family/invite/[token]/accept` inserts the `family_members` row
  (`accept.post.ts:78`) and marks the invitation `accepted`.
- Therefore a trigger cannot gate on `family_unit_id` (no column) or on a `family_members` row
  (doesn't exist yet at users-insert; normal players never get one).
- **Working discriminator: the invitation itself.** `family_invitations` has `invited_email`,
  `role`, `status` ('pending'|'accepted'|'expired'), `expires_at`. At users-upsert time the
  invitation exists as `pending` (marked `accepted` only in step 2). An invited minor has a
  matching invitation row; a solo-signup minor does not. Gate on that.

---

## Phase 0 — Verify current flows — ✅ DONE (2026-08-16)

- [x] Traced invite-accept: `users` upsert (browser-direct, `join.vue:163`) then `family_members`
      insert (`accept.post.ts:78`) — two requests. `users` has no `family_unit_id`. See
      Architecture correction above.
- [x] Parent signup collects no DOB → 18+ gate only touches `role=player`.
- [x] Player row inserted browser→Supabase-direct (no server endpoint for signup) → server guard
      must be a **DB trigger**, same as the existing under-13 gate.
- [x] **Resolved (safe):** email field is editable (`InviteSignupForm.vue:90`), BUT the accept
      endpoint already enforces strict email-binding — user email must equal `invited_email`
      case-insensitively or acceptance is blocked (`accept.post.ts:53-65`). So `email ==
      invited_email` is already a hard invariant for any successful minor join. The trigger's
      `lower(invited_email)=lower(NEW.email)` match aligns exactly; no false-reject risk (a
      wrong email just fails at signup instead of at accept — same outcome, earlier).

## Phase 1 — Web: client gate on solo player signup — ✅ DONE (2026-08-16)

Files: `utils/age.ts`, `components/Auth/SignupForm.vue`, `pages/signup.vue`

- [x] Added `ADULT_AGE = 18` + `requiresGuardianInvite(dob)` (13–17 inclusive, fails open) to
      `utils/age.ts`; unit-tested (`tests/unit/utils/age.spec.ts`, RED→GREEN).
- [x] `SignupForm.vue`: `minorRequiresGuardian` computed disables submit + shows inline
      `data-testid="minor-guardian-notice"` panel for 13–17 players. Component tests added.
- [x] `pages/signup.vue` `handleSignup`: refactored age gate to use `isUnderMinimumAge` +
      `requiresGuardianInvite` (safety net — hard-stops a 13–17 player with guidance message).
      Removed the ad-hoc inline age math.
- [x] Under-13 block + attestation unchanged. 18+ player and parents unchanged.
- [x] Verified: type-check 0, token audit 0, SignupForm 36 + age 9 + signup page 38 all pass.
- Note: parent-invited minor path (`InviteSignupForm`) intentionally NOT blocked — that is the
  approved path.

## Phase 2 — Web: server/DB enforcement via invitation-existence trigger

Client gate (Phase 1) is bypassable (browser→Supabase-direct signup). Enforce at DB layer,
gating on a matching invitation — NOT on family membership.

New trigger on `public.users` BEFORE INSERT OR UPDATE (separate from `trg_enforce_minimum_age`):

```sql
CREATE OR REPLACE FUNCTION public.enforce_minor_requires_invite()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Player, DOB present, under 18 (>=13 already enforced by trg_enforce_minimum_age)
  IF NEW.role = 'player'
     AND NEW.date_of_birth IS NOT NULL
     AND NEW.date_of_birth > (current_date - interval '18 years')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.family_invitations fi
      WHERE lower(fi.invited_email) = lower(NEW.email)
        AND fi.role = 'player'
        AND fi.status IN ('pending', 'accepted')
        AND fi.expires_at > now()
    ) THEN
      RAISE EXCEPTION 'Players under 18 must join through a family invitation'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

- [ ] Fails OPEN on NULL DOB (matches existing convention). 18+ passes (dob condition false).
      Under-13 still caught by `trg_enforce_minimum_age` (both triggers fire; either raise).
- [x] Email-match dependency resolved (Phase 0): accept endpoint already binds email to
      `invited_email`, so the trigger match is safe as written. No lock/relax needed.
- [x] Migration written: `supabase/migrations/20260822000000_minor_requires_family_invite.sql`.
      Refined vs. original design: passes on **existing family membership** too, so a joined
      minor's later profile edits aren't false-rejected once their invite expires. Added
      functional index `idx_family_invitations_invited_email_lower` for the trigger lookup.
- [x] **APPLIED LIVE 2026-08-16** via Supabase MCP (project `xpxzhqghxecsjhvklsqg`).
- [x] Pre-apply audit: `at_risk_minors = 0`.
- [x] `family_members.user_id` already indexed (`idx_family_members_user_id`); no add needed.
- [x] Verified live: trigger present, 3 consent columns present, reject path proven (under-18
      no-invite insert rejected via DO block).
- [x] Post-apply: types regenerated to `types/database.ts` (guardian_consent present); `as never`
      cast removed from accept endpoint; type-check 0. Version recorded in `schema_migrations`
      twice (MCP `20260816190054` + repo `20260822000000`).
- [ ] Still TODO: persistent RED→GREEN integration test in the RLS live-Postgres suite (live
      behavior verified manually this session, but no committed regression test yet).

## Phase 3 — Web: record consent at invite-accept

Files: `server/api/family/invite/[token]/accept.post.ts`, `utils/legal.ts`, migration — ✅ CODE DONE

- [x] Consent columns added in the Phase 2 migration (nullable).
- [x] Accept endpoint stamps `guardian_consent_at/by/terms_version` when the accepting user is a
      minor (`requiresGuardianInvite(dob)`); parent = `invitation.invited_by`, version from new
      `utils/legal.ts` `CURRENT_TERMS_VERSION` ("2026-03-01"). Non-fatal on failure (logged).
      Added `invited_by` to the invitation select. Type-check clean (payload cast `as never`
      until types regen post-apply); invite unit tests 34 pass.
- [x] No UI surface — compliance record only.
- Note: `CURRENT_TERMS_VERSION` must bump in lockstep if the legal pages' "Last Updated" changes
  (see Open items — the material changes this session arguably warrant bumping it).

## Phase 4 — iOS parity — ✅ DONE (2026-08-16)

Files: `Core/Utilities/COPPAHelper.swift`, `Features/Auth/ViewModels/SignupViewModel.swift`,
`Features/Auth/Views/SignupView.swift`

- [x] `COPPAHelper`: added `adultAge = 18` + `requiresGuardianInvite(_:)` (13–17 band; returns
      false for unparseable — the under-13 gate covers those). Under-13 logic unchanged.
- [x] `SignupViewModel`: `hasValidDOB` now also requires `!requiresGuardianInvite` for players
      (disables submit for 13–17); added `minorRequiresGuardian` computed.
- [x] `SignupView`: guardian notice panel below the DOB field when `minorRequiresGuardian`.
- [x] Enforcement is server-side (Phase 2 DB trigger) for both clients — iOS gets it for free.
- [x] No under-13 changes. Tests: 4 COPPAHelper + 3 SignupViewModel, all GREEN.

## Phase 5 — iOS legal text sync — ✅ DONE (2026-08-16)

Files: `Features/Legal/Views/TermsOfServiceView.swift`, `PrivacyPolicyView.swift`,
`Models/TermsOfService.swift`, `PrivacyPolicy.swift`, new `Models/LegalRevision.swift`

- [x] `TermsOfServiceView` rewritten 11 → 22 sections matching web: minor consent (§1, §11),
      liability cap (§4), Ohio/Cuyahoga governing law (§8), NCAA prohibited activity (§10),
      full arbitration (§12: informal-first, class waiver + severability, delegation, fees,
      mass-arb, jury/venue, FAA, 30-day opt-out), account termination (§13), user content (§14),
      third-party disclaimer (§15), Fit Score (§16), email (§17), indemnification (§18),
      severability (§19), DMCA (§20), General Provisions (§21), contact + address (§22).
- [x] `PrivacyPolicyView` rewritten 12 → 13 sections: sensitive-data/not-FERPA (§2), Fit Score +
      opt-out email (§3), third-party sources (§4), family-member sharing (§5), security detail
      (§6), concrete retention (§7), CCPA + other-state rights + minors + GPC + in-app export
      (§8), named analytics vendors (§9), COPPA/DOB detail (§10), 14-day change notice (§12),
      contact + address (§13).
- [x] Emails corrected to `@therecruitingcompass.com`; address added to match web.
- [x] `lastUpdated` fixed (was Feb 2025) → single-sourced in new `LegalRevision.lastUpdated`
      (Aug 16 2026), mirroring web `CURRENT_TERMS_VERSION`. Both models use it.
- [x] Legal test suites updated (assert `LegalRevision.lastUpdated`); all GREEN.
- [x] `xcodebuild` app + test targets BUILD SUCCEEDED; 75 targeted tests pass, 0 fail.

## Phase 6 — Tests

- [ ] Web unit: age-band routing (12→block, 13–17→invite-path, 18→allow, parent→allow).
- [ ] Web: DB trigger rejects a 13–17 player insert whose email has no matching pending/accepted
      unexpired `family_invitations` row; allows one that does (RED before migration, GREEN after).
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
