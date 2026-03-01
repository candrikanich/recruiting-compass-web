# Legal Pages Implementation Plan
**Date:** 2026-03-01
**Status:** Draft — awaiting approval
**Scope:** Terms & Conditions overhaul + Privacy Policy creation + 3 new feature workstreams

---

## Interview Summary

| Topic | Decision |
|---|---|
| Age gate | DOB collected pre-registration; block immediately if <13 |
| Currently collected | Graduation year only — DOB field must be added |
| Family unit deletion | Requesting user removed; unit survives unless last member |
| Business model | Free now, subscription later |
| UGC ownership | User owns what they enter; RC owns College Scorecard data |
| Email types | Transactional + product updates + tips/content + promotional upsell |
| Dispute resolution | Binding arbitration (AAA/JAMS), class action waiver |
| College data | Reference only; disclose source + accuracy disclaimer |
| T&C change notice | In-app banner + 14-day notice for material changes |
| Fit score | Disclose methodology; label as gauge only; attorney review needed |
| Sensitive data stored | Athletic stats/preferences + academic data (GPA, test scores) |
| Invite email retention | Currently indefinite — plan to add decline button + cron cleanup |
| GDPR scope | US only; CCPA compliance required |

---

## Part 1: Terms & Conditions Updates (terms.vue)

All changes are content-only to `pages/legal/terms.vue`.

### 1. Fix Dynamic Date
- Remove `const lastUpdated = ref(new Date()...)`
- Replace with hardcoded string: `"March 1, 2026"`
- Add comment: `// UPDATE THIS DATE WHENEVER TERMS ARE MODIFIED`

### 2. Section 2 — Use License (rewrite)
Current language is boilerplate for a static download site. Rewrite to reflect a SaaS application:
- Grant a limited, non-exclusive, non-transferable license to use the Service
- License is revocable and conditioned on compliance with these Terms
- Remove "temporarily download one copy" language entirely

### 3. Section 4 — Limitation of Liability (update)
- Add cap: liability limited to the greater of $100 or fees paid to RC in the 12 months preceding the claim
- Keep existing "no consequential damages" language

### 4. Section 7 — Modifications (update)
- Material changes: in-app banner + email notification, 14-day notice period
- Minor changes: effective immediately upon posting; continued use = acceptance
- Define "material" as: changes to pricing, data use, arbitration, or core service features

### 5. Section 8 — Governing Law (update)
- Change to: "State of Ohio, United States"
- Venue: "state or federal courts located in Cuyahoga County, Ohio"

### 6. New Section — COPPA / Age Restriction
> **The Service is not directed to children under the age of 13.** We do not knowingly collect personal information from anyone under 13. If we discover that a child under 13 has provided personal information, we will delete it immediately. If you are a parent or guardian and believe your child under 13 has registered, contact us at support@recruitingcompass.com.

### 7. New Section — Dispute Resolution & Arbitration
> Any dispute arising from these Terms shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. **You waive your right to participate in any class action lawsuit or class-wide arbitration.** Small claims court actions are exempt. This arbitration provision is governed by the Federal Arbitration Act.

### 8. New Section — Account Termination
- RC's right to suspend/terminate accounts for violation of Terms
- Effect of termination: access revoked, data retained per Privacy Policy retention schedule
- User's right to self-terminate covered in Privacy Policy (account deletion)

### 9. New Section — User Content & Data Ownership
- Data entered by users (schools, coaches, interactions, academic stats) remains the user's property
- User grants RC a limited license to store, display, and process their data to provide the Service
- Data sourced from the College Scorecard API is RC's data; users may view but not redistribute it
- RC may use aggregated, anonymized data for product improvement

### 10. New Section — Third-Party Data & College Scorecard Disclaimer
> School and program information displayed in the Service may be sourced from the U.S. Department of Education College Scorecard API and other public sources. This data is provided for **reference purposes only** and may not reflect current institutional policies, offerings, or statistics. Recruiting Compass makes no representations about the accuracy or completeness of third-party data and is not responsible for decisions made based on it.

### 11. New Section — Fit Score Disclaimer
> Recruiting Compass calculates a "Fit Score" to help athletes gauge potential school compatibility. This score is an algorithmic estimate based on user-entered data and publicly available school information. **It is not an official assessment, guarantee of admission, or endorsement by any institution.** The methodology used to generate Fit Scores is described in our [Help documentation]. Fit Scores should be used as one of many tools in the recruiting process, not as a sole basis for any decision.
> **Attorney review pending: NCAA amateurism implications.**

