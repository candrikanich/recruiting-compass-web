# Decoupled Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New signups (parent-start and player-start) reach an authenticated dashboard immediately, with email verification handled as a background task instead of a login-blocking gate.

**Architecture:** Account creation moves server-side (`admin.createUser` with `email_confirm: true`) so Supabase never withholds a session; our own `users.email_verified_at` column + `email_verification_tokens` table become the sole verification record, driven by a custom email and a session-aware `/verify-email/[token]` page. Invite-accept paths (guardian claim, family invite) stamp verification directly since the invite-link click already proves ownership.

**Tech Stack:** Nuxt 3 / Nitro server routes, Supabase (Postgres + Auth admin API), Vitest, existing Resend email pipeline (`server/utils/emailService.ts`).

**Spec:** `docs/superpowers/specs/2026-09-14-decoupled-email-verification-design.md`

## Global Constraints

- Token expiry: 24 hours (spec §3).
- Invite-path accounts (guardian claim, family invite accept) never see the verify-email flow — stamped verified on accept (spec §5).
- Backfill: `email_verified_at = auth.users.email_confirmed_at` where set; `now()` for every other existing row — no retroactive nagging (spec §2).
- Native Supabase `enable_confirmations` toggle-off is a manual dashboard step, not part of this plan's diff (spec §7).
- Turnstile bot-protection must not regress: the client already collects a Turnstile token on the signup form (`pages/signup.vue`) and today Supabase's `signUp` verifies it natively. Moving account creation server-side means this plan's new endpoint must verify that token itself via the existing `server/utils/turnstile.ts` (`verifyTurnstile`) before calling `admin.createUser` — this was not in the original spec text but is required to avoid silently disabling bot protection on signup.

---

## Task 1: Migration — `email_verified_at` column + backfill

**Files:**
- Create: `supabase/migrations/20260928000000_email_verified_at.sql`
- Test: `tests/integration/rls/email-verified-at.integration.spec.ts` (new)

**Interfaces:**
- Produces: `public.users.email_verified_at timestamptz null` — read by `stores/user.ts` (Task 11), written by Task 6 (signup), Task 8 (verify), Task 12 (invite-accept stamping).

- [ ] **Step 1: Write the migration**

```sql
-- email_verified_at is this app's own verification record, decoupled from
-- Supabase's native email-confirmation gate (which withholds the session
-- until confirmed — incompatible with getting new users to the dashboard
-- immediately). See docs/superpowers/specs/2026-09-14-decoupled-email-verification-design.md.
alter table public.users
  add column if not exists email_verified_at timestamptz null;

-- Backfill: carry over any real prior Supabase confirmation.
update public.users u
set email_verified_at = au.email_confirmed_at
from auth.users au
where u.id = au.id
  and au.email_confirmed_at is not null
  and u.email_verified_at is null;

-- Grandfather every other existing account (including QA accounts created
-- while enable_confirmations = false, which never had anything to confirm) —
-- only accounts created after this ships go through the real gate.
update public.users
set email_verified_at = now()
where email_verified_at is null;
```

- [ ] **Step 2: Write a failing integration test asserting the backfill shape**

```typescript
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

// Requires a local/test Supabase instance with migrations applied —
// matches the pattern in tests/integration/rls/*.integration.spec.ts.
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe("email_verified_at backfill", () => {
  it("has no null email_verified_at rows after migration", async () => {
    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("email_verified_at", null);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 3: Apply the migration to the local/test Supabase project**

Run: `npx supabase db push` (or the project's documented local-apply command per `claude/database.md`)
Expected: migration applies without error.

- [ ] **Step 4: Run the integration test**

Run: `npm run test -- tests/integration/rls/email-verified-at.integration.spec.ts`
Expected: PASS (0 null rows).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260928000000_email_verified_at.sql tests/integration/rls/email-verified-at.integration.spec.ts
git commit -m "feat: add users.email_verified_at with backfill"
```

---

## Task 2: Migration — `email_verification_tokens` table

**Files:**
- Create: `supabase/migrations/20260928000001_email_verification_tokens.sql`

**Interfaces:**
- Produces: `public.email_verification_tokens (id, user_id, token, expires_at, consumed_at, created_at)` — written/read by `server/utils/emailVerificationTokens.ts` (Task 3).

- [ ] **Step 1: Write the migration**

```sql
-- Service-role-only verification tokens, decoupled from Supabase's native
-- confirmation OTPs. 24h expiry (spec: docs/superpowers/specs/2026-09-14-decoupled-email-verification-design.md §3).
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_tokens_user_id_idx
  on public.email_verification_tokens (user_id);

alter table public.email_verification_tokens enable row level security;

-- No client-visible policies — service role (server/utils/supabase.ts
-- useSupabaseAdmin()) bypasses RLS entirely, matching admin_audit_log.
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: table created without error.

- [ ] **Step 3: Verify no client-role access**

Run (psql against the test project, or via Supabase Studio SQL editor):
```sql
select count(*) from public.email_verification_tokens; -- as anon/authenticated role
```
Expected: permission denied (no policy grants access).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260928000001_email_verification_tokens.sql
git commit -m "feat: add email_verification_tokens table"
```

---

## Task 3: Server util — token generate/consume/invalidate

**Files:**
- Create: `server/utils/emailVerificationTokens.ts`
- Test: `tests/unit/server/utils/emailVerificationTokens.spec.ts`

**Interfaces:**
- Consumes: `useSupabaseAdmin()` from `server/utils/supabase.ts` (existing).
- Produces:
  - `issueVerificationToken(userId: string): Promise<{ token: string; expiresAt: string }>` — invalidates any prior unconsumed token for the user, inserts a fresh one. Used by Task 5 (signup) and Task 8 (resend).
  - `consumeVerificationToken(token: string): Promise<{ status: "verified" | "already_verified" | "expired" | "not_found"; userId?: string }>` — used by Task 7 (verify endpoint).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockTokenRow: Record<string, unknown> | null = null;
