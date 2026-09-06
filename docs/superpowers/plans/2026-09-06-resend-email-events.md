# Resend Email Delivery Log (Spec B2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest Resend's outbound email lifecycle webhook (sent/delivered/bounced/complained/opened/clicked) into a new `email_events` table and expose it as a read-only admin dashboard, closing the "Spec B2" gap identified in the admin-support design doc.

**Architecture:** A new Nitro webhook endpoint (`POST /api/webhooks/resend-events`) verifies Resend's Svix signature, then inserts one row per event into `email_events` (service-role only, no RLS policies — same pattern as `admin_audit_log`/`cache_snapshots`). A weekly cron prunes old rows. A new `GET /api/admin/email-events` endpoint + `useAdminEmailEvents` composable + `pages/admin/email.vue` page render the log, mirroring the existing `audit-log.get.ts` / `useAdminAuditLog` / `pages/admin/audit.vue` trio exactly.

**Tech Stack:** Nitro (H3), Supabase Postgres, `svix` (already a dependency, used today only by the inbound-email feature), Vitest, Vue 3 `<script setup>`.

**Spec:** `docs/superpowers/specs/2026-08-17-admin-support-design.md` (line 34: "Email delivery log | Deferred to Spec B2 (full net-new stack: Resend webhook + svix verify + `email_events` + messageId persistence + dashboard config)"). This plan implements that literally: a webhook writes rows to `email_events`, each row carrying Resend's `message_id` (their `data.email_id`) as a column — no retrofit of existing `sendViaResend()` call sites required; that's separate, larger scope (linking every outbound send to a user/family) and is explicitly NOT part of this plan.

