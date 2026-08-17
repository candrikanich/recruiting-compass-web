# Admin Support Tooling (#1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an admin a read-only, audited snapshot of any user's full recruiting picture at `/admin/users/[id]`, to reproduce support issues without impersonation or writes.

**Architecture:** A `requireAdmin`-gated, service-role, SELECT-only detail endpoint aggregates the target user's account + `family_unit_id`-scoped data (safe-column allowlist), logs a `view_as.start` audit row, and returns one typed object. A read-only admin page renders it with a red "viewing as" banner using foundation primitives (AdminStatTile/AdminDataTable). Users-list rows link to it.

**Tech Stack:** Nuxt 3 (Vue 3 `<script setup>`, TS strict), Nitro API routes, Supabase (`useSupabaseAdmin()` service role), Zod, Vitest, Playwright, TailwindCSS.

**Spec:** `docs/superpowers/specs/2026-08-17-admin-support-design.md`

## Global Constraints

- `requireAdmin(event)` before any DB work in the detail endpoint.
- Detail endpoint is **SELECT-only** — no insert/update/delete path.
- **Account safe-column allowlist** (never `select('*')`, never PII/secrets):
  `id, email, full_name, role, is_admin, created_at, graduation_year, current_phase, onboarding_completed, status_label, deletion_requested_at`.
  Explicitly EXCLUDE PII not needed for triage: `date_of_birth, zip_code, gpa, sat_score, act_score, hometown_*, guardian_consent_*`. (`public.users` holds no auth secrets — those live in `auth.users` — so the risk is PII, not credentials.)
- uuid-validate `[id]` with Zod; 400 on malformed, 404 on not-found, 500 with a generic message (no raw Postgres text).
- `logAdminAction` is fire-and-forget (never blocks/breaks the response).
- Client composable shape `{ data, loading, error, fetch* }`; admin fetches attach `useAdminAuthHeaders`.
- No raw hex/rgba (`npm run audit:tokens`); use brand tokens / DesignSystem* states.
- TS strict, no `any` except tests. Immutability via spread.
- Migrations n/a (no schema change this spec).
- E2E admin pages need `NUXT_PUBLIC_ADMIN_HOST=localhost:3003` (else `/admin` bounces to prod login).
- Reuse foundation: `logAdminAction`+`view_as.start`, `components/Admin/AdminDataTable.vue`, `AdminStatTile.vue`, `layouts/admin.vue`, `useAdminAuthHeaders`.
- Components live in `components/Admin/` (capital A). Unit tests under `tests/unit/**`, `.spec.ts`.

**Search note:** `useAdminUsers` already loads all users and filters client-side (`searchQuery`+`filteredUsers`), so user search already works — NO server-side search endpoint is built here (YAGNI at current scale).

---

### Task 1: User detail endpoint + composable + types

**Files:**
- Create: `server/api/admin/users/[id].get.ts`
- Create: `composables/useAdminUserDetail.ts`
- Create: `types/adminUserDetail.ts`
- Test: `tests/unit/server/api/admin/users-id.get.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin` (sets `event.context.adminUserId`), `useSupabaseAdmin()`, `logAdminAction` (`server/utils/adminAudit.ts`), `useAdminAuthHeaders`.
- Produces: `GET /api/admin/users/:id` → `AdminUserDetail` (below). Composable `useAdminUserDetail()` → `{ data, loading, error, fetchDetail(id) }`.

```ts
// types/adminUserDetail.ts
export interface AdminUserDetail {
  account: {
    id: string; email: string; full_name: string | null; role: string;
    is_admin: boolean; created_at: string; graduation_year: number | null;
    current_phase: string | null; onboarding_completed: boolean | null;
    status_label: string | null; deletion_requested_at: string | null;
  };
  familyUnitId: string | null;
  family: {
    unit: Record<string, unknown> | null;
    members: Record<string, unknown>[];
    pendingInvitations: Record<string, unknown>[];
  };
  athletes: Record<string, unknown>[];
  recruiting: {
    counts: { schools: number; coaches: number; interactions: number; offers: number; events: number; messages: number };
    recentInteractions: Record<string, unknown>[];
    recentOffers: Record<string, unknown>[];
    recentEvents: Record<string, unknown>[];
    recentMessages: Record<string, unknown>[];
  };
}
```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/admin/users-id.get.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const ACCOUNT = { id: "11111111-1111-1111-1111-111111111111", email: "u@x.com", full_name: "U", role: "player", is_admin: false, created_at: "2026-01-01T00:00:00Z", graduation_year: 2027, current_phase: "build", onboarding_completed: true, status_label: "on_track", deletion_requested_at: null };