let mockUpdateCalls: Record<string, unknown>[] = [];
let mockInsertCalls: Record<string, unknown>[] = [];

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "email_verification_tokens") {
        return {
          update: (fields: Record<string, unknown>) => {
            mockUpdateCalls.push(fields);
            return {
              eq: () => ({
                is: async () => ({ error: null }),
              }),
            };
          },
          insert: (fields: Record<string, unknown>) => {
            mockInsertCalls.push(fields);
            return { error: null };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockTokenRow }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

import {
  issueVerificationToken,
  consumeVerificationToken,
} from "~/server/utils/emailVerificationTokens";

describe("emailVerificationTokens", () => {
  beforeEach(() => {
    mockTokenRow = null;
    mockUpdateCalls = [];
    mockInsertCalls = [];
  });

  it("issues a token with a 24h expiry and invalidates prior tokens first", async () => {
    const { token, expiresAt } = await issueVerificationToken("user-1");

    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    const expiresMs = new Date(expiresAt).getTime() - Date.now();
    expect(expiresMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(expiresMs).toBeLessThan(24.1 * 60 * 60 * 1000);
    expect(mockUpdateCalls).toEqual([{ consumed_at: expect.any(String) }]);
    expect(mockInsertCalls[0]).toMatchObject({ user_id: "user-1", token });
  });

  it("returns not_found for an unknown token", async () => {
    mockTokenRow = null;
    const result = await consumeVerificationToken("missing");
    expect(result.status).toBe("not_found");
  });

  it("returns expired for a lapsed token", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      consumed_at: null,
    };
    const result = await consumeVerificationToken("stale");
    expect(result.status).toBe("expired");
  });

  it("returns already_verified for a consumed token, idempotently", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: new Date().toISOString(),
    };
    const result = await consumeVerificationToken("used");
    expect(result.status).toBe("already_verified");
    expect(result.userId).toBe("user-1");
  });

  it("verifies a valid unconsumed token", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: null,
    };
    const result = await consumeVerificationToken("good");
    expect(result.status).toBe("verified");
    expect(result.userId).toBe("user-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/utils/emailVerificationTokens.spec.ts`
Expected: FAIL with "Cannot find module '~/server/utils/emailVerificationTokens'"

- [ ] **Step 3: Write the implementation**

```typescript
import { randomUUID } from "crypto";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueVerificationToken(
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const supabase = useSupabaseAdmin();

  // Invalidate any outstanding unconsumed token first — resend must kill
  // the old link, not leave two valid ones.
  await supabase
    .from("email_verification_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("consumed_at", null);

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabase.from("email_verification_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Failed to issue verification token: ${error.message}`);
  }

  return { token, expiresAt };
}

export async function consumeVerificationToken(token: string): Promise<{
  status: "verified" | "already_verified" | "expired" | "not_found";
  userId?: string;
}> {
  const supabase = useSupabaseAdmin();

  const { data: row } = await supabase
    .from("email_verification_tokens")
    .select("user_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) {
    return { status: "not_found" };
  }

  if (row.consumed_at) {
    // Idempotent — a double-click or stale tab replaying the same link is
    // a success, not an error (spec §4).
    return { status: "already_verified", userId: row.user_id };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { status: "expired" };
  }

  await supabase
    .from("email_verification_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("token", token);

  await supabase
    .from("users")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", row.user_id);

  return { status: "verified", userId: row.user_id };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/server/utils/emailVerificationTokens.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailVerificationTokens.ts tests/unit/server/utils/emailVerificationTokens.spec.ts
git commit -m "feat: add email verification token issue/consume utility"
```

---

## Task 4: `sendVerificationEmail` in emailService.ts

**Files:**
- Modify: `server/utils/emailService.ts` (add after `sendGuardianClaimEmail`, ~line 333)
- Test: `tests/unit/server/utils/emailService.spec.ts` (extend existing file — check it exists first; if not, create it following the pattern of `tests/unit/server/api/guardian/resend.post.spec.ts`'s mocking style)

**Interfaces:**
- Consumes: `wrapEmailLayout` (existing, `server/utils/emailTemplates.ts`), `sendEmail` (existing, same file), `escapeHtml`/`sanitizeUrl` (existing, same file).
- Produces: `sendVerificationEmail(options: { to: string; token: string; context?: EmailSendContext }): Promise<{ success: boolean; messageId?: string; error?: string }>` — used by Task 5 (signup) and Task 8 (resend).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";

const mockSendViaResend = vi.fn(async () => ({ success: true, messageId: "msg-1" }));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: { send: mockSendViaResend },
  })),
}));
vi.mock("~/server/utils/emailSends", () => ({
  logEmailSend: vi.fn(async () => undefined),
}));
vi.mock("~/server/utils/sentryContext", () => ({
  shouldCaptureInSentry: vi.fn(() => false),
}));

import { sendVerificationEmail } from "~/server/utils/emailService";

describe("sendVerificationEmail", () => {
  it("includes the token link and a stable idempotency key", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const result = await sendVerificationEmail({
      to: "parent@example.com",
      token: "abc-123",
    });

    expect(result.success).toBe(true);
    const [[sendArgs]] = mockSendViaResend.mock.calls;
    expect(sendArgs.html).toContain("/verify-email/abc-123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/utils/emailService.spec.ts -t "sendVerificationEmail"`
Expected: FAIL — `sendVerificationEmail is not a function`

- [ ] **Step 3: Add the implementation**

Insert after `sendGuardianClaimEmail` (server/utils/emailService.ts:333):

```typescript
export interface SendVerificationEmailOptions {
  to: string;
  token: string;
  context?: EmailSendContext;
}

export const sendVerificationEmail = async (
  options: SendVerificationEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, token, context } = options;
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const verifyUrl = `${baseUrl}/verify-email/${encodeURIComponent(token)}`;

  const bodyHtml = `
    <h1 style="margin:0 0 16px 0;font-size:24px;color:#111827;">Verify your email</h1>
    <p style="margin:0 0 16px 0;color:#4b5563;font-size:16px;">
      You're all set — your dashboard is ready. Confirming your email keeps
      your account secure and makes sure we can reach you.
    </p>
    <a href="${sanitizeUrl(verifyUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">
      Verify my email
    </a>
    <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
      This link expires in 24 hours. If you didn't create this account, you
      can ignore this email.
    </p>
  `;

  return sendEmail({
    to,
    subject: "Verify your email — The Recruiting Compass",
    html: wrapEmailLayout(bodyHtml, {
      preheader: "Confirm your email to keep your account secure.",
    }),
    idempotencyKey: `verify-email-${token}`,
    context,
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/server/utils/emailService.spec.ts -t "sendVerificationEmail"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailService.ts tests/unit/server/utils/emailService.spec.ts
git commit -m "feat: add sendVerificationEmail"
```

---

## Task 5: `server/api/auth/signup.post.ts` — server-side account creation

**Files:**
- Create: `server/api/auth/signup.post.ts`
- Test: `tests/unit/server/api/auth/signup.post.spec.ts`

**Interfaces:**
- Consumes: `verifyTurnstile` (`server/utils/turnstile.ts`, existing), `useSupabaseAdmin` (`server/utils/supabase.ts`, existing), `issueVerificationToken` (Task 3), `sendVerificationEmail` (Task 4), `rateLimitByIp`/`throwIfRateLimited` (existing).
- Produces: `POST /api/auth/signup` — body `{ email, password, fullName?, role?, dateOfBirth?, captchaToken?, metadata?: Record<string,string|boolean> }`, response `{ userId: string }` on success. Consumed by Task 6 (`useAuth.ts` signup()).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateUser = vi.fn(async () => ({
  data: { user: { id: "user-1", email: "parent@example.com" } },
  error: null,
}));
const mockIssueToken = vi.fn(async () => ({
  token: "tok-1",
  expiresAt: "2026-09-15T00:00:00.000Z",
}));
const mockSendVerification = vi.fn(async () => ({ success: true }));
const mockVerifyTurnstile = vi.fn(async () => ({ ok: true }));

vi.mock("~/server/utils/turnstile", () => ({
  verifyTurnstile: mockVerifyTurnstile,
}));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { createUser: mockCreateUser } },
  })),
}));
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  issueVerificationToken: mockIssueToken,
}));
vi.mock("~/server/utils/emailService", () => ({
  sendVerificationEmail: mockSendVerification,
}));
vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: vi.fn(async () => ({ success: true })),
  throwIfRateLimited: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import handler from "~/server/api/auth/signup.post";