**Precedent (do not re-derive, copy the pattern):** the inbound-email feature (issue #586, commits `054cfa5b`/`f5acfc8a`/`d33569b3`/`d0fc46c5`) is already merged to `main` and solves "verify a Resend Svix webhook, exempt it from CSRF, prune it on a cron" for a *different* Resend webhook (inbound mail — `server/api/webhooks/inbound-email.post.ts`, `server/utils/verifyResendWebhook.ts`, the `/api/webhooks/inbound-email` CSRF exemption). This plan writes fresh, parallel files for the *outbound event* webhook rather than generalizing the existing `verifyResendWebhook`/`RESEND_INBOUND_WEBHOOK_SECRET` — Resend issues one signing secret per registered endpoint, so a second endpoint needs its own secret and verify call regardless; do not merge the two into a shared parameterized util for one call site each.

## Global Constraints

- No RLS policies on `email_events` — service-role only, same as `admin_audit_log` and `cache_snapshots` (`claude/database.md`).
- Migration adds an index on every column used in `.eq()`/`.order()` (`claude/database.md` common patterns).
- Every Nitro handler starts with `useLogger(event, "context")` (or `createLogger` for the cron), matching `claude/logging.md`.
- Never expose raw `error.message` in a `statusMessage`.
- Admin endpoints require `requireAdmin(event)` from `server/utils/auth.ts`.
- No new npm package — `svix` is already in `package.json` dependencies (`^1.92.2`), unused until now.
- TDD: failing test → minimal implementation → passing test, per file.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260923000000_email_events.sql` | New `email_events` table + indexes, service-role only. |
| `server/utils/verifyResendEventWebhook.ts` | Verifies the Svix signature on the Resend event webhook, returns parsed payload. |
| `server/api/webhooks/resend-events.post.ts` | Webhook receiver — verify, parse, insert one `email_events` row. |
| `server/middleware/csrf.ts` (modify) | Exempt the new webhook path. |
| `server/api/cron/email-events-purge.get.ts` | Weekly retention sweep (30 days). |
| `vercel.json` (modify) | Register the new cron. |
| `.env.example` (modify) | Document `RESEND_EVENTS_WEBHOOK_SECRET`. |
| `server/api/admin/email-events.get.ts` | Paginated, filterable read of `email_events` for admins. |
| `composables/useAdminEmailEvents.ts` | Admin composable wrapping the endpoint. |
| `pages/admin/email.vue` | Admin page rendering the log via `AdminDataTable`. |
| `layouts/admin.vue` (modify) | Add "Email" nav link. |
| `claude/database.md` (modify) | Document the new table per repo convention. |

---

### Task 1: `email_events` table migration

**Files:**
- Create: `supabase/migrations/20260923000000_email_events.sql`
- Modify: `claude/database.md`

**Interfaces:**
- Produces: table `public.email_events(id uuid, message_id text, event_type text, recipient_email text, subject text, occurred_at timestamptz, raw_payload jsonb, created_at timestamptz)`.

No test for a migration file itself (nothing to unit-test); Task 3's spec exercises the shape via a mocked Supabase client, and this file is applied live via Supabase MCP before Task 3 is exercised against a real DB.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260923000000_email_events.sql
-- Resend outbound email lifecycle events (sent/delivered/bounced/complained/
-- opened/clicked), ingested by POST /api/webhooks/resend-events. One row per
-- event (Resend can send multiple events per message_id over its lifetime).
-- Service-role only — no RLS policies, same pattern as admin_audit_log and
-- cache_snapshots. Not linked to family_unit_id/user_id: that would require
-- retrofitting every sendViaResend() call site with context, which is out of
-- scope for this table (see plan header).

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  message_id text not null,
  event_type text not null check (
    event_type in (
      'sent',
      'delivered',
      'delivery_delayed',
      'bounced',
      'complained',
      'opened',
      'clicked'
    )
  ),
  recipient_email text,
  subject text,
  occurred_at timestamptz not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists email_events_message_id_idx
  on public.email_events (message_id);
create index if not exists email_events_event_type_occurred_at_idx
  on public.email_events (event_type, occurred_at desc);
create index if not exists email_events_created_at_idx
  on public.email_events (created_at);

alter table public.email_events enable row level security;
revoke all on public.email_events from anon, authenticated;
grant select, insert, delete on public.email_events to service_role;
```

- [ ] **Step 2: Apply via Supabase MCP `apply_migration`** (name `email_events`) to the live DB, per this repo's standing convention (`npx supabase db push` fails locally due to schema_migrations drift — see `claude/database.md`).

- [ ] **Step 3: Verify live** — confirm `to_regclass('public.email_events')` is not null, and that `select * from email_events limit 1` as the anon/authenticated role is denied (RLS + revoke).

- [ ] **Step 4: Document in `claude/database.md`**

Add a new dated entry near the other recent entries (top of the "Helper Functions" section or alongside the `cache_snapshots` entry):

```markdown
### 2026-09-06: `email_events` applied live (Resend delivery log, Spec B2)

`supabase/migrations/20260923000000_email_events.sql` — one row per Resend
outbound lifecycle event (sent/delivered/bounced/complained/opened/clicked),
keyed by Resend's `message_id` (their `data.email_id`), ingested by
`POST /api/webhooks/resend-events`. Service-role only (RLS on, no policies,
`anon`/`authenticated` revoked) — same pattern as `admin_audit_log` and
`cache_snapshots`. Deliberately NOT linked to `family_unit_id`/`user_id`:
that requires threading context through every `sendViaResend()` call site,
out of scope for this table. 30-day retention via
`server/api/cron/email-events-purge.get.ts`.
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260923000000_email_events.sql claude/database.md
git commit -m "feat: add email_events table for Resend delivery log (Spec B2)"
```

---

### Task 2: Svix signature verification util

**Files:**
- Create: `server/utils/verifyResendEventWebhook.ts`
- Test: `tests/unit/server/utils/verifyResendEventWebhook.spec.ts`

**Interfaces:**
- Produces: `verifyResendEventWebhook(rawBody: string, headers: Record<string, string | undefined>): unknown` — throws `Error("Invalid webhook signature")` on any failure (missing secret, missing/malformed headers, bad signature); returns the parsed payload on success.
- Consumes: `svix`'s `Webhook` class (`import { Webhook } from "svix"`), env var `RESEND_EVENTS_WEBHOOK_SECRET`.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/server/utils/verifyResendEventWebhook.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));

vi.mock("svix", () => ({
  Webhook: class {
    verify(rawBody: string, headers: Record<string, string>) {
      return verifyMock(rawBody, headers);
    }
  },
}));

import { verifyResendEventWebhook } from "~/server/utils/verifyResendEventWebhook";

describe("verifyResendEventWebhook", () => {
  const headers = {
    "svix-id": "msg_123",
    "svix-timestamp": "1234567890",
    "svix-signature": "v1,abc123",
  };

  beforeEach(() => {
    process.env.RESEND_EVENTS_WEBHOOK_SECRET = "whsec_test";
    verifyMock.mockReset();
  });

  afterEach(() => {
    delete process.env.RESEND_EVENTS_WEBHOOK_SECRET;
  });

  it("returns the verified payload on a valid signature", () => {
    verifyMock.mockReturnValue({ type: "email.delivered", data: { email_id: "msg_1" } });
    const result = verifyResendEventWebhook('{"type":"email.delivered"}', headers);
    expect(result).toEqual({ type: "email.delivered", data: { email_id: "msg_1" } });
  });

  it("throws when the secret is not configured", () => {
    delete process.env.RESEND_EVENTS_WEBHOOK_SECRET;
    expect(() => verifyResendEventWebhook("{}", headers)).toThrow(
      "Invalid webhook signature",
    );
  });

  it("throws when svix verification fails", () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    expect(() => verifyResendEventWebhook("{}", headers)).toThrow(
      "Invalid webhook signature",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/verifyResendEventWebhook.spec.ts`
Expected: FAIL — `Cannot find module '~/server/utils/verifyResendEventWebhook'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/utils/verifyResendEventWebhook.ts
import { Webhook } from "svix";

/**
 * Verifies a Resend outbound-event webhook's Svix signature and returns the
 * parsed payload. Throws on any failure — missing secret, missing/malformed
 * headers, or a signature that doesn't match — so the caller can reject with
 * 401 before touching the database. Never logs the raw body or secret.
 */
export function verifyResendEventWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): unknown {
  const secret = process.env.RESEND_EVENTS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Invalid webhook signature");
  }
  try {
    const webhook = new Webhook(secret);
    return webhook.verify(rawBody, {
      "svix-id": headers["svix-id"] ?? "",
      "svix-timestamp": headers["svix-timestamp"] ?? "",
      "svix-signature": headers["svix-signature"] ?? "",
    });
  } catch {
    throw new Error("Invalid webhook signature");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/utils/verifyResendEventWebhook.spec.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add server/utils/verifyResendEventWebhook.ts tests/unit/server/utils/verifyResendEventWebhook.spec.ts
git commit -m "feat: add Resend event webhook signature verification"
```

---

### Task 3: Webhook receiver endpoint

**Files:**
- Create: `server/api/webhooks/resend-events.post.ts`
- Test: `tests/unit/server/api/webhooks/resend-events.spec.ts`

**Interfaces:**
- Consumes: `verifyResendEventWebhook` (Task 2); `useSupabaseAdmin()` from `~/server/utils/supabase`; `useLogger` from `~/server/utils/logger`.
- Produces: `POST /api/webhooks/resend-events` — 401 on bad signature, `{ ok: true, skipped: "..." }` on an unrecognized/unhandled payload, `{ ok: true }` on a stored event, 500 on insert failure.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/server/api/webhooks/resend-events.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readRawBody: vi.fn(),
    getHeaders: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});

vi.mock("~/server/utils/verifyResendEventWebhook", () => ({
  verifyResendEventWebhook: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  insertedRow: undefined as Record<string, unknown> | undefined,
  insertError: null as { message: string } | null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "email_events") throw new Error(`unexpected table ${table}`);
      return {
        insert: (row: Record<string, unknown>) => {
          mockState.insertedRow = row;
          return Promise.resolve({ error: mockState.insertError });
        },
      };
    },
  }),
}));

import { readRawBody, getHeaders } from "h3";
import { verifyResendEventWebhook } from "~/server/utils/verifyResendEventWebhook";

describe("POST /api/webhooks/resend-events", () => {
  beforeEach(() => {
    vi.mocked(readRawBody).mockResolvedValue('{"type":"email.delivered"}');
    vi.mocked(getHeaders).mockReturnValue({
      "svix-id": "msg_1",
      "svix-timestamp": "123",
      "svix-signature": "v1,sig",
    });
    mockState.insertedRow = undefined;
    mockState.insertError = null;
  });

  it("rejects a bad signature with 401", async () => {
    vi.mocked(verifyResendEventWebhook).mockImplementation(() => {
      throw new Error("Invalid webhook signature");
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("skips an unrecognized payload shape", async () => {
    vi.mocked(verifyResendEventWebhook).mockReturnValue({ type: "email.delivered" });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, skipped: "unrecognized-payload" });
    expect(mockState.insertedRow).toBeUndefined();
  });

  it("skips an unhandled event type", async () => {
    vi.mocked(verifyResendEventWebhook).mockReturnValue({
      type: "email.clicked.link", // not in the known set
      created_at: "2026-09-06T00:00:00Z",
      data: { email_id: "msg_1", to: ["coach@school.edu"], subject: "hi" },
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, skipped: "unhandled-type" });
    expect(mockState.insertedRow).toBeUndefined();
  });

  it("stores a recognized event", async () => {
    vi.mocked(verifyResendEventWebhook).mockReturnValue({
      type: "email.delivered",
      created_at: "2026-09-06T00:00:00Z",
      data: { email_id: "msg_1", to: ["coach@school.edu"], subject: "hi" },
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true });
    expect(mockState.insertedRow).toMatchObject({
      message_id: "msg_1",
      event_type: "delivered",
      recipient_email: "coach@school.edu",
      subject: "hi",
      occurred_at: "2026-09-06T00:00:00Z",
    });
  });

  it("returns 500 when the insert fails", async () => {
    mockState.insertError = { message: "db down" };
    vi.mocked(verifyResendEventWebhook).mockReturnValue({
      type: "email.bounced",
      created_at: "2026-09-06T00:00:00Z",
      data: { email_id: "msg_2", to: ["coach@school.edu"] },
    });
    const { default: handler } = await import(
      "~/server/api/webhooks/resend-events.post"
    );
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/webhooks/resend-events.spec.ts`
Expected: FAIL — `Cannot find module '~/server/api/webhooks/resend-events.post'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/api/webhooks/resend-events.post.ts
/**
 * POST /api/webhooks/resend-events
 *
 * Resend outbound email lifecycle webhook (Spec B2). Every send from
 * emailService.ts eventually reports back here as its status changes:
 * sent → delivered → opened/clicked, or bounced/complained/delivery_delayed.
 * This handler:
 *   1. Verifies the Svix signature before touching the DB.
 *   2. Normalizes the event type (strips the "email." prefix).
 *   3. Inserts one `email_events` row per event.
 *
 * Always returns 200 once past signature verification, even when the
 * payload shape or event type is unrecognized — Resend retries on non-2xx,
 * and an unknown/future event type is not a delivery failure worth retrying.
 */
import { defineEventHandler, readRawBody, getHeaders, createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { verifyResendEventWebhook } from "~/server/utils/verifyResendEventWebhook";

const KNOWN_EVENT_TYPES = new Set([
  "sent",
  "delivered",
  "delivery_delayed",
  "bounced",
  "complained",
  "opened",
  "clicked",
]);

interface ResendEventPayload {
  type: string;
  created_at?: string;
  data: {
    email_id: string;
    to: string[];
    subject?: string;
  };
}

function isResendEventPayload(value: unknown): value is ResendEventPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== "string") return false;
  const data = v.data as Record<string, unknown> | undefined;
  return !!data && typeof data.email_id === "string" && Array.isArray(data.to);
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "webhooks/resend-events");

  let payload: unknown;
  try {
    const rawBody = (await readRawBody(event)) ?? "";
    const headers = getHeaders(event);
    payload = verifyResendEventWebhook(rawBody, headers);
  } catch (err) {
    logger.warn("Rejected Resend event webhook: bad signature", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid webhook signature",
    });
  }

  if (!isResendEventPayload(payload)) {
    logger.warn("Ignoring Resend event webhook with unrecognized shape", {
      type: (payload as { type?: unknown } | null)?.type,
    });
    return { ok: true, skipped: "unrecognized-payload" };
  }

  const eventType = payload.type.replace(/^email\./, "");
  if (!KNOWN_EVENT_TYPES.has(eventType)) {
    logger.info("Ignoring unhandled Resend event type", { type: payload.type });
    return { ok: true, skipped: "unhandled-type" };
  }

  // email_events is not yet in the generated Database schema (migration
  // applied live via MCP, types not regenerated) — same untyped-client
  // pattern used by server/utils/adminAudit.ts.
  const admin = useSupabaseAdmin() as unknown as SupabaseClient;
  const { error } = await admin.from("email_events").insert({
    message_id: payload.data.email_id,
    event_type: eventType,
    recipient_email: payload.data.to[0] ?? null,
    subject: payload.data.subject ?? null,
    occurred_at: payload.created_at ?? new Date().toISOString(),
    raw_payload: payload,
  });

  if (error) {
    logger.error("Failed to store email event", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to store event",
    });
  }

  logger.info("Recorded Resend email event", {
    messageId: payload.data.email_id,
    eventType,
  });
  return { ok: true };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/webhooks/resend-events.spec.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add server/api/webhooks/resend-events.post.ts tests/unit/server/api/webhooks/resend-events.spec.ts
git commit -m "feat: add Resend outbound event webhook receiver"
```

---

### Task 4: CSRF exemption + env var + Resend dashboard config

**Files:**
- Modify: `server/middleware/csrf.ts`
- Modify: `.env.example`
- Test: existing `tests/unit/server/middleware/csrf.spec.ts` (if present) — add one case; if no such spec file exists, skip the test step and verify manually per Step 3.

**Interfaces:**
- Consumes: `isCsrfExemptPath` (existing, `server/middleware/csrf.ts`) — this task adds one entry to `CSRF_EXEMPT_EXACT_PATHS`.

- [ ] **Step 1: Check for an existing CSRF path test**

Run: `find tests -iname "*csrf*"`

If a spec file exists covering `CSRF_EXEMPT_EXACT_PATHS`, add a failing case asserting `isCsrfExemptPath("/api/webhooks/resend-events")` is `true`. If none exists, skip to Step 3 (manual verification) — do not create a new spec file solely for a one-line allowlist addition on an existing, already-tested predicate.

- [ ] **Step 2: If a test file exists, run it to verify the new case fails, then proceed**

- [ ] **Step 3: Add the exemption**

```typescript
// server/middleware/csrf.ts — inside CSRF_EXEMPT_EXACT_PATHS
export const CSRF_EXEMPT_EXACT_PATHS = [
  "/api/athlete/fit-scores/recalculate-all",
  // RFC 8058 one-click unsubscribe: mail clients POST with no cookies/CSRF token.
  // The HMAC unsubscribe token is the authorization.
  "/api/email/unsubscribe",
  // Resend outbound-event webhook: called server-to-server with no
  // cookies/CSRF token. The Svix signature (verifyResendEventWebhook) is
  // the authorization.
  "/api/webhooks/resend-events",
] as const;
```

- [ ] **Step 4: Run the full CSRF test suite to confirm no regression**

Run: `npx vitest run tests/unit/server/middleware/csrf.spec.ts` (adjust path if it lives elsewhere — locate with the Step 1 `find`)
Expected: PASS, including the new case if one was added.

- [ ] **Step 5: Add the webhook secret to `.env.example`**

```bash
# .env.example — near the existing RESEND_API_KEY line
RESEND_API_KEY=your_resend_api_key_here
RESEND_EVENTS_WEBHOOK_SECRET=your_resend_events_webhook_signing_secret_here
```

- [ ] **Step 6: Manual step — note for Chris, not code:** After this ships, register the webhook in the Resend dashboard: Webhooks → Add Endpoint → URL `https://myrecruitingcompass.com/api/webhooks/resend-events` → subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked` → copy the generated signing secret into `RESEND_EVENTS_WEBHOOK_SECRET` in Vercel env vars (prod + QA) and redeploy.

- [ ] **Step 7: Commit**

```bash
git add server/middleware/csrf.ts .env.example
git commit -m "fix: exempt Resend event webhook from CSRF, document webhook secret"
```

---

### Task 5: Retention cron

**Files:**
- Create: `server/api/cron/email-events-purge.get.ts`
- Test: `tests/unit/server/api/cron/email-events-purge.spec.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `withCronRun` from `~/server/utils/cronRunner`; `useSupabaseAdmin` from `~/server/utils/supabase`.
- Produces: `GET /api/cron/email-events-purge` → `{ deletedEmailEvents: number }`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/server/api/cron/email-events-purge.spec.ts
import { describe, it, expect } from "vitest";
import { vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});
vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
vi.mock("~/server/utils/cronRunner", () => ({
  withCronRun: async (
    _event: unknown,
    _name: string,
    fn: (ctx: unknown) => unknown,
  ) => fn({ setProcessed: vi.fn(), setFailed: vi.fn() }),
}));

const deletedRows = [{ id: "evt-1" }, { id: "evt-2" }, { id: "evt-3" }];
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: () => ({
      delete: () => ({
        lt: () => ({
          select: async () => ({ data: deletedRows, error: null }),
        }),
      }),
    }),
  }),
}));

