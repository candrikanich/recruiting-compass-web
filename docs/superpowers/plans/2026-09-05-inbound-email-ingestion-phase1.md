# Inbound Email Ingestion — Phase 1 (Infrastructure + Webhook) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Resend Inbound webhook pipeline so a coach's reply, forwarded by a player to their family's unique inbound address, is durably captured, parsed, matched to a coach, and stored as a `pending` draft — no UI yet (Phase 2), no `mailto:` auto-reply detection (separate issue).

**Architecture:** A per-family inbound token (`family_units.inbound_token`) is embedded in a Resend-managed address (`family-<token>@inbound.therecruitingcompass.com`). Resend POSTs a Svix-signed webhook to `POST /api/webhooks/inbound-email` on receipt. The handler verifies the signature, resolves the family by token, stores the raw payload in `raw_inbound_emails` (7-day retention, purged by a new cron job), runs a pure forwarded-header parser to recover the original coach's name/email/date from the quoted block, matches that email against the family's `coaches` table (reusing the existing `matchCoachByEmail` helper), and inserts one `inbound_email_drafts` row with `status: 'pending'`. All of this mirrors the existing public-profile lead-capture pattern (`profile_contacts` + `inboundInteraction.ts` + `matchCoachByEmail.ts`) rather than inventing a new shape.

**Tech Stack:** Nitro (`server/api/**`), Supabase Postgres (service-role writes, RLS family-read), `resend` (already a dependency) for inbound payload shape, `svix` (already a transitive dependency via `resend`, and already pinned in `package.json` `overrides`) for webhook signature verification, Zod for payload validation, Vitest for tests.