import { createTestEvent } from "~~/tests/helpers/h3Event"; // matches existing server-api test helper pattern

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    mockCreateUser.mockClear();
    mockVerifyTurnstile.mockClear();
  });

  it("creates an auto-confirmed user, issues a token, and sends the verification email", async () => {
    const event = createTestEvent({
      method: "POST",
      body: {
        email: "Parent@Example.com",
        password: "correct-horse-1",
        fullName: "Pat Parent",
        role: "parent",
        captchaToken: "cf-token",
      },
    });

    const result = await handler(event);

    expect(mockVerifyTurnstile).toHaveBeenCalledWith(
      "cf-token",
      expect.objectContaining({ expectedAction: undefined }),
    );
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "parent@example.com",
        email_confirm: true,
      }),
    );
    expect(mockSendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "parent@example.com", token: "tok-1" }),
    );
    expect(result).toEqual({ userId: "user-1" });
  });

  it("rejects when Turnstile verification fails", async () => {
    mockVerifyTurnstile.mockResolvedValueOnce({ ok: false, reason: "missing_token" });
    const event = createTestEvent({
      method: "POST",
      body: { email: "p@example.com", password: "correct-horse-1" },
    });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});
```

If `tests/helpers/h3Event.ts` doesn't already exist, check how a comparable existing endpoint test builds its H3Event (e.g. `tests/unit/server/api/family/invite.post.spec.ts`) and match that pattern instead of introducing a new helper.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/api/auth/signup.post.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { verifyTurnstile } from "~/server/utils/turnstile";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { issueVerificationToken } from "~/server/utils/emailVerificationTokens";
import { sendVerificationEmail } from "~/server/utils/emailService";

interface SignupBody {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  dateOfBirth?: string;
  captchaToken?: string;
  metadata?: Record<string, string | boolean>;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/signup");

  const rateLimitResult = await rateLimitByIp(event, {
    requests: 10,
    window: "1 h",
  });
  throwIfRateLimited(rateLimitResult);

  const body = await readBody<SignupBody>(event);
  const email = body.email?.trim().toLowerCase();
  const { password, fullName, role, dateOfBirth, captchaToken, metadata } =
    body;

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email and password are required",
    });
  }

  // The signup form's Turnstile widget today gets verified natively by
  // Supabase's own signUp() call. Moving account creation server-side means
  // this endpoint owns that check instead — the widget renders with no
  // explicit `action`, so none is expected here either.
  const turnstileResult = await verifyTurnstile(captchaToken);
  if (!turnstileResult.ok) {
    logger.warn("Signup blocked: Turnstile verification failed", {
      reason: turnstileResult.reason,
    });
    throw createError({
      statusCode: 403,
      statusMessage: "Verification failed. Please try again.",
    });
  }

  const userMetadata: Record<string, string | boolean> = {
    ...(metadata ?? {}),
    ...(fullName ? { full_name: fullName } : {}),
    ...(role ? { role } : {}),
    ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
  };

  const supabase = useSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error || !data.user) {
    logger.error("Signup failed", error);
    const statusCode =
      error?.message?.toLowerCase().includes("already registered") ||
      error?.message?.toLowerCase().includes("already been registered")
        ? 409
        : 400;
    throw createError({
      statusCode,
      statusMessage: statusCode === 409
        ? "An account with this email already exists"
        : "Unable to create account. Please try again.",
    });
  }

  const { token } = await issueVerificationToken(data.user.id);
  const emailResult = await sendVerificationEmail({ to: email, token });
  if (!emailResult.success) {
    // Non-fatal — the account exists and is usable; the dashboard resend
    // button covers this. Log for visibility only.
    logger.error("Verification email failed to send", emailResult.error);
  }

  logger.info("Signup succeeded", { userId: data.user.id });
  return { userId: data.user.id };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/server/api/auth/signup.post.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/api/auth/signup.post.ts tests/unit/server/api/auth/signup.post.spec.ts
git commit -m "feat: add server-side signup endpoint with auto-confirm"
```

---

## Task 6: `useAuth.ts` `signup()` — call the new endpoint, then sign in

**Files:**
- Modify: `composables/useAuth.ts:261-330` (the `signup` function body)
- Test: `tests/unit/composables/useAuth.spec.ts:423-...` (the `describe("signup", ...)` block) — rewrite its mocks; also run `useAuth.extended.spec.ts` and fix any signup-related assertions the same way (they currently mock `mockAuth.signUp` the same way this block does).

