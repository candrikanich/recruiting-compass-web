# History: Infrastructure

## 2026-02-16 — Supabase Postgres Quick Wins
Implemented Supabase Postgres best practices: added missing indexes, optimized N+1 queries, configured connection pooling, and adopted RLS patterns consistently across the schema.

## 2026-01-31 — Migration 022 Validation
Migration 022 (family units schema) fixed and validated. Applied successfully; family_units and family_members tables with correct RLS policies.

## 2026-01-28 — Tech Debt Remediation Complete
Completed 90% of planned tech debt: removed legacy authentication patterns, standardized error handling across API routes, cleaned up unused composables and dead TypeScript types. Phases 1–5 done.

## 2026-01-26 — Phase 1–2 Security Hardening Complete
Phases 1 (RLS policies) and 2 (input validation with Zod) deployed to production. All Supabase tables now have correct RLS; all API endpoints validate with Zod schemas.
