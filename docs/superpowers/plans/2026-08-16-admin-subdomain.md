# Admin Subdomain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the existing admin panel to `admin.myrecruitingcompass.com` behind a dedicated `admin@therecruitingcompass.com` account, enabling simultaneous parent + admin login via origin isolation.

**Architecture:** One Nuxt SPA, one Vercel project, two domains. A global client-side route middleware gates surfaces by host: admin routes only render on the admin host; `/admin` on the main host hard-redirects to the admin subdomain. Authorization stays server-enforced via the existing `requireAdmin()`; `users.is_admin` is the single source of truth. Dual-login falls out of per-origin Supabase `localStorage` sessions — no session code changes.

**Tech Stack:** Nuxt 3 (`ssr: false` SPA), Vue 3 `<script setup>`, TypeScript strict, Pinia, Supabase Auth, Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-16-admin-subdomain-design.md`

## Global Constraints

- Hosts (exact): main app `myrecruitingcompass.com`; admin `admin.myrecruitingcompass.com`; marketing `therecruitingcompass.com` (untouched).
- App is `ssr: false` (SPA). Route middleware runs client-side only — host detection uses `window.location.host`, never request headers. This is UX routing, **not** a security boundary.
- Security boundary is the server. Every admin API already calls `requireAdmin()`; do not weaken or duplicate it.
- `users.is_admin` (boolean) is the single admin signal. The `role = 'admin'` enum value is deprecated for authorization — do not read it for admin checks.
- Dual-login invariant: keep Supabase session in per-origin `localStorage`. Never set the auth cookie domain to `.myrecruitingcompass.com`.
- Admin host name lives in `runtimeConfig.public.adminHost` — no bare hostname literals in logic.
- No raw hex / rgba in styles (repo rule `npm run audit:tokens`). This plan adds no new styled UI.

---

### Task 1: `useAppHost()` composable + `adminHost` runtime config

Single home for host logic: is this the admin host, and what is the admin origin URL.

**Files:**
- Modify: `nuxt.config.ts:190-201` (add `adminHost` to `runtimeConfig.public`)
- Create: `composables/useAppHost.ts`
- Test: `tests/composables/useAppHost.test.ts`

**Interfaces:**
- Consumes: `useRuntimeConfig().public.adminHost` (string).
- Produces:
  - `useAppHost(): { currentHost: string; adminHost: string; isAdminHost: boolean; adminOrigin: string; toAdminUrl(path: string): string }`
  - `currentHost` = `window.location.host` on client, `""` on server.
  - `isAdminHost` = `currentHost === adminHost`.
  - `adminOrigin` = `https://${adminHost}`.
  - `toAdminUrl(path)` = `adminOrigin` + path (path assumed to start with `/`).

- [ ] **Step 1: Add runtime config.** In `nuxt.config.ts`, inside `runtimeConfig.public` (after `isVercel`), add:

```ts
      adminHost: process.env.NUXT_PUBLIC_ADMIN_HOST || "admin.myrecruitingcompass.com",
```

- [ ] **Step 2: Write the failing test** at `tests/composables/useAppHost.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const adminHost = "admin.myrecruitingcompass.com";
vi.mock("#imports", () => ({
  useRuntimeConfig: () => ({ public: { adminHost } }),
}));

import { computeAppHost } from "~/composables/useAppHost";

describe("computeAppHost", () => {
  it("flags the admin host", () => {
    const r = computeAppHost("admin.myrecruitingcompass.com", adminHost);
    expect(r.isAdminHost).toBe(true);
    expect(r.adminOrigin).toBe("https://admin.myrecruitingcompass.com");
  });

  it("flags the main host as non-admin", () => {
    const r = computeAppHost("myrecruitingcompass.com", adminHost);
    expect(r.isAdminHost).toBe(false);
  });

  it("treats empty (server) host as non-admin", () => {
    expect(computeAppHost("", adminHost).isAdminHost).toBe(false);
  });

  it("builds an absolute admin url from a path", () => {
    const r = computeAppHost("myrecruitingcompass.com", adminHost);
    expect(r.toAdminUrl("/admin/users")).toBe(
      "https://admin.myrecruitingcompass.com/admin/users",
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails.** Run: `npx vitest run tests/composables/useAppHost.test.ts`. Expected: FAIL — `computeAppHost` not exported.

- [ ] **Step 4: Implement** `composables/useAppHost.ts`:

```ts
import { useRuntimeConfig } from "#imports";