**Interfaces:**
- Consumes: `POST /api/auth/signup` (Task 5), `supabase.auth.signInWithPassword` (existing, unchanged).
- Produces: `signup(...)` keeps its existing external signature and return shape `{ data: { user, session }, error }` — callers (`pages/signup.vue`) are otherwise unaffected except that `data.session` is now always present on success.

- [ ] **Step 1: Write the failing test (replaces the existing "should signup successfully with minimal data" test)**

```typescript
// Inside describe("signup", ...) in tests/unit/composables/useAuth.spec.ts —
// replace the $fetch/supabase mocking for this block:
it("should signup successfully with minimal data", async () => {
  const { mockSupabase, mockAuth } = getMockSupabase();
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  });
  const mockFetch = vi.fn(async () => ({ userId: mockUser.id }));
  vi.stubGlobal("$fetch", mockFetch);

  const { signup } = useAuth();
  const result = await signup("test@example.com", "password123");

  expect(mockFetch).toHaveBeenCalledWith(
    "/api/auth/signup",
    expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({ email: "test@example.com" }),
    }),
  );
  expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password123",
  });
  expect(result.data.session).toEqual(mockSession);
  expect(result.error).toBeNull();

  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/composables/useAuth.spec.ts -t "should signup successfully with minimal data"`
Expected: FAIL — `mockFetch` never called (current implementation still calls `supabase.auth.signUp` directly)

- [ ] **Step 3: Rewrite the `signup` implementation**

Replace `composables/useAuth.ts:261-330` (the body from `const signup = async (` through the `supabase.auth.signUp(signUpParams)` call and its result) with:

```typescript
  const signup = async (
    email: string,
    password: string,
    fullName?: string,
    role?: string,
    captchaToken?: string,
    dateOfBirth?: string,
    pendingAdmin?: boolean,
    onboardingStep1?: {
      graduationYear: number;
      primarySport: string;
      gender?: string;
      zipCode?: string;
    },
    inviteToken?: string,
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const trimmedEmail = email.trim().toLowerCase();

      const metadata: Record<string, string | boolean> = {};
      if (pendingAdmin) {
        metadata.pending_admin = true;
      }
      if (onboardingStep1) {
        metadata.pending_graduation_year = String(
          onboardingStep1.graduationYear,
        );
        metadata.pending_primary_sport = onboardingStep1.primarySport;
        if (onboardingStep1.gender) {
          metadata.pending_gender = onboardingStep1.gender;
        }
        if (onboardingStep1.zipCode) {
          metadata.pending_zip_code = onboardingStep1.zipCode;
        }
      }
      if (inviteToken) {
        metadata.pending_invite_token = inviteToken;
      }

      await $fetch("/api/auth/signup", {
        method: "POST",
        body: {
          email: trimmedEmail,
          password,
          fullName,
          role,
          dateOfBirth,
          captchaToken,
          metadata,
        },
      });

      // Session issuance is a normal password sign-in now that the account
      // is auto-confirmed server-side — no confirmation gap to wait out.
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signInError) {
        error.value = signInError;
        throw signInError;
      }

      return { data, error: null };
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error("Signup failed");
      error.value = authError;
      logger.error("[useAuth] Signup failed", authError.message);
      throw authError;
    } finally {
      loading.value = false;
    }
  };
```

- [ ] **Step 4: Run the signup test block and the full useAuth suites**

Run: `npm run test -- tests/unit/composables/useAuth.spec.ts tests/unit/composables/useAuth.extended.spec.ts`
Expected: PASS. If any other test in either file still asserts against `mockAuth.signUp` for the signup flow, update it to the `$fetch` + `signInWithPassword` pattern shown in Step 1 rather than deleting the assertion.

- [ ] **Step 5: Commit**

```bash
git add composables/useAuth.ts tests/unit/composables/useAuth.spec.ts tests/unit/composables/useAuth.extended.spec.ts
git commit -m "refactor: useAuth signup calls server-side signup endpoint"
```

---

## Task 7: `server/api/auth/verify-email/[token].post.ts`

**Files:**
- Create: `server/api/auth/verify-email/[token].post.ts`
- Delete: `server/api/auth/verify-email.post.ts`, `tests/unit/server/api/auth/verify-email.spec.ts` (superseded — native-OTP-based, replaced by the token-table flow)
- Test: `tests/unit/server/api/auth/verify-email-token.post.spec.ts`

**Interfaces:**
- Consumes: `consumeVerificationToken` (Task 3).
- Produces: `POST /api/auth/verify-email/:token` → `{ status: "verified" | "already_verified" | "expired" | "not_found" }`. Consumed by Task 9 (verify page).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";

const mockConsume = vi.fn();
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  consumeVerificationToken: mockConsume,
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import handler from "~/server/api/auth/verify-email/[token].post";
import { createTestEvent } from "~~/tests/helpers/h3Event";

