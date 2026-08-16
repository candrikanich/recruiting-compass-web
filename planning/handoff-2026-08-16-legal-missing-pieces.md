# Handoff — Legal: Missing Pieces to Resolve

**Date:** 2026-08-16
**For:** Chris (review + decisions) → attorney where noted
**Companion:** `planning/2026-08-16-legal-policy-review.md` (full audit + what's already fixed)

This doc lists only the **open** legal items — things that still need a decision, a real value, or attorney sign-off. Everything in the "honesty fixes" and G5 hardening sections of the review doc is already done in code.

---

## 1. iOS legal text is stale and materially thinner than web — MUST sync before iOS launch

iOS ships **hardcoded** legal text (native SwiftUI, not a webview, not a link to the web pages). It is an **older, thinner** version than the current web Mar 1 2026 content.

- **Wrong "Last Updated"**: iOS hardcodes a timestamp resolving to ~Feb 2025 (code comment wrongly says "Feb 19 2026"). Web = **March 1, 2026**.
- **Section counts**: iOS Privacy 12 vs web 13; iOS Terms **11 vs web 20**.

**Missing on iOS (present on web):**

| Doc | Missing on iOS | Why it matters |
|---|---|---|
| Terms | **Arbitration clause + class-action waiver** | Biggest exposure — iOS users never agreed to these; likely unenforceable against them |
| Terms | **Fit Score disclaimer** | No "not a guarantee of admission/scholarship" carve-out for iOS users |
| Privacy | **CCPA / California rights** section | CA compliance gap for iOS users |
| Privacy | Concrete retention windows (30-day purge, invite expiry) | Consistency |
| Privacy | COPPA/DOB-collection detail | iOS has generic boilerplate only |
| Both | Transactional-vs-marketing email disclosure | Consistency |

**Action:** rewrite the hardcoded strings in `PrivacyPolicyView.swift` / `TermsOfServiceView.swift` to the Mar 1 2026 web content and fix the `lastUpdated` timestamps. Tracked as an iOS engineering handoff (separate doc). **Decision needed:** do this before the next iOS store submission? (Recommended yes — Apple review checks policy presence, and the arbitration gap is real.)

---

## 2. Registered-agent / physical mailing address — placeholder in BOTH docs

`pages/legal/privacy.vue` and `pages/legal/terms.vue` both show:

```
Olmsted Township, OH 44138
<!-- TODO: Replace with registered agent address before public launch -->
```

No street address / registered agent. **Required** for:
- **CAN-SPAM** — a valid physical postal address must appear in marketing email.
- General enforceability of the Terms (governing law is already set to Ohio / Cuyahoga County).

**Action (Chris):** provide the real registered-agent or business mailing address. Then it goes in both legal pages **and** the marketing-email footer. Blocks public launch.

---

## 3. Fit Score ↔ NCAA rules — attorney review still open

`terms.vue` §16 already carries the note:
> "The relationship between Fit Scores and NCAA recruiting rules is subject to attorney review."

**Action (attorney):** confirm the Fit Score framing doesn't implicate NCAA amateurism/recruiting rules, and that the current disclaimer wording is sufficient. Until then, leave the note in.

---

## 4. Decisions already made this session (recorded so they're not re-litigated)

- **Cookie-consent banner:** NOT required. App is **US-only, no plan to launch abroad** → no ePrivacy/GDPR banner law applies; CCPA needs opt-out of *sale* (not done), not a banner. Analytics vendors (Sentry/PostHog/Vercel) now named in Privacy §9.
- **Marketing email opt-in:** NOT required. US-only → CAN-SPAM (opt-out + working unsubscribe) governs; GDPR/CASL opt-in N/A. Privacy §3 reworded to opt-out language.
- **Minimum age = 13** (COPPA floor), NOT 14. 8th graders (13+) are welcome. DB trigger now enforces 13+ for player accounts. The old `validatePlayerAge` "14+" grad-year helper is **dead code** — flag for cleanup + wording alignment.

---

## 5. Attorney review checklist (hand this to counsel)

- [ ] Arbitration clause + class-action waiver (Terms §12) — enforceability, AAA Consumer Rules reference, FAA.
- [ ] Limitation of liability cap (§4, greater of $100 / 12-mo fees) — reasonable for a free product.
- [ ] Fit Score disclaimer vs NCAA recruiting rules (§16).
- [ ] COPPA posture — 13+ gate, DOB collection, parental supervision language (Privacy §10) now backed by a DB trigger; confirm sufficiency.
- [ ] CCPA section (Privacy §8) — completeness for California users.
- [ ] Governing law / venue (Ohio, Cuyahoga County) matches the entity's actual registration.
- [ ] Indemnification (§18) scope.
- [ ] Confirm the registered-agent address (item 2) matches the legal entity.

---

## Status summary

| Item | Owner | Blocking |
|---|---|---|
| 1. iOS legal text sync | iOS eng | iOS store submit |
| 2. Registered address | Chris | Public launch + CAN-SPAM |
| 3. Fit Score / NCAA | Attorney | Launch (soft) |
| 4. Decisions | — | Recorded, no action |
| 5. Attorney checklist | Attorney | Launch (soft) |