### 12. New Section — Email Communications
> By creating an account, you agree to receive transactional emails (confirmations, invites, alerts) necessary to operate the Service. You may also receive product updates, recruiting tips, and (when applicable) promotional emails about paid features. You may opt out of non-transactional emails at any time via the unsubscribe link in any such email or through your account settings.

### 13. New Section — Indemnification
> You agree to indemnify, defend, and hold harmless Recruiting Compass, its officers, directors, employees, and agents from any claims, liabilities, damages, or expenses (including attorneys' fees) arising from your use of the Service, your violation of these Terms, or your infringement of any third-party rights.

### 14. New Section — Severability & Entire Agreement
> If any provision of these Terms is found unenforceable, the remaining provisions remain in full force. These Terms, together with the Privacy Policy, constitute the entire agreement between you and Recruiting Compass regarding the Service.

### 15. Update Section 11 — Contact Information
- Confirm email address: support@recruitingcompass.com
- Add: mailing address (registered Ohio business address — **TODO: Chris to provide**)

### 16. Update Section 10 — Prohibited Activities (expand)
Add to existing list:
- Scraping, crawling, or automated data extraction
- Impersonating any person or entity
- Sending unsolicited messages to other users
- Using the Service to violate NCAA amateurism rules or applicable recruiting regulations

### 17. Add Privacy Policy Link
- Add prominent link to `/legal/privacy` near the top of the page, below the last-updated date
- Text: "Please also review our [Privacy Policy], which is incorporated by reference into these Terms."

---

## Part 2: Privacy Policy (update existing — pages/legal/privacy.vue)

The privacy policy page already exists. The following sections need to be added or updated:

**Fix (same as T&C):** Remove dynamic `lastUpdated` date → hardcode with update comment.

**Section 2 — Information We Collect (update)**
- Add: date of birth (age verification, new field)
- Add: graduation year, sport, position, GPA, test scores, athletic stats (currently vague "Profile Information")
- Add: school/coach interaction data and notes entered by user
- Add: pending invitation email addresses (stored until accepted, declined, or expired — see Feature Plan 3)
- Clarify: passwords are hashed, never stored in plaintext

**New subsection in Section 2 — Data We Do Not Collect**
- Health or injury data
- Financial data (no payment processor yet)
- Social Security numbers or government IDs

**New subsection in Section 3 — How We Use Your Information**
- Add: calculate Fit Scores (algorithmic, using user-entered + College Scorecard data)

**New Section — Third-Party Data Sources**
- College Scorecard API (U.S. Dept of Education) — school/program reference data
- We do not sell or share user data with third parties for advertising

**Section 6 — Data Retention (update, currently vague)**
- Active accounts: retained until deletion requested
- Pending invitations: retained until accepted, declined, or expired (30-day expiry — Feature Plan 3)
- Deleted accounts: purged within 30 days of deletion request (Feature Plan 2)
- Audit logs: retained 90 days after deletion for fraud/legal purposes

**Section 7 — Your Privacy Rights (update)**
- Add explicit CCPA section for California residents:
  - Right to know categories of data collected
  - Right to delete (via account settings or email to privacy@recruitingcompass.com)
  - Right to opt out of sale (we do not sell data — confirm this)
- Keep existing general rights language

**Section 10 — Children's Privacy (update, currently generic)**
- Add: DOB is collected at registration to enforce the under-13 restriction
- Add: parents/guardians may contact privacy@recruitingcompass.com to request deletion of any data collected in error
- Add: family unit members may include minors aged 13–17; parents must supervise minor account use

**Section 11 — Changes (update)**
- Align with T&C: in-app banner + 14-day notice for material changes

**Section 12 — Contact (update)**
- Add location: Olmsted Township, OH 44138 *(placeholder — consider registered agent address before publishing)*
- Confirm both emails are monitored: privacy@recruitingcompass.com, support@recruitingcompass.com

---

## Part 3: New Feature Workstreams

### Feature Plan 1 — Age Gate (COPPA Enforcement)

**Trigger:** Pre-registration, before account creation
**Requirement:** Block users under 13 from registering

#### Implementation Steps

1. **Add DOB field to registration flow**
   - Add to the pre-registration/signup form (before account is created)
   - Field: month/year/day picker or three separate dropdowns
   - Store DOB in `profiles` table or `auth.users` metadata
   - **Do not show DOB elsewhere in the app** (privacy-sensitive)

2. **Validation logic**
   - On form submit: calculate age from DOB
   - If age < 13: show a hard block message, do not create account
   - Message: "Recruiting Compass is not available for users under 13. If you're a parent, please register with your own information."
   - No workaround (no "ask parent" flow — COPPA requires no account at all)

3. **Player profile DOB check (parent-initiated)**
   - If a parent creates a player profile and enters a DOB showing the player is <13: block profile creation
   - Message: "Player profiles for athletes under 13 are not supported."

4. **Database change**
   - Add `date_of_birth DATE` column to `profiles` table (nullable — existing users are grandfathered, DOB only required for new signups)
   - Migration: `20260301000001_add_dob_to_profiles.sql`
   - RLS: DOB column only readable by the profile owner and family unit members

5. **Files to modify**
   - `pages/auth/signup.vue` or equivalent onboarding entry point
   - `server/api/auth/register.post.ts` or Supabase Auth hook — server-side age validation
   - `types/database.ts` — add `date_of_birth` to profiles type
   - `composables/useAuth.ts` — update profile creation to pass DOB

6. **Tests needed**
   - Unit: age calculation function (edge cases: birthday is today, leap years)
   - Integration: registration blocked when age < 13
   - Integration: player profile creation blocked when player DOB < 13
   - E2E: signup flow with under-13 DOB shows block message

---

### Feature Plan 2 — Account Deletion (GDPR/CCPA Compliant)

**Requirement:** Users can delete their account. Data purged within 30 days.

#### Deletion Rules
- Requesting user is removed from the service
- If requesting user is the **last member** of a family unit → family unit dissolves (all unit data deleted)
- If other family unit members exist → unit survives; requesting user's records detached
- Coach/school/interaction data entered by the user: deleted with the account
- Pending invitations sent by the user: cancelled
- Pending invitations received by the user: declined automatically

#### Implementation Steps

1. **UI: Account deletion page or modal**
   - Location: `pages/settings/account.vue` or within profile settings
   - Require password re-confirmation before deletion
   - Show explicit warning: what will be deleted, that it cannot be undone
   - Two-step: "Request Deletion" → confirmation email → "Confirm Deletion" link

2. **Soft delete with 30-day window**
   - On request: set `profiles.deletion_requested_at = now()` + `profiles.status = 'pending_deletion'`
   - Block login for pending-deletion accounts (show: "Your account is scheduled for deletion on [date]")
   - Allow cancellation within 30 days via a "Cancel Deletion" link in the confirmation email

3. **Hard delete endpoint**
   - `server/api/account/delete.post.ts` — hard deletion after 30-day window
   - Cascade order:
     1. Delete interactions, coach records, school records owned by user
     2. Delete family unit if last member, otherwise detach user from unit
     3. Cancel/decline pending invitations
     4. Delete profile record
     5. Delete Supabase auth user (`supabase.auth.admin.deleteUser(userId)`)
   - Log deletion event for audit purposes (retain log 90 days)

4. **Cron job: process pending deletions**
   - `server/cron/process-account-deletions.ts`
   - Runs daily; finds `deletion_requested_at < now() - 30 days`
   - Executes hard delete sequence above

5. **Files to create/modify**
   - `server/api/account/request-deletion.post.ts`
   - `server/api/account/cancel-deletion.post.ts`
   - `server/api/account/confirm-deletion.post.ts`
   - `server/cron/process-account-deletions.ts`
   - `pages/settings/account.vue` — add deletion UI
   - Migration: `20260301000002_add_deletion_fields_to_profiles.sql`
   - Email template: deletion confirmation email with cancel link

6. **Tests needed**
   - Unit: cascade deletion logic (last-member family unit dissolution)
   - Integration: soft delete sets correct fields
   - Integration: cancellation within 30 days restores account
   - Integration: hard delete removes all user data
   - E2E: full deletion flow from settings page

---

### Feature Plan 3 — Invite Expiry & Decline (Data Hygiene)

**Requirement:** Family invites should have a 30-day expiry; invited users can decline; cron cleans up expired/declined records.

#### Implementation Steps

1. **Add decline button to pending invite UI**
   - Location: the pending invitations section in `pages/family/` or wherever invites are shown
   - On decline: set `family_invitations.status = 'declined'` + `declined_at = now()`
   - Show confirmation: "Invitation declined."

2. **Add expiry to invite creation**
   - On invite send: set `family_invitations.expires_at = now() + interval '30 days'`
   - Migration: `20260301000003_add_expiry_to_family_invitations.sql`

3. **Cron job: clean up expired/declined invites**
   - `server/cron/cleanup-expired-invites.ts`
   - Runs daily; hard-deletes invites where `status IN ('declined', 'expired') AND (declined_at < now() - 7 days OR expires_at < now())`
   - 7-day grace period after decline before hard delete

4. **Update invite status display**
   - Show "Expired" status for past-expiry invites
   - Prevent re-sending to an already-declined email within 30 days (spam prevention)

5. **Files to modify**
   - `server/api/family/invite.post.ts` — add `expires_at`
   - `server/cron/cleanup-expired-invites.ts` — new file
   - `components/family/FamilyPendingInviteCard.vue` — add decline button
   - `composables/useFamilyInvite.ts` — add `declineInvite` action

6. **Tests needed**
   - Unit: expired invite detection
   - Integration: decline sets correct status
   - Integration: cron deletes eligible records only
   - E2E: decline button flow in family management

---

### Feature Plan 4 — In-App T&C Change Banner

**Requirement:** When Terms are materially updated, show an in-app banner with 14-day notice before new terms take effect.

#### Implementation Steps

1. **Database: track accepted terms version**
   - Add `terms_accepted_version VARCHAR` + `terms_accepted_at TIMESTAMP` to `profiles`
   - Migration: `20260301000004_add_terms_version_to_profiles.sql`

2. **Env config: current terms version**
   - `NUXT_PUBLIC_TERMS_VERSION=2026-03-01` in `.env`
   - `NUXT_PUBLIC_TERMS_EFFECTIVE_DATE=2026-03-15` (14 days from update)

3. **Banner component**
   - `components/legal/TermsUpdateBanner.vue`
   - Shows when `profile.terms_accepted_version !== config.TERMS_VERSION` AND `now() < effective_date`
   - After effective date: show blocking modal requiring acceptance before proceeding
   - Sticky banner: "Our Terms & Conditions have been updated. They take effect on [date]. [Review Changes]"

4. **Acceptance tracking**
   - On "I Accept" click: `PATCH /api/account/accept-terms` → update `terms_accepted_version` + `terms_accepted_at`
   - If user does not accept by effective date: block app access until accepted (modal, not dismissible)

5. **Files to create**
   - `components/legal/TermsUpdateBanner.vue`
   - `server/api/account/accept-terms.patch.ts`

---

## Open Questions / TODOs

| # | Item | Owner |
|---|---|---|
| 1 | ~~County for Ohio venue~~ → Cuyahoga County ✅ | Done |
| 2 | Mailing address: use `Olmsted Township, OH 44138` or registered agent address — **do not publish home street address** | Chris |
| 3 | Attorney review list started — fit score + NCAA implications are first items | Chris |
| 4 | Confirm final effective date for updated T&C | Chris |
| 5 | ~~Existing users DOB~~ → Grandfather (DOB only required for new signups) ✅ | Done |
| 6 | Fit score methodology page/docs to link from T&C | Engineering |
| 7 | Confirm both emails monitored: privacy@recruitingcompass.com + support@recruitingcompass.com | Chris |

---

## Implementation Order

1. **T&C content updates** (terms.vue) — no new features, safe to ship first
2. **Privacy Policy page** (legal/privacy.vue) — needed before T&C goes live
3. **Feature 3** (Invite expiry/decline) — smallest scope, fixes existing data hygiene issue
4. **Feature 1** (Age gate) — COPPA compliance, moderate scope
5. **Feature 2** (Account deletion) — largest scope, most complex cascade logic
6. **Feature 4** (Terms banner) — can be deferred until first material T&C change

---

## Files Affected

| File | Change Type |
|---|---|
| `pages/legal/terms.vue` | Major rewrite (content) |
| `pages/legal/privacy.vue` | Update existing (not new) |
| `pages/auth/signup.vue` | Add DOB field |
| `pages/settings/account.vue` | Add deletion UI |
| `components/family/FamilyPendingInviteCard.vue` | Add decline button |
| `components/legal/TermsUpdateBanner.vue` | New file |
| `server/api/account/request-deletion.post.ts` | New |
| `server/api/account/cancel-deletion.post.ts` | New |
| `server/api/account/confirm-deletion.post.ts` | New |
| `server/api/account/accept-terms.patch.ts` | New |
| `server/api/family/invite.post.ts` | Add expires_at |
| `server/cron/process-account-deletions.ts` | New |
| `server/cron/cleanup-expired-invites.ts` | New |
| `composables/useFamilyInvite.ts` | Add declineInvite |
| `composables/useAuth.ts` | Add DOB to profile creation |
| `types/database.ts` | Add new columns |
| DB migrations (×4) | New |