describe("POST /api/auth/verify-email/:token", () => {
  it("returns verified for a valid token", async () => {
    mockConsume.mockResolvedValue({ status: "verified", userId: "user-1" });
    const event = createTestEvent({ method: "POST", params: { token: "tok-1" } });

    const result = await handler(event);
    expect(result).toEqual({ status: "verified" });
  });

  it("returns 410 for an expired token", async () => {
    mockConsume.mockResolvedValue({ status: "expired" });
    const event = createTestEvent({ method: "POST", params: { token: "tok-1" } });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 410 });
  });

  it("returns 404 for an unknown token", async () => {
    mockConsume.mockResolvedValue({ status: "not_found" });
    const event = createTestEvent({ method: "POST", params: { token: "bad" } });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

(Match `createTestEvent`/params conventions to whatever the codebase's existing `[token]`-route tests use, e.g. `tests/unit/server/api/guardian/claim/*.spec.ts`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/api/auth/verify-email-token.post.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { consumeVerificationToken } from "~/server/utils/emailVerificationTokens";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/verify-email");
  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const result = await consumeVerificationToken(token);

  if (result.status === "not_found") {
    throw createError({
      statusCode: 404,
      statusMessage: "Verification link is invalid. Please request a new one.",
    });
  }

  if (result.status === "expired") {
    throw createError({
      statusCode: 410,
      statusMessage: "Verification link has expired. Please request a new one.",
    });
  }

  logger.info("Email verification result", { status: result.status, userId: result.userId });
  return { status: result.status };
});
```

- [ ] **Step 4: Delete the superseded native-OTP endpoint and its test**

```bash
git rm server/api/auth/verify-email.post.ts tests/unit/server/api/auth/verify-email.spec.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/unit/server/api/auth/verify-email-token.post.spec.ts`
Expected: PASS (3 tests). Also run `npm run test` for the full suite once to confirm nothing else referenced the deleted file.

- [ ] **Step 6: Commit**

```bash
git add server/api/auth/verify-email tests/unit/server/api/auth/verify-email-token.post.spec.ts
git commit -m "feat: token-table-based verify-email endpoint, retire native-OTP one"
```

---

## Task 8: `server/api/auth/verify-email/resend.post.ts`

**Files:**
- Delete: `server/api/auth/resend-verification.post.ts`, `tests/unit/server/api/auth/resend-verification.spec.ts`, `tests/unit/server/api/auth/resend-verification.post.spec.ts` (superseded — unauthenticated email-in-body + native `generateLink`, replaced by session-authed resend)
- Create: `server/api/auth/verify-email/resend.post.ts`
- Modify: `composables/useEmailVerification.ts` (`resendVerificationEmail`, `checkEmailVerificationStatus`)
- Modify: `components/Dashboard/EmailVerificationBanner.vue:27` (dead `/verify-email` link)
- Test: `tests/unit/server/api/auth/verify-email-resend.post.spec.ts`, `tests/unit/composables/useEmailVerification.spec.ts` (update existing resend/status tests)

**Interfaces:**
- Consumes: `requireAuth` (`server/utils/auth.ts`, existing), `issueVerificationToken` (Task 3), `sendVerificationEmail` (Task 4), `rateLimitByUser`/`throwIfRateLimited` (existing).
- Produces: `POST /api/auth/verify-email/resend` (session-authenticated, no body) → `{ success: true }`. Consumed by Task 9 (expired-link inline resend) and, via `useEmailVerification.resendVerificationEmail()`, the dashboard banner.

**Plan-defect fix (found in pre-flight scan, not in the original spec text):**
`components/Dashboard/EmailVerificationBanner.vue` calls
`useEmailVerification().resendVerificationEmail(email)`, which currently
posts `{ email }` to the old `/api/auth/resend-verification` — deleted in
this task — and links to `/verify-email` — deleted in Task 9, and with no
token-less destination to replace it. Both must be fixed here, or the
banner breaks the moment Tasks 8-9 land.

- [ ] **Step 1: Delete the superseded endpoint and tests**

```bash
git rm server/api/auth/resend-verification.post.ts tests/unit/server/api/auth/resend-verification.spec.ts tests/unit/server/api/auth/resend-verification.post.spec.ts
```

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";

const mockIssueToken = vi.fn(async () => ({ token: "tok-2", expiresAt: "2026-09-16T00:00:00.000Z" }));
const mockSendVerification = vi.fn(async () => ({ success: true }));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1", email: "parent@example.com" })),
}));
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  issueVerificationToken: mockIssueToken,
}));
vi.mock("~/server/utils/emailService", () => ({
  sendVerificationEmail: mockSendVerification,
}));
vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ success: true })),
  throwIfRateLimited: vi.fn(),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import handler from "~/server/api/auth/verify-email/resend.post";
import { createTestEvent } from "~~/tests/helpers/h3Event";

describe("POST /api/auth/verify-email/resend", () => {
  it("issues a new token and re-sends for the authenticated user", async () => {
    const event = createTestEvent({ method: "POST" });
    const result = await handler(event);

    expect(mockIssueToken).toHaveBeenCalledWith("user-1");
    expect(mockSendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "parent@example.com", token: "tok-2" }),
    );
    expect(result).toEqual({ success: true });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/api/auth/verify-email-resend.post.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the implementation**

```typescript
import { defineEventHandler } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import { issueVerificationToken } from "~/server/utils/emailVerificationTokens";
import { sendVerificationEmail } from "~/server/utils/emailService";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/verify-email/resend");
  const user = await requireAuth(event);

  const rateLimitResult = await rateLimitByUser(event, user.id, {
    requests: 5,
    window: "1 h",
  });
  throwIfRateLimited(rateLimitResult);

  const { token } = await issueVerificationToken(user.id);
  const result = await sendVerificationEmail({ to: user.email, token });

  if (!result.success) {
    logger.error("Resend verification email failed", result.error);
  }

  return { success: true };
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/server/api/auth/verify-email-resend.post.spec.ts`
Expected: PASS

- [ ] **Step 6: Fix `useEmailVerification.resendVerificationEmail` to call the new endpoint**

In `composables/useEmailVerification.ts`, replace the `resendVerificationEmail` function:

```typescript
  const resendVerificationEmail = async (): Promise<boolean> => {
    const result = await withAsyncState(
      "Failed to resend verification email",
      async () => {
        const response = await $fetch("/api/auth/verify-email/resend", {
          method: "POST",
        });

        if (response && response.success) {
          return true;
        }

        error.value = "Failed to resend verification email";
        return false;
      },
    );

    return result ?? false;
  };
```

It's now session-authenticated (no `email` argument) since the caller is
always a logged-in user (spec's decoupled model has no unauthenticated
resend path). Also replace `checkEmailVerificationStatus` — it currently
reads Supabase's native `email_confirmed_at`, which this app no longer
treats as the source of truth (Task 11):

```typescript
  const checkEmailVerificationStatus = async (): Promise<boolean> => {
    const result = await withAsyncState(
      "Failed to check verification status",
      async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return false;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("email_verified_at")
          .eq("id", user.id)
          .maybeSingle();

        const verified = profile?.email_verified_at != null;
        isVerified.value = verified;
        return verified;
      },
    );

    return result ?? false;
  };
