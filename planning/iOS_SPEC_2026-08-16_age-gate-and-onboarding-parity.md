# iOS Handoff — Age-Gate, Attestation & Grad-Year Parity

**Date:** 2026-08-16
**Source of truth:** web app (this repo). iOS must match the behavior below.
**Context:** Legal/COPPA review shipped web changes; iOS needs the same. The web work is done + tested + a DB trigger is live (protects iOS too).

---

## Already done for you (shared DB — no iOS work needed)

- **13+ COPPA gate is now enforced at the database layer.** Trigger `trg_enforce_minimum_age` on `public.users` rejects any `role='player'` row whose `date_of_birth` resolves to age < 13 (fails open when DOB is null). Migration `20260821000000_enforce_minimum_age.sql`. **iOS signup/profile writes to `users.date_of_birth` are now gated server-side automatically** — a client bug can no longer create an under-13 player. iOS should surface the resulting error gracefully (the DB raises `check_violation` with message "Users must be at least 13 years old to use Recruiting Compass (COPPA).").

---

## 1. Attestation text (add to every DOB field)

Web now shows this near each date-of-birth field. iOS should match on its DOB fields (`AuthManager` signup, any profile DOB edit):

> **Recruiting Compass is for ages 13 and up. By entering a date of birth, you confirm you are 13 or older.**

(Player-invite / parent-entering-player variant: "…you confirm the player is 13 or older.")

iOS `COPPAHelper` already enforces 13 client-side (`minimumAge = 13`) — keep that; this is about adding the visible **attestation** copy, which iOS currently lacks.

## 2. Minimum age = 13 (not 14)

Confirm iOS uses **13** everywhere (COPPA floor). Web removed a dead "14+" grad-year check. 8th graders (13+) are welcome.

## 3. Graduation-year options = current year … current year + 5 (6 options)

Web canonical: `utils/graduationYears.ts` → `getGraduationYearOptions()` returns `[currentYear … currentYear+5]` inclusive. The **+5** upper bound is what lets rising **8th graders** pick their class. If iOS onboarding hard-codes a narrower range (e.g. +4), widen it to +5. Grad year is UX only; age eligibility is the 13+ gate above.

## 4. Profile-edit age gate

Web added an age check on the profile DOB edit (client + server `PATCH /api/user/profile` returns 400 for under-13). If iOS lets a user edit DOB post-signup, it must also block under-13 — and the DB trigger now backstops it regardless.

---

## Related (separate docs)
- **Legal text sync** (iOS TOS/Privacy are stale + missing arbitration/class-waiver/Fit-Score/CCPA): see `planning/handoff-2026-08-16-legal-missing-pieces.md` §1.
- **Bidirectional onboarding pre-fill** (Phase 4 = iOS): see `planning/2026-08-16-bidirectional-onboarding-prefill-plan.md`.

## iOS files likely involved
- `Core/Utilities/COPPAHelper.swift`, `Core/Services/AuthManager.swift`, `Core/Models/AuthError.swift`
- Signup + profile-edit views with a DOB picker
- Onboarding grad-year picker
