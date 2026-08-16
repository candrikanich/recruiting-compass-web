# Admin Subdomain — Design Spec

**Date:** 2026-08-16
**Branch:** `feat/admin-subdomain`
**Status:** Approved design → ready for implementation plan

## Goal

Relocate the existing admin panel from `/admin` on the main app to its own
subdomain `admin.myrecruitingcompass.com`, backed by a dedicated
`admin@therecruitingcompass.com` account, so the operator can be logged in as a
normal parent user **and** as admin at the same time (two tabs, two origins, two
sessions). This is a **relocation + isolation + dedicated account** change, not a
from-scratch build — most admin infrastructure already exists.

## Domains (confirmed)

| Host | Purpose |
|---|---|
| `myrecruitingcompass.com` | Main app (players/parents). SPA on Vercel. |
| `admin.myrecruitingcompass.com` | Admin panel (this spec). |
| `therecruitingcompass.com` | Marketing landing page (separate, untouched). |

Note: the admin **account** email lives on `@therecruitingcompass.com`. Email
domain ≠ app host — this is fine; email is only an identity string.

## Decisions (locked)

1. **Isolation:** one Nuxt app, one Vercel project, two domains. Host-based route
   middleware gates which surface renders. (Chosen over 2nd Vercel project /
   separate repo — least work, dual-login works regardless since separate
   hostname = separate origin = separate Supabase session.)
2. **Admin auth:** reuse the existing `users.is_admin` boolean as the single
   source of truth. Deprecate the redundant `role = 'admin'` enum path.
3. **No native iOS admin.** Desktop-first, mobile-responsive web only.
4. **Main-host `/admin` → hard redirect** to the admin subdomain.
5. **Relocate existing admin first.** New iOS/Web ops tooling comes in later
   passes, not this one.

## Current state (what already exists)

- Pages: `pages/admin/index.vue` (tabs: Overview, Users, Pending, System Health,
  Tools), `pages/admin/signup.vue` (token-gated account creation),
  `pages/admin/batch-fetch-logos.vue`, `pages/admin/migrate-school-sizes.vue`,
  `pages/admin/notifications/broadcast.vue`.
- Client gate: `middleware/admin.ts` (redirects unauth → `/login`, non-admin →
  `/`); `/admin` in `PROTECTED_ROUTE_PREFIXES` (`types/routes.ts`).
- Server gate: `requireAdmin(event)` in `server/utils/auth.ts` — checks
  `users.is_admin` via `useSupabaseAdmin`, throws 403. Guards ~11 endpoints under
  `server/api/admin/**`.
- Schema: `is_admin boolean DEFAULT false` (migration `019`), set manually.
- Account creation: `/admin/signup` validates an HMAC token from
  `NUXT_ADMIN_TOKEN_SECRET` (`server/utils/adminToken.ts`).
- App is **SPA** (`ssr: false`, Vercel preset). No host/subdomain handling exists.

## Design

### 1. Host-based routing

Add a global route middleware (`middleware/host.global.ts`) that reads the
request host:

- On `admin.myrecruitingcompass.com`: allow only `/admin/**`. Any other path →
  redirect to `/admin`.
- On the main host: any `/admin/**` path → **hard redirect** to
  `https://admin.myrecruitingcompass.com<path>` (external redirect).

**Security boundary is the server, not this middleware.** Because the app is a
SPA, route middleware runs client-side and is UX routing only. Real enforcement
stays on the API layer where every admin endpoint already calls `requireAdmin()`.
Admin UI JavaScript remains part of the shared client bundle (downloadable, but
contains no secrets — accepted tradeoff of the single-project choice).

Host detection: on the client, use `window.location.host`; during any
SSR/prerender path use the `x-forwarded-host` header via `useRequestHeaders`.
Provide a small `useAppHost()` composable so host logic has one home and is
testable. A `runtimeConfig.public.adminHost` value (default
`admin.myrecruitingcompass.com`) keeps the hostname out of code literals and lets
preview/QA environments override it.

### 2. Admin authorization

- `users.is_admin` boolean stays the **single source of truth**.
- Fix `stores/user.ts`: `isAdmin` computed currently reads `role === "admin"` —
  change it to read `is_admin`. This removes the two-signal drift where the store
  and `requireAdmin()` could disagree.
- Leave `users.role` as `parent | player` for app users. The `admin` enum value
  stays in the type for backward-compat but is no longer read for authorization;
  note it as deprecated.
- Create `admin@therecruitingcompass.com` via the existing `/admin/signup`
  token flow, then set `is_admin = true` (SQL update, matching migration `019`'s
  documented manual process).

### 3. Dual-login (the core requirement)

No code needed beyond the subdomain — it falls out of origin isolation:

- Tab A → `myrecruitingcompass.com`, signed in as a parent account.
- Tab B → `admin.myrecruitingcompass.com`, signed in as `admin@…`.
- Supabase persists the session in `localStorage`, keyed per origin, so the two
  sessions never collide.

**Invariant to preserve:** Supabase auth must stay per-origin `localStorage`
(the SPA default). Do **not** set the auth cookie domain to
`.myrecruitingcompass.com` (parent-wildcard) — that would share one session
across subdomains and break dual-login. Any cookie must be scoped to the exact
host.

### 4. Fixes folded into the move

- `pages/admin/migrate-school-sizes.vue`: add `admin` to middleware (currently
  `["auth"]` only — under-guarded).
- `pages/admin/batch-fetch-logos.vue`: add `admin` middleware (none shown).
- `middleware/onboarding.ts`: **bypass when `is_admin`**. The `admin@` account has
  no family/athlete; without this the onboarding redirect traps the account and
  it can never reach the panel. **Must-fix.**
- `middleware/viewLogging.global.ts`: skip on the admin host (parent-view logging
  is irrelevant there).

### 5. Infra / ops

- DNS: `admin` CNAME → Vercel; add `admin.myrecruitingcompass.com` as a domain on
  the existing Vercel project.
- `robots` disallow + `noindex` on the admin host (do not index the ops panel).
- Optional: Vercel deployment protection on the admin domain as a second gate.

## Out of scope (YAGNI)

- Impersonation / "log in as this user" — different, riskier feature (audit log,
  consent, scoped tokens). Not needed for the "my own two hats" use case.
- Audit logging of admin actions.
- Native iOS admin app.
- Separate repo or second Vercel project.
- New iOS/Web ops tooling (later pass; relocate first).

## Testing

- Unit: `useAppHost()` host resolution (admin host, main host, forwarded header,
  missing header); `isAdmin` computed reads `is_admin`.
- Middleware: host middleware redirects (`/foo` on admin host → `/admin`;
  `/admin` on main host → external admin URL); onboarding bypass for `is_admin`.
- Integration: `requireAdmin` unchanged (regression only).
- Manual: dual-login smoke — parent in one tab, `admin@` in another, confirm both
  sessions persist across reloads; confirm main-host `/admin` hard-redirects;
  confirm the two under-guarded tool pages now 403 for non-admins.

## Open items

- DNS + Vercel domain add is a manual operator step (out of code) — call out in
  the plan as a prerequisite before the host redirect goes live, so main-host
  `/admin` isn't redirected to a domain that doesn't resolve yet.
- Confirm prod Vercel project identity before adding the domain (per project
  memory, local `.vercel` links to QA; prod project is
  `recruiting-compass-web-production`).