```

Also delete the now-unused `verifyEmailToken` function (its only caller was
the old `pages/verify-email.vue`, deleted in Task 9 — the new
`pages/verify-email/[token].vue` calls `$fetch` directly, not through this
composable) and remove it from the returned object.

- [ ] **Step 7: Update `EmailVerificationBanner.vue`'s call site and dead link**

In `components/Dashboard/EmailVerificationBanner.vue`, update `handleResend`
to match the new no-argument signature:

```typescript
async function handleResend() {
  sent.value = false;
  const success = await emailVerification.resendVerificationEmail();
  sent.value = success;
}
```

Remove the `userStore.user?.email` guard above it (no longer needed) and
delete the dead link (no token-less verification-status page exists
anymore — replace lines around `components/Dashboard/EmailVerificationBanner.vue:27`):

```html
      <NuxtLink to="/verify-email" class="font-semibold underline underline-offset-2">
        View verification status
      </NuxtLink>
```

with nothing (remove the line entirely; the resend button and the "Sent!"/
error feedback already next to it cover the banner's job).

- [ ] **Step 8: Update `useEmailVerification`'s existing tests and run them**

Find and update the existing tests for `resendVerificationEmail` (drop the
`email` argument, assert the call hits `/api/auth/verify-email/resend` with
no body) and `checkEmailVerificationStatus` (mock the `users` table select
instead of `email_confirmed_at`) in
`tests/unit/composables/useEmailVerification.spec.ts`. Remove any test for
`verifyEmailToken` (function deleted).

Run: `npm run test -- tests/unit/composables/useEmailVerification.spec.ts tests/unit/components/Dashboard/EmailVerificationBanner.spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add server/api/auth/verify-email/resend.post.ts tests/unit/server/api/auth/verify-email-resend.post.spec.ts composables/useEmailVerification.ts components/Dashboard/EmailVerificationBanner.vue tests/unit/composables/useEmailVerification.spec.ts tests/unit/components/Dashboard/EmailVerificationBanner.spec.ts
git rm --cached server/api/auth/resend-verification.post.ts 2>/dev/null || true
git commit -m "feat: session-authed resend-verification endpoint, retire native one"
```

---

## Task 9: `pages/verify-email/[token].vue`

**Files:**
- Create: `pages/verify-email/[token].vue`
- Delete: `pages/verify-email.vue`, `tests/unit/pages/verify-email.spec.ts` (superseded — old blocking, pre-signup-redirect page)
- Test: `tests/unit/pages/verify-email-token.spec.ts`

**Interfaces:**
- Consumes: `POST /api/auth/verify-email/:token` (Task 7), `POST /api/auth/verify-email/resend` (Task 8), `useSupabase().auth.getSession()` for the session-presence routing check.
- Produces: the page users land on from the verification email link and from Supabase's old bookmarked links (none expected post-launch, but the route shape intentionally mirrors the guardian-claim page's `pages/guardian/claim/[token].vue` for consistency).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import VerifyEmailToken from "~/pages/verify-email/[token].vue";

const mockNavigateTo = vi.fn();
const mockGetSession = vi.fn();

mockNuxtImport("navigateTo", () => mockNavigateTo);
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({ auth: { getSession: mockGetSession } }),
}));

describe("pages/verify-email/[token].vue", () => {
  beforeEach(() => {
    mockNavigateTo.mockClear();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
  });

  it("shows success and routes to dashboard when a session exists", async () => {
    vi.stubGlobal(
      "$fetch",
      vi.fn(async () => ({ status: "verified" })),
    );
    const wrapper = mount(VerifyEmailToken, {
      global: { mocks: { $route: { params: { token: "tok-1" } } } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("verified");
    expect(mockNavigateTo).toHaveBeenCalledWith("/dashboard");
    vi.unstubAllGlobals();
  });

  it("routes to login with a success banner when no session exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal(
      "$fetch",
      vi.fn(async () => ({ status: "verified" })),
    );
    const wrapper = mount(VerifyEmailToken, {
      global: { mocks: { $route: { params: { token: "tok-1" } } } },
    });
    await flushPromises();

    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
    );
  });

  it("shows an inline resend button on an expired token", async () => {
    vi.stubGlobal(
      "$fetch",
      vi.fn(async () => {
        throw { statusCode: 410 };
      }),
    );
    const wrapper = mount(VerifyEmailToken, {
      global: { mocks: { $route: { params: { token: "tok-1" } } } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("expired");
    expect(wrapper.find("button").exists()).toBe(true);
    vi.unstubAllGlobals();
  });
});
```

Match the mounting/mocking conventions (`mockNuxtImport`, `flushPromises`) to whatever `tests/unit/pages/guardian-claim-token.spec.ts` already uses — copy its setup boilerplate rather than reinventing it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/pages/verify-email-token.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the page**

```vue
<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-emerald-600 px-6 py-12"
  >
    <div
      class="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xs"
    >
      <div v-if="state === 'checking'">
        <UIcon
          name="i-heroicons-arrow-path"
          class="mx-auto h-8 w-8 animate-spin text-brand-blue-600"
        />
        <p class="mt-4 text-slate-600">Verifying your email…</p>
      </div>

      <div v-else-if="state === 'verified'">
        <UIcon
          name="i-heroicons-check-circle"
          class="mx-auto h-10 w-10 text-emerald-600"
        />
        <h1 class="mt-4 text-lg font-semibold text-slate-900">
          Email verified
        </h1>
        <p class="mt-2 text-sm text-slate-600">Taking you onward…</p>
      </div>

      <div v-else-if="state === 'expired'">
        <UIcon
          name="i-heroicons-clock"
          class="mx-auto h-10 w-10 text-amber-500"
        />
        <h1 class="mt-4 text-lg font-semibold text-slate-900">
          This link has expired
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Verification links last 24 hours. Request a new one below.
        </p>
        <button
          type="button"
          class="mt-6 rounded-lg bg-brand-blue-600 px-4 py-2 font-medium text-white hover:bg-brand-blue-700 disabled:opacity-50"
          :disabled="resending"
          @click="resend"
        >
          {{ resending ? "Sending…" : "Resend verification email" }}
        </button>
        <p v-if="resent" class="mt-3 text-sm text-emerald-700">
          New verification email sent — check your inbox.
        </p>
      </div>

      <div v-else>
        <UIcon
          name="i-heroicons-x-circle"
          class="mx-auto h-10 w-10 text-red-500"
        />
        <h1 class="mt-4 text-lg font-semibold text-slate-900">
          Verification link is invalid
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Please log in and request a new one from your dashboard.
        </p>
        <NuxtLink
          to="/login"
          class="mt-6 inline-block rounded-lg bg-brand-blue-600 px-4 py-2 font-medium text-white hover:bg-brand-blue-700"
        >
          Go to login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, navigateTo } from "#app";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";

definePageMeta({ layout: false });

const logger = createClientLogger("pages/verify-email/[token]");
const route = useRoute();
const token = route.params.token as string;

const state = ref<"checking" | "verified" | "expired" | "invalid">(
  "checking",
);
const resending = ref(false);
const resent = ref(false);

async function routeOnward() {
  const supabase = useSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    await navigateTo("/dashboard");
  } else {
    await navigateTo(
      `/login?verified=1&email=${encodeURIComponent(session?.user?.email ?? "")}`,
    );
  }
}

async function resend() {
  resending.value = true;
  resent.value = false;
  try {
    await $fetch("/api/auth/verify-email/resend", { method: "POST" });
    resent.value = true;
  } catch (err) {
    logger.error("Resend failed", err);
  } finally {
    resending.value = false;
  }
}

onMounted(async () => {
  try {
    await $fetch(`/api/auth/verify-email/${encodeURIComponent(token)}`, {
      method: "POST",
    });
    state.value = "verified";
    await routeOnward();
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    state.value = statusCode === 410 ? "expired" : "invalid";
  }
});
</script>
```

