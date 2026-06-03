# Email Unsubscribe / List-Unsubscribe — Design

**Date:** 2026-06-03
**Status:** Approved (design), pending implementation
**Audit ref:** Email audit finding #4 (List-Unsubscribe header + opt-out endpoint)
**Approach:** C — stateless HMAC token + minimal `email_optouts` table + enforce in send path

## Problem

Recurring (marketing-class) emails — `weekly-digest`, `deadline-alert` — ship with no
unsubscribe mechanism. This violates CAN-SPAM (§ requires a working opt-out), GDPR/CASL
consent-withdrawal, and Gmail/Yahoo 2024 bulk-sender rules (one-click List-Unsubscribe
required). Transactional mail (invites, auth, password reset) is exempt and stays untouched.

## Scope

**In:**
- Stateless signed unsubscribe token (no per-send DB write).
- `email_optouts` suppression table (one row per opted-out address).
- `GET /api/email/unsubscribe` — human click → upsert opt-out → confirmation HTML page.
- `POST /api/email/unsubscribe` — RFC 8058 one-click (mail client auto-POST) → upsert → 202.
- `List-Unsubscribe` + `List-Unsubscribe-Post` headers on recurring sends only.
- Visible footer unsubscribe link in `weekly-digest` + `deadline-alert` templates.
- Suppression enforced in `/api/email/send` (skip send if opted out).

**Out (deferred):**
- Full preference center / per-category toggles (#4 was scoped minimal — recurring path is
  Dormant/unsure per user).
- Resend webhooks + bounce/complaint suppression (audit #5).
- Resubscribe UI (opt-out is one-way for now; manual DB delete to reverse).

## Token design

Stateless, no DB lookup to verify. Mirrors `server/utils/adminToken.ts` HMAC pattern.

```
token = HMAC-SHA256(secret, "unsubscribe:" + normalizedEmail).hexdigest()
link  = `${baseUrl}/api/email/unsubscribe?email=${enc(email)}&token=${token}`
```

- `normalizedEmail` = `email.trim().toLowerCase()` (same normalization used for storage +
  suppression check, so token and table key always agree).
- Verify: recompute HMAC over `email` query param, `timingSafeEqual` against `token` param.
  Length-check before compare (timing-safe pattern from `adminToken.ts`).
- **Secret:** new runtime key `unsubscribeSecret`, falling back to `adminTokenSecret` so it
  works with zero new env config today, but can be separated later:
  ```ts
  unsubscribeSecret: process.env.NUXT_UNSUBSCRIBE_SECRET
    || process.env.NUXT_ADMIN_TOKEN_SECRET || ""
  ```
- No expiry. Unsubscribe links should never rot (CAN-SPAM: opt-out must work ≥30 days; we
  exceed that with non-expiring). Token only authorizes opt-OUT (safe, idempotent) — no
  opt-IN power, so a leaked token can at worst unsubscribe the address it already encodes.

New file: `server/utils/unsubscribeToken.ts`
- `generateUnsubscribeToken(email, secret): string`
- `verifyUnsubscribeToken(email, token, secret): boolean`
- `normalizeEmail(email): string` (exported, reused by send path + endpoint)

## Database

Migration `supabase/migrations/20260603000000_create_email_optouts.sql`:

```sql
create table if not exists email_optouts (
  email      text primary key,
  created_at timestamptz not null default now()
);
-- PK on email already indexes the only filter column (suppression .eq("email", ...)).
-- No RLS policy needed: table is service-role only (server suppression checks); never
-- queried from client. RLS enabled + no policy = deny-all to anon/auth, which is correct.
alter table email_optouts enable row level security;
```

Access via `useSupabaseAdmin()` (service role), consistent with other server utils.

## Endpoints

New file: `server/api/email/unsubscribe.ts` (handles both GET + POST via method switch),
OR two files `unsubscribe.get.ts` / `unsubscribe.post.ts` (Nitro convention). **Decision:
two files** — matches repo's existing `*.get.ts` / `*.post.ts` routing.

### `GET /api/email/unsubscribe.get.ts`
1. `useLogger(event, "email/unsubscribe")`.
2. Read `email`, `token` from query. Zod-validate (`email()`, non-empty token).
3. `verifyUnsubscribeToken(email, token, secret)` → false → 400 `setResponseStatus`, render
   neutral "invalid or expired link" HTML (no detail leak).
4. Valid → `upsert` into `email_optouts` (`onConflict: "email"`, ignore dup).
5. Return `text/html` confirmation page ("You've been unsubscribed from …").
- **No auth** — recipient clicking from inbox is unauthenticated by design.

### `POST /api/email/unsubscribe.post.ts` (RFC 8058 one-click)
1. Same verify (email+token from query string; clients POST to the URL as-is).
2. Valid → upsert → `setResponseStatus(event, 202)`, return `{ success: true }`.
3. Invalid → 400 `{ success: false }`.
- **No auth, no CSRF** — RFC 8058 one-click POST carries no cookies/CSRF token; the HMAC
  token IS the auth. (CSRF middleware must exempt this route — verify exemption or the
  one-click POST will 403.)

## Send-path enforcement (`server/api/email/send.post.ts`)

Before building/sending, for `weekly-digest` + `deadline-alert` only:
```ts
const normalized = normalizeEmail(to);
const { data: optout } = await useSupabaseAdmin()
  .from("email_optouts").select("email").eq("email", normalized).maybeSingle();
if (optout) {
  logger.info("Recipient opted out, skipping recurring email", { template });
  return { success: true, skipped: true };  // silent success, no send
}
```
Return shape gains optional `skipped?: boolean`. Transactional sends (via `sendEmail`
directly elsewhere) do NOT check suppression.

## Headers + footer (recurring templates only)

`sendNotificationEmail` / `sendEmail` gain optional `listUnsubscribeUrl?: string`. When
present, `sendViaResend` adds to the Resend payload:
```ts
headers: {
  "List-Unsubscribe": `<${listUnsubscribeUrl}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
}
```
- send.post.ts computes `listUnsubscribeUrl = generate…` and passes it for the two recurring
  templates.
- `renderWeeklyDigestEmail` / `renderDeadlineAlertEmail` get a footer line:
  `If you'd rather not receive these, unsubscribe.` (link = same URL, `escapeHtml` +
  `sanitizeUrl` already in module).
