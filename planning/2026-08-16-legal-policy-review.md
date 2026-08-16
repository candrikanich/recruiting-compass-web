# Legal Policy Review — TOS & Privacy Policy vs. Actual App Behavior

**Date:** 2026-08-16
**Scope:** Web Privacy Policy (`pages/legal/privacy.vue`, Last Updated Mar 1 2026, 13 sections) + Terms (`pages/legal/terms.vue`, Mar 1 2026, 20 sections), compared against actual web app code and the iOS app.
**Method:** Read both web docs in full; three parallel code audits (iOS parity, age/deletion claims, email/data-rights/analytics claims).

---

## Q1 — Is web & iOS legal content the same? **NO.**

iOS legal text is **hardcoded native SwiftUI** (not a webview, not a link to the web pages), and it is a **stale, materially thinner** version.

- **Wrong/old "Last Updated"**: iOS hardcodes `Date(timeIntervalSince1970: 1739404800)` — resolves to **Feb 13, 2025** (code comment wrongly says "Feb 19, 2026"). Web is **Mar 1, 2026**.
- **Section counts**: iOS Privacy = 12 (web 13); iOS Terms = **11 (web 20)** — iOS TOS is nearly half missing.

### Missing on iOS (present on web)

| Doc | Missing on iOS | Risk |
|---|---|---|
| Terms | **Arbitration clause + class-action waiver** | HIGH — iOS users never shown these; likely unenforceable against them |
| Terms | **Fit Score disclaimer** | MED — no "not a guarantee of admission/scholarship" carve-out for iOS |
| Privacy | **CCPA / California rights** section | MED — CA compliance gap for iOS users |
| Privacy | Concrete retention windows (30-day purge, invite expiry) | LOW |
| Privacy | COPPA/DOB collection detail (iOS has generic boilerplate only) | LOW |
| Both | Transactional-vs-marketing email disclosure | LOW |

**Fix:** rewrite the hardcoded strings in `PrivacyPolicyView.swift` / `TermsOfServiceView.swift` to the Mar 1 2026 web content + fix the `lastUpdated` timestamps. **Recommend before any iOS store submission** — Apple review checks policy presence, and the arbitration/class-waiver gap is a real legal exposure.

---

## Q2 — Does the app do what the policies claim?

### ✅ Verified TRUE (app matches policy)

| Claim | Evidence |
|---|---|
| DOB collected at registration | `SignupForm.vue:49-94`, persisted `users.date_of_birth` (players only) |
| Under-13 age gate (COPPA) | `pages/signup.vue:201-222` blocks age < 13 |
| Deferred 30-day account purge + cancel window | `request-deletion.post.ts` → `cron/process-account-deletions.get.ts:233` (30d); `cancel-deletion.post.ts` |
| Family invites expire after 30 days | migration `20260301000003`, enforced on read/accept/decline |
| Email unsubscribe (link + settings toggle) | `unsubscribeToken.ts`, `emailOptouts.ts`, `List-Unsubscribe` headers, `settings/notifications.vue` |
| Deletion/CCPA request via account settings | `pages/settings/account.vue` full delete UI |
| Transactional emails (invites, pwd reset, confirmation) | `emailService.ts:295`, `request-password-reset.post.ts:79`, Supabase auth |
| Usage analytics + cookies (generically) | Sentry + PostHog (conservative) + Vercel Analytics/Speed Insights |
| Do-not-collect list (health/financial/SSN) | No payment processor, no injury fields — consistent |

### ⚠️ Gaps — policy claims NOT backed by app behavior

> **Honesty fixes applied 2026-08-16** — G1, G2, G3, G4, G6 reworded so policy matches
> reality (no over-promising). Stale export address fixed. G5 (code hardening) and the
> cookie-banner half of G6 remain open — they need a build, not a wording change.

**G1. "Deletion event logs retained for up to 90 days" (Privacy §7) — ✅ FIXED (reworded)**
Was: deletion cron writes **no audit-log DB row** — only application `logger.info`; `audit_logs` table is 1-year, not 90 days. → Reworded §7 to "Security- and account-related audit logs are retained for up to one year," matching the actual `audit_logs` retention.

**G2. Data export / portability "through your account settings" (Privacy §8) — ✅ FIXED + WIRED**
Backend was built (`server/api/user/export.post.ts`) but not wired to UI. → **Wired up:** added an "Export My Data" button to Settings → Profile → **Data & Privacy** (`ProfileDataPrivacySection.vue`) using the existing `useUserExport` composable; §8 restored to promise in-app export. Fixed stale address `privacy@baseballrecruitingtracker.local` → `privacy@therecruitingcompass.com` (`exportUser.ts:344`) and stale download filename `baseball-recruiting-tracker-export` → `recruiting-compass-export`. (`sendExportViaEmail` email-delivery path is still a stub, but unused — the download-link path is what the UI uses.)

**G3. Marketing emails "(with consent)" (Privacy §3 / Terms §17) — ✅ FIXED (reworded) — CLOSED**
`notificationPreferences.ts:29` defaults `email_enabled: true` (opt-out, no consent checkbox). → Reworded Privacy §3 to opt-out + unsubscribe. **Chris ruling (2026-08-16): US-only, so CAN-SPAM (opt-out + unsubscribe) governs — no opt-in required. GDPR/CASL opt-in not applicable. Closed.**

