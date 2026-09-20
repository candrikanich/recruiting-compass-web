# History: General

## 2026-09-20 — Inbound Email Ingestion - Phase 3 Parser & Attachment Polish
Polish/accuracy pass on inbound email ingestion: broader forward-parser coverage (mobile/plain-text/Spanish), auto-created coach records on domain match, attachment-to-document linking, bulk-forward thread splitting, and adoption/accuracy analytics.

## 2026-09-20 — Inbound Email Ingestion - Phase 2 Draft Review UX
Added draft review UX for inbound email ingestion: list/confirm/discard endpoints turning a pending inbound-email draft into a real interaction, notification fan-out, and a Settings display of the family's forwarding address.

## 2026-09-20 — Help Center Audit, FAQ & Glossary Expansion
Audited and rewrote the in-app Help Center to match shipped features, added a "last reviewed" date mechanism plus FAQ and Glossary sections, and added a quarterly review cron to prevent future content drift.

## 2026-09-20 — Inbound Email Ingestion - Phase 1 Webhook Pipeline
Stood up the Resend Inbound webhook pipeline: a per-family inbound token, a forwarded-email parser, Svix signature verification, and a pending drafts table for coach-email forwards.

## 2026-09-20 — In-App Help Center
Specified and shipped a dedicated auth-gated in-app Help Center (/help) with its own docs layout, sidebar navigation across four topic areas (Getting Started, Schools & Coaches, Phases & Letters, Account & Settings), reusable content components (step cards, callouts, badges), and a Supabase-backed thumbs-up/down feedback mechanism.

## 2026-09-20 — Public Player Profile (Phases 1-4)
Built and shipped the full Public Player Profile feature in four phases: a redesigned dark-hero public page exposing metrics/team-history/awards/commitment (Phase 1); an owner setup/editor page with section-config drag/visibility, banner upload, and share/QR tools (Phase 2); an inbound "Contact Player" lead-capture flow with Turnstile/rate-limiting and CRM coach-matching (Phase 3); and an "Express Interest" one-tap flow plus an athlete leads inbox with monthly analytics (Phase 4).

## 2026-08-14 — Social-media tracking removal
Executed full-deletion plan for social-media monitoring (Chris ruling: X API ~$200/mo, Instagram Graph gated — not worth it). All listed social pages/composables removed; retained here as the record of what was cut and why.

## 2026-08-09 — Web profile-completeness parity (misdiagnosis resolved)
Web profile-completeness undercounted ~10% vs iOS. Original home-location hypothesis was wrong — real cause was `primary_position` silently wiped on load; fixed in #352/#353.

## 2026-03-16 — Public shareable player profile
Multi-task plan for public player-profile pages (`/p/[slug]`) backed by `player_profiles` / `profile_tracking_links` / `profile_views` tables, with per-coach tracking links (`?ref=` view counts) and player-managed per-section visibility toggles. Now live; became the canonical coach-outreach share path.

## 2026-01-28 — Tech-debt snapshot (point-in-time)
Dated tech-debt dashboard; stats now stale (2,869 tests vs 7,800+, migration 017 note obsolete). Captured a deprecated-composable list; superseded by later work.

## 2026-02-02 — MVP audit workflow design
Design for a 4-page MVP audit (Dashboard/Coaches/Schools/Interactions) across perf, a11y, SEO, code quality — Vercel baseline screenshots, 4 parallel agents, post-fix visual verification, plus a reusable audit-workflow skill. One-off run, executed.

## 2026-01 — Shared utilities extraction
Build writeup for useEntityNames, PageState, usePageFilters, useLinkedAthletes (API + usage examples). Utilities live in code; doc was a one-time extraction record.

## 2026-05-22 — Offers architecture redesign
Moved offers to a Pinia store with pagination/invalidation after a per-instance-cache bug; core store + soft-warn card shipped (archive UI deferred to follow-ups).

## 2026-02-24 — Vue review fixes (parts 1 & 2)
Fixed confirmed bugs/security/perf from a Vue expert review (shallowRef mutations, CSRF, watchers, useToast singleton, interval/timeout leaks, PII console logs, typing).

## 2026-02-24 — Bug-finder fixes
Fixed 11 confirmed bugs across composables/server routes (surgical edits).

## 2026-02-24 — Suggestions bootstrap
Added a `vercel.json` daily cron + server-side bootstrap in `GET /api/suggestions` to populate the empty `suggestion` table on evaluation.

## 2026-02-23 — Architectural review
Full-codebase three-layer review; fixed 3 direct-Supabase-call violations via new composables and flagged 14 API routes for logger standardization.

## 2026-02-22 — Shared utilities
Created `useEntityNames`, the `PageState` component, `usePageFilters`, and `useLinkedAthletes`; type-checked with 4994 tests passing.
