# Security Audit — OWASP Top 10 Implementation Plan

**Date:** 2026-02-23
**Auditor:** Claude Code Security Review
**Scope:** Full codebase — server/api, middleware, Supabase migrations, config
**Branch:** develop
**Method:** 5 parallel specialized scan agents + manual verification

---

## Executive Summary

The application has **strong foundational security**: 100% Zod input validation, parameterized Supabase queries everywhere, a comprehensive sanitization library, proper security headers, and good RLS coverage on primary data tables. No SQL injection or XSS vectors were found.

However, **two critical vulnerabilities** exist that must be fixed before any production exposure:

1. **Privilege escalation via unauthenticated `/api/auth/admin-profile`** — any caller can set `is_admin: true` on any user ID
2. **Broad CSRF bypass for entire sensitive endpoint prefixes** — admin, family, and preferences operations are all CSRF-unprotected

Additionally, several high/medium issues compound the risk profile, particularly the `account_links` table having no RLS, the CSP `unsafe-inline` directive, and in-memory rate limiting that won't hold under distributed Vercel deployments.

**Overall Risk Before Fixes: HIGH**
**Overall Risk After All P0/P1 Fixes: LOW**

---

## OWASP Findings Map

| Severity | OWASP | Finding | File |
|----------|-------|---------|------|
| 🔴 CRITICAL | A01 + A07 | Unauthenticated admin-profile endpoint (privilege escalation) | `server/api/auth/admin-profile.post.ts` |
| 🔴 CRITICAL | A01 | CSRF blanket bypass for `/api/admin/*`, `/api/family/*`, `/api/user/preferences/*` | `server/middleware/00-skip-csrf.ts` |
| 🟠 HIGH | A01 | `account_links` table has NO RLS → IDOR | All migrations |
| 🟠 HIGH | A01 | Cascade-delete endpoints CSRF-exempt | `server/middleware/csrf.ts` |
| 🟠 HIGH | A01 | `coaches/[id]/deletion-blockers.get.ts` has no auth | `server/api/coaches/[id]/deletion-blockers.get.ts` |
| 🟠 HIGH | A02 | CSP `unsafe-inline` in production | `server/middleware/security-headers.ts` |
| 🟡 MEDIUM | A07 | Auth enforcement is a disableable feature flag | `middleware/auth.ts` |
| 🟡 MEDIUM | A07 | `verify-email.post.ts` passes empty string as token | `server/api/auth/verify-email.post.ts` |
| 🟡 MEDIUM | A09 | Raw `error.message` returned to clients in 8 endpoints | Multiple `server/api/admin/*.ts` |
| 🟡 MEDIUM | A05 | In-memory rate limiting (ineffective on multi-instance Vercel) | `server/middleware/rate-limit.ts` |
| 🟡 MEDIUM | A01 | Tables potentially missing RLS: `notifications`, `profiles`, `social_media_posts` | Supabase dashboard |
| 🟢 LOW | A09 | Stack trace explicitly logged in `user/export.post.ts` | `server/api/user/export.post.ts:119` |
| 🟢 LOW | A02 | Env var validation uses `|| ""` fallbacks instead of fail-fast | `nuxt.config.ts:89` |
| 🟢 LOW | A01 | Admin check not centralized — no `requireAdmin()` helper | `server/utils/auth.ts` |
| 🟢 LOW | A01 | Legacy `account_links` hybrid model alongside `family_unit_id` | Multiple API routes |
| 🟢 LOW | A05 | API key auth without request signing (sync-all, cron) | `server/api/social/sync-all.post.ts` |

---

## Detailed Findings

### 🔴 CRITICAL-1 — Privilege Escalation via Unauthenticated Admin Profile Endpoint

**OWASP:** A01 Broken Access Control + A07 Authentication Failures
**File:** `server/api/auth/admin-profile.post.ts` (lines 19–67)

Any HTTP client can `POST /api/auth/admin-profile` with `{ userId: "<any-valid-uuid>", email: "x@x.com" }` and the server will execute:

```typescript
await supabase.from("users").update({ is_admin: true }).eq("id", userId)
```

There is no `requireAuth()` call. The endpoint uses `useSupabaseAdmin()` (service role), bypassing RLS entirely. An attacker who knows any valid user UUID can promote that account to admin, then use the admin API to list all users, delete accounts, and view sensitive data.

**CSRF status:** CSRF IS applied here (auth endpoints are not in the skip-list), but CSRF tokens are trivially obtainable by loading the app frontend. This provides no meaningful protection against an external attacker.

**Fix:**
```typescript
export default defineEventHandler(async (event) => {
  // Verify the caller is already an admin before allowing admin creation
  const user = await requireAuth(event);
  const callerIsAdmin = await checkIsAdmin(user.id, supabase);
  if (!callerIsAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  // ... rest of handler
});
```

Or, if this endpoint is only meant for internal seeding/onboarding, restrict it behind a server-side secret header and remove it from the public API surface entirely.

---

### 🔴 CRITICAL-2 — CSRF Bypass for Entire Sensitive Endpoint Prefixes

**OWASP:** A01 Broken Access Control
**File:** `server/middleware/00-skip-csrf.ts` (lines 10–22)

```typescript
if (url.startsWith("/api/admin/")) {
  event.context._skipCsrfValidation = true;  // All admin ops
}
if (url.startsWith("/api/family/")) {
  event.context._skipCsrfValidation = true;  // Family invitations, member removal
}
if (url.startsWith("/api/user/preferences/")) {
  event.context._skipCsrfValidation = true;  // Preference mutations
}
```

Additionally in `server/middleware/csrf.ts` (lines 32–41), cascade-delete endpoints are also exempt.

**Why this matters:** Authentication prevents an anonymous attacker. CSRF prevents a legitimate logged-in user from being tricked into performing actions by a malicious third-party page. They solve different threats. A user who is logged in and visits a malicious page can have their family membership removed, admin operations triggered, and preferences changed — all without the app verifying the request originated from the user's own session.

**Fix:** Remove the `00-skip-csrf.ts` file entirely. CSRF protection should apply to all state-mutating routes. The cascade-delete exemptions in `csrf.ts` should also be removed. Test that CSRF tokens flow correctly from the client for these operations.

---

### 🟠 HIGH-1 — `account_links` Table Has No RLS

**OWASP:** A01 Broken Access Control
**Location:** No migration enables RLS on this table

`account_links` stores the legacy parent-child relationship and is used in authorization decisions (e.g., `fit-score.get.ts` line 48 queries this table to determine if a parent has access to a school). With no RLS, any authenticated user can query all parent-child links in the system, enumerate family relationships, and potentially use this for social engineering or targeted attacks.

**Fix (new migration):**
```sql
ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links" ON account_links
  FOR SELECT USING (
    parent_user_id = auth.uid() OR player_user_id = auth.uid()
  );

CREATE POLICY "Parents can manage own links" ON account_links
  FOR ALL USING (parent_user_id = auth.uid());
```

---

### 🟠 HIGH-2 — Cascade-Delete Endpoints CSRF-Exempt

**OWASP:** A01 Broken Access Control
**File:** `server/middleware/csrf.ts` (lines 32–41)

`POST /api/schools/:id/cascade-delete`, `POST /api/coaches/:id/cascade-delete`, and `POST /api/interactions/:id/cascade-delete` bypass CSRF. These are permanent data deletion operations. A malicious page can trick an authenticated user into deleting their own data.

**Fix:** Remove the `CSRF_EXEMPT_PATTERNS` exception for cascade-delete endpoints. Verify the client includes the CSRF token when calling these endpoints.

---

### 🟠 HIGH-3 — `coaches/[id]/deletion-blockers.get.ts` Has No Auth

**OWASP:** A01 Broken Access Control
**File:** `server/api/coaches/[id]/deletion-blockers.get.ts` (line 21)