**G4. "Security alerts" emails (Privacy §3, Terms §17) — ✅ FIXED (removed claim)**
No new-device/suspicious-login email code exists. → Removed "security alerts" from the transactional-email lists in both docs.

**G5. Age gate — ✅ PARTIALLY HARDENED; one server vector remains**
Full audit of every DOB/age point (2026-08-16):

| Location | Collects DOB | Age check | Attestation | Status after fixes |
|---|---|---|---|---|
| Player signup (`SignupForm`+`signup.vue`) | yes | client `<13` block | ✅ added | client-only gate |
| Family-invite signup (`InviteSignupForm`+`join.vue`) | yes | client `<13` block | ✅ added | client-only gate |
| Parent onboarding (`onboarding/parent.vue`) | yes (**but discarded** — `player-details.post.ts` drops it) | client button-disable | ✅ added | gate is UI-only; DOB not stored |
| Player onboarding (`onboarding/index.vue`) | no | none | n/a | no DOB collected |
| **Profile edit** (`ProfilePersonalInfoSection`) | yes | **was NONE** | ✅ added | ✅ **now blocked client + server** (`profile.patch.ts` + `utils/age.ts`) |
| iOS signup (`COPPAHelper`/`AuthManager`) | yes | client `<13` | existing | client-only gate |

**Fixed this session:** attestation text ("for ages 13+; by entering a DOB you confirm you are 13 or older") on all 4 web DOB fields; profile-edit age gate (client + **server-side** via `profile.patch.ts` + new `utils/age.ts`, tested).
**Still open (needs your call):** signup/join still go browser→Supabase **direct with no server endpoint**, so those two gates remain client-only and bypassable. Robust fix = a **Postgres trigger** rejecting an under-13 player `date_of_birth` at the DB layer (covers signup, join, and profile in one place). This is a **live migration** — needs your go-ahead. See "Proposed" below.
**Also found:** `utils/ageVerification.ts` (`validatePlayerAge`) says "**14** and older" (grad-year based) — inconsistent with the 13+ policy — and is **dead code** (exported, never called). No usage risk, but flag for cleanup / wording alignment.

**G6. Analytics vendors named — ✅ FIXED — CLOSED**
→ Added Sentry / PostHog / Vercel Analytics & Speed Insights by name to Privacy §9. **Chris ruling (2026-08-16): US-only, no plan to launch abroad → no cookie-consent banner required.** US has no ePrivacy/GDPR-style consent-banner law; CCPA requires opt-out of *sale* (not done), not a banner. Closed.

---

## Server-side age gate — ✅ APPLIED (2026-08-16)

DB trigger `trg_enforce_minimum_age` on `public.users` raises `check_violation` when `role='player'` and `date_of_birth` computes to age < 13 (fails open on null DOB). Applied live via Supabase MCP; migration `supabase/migrations/20260821000000_enforce_minimum_age.sql`. Verified: rejects an under-13 update; 0 pre-existing under-13 player rows. **Closes the signup/join client-only bypass** — no client can create an under-13 player anymore. Boundary is correct: a user turning 13 today is allowed.

## Grad-year / 8th graders — ✅ DONE (2026-08-16)

Chris ruling: 13+ is the COPPA floor; 8th graders welcome. Onboarding grad-year dropdowns extended from current+0..+4 to **current+0..+5** (`utils/graduationYears.ts`, both onboarding pages) so rising 8th graders can pick their class. Dead `validatePlayerAge` (14+, unused) deleted.

**G7. Contact address is a placeholder (both docs)**
"Olmsted Township, OH 44138" with `TODO: Replace with registered agent address before public launch`. No street/registered agent — required for CAN-SPAM (physical postal address in marketing email) and general enforceability.

---

## Open questions for Chris / attorney

1. **iOS parity** — update iOS legal text to Mar 1 2026 web content before iOS launch? (Arbitration/class-waiver gap = priority.)
2. **G3 "with consent"** — switch marketing email to true opt-in, OR reword policy to "opt-out with unsubscribe"? (Depends on whether you target EU/Canada.)
3. **G1 90-day deletion logs** — implement a deletion audit row, OR reword §7 to match reality (1-yr `audit_logs` / app logs)?
4. **G2 data export** — wire the existing backend to settings UI, OR drop "through your account settings" from §8?
5. **G4 security alerts** — implement, OR remove the claim?
6. **G6 cookie consent** — add an EU cookie banner + name analytics vendors?
7. **G5** — add server-side age verification?
8. **G7** — registered agent / physical address before public + iOS launch.
9. **Fit Score / NCAA** — §16 already flags "subject to attorney review" — still open.

## Suggested priority

- **Before iOS launch:** Q1 (iOS text), G7 (address).
- **Before broad public / marketing:** G3 (consent wording), G7 (CAN-SPAM address), G6 (cookie consent if EU).
- **Fix or reword (code-vs-policy honesty):** G1, G2, G4.
- **Hardening:** G5.