export interface AppHost {
  currentHost: string;
  adminHost: string;
  isAdminHost: boolean;
  adminOrigin: string;
  toAdminUrl: (path: string) => string;
}

export function computeAppHost(currentHost: string, adminHost: string): AppHost {
  const adminOrigin = `https://${adminHost}`;
  return {
    currentHost,
    adminHost,
    isAdminHost: currentHost !== "" && currentHost === adminHost,
    adminOrigin,
    toAdminUrl: (path: string) => `${adminOrigin}${path}`,
  };
}

export function useAppHost(): AppHost {
  const adminHost = useRuntimeConfig().public.adminHost as string;
  const currentHost = import.meta.client ? window.location.host : "";
  return computeAppHost(currentHost, adminHost);
}
```

- [ ] **Step 5: Run test to verify it passes.** Run: `npx vitest run tests/composables/useAppHost.test.ts`. Expected: PASS (4 tests).

- [ ] **Step 6: Type-check.** Run: `npm run type-check`. Expected: 0 errors.

- [ ] **Step 7: Commit.**

```bash
git add nuxt.config.ts composables/useAppHost.ts tests/composables/useAppHost.test.ts
git commit -m "feat(admin): add useAppHost composable + adminHost runtime config"
```

---

### Task 2: Global host-routing middleware

Gate surfaces by host: on admin host allow only `/admin/**`; on main host hard-redirect `/admin/**` to the admin origin.

**Files:**
- Create: `middleware/host.global.ts`
- Test: `tests/middleware/host.test.ts`

**Interfaces:**
- Consumes: `computeAppHost` from Task 1; a pure `resolveHostRedirect` helper (below) for testability.
- Produces: `resolveHostRedirect(host: string, path: string, adminHost: string): { type: "external"; to: string } | { type: "internal"; to: string } | null` — `null` means allow navigation. External = full URL (main→admin), internal = same-origin path (admin host → `/admin`).

- [ ] **Step 1: Write the failing test** at `tests/middleware/host.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveHostRedirect } from "~/middleware/host.global";

const admin = "admin.myrecruitingcompass.com";
const main = "myrecruitingcompass.com";

describe("resolveHostRedirect", () => {
  it("redirects /admin on the main host to the admin origin (external)", () => {
    expect(resolveHostRedirect(main, "/admin", admin)).toEqual({
      type: "external",
      to: "https://admin.myrecruitingcompass.com/admin",
    });
  });

  it("preserves the subpath on the external redirect", () => {
    expect(resolveHostRedirect(main, "/admin/users", admin)).toEqual({
      type: "external",
      to: "https://admin.myrecruitingcompass.com/admin/users",
    });
  });

  it("allows non-admin paths on the main host", () => {
    expect(resolveHostRedirect(main, "/schools", admin)).toBeNull();
  });

  it("allows /admin paths on the admin host", () => {
    expect(resolveHostRedirect(admin, "/admin/users", admin)).toBeNull();
  });

  it("redirects non-admin paths on the admin host to /admin (internal)", () => {
    expect(resolveHostRedirect(admin, "/schools", admin)).toEqual({
      type: "internal",
      to: "/admin",
    });
  });

  it("does nothing when host is empty (server/SPA pre-hydration)", () => {
    expect(resolveHostRedirect("", "/admin", admin)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `npx vitest run tests/middleware/host.test.ts`. Expected: FAIL — module/export missing.

- [ ] **Step 3: Implement** `middleware/host.global.ts`:

```ts
export function resolveHostRedirect(
  host: string,
  path: string,
  adminHost: string,
): { type: "external"; to: string } | { type: "internal"; to: string } | null {
  if (host === "") return null;
  const onAdminHost = host === adminHost;
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");

  if (onAdminHost) {
    return isAdminPath ? null : { type: "internal", to: "/admin" };
  }
  // main (non-admin) host
  return isAdminPath
    ? { type: "external", to: `https://${adminHost}${path}` }
    : null;
}

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return;
  const adminHost = useRuntimeConfig().public.adminHost as string;
  const decision = resolveHostRedirect(window.location.host, to.path, adminHost);
  if (!decision) return;
  if (decision.type === "external") {
    return navigateTo(decision.to, { external: true });
  }
  return navigateTo(decision.to);
});
```

- [ ] **Step 4: Run test to verify it passes.** Run: `npx vitest run tests/middleware/host.test.ts`. Expected: PASS (6 tests).

- [ ] **Step 5: Type-check.** Run: `npm run type-check`. Expected: 0 errors.

- [ ] **Step 6: Commit.**

```bash
git add middleware/host.global.ts tests/middleware/host.test.ts
git commit -m "feat(admin): global host middleware routes admin surface by domain"
```

---

### Task 3: Fix `isAdmin` drift + admin onboarding bypass

Make the store's `isAdmin` read the boolean source of truth, and stop the onboarding redirect from trapping the family-less admin account.

**Files:**
- Modify: `stores/user.ts:29`
- Modify: `middleware/onboarding.ts:41-48`
- Test: `tests/stores/user.isAdmin.test.ts`, `tests/middleware/onboarding.admin.test.ts`

**Interfaces:**
- Consumes: `User.is_admin?: boolean` (already on `types/models.ts`).
- Produces: store `isAdmin` computed returns `user.is_admin === true`. Onboarding middleware short-circuits (returns without redirect) when the loaded profile has `is_admin === true`.

- [ ] **Step 1: Write the failing store test** at `tests/stores/user.isAdmin.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";

describe("user store isAdmin", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("is true when is_admin is true regardless of role", () => {
    const store = useUserStore();
    store.user = { id: "1", email: "a@b.c", role: "parent", is_admin: true };
    expect(store.isAdmin).toBe(true);
  });

  it("is false when is_admin is falsy even if role says admin", () => {
    const store = useUserStore();
    store.user = { id: "1", email: "a@b.c", role: "admin" };
    expect(store.isAdmin).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run tests/stores/user.isAdmin.test.ts`. Expected: FAIL — current computed reads `role === "admin"` (first test false, second true).

- [ ] **Step 3: Fix the store.** In `stores/user.ts:29` replace:

```ts
  const isAdmin = computed(() => user.value?.role === "admin");
```

with:

```ts
  const isAdmin = computed(() => user.value?.is_admin === true);
```

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run tests/stores/user.isAdmin.test.ts`. Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing onboarding test** at `tests/middleware/onboarding.admin.test.ts`. Extract the redirect decision into a pure helper so it is testable without Nuxt navigation:

```ts
import { describe, it, expect } from "vitest";
import { shouldRedirectToOnboarding } from "~/middleware/onboarding";

describe("shouldRedirectToOnboarding", () => {
  it("never redirects an admin, even with incomplete onboarding", () => {
    expect(
      shouldRedirectToOnboarding({ is_admin: true, onboarding_complete: false }),
    ).toBe(false);
  });

  it("redirects a non-admin with incomplete onboarding", () => {
    expect(
      shouldRedirectToOnboarding({ is_admin: false, onboarding_complete: false }),
    ).toBe(true);
  });

  it("does not redirect a non-admin who completed onboarding", () => {
    expect(
      shouldRedirectToOnboarding({ is_admin: false, onboarding_complete: true }),
    ).toBe(false);
  });
});
```

- [ ] **Step 6: Run to verify it fails.** Run: `npx vitest run tests/middleware/onboarding.admin.test.ts`. Expected: FAIL — `shouldRedirectToOnboarding` not exported.

- [ ] **Step 7: Refactor onboarding middleware** to add and use the helper. In `middleware/onboarding.ts`, add above the default export:

```ts
export function shouldRedirectToOnboarding(input: {
  is_admin?: boolean | null;
  onboarding_complete?: boolean | null;
}): boolean {
  if (input.is_admin === true) return false;
  return input.onboarding_complete !== true;
}
```

Change the profile select to also fetch `is_admin`, and replace the completion check + redirect (lines ~29-48) with:

```ts
    const { data, error } = (await supabase
      .from("users")
      .select("phase_milestone_data, is_admin")
      .eq("id", session.value.user.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single()) as {
      data: { phase_milestone_data: any; is_admin: boolean | null } | null;
      error: any;
    };

    if (error) {
      logger.error("Failed to check onboarding status", error);
      return;
    }

    if (
      shouldRedirectToOnboarding({
        is_admin: data?.is_admin,
        onboarding_complete: data?.phase_milestone_data?.onboarding_complete,
      })
    ) {
      return navigateTo("/onboarding");
    }
```

- [ ] **Step 8: Run to verify it passes.** Run: `npx vitest run tests/middleware/onboarding.admin.test.ts`. Expected: PASS (3 tests).

- [ ] **Step 9: Type-check.** Run: `npm run type-check`. Expected: 0 errors.

- [ ] **Step 10: Commit.**

```bash
git add stores/user.ts middleware/onboarding.ts tests/stores/user.isAdmin.test.ts tests/middleware/onboarding.admin.test.ts
git commit -m "fix(admin): isAdmin reads is_admin flag; bypass onboarding for admins"
```

---

### Task 4: Guard under-protected admin tool pages + skip view-logging on admin host

Close the two tool pages that lack the admin gate, and short-circuit parent view-logging on the admin host.

**Files:**
- Modify: `pages/admin/migrate-school-sizes.vue:85-86`
- Modify: `pages/admin/batch-fetch-logos.vue` (add `definePageMeta` — currently none)
- Modify: `middleware/viewLogging.global.ts` (early return on admin host)

**Interfaces:**
- Consumes: existing `admin` route middleware; `useAppHost().isAdminHost` from Task 1.
- Produces: both tool pages carry `middleware: ["auth", "admin"]`; view-logging is a no-op on the admin host.

- [ ] **Step 1: Guard `migrate-school-sizes.vue`.** Replace `middleware: ["auth"],` (line 86) with:

```ts
  middleware: ["auth", "admin"],
```

- [ ] **Step 2: Guard `batch-fetch-logos.vue`.** Immediately after the `<script setup lang="ts">` line (page currently has no `definePageMeta`), add:

```ts
definePageMeta({
  middleware: ["auth", "admin"],
});
```

- [ ] **Step 3: Skip view-logging on the admin host.** In `middleware/viewLogging.global.ts`, at the top of the middleware body (after the `if (process.server) return;` guard), add:

```ts
    if (useAppHost().isAdminHost) return;
```

- [ ] **Step 4: Verify guarded pages redirect non-admins.** This is covered by the existing `admin` middleware (unit-tested elsewhere); confirm no regressions. Run: `npx vitest run tests/middleware/host.test.ts tests/composables/useAppHost.test.ts`. Expected: PASS.

- [ ] **Step 5: Type-check + lint.** Run: `npm run type-check && npm run lint`. Expected: 0 errors on changed files.

- [ ] **Step 6: Commit.**

```bash
git add pages/admin/migrate-school-sizes.vue pages/admin/batch-fetch-logos.vue middleware/viewLogging.global.ts
git commit -m "fix(admin): gate migrate/logos tool pages; skip view-logging on admin host"
```

---

### Task 5: `noindex` on admin host + ops runbook (DNS, Vercel, account)

Keep the ops panel out of search indexes, and document the manual steps that live outside code.

**Files:**
- Modify: `app.vue` (or the root layout that all pages share — confirm which wraps every route) to add a host-conditional `noindex` meta.
- Create: `docs/superpowers/plans/admin-subdomain-runbook.md`
- Test: `tests/composables/useAppHost.test.ts` already covers `isAdminHost`; no new unit test needed for the meta tag (declarative).

**Interfaces:**
- Consumes: `useAppHost().isAdminHost`, `useHead`.
- Produces: `<meta name="robots" content="noindex, nofollow">` present only when on the admin host.

- [ ] **Step 1: Add conditional noindex.** In `app.vue` `<script setup>`, add:

```ts
const { isAdminHost } = useAppHost();
if (isAdminHost) {
  useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
}
```

(If `app.vue` has no `<script setup>`, add one. Confirm `app.vue` renders on every route — it is the SPA root.)

- [ ] **Step 2: Write the runbook** at `docs/superpowers/plans/admin-subdomain-runbook.md`:

```markdown
# Admin Subdomain — Operator Runbook (manual steps)

These steps live outside code and must be done by the operator. Do the DNS +
Vercel steps BEFORE deploying the host middleware, so the main-host `/admin`
redirect points at a domain that already resolves.

## 1. Vercel domain (prod project = recruiting-compass-web-production)
- Confirm the prod project identity first (local `.vercel` may link to QA).
- Add domain `admin.myrecruitingcompass.com` to the prod project.
- Set env `NUXT_PUBLIC_ADMIN_HOST=admin.myrecruitingcompass.com` (Production).

## 2. DNS
- Add a CNAME `admin` → the Vercel target shown in the domain settings.
- Wait for verification (Vercel shows "Valid Configuration").

## 3. Create the admin account
- Visit https://admin.myrecruitingcompass.com/admin/signup
- Complete signup with `admin@therecruitingcompass.com` using a valid token
  (HMAC of NUXT_ADMIN_TOKEN_SECRET; see server/utils/adminToken.ts).
- In the DB: `UPDATE users SET is_admin = true WHERE email = 'admin@therecruitingcompass.com';`

## 4. Smoke test (dual-login)
- Tab A: myrecruitingcompass.com — sign in as a parent test account.
- Tab B: admin.myrecruitingcompass.com — sign in as admin@. Both persist on reload.
- On myrecruitingcompass.com, visit /admin → hard-redirects to admin host.
- On admin host, visit /schools → redirects to /admin.
- As a non-admin, hit /admin/migrate-school-sizes and /admin/batch-fetch-logos → redirected to /.

## 5. Cookie invariant
- Do NOT set the Supabase auth cookie domain to `.myrecruitingcompass.com`.
  Sessions must stay per-origin (localStorage) or dual-login breaks.
```

- [ ] **Step 3: Type-check + lint.** Run: `npm run type-check && npm run lint`. Expected: 0 errors on changed files.

- [ ] **Step 4: Commit.**

```bash
git add app.vue docs/superpowers/plans/admin-subdomain-runbook.md
git commit -m "chore(admin): noindex admin host + operator runbook"
```

---

### Task 6: Full verification pass

- [ ] **Step 1: Full unit suite.** Run: `npm run test`. Expected: all pass (new tests green, no regressions).
- [ ] **Step 2: Type-check.** Run: `npm run type-check`. Expected: 0 errors.
- [ ] **Step 3: Lint.** Run: `npm run lint`. Expected: 0 errors.
- [ ] **Step 4: Token audit.** Run: `npm run audit:tokens`. Expected: pass (no new styled UI).
- [ ] **Step 5: Manual dev smoke.** Run: `npm run dev`. With `NUXT_PUBLIC_ADMIN_HOST` set to a local alias (or temporarily to `localhost:3000` to exercise `isAdminHost`), confirm: `/admin` renders for an admin; non-admin `/admin/*` redirects; host redirect logic fires. Note: true cross-subdomain behavior can only be fully verified in a deployed preview with the real domain.
- [ ] **Step 6: Push branch.** Run: `git push -u origin feat/admin-subdomain`. Expected: hooks pass.

## Notes for the executor

- Do NOT run the DNS/Vercel/account steps from Task 5's runbook as code — they are manual operator actions. The code must be safe to merge before they happen: the host middleware no-ops until `NUXT_PUBLIC_ADMIN_HOST` traffic actually arrives, and the main-host `/admin` redirect only fires client-side for real visitors.
- The parked stash `stash@{0}` (consent-plan iOS progress) belongs to `feat/notification-delivery` — leave it alone.
- This plan relocates the existing admin only. New iOS/Web ops tooling is a later, separate plan.
