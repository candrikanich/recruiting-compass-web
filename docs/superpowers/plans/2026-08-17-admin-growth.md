# Admin Growth Analytics (#3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin Growth tab showing the signup funnel, DAU/WAU/MAU (write-activity union), and feature adoption — all live-query, no new tables.

**Architecture:** Pure aggregation helpers (`utils/growthAnalytics.ts`) turn raw `{userId, ts}` activity rows + counts into daily-active series / window counts / funnel drop-off / adoption %. A `requireAdmin` service-role `growth.get.ts` endpoint runs bounded SELECTs across 5 activity tables + funnel/adoption counts and calls the helpers. `growth.vue` renders it with foundation chart/tile primitives.

**Tech Stack:** Nuxt 3 (Vue 3 `<script setup>`, TS strict), Nitro, Supabase (`useSupabaseAdmin()` service role), Chart.js (`AdminChart`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-17-admin-growth-design.md`

## Global Constraints

- `requireAdmin(event)` before any query in the endpoint. Service-role **SELECT/count only** — no mutation.
- **Minimal columns** — select only `user_id`/`logged_by` + the timestamp; no PII leaves the endpoint (user_ids used for dedup, not rendered).
- **Activity tables + columns (confirmed against live schema):**
  - `interactions` — ts `occurred_at` (NOT NULL), user `logged_by`
  - `athlete_messages` — ts `sent_at` (NOT NULL), user `user_id`
  - `events` — ts `created_at` (nullable), user `user_id`
  - `video_links` — ts `created_at` (NOT NULL), user `user_id`
  - `offers` — ts `created_at` (nullable), user `user_id`
- Funnel accepted predicate: `family_invitations.accepted_at IS NOT NULL`. Onboarded: `users.onboarding_completed = true`.
- Window param `days` default 30, clamp ≤ 90.
- Graceful degradation: a failing section/feature → zero/omitted, never a whole-page 500 (mirror `db-health.get.ts`).
- Reuse `AdminChart`/`AdminStatTile`/`AdminTimeRange`/`AdminDataTable`, `adminQuery`, `useAdminAuthHeaders`. Components in `components/Admin/` (capital A). No raw hex/rgba (chart hex → `// audit-ignore`).
- TS strict, no `any` except tests. Immutability via spread. Unit tests `tests/unit/**` `.spec.ts`.
- E2E admin pages need `NUXT_PUBLIC_ADMIN_HOST=localhost:3003`.

---

### Task 1: Pure growth helpers + `countByDay` generalization

**Files:**
- Modify: `server/utils/adminQuery.ts` (add `field` param to `countByDay`, default `"created_at"`)
- Create: `utils/growthAnalytics.ts`
- Test: `tests/unit/utils/growthAnalytics.spec.ts`, extend `tests/unit/server/utils/adminQuery.spec.ts`

**Interfaces (produced):**
```ts
// utils/growthAnalytics.ts
export interface ActivityRow { userId: string; ts: string }        // normalized
export function dailyActiveUsers(rows: ActivityRow[], from: Date, to: Date): { day: string; count: number }[]; // distinct users per UTC day, zero-filled
export function windowActiveCount(rows: ActivityRow[], since: Date, now?: Date): number; // distinct users active in [since, now]
export function funnelWithDropoff(stages: { stage: string; count: number }[]): { stage: string; count: number; dropoffPct: number | null }[]; // dropoff vs previous stage
export function adoption(featureUserIds: Record<string, string[]>, totalUsers: number): { totalUsers: number; features: { feature: string; users: number; pct: number }[] };
```

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/utils/growthAnalytics.spec.ts
import { describe, it, expect } from "vitest";
import { dailyActiveUsers, windowActiveCount, funnelWithDropoff, adoption } from "~/utils/growthAnalytics";

const rows = [
  { userId: "a", ts: "2026-08-16T10:00:00Z" },
  { userId: "a", ts: "2026-08-16T12:00:00Z" }, // same user same day → counts once
  { userId: "b", ts: "2026-08-16T09:00:00Z" },
  { userId: "a", ts: "2026-08-17T09:00:00Z" },
];

describe("growthAnalytics", () => {
  it("dailyActiveUsers distinct-counts users per day, zero-filled", () => {
    const r = dailyActiveUsers(rows, new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T00:00:00Z"));
    expect(r).toEqual([
      { day: "2026-08-15", count: 0 },
      { day: "2026-08-16", count: 2 }, // a + b
      { day: "2026-08-17", count: 1 }, // a
    ]);
  });
  it("windowActiveCount distinct users since a cutoff", () => {
    expect(windowActiveCount(rows, new Date("2026-08-17T00:00:00Z"), new Date("2026-08-17T23:59:59Z"))).toBe(1);
    expect(windowActiveCount(rows, new Date("2026-08-16T00:00:00Z"), new Date("2026-08-17T23:59:59Z"))).toBe(2);
  });
  it("funnelWithDropoff computes % vs previous stage", () => {
    const f = funnelWithDropoff([{ stage: "sent", count: 100 }, { stage: "accepted", count: 40 }]);
    expect(f[0].dropoffPct).toBeNull();
    expect(f[1].dropoffPct).toBe(60); // lost 60%
  });
  it("adoption computes distinct users + pct of base", () => {
    const a = adoption({ messages: ["a", "a", "b"], events: ["a"] }, 4);
    expect(a.features.find((x) => x.feature === "messages")?.users).toBe(2);
    expect(a.features.find((x) => x.feature === "messages")?.pct).toBe(50);
  });
});
```

```ts
// add to tests/unit/server/utils/adminQuery.spec.ts
it("countByDay buckets a custom timestamp field", () => {
  const rows = [{ sent_at: "2026-08-16T10:00:00Z" }];
  const r = countByDay(rows, new Date("2026-08-16T00:00:00Z"), new Date("2026-08-16T00:00:00Z"), "sent_at");
  expect(r).toEqual([{ day: "2026-08-16", count: 1 }]);
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npx vitest run tests/unit/utils/growthAnalytics.spec.ts tests/unit/server/utils/adminQuery.spec.ts`
Expected: FAIL (module + new assertion).

- [ ] **Step 3: Generalize countByDay**

In `server/utils/adminQuery.ts`, add a `field = "created_at"` param; read `r[field]` instead of `r.created_at`. Keep `dayBuckets` untouched, keep existing calls working (default preserves behavior).

- [ ] **Step 4: Implement the helpers**

```ts
// utils/growthAnalytics.ts
export interface ActivityRow { userId: string; ts: string }

function dayKey(iso: string): string { return iso.slice(0, 10); }
function utcDayList(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= end) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
  return out;
}

export function dailyActiveUsers(rows: ActivityRow[], from: Date, to: Date) {
  const byDay = new Map<string, Set<string>>();
  for (const d of utcDayList(from, to)) byDay.set(d, new Set());
  for (const r of rows) {
    const d = dayKey(r.ts);
    if (byDay.has(d)) byDay.get(d)!.add(r.userId);
  }
  return utcDayList(from, to).map((day) => ({ day, count: byDay.get(day)?.size ?? 0 }));
}

export function windowActiveCount(rows: ActivityRow[], since: Date, now: Date = new Date()): number {
  const users = new Set<string>();
  for (const r of rows) {
    const t = new Date(r.ts);
    if (t >= since && t <= now) users.add(r.userId);
  }
  return users.size;
}

export function funnelWithDropoff(stages: { stage: string; count: number }[]) {
  return stages.map((s, i) => {
    if (i === 0) return { ...s, dropoffPct: null as number | null };
    const prev = stages[i - 1].count;
    const dropoffPct = prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null;
    return { ...s, dropoffPct };
  });
}

export function adoption(featureUserIds: Record<string, string[]>, totalUsers: number) {
  const features = Object.entries(featureUserIds).map(([feature, ids]) => {
    const users = new Set(ids).size;
    const pct = totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0;
    return { feature, users, pct };
  });
  return { totalUsers, features };
}
```

- [ ] **Step 5: Run — verify pass**

Run: `npx vitest run tests/unit/utils/growthAnalytics.spec.ts tests/unit/server/utils/adminQuery.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/utils/adminQuery.ts utils/growthAnalytics.ts tests/unit/utils/growthAnalytics.spec.ts tests/unit/server/utils/adminQuery.spec.ts
git commit -m "feat(admin): growth analytics pure helpers + countByDay field param"
```

---

### Task 2: `growth.get.ts` endpoint + composable + types

**Files:**
- Create: `server/api/admin/growth.get.ts`, `composables/useAdminGrowth.ts`, `types/adminGrowth.ts`
- Test: `tests/unit/server/api/admin/growth.get.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `useSupabaseAdmin()`, `utils/growthAnalytics.ts` (Task 1), `useAdminAuthHeaders`.
- Produces: `GET /api/admin/growth?days=30` → `AdminGrowth` (spec shape). Composable `useAdminGrowth()` → `{ data, loading, error, fetchGrowth(days?) }`.

```ts
// types/adminGrowth.ts
export interface AdminGrowth {
  funnel: { stage: string; count: number; dropoffPct: number | null }[];
  activity: { dau: number; wau: number; mau: number; dailyTrend: { day: string; count: number }[] };
  adoption: { totalUsers: number; features: { feature: string; users: number; pct: number }[] };
  windowDays: number;
}
```

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/server/api/admin/growth.get.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table row fixtures the stub returns based on table name.
const data: Record<string, any[]> = {};
const counts: Record<string, number> = {};
function stub(table: string) {
  const b: any = {
    select: (_c?: string, opts?: any) => {
      if (opts?.head) return { gte: () => b, not: () => b, eq: () => b, then: (r: any) => r({ count: counts[table] ?? 0, error: null }) };
      return b;
    },
    gte: () => b, not: () => b, eq: () => b,
    then: (r: any) => r({ data: data[table] ?? [], error: null, count: counts[table] ?? 0 }),
  };
  return b;
}
vi.mock("../../../../../server/utils/supabase", () => ({ useSupabaseAdmin: () => ({ from: (t: string) => stub(t) }) }));
const requireAdmin = vi.fn(async () => {});
vi.mock("../../../../../server/utils/auth", () => ({ requireAdmin }));

import handler from "../../../../../server/api/admin/growth.get";
const ev = (days?: string) => ({ context: {}, node: { req: { url: "/api/admin/growth" + (days ? `?days=${days}` : "") } } }) as any;

beforeEach(() => {
  for (const k of Object.keys(data)) delete data[k];
  for (const k of Object.keys(counts)) delete counts[k];
  counts["users"] = 10; counts["family_invitations"] = 8;
  data["interactions"] = [{ logged_by: "u1", occurred_at: new Date().toISOString() }];
  data["athlete_messages"] = [{ user_id: "u2", sent_at: new Date().toISOString() }];
  requireAdmin.mockClear();
});

describe("GET /api/admin/growth", () => {
  it("returns funnel, activity, adoption with the window", async () => {
    const res = await handler(ev("30"));
    expect(res.windowDays).toBe(30);
    expect(res.funnel.length).toBeGreaterThan(0);
    expect(res.activity).toHaveProperty("dau");
    expect(res.adoption.totalUsers).toBe(10);
  });
  it("clamps days to 90", async () => {
    const res = await handler(ev("9999"));
    expect(res.windowDays).toBe(90);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npx vitest run tests/unit/server/api/admin/growth.get.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the endpoint**

Read `server/api/admin/ops/db-health.get.ts` for the requireAdmin import path, `useSupabaseAdmin` path, and the graceful-degradation try/catch pattern; mirror it. Normalize each activity table into `ActivityRow`, run helpers.

```ts
// server/api/admin/growth.get.ts
import { requireAdmin } from "../../utils/auth";
import { useSupabaseAdmin } from "../../utils/supabase";
import { dailyActiveUsers, windowActiveCount, funnelWithDropoff, adoption, type ActivityRow } from "~/utils/growthAnalytics";
import type { AdminGrowth } from "~/types/adminGrowth";

const ACTIVITY = [
  { table: "interactions", ts: "occurred_at", user: "logged_by" },
  { table: "athlete_messages", ts: "sent_at", user: "user_id" },
  { table: "events", ts: "created_at", user: "user_id" },
  { table: "video_links", ts: "created_at", user: "user_id" },
  { table: "offers", ts: "created_at", user: "user_id" },
] as const;
const ADOPTION_TABLES = ["athlete_messages", "interactions", "events", "video_links", "coaches", "offers", "performance_metrics", "documents"] as const;

export default defineEventHandler(async (event): Promise<AdminGrowth> => {
  await requireAdmin(event);
  const db = useSupabaseAdmin();
  const days = Math.min(Math.max(Number(getQuery(event).days) || 30, 1), 90);
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 86400000);

  // Activity union → normalized ActivityRow[]
  const activityRows: ActivityRow[] = [];
  for (const a of ACTIVITY) {
    try {
      const { data } = await db.from(a.table).select(`${a.user}, ${a.ts}`).gte(a.ts, windowStart.toISOString());
      for (const r of (data ?? []) as Record<string, string>[]) {
        if (r[a.user] && r[a.ts]) activityRows.push({ userId: r[a.user], ts: r[a.ts] });
      }
    } catch { /* skip table on failure — degrade */ }
  }
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const activity = {
    dau: windowActiveCount(activityRows, dayAgo, now),
    wau: windowActiveCount(activityRows, weekAgo, now),
    mau: windowActiveCount(activityRows, monthAgo, now),
    dailyTrend: dailyActiveUsers(activityRows, windowStart, now),
  };

  const countOf = async (table: string, apply?: (q: any) => any) => {
    try {
      let q = db.from(table).select("id", { count: "exact", head: true });
      if (apply) q = apply(q);
      const { count } = await q;
      return count ?? 0;
    } catch { return 0; }
  };
  const [invitesSent, invitesAccepted, accounts, onboarded] = await Promise.all([
    countOf("family_invitations"),
    countOf("family_invitations", (q) => q.not("accepted_at", "is", null)),
    countOf("users"),
    countOf("users", (q) => q.eq("onboarding_completed", true)),
  ]);
  const funnel = funnelWithDropoff([
    { stage: "Invites sent", count: invitesSent },
    { stage: "Accepted", count: invitesAccepted },
    { stage: "Accounts", count: accounts },
    { stage: "Onboarded", count: onboarded },
    { stage: "Active (30d)", count: activity.mau },
  ]);

  const featureUserIds: Record<string, string[]> = {};
  for (const table of ADOPTION_TABLES) {
    try {
      const userCol = table === "interactions" ? "logged_by" : "user_id";
      const { data } = await db.from(table).select(userCol);
      featureUserIds[table] = ((data ?? []) as Record<string, string>[]).map((r) => r[userCol]).filter(Boolean);
    } catch { featureUserIds[table] = []; }
  }
  const totalUsers = accounts;

  return { funnel, activity, adoption: adoption(featureUserIds, totalUsers), windowDays: days };
});
```

Note: verify the `.not("accepted_at","is",null)` and `.eq(...)` builder forms against a sibling admin endpoint; adjust the test stub to match. `coaches` uses `user_id` (confirm; if it's `created_by`, adjust the adoption userCol map). Keep everything SELECT/count-only.

- [ ] **Step 4: Run — verify pass**

Run: `npx vitest run tests/unit/server/api/admin/growth.get.spec.ts`
Expected: PASS.

- [ ] **Step 5: Composable**

```ts
// composables/useAdminGrowth.ts — mirror composables/useAdminDbHealth.ts (auth headers, { data, loading, error, fetchGrowth(days?) })
```

Match the real `useAdminAuthHeaders` pattern; `fetchGrowth(days = 30)` → `$fetch("/api/admin/growth", { headers, query: { days } })`.

- [ ] **Step 6: Type-check + commit**

Run: `npm run type-check`.

```bash
git add server/api/admin/growth.get.ts composables/useAdminGrowth.ts types/adminGrowth.ts tests/unit/server/api/admin/growth.get.spec.ts
git commit -m "feat(admin): growth analytics endpoint + composable"
```

---

### Task 3: `growth.vue` page + Growth nav link

**Files:**
- Create: `pages/admin/growth.vue`
- Modify: `layouts/admin.vue` (add Growth nav link)
- Test: `tests/unit/pages/admin-growth.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/pages/admin-growth.spec.ts
import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const growth = {
  funnel: [{ stage: "Invites sent", count: 10, dropoffPct: null }, { stage: "Accepted", count: 6, dropoffPct: 40 }],
  activity: { dau: 2, wau: 5, mau: 8, dailyTrend: [{ day: "2026-08-16", count: 2 }] },
  adoption: { totalUsers: 10, features: [{ feature: "events", users: 4, pct: 40 }] },
  windowDays: 30,
};
vi.mock("~/composables/useAdminGrowth", () => ({
  useAdminGrowth: () => ({ data: { value: growth }, loading: { value: false }, error: { value: null }, fetchGrowth: vi.fn() }),
}));

import AdminGrowth from "~/pages/admin/growth.vue";
const stubs = { AdminStatTile: { props: ["label","value"], template: "<div class='tile'>{{label}}:{{value}}</div>" }, AdminChart: true, AdminDataTable: true, AdminTimeRange: true, DesignSystemLoadingState: true, DesignSystemErrorState: true };

describe("admin growth page", () => {
  it("renders funnel, DAU/WAU/MAU tiles, adoption", async () => {
    const w = mount(AdminGrowth, { global: { stubs } });
    await flushPromises();
    expect(w.findAll(".tile").length).toBeGreaterThan(0);
    expect(w.text()).toContain("Invites sent");
  });
});
```

- [ ] **Step 2: Run — verify fail** — `npx vitest run tests/unit/pages/admin-growth.spec.ts` → FAIL.

- [ ] **Step 3: Implement the page**

`definePageMeta({ layout: "admin", middleware: ["auth", "admin"] })`. Use `useAdminGrowth`, `onMounted(() => fetchGrowth(30))`. Route `data`/`loading`/`error` through `computed()` (same ref/mock-safe pattern as `pages/admin/users/[id].vue`). Render: `AdminTimeRange` (v-model days → `fetchGrowth`); funnel `AdminStatTile` row (show count + `dropoffPct`); DAU/WAU/MAU tiles; a daily-active `AdminChart` type `line` from `activity.dailyTrend`; adoption `AdminChart` type `bar` (or `AdminDataTable`) from `adoption.features`. Loading/error via DesignSystem* states. Verify brand token names; no raw hex.

- [ ] **Step 4: Add nav link**

In `layouts/admin.vue`, add `{ to: "/admin/growth", label: "Growth" }` to the `links` array.

- [ ] **Step 5: Run + gate + commit**

Run: `npx vitest run tests/unit/pages/admin-growth.spec.ts` (PASS) then `npm run type-check && npm run lint && npm run audit:tokens` (0/0).

```bash
git add pages/admin/growth.vue layouts/admin.vue tests/unit/pages/admin-growth.spec.ts
git commit -m "feat(admin): growth analytics page + nav link"
```

---

### Task 4: E2E + verification gate

**Files:**
- Create: `tests/e2e/admin-growth.spec.ts`

- [ ] **Step 1: Write the E2E**

Reuse the admin-auth pattern from `tests/e2e/admin-shell.spec.ts` (storageState + is_admin grant). Tests: (1) non-admin redirected from `/admin/growth`; (2) admin sees `/admin/growth` — a funnel label ("Invites sent") + a DAU/WAU/MAU tile render, no console errors. Resilient selectors.

- [ ] **Step 2: Run the E2E**

Run: `NUXT_PUBLIC_ADMIN_HOST=localhost:3003 npx playwright test admin-growth --reporter=line` (start dev with the same env if needed). GREEN. Fix spec selectors if needed; fix the page only for a genuine defect (report it).

- [ ] **Step 3: Full gate**

Run: `npm run test` (0 failures, incl. new specs). `npm run type-check && npm run lint && npm run audit:tokens` (0/0). Admin E2E green.

- [ ] **Step 4: Session notes + commit**

Update `CLAUDE.local.md` (Growth #3 shipped; all 4 subsystems done).

```bash
git add tests/e2e/admin-growth.spec.ts CLAUDE.local.md
git commit -m "test(admin): e2e for growth analytics + verification gate"
```

---

## Self-Review

**Spec coverage:** funnel (Task 2 counts + Task 1 dropoff) ✅; DAU/WAU/MAU write-union (Task 1 helpers + Task 2 activity queries) ✅; adoption (Task 1 + Task 2) ✅; countByDay generalization (Task 1) ✅; page + nav (Task 3) ✅; security (requireAdmin, SELECT-only, minimal columns) (Task 2 constraints) ✅; graceful degradation (Task 2) ✅; testing (helper units, endpoint, component, E2E) Tasks 1–4 ✅; cohorts/login-gauge/breakdowns not built ✅.

**Placeholder scan:** no vague steps; repo-confirm points (builder `.not/.eq` forms, `coaches` user column, `useAdminAuthHeaders` shape, brand tokens) flagged with how to resolve.

**Type consistency:** `ActivityRow` + `AdminGrowth` shapes consistent across helpers (Task 1), endpoint + composable (Task 2), page (Task 3). `countByDay` field param default preserves existing callers.

## Notes for later specs

- **Retention cohorts** (own spec): reuse the activity-union → `ActivityRow[]`, bucket by signup-week × weeks-since.
- **Perf:** if activity rows per window grow large, move distinct-counting to a Postgres RPC (same deferral rationale as Ops pg-metrics).
- Remaining admin backlog after this: Spec C2 (Sentry feed), Spec B2 (email delivery log).