// Chainable query-builder stub keyed by table name.
const tables: Record<string, any> = {};
function tableStub(name: string) {
  const rows = tables[name] ?? [];
  const b: any = {
    _rows: rows,
    select: () => b, eq: () => b, order: () => b, limit: () => b,
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (res: any) => res({ data: rows, error: null, count: rows.length }),
  };
  return b;
}
vi.mock("../../../../../server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({ from: (t: string) => tableStub(t) }),
}));
const requireAdmin = vi.fn(async (e: any) => { e.context.adminUserId = "admin-1"; return { id: "admin-1" }; });
vi.mock("../../../../../server/utils/auth", () => ({ requireAdmin }));
const logAdminAction = vi.fn(async () => {});
vi.mock("../../../../../server/utils/adminAudit", () => ({ logAdminAction }));

import handler from "../../../../../server/api/admin/users/[id].get";

const mkEvent = (id: string) => ({ context: { params: { id } }, node: { req: {} } }) as any;

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  tables["users"] = [ACCOUNT];
  tables["family_members"] = [{ user_id: ACCOUNT.id, family_unit_id: "fam-1" }];
  requireAdmin.mockClear(); logAdminAction.mockClear();
});

describe("GET /api/admin/users/[id]", () => {
  it("returns account with only allowlisted keys", async () => {
    const res = await handler(mkEvent(ACCOUNT.id));
    expect(Object.keys(res.account).sort()).toEqual([
      "created_at","current_phase","deletion_requested_at","email","full_name",
      "graduation_year","id","is_admin","onboarding_completed","role","status_label",
    ].sort());
    expect(res.account).not.toHaveProperty("gpa");
    expect(res.account).not.toHaveProperty("date_of_birth");
  });

  it("logs a view_as.start audit row with target + family unit", async () => {
    await handler(mkEvent(ACCOUNT.id));
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "view_as.start", targetUserId: ACCOUNT.id, meta: expect.objectContaining({ family_unit_id: "fam-1" }) }),
    );
  });

  it("400s on a malformed uuid", async () => {
    await expect(handler(mkEvent("not-a-uuid"))).rejects.toMatchObject({ statusCode: 400 });
  });

  it("handles a user with no family unit (no 500)", async () => {
    tables["family_members"] = [];
    const res = await handler(mkEvent(ACCOUNT.id));
    expect(res.familyUnitId).toBeNull();
    expect(res.family.members).toEqual([]);
    expect(res.recruiting.counts.schools).toBe(0);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run tests/unit/server/api/admin/users-id.get.spec.ts`
Expected: FAIL — handler module missing.

- [ ] **Step 3: Implement the endpoint**

Read `server/api/admin/users.get.ts` and `server/api/admin/audit-log.get.ts` first to match the project's `requireAdmin` import path, error style (`createError`), and the real `useSupabaseAdmin` import path (`../../../utils/supabase`). Adjust the import depths for the `[id].get.ts` location. Confirm `getRouterParam(event, "id")` is the idiomatic param read in this codebase (grep other `[id]` routes); use it instead of reaching into `event.context.params` if that's the norm.

```ts
// server/api/admin/users/[id].get.ts
import { z } from "zod";
import { requireAdmin } from "../../../utils/auth";
import { useSupabaseAdmin } from "../../../utils/supabase";
import { logAdminAction } from "../../../utils/adminAudit";
import type { AdminUserDetail } from "~/types/adminUserDetail";

const ACCOUNT_COLS =
  "id, email, full_name, role, is_admin, created_at, graduation_year, current_phase, onboarding_completed, status_label, deletion_requested_at";
const RECENT = 10;

export default defineEventHandler(async (event): Promise<AdminUserDetail> => {
  await requireAdmin(event);

  const id = getRouterParam(event, "id") ?? "";
  if (!z.string().uuid().safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
  }

  const db = useSupabaseAdmin();

  const { data: account, error: accErr } = await db
    .from("users").select(ACCOUNT_COLS).eq("id", id).maybeSingle();
  if (accErr) throw createError({ statusCode: 500, statusMessage: "Failed to load user" });
  if (!account) throw createError({ statusCode: 404, statusMessage: "User not found" });

  const { data: membership } = await db
    .from("family_members").select("family_unit_id").eq("user_id", id).maybeSingle();
  const familyUnitId = (membership?.family_unit_id as string | undefined) ?? null;

  const empty: AdminUserDetail = {
    account: account as AdminUserDetail["account"],
    familyUnitId,
    family: { unit: null, members: [], pendingInvitations: [] },
    athletes: [],
    recruiting: { counts: { schools: 0, coaches: 0, interactions: 0, offers: 0, events: 0, messages: 0 },
      recentInteractions: [], recentOffers: [], recentEvents: [], recentMessages: [] },
  };
  if (!familyUnitId) {
    logAdminAction(event, { action: "view_as.start", targetUserId: id, meta: { family_unit_id: null } });
    return empty;
  }

  const byFam = (t: string, cols = "*") =>
    db.from(t).select(cols).eq("family_unit_id", familyUnitId);
  const recent = (t: string, cols = "*") => byFam(t, cols).order("created_at", { ascending: false }).limit(RECENT);
  const countOf = async (t: string) => {
    const { count } = await db.from(t).select("id", { count: "exact", head: true }).eq("family_unit_id", familyUnitId);
    return count ?? 0;
  };

  const [unit, members, invites, athletes,
         recentInteractions, recentOffers, recentEvents, recentMessages,
         schools, coaches, interactions, offers, events, messages] = await Promise.all([
    db.from("family_units").select("*").eq("id", familyUnitId).maybeSingle().then((r) => r.data),
    byFam("family_members").then((r) => r.data ?? []),
    byFam("family_invitations").then((r) => r.data ?? []),
    byFam("player_profiles").then((r) => r.data ?? []),
    recent("interactions").then((r) => r.data ?? []),
    recent("offers").then((r) => r.data ?? []),
    recent("events").then((r) => r.data ?? []),
    recent("athlete_messages").then((r) => r.data ?? []),
    countOf("schools"), countOf("coaches"), countOf("interactions"),
    countOf("offers"), countOf("events"), countOf("athlete_messages"),
  ]);

  logAdminAction(event, { action: "view_as.start", targetUserId: id, meta: { family_unit_id: familyUnitId } });

  return {
    account: account as AdminUserDetail["account"],
    familyUnitId,
    family: { unit: unit ?? null, members: members as Record<string, unknown>[], pendingInvitations: invites as Record<string, unknown>[] },
    athletes: athletes as Record<string, unknown>[],
    recruiting: {
      counts: { schools, coaches, interactions, offers, events, messages },
      recentInteractions: recentInteractions as Record<string, unknown>[],
      recentOffers: recentOffers as Record<string, unknown>[],
      recentEvents: recentEvents as Record<string, unknown>[],
      recentMessages: recentMessages as Record<string, unknown>[],
    },
  };
});
```

Note: verify each table actually has a `family_unit_id` column and a `created_at` for ordering (per exploration: coaches, documents, events, family_invitations, family_members, interactions, offers, performance_metrics, player_profiles, schools, athlete_messages all carry `family_unit_id`). If a table lacks `created_at`, drop the `.order` for that one. If the chained-stub test needs shape tweaks to match the real `@supabase/*` builder, adapt the TEST, not the endpoint.

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run tests/unit/server/api/admin/users-id.get.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the composable**

```ts
// composables/useAdminUserDetail.ts
import { ref } from "vue";
import { useAdminAuthHeaders } from "./useAdminAuthHeaders";
import type { AdminUserDetail } from "~/types/adminUserDetail";

export function useAdminUserDetail() {
  const data = ref<AdminUserDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDetail(id: string) {
    loading.value = true; error.value = null;
    try {
      const headers = await useAdminAuthHeaders();
      data.value = await $fetch<AdminUserDetail>(`/api/admin/users/${id}`, { headers });
    } catch (e) {
      error.value = "Could not load this user's details.";
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, fetchDetail };
}
```

Match the real `useAdminAuthHeaders` usage/signature (some admin composables destructure `{ getAuthHeaders }` — read `composables/useAdminAuthHeaders.ts` and mirror the pattern the other admin composables use).

- [ ] **Step 6: Type-check + commit**

Run: `npm run type-check` (fix errors).

```bash
git add server/api/admin/users/ composables/useAdminUserDetail.ts types/adminUserDetail.ts tests/unit/server/api/admin/users-id.get.spec.ts
git commit -m "feat(admin): read-only user detail endpoint + composable"
```

---

### Task 2: User detail page (read-only snapshot)

**Files:**
- Create: `pages/admin/users/[id].vue`
- Test: `tests/unit/pages/admin-user-detail.spec.ts`

**Interfaces:**
- Consumes: `useAdminUserDetail` (Task 1), `AdminStatTile`, `AdminDataTable` (foundation), `layouts/admin.vue`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/pages/admin-user-detail.spec.ts
import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const detail = {
  account: { id: "u1", email: "u@x.com", full_name: "U", role: "player", is_admin: false, created_at: "2026-01-01T00:00:00Z", graduation_year: 2027, current_phase: "build", onboarding_completed: true, status_label: "on_track", deletion_requested_at: null },
  familyUnitId: "fam-1",
  family: { unit: {}, members: [], pendingInvitations: [] },
  athletes: [],
  recruiting: { counts: { schools: 3, coaches: 2, interactions: 5, offers: 1, events: 4, messages: 6 }, recentInteractions: [], recentOffers: [], recentEvents: [], recentMessages: [] },
};
vi.mock("~/composables/useAdminUserDetail", () => ({
  useAdminUserDetail: () => ({ data: { value: detail }, loading: { value: false }, error: { value: null }, fetchDetail: vi.fn() }),
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { id: "u1" } }) }));

import AdminUserDetail from "~/pages/admin/users/[id].vue";

const stubs = { AdminStatTile: { props: ["label","value"], template: "<div class='tile'>{{label}}:{{value}}</div>" }, AdminDataTable: true, DesignSystemLoadingState: true, DesignSystemErrorState: true };

describe("admin user detail page", () => {
  it("renders the read-only banner naming the user", async () => {
    const w = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(w.text().toLowerCase()).toContain("read-only");
    expect(w.text()).toContain("u@x.com");
  });
  it("renders count tiles and NO write controls", async () => {
    const w = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(w.findAll(".tile").length).toBeGreaterThan(0);
    expect(w.find("button.delete, [data-testid='delete']").exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run tests/unit/pages/admin-user-detail.spec.ts`
Expected: FAIL — page missing.

- [ ] **Step 3: Implement the page**

Read `pages/admin/users.vue` for the definePageMeta pattern and `components/ViewIndicator.vue` for banner styling tokens. Verify real `AdminStatTile` prop names (`label`, `value`, optional `delta`) and `AdminDataTable` props (`columns`, `rows`, `loading`, `error`) from Task-3/4 foundation components before wiring.

```vue
<!-- pages/admin/users/[id].vue -->
<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAdminUserDetail } from "~/composables/useAdminUserDetail";

definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const route = useRoute();
const { data, loading, error, fetchDetail } = useAdminUserDetail();
onMounted(() => fetchDetail(String(route.params.id)));
</script>

<template>
  <section>
    <div
      class="mb-4 rounded-md border border-brand-red-300 bg-brand-red-50 px-4 py-2 text-sm font-medium text-brand-red-700"
    >
      Read-only admin view — you are viewing
      <span class="font-semibold">{{ data?.account.email ?? "…" }}</span>'s data.
    </div>

    <DesignSystemLoadingState v-if="loading" />
    <DesignSystemErrorState v-else-if="error" :error="error" />
    <template v-else-if="data">
      <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">
        {{ data.account.full_name || data.account.email }}
      </h1>

      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <AdminStatTile label="Schools" :value="data.recruiting.counts.schools" />
        <AdminStatTile label="Coaches" :value="data.recruiting.counts.coaches" />
        <AdminStatTile label="Interactions" :value="data.recruiting.counts.interactions" />
        <AdminStatTile label="Offers" :value="data.recruiting.counts.offers" />
        <AdminStatTile label="Events" :value="data.recruiting.counts.events" />
        <AdminStatTile label="Messages" :value="data.recruiting.counts.messages" />
      </div>

      <!-- Account facts -->
      <dl class="mb-6 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div><dt class="text-brand-slate-500">Role</dt><dd class="text-brand-slate-800">{{ data.account.role }}</dd></div>
        <div><dt class="text-brand-slate-500">Admin</dt><dd class="text-brand-slate-800">{{ data.account.is_admin }}</dd></div>
        <div><dt class="text-brand-slate-500">Phase</dt><dd class="text-brand-slate-800">{{ data.account.current_phase ?? "—" }}</dd></div>
        <div><dt class="text-brand-slate-500">Grad year</dt><dd class="text-brand-slate-800">{{ data.account.graduation_year ?? "—" }}</dd></div>
        <div><dt class="text-brand-slate-500">Onboarded</dt><dd class="text-brand-slate-800">{{ data.account.onboarding_completed }}</dd></div>
        <div><dt class="text-brand-slate-500">Joined</dt><dd class="text-brand-slate-800">{{ new Date(data.account.created_at).toLocaleDateString() }}</dd></div>
      </dl>

      <!-- Family members -->
      <h2 class="mb-2 text-sm font-semibold text-brand-slate-700">Family members ({{ data.family.members.length }})</h2>
      <AdminDataTable
        class="mb-6"
        :columns="[{ key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }]"
        :rows="data.family.members"
      />
    </template>
  </section>
</template>
```

Verify `brand-red-*` token names against `docs/design/tokens.md`; substitute the real danger/error token if different (earlier foundation work found `brand-emerald` where a draft said `brand-green`). No raw hex.

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run tests/unit/pages/admin-user-detail.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check, lint, token audit + commit**

Run: `npm run type-check && npm run lint && npm run audit:tokens`
Expected: 0 errors / 0 violations.

```bash
git add pages/admin/users/ tests/unit/pages/admin-user-detail.spec.ts
git commit -m "feat(admin): read-only user detail snapshot page"
```

---

### Task 3: Link users-list rows to the detail page

**Files:**
- Modify: `pages/admin/users.vue`
- Test: extend `tests/unit/pages/admin-users.spec.ts`

**Interfaces:** consumes the route `/admin/users/[id]` from Task 2.

- [ ] **Step 1: Write the failing test (extend the existing users spec)**

Add to `tests/unit/pages/admin-users.spec.ts` a test asserting each rendered user row contains a link to `/admin/users/<id>`. Read the existing spec's mount/mock setup first and mirror it.

```ts
it("links each user row to its detail page", async () => {
  // (reuse this file's existing mount + mocked useAdminUsers returning >=1 user with id 'u1')
  const link = wrapper.find("a[href='/admin/users/u1']");
  expect(link.exists()).toBe(true);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run tests/unit/pages/admin-users.spec.ts`
Expected: FAIL — no such link yet.

- [ ] **Step 3: Add the link**

In `pages/admin/users.vue`, wrap each row's name/email cell (or add a "View" cell) in a `<NuxtLink :to="`/admin/users/${user.id}`">`. Keep the existing select-mode checkbox behavior intact — do not let the link interfere with `isSelectMode` clicks (put the link on the email/name cell, not the whole row).

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run tests/unit/pages/admin-users.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/admin/users.vue tests/unit/pages/admin-users.spec.ts
git commit -m "feat(admin): link user rows to detail page"
```

---

### Task 4: E2E + verification gate

**Files:**
- Create: `tests/e2e/admin-user-detail.spec.ts`

- [ ] **Step 1: Write the E2E**

Mirror the auth pattern in `tests/e2e/admin-shell.spec.ts` / `tests/e2e/admin/bulk-delete-users.spec.ts` (storageState `tests/e2e/.auth/admin.json` + idempotent `is_admin` grant via `getSupabaseAdmin`/`findUserIdByEmail`). Do NOT invent helpers.

```ts
// tests/e2e/admin-user-detail.spec.ts
import { test, expect } from "@playwright/test";
// ...reuse the admin-shell.spec.ts auth setup verbatim (storageState + is_admin grant)...

test.describe("admin user detail (read-only view-as)", () => {
  test("non-admin is redirected away", async ({ page }) => {
    await page.goto("/admin/users/00000000-0000-0000-0000-000000000000");
    await expect(page).not.toHaveURL(/\/admin\/users\//);
  });

  test("admin opens a real user's detail and sees the read-only banner", async ({ page }) => {
    // resolve a known user's id (e.g. the admin test account itself, or a seeded user) via getSupabaseAdmin
    // navigate to /admin/users/<id>, assert the red read-only banner + at least one stat tile render, no console errors
  });
});
```

Fill the second test with a real user id resolved through the Supabase admin helper the other admin specs use (e.g. the admin account's own id, which always exists). Assert the banner text ("Read-only admin view") and that count tiles render.

- [ ] **Step 2: Run the admin E2E**

Ensure a dev server is up with the admin host pointed at localhost, then:
Run: `NUXT_PUBLIC_ADMIN_HOST=localhost:3003 npx playwright test admin-user-detail --reporter=line`
Expected: PASS. (If the dev server isn't running, start it: `NUXT_PUBLIC_ADMIN_HOST=localhost:3003 npm run dev`.)

- [ ] **Step 3: Full verification gate**

Run: `npm run test` (full unit suite — expect 0 failures, includes the 3 new specs).
Run: `npm run type-check && npm run lint && npm run audit:tokens` (0 errors / 0 violations).
Run the admin E2E from Step 2 green.

- [ ] **Step 4: Verify the audit row lands (live)**

The controller inserts nothing manually — after the E2E run, confirm a `view_as.start` row exists for the admin actor:
`select action, target_user_id, meta, created_at from admin_audit_log where action='view_as.start' order by created_at desc limit 3;` (controller runs via MCP). Confirms the full audit path works end-to-end.

- [ ] **Step 5: Commit + session notes**

Update `CLAUDE.local.md` current-session block (Support #1 shipped, test status). 

```bash
git add tests/e2e/admin-user-detail.spec.ts CLAUDE.local.md
git commit -m "test(admin): e2e for read-only user detail + verification gate"
```

---

## Self-Review

**Spec coverage:**
- User search → already client-side; server search intentionally omitted (documented, YAGNI). ✅
- Detail endpoint (safe allowlist, family-scoped aggregate, no-family path, view_as.start audit) → Task 1. ✅
- Detail page (read-only, red banner, tiles/tables, no write controls) → Task 2. ✅
- Row link from users list → Task 3. ✅
- Security (requireAdmin, SELECT-only, allowlist, uuid validate) → Task 1 constraints + tests. ✅
- Testing (unit safe-columns + no-family + audit-fired; component banner + no-write; E2E) → Tasks 1,2,4. ✅

**Placeholder scan:** No TBD/vague steps. Points needing repo confirmation (getRouterParam idiom, useAdminAuthHeaders signature, brand-red token name, table `created_at` presence, real user id for E2E) are called out with how to confirm.

**Type consistency:** `AdminUserDetail` shape identical across endpoint (Task 1), composable (Task 1), and page (Task 2). `view_as.start` matches the foundation `AdminAuditAction` enum. Allowlist columns match between the endpoint `select`, the account type, and the safe-columns unit test.

## Notes for later specs

- **Spec B2 (delivery log):** Resend webhook + `email_events` + persist `messageId` in `emailService.ts`. Independent of this spec.
- **Support write-actions (later):** grant/revoke admin, resend invite, reset onboarding — each via `logAdminAction` (enum already has `admin.grant/revoke`, `invite.resend`), with confirm dialogs, on this detail page.
