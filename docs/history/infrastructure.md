# History: Infrastructure

## 2026-08-18 — Vercel Single-Project Migration
Consolidated 3 Vercel projects → 1 (`recruiting-compass-web-production`): main=prod, develop=preview QA. Two legacy projects deleted, local .vercel relinked.

## 2026-08-17 — Admin Suite Plans (Foundation + Support + Ops + Growth)
Four implementation plans for admin area: Foundation (audit_log table, 4 primitives, layout split), Support (read-only user detail, view_as audit), Ops (cron trigger allowlist, sparklines, DB health), Growth (DAU/WAU/MAU activity union, funnel, adoption). All shipped to develop.

## 2026-08-16 — Admin Subdomain Relocation
Plan to relocate /admin → admin.myrecruitingcompass.com with dedicated admin account, origin-isolated dual-login, useAppHost composable. Shipped to prod PR #372.

## 2026-08 — Cron Monitoring Plan
cron_runs table, withCronRun wrapper, admin Jobs tab, retention pruning. All delivered as part of admin ops spec.

## 2026-03-19 — CI/CD Improvements Plan
CI/CD improvement plan: raise coverage 75→80%, fix license check `|| true`, add WebKit E2E, staging smoke tests. Some items done (WebKit added), others superseded.

## 2026-02-17 — Security Fixes Plan
Security fixes from Feb 2026 audit: 8 tasks adding requireAuth to unauthed endpoints, fixing fail-open auth on sync-all, disabling debug endpoint in prod, fixing XSS in email template, adding auth to favicon endpoint.

## 2026-02 — CI/CD setup docs consolidation
Retired three overlapping CI/CD writeups (CI-CD-RECOMMENDATIONS, CICD_SETUP, ci-cd-setup) covering security.yml/e2e.yml/dependabot, npm audit/CodeQL/TruffleHog, Slack webhook + branch protection + Vercel git settings. All implemented; `docs/deployment/ci-cd.md` remains the canonical reference.

## 2026-03-18 — Doc hygiene system
Built the automated weekly doc-cleanup system (`scanner.mjs` manifest + `/doc-cleanup` skill + cron) for the web and iOS repos — the system this pass runs under.

## 2026-03-04 — Infrastructure improvements
PostHog analytics, Tailwind v4 upgrade, Nuxt UI v3, Upstash rate limiting on sensitive endpoints, and bundle analysis.

## 2026-02-25 — Scalability quick fixes
Bounded caches, paginated admin users, and parallelized fit-score checks (targeting ~1k users).

## 2026-02-18 — Architecture improvements
Five-phase cleanup (dead feature flags, quick wins, higher-value refactors); Round 5 added a client structured logger, extracted direct Supabase calls into composables, and added request dedup in useSchools/useCoaches.

## 2026-02-18 — Logging adoption
Structured logging across 39 API routes with correlation-ID propagation via `useAuthFetch`.
