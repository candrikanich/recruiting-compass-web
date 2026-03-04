# Infrastructure Improvements Design

**Date:** 2026-03-04
**Status:** Approved
**Priority order:** PostHog Analytics → Tailwind v4 → Nuxt UI v3 → Upstash Rate Limiting → Bundle Analysis

---

## Overview

Five improvements to close the gaps identified in a vibe-coding audit: observability, UI productivity, API security, and bundle hygiene.

---

## Phase 1 — PostHog Analytics

### Goal
Instrument key product events to understand user behavior without capturing PII or recording sessions.

### Approach
Install `posthog-js` directly (no Nuxt module). Create a client-only plugin. CSR-only app makes this straightforward.

### Implementation

**Plugin:** `plugins/posthog.client.ts`
- Initialize with `autocapture: false`, `disable_session_recording: true`, `capture_pageview: false`
- Hook into Nuxt router `afterEach` for manual page view tracking (uses route name, not path — avoids capturing IDs)
- Expose `$posthog` via `provide`
- Guard: no-op if `NUXT_PUBLIC_POSTHOG_KEY` is not set (dev environments)

**Config additions to `nuxt.config.ts`:**
```
runtimeConfig.public.posthogKey
runtimeConfig.public.posthogHost  (default: https://app.posthog.com)
```

**Events to instrument** (in composables, not components):

| Event | Properties | Where |
|---|---|---|
| `page_view` | `route_name` | router plugin |
| `school_added` | `school_type` | `useSchools` |
| `coach_added` | — | coaches composable |
| `family_invite_sent` | `method: email\|code` | family invite composable |
| `family_invite_accepted` | — | `/api/family/invite/[token]/accept` |
| `fit_score_viewed` | — | fit score composable |
| `recruiting_packet_generated` | — | recruiting packet composable |
| `onboarding_step_completed` | `step` | onboarding wizard |

### Privacy Rules
- No PII in any event properties (no email, name, user ID in event data)
- PostHog distinct ID is their anonymized PostHog ID only
- No session replay, no autocapture

---

## Phase 2 — Tailwind v4 Upgrade

### Goal
Upgrade from Tailwind v3 to v4 as a prerequisite for Nuxt UI v3.

### Breaking Changes That Apply to This Project
- `tailwindcss` PostCSS plugin → `@tailwindcss/postcss`
- `@tailwind base/components/utilities` → `@import "tailwindcss"` in CSS
- Custom config (colors, spacing, screens) migrates from `tailwind.config.js` → CSS `@theme {}` block in `main.css`
- Some utility class renames (`shadow-xs` → `shadow-2xs`, etc.)
- `tailwind.config.js` is deprecated (but still works in v4 for compatibility)

### Approach
Use the official upgrade tool first, then review and fix manually.

```bash
npx @tailwindcss/upgrade@next
```

The tool handles:
- Package version bumps
- PostCSS config update
- CSS directive migration
- Most utility class renames

Manual review required for:
- Custom `tailwind.config.js` → `@theme {}` migration
- Any project-specific CSS that uses deprecated patterns
- Visual smoke test of all pages

### Verification
- `npm run type-check` passes
- `npm run test` passes (no component test changes expected)
- `npm run build` succeeds
- Visual smoke test: dashboard, schools, coaches, onboarding, settings

---

## Phase 3 — Nuxt UI v3

### Goal
Add a component library to speed up future UI development. Incremental adoption — no big-bang rewrite.

### Approach
Add `@nuxt/ui` alongside existing components. Migrate opportunistically; all new UI uses Nuxt UI going forward.

### Setup
1. Install `@nuxt/ui` (v3, requires Tailwind v4 — done in Phase 2)
2. Add to `modules` in `nuxt.config.ts`
3. Configure `app.config.ts` with project color theme
4. Verify existing pages don't regress

### Initial Migration Target
Settings page — highest density of repeated UI patterns (cards, buttons, badges, modals). Good proof of concept.

### Component Mapping (existing → Nuxt UI)
| Current pattern | Nuxt UI component |
|---|---|
| Custom modal wrapper | `UModal` |
| Custom button classes | `UButton` |
| Notification toasts | `UNotifications` / `useToast` |
| Status badges | `UBadge` |
| Data tables | `UTable` |
| Form inputs | `UInput`, `USelect`, `UTextarea` |

### Going Forward
- New pages: use Nuxt UI exclusively
- Existing pages: migrate when touching them, not as a standalone task
- HeroIcons already in use — compatible with Nuxt UI

---

## Phase 4 — Upstash Rate Limiting

### Goal
Protect high-risk API endpoints from abuse. Serverless-compatible (Vercel requires external state for rate limiting — in-memory won't work across instances).

### New Service
Upstash Redis — free tier (10K commands/day, sufficient for early-stage). Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars.

### Packages
- `@upstash/redis`
- `@upstash/ratelimit`

### Utility
**`server/utils/rateLimit.ts`** — wraps `@upstash/ratelimit` with a standard interface:
```typescript
type RateLimitResult = { success: boolean; limit: number; remaining: number; reset: number }
rateLimitByIp(event, { requests, window }): Promise<RateLimitResult>
rateLimitByUser(event, userId, { requests, window }): Promise<RateLimitResult>
```

On failure: throw `createError({ statusCode: 429, statusMessage: "Too many requests" })` with `Retry-After` header.

### Endpoints and Limits

| Endpoint | Key | Limit | Window |
|---|---|---|---|
| `auth/request-password-reset` | IP | 5 | 1 hour |
| `auth/resend-verification` | IP | 5 | 1 hour |
| `auth/verify-email` | IP | 10 | 1 hour |
| `family/invite` | user ID | 10 | 1 hour |
| `feedback` | IP | 10 | 1 hour |
| `help/feedback` | IP | 10 | 1 hour |
| `recruiting-packet/email` | user ID | 5 | 24 hours |

### Not Rate Limited
- Cron endpoints (`/api/cron/*`) — protected by secret token, not rate limiting
- Admin endpoints (`/api/admin/*`) — protected by admin token
- Read endpoints — low abuse surface

### Testing
Unit tests mock `@upstash/ratelimit` to test 429 responses without a real Redis connection.

---

## Phase 5 — Bundle Analysis

### Goal
Verify the existing `manualChunks` config is working correctly and identify any unexpected weight in the initial bundle.

### Approach
Run-and-review, not build-and-fix. This is a verification step.

```bash
npm run build:check   # builds + opens Rollup visualizer
```

### What to Look For
- `vendor-pdf` chunk (jspdf + html2canvas) should NOT be in the initial load — confirm it's only loaded on demand
- `vendor-charts` should be deferred similarly
- `vendor-maps` (leaflet) — verify lazy-loaded
- Initial bundle should be under 300KB gzipped
- Flag any dependency that appears unexpectedly large

### If Issues Found
Wrap heavy feature imports in `defineAsyncComponent` or dynamic `import()`. No preemptive changes — data first.

---

## Unresolved Questions

None. All decisions made during brainstorming:
- Nuxt UI: v3 (requires Tailwind v4 upgrade first) ✓
- PostHog: events only, no session replay, no PII ✓
- Rate limiting: Upstash Redis ✓