**Spec:** GitHub issue [#586](https://github.com/candrikanich/recruiting-compass-web/issues/586) (Phase 1 checklist). Superseded brainstorm: issue #489 (closed, folded in).

## Global Constraints

- Never create/mutate a `coaches` or `schools` row from unauthenticated webhook input — matching only, exactly like `matchCoachByEmail.ts` already does. An unmatched sender stores `matched_coach_id: null`; the player links/creates the coach later (Phase 2 UI).
- Webhook body signature MUST be verified before any DB write — reject with 401 on bad/missing signature.
- Raw email payload is retained 7 days then purged (`raw_inbound_emails`) — data minimization per the issue's own Phase 1 checklist.
- All new columns nullable / additive, one column or table per migration, per `claude/database.md` convention. Any column used in `.eq()`/`.match()` gets an index in the same migration.
- `family_unit_id` is set explicitly by app code on every insert (never rely solely on the `derive_family_unit_id()` trigger) — matches the documented convention and satisfies RLS at insert time.
- No `mailto:`/outbound auto-reply detection in this plan — out of scope per the issue, tracked separately.
- Migrations are gated: after writing each migration file, STOP and ask "Ready to run? (`npx supabase db push` locally / apply via MCP)" before applying — per repo workflow convention. Do not apply silently.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260906000000_family_inbound_token.sql` | Adds `family_units.inbound_token` (unique, generated) |
| `supabase/migrations/20260906000001_inbound_email_tables.sql` | Creates `raw_inbound_emails` + `inbound_email_drafts` tables + RLS |
| `server/utils/familyInboundToken.ts` | Token generation (mirrors `familyCode.ts`) + family resolution by token |
| `server/utils/parseForwardedEmail.ts` | Pure parser: forwarded-email body → `{ senderName, senderEmail, originalDate } \| null` |
| `server/utils/verifyResendWebhook.ts` | Svix signature verification wrapper around the raw request |
| `server/api/webhooks/inbound-email.post.ts` | The Nitro webhook handler wiring all of the above together |
| `server/api/cron/inbound-email-purge.get.ts` | Weekly cron: deletes `raw_inbound_emails` older than 7 days |
| `vercel.json` | Register the new cron |

---

### Task 1: `family_units.inbound_token` migration + generator util

**Files:**
- Create: `supabase/migrations/20260906000000_family_inbound_token.sql`
- Create: `server/utils/familyInboundToken.ts`
- Test: `tests/unit/server/utils/familyInboundToken.spec.ts`

**Interfaces:**
- Produces: `generateInboundToken(admin: SupabaseClient<Database>): Promise<string>` — 8-char lowercase-alphanumeric token, collision-checked against `family_units.inbound_token`, throws after 5 retries (mirrors `generateFamilyCode`).
- Produces: `resolveFamilyByInboundToken(admin: SupabaseClient<Database>, token: string): Promise<string | null>` — returns `family_unit_id` or `null`.
- Produces: `parseInboundToken(toAddress: string): string | null` — extracts the token from `family-<token>@inbound.therecruitingcompass.com` (or any `@inbound.` subdomain), returns `null` if the local-part doesn't match `^family-[a-z0-9]{8}$`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260906000000_family_inbound_token.sql
-- Per-family unique inbound-email token. Embedded in a Resend-managed
-- address (family-<token>@inbound.therecruitingcompass.com) that a player
-- forwards coach emails to. Nullable + backfilled lazily is not viable here
-- (the webhook must resolve a family on first-ever forward), so this
-- migration backfills every existing family_unit in the same pass.
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS inbound_token text
    CHECK (inbound_token ~ '^[a-z0-9]{8}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_units_inbound_token
  ON family_units (inbound_token)
  WHERE inbound_token IS NOT NULL;

-- Backfill: generate a random 8-char token for every family lacking one.
-- gen_random_uuid() collision odds at this row count are negligible; a
-- runtime collision (new family created concurrently) is handled by the
-- unique index + app-level retry in generateInboundToken().
UPDATE family_units
SET inbound_token = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE inbound_token IS NULL;

ALTER TABLE family_units
  ALTER COLUMN inbound_token SET NOT NULL;
```

- [ ] **Step 2: STOP — ask "Ready to run? (`npx supabase db push` locally / apply via MCP)"** before proceeding. Do not write Step 3 code against a schema that isn't applied yet.

- [ ] **Step 3: Write the failing test**

```ts
// tests/unit/server/utils/familyInboundToken.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateInboundToken,
  resolveFamilyByInboundToken,
  parseInboundToken,
} from "~/server/utils/familyInboundToken";

function buildAdminMock(existingTokens: string[], familyByToken: Record<string, string>) {
  return {
    from: (table: string) => {
      if (table !== "family_units") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (_col: string, value: string) => ({
            maybeSingle: async () =>
              existingTokens.includes(value)
                ? { data: { id: "collide" }, error: null }
                : { data: null, error: null },
          }),
        }),
      };
    },
  } as never;
}

describe("parseInboundToken", () => {
  it("extracts the token from a valid inbound address", () => {
    expect(
      parseInboundToken("family-ab3d9f2c@inbound.therecruitingcompass.com"),
    ).toBe("ab3d9f2c");
  });

  it("returns null for a malformed local-part", () => {
    expect(parseInboundToken("notfamily-ab3d9f2c@inbound.therecruitingcompass.com")).toBeNull();
    expect(parseInboundToken("family-short@inbound.therecruitingcompass.com")).toBeNull();
    expect(parseInboundToken("garbage")).toBeNull();
  });
});

describe("generateInboundToken", () => {
  it("retries on collision and returns a fresh 8-char token", async () => {
    const admin = buildAdminMock(["aaaaaaaa"], {});
    const token = await generateInboundToken(admin);
    expect(token).toMatch(/^[a-z0-9]{8}$/);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/familyInboundToken.spec.ts`
Expected: FAIL with "Cannot find module '~/server/utils/familyInboundToken'"

- [ ] **Step 5: Implement**

```ts
// server/utils/familyInboundToken.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

const TOKEN_RE = /^[a-z0-9]{8}$/;
const INBOUND_LOCAL_PART_RE = /^family-([a-z0-9]{8})$/;

const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomToken(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let result = "";
  for (let i = 0; i < bytes.length; i++) result += chars[bytes[i] % chars.length];
  return result;
}

/**
 * Generates a unique 8-char lowercase-alphanumeric inbound token, retrying
 * on collision. Mirrors generateFamilyCode's retry shape.
 */
export async function generateInboundToken(
  admin: SupabaseClient<Database>,
): Promise<string> {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const token = randomToken();
    const { data } = await admin
      .from("family_units")
      .select("id")
      .eq("inbound_token", token)
      .maybeSingle();
    if (!data) return token;
  }
  throw new Error("Failed to generate unique inbound token after 5 retries");
}

/** Resolves a family_unit_id from its inbound_token, or null if unknown. */
export async function resolveFamilyByInboundToken(
  admin: SupabaseClient<Database>,
  token: string,
): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data } = await admin
    .from("family_units")
    .select("id")
    .eq("inbound_token", token)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Extracts the inbound token from the "To" address's local-part
 * (family-<token>@inbound.*). Returns null on any other shape — an
 * unrecognized address must never be treated as a valid token.
 */
export function parseInboundToken(toAddress: string): string | null {
  const localPart = toAddress.split("@")[0]?.trim().toLowerCase();
  if (!localPart) return null;
  const match = INBOUND_LOCAL_PART_RE.exec(localPart);
  return match ? match[1] : null;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/utils/familyInboundToken.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260906000000_family_inbound_token.sql server/utils/familyInboundToken.ts tests/unit/server/utils/familyInboundToken.spec.ts
git commit -m "feat: add per-family inbound email token"
```

---

### Task 2: `raw_inbound_emails` + `inbound_email_drafts` tables

**Files:**
- Create: `supabase/migrations/20260906000001_inbound_email_tables.sql`

**Interfaces:**
- Produces: table `raw_inbound_emails` (columns: `id uuid`, `family_unit_id uuid nullable`, `payload jsonb not null`, `created_at timestamptz`).
- Produces: table `inbound_email_drafts` (columns: `id uuid`, `family_unit_id uuid not null`, `raw_email_id uuid references raw_inbound_emails`, `matched_coach_id uuid nullable`, `matched_school_id uuid nullable`, `sender_name text`, `sender_email text`, `subject text`, `body_text text`, `occurred_at timestamptz`, `status text default 'pending'`, `confirmed_interaction_id uuid nullable`, `created_at timestamptz`).
- Consumes: `family_units(id)`, `coaches(id)`, `schools(id)`, `interactions(id)` (all pre-existing).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260906000001_inbound_email_tables.sql
-- Phase 1 (issue #586): raw inbound-email sink + parsed/matched draft
-- interactions awaiting player confirmation (Phase 2 UI, not built yet).
-- Mirrors the profile_contacts lead-capture shape: service-role writes only,
-- family-scoped RLS read, no coach/school row ever created from this input.

create table if not exists public.raw_inbound_emails (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid references public.family_units(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.raw_inbound_emails enable row level security;
-- No SELECT policy: raw payloads may contain full email bodies/headers and
-- are for debugging only, purged after 7 days by a cron job (Task 6). Only
-- the service-role client (webhook + purge cron) ever touches this table.

create index if not exists idx_raw_inbound_emails_created_at
  on public.raw_inbound_emails (created_at);

create table if not exists public.inbound_email_drafts (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  raw_email_id uuid references public.raw_inbound_emails(id) on delete set null,
  matched_coach_id uuid references public.coaches(id) on delete set null,
  matched_school_id uuid references public.schools(id) on delete set null,
  sender_name text,
  sender_email text,
  subject text,
  body_text text,
  occurred_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'discarded')),
  confirmed_interaction_id uuid references public.interactions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inbound_email_drafts enable row level security;

-- Family members read their own pending drafts (Phase 2 review UI). No
-- INSERT/UPDATE/DELETE policy yet — the webhook writes via service-role;
-- confirm/discard mutations are added in Phase 2 alongside the UI that
-- calls them, scoped narrowly to status transitions only.
create policy "inbound_email_drafts family read"
  on public.inbound_email_drafts
  for select
  using (
    family_unit_id in (
      select family_unit_id
      from public.family_members
      where user_id = auth.uid()
    )
  );

create index if not exists idx_inbound_email_drafts_family
  on public.inbound_email_drafts (family_unit_id, status, created_at desc);
```

- [ ] **Step 2: STOP — ask "Ready to run?"** before applying.

- [ ] **Step 3: Commit** (schema-only task; no unit test — the insert path is tested end-to-end in Task 5's webhook test against a mocked Supabase client, and RLS itself is verified live once applied, per repo convention of not unit-testing RLS in Vitest).

```bash
git add supabase/migrations/20260906000001_inbound_email_tables.sql
git commit -m "feat: add raw_inbound_emails and inbound_email_drafts tables"
```

---

### Task 3: Forwarded-email parser

**Files:**
- Create: `server/utils/parseForwardedEmail.ts`
- Test: `tests/unit/server/utils/parseForwardedEmail.spec.ts`

**Interfaces:**
- Produces: `parseForwardedEmail(bodyText: string): ParsedForward | null` where `ParsedForward = { senderName: string | null; senderEmail: string | null; originalDate: string | null }`. Returns `null` only when the body contains no recognizable forward marker; a partial match (e.g. email found, date not) returns an object with the unmatched fields `null` — never throws.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/utils/parseForwardedEmail.spec.ts
import { describe, it, expect } from "vitest";
import { parseForwardedEmail } from "~/server/utils/parseForwardedEmail";

describe("parseForwardedEmail", () => {
  it("parses a Gmail-style forward header", () => {
    const body = `Hey, saw this — let's talk soon.\n\nOn Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> Thanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });

  it("parses an Outlook-style forward header", () => {
    const body = `FYI\n\nFrom: Coach Smith <smith@osu.edu>\nSent: Monday, September 2, 2026 3:15 PM\nTo: Player <player@example.com>\nSubject: Re: Camp invite\n\nThanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Monday, September 2, 2026 3:15 PM",
    });
  });

  it("parses an Apple Mail-style forward header", () => {
    const body = `On Sep 2, 2026, at 3:15 PM, Coach Smith <smith@osu.edu> wrote:\n\nThanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Sep 2, 2026, at 3:15 PM",
    });
  });

  it("returns null when no forward marker is present", () => {
    expect(parseForwardedEmail("Just a plain note, no forward here.")).toBeNull();
  });

  it("falls back to a bare email address with no display name", () => {
    const body = `On Mon, Sep 2, 2026 at 3:15 PM <smith@osu.edu> wrote:\n> hi`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: null,
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/parseForwardedEmail.spec.ts`
Expected: FAIL with "Cannot find module '~/server/utils/parseForwardedEmail'"

- [ ] **Step 3: Implement**

```ts
// server/utils/parseForwardedEmail.ts
export interface ParsedForward {
  senderName: string | null;
  senderEmail: string | null;
  originalDate: string | null;
}

// Gmail: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:"
// Apple Mail differs only by using ", at " and a comma before "wrote:", so it
// is matched by the same pattern with an optional leading comma.
const ON_WROTE_RE =
  /On\s+(.+?),?\s+(?:([^<>\n]+?)\s+)?<([^<>\s]+@[^<>\s]+)>\s+wrote:/i;

// Outlook: separate "From:"/"Sent:" header lines rather than one "On ... wrote:" line.
const OUTLOOK_FROM_RE = /From:\s*(?:([^<>\n]+?)\s*)?<?([^<>\s\n]+@[^<>\s\n]+)>?/i;
const OUTLOOK_SENT_RE = /Sent:\s*(.+)/i;

/**
 * Best-effort extraction of the original sender from a forwarded email body.
 * Handles Gmail/Apple-Mail's single "On <date> <name> <email> wrote:" line
 * and Outlook's separate From:/Sent: header block. Never throws — a body
 * that matches nothing returns null so the caller stores an unmatched draft
 * rather than dropping the forward.
 */
export function parseForwardedEmail(bodyText: string): ParsedForward | null {
  const onWroteMatch = ON_WROTE_RE.exec(bodyText);
  if (onWroteMatch) {
    return {
      originalDate: onWroteMatch[1]?.trim() ?? null,
      senderName: onWroteMatch[2]?.trim() ?? null,
      senderEmail: onWroteMatch[3]?.trim() ?? null,
    };
  }

  const fromMatch = OUTLOOK_FROM_RE.exec(bodyText);
  if (fromMatch) {
    const sentMatch = OUTLOOK_SENT_RE.exec(bodyText);
    return {
      senderName: fromMatch[1]?.trim() ?? null,
      senderEmail: fromMatch[2]?.trim() ?? null,
      originalDate: sentMatch?.[1]?.trim() ?? null,
    };
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/utils/parseForwardedEmail.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add server/utils/parseForwardedEmail.ts tests/unit/server/utils/parseForwardedEmail.spec.ts
git commit -m "feat: add forwarded-email header parser"
```

---

### Task 4: Svix webhook signature verification

**Files:**
- Create: `server/utils/verifyResendWebhook.ts`
- Test: `tests/unit/server/utils/verifyResendWebhook.spec.ts`

**Interfaces:**
- Consumes: `svix` package's `Webhook` class (already resolvable — direct dependency of `resend`, and pinned in `package.json` `overrides` at `^1.92.2`).
- Produces: `verifyResendWebhook(rawBody: string, headers: Record<string, string | undefined>): unknown` — returns the parsed, verified JSON payload; throws an `Error` with message `"Invalid webhook signature"` on any verification failure (bad signature, missing headers, missing secret).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/utils/verifyResendWebhook.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const verifyMock = vi.fn();
vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(() => ({ verify: verifyMock })),
}));

import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";

describe("verifyResendWebhook", () => {
  const headers = {
    "svix-id": "msg_123",
    "svix-timestamp": "1234567890",
    "svix-signature": "v1,abc123",
  };

  beforeEach(() => {
    process.env.RESEND_INBOUND_WEBHOOK_SECRET = "whsec_test";
    verifyMock.mockReset();
  });

  afterEach(() => {
    delete process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  });

  it("returns the verified payload on a valid signature", () => {
    verifyMock.mockReturnValue({ type: "email.received", data: { subject: "hi" } });
    const result = verifyResendWebhook('{"type":"email.received"}', headers);
    expect(result).toEqual({ type: "email.received", data: { subject: "hi" } });
  });

  it("throws when the secret is not configured", () => {
    delete process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    expect(() => verifyResendWebhook("{}", headers)).toThrow("Invalid webhook signature");
  });

  it("throws when svix verification fails", () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    expect(() => verifyResendWebhook("{}", headers)).toThrow("Invalid webhook signature");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/verifyResendWebhook.spec.ts`
Expected: FAIL with "Cannot find module '~/server/utils/verifyResendWebhook'"

- [ ] **Step 3: Implement**

```ts
// server/utils/verifyResendWebhook.ts
import { Webhook } from "svix";

/**
 * Verifies a Resend Inbound webhook's Svix signature and returns the parsed
 * payload. Throws on any failure — missing secret, missing/malformed
 * headers, or a signature that doesn't match — so the caller can reject with
 * 401 before touching the database. Never logs the raw body or secret.
 */
export function verifyResendWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): unknown {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
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

Run: `npx vitest run tests/unit/server/utils/verifyResendWebhook.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add server/utils/verifyResendWebhook.ts tests/unit/server/utils/verifyResendWebhook.spec.ts
git commit -m "feat: add Resend inbound webhook signature verification"
```

---

### Task 5: `POST /api/webhooks/inbound-email` handler

**Files:**
- Create: `server/api/webhooks/inbound-email.post.ts`
- Test: `tests/unit/server/api/webhooks/inbound-email.spec.ts`

**Interfaces:**
- Consumes: `verifyResendWebhook` (Task 4), `parseInboundToken` + `resolveFamilyByInboundToken` (Task 1), `parseForwardedEmail` (Task 3), `matchCoachByEmail` from `~/server/utils/matchCoachByEmail` (pre-existing — `MatchCoachByEmailParams { familyUnitId, email }` → `MatchCoachByEmailResult { coachId, schoolId }`).
- Produces: HTTP 200 `{ ok: true }` on success (including "matched nothing, stored unmatched draft" — never a failure state to Resend, which retries on non-2xx). HTTP 401 on bad signature. HTTP 200 `{ ok: true, skipped: "unknown-family" }` when the `to` address's token doesn't resolve (not a Resend-retry-worthy error).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/webhooks/inbound-email.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readRawBody: vi.fn(),
    getHeaders: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), { statusCode: opts.statusCode }),
  };
});

vi.mock("~/server/utils/verifyResendWebhook", () => ({
  verifyResendWebhook: vi.fn(),
}));
vi.mock("~/server/utils/familyInboundToken", () => ({
  parseInboundToken: vi.fn(),
  resolveFamilyByInboundToken: vi.fn(),
}));
vi.mock("~/server/utils/parseForwardedEmail", () => ({
  parseForwardedEmail: vi.fn(),
}));
vi.mock("~/server/utils/matchCoachByEmail", () => ({
  matchCoachByEmail: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  rawInsertId: "raw-1",
  draftInsertRow: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "raw_inbound_emails") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: mockState.rawInsertId }, error: null }),
            }),
          }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.draftInsertRow = row;
            return {
              select: () => ({
                single: async () => ({ data: { id: "draft-1" }, error: null }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { readRawBody, getHeaders } from "h3";
import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";
import { parseInboundToken, resolveFamilyByInboundToken } from "~/server/utils/familyInboundToken";
import { parseForwardedEmail } from "~/server/utils/parseForwardedEmail";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";

describe("POST /api/webhooks/inbound-email", () => {
  beforeEach(() => {
    vi.mocked(readRawBody).mockResolvedValue('{"type":"email.received"}');
    vi.mocked(getHeaders).mockReturnValue({
      "svix-id": "msg_1",
      "svix-timestamp": "123",
      "svix-signature": "v1,sig",
    });
    mockState.draftInsertRow = undefined;
  });

  it("rejects a bad signature with 401", async () => {
    vi.mocked(verifyResendWebhook).mockImplementation(() => {
      throw new Error("Invalid webhook signature");
    });
    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("skips gracefully when the inbound token doesn't resolve to a family", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        to: ["family-deadbeef@inbound.therecruitingcompass.com"],
        from: "Coach Smith <smith@osu.edu>",
        subject: "Re: hi",
        text: "no forward marker",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("deadbeef");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue(null);

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, skipped: "unknown-family" });
    expect(mockState.draftInsertRow).toBeUndefined();
  });

  it("creates a matched draft when the forwarded sender matches a coach", async () => {
    vi.mocked(verifyResendWebhook).mockReturnValue({
      type: "email.received",
      data: {
        to: ["family-ab3d9f2c@inbound.therecruitingcompass.com"],
        from: "Player <player@example.com>",
        subject: "Fwd: Camp invite",
        text: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> hi",
        created_at: "2026-09-02T15:15:00.000Z",
      },
    });
    vi.mocked(parseInboundToken).mockReturnValue("ab3d9f2c");
    vi.mocked(resolveFamilyByInboundToken).mockResolvedValue("family-1");
    vi.mocked(parseForwardedEmail).mockReturnValue({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
    vi.mocked(matchCoachByEmail).mockResolvedValue({ coachId: "coach-1", schoolId: "school-1" });

    const { default: handler } = await import("~/server/api/webhooks/inbound-email.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ ok: true });
    expect(mockState.draftInsertRow).toMatchObject({
      family_unit_id: "family-1",
      matched_coach_id: "coach-1",
      matched_school_id: "school-1",
      sender_name: "Coach Smith",
      sender_email: "smith@osu.edu",
      status: "pending",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/webhooks/inbound-email.spec.ts`
Expected: FAIL with "Cannot find module '~/server/api/webhooks/inbound-email.post'"

- [ ] **Step 3: Implement**

```ts
// server/api/webhooks/inbound-email.post.ts
/**
 * POST /api/webhooks/inbound-email
 *
 * Resend Inbound webhook receiver (issue #586 Phase 1). A player forwards a
 * coach's email to their family's unique inbound address; Resend parses the
 * MIME message and POSTs the result here, Svix-signed. This handler:
 *   1. Verifies the signature before touching the DB.
 *   2. Resolves the family from the `to` address's token.
 *   3. Stores the raw payload (7-day retention, purged by a cron job).
 *   4. Parses the quoted "On ... wrote:" block to recover the ORIGINAL
 *      coach's name/email/date (the forwarder is the player, not the coach).
 *   5. Matches that email against the family's coaches (never creates one).
 *   6. Inserts a `pending` draft — Phase 2 builds the confirm/discard UI.
 *
 * Always returns 200 once past signature verification, even on a partial
 * match or unresolved family — Resend retries on non-2xx, and a malformed
 * forward is not a delivery failure worth retrying.
 */
import { defineEventHandler, readRawBody, getHeaders, createError } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";
import {
  parseInboundToken,
  resolveFamilyByInboundToken,
} from "~/server/utils/familyInboundToken";
import { parseForwardedEmail } from "~/server/utils/parseForwardedEmail";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";
import type { Database } from "~/types/database";

interface ResendInboundPayload {
  type: string;
  data: {
    to: string[];
    from: string;
    subject: string;
    text: string;
    created_at: string;
  };
}

function isResendInboundPayload(value: unknown): value is ResendInboundPayload {
  if (!value || typeof value !== "object") return false;
  const data = (value as { data?: unknown }).data;
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as { to?: unknown }).to) &&
    typeof (data as { from?: unknown }).from === "string"
  );
}

type RawEmailInsert = Database["public"]["Tables"]["raw_inbound_emails"]["Insert"];
type DraftInsert = Database["public"]["Tables"]["inbound_email_drafts"]["Insert"];

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "webhooks/inbound-email");

  let payload: unknown;
  try {
    const rawBody = (await readRawBody(event)) ?? "";
    const headers = getHeaders(event);
    payload = verifyResendWebhook(rawBody, headers);
  } catch (err) {
    logger.warn("Rejected inbound email webhook: bad signature", err);
    throw createError({ statusCode: 401, statusMessage: "Invalid webhook signature" });
  }

  if (!isResendInboundPayload(payload)) {
    logger.warn("Ignoring inbound webhook with unrecognized shape", { type: (payload as { type?: unknown })?.type });
    return { ok: true, skipped: "unrecognized-payload" };
  }

  const admin = useSupabaseAdmin();
  const toAddress = payload.data.to[0] ?? "";
  const token = parseInboundToken(toAddress);
  const familyUnitId = token ? await resolveFamilyByInboundToken(admin, token) : null;

  if (!familyUnitId) {
    logger.warn("Inbound email addressed to unknown/malformed token", { toAddress });
    return { ok: true, skipped: "unknown-family" };
  }

  const rawInsert: RawEmailInsert = { family_unit_id: familyUnitId, payload: payload as never };
  const { data: rawRow, error: rawError } = await admin
    .from("raw_inbound_emails")
    .insert(rawInsert)
    .select("id")
    .single();
  if (rawError) {
    logger.error("Failed to store raw inbound email", rawError);
  }

  const parsed = parseForwardedEmail(payload.data.text ?? "");
  const { coachId, schoolId } = await matchCoachByEmail(admin, {
    familyUnitId,
    email: parsed?.senderEmail,
  });

  const draftInsert: DraftInsert = {
    family_unit_id: familyUnitId,
    raw_email_id: rawRow?.id ?? null,
    matched_coach_id: coachId,
    matched_school_id: schoolId,
    sender_name: parsed?.senderName ?? null,
    sender_email: parsed?.senderEmail ?? null,
    subject: payload.data.subject ?? null,
    body_text: payload.data.text ?? null,
    occurred_at: payload.data.created_at ?? new Date().toISOString(),
    status: "pending",
  };

  const { error: draftError } = await admin
    .from("inbound_email_drafts")
    .insert(draftInsert)
    .select("id")
    .single();
  if (draftError) {
    logger.error("Failed to create inbound email draft", draftError);
    throw createError({ statusCode: 500, statusMessage: "Failed to store draft" });
  }

  logger.info("Inbound email draft created", { familyUnitId, matched: !!coachId });
  return { ok: true };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/webhooks/inbound-email.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Regenerate Supabase types** so `Database["public"]["Tables"]["raw_inbound_emails"]` / `["inbound_email_drafts"]` exist (needed for Step 3 to type-check) — run after Task 2's migration is applied:

Run: `npx supabase gen types typescript --local > types/database.ts` (or the project's equivalent generate-types command — check `package.json` scripts for the exact one in use, e.g. `npm run types:generate`).

- [ ] **Step 6: Run `npm run type-check`**

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add server/api/webhooks/inbound-email.post.ts tests/unit/server/api/webhooks/inbound-email.spec.ts types/database.ts
git commit -m "feat: add inbound email webhook handler"
```

---

### Task 6: 7-day raw-email purge cron

**Files:**
- Create: `server/api/cron/inbound-email-purge.get.ts`
- Modify: `vercel.json`
- Test: `tests/unit/server/api/cron/inbound-email-purge.spec.ts`

**Interfaces:**
- Consumes: `withCronRun(event, name, fn)` from `~/server/utils/cronRunner` (pre-existing — `fn` receives `ctx: { setProcessed(n), setFailed(n) }` and its return value becomes the response body).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/cron/inbound-email-purge.spec.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});
vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
vi.mock("~/server/utils/cronRunner", () => ({
  withCronRun: async (_event: unknown, _name: string, fn: (ctx: unknown) => unknown) =>
    fn({ setProcessed: vi.fn(), setFailed: vi.fn() }),
}));

const deletedRows = [{ id: "raw-1" }, { id: "raw-2" }];
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

describe("GET /api/cron/inbound-email-purge", () => {
  it("purges raw_inbound_emails older than 7 days and reports the count", async () => {
    const { default: handler } = await import("~/server/api/cron/inbound-email-purge");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ deletedRawEmails: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/cron/inbound-email-purge.spec.ts`
Expected: FAIL with "Cannot find module '~/server/api/cron/inbound-email-purge'"

- [ ] **Step 3: Implement**

```ts
// server/api/cron/inbound-email-purge.get.ts
/**
 * GET /api/cron/inbound-email-purge
 * Weekly retention sweep for raw_inbound_emails (issue #586 Phase 1) — the
 * raw webhook payload is kept only long enough to debug a parsing failure,
 * then purged. inbound_email_drafts (the parsed/matched result) is untouched
 * — it persists until the player confirms or discards it (Phase 2).
 *
 * Security: CRON_SECRET via withCronRun (Bearer or x-cron-secret).
 */
import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";

const logger = createLogger("cron/inbound-email-purge");

const RAW_EMAIL_RETENTION_DAYS = 7;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "inbound-email-purge", async (ctx) => {
    const supabase = useSupabaseAdmin();

    const { data: deleted, error } = await supabase
      .from("raw_inbound_emails")
      .delete()
      .lt("created_at", daysAgo(RAW_EMAIL_RETENTION_DAYS))
      .select("id");
    if (error) logger.error("Failed to purge raw_inbound_emails", error);

    const result = { deletedRawEmails: deleted?.length ?? 0 };
    ctx.setProcessed(result.deletedRawEmails);
    logger.info("Raw inbound email purge complete", result);
    return result;
  }),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/cron/inbound-email-purge.spec.ts`
Expected: PASS

- [ ] **Step 5: Register the cron in `vercel.json`**

Read `vercel.json`'s existing `crons` array first (it has entries like the `notification-prune` one referenced in Task 6's docstring) and add, matching the existing entry shape exactly (same `schedule` field name, same path prefix):

```json
{
  "path": "/api/cron/inbound-email-purge",
  "schedule": "0 10 * * 0"
}
```

(Sunday 10:00 UTC — pick a slot that doesn't collide with an existing entry; check the file for what's already scheduled at that time before finalizing.)

- [ ] **Step 6: Commit**

```bash
git add server/api/cron/inbound-email-purge.get.ts tests/unit/server/api/cron/inbound-email-purge.spec.ts vercel.json
git commit -m "feat: purge raw inbound emails after 7 days"
```

---

### Task 7: Env vars + manual Resend Inbound setup (non-code)

This task has no automated test — it's account/DNS configuration Chris must do by hand, and the plan should not silently skip it.

- [ ] **Step 1:** In the Resend dashboard, enable Inbound on the free `<id>.resend.app` subdomain (per the issue — defers custom `inbound.therecruitingcompass.com` MX setup to later).
- [ ] **Step 2:** Configure the inbound webhook URL to `https://<prod-domain>/api/webhooks/inbound-email` and copy the signing secret.
- [ ] **Step 3:** Add `RESEND_INBOUND_WEBHOOK_SECRET` to Vercel env vars (Production + Preview) and to local `.env` for dev testing.
- [ ] **Step 4:** Update `parseInboundToken`'s domain assumption (Task 1) if the free subdomain shape differs from `family-<token>@inbound.therecruitingcompass.com` — Resend's free subdomain addresses may instead be `<token>@<random-id>.resend.app` with no `family-` prefix possible. **Verify the actual address format Resend assigns before shipping Task 1** — if it can't carry a custom local-part, the token must be looked up a different way (e.g. a dedicated Resend inbound route per family, or a `Reply-To`/custom header Resend preserves). Flag this to Chris as an open verification item before Task 1 is executed, not after.
- [ ] **Step 5:** Manually send one real forwarded email through the pipeline (Gmail forward is the most common client) and confirm a `pending` row lands in `inbound_email_drafts` — this is the plan's only true end-to-end check, since everything else is unit-mocked.

---

## Self-Review Notes

- **Spec coverage:** Phase 1 checklist items — unique per-family address (Task 1), webhook + Svix verification (Task 4+5), raw email temp storage + 7-day purge (Task 2+6), forward-header parser for Gmail/Outlook/Apple Mail (Task 3), coach/school matching (Task 5, reusing existing `matchCoachByEmail`) — all covered. Rate limiting from the issue's checklist is deliberately **not** a per-IP/per-key limiter here: Resend is the only caller, gated by signature verification, so the "rate limiting" concern is the signature check itself, not `rateLimitByIp`. If Chris wants a hard cap on drafts/family/day as an abuse backstop, that's a fast follow-on `inbound_email_drafts` count check in Task 5 — flagged, not built, to keep Phase 1 scoped to what the issue's architecture actually needs.
- **Open risk flagged explicitly in Task 7, Step 4:** the free-subdomain address format needs verifying against Resend's actual product before Task 1's `family-<token>@` assumption is trusted — this is the one unverified external fact the whole plan hinges on, called out rather than buried.
- **Phase 2/3 boundary:** draft review UI, confirm/discard endpoints + their RLS UPDATE policy, notification-on-draft-created, and the settings-page display of the family's inbound address are explicitly Phase 2 per the issue and not included here.