Uses `createServerSupabaseClient()` (no user context), returns interaction counts for any coach UUID. The equivalent `schools/[id]/deletion-blockers.get.ts` DOES require auth (fixed inconsistency).

**Fix:**
```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const token = getHeader(event, "authorization")?.slice(7) ?? "";
  const client = createServerSupabaseUserClient(token);  // RLS enforced
  // ... rest of handler
});
```

---

### 🟠 HIGH-4 — CSP `unsafe-inline` in Production

**OWASP:** A02 Security Misconfiguration
**File:** `server/middleware/security-headers.ts` (line 39)

```typescript
script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com
```

`unsafe-inline` defeats the core XSS protection CSP provides. Any injected inline `<script>` or event handler would execute. This is in the **production** policy.

**Fix:** Use `'strict-dynamic'` with nonces. Nuxt 3 supports CSP nonces via the `useHead` composable's experimental CSP support, or via the `@nuxtjs/security` module:

```typescript
// Preferred: use @nuxtjs/security module
// Or manually:
script-src 'strict-dynamic' 'nonce-{nonce}' https://va.vercel-scripts.com;
```

If Nuxt's HMR or runtime truly requires inline scripts, confine `unsafe-inline` to the development environment only.

---

### 🟡 MEDIUM-1 — Auth Enforcement Feature Flag

**OWASP:** A07 Authentication Failures
**File:** `middleware/auth.ts` (lines 8–16)

```typescript
const authEnforcementEnabled = config.public.authEnforcementEnabled === true;
if (!authEnforcementEnabled) {
  console.warn("[AUTH] WARNING: Auth enforcement is DISABLED...");
}
```

This is a client-side Nuxt route middleware. Server-side `requireAuth()` calls are unaffected. However, this creates an insecure default posture: if `NUXT_PUBLIC_AUTH_ENFORCEMENT_ENABLED` is not set or set incorrectly in production, the navigation guard silently disables itself. The client would allow navigation to protected pages (though server calls would still fail).

**Fix:** Remove the feature flag. The guard should always enforce. Use `NODE_ENV === 'development'` if you need to bypass for local dev, but make it explicit:

```typescript
// Remove feature flag — always enforce
// If bypassing for dev tooling, be explicit:
if (import.meta.dev && route.query.bypass_auth) { ... }
```

---

### 🟡 MEDIUM-2 — `verify-email.post.ts` Empty Token Client

**OWASP:** A07 Authentication Failures
**File:** `server/api/auth/verify-email.post.ts` (lines 24–30)

```typescript
const supabase = createServerSupabaseUserClient("");  // Empty token
```

The user client is created with no auth context. For OTP verification this works because the OTP token is passed as the operation parameter, not as the auth header. But creating a user client with an empty string is fragile and may have unintended RLS implications if the verification flow is extended. The logger also exposes `error.message` directly (line 44).

**Fix:** Use `createServerSupabaseClient()` (the anon client without RLS) for this specific public operation, or document clearly why the empty-token pattern is safe here.

---

### 🟡 MEDIUM-3 — Raw `error.message` in Client Responses

**OWASP:** A09 Security Logging & Monitoring Failures
**Files:** 8 endpoints including `admin/delete-user.post.ts:241`, `admin/health.get.ts:62,96`, `admin/stats.get.ts:75`, `suggestions/trigger-update.post.ts:54`, `debug/session.get.ts:98`

```typescript
statusMessage: error instanceof Error ? error.message : "Failed to delete user",
```

Raw exception messages can leak DB error strings, Supabase internal messages, table names, and stack details. The `sanitizeError()` utility in `server/utils/errorHandler.ts` already handles this correctly — these endpoints just don't use it.

**Fix:** Replace the pattern `error instanceof Error ? error.message : "..."` with the existing `sanitizeError()` utility throughout all affected endpoints.

---

### 🟡 MEDIUM-4 — In-Memory Rate Limiting (Ineffective at Scale)

