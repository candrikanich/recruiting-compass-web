# Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay shared admin rails — route-based shell, audit backbone, reusable client primitives, live-query server helper — so the Support/Ops/Growth subsystems build on stable foundation without duplicating plumbing.

**Architecture:** Migrate the monolith `pages/admin/index.vue` tab bar into a `layouts/admin.vue` shell + one route page per tab (behavior-preserving). Add an `admin_audit_log` table + fire-and-forget `logAdminAction` helper + read-only Audit view. Add four reusable `components/admin/` primitives (chart, stat tile, time-range, data-table) and a seed `adminQuery` server helper. No feature logic — rails only.

**Tech Stack:** Nuxt 3 (Vue 3 `<script setup>`, TS strict), Pinia, Supabase (`useSupabaseAdmin()` service role), Nitro API routes, Chart.js, Vitest, Playwright, TailwindCSS.

**Spec:** `docs/superpowers/specs/2026-08-17-admin-foundation-design.md`

## Global Constraints

- Admin endpoints MUST call `requireAdmin(event)` (`server/utils/auth.ts:215`) before any work.
- Service-role-only tables use RLS **no-policy** (like `cron_runs`); server writes via `useSupabaseAdmin()`.
- Client admin fetches attach headers from `composables/useAdminAuthHeaders.ts`.
- No raw hex / `rgba()` in `<style>` or inline `style=` (per `npm run audit:tokens`); chart configs needing hex carry `// audit-ignore` on that line.
- Empty/loading/error UI uses existing `DesignSystem*` components, never inline.
- TS strict, no `any` (except tests). Immutability: new objects via spread.
- Migrations applied live via Supabase MCP `apply_migration` (repo `npx supabase db push` is broken here — schema_migrations drift).
- Client composable return shape: `{ data, loading, error, fetch* }`.
- Files: prefer <400 lines; the shell migration is explicitly a SPLIT of the 860-line monolith.

---

### Task 1: `admin_audit_log` table + `logAdminAction` helper

**Files:**
- Create: `server/migrations/020_admin_audit_log.sql` (repo record; apply live via MCP)
- Create: `server/utils/adminAudit.ts`
- Test: `server/utils/__tests__/adminAudit.test.ts`

**Interfaces:**
- Consumes: `useSupabaseAdmin()`, `useLogger(event, ctx)`, `requireAdmin` result (actor id).
- Produces: `logAdminAction(event: H3Event, entry: { action: AdminAuditAction; targetUserId?: string; meta?: Record<string, unknown> }): Promise<void>` and `type AdminAuditAction = "view_as.start" | "view_as.stop" | "user.delete" | "user.bulk_delete" | "admin.grant" | "admin.revoke" | "invite.resend"`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- server/migrations/020_admin_audit_log.sql
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
-- No policies: service-role only (matches cron_runs).
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_admin_id);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id);
```

- [ ] **Step 2: Write the failing test**

```ts
// server/utils/__tests__/adminAudit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
vi.mock("../supabaseAdmin", () => ({
  useSupabaseAdmin: () => ({ from: () => ({ insert: insertMock }) }),
}));
const loggerError = vi.fn();
vi.mock("../logger", () => ({ useLogger: () => ({ error: loggerError, info: vi.fn() }) }));

import { logAdminAction } from "../adminAudit";

const fakeEvent = { context: { adminUserId: "admin-1" } } as any;

beforeEach(() => { insertMock.mockReset(); loggerError.mockReset(); });