- [ ] **Step 4: Delete the superseded page and test**

```bash
git rm pages/verify-email.vue tests/unit/pages/verify-email.spec.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/unit/pages/verify-email-token.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add pages/verify-email tests/unit/pages/verify-email-token.spec.ts
git commit -m "feat: session-aware verify-email page, retire old blocking page"
```

---

## Task 10: `pages/signup.vue` — remove the no-session branch

**Files:**
- Modify: `pages/signup.vue` (the `if (!authData.data.session) { ... }` block, ~lines 537-550, and its comment)
- Test: `tests/unit/pages/signup.spec.ts` (find and update/remove the test asserting a redirect to `/verify-email` on missing session)

**Interfaces:**
- Consumes: `signup()` from `composables/useAuth.ts` (Task 6) — now always returns a session on success.

- [ ] **Step 1: Find and update the existing test asserting the old redirect**

```bash
grep -n "verify-email" tests/unit/pages/signup.spec.ts
```

Update or remove that test case so it no longer asserts a `/verify-email?...` redirect on signup success — a successful `signup()` call now always has `authData.data.session` populated, so this branch is unreachable and its test scenario no longer applies.

- [ ] **Step 2: Run the test to confirm it now fails (still asserting old behavior)**

Run: `npm run test -- tests/unit/pages/signup.spec.ts`
Expected: FAIL on the branch you haven't removed yet, or PASS-but-now-meaningless if the test was already deleted — either way, proceed to Step 3.

- [ ] **Step 3: Remove the branch**

Delete this block from `pages/signup.vue` (currently ~lines 537-550):

```typescript
      // Prod requires email confirmation, so Supabase withholds the session
      // until the link is clicked. handle_new_user() already created the
      // public.users row server-side (SECURITY DEFINER trigger); everything
      // below this point needs an authenticated session for RLS, so there's
      // nothing left to do client-side. Hand off to verify-email instead of
      // failing — family creation happens on first login (pages/login.vue).
      if (!authData.data.session) {
        loading.value = false;
        const params = new URLSearchParams({ email: validated.email });
        if (onboardingStep1) {
          params.set("sport", onboardingStep1.primarySport);
          params.set("gradYear", String(onboardingStep1.graduationYear));
        }
        await navigateTo(`/verify-email?${params.toString()}`);
        return;
      }
```

- [ ] **Step 4: Run the full signup test file**

Run: `npm run test -- tests/unit/pages/signup.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/signup.vue tests/unit/pages/signup.spec.ts
git commit -m "fix: remove now-unreachable no-session branch from signup"
```

---

## Task 11: `stores/user.ts` + `types/models.ts` — read `email_verified_at` as source of truth

**Files:**
- Modify: `types/models.ts:45-61` (`User` interface)
- Modify: `stores/user.ts:49-51` (`initializeUser`), `stores/user.ts:205-225` (`refreshVerificationStatus`)
- Test: `tests/unit/stores/user.spec.ts` (the existing verification-related tests, ~line 680-725)

**Interfaces:**
- Consumes: `public.users.email_verified_at` (Task 1).
- Produces: `userStore.isEmailVerified` / `userStore.emailVerified` now reflect the app's own column, not Supabase's `email_confirmed_at`. `components/Dashboard/EmailVerificationBanner.vue` needs no change — it only reads `userStore.emailVerified`.

- [ ] **Step 1: Add the field to the `User` type**

In `types/models.ts`, inside the `User` interface (after `date_of_birth`, ~line 51):

```typescript
  email_verified_at?: string | null;
```

- [ ] **Step 2: Update the existing failing tests first**

In `tests/unit/stores/user.spec.ts`, find the tests around `refreshVerificationStatus` (~line 680-725) and the `initializeUser` verification assertions. Update their mocks to set `profile.email_verified_at` (on the `users` table select mock) instead of `session.user.email_confirmed_at` / `authUser.email_confirmed_at`, e.g.:

```typescript
it("should handle unverified email in refreshVerificationStatus", async () => {
  mockSupabase.from.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { id: "u1", email_verified_at: null } }),
      }),
    }),
  });

  const store = useUserStore();
  await store.refreshVerificationStatus();

  expect(store.isEmailVerified).toBe(false);
});
```

Apply the equivalent change to the other two tests in that block (verified case → non-null `email_verified_at`; error case unchanged).

- [ ] **Step 3: Run tests to verify they fail against current implementation**

Run: `npm run test -- tests/unit/stores/user.spec.ts -t "refreshVerificationStatus"`
Expected: FAIL — implementation still reads `email_confirmed_at`

- [ ] **Step 4: Update `initializeUser`**

Replace `stores/user.ts:49-51`:

```typescript
        isEmailVerified.value =
          session.user.email_confirmed_at !== null &&
          session.user.email_confirmed_at !== undefined;
```

with:

```typescript
        // Set from the profile fetch below, not Supabase's own confirmation
        // state — email_verified_at is this app's own record, decoupled
        // from Supabase's native (now-disabled) confirm-email gate.
```

and after the `if (profile) { user.value = profile; ... }` assignment a few lines down, add:

```typescript
          isEmailVerified.value = profile.email_verified_at != null;
```