describe("GET /api/cron/email-events-purge", () => {
  it("purges email_events older than 30 days and reports the count", async () => {
    const { default: handler } = await import(
      "~/server/api/cron/email-events-purge.get"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ deletedEmailEvents: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/cron/email-events-purge.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/api/cron/email-events-purge.get.ts
/**
 * GET /api/cron/email-events-purge
 * Weekly retention sweep: deletes email_events rows older than 30 days.
 * This table is append-only from a public webhook and otherwise grows
 * unbounded; 30 days is enough for admins to review recent delivery issues.
 *
 * Security: CRON_SECRET via withCronRun (Bearer or x-cron-secret).
 */
import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";

const logger = createLogger("cron/email-events-purge");

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "email-events-purge", async (ctx) => {
    const supabase = useSupabaseAdmin();

    const { data: deleted, error } = await supabase
      .from("email_events")
      .delete()
      .lt("created_at", daysAgo(RETENTION_DAYS))
      .select("id");

    if (error) logger.error("Failed to prune email_events", error);

    const result = { deletedEmailEvents: deleted?.length ?? 0 };
    ctx.setProcessed(result.deletedEmailEvents);
    logger.info("Email events prune complete", result);
    return result;
  }),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/cron/email-events-purge.spec.ts`
Expected: PASS

- [ ] **Step 5: Register the cron in `vercel.json`**

```json
{
  "path": "/api/cron/email-events-purge",
  "schedule": "0 5 * * 0"
}
```

Add this object to the existing `crons` array (any day/time slot distinct from the others already there is fine — Sunday 05:00 UTC, one hour after `notification-prune`'s Sunday 03:00 and `orphaned-storage-sweep`'s Sunday 04:00, avoiding overlap).

- [ ] **Step 6: Commit**

```bash
git add server/api/cron/email-events-purge.get.ts tests/unit/server/api/cron/email-events-purge.spec.ts vercel.json
git commit -m "feat: prune email_events older than 30 days on a weekly cron"
```

---

### Task 6: Admin read endpoint

**Files:**
- Create: `server/api/admin/email-events.get.ts`
- Test: `tests/unit/server/api/admin/email-events.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin` from `~/server/utils/auth`; `useSupabaseAdmin` from `~/server/utils/supabase`.
- Produces: exported type `AdminEmailEventRow` and `GET /api/admin/email-events` → `{ rows: AdminEmailEventRow[]; total: number }`. Query params: `limit` (default 50, max 200), `offset` (default 0), `eventType` (exact match), `recipientEmail` (`ilike` substring match).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/server/api/admin/email-events.spec.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

const rows = [
  { id: "evt-1", message_id: "msg-1", event_type: "delivered", recipient_email: "a@b.com", subject: "hi", occurred_at: "2026-09-06T00:00:00Z", created_at: "2026-09-06T00:00:00Z" },
];

function buildQueryChain(finalResult: { data: unknown; error: unknown; count: number }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.range = vi.fn(async () => finalResult);
  return chain;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: () => buildQueryChain({ data: rows, error: null, count: 1 }),
  }),
}));

import { getQuery } from "h3";

describe("GET /api/admin/email-events", () => {
  it("returns rows and total", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import(
      "~/server/api/admin/email-events.get"
    );
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ rows, total: 1 });
  });

  it("clamps limit to 200", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "9999" });
    const { default: handler } = await import(
      "~/server/api/admin/email-events.get"
    );
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).resolves.toEqual({ rows, total: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/admin/email-events.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** (mirrors `server/api/admin/audit-log.get.ts` exactly)

```typescript
// server/api/admin/email-events.get.ts
/**
 * GET /api/admin/email-events
 * Fetches Resend outbound email lifecycle events written by
 * POST /api/webhooks/resend-events (Spec B2 delivery log).
 *
 * Query params:
 *   limit          - rows per page (default: 50, max: 200)
 *   offset         - rows to skip (default: 0)
 *   eventType      - filter by exact event_type (optional)
 *   recipientEmail - filter by recipient_email substring, case-insensitive (optional)
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: { rows: AdminEmailEventRow[], total: number }
 */
import { defineEventHandler, createError, getQuery } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export interface AdminEmailEventRow {
  id: string;
  message_id: string;
  event_type: string;
  recipient_email: string | null;
  subject: string | null;
  occurred_at: string;
  created_at: string;
}

interface GetEmailEventsResponse {
  rows: AdminEmailEventRow[];
  total: number;
}

export default defineEventHandler(
  async (event): Promise<GetEmailEventsResponse> => {
    const logger = useLogger(event, "admin/email-events");
    try {
      const admin = await requireAdmin(event);
      // email_events is not yet in the generated Database schema (migration
      // applied live via MCP, types not regenerated) — same untyped client
      // pattern used by server/utils/adminAudit.ts and admin/audit-log.get.ts.
      const supabaseAdmin = useSupabaseAdmin() as unknown as SupabaseClient;

      const query = getQuery(event);
      const limit = Math.min(
        parseInt(String(query.limit ?? "50"), 10) || 50,
        200,
      );
      const offset = Math.max(
        parseInt(String(query.offset ?? "0"), 10) || 0,
        0,
      );

      let eventsQuery = supabaseAdmin
        .from("email_events")
        .select(
          "id, message_id, event_type, recipient_email, subject, occurred_at, created_at",
          { count: "exact" },
        )
        .order("occurred_at", { ascending: false });

      if (typeof query.eventType === "string" && query.eventType) {
        eventsQuery = eventsQuery.eq("event_type", query.eventType);
      }
      if (typeof query.recipientEmail === "string" && query.recipientEmail) {
        eventsQuery = eventsQuery.ilike(
          "recipient_email",
          `%${query.recipientEmail}%`,
        );
      }

      const {
        data: rows,
        error: fetchError,
        count,
      } = await eventsQuery.range(offset, offset + limit - 1);

      if (fetchError) {
        logger.error("Failed to fetch email events", fetchError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch email events",
        });
      }

      const total = count ?? 0;
      logger.info(
        `Admin ${admin.id} fetched email events (${rows?.length ?? 0} of ${total})`,
      );

      return { rows: (rows ?? []) as AdminEmailEventRow[], total };
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }
      logger.error("Get email events endpoint failed", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch email events",
      });
    }
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/admin/email-events.spec.ts`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add server/api/admin/email-events.get.ts tests/unit/server/api/admin/email-events.spec.ts
git commit -m "feat: add admin endpoint for the Resend email delivery log"
```

---

### Task 7: Admin composable + page + nav link

**Files:**
- Create: `composables/useAdminEmailEvents.ts`
- Create: `pages/admin/email.vue`
- Modify: `layouts/admin.vue`
- Test: `tests/unit/composables/useAdminEmailEvents.spec.ts`

**Interfaces:**
- Consumes: `useAdminResource` from `~/composables/useAdminResource`; `AdminEmailEventRow` from `~/server/api/admin/email-events.get` (Task 6); `AdminDataTable` (existing global component).
- Produces: `useAdminEmailEvents()` → `{ rows: Ref<AdminEmailEventRow[]>, total: Ref<number>, loading, error, fetchEmailEvents(opts?: FetchEmailEventsOptions) }`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/composables/useAdminEmailEvents.spec.ts
import { describe, it, expect, vi } from "vitest";

const loadMock = vi.fn();
let capturedBuildUrl: ((opts?: unknown) => string) | undefined;

vi.mock("~/composables/useAdminResource", () => ({
  useAdminResource: (buildUrl: (opts?: unknown) => string) => {
    capturedBuildUrl = buildUrl;
    return {
      data: { value: { rows: [{ id: "evt-1" }], total: 1 } },
      loading: { value: false },
      error: { value: null },
      load: loadMock,
    };
  },
}));

import { useAdminEmailEvents } from "~/composables/useAdminEmailEvents";

describe("useAdminEmailEvents", () => {
  it("exposes rows/total from the resource data", () => {
    const { rows, total } = useAdminEmailEvents();
    expect(rows.value).toEqual([{ id: "evt-1" }]);
    expect(total.value).toBe(1);
  });

  it("builds the query string from filter options", () => {
    useAdminEmailEvents();
    const url = capturedBuildUrl!({
      limit: 25,
      eventType: "bounced",
      recipientEmail: "coach@",
    });
    expect(url).toBe(
      "/api/admin/email-events?limit=25&eventType=bounced&recipientEmail=coach%40",
    );
  });

  it("builds the bare URL with no options", () => {
    useAdminEmailEvents();
    expect(capturedBuildUrl!()).toBe("/api/admin/email-events");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useAdminEmailEvents.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// composables/useAdminEmailEvents.ts
import { computed } from "vue";
import { useAdminResource } from "~/composables/useAdminResource";
import type { AdminEmailEventRow } from "~/server/api/admin/email-events.get";

export type { AdminEmailEventRow };

export interface FetchEmailEventsOptions {
  limit?: number;
  offset?: number;
  eventType?: string;
  recipientEmail?: string;
}

interface EmailEventsPayload {
  rows: AdminEmailEventRow[];
  total: number;
}

export function useAdminEmailEvents() {
  const { data, loading, error, load } = useAdminResource<
    EmailEventsPayload,
    [FetchEmailEventsOptions?]
  >(
    (opts = {}) => {
      const params = new URLSearchParams();
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.offset !== undefined) params.set("offset", String(opts.offset));
      if (opts.eventType) params.set("eventType", opts.eventType);
      if (opts.recipientEmail) params.set("recipientEmail", opts.recipientEmail);
      const qs = params.toString();
      return `/api/admin/email-events${qs ? `?${qs}` : ""}`;
    },
    {
      failLabel: "Failed to load email events",
      fallbackMessage: "Could not load the email delivery log.",
    },
  );

  const rows = computed<AdminEmailEventRow[]>(() => data.value?.rows ?? []);
  const total = computed(() => data.value?.total ?? 0);

  const fetchEmailEvents = (opts: FetchEmailEventsOptions = {}) => load(opts);

  return { rows, total, loading, error, fetchEmailEvents };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useAdminEmailEvents.spec.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Write the page**

```vue
<!-- pages/admin/email.vue -->
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const { rows, total, loading, error, fetchEmailEvents } = useAdminEmailEvents();

// AdminDataTable expects a generic row shape; AdminEmailEventRow rows are
// rendered via typed cell slots, so widen for the prop binding only.
const tableRows = computed(
  () => rows.value as unknown as Record<string, unknown>[],
);

const columns = [
  { key: "occurred_at", label: "When" },
  { key: "event_type", label: "Event" },
  { key: "recipient_email", label: "Recipient" },
  { key: "subject", label: "Subject" },
  { key: "message_id", label: "Message ID" },
];

onMounted(() => fetchEmailEvents({ limit: 100 }));
</script>

<template>
  <section>
    <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">
      Email Delivery Log ({{ total }})
    </h1>
    <AdminDataTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      :error="error"
    >
      <template #cell-occurred_at="{ value }">{{
        new Date(String(value)).toLocaleString()
      }}</template>
    </AdminDataTable>
  </section>
</template>
```

- [ ] **Step 6: Add the nav link**

In `layouts/admin.vue`, add one entry to the existing `links` array (after `"Audit"`, before `"Tools"`):

```typescript
const links = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/growth", label: "Growth" },
  { to: "/admin/invitations", label: "Invitations" },
  { to: "/admin/health", label: "Health" },
  { to: "/admin/jobs", label: "Jobs" },
  { to: "/admin/audit", label: "Audit" },
  { to: "/admin/email", label: "Email" },
  { to: "/admin/tools", label: "Tools" },
];
```

- [ ] **Step 7: Manual browser verify**

Run: `! npm run dev` (with `NUXT_PUBLIC_ADMIN_HOST=localhost:3003` per `claude/admin` E2E convention), navigate to `/admin/email`, confirm the page loads with an empty-state table (no rows yet, since no webhook has fired locally) and no console errors.

- [ ] **Step 8: Commit**

```bash
git add composables/useAdminEmailEvents.ts pages/admin/email.vue layouts/admin.vue tests/unit/composables/useAdminEmailEvents.spec.ts
git commit -m "feat: add admin Email Delivery Log page"
```

---

## Self-Review

**Spec coverage:**
- "Resend webhook" → Task 3.
- "svix verify" → Task 2.
- "`email_events`" → Task 1.
- "messageId persistence" → Task 1's `message_id` column, populated in Task 3.
- "dashboard config" → Task 4 Step 6 (manual Resend-dashboard registration note) + Task 6/7 (the actual admin dashboard page). Covered on both readings of the phrase.

**Placeholder scan:** no TBD/TODO; every step has runnable code or an exact command.

**Type consistency:** `AdminEmailEventRow` defined once in Task 6 (`server/api/admin/email-events.get.ts`), imported by Task 7's composable and re-exported — never redefined. `event_type` string values (`sent`/`delivered`/`delivery_delayed`/`bounced`/`complained`/`opened`/`clicked`) match across the Task 1 CHECK constraint, Task 3's `KNOWN_EVENT_TYPES`, and the test fixtures in Tasks 3/6/7.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-06-resend-email-events.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