describe("logAdminAction", () => {
  it("inserts an audit row with actor, action, target, meta", async () => {
    insertMock.mockResolvedValue({ error: null });
    await logAdminAction(fakeEvent, { action: "view_as.start", targetUserId: "u-9", meta: { ip: "x" } });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_admin_id: "admin-1",
        action: "view_as.start",
        target_user_id: "u-9",
        meta: { ip: "x" },
      }),
    );
  });

  it("never throws when the insert fails — logs instead", async () => {
    insertMock.mockResolvedValue({ error: { message: "boom" } });
    await expect(logAdminAction(fakeEvent, { action: "user.delete", targetUserId: "u-1" }))
      .resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });

  it("never throws when the insert rejects", async () => {
    insertMock.mockRejectedValue(new Error("network"));
    await expect(logAdminAction(fakeEvent, { action: "admin.grant" })).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run server/utils/__tests__/adminAudit.test.ts`
Expected: FAIL — `Cannot find module '../adminAudit'`.

- [ ] **Step 4: Write minimal implementation**

Read `server/utils/auth.ts:215` first to confirm how the actor id is exposed after `requireAdmin` (context key or return value); adapt the actor read below to match. If `requireAdmin` returns the admin user, callers pass its id — but foundation prefers reading from `event.context`. Confirm the real key and use it.

```ts
// server/utils/adminAudit.ts
import type { H3Event } from "h3";
import { useSupabaseAdmin } from "./supabaseAdmin";
import { useLogger } from "./logger";

export type AdminAuditAction =
  | "view_as.start" | "view_as.stop"
  | "user.delete" | "user.bulk_delete"
  | "admin.grant" | "admin.revoke"
  | "invite.resend";

interface AdminAuditEntry {
  action: AdminAuditAction;
  targetUserId?: string;
  meta?: Record<string, unknown>;
}

export async function logAdminAction(event: H3Event, entry: AdminAuditEntry): Promise<void> {
  const logger = useLogger(event, "adminAudit");
  try {
    const actorId = event.context.adminUserId as string | undefined;
    if (!actorId) {
      logger.error("logAdminAction: missing actor id in context", { action: entry.action });
      return;
    }
    const { error } = await useSupabaseAdmin()
      .from("admin_audit_log")
      .insert({
        actor_admin_id: actorId,
        action: entry.action,
        target_user_id: entry.targetUserId ?? null,
        meta: entry.meta ?? {},
      });
    if (error) logger.error("logAdminAction insert failed", { action: entry.action, error: error.message });
  } catch (err) {
    logger.error("logAdminAction threw", { action: entry.action, err: String(err) });
  }
}
```

Note: if `requireAdmin` does not currently set `event.context.adminUserId`, add that assignment inside `requireAdmin` (single line) so the actor is available to every admin endpoint — this is in-scope foundation glue.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/utils/__tests__/adminAudit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Apply migration live**

Apply `020_admin_audit_log.sql` via Supabase MCP `apply_migration` (name `admin_audit_log`). Verify: `select to_regclass('public.admin_audit_log');` returns non-null.

- [ ] **Step 7: Commit**

```bash
git add server/migrations/020_admin_audit_log.sql server/utils/adminAudit.ts server/utils/__tests__/adminAudit.test.ts server/utils/auth.ts
git commit -m "feat(admin): admin_audit_log table + logAdminAction helper"
```

---

### Task 2: Audit-log endpoint + composable

**Files:**
- Create: `server/api/admin/audit-log.get.ts`
- Create: `composables/useAdminAuditLog.ts`
- Test: `server/api/admin/__tests__/audit-log.get.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `useSupabaseAdmin()`, `useAdminAuthHeaders`.
- Produces endpoint `GET /api/admin/audit-log?limit&offset&action&actor` → `{ rows: AdminAuditRow[]; total: number }` where `AdminAuditRow = { id, actor_admin_id, action, target_user_id, meta, created_at }`. Composable `useAdminAuditLog()` → `{ rows, total, loading, error, fetchAuditLog(opts?) }`.

- [ ] **Step 1: Write the failing test**

```ts
// server/api/admin/__tests__/audit-log.get.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = { rows: [{ id: "a", actor_admin_id: "admin-1", action: "view_as.start", target_user_id: "u1", meta: {}, created_at: "2026-08-17T00:00:00Z" }], count: 1 };
const rangeMock = vi.fn(() => Promise.resolve({ data: state.rows, error: null, count: state.count }));
const builder: any = { select: () => builder, order: () => builder, eq: () => builder, range: rangeMock };
vi.mock("../../../utils/supabaseAdmin", () => ({ useSupabaseAdmin: () => ({ from: () => builder }) }));
vi.mock("../../../utils/auth", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }) }));

import handler from "../audit-log.get";

const mkEvent = (query: Record<string, string> = {}) => ({ context: {}, node: { req: { url: "/api/admin/audit-log?" + new URLSearchParams(query) } } }) as any;

beforeEach(() => rangeMock.mockClear());

describe("GET /api/admin/audit-log", () => {
  it("returns rows and total", async () => {
    const res = await handler(mkEvent());
    expect(res.rows).toHaveLength(1);
    expect(res.total).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/api/admin/__tests__/audit-log.get.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Read an existing admin endpoint (`server/api/admin/users.get.ts`) first to match query-param + `getQuery` + error style exactly.

```ts
// server/api/admin/audit-log.get.ts
import { requireAdmin } from "../../utils/auth";
import { useSupabaseAdmin } from "../../utils/supabaseAdmin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const q = getQuery(event);
  const limit = Math.min(Number(q.limit) || 50, 200);
  const offset = Number(q.offset) || 0;

  let query = useSupabaseAdmin()
    .from("admin_audit_log")
    .select("id, actor_admin_id, action, target_user_id, meta, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (typeof q.action === "string" && q.action) query = query.eq("action", q.action);
  if (typeof q.actor === "string" && q.actor) query = query.eq("actor_admin_id", q.actor);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw createError({ statusCode: 500, statusMessage: "Failed to load audit log" });
  return { rows: data ?? [], total: count ?? 0 };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/api/admin/__tests__/audit-log.get.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the composable**

```ts
// composables/useAdminAuditLog.ts
import { ref } from "vue";
import { useAdminAuthHeaders } from "./useAdminAuthHeaders";

export interface AdminAuditRow {
  id: string; actor_admin_id: string; action: string;
  target_user_id: string | null; meta: Record<string, unknown>; created_at: string;
}

export function useAdminAuditLog() {
  const rows = ref<AdminAuditRow[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAuditLog(opts: { limit?: number; offset?: number; action?: string; actor?: string } = {}) {
    loading.value = true; error.value = null;
    try {
      const headers = await useAdminAuthHeaders();
      const res = await $fetch<{ rows: AdminAuditRow[]; total: number }>("/api/admin/audit-log", { headers, query: opts });
      rows.value = res.rows; total.value = res.total;
    } catch (e) {
      error.value = "Could not load the audit log.";
    } finally {
      loading.value = false;
    }
  }

  return { rows, total, loading, error, fetchAuditLog };
}
```

- [ ] **Step 6: Commit**

```bash
git add server/api/admin/audit-log.get.ts composables/useAdminAuditLog.ts server/api/admin/__tests__/audit-log.get.test.ts
git commit -m "feat(admin): audit-log endpoint + composable"
```

---

### Task 3: `AdminChart.vue` primitive

**Files:**
- Create: `components/admin/AdminChart.vue`
- Test: `components/admin/__tests__/AdminChart.test.ts`

**Interfaces:**
- Produces component `<AdminChart :type :data :options? />` where `type: "line" | "bar" | "sparkline"`, `data: ChartData`, `options?: ChartOptions` (Chart.js types). Destroys its chart instance on unmount.

- [ ] **Step 1: Confirm Chart.js is installed**

Run: `node -e "require.resolve('chart.js')" && echo OK` — expect `OK`. If it fails, `npm i chart.js` and note it in the commit.

- [ ] **Step 2: Write the failing test**

```ts
// components/admin/__tests__/AdminChart.test.ts
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
const destroy = vi.fn();
vi.mock("chart.js/auto", () => ({ default: vi.fn(() => ({ destroy })) }));
import AdminChart from "../AdminChart.vue";

describe("AdminChart", () => {
  it("renders a canvas and constructs a chart", () => {
    const wrapper = mount(AdminChart, { props: { type: "line", data: { labels: ["a"], datasets: [{ data: [1] }] } } });
    expect(wrapper.find("canvas").exists()).toBe(true);
  });
  it("destroys the chart on unmount", () => {
    const wrapper = mount(AdminChart, { props: { type: "bar", data: { labels: [], datasets: [] } } });
    wrapper.unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run components/admin/__tests__/AdminChart.test.ts`
Expected: FAIL — component missing.

- [ ] **Step 4: Write minimal implementation**

```vue
<!-- components/admin/AdminChart.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import Chart from "chart.js/auto";
import type { ChartData, ChartOptions } from "chart.js";

const props = defineProps<{
  type: "line" | "bar" | "sparkline";
  data: ChartData;
  options?: ChartOptions;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const sparklineOptions: ChartOptions = {
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } },
};

function render() {
  if (!canvas.value) return;
  chart?.destroy();
  const isSpark = props.type === "sparkline";
  chart = new Chart(canvas.value, {
    type: isSpark ? "line" : props.type,
    data: props.data,
    options: { responsive: true, maintainAspectRatio: false, ...(isSpark ? sparklineOptions : {}), ...props.options },
  });
}

onMounted(render);
watch(() => [props.data, props.options], render, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div class="admin-chart"><canvas ref="canvas" /></div>
</template>

<style scoped>
.admin-chart { position: relative; width: 100%; height: 100%; min-height: 3rem; }
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run components/admin/__tests__/AdminChart.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/admin/AdminChart.vue components/admin/__tests__/AdminChart.test.ts
git commit -m "feat(admin): AdminChart primitive (Chart.js wrapper)"
```

---

### Task 4: `AdminStatTile.vue` + `AdminTimeRange.vue` primitives

**Files:**
- Create: `components/admin/AdminStatTile.vue`, `components/admin/AdminTimeRange.vue`
- Test: `components/admin/__tests__/AdminStatTile.test.ts`, `components/admin/__tests__/AdminTimeRange.test.ts`

**Interfaces:**
- `<AdminStatTile :label :value :delta? />` — `label: string`, `value: string | number`, `delta?: number` (renders ▲/▼ + abs value; positive = up).
- `<AdminTimeRange v-model="range" />` — `range: { days: number }`; segmented 7/14/30/90; emits `update:modelValue`.

- [ ] **Step 1: Write the failing tests**

```ts
// components/admin/__tests__/AdminStatTile.test.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdminStatTile from "../AdminStatTile.vue";

describe("AdminStatTile", () => {
  it("renders label and value", () => {
    const w = mount(AdminStatTile, { props: { label: "Users", value: 42 } });
    expect(w.text()).toContain("Users");
    expect(w.text()).toContain("42");
  });
  it("shows an up arrow for positive delta", () => {
    const w = mount(AdminStatTile, { props: { label: "x", value: 1, delta: 5 } });
    expect(w.text()).toContain("▲");
    expect(w.text()).toContain("5");
  });
  it("shows a down arrow for negative delta", () => {
    const w = mount(AdminStatTile, { props: { label: "x", value: 1, delta: -3 } });
    expect(w.text()).toContain("▼");
    expect(w.text()).toContain("3");
  });
});
```

```ts
// components/admin/__tests__/AdminTimeRange.test.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdminTimeRange from "../AdminTimeRange.vue";

describe("AdminTimeRange", () => {
  it("emits the selected range on click", async () => {
    const w = mount(AdminTimeRange, { props: { modelValue: { days: 7 } } });
    await w.get("[data-days='30']").trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual([{ days: 30 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/admin/__tests__/AdminStatTile.test.ts components/admin/__tests__/AdminTimeRange.test.ts`
Expected: FAIL — components missing.

- [ ] **Step 3: Write minimal implementations**

```vue
<!-- components/admin/AdminStatTile.vue -->
<script setup lang="ts">
const props = defineProps<{ label: string; value: string | number; delta?: number }>();
</script>

<template>
  <div class="rounded-lg border border-brand-slate-200 bg-white p-4">
    <div class="text-sm text-brand-slate-500">{{ label }}</div>
    <div class="mt-1 flex items-baseline gap-2">
      <span class="text-2xl font-semibold text-brand-slate-900">{{ value }}</span>
      <span
        v-if="typeof props.delta === 'number'"
        :class="props.delta >= 0 ? 'text-brand-green-600' : 'text-brand-red-600'"
        class="text-sm font-medium"
      >{{ props.delta >= 0 ? "▲" : "▼" }} {{ Math.abs(props.delta) }}</span>
    </div>
  </div>
</template>
```

```vue
<!-- components/admin/AdminTimeRange.vue -->
<script setup lang="ts">
const props = defineProps<{ modelValue: { days: number } }>();
const emit = defineEmits<{ "update:modelValue": [{ days: number }] }>();
const options = [7, 14, 30, 90];
</script>

<template>
  <div class="inline-flex rounded-md border border-brand-slate-200 bg-white p-0.5">
    <button
      v-for="d in options"
      :key="d"
      :data-days="d"
      type="button"
      class="rounded px-3 py-1 text-sm"
      :class="props.modelValue.days === d ? 'bg-brand-blue-600 text-white' : 'text-brand-slate-600'"
      @click="emit('update:modelValue', { days: d })"
    >{{ d }}d</button>
  </div>
</template>
```

Note: verify brand utility names (`brand-green-600`, `brand-red-600`, `brand-blue-600`, `brand-slate-*`) against `docs/design/tokens.md` before finalizing; substitute the real token names if they differ.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/admin/__tests__/AdminStatTile.test.ts components/admin/__tests__/AdminTimeRange.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminStatTile.vue components/admin/AdminTimeRange.vue components/admin/__tests__/AdminStatTile.test.ts components/admin/__tests__/AdminTimeRange.test.ts
git commit -m "feat(admin): AdminStatTile + AdminTimeRange primitives"
```

---

### Task 5: `AdminDataTable.vue` primitive

**Files:**
- Create: `components/admin/AdminDataTable.vue`
- Test: `components/admin/__tests__/AdminDataTable.test.ts`

**Interfaces:**
- `<AdminDataTable :columns :rows :loading? :error? />` — `columns: { key: string; label: string }[]`, `rows: Record<string, unknown>[]`. Delegates empty/loading/error to `DesignSystem*`. Named cell slots `#cell-<key>` for custom rendering.

- [ ] **Step 1: Write the failing test**

```ts
// components/admin/__tests__/AdminDataTable.test.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdminDataTable from "../AdminDataTable.vue";

const columns = [{ key: "name", label: "Name" }, { key: "age", label: "Age" }];

describe("AdminDataTable", () => {
  it("renders headers and rows", () => {
    const w = mount(AdminDataTable, { props: { columns, rows: [{ name: "Ann", age: 3 }] },
      global: { stubs: { DesignSystemEmptyState: true, DesignSystemLoadingState: true, DesignSystemErrorState: true } } });
    expect(w.text()).toContain("Name");
    expect(w.text()).toContain("Ann");
  });
  it("shows empty state when no rows", () => {
    const w = mount(AdminDataTable, { props: { columns, rows: [] },
      global: { stubs: { DesignSystemEmptyState: { template: "<div>EMPTY</div>" }, DesignSystemLoadingState: true, DesignSystemErrorState: true } } });
    expect(w.text()).toContain("EMPTY");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/admin/__tests__/AdminDataTable.test.ts`
Expected: FAIL — component missing.

- [ ] **Step 3: Write minimal implementation**

Confirm the real `DesignSystem*` component names (grep `components/` for `DesignSystemEmptyState`/`DesignSystemLoadingState`/`DesignSystemErrorState`) and align; they are auto-imported.

```vue
<!-- components/admin/AdminDataTable.vue -->
<script setup lang="ts">
interface Column { key: string; label: string }
const props = withDefaults(defineProps<{
  columns: Column[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  error?: string | null;
}>(), { loading: false, error: null });
</script>

<template>
  <DesignSystemLoadingState v-if="props.loading" />
  <DesignSystemErrorState v-else-if="props.error" :message="props.error" />
  <DesignSystemEmptyState v-else-if="props.rows.length === 0" />
  <div v-else class="overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead>
        <tr class="border-b border-brand-slate-200 text-left text-brand-slate-500">
          <th v-for="c in props.columns" :key="c.key" class="px-3 py-2 font-medium">{{ c.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in props.rows" :key="i" class="border-b border-brand-slate-100">
          <td v-for="c in props.columns" :key="c.key" class="px-3 py-2 text-brand-slate-800">
            <slot :name="`cell-${c.key}`" :row="row" :value="row[c.key]">{{ row[c.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/admin/__tests__/AdminDataTable.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminDataTable.vue components/admin/__tests__/AdminDataTable.test.ts
git commit -m "feat(admin): AdminDataTable primitive"
```

---

### Task 6: `adminQuery` server helper (seed)

**Files:**
- Create: `server/utils/adminQuery.ts`
- Test: `server/utils/__tests__/adminQuery.test.ts`

**Interfaces:**
- Produces `dayBuckets(from: Date, to: Date): string[]` — inclusive list of `YYYY-MM-DD` day keys (UTC) from `from` to `to`.
- Produces `countByDay(rows: { created_at: string }[], from: Date, to: Date): { day: string; count: number }[]` — zero-filled per bucket.

- [ ] **Step 1: Write the failing test**

```ts
// server/utils/__tests__/adminQuery.test.ts
import { describe, it, expect } from "vitest";
import { dayBuckets, countByDay } from "../adminQuery";

describe("adminQuery", () => {
  it("dayBuckets is inclusive of both ends (UTC)", () => {
    expect(dayBuckets(new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T23:59:59Z")))
      .toEqual(["2026-08-15", "2026-08-16", "2026-08-17"]);
  });
  it("countByDay zero-fills missing days", () => {
    const rows = [{ created_at: "2026-08-16T10:00:00Z" }, { created_at: "2026-08-16T12:00:00Z" }];
    expect(countByDay(rows, new Date("2026-08-15T00:00:00Z"), new Date("2026-08-17T00:00:00Z")))
      .toEqual([
        { day: "2026-08-15", count: 0 },
        { day: "2026-08-16", count: 2 },
        { day: "2026-08-17", count: 0 },
      ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/utils/__tests__/adminQuery.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/utils/adminQuery.ts
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dayBuckets(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= end) {
    out.push(dayKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function countByDay(rows: { created_at: string }[], from: Date, to: Date): { day: string; count: number }[] {
  const buckets = dayBuckets(from, to);
  const counts = new Map<string, number>(buckets.map((d) => [d, 0]));
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/utils/__tests__/adminQuery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/adminQuery.ts server/utils/__tests__/adminQuery.test.ts
git commit -m "feat(admin): adminQuery server helper (day-bucketing seed)"
```

---

### Task 7: `layouts/admin.vue` shell

**Files:**
- Create: `layouts/admin.vue`
- Test: `tests/e2e/admin-shell.spec.ts` (nav + gate; full route regression is Task 9)

**Interfaces:**
- Produces the admin layout: nav with links to `/admin` (Overview), `/admin/users`, `/admin/invitations`, `/admin/health`, `/admin/jobs`, `/admin/audit`, `/admin/tools`. Active-route highlight. Slot renders the page.

- [ ] **Step 1: Read the current tab bar markup**

Read `pages/admin/index.vue:1-70` (template head + tab bar) and `:722-790` (definePageMeta + tabs array) to copy nav labels/styling verbatim into the layout.

- [ ] **Step 2: Write the layout**

```vue
<!-- layouts/admin.vue -->
<script setup lang="ts">
const links = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/invitations", label: "Invitations" },
  { to: "/admin/health", label: "Health" },
  { to: "/admin/jobs", label: "Jobs" },
  { to: "/admin/audit", label: "Audit" },
  { to: "/admin/tools", label: "Tools" },
];
const route = useRoute();
function isActive(link: { to: string; exact?: boolean }) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to);
}
</script>

<template>
  <div class="min-h-screen bg-brand-slate-50">
    <nav class="border-b border-brand-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium"
          :class="isActive(link)
            ? 'border-brand-blue-600 text-brand-blue-700'
            : 'border-transparent text-brand-slate-500 hover:text-brand-slate-800'"
        >{{ link.label }}</NuxtLink>
      </div>
    </nav>
    <main class="mx-auto max-w-6xl px-4 py-6"><slot /></main>
  </div>
</template>
```

- [ ] **Step 3: Write the shell E2E**

```ts
// tests/e2e/admin-shell.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth"; // confirm helper name/path; reuse existing admin-login helper

test("non-admin is redirected away from /admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
});

test("admin sees the nav shell with all links", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin");
  for (const label of ["Overview", "Users", "Invitations", "Health", "Jobs", "Audit", "Tools"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
});
```

Confirm the real admin-login E2E helper before writing (grep `tests/e2e` for admin login/storageState). If none exists, reuse the storageState pattern from an existing admin-touching spec.

- [ ] **Step 4: Run the E2E**

Run: `npm run test:e2e -- admin-shell` (Node 22 — run `nvm use` first; E2E needs native WebSocket).
Expected: PASS (2 tests) once Task 9 wires the routes; until then the second test may fail on missing pages — acceptable, revisit after Task 9.

- [ ] **Step 5: Commit**

```bash
git add layouts/admin.vue tests/e2e/admin-shell.spec.ts
git commit -m "feat(admin): route-based admin layout shell"
```

---

### Task 8: `pages/admin/audit.vue` view

**Files:**
- Create: `pages/admin/audit.vue`

**Interfaces:**
- Consumes: `useAdminAuditLog` (Task 2), `AdminDataTable` (Task 5), `AdminTimeRange` optional.

- [ ] **Step 1: Write the page**

```vue
<!-- pages/admin/audit.vue -->
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });
const { rows, total, loading, error, fetchAuditLog } = useAdminAuditLog();
const columns = [
  { key: "created_at", label: "When" },
  { key: "actor_admin_id", label: "Admin" },
  { key: "action", label: "Action" },
  { key: "target_user_id", label: "Target" },
];
onMounted(() => fetchAuditLog({ limit: 100 }));
</script>

<template>
  <section>
    <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">Admin Audit Log ({{ total }})</h1>
    <AdminDataTable :columns="columns" :rows="rows" :loading="loading" :error="error">
      <template #cell-created_at="{ value }">{{ new Date(String(value)).toLocaleString() }}</template>
    </AdminDataTable>
  </section>
</template>
```

- [ ] **Step 2: Verify in the running app**

Run `nvm use && npm run dev`, log in as admin, visit `/admin/audit`. Insert a test row via MCP `execute_sql` (`insert into admin_audit_log(actor_admin_id, action) values ('<admin-uuid>', 'view_as.start')`) and confirm it renders. Delete the test row after.

- [ ] **Step 3: Commit**

```bash
git add pages/admin/audit.vue
git commit -m "feat(admin): audit log view page"
```

---

### Task 9: Migrate monolith tabs → route pages

This is the largest task and the main regression surface. Each tab moves 1:1 into a route page under `layout: "admin"`; its composable + endpoint are untouched. Do them one tab at a time, committing per tab, so a reviewer can reject one migration without the others.

**Files:**
- Modify: `pages/admin/index.vue` (trim to Overview only; set `layout: "admin"`)
- Create: `pages/admin/users.vue`, `pages/admin/invitations.vue`, `pages/admin/health.vue`, `pages/admin/jobs.vue`, `pages/admin/tools.vue`
- Modify (adopt layout): `pages/admin/batch-fetch-logos.vue`, `pages/admin/migrate-school-sizes.vue`, `pages/admin/notifications/broadcast.vue`
- Test: `tests/e2e/admin-routes.spec.ts`

**Interfaces:**
- Each new page sets `definePageMeta({ layout: "admin", middleware: ["auth", "admin"] })` and reuses the existing composable for that domain.

- [ ] **Step 1: Write the failing route-regression E2E**

```ts
// tests/e2e/admin-routes.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth"; // same helper as Task 7

const routes = [
  { path: "/admin", heading: /overview/i },
  { path: "/admin/users", heading: /users/i },
  { path: "/admin/invitations", heading: /invitation/i },
  { path: "/admin/health", heading: /health/i },
  { path: "/admin/jobs", heading: /jobs/i },
  { path: "/admin/tools", heading: /tools/i },
];

test.describe("admin routes render post-migration", () => {
  for (const r of routes) {
    test(`${r.path} renders without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await loginAsAdmin(page);
      await page.goto(r.path);
      await expect(page.getByRole("heading", { name: r.heading })).toBeVisible();
      expect(errors, errors.join("\n")).toHaveLength(0);
    });
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `nvm use && npm run test:e2e -- admin-routes`
Expected: FAIL — new routes 404 / missing headings.

- [ ] **Step 3: Extract each tab, one at a time**

For each tab (`users`, `pending→invitations`, `health`, `jobs`, `tools`):
1. Copy that tab's `<template>` v-if block from `pages/admin/index.vue` into a new `pages/admin/<name>.vue` `<template>`.
2. Move the tab's `<script setup>` state/composable calls (the `useAdmin*` call + handlers used only by that tab) into the new page.
3. Add `definePageMeta({ layout: "admin", middleware: ["auth", "admin"] })` and an `onMounted` that triggers the same data load `selectTab` did.
4. Ensure a top-level `<h1>` heading matching the regression regex.
5. Delete that tab's block + now-unused script from `index.vue`.

Then trim `pages/admin/index.vue` to Overview only: keep the overview template block + `useAdminStats`; change `definePageMeta` to `{ layout: "admin", middleware: ["auth", "admin"] }`; delete `tabs`, `activeTab`, `selectTab`, and the in-page tab bar markup.

Adopt the layout on the three standalone utility pages by adding `layout: "admin"` to their existing `definePageMeta`. **Do NOT** add the admin layout/middleware to `pages/admin/signup.vue` — it must stay reachable pre-admin via its token gate.

- [ ] **Step 4: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: 0 errors. Fix any dangling refs from the extraction in one pass.

- [ ] **Step 5: Run the route-regression E2E to verify it passes**

Run: `nvm use && npm run test:e2e -- admin-routes admin-shell`
Expected: PASS (all routes render, no console errors, non-admin redirected).

- [ ] **Step 6: Verify in the running app**

`npm run dev`, log in as admin, click every nav link. Confirm each page loads its data (users list, invitations, health checks, cron cards, tools links) exactly as before. Confirm `/admin/signup?token=...` still works unauthenticated.

- [ ] **Step 7: Commit**

```bash
git add pages/admin/ tests/e2e/admin-routes.spec.ts
git commit -m "refactor(admin): migrate monolith tabs to route pages under admin layout"
```

---

### Task 10: Foundation verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `npm run test`
Expected: PASS, including the new `adminAudit`, `adminQuery`, `audit-log.get`, and four component tests.

- [ ] **Step 2: Type-check + lint + token audit**

Run: `npm run type-check && npm run lint && npm run audit:tokens`
Expected: 0 errors. (Token audit catches any raw hex missed in the primitives.)

- [ ] **Step 3: Full admin E2E**

Run: `nvm use && npm run test:e2e -- admin`
Expected: PASS (shell + routes). Re-run any flake once isolated per the E2E flake guidance in memory.

- [ ] **Step 4: Update session notes + memory**

Update `CLAUDE.local.md` current-session block (foundation shipped, branch, test status). Add a memory pointer if the audit-log/table pattern is worth recalling.

- [ ] **Step 5: Final commit**

```bash
git add CLAUDE.local.md
git commit -m "chore(admin): foundation verification + session notes"
```

---

## Self-Review

**Spec coverage:**
- Shell → routes + layout → Tasks 7, 9. ✅
- Audit table + helper + view → Tasks 1, 2, 8. ✅
- Shared primitives (chart/stat/time-range/table) → Tasks 3, 4, 5. ✅
- `adminQuery` seed → Task 6. ✅
- Testing (unit/migration/E2E regression) → Tasks 1–6 unit, Task 1 migration RED→GREEN, Tasks 7/9/10 E2E. ✅
- `signup.vue` NOT gated → Task 9 Step 3 explicit. ✅
- YAGNI exclusions (no impersonation/Sentry/analytics) → none built here. ✅
- Open items (Resend webhook, SENTRY_API_TOKEN) → deferred, noted in spec, not in this plan. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases". Points needing repo confirmation (actor-id context key, DesignSystem* names, brand token names, E2E admin-login helper) are called out explicitly with how to confirm — not left vague.

**Type consistency:** `AdminAuditRow` shape identical in endpoint (Task 2) and composable (Task 2). `logAdminAction` signature stable (Tasks 1, referenced by #1 later). `AdminAuditAction` enum used in helper + tests. `{ days: number }` range shape consistent (Tasks 4, 7). `dayBuckets`/`countByDay` names consistent (Task 6).

## Notes for later subsystem plans

- **#1 Support** consumes: `logAdminAction("view_as.start"/"view_as.stop")`, `AdminDataTable`, `AdminStatTile`. First step of Spec B: verify Resend webhook→DB ingestion exists.
- **#2 Ops** consumes: `AdminChart`, `AdminTimeRange`, `adminQuery`. Needs `SENTRY_API_TOKEN` (scope `issue:read`).
- **#3 Growth** consumes: `AdminChart`, `AdminStatTile`, `AdminTimeRange`, `adminQuery.countByDay`. Live-query, no new tables.