**OWASP:** A05 Security Misconfiguration
**File:** `server/middleware/rate-limit.ts` (lines 22–30)

Vercel deploys serverless functions that may run across multiple instances and regions. The in-memory `RateLimitCache` is per-process. Auth endpoint limits (5/min) can be circumvented by hitting different Vercel instances. The code itself acknowledges this limitation in comments.

**Fix options (pick one):**
- **Vercel KV (Upstash Redis)** — drop-in with `@vercel/kv`
- **Supabase table** — simple `rate_limits` table with upsert + RLS disabled + service role
- **Vercel WAF** — configure rate limiting at the edge in `vercel.json`

Priority: auth endpoints (5/min) and email sending (20/day) are the highest value targets.

---

### 🟡 MEDIUM-5 — Tables Potentially Missing RLS

**OWASP:** A01 Broken Access Control
**Verification needed in Supabase dashboard**

The following tables are referenced in API routes but were not found with RLS policies in any migration file:
- `notifications` — user-specific notification data
- `profiles` — user profile data
- `social_media_posts` — scraped social data associated with coaches
- `preference_history` — user preference change history

**Action:** Run in Supabase SQL Editor:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Any table with `rowsecurity = false` that contains user data needs RLS.

---

### 🟢 LOW-1 — Stack Trace in Structured Logs

**File:** `server/api/user/export.post.ts` (line 119)

```typescript
stack: error instanceof Error ? error.stack : undefined,  // Remove this
```

The logger's `sanitizeLogData()` strips sensitive fields but `stack` is not in the sensitive list, so it logs through. Stack traces in logs can expose file paths and internal structure.

**Fix:** Remove the explicit `.stack` property from this log call.

---

### 🟢 LOW-2 — Env Var Validation with Empty Fallbacks

**File:** `nuxt.config.ts` (line 89)

```typescript
adminTokenSecret: process.env.NUXT_ADMIN_TOKEN_SECRET || "",
```

An empty string admin token secret means the admin token check effectively becomes `"" === ""` which is trivially true. Other missing vars will silently fail at runtime rather than at startup.

**Fix:** Add a startup validator in `server/plugins/validate-env.ts`:
```typescript
export default defineNitroPlugin(() => {
  const required = ["SUPABASE_SERVICE_ROLE_KEY", "NUXT_ADMIN_TOKEN_SECRET", "CRON_SECRET"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }
});
```

---

### 🟢 LOW-3 — No Centralized `requireAdmin()` Helper

**File:** `server/utils/auth.ts`

Each admin endpoint re-implements its own `is_admin` check. If the check logic changes (e.g., adding a separate `admin_role` column), every endpoint must be updated individually, risking inconsistency.

**Fix:** Add to `server/utils/auth.ts`:
```typescript
export async function requireAdmin(event: H3Event): Promise<AuthUser> {
  const user = await requireAuth(event);
  const isAdmin = await checkIsAdmin(user.id);
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  return user;
}
```

---

## Implementation Plan

### Phase 1 — Critical Fixes (Do Before Next Deploy)

| # | Task | File | Effort |
|---|------|------|--------|
| 1.1 | Add `requireAdmin()` check to `admin-profile.post.ts` — or gate it behind an internal secret header and remove from public API | `server/api/auth/admin-profile.post.ts` | 30min |
| 1.2 | Delete `server/middleware/00-skip-csrf.ts` and test that admin/family/preferences flows still work (they should — CSRF tokens are sent by `useAuthFetch`) | `server/middleware/00-skip-csrf.ts` | 1hr |
| 1.3 | Remove cascade-delete exemptions from `CSRF_EXEMPT_PATTERNS` in `csrf.ts` | `server/middleware/csrf.ts` | 30min |
| 1.4 | Add `requireAuth()` to `coaches/[id]/deletion-blockers.get.ts` (mirror the schools version) | `server/api/coaches/[id]/deletion-blockers.get.ts` | 20min |

**Verification:** Run `npm run test` after each change. Manually test family invite flow and coach deletion flow.

