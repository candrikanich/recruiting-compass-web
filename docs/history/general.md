# History: General

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