- [ ] **Step 5: Update `refreshVerificationStatus`**

Replace the body of `stores/user.ts:205-225` with:

```typescript
  async function refreshVerificationStatus() {
    const supabase = useSupabase();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("email_verified_at")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        logger.error("Error fetching verification status:", error);
        return;
      }

      isEmailVerified.value = profile?.email_verified_at != null;
    } catch (err) {
      logger.error("Error refreshing verification status:", err);
    }
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- tests/unit/stores/user.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add types/models.ts stores/user.ts tests/unit/stores/user.spec.ts
git commit -m "refactor: userStore reads email_verified_at instead of Supabase confirmation"
```

---

## Task 12: Stamp verification on invite-accept

**Files:**
- Modify: `server/api/family/invite/[token]/accept.post.ts` (after the member-insert/idempotent-check block, ~line 95)
- Modify: `server/api/guardian/claim/[token]/accept.post.ts` (equivalent acceptance point — find via `grep -n "family_members\|status.*accepted" server/api/guardian/claim/[token]/accept.post.ts`)
- Test: `tests/unit/server/api/family/invite/accept.post.spec.ts`, `tests/unit/server/api/guardian/claim-accept.post.spec.ts`

**Interfaces:**
- Consumes: `useSupabaseAdmin()` (existing, already in scope in both files).
- Produces: accepting user's `users.email_verified_at` set to `now()` — this user never sees the verify-email flow (spec §5).

- [ ] **Step 1: Add a failing assertion to the existing family-invite accept test**

In `tests/unit/server/api/family/invite/accept.post.spec.ts`, extend the "successfully accepts a pending invite" test (or add a new one) to assert the `users` update call includes `email_verified_at`:

```typescript
it("stamps the accepting user's email as verified", async () => {
  // ...existing setup for a valid pending invitation...
  await handler(event);

  expect(mockUsersUpdateCalls).toContainEqual(
    expect.objectContaining({ email_verified_at: expect.any(String) }),
  );
});
```

Match this to however that test file's existing mocks track `.update()` calls on the `users` table (follow the pattern already used for the `guardian_consent_at` update a few lines below in the same handler).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/api/family/invite/accept.post.spec.ts -t "stamps the accepting user"`
Expected: FAIL

- [ ] **Step 3: Add the stamp in `family/invite/[token]/accept.post.ts`**

After the existing member-insert block (the `if (!existing) { ... }` insert into `family_members`, ~server/api/family/invite/[token]/accept.post.ts:95), add:

```typescript
    // The invite link was emailed to invitation.invited_email and the
    // caller only reaches here after the emailMismatch check above passed —
    // clicking it already proves ownership of this address.
    const { error: verifyStampError } = await supabase
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("email_verified_at", null);

    if (verifyStampError) {
      logger.error("Failed to stamp email as verified", verifyStampError);
    }
```

- [ ] **Step 4: Add the equivalent stamp in `guardian/claim/[token]/accept.post.ts`**

Find the point in that file where the claim is accepted (after the guardian's identity/link to the family is established) and add the same block, adjusted to that file's local variable names for `supabase` and the accepting user.

- [ ] **Step 5: Run both tests to verify they pass**

Run: `npm run test -- tests/unit/server/api/family/invite/accept.post.spec.ts tests/unit/server/api/guardian/claim-accept.post.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/api/family/invite/[token]/accept.post.ts server/api/guardian/claim/[token]/accept.post.ts tests/unit/server/api/family/invite/accept.post.spec.ts tests/unit/server/api/guardian/claim-accept.post.spec.ts
git commit -m "feat: stamp email_verified_at on invite/claim acceptance"
```

---

## Task 13: Retire stale docs

**Files:**
- Modify: `docs/history/auth.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Find and correct the stale line**

```bash
grep -n "must verify email" docs/history/auth.md
```

Replace the flat "Players must verify email before accessing app features" statement with a short accurate summary: new signups (parent and player) reach the dashboard immediately on an auto-confirmed account; `users.email_verified_at` tracks verification as a background task via `/verify-email/[token]`, not a login gate; invite/guardian-claim acceptances are stamped verified automatically. Reference `docs/superpowers/specs/2026-09-14-decoupled-email-verification-design.md` for detail.

- [ ] **Step 2: Commit**

```bash
git add docs/history/auth.md
git commit -m "docs: correct stale email-verification description"
```

---

## Post-plan manual step (not part of this diff)

Once this plan is merged and deployed to QA/prod: disable `enable_confirmations` in both Supabase Studio projects (spec §7). Until that toggle is off, existing prod/QA signups will still hit Supabase's native confirmation gate ahead of ever reaching the new server-side signup endpoint's auto-confirm behavior — the toggle-off is what actually retires the old block.

Also confirm Supabase's native CAPTCHA / Attack-Protection is OFF for auth endpoints in both QA and prod (Studio dashboard, same category of toggle as `enable_confirmations` — not visible in `supabase/config.toml`, which has `[auth.captcha]` commented out/disabled locally). Found during Task 6's review: the new `signup()`'s post-creation `signInWithPassword` call forwards `captchaToken` the same way `login()` already does (matches existing precedent — see `login-turnstile-captcha-gap.md`, PR #700, for why that forwarding exists at all), but that token was already consumed by this endpoint's own `verifyTurnstile` check (Task 5) moments earlier — Cloudflare Turnstile tokens are single-use. If Supabase's native captcha is on for prod's sign-in endpoint, the forwarded (reused) token will likely be rejected, breaking the post-signup sign-in step even though the account was created successfully. This app's own server-side `verifyTurnstile` is the authoritative bot check now; Supabase's native gate is redundant with it, same rationale as decoupling from `enable_confirmations`. If turning the native toggle off doesn't fully resolve this in practice, it needs a dedicated follow-up (e.g. a second Turnstile execute() before sign-in) — not something this plan guesses at.

Also regenerate Supabase TypeScript types (`npm run <whatever this repo's generate-types script is>` against the real DB once Task 1/2's migrations are applied) — `types/database.ts` doesn't yet know about `users.email_verified_at` or `email_verification_tokens`, which is why `npm run type-check` shows a few errors in code that references them (found during Task 8; no live Supabase project was linked in the sandbox this plan was implemented in, so types couldn't be regenerated as part of the plan itself).
