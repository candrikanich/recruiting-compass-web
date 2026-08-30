# History: Auth

## 2026-08-01 — RLS Family Consolidation (6-Phase)
Completed all 6 phases of RLS family-model consolidation: trigger-based family_unit_id derivation on 7 tables, app stamping on all write paths, additive family CRUD policies, WITH CHECK hardening, dropped all 43 legacy account_links policies. Full audit exit criterion met.

## 2026-03-01 — Legal Pages Plan
Legal pages implementation: TOS rewrite (SaaS license, liability cap, arbitration, modifications notice), Privacy Policy creation, COPPA age gate with DOB collection.

## 2026 — Session fragmentation fix
Fixed session fragmentation (31 duplicate user_ids for one auth account) via unique email constraint, idempotent profile creation, centralized init in app.vue. Retained reusable DB audit queries + user_id stability test procedures. (migration 012 era)

## 2026 — Parent read-only RLS migration runbook
One-time apply/verify runbook for migrations 004-007 adding parent read-only RLS on athlete_task/interactions/parent_view_log. Applied long ago, superseded by the RLS family-consolidation rework.

## 2026-01-24 — Email Verification (Story 1.1)
Implemented email verification flow: Supabase email OTP, verify-email page, redirect on successful verification, resend support. Players must verify email before accessing app features.