---

### Phase 2 — High Priority (This Sprint)

| # | Task | File | Effort |
|---|------|------|--------|
| 2.1 | Write migration to enable RLS on `account_links` | New migration file | 1hr |
| 2.2 | Verify RLS on `notifications`, `profiles`, `social_media_posts` tables via Supabase dashboard | Supabase dashboard | 30min |
| 2.3 | Replace `unsafe-inline` in production CSP with nonces or `strict-dynamic` | `server/middleware/security-headers.ts` | 2hr |
| 2.4 | Replace all raw `error.message` in client responses with `sanitizeError()` (8 files) | Multiple `server/api/admin/*.ts` | 1hr |
| 2.5 | Remove the auth enforcement feature flag | `middleware/auth.ts` | 30min |

---

### Phase 3 — Medium Priority (Next Sprint)

| # | Task | File | Effort |
|---|------|------|--------|
| 3.1 | Implement Redis-backed rate limiting via Vercel KV | `server/middleware/rate-limit.ts` | 3hr |
| 3.2 | Add startup environment variable validation plugin | `server/plugins/validate-env.ts` | 1hr |
| 3.3 | Add centralized `requireAdmin()` helper and update all admin routes | `server/utils/auth.ts` + 5 admin files | 2hr |
| 3.4 | Fix `verify-email.post.ts` to use correct client (not empty-token user client) | `server/api/auth/verify-email.post.ts` | 30min |
| 3.5 | Remove `.stack` from structured log in `user/export.post.ts:119` | `server/api/user/export.post.ts` | 10min |

---

### Phase 4 — Low Priority / Technical Debt

| # | Task | Effort |
|---|------|--------|
| 4.1 | Migrate remaining `account_links` access control references to `family_unit_id` | 4hr |
| 4.2 | Replace `.select("*")` with explicit column lists in deletion-blockers and admin stats | 2hr |
| 4.3 | Add request signing (HMAC + timestamp) to `sync-all` and cron endpoints | 2hr |
| 4.4 | Run `npm audit` and address any moderate+ vulnerabilities | 1hr |

---

## Positive Security Controls Confirmed

These were explicitly verified and should be maintained:

- ✅ **100% Zod input validation** across all 63 API routes
- ✅ **Zero SQL injection risk** — all Supabase queries parameterized via `.eq()` / `.in()` / `.rpc()` with object params
- ✅ **Zero `v-html` usage** in Vue components
- ✅ **`sanitize-html` library** used in composables (`useSchools`, `useCoaches`, `useInteractions`)
- ✅ **`sanitizeUrl()`** blocks `javascript:`, `data:`, `vbscript:`, `file:` protocols
- ✅ **UUID validation** on all path params via `requireUuidParam()`
- ✅ **Comprehensive security headers**: HSTS (1yr + preload), X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- ✅ **Supabase service role key** is server-only, never in public config or client code
- ✅ **Structured logging** with `sensitiveFields` sanitization — no passwords/tokens in logs
- ✅ **Email enumeration prevention** in password reset endpoint
- ✅ **Body size limits** configured (10MB uploads, 1MB API, 100KB forms)
- ✅ **Correlation IDs** for request tracing
- ✅ **Family-unit-based RLS** on all primary data tables (schools, coaches, interactions, documents, events, offers, performance_metrics)
- ✅ **CSRF token timing-safe comparison** via `crypto.timingSafeEqual()`

---

## Unresolved Questions

1. Is `admin-profile.post.ts` called from a Supabase Edge Function or internal service? If so, should it be restricted to internal network calls only?
2. Are `notifications`, `social_media_posts`, and `profiles` tables managed entirely by Supabase triggers/functions (which would bypass RLS)? If so, what is the intended access model?
3. What is the plan for deprecating the `account_links` model in favor of `family_unit_id` exclusively?
4. Does the Vercel deployment run in a single region or multi-region? This determines urgency of the Redis rate limiting fix.
