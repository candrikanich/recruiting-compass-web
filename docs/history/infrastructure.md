# History: Infrastructure

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