- Resend SDK `emails.send` supports a `headers` field — verify field name in SDK v6 types
  before wiring (TDD test will catch mismatch).

## Dormant-endpoint flag

`/api/email/send` has no internal caller (confirmed during audit). Add a top-of-handler
comment noting it's currently unwired so a future reader doesn't assume it's live. Not
deleting it — it's the designated recurring-send entry point.

## TDD plan (red → green per unit)

1. `tests/unit/server/utils/unsubscribeToken.spec.ts`
   - generate→verify round-trips true
   - wrong token → false
   - tampered email → false
   - empty secret → false (warn)
   - normalizeEmail lowercases + trims; token stable across case variants
2. `tests/unit/server/api/email/unsubscribe.spec.ts` (or handler-level)
   - GET valid token → upsert called, 200 html
   - GET bad token → 400, no upsert
   - POST valid → 202
   - POST bad → 400
3. `tests/unit/server/api/email/send.spec.ts` (extend/new)
   - opted-out recipient → `skipped:true`, sendViaResend NOT called
   - non-opted recipient → send proceeds, List-Unsubscribe header present in payload
4. emailService: header passthrough when `listUnsubscribeUrl` set; absent otherwise.

## Open questions / review flags

1. ~~**CSRF exemption** for `POST /api/email/unsubscribe`~~ **RESOLVED** — add
   `/api/email/unsubscribe` to `CSRF_EXEMPT_EXACT_PATHS` in `server/middleware/csrf.ts`
   (existing allowlist, line 32). One-line change, included in impl.
2. **Secret choice** — reuse `adminTokenSecret` (zero-config, approved) vs dedicated
   `NUXT_UNSUBSCRIBE_SECRET`. Spec uses fallback chain (both work). OK?
3. **Footer link** wording / placement — minimal one-liner proposed. Fine, or match a
   specific brand voice?
4. Resend SDK v6 `headers` field name — verify in types during impl (test-guarded).
```
