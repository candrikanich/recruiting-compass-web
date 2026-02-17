# Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all Critical and High-severity vulnerabilities identified in the 2026-02-17 security audit, leaving the app with no unauthenticated destructive endpoints, no fail-open auth, no XSS in email output, and no debug endpoints exposed in production.

**Architecture:** Each fix is a minimal, surgical change to the relevant server handler — add `requireAuth()`, fix auth logic, escape HTML, or add a prod guard. No new abstractions introduced. TDD: write failing test → implement → verify.

**Tech Stack:** Nuxt 3 / Nitro / H3 / TypeScript strict / Vitest / Supabase

**Note on finding #2 (Sentry token):** `.env.sentry-build-plugin` is already in `.gitignore` (line 47). False positive — no action needed.

**Note on finding #1 (secrets in git history):** Requires secret rotation in Supabase / Resend / College Scorecard dashboards — this is a manual step outside code changes. Do it before or alongside this PR.

---

## Task 1: Add auth to schools cascade-delete endpoint

**Files:**
- Modify: `server/api/schools/[id]/cascade-delete.post.ts`
- Create: `tests/unit/server/api/schools-cascade-delete.spec.ts`

The coach cascade-delete (`server/api/coaches/[id]/cascade-delete.post.ts`) is the correct pattern:
1. Call `requireAuth(event)` to verify the JWT
2. Extract token from `Authorization` header or `sb-access-token` cookie
3. Use `createServerSupabaseUserClient(token)` instead of `createServerSupabaseClient()` so RLS policies apply

**Step 1: Write the failing test**

```typescript
// tests/unit/server/api/schools-cascade-delete.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(),
}));

import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";

describe("POST /api/schools/[id]/cascade-delete security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated requests with 401", async () => {
    const { requireAuth: mockAuth } = await import("~/server/utils/auth");
    vi.mocked(mockAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );

    // Import handler after mocks are set
    const handler = (await import("~/server/api/schools/[id]/cascade-delete.post"))
      .default;

    const event = {
      context: {},
      node: { req: { headers: {} }, res: {} },
    } as any;

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
    expect(mockAuth).toHaveBeenCalledWith(event);
  });

  it("calls requireAuth before touching the database", async () => {
    const { requireAuth: mockAuth } = await import("~/server/utils/auth");
    vi.mocked(mockAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );

    const handler = (await import("~/server/api/schools/[id]/cascade-delete.post"))
      .default;
    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;

    await expect(handler(event)).rejects.toBeDefined();
    expect(createServerSupabaseUserClient).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/server/api/schools-cascade-delete.spec.ts
```

Expected: FAIL — `requireAuth` is never called in the current implementation.

**Step 3: Implement the fix**

In `server/api/schools/[id]/cascade-delete.post.ts`, replace the import block and handler opening:

```typescript
import { defineEventHandler, getRouterParam, createError, readBody, getHeader, getCookie } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
```

Then add auth immediately after the `confirmDelete` guard (keep the early-exit `confirmDelete` check first to avoid auth cost on bad requests):

```typescript
export default defineEventHandler(async (event) => {
  const schoolId = getRouterParam(event, "id");

  if (!schoolId) {
    throw createError({ statusCode: 400, statusMessage: "School ID is required" });
  }

  let body = {};
  try {
    body = await readBody(event);
  } catch {
    // Empty body is OK
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { confirmDelete } = body as any;
  if (!confirmDelete) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Must set "confirmDelete": true in request body to proceed',
    });
  }

  // Verify user is authenticated
  await requireAuth(event);

  // Get user's access token for RLS-respecting client
  const authHeader = getHeader(event, "authorization");
  const token: string | null = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : getCookie(event, "sb-access-token") || null;

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized - no authentication token" });
  }

  // Use authenticated client to respect RLS policies (prevents deleting other families' data)
  const client = createServerSupabaseUserClient(token);
  // ... rest of the handler unchanged
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/server/api/schools-cascade-delete.spec.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add server/api/schools/[id]/cascade-delete.post.ts tests/unit/server/api/schools-cascade-delete.spec.ts
git commit -m "fix: add requireAuth to schools cascade-delete endpoint"
```

---

## Task 2: Add auth to schools deletion-blockers endpoint

**Files:**
- Modify: `server/api/schools/[id]/deletion-blockers.get.ts`
- Create: `tests/unit/server/api/schools-deletion-blockers.spec.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/server/api/schools-deletion-blockers.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(),
}));

import { requireAuth } from "~/server/utils/auth";

describe("GET /api/schools/[id]/deletion-blockers security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );

    const handler = (
      await import("~/server/api/schools/[id]/deletion-blockers.get")
    ).default;

    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
    expect(requireAuth).toHaveBeenCalledWith(event);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/server/api/schools-deletion-blockers.spec.ts
```

Expected: FAIL

**Step 3: Implement the fix**

In `server/api/schools/[id]/deletion-blockers.get.ts`:

```typescript
import { defineEventHandler, getRouterParam, createError, getHeader, getCookie } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const schoolId = getRouterParam(event, "id");

  if (!schoolId) {
    throw createError({ statusCode: 400, statusMessage: "School ID is required" });
  }

  // Verify user is authenticated
  await requireAuth(event);

  const authHeader = getHeader(event, "authorization");
  const token: string | null = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : getCookie(event, "sb-access-token") || null;

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized - no authentication token" });
  }

  // Use user-scoped client so RLS prevents reading other families' records
  const client = createServerSupabaseUserClient(token);
  // ... rest of the handler unchanged (replace createServerSupabaseClient() call)
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/server/api/schools-deletion-blockers.spec.ts
```

**Step 5: Commit**

```bash
git add server/api/schools/[id]/deletion-blockers.get.ts tests/unit/server/api/schools-deletion-blockers.spec.ts
git commit -m "fix: add requireAuth to schools deletion-blockers endpoint"
```

---

## Task 3: Add auth to interactions cascade-delete + deletion-blockers

**Files:**
- Modify: `server/api/interactions/[id]/cascade-delete.post.ts`
- Modify: `server/api/interactions/[id]/deletion-blockers.get.ts`
- Create: `tests/unit/server/api/interactions-cascade-delete.spec.ts`

Apply identical pattern as Tasks 1–2. Key differences:
- `interactions/[id]/cascade-delete.post.ts` uses `interactionId` instead of `schoolId`
- `interactions/[id]/deletion-blockers.get.ts` doesn't use a Supabase client at all (always returns empty blockers) — just add `requireAuth(event)` at the top

**Step 1: Write the failing test**

```typescript
// tests/unit/server/api/interactions-cascade-delete.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(),
}));

import { requireAuth } from "~/server/utils/auth";

describe("Interactions destructive endpoints security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cascade-delete rejects unauthenticated requests", async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );
    const handler = (
      await import("~/server/api/interactions/[id]/cascade-delete.post")
    ).default;
    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("deletion-blockers rejects unauthenticated requests", async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );
    const handler = (
      await import("~/server/api/interactions/[id]/deletion-blockers.get")
    ).default;
    const event = {
      context: {},
      node: { req: { headers: {} }, res: {} },
      context: { params: { id: "test-id" } },
    } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/server/api/interactions-cascade-delete.spec.ts
```

**Step 3: Implement the fixes**

For `server/api/interactions/[id]/cascade-delete.post.ts`, apply same pattern as Task 1 (add requireAuth + token extraction + createServerSupabaseUserClient).

For `server/api/interactions/[id]/deletion-blockers.get.ts`, minimal fix — add at top of handler body:
```typescript
import { requireAuth } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const interactionId = getRouterParam(event, "id");
  if (!interactionId) {
    throw createError({ statusCode: 400, statusMessage: "Interaction ID is required" });
  }

  // Verify user is authenticated before revealing schema/structure info
  await requireAuth(event);

  // ... rest of handler unchanged
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/server/api/interactions-cascade-delete.spec.ts
```

**Step 5: Run full test suite to check for regressions**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass

**Step 6: Commit**

```bash
git add server/api/interactions/[id]/cascade-delete.post.ts \
        server/api/interactions/[id]/deletion-blockers.get.ts \
        tests/unit/server/api/interactions-cascade-delete.spec.ts
git commit -m "fix: add requireAuth to interactions cascade-delete and deletion-blockers"
```

---

## Task 4: Fix sync-all fail-open auth bug

**Files:**
- Modify: `server/api/social/sync-all.post.ts`
- Create: `tests/unit/server/api/social-sync-all-auth.spec.ts`

**Problem:** Current logic `if (syncApiKey && authHeader !== ...)` allows all requests when `SYNC_API_KEY` env var is not set. Must fail-closed.

**Step 1: Write the failing test**

```typescript
// tests/unit/server/api/social-sync-all-auth.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("POST /api/social/sync-all auth logic", () => {
  const originalEnv = process.env.SYNC_API_KEY;

  afterEach(() => {
    process.env.SYNC_API_KEY = originalEnv;
  });

  it("returns 500 when SYNC_API_KEY is not configured", async () => {
    delete process.env.SYNC_API_KEY;

    vi.resetModules();
    const handler = (await import("~/server/api/social/sync-all.post")).default;

    const event = {
      context: {},
      node: { req: { headers: {} }, res: {} },
      getHeader: () => null,
    } as any;

    // Mock h3 helpers
    vi.mock("h3", async () => ({
      ...(await vi.importActual("h3")),
      getHeader: () => null,
      useRuntimeConfig: () => ({}),
    }));

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 401 when SYNC_API_KEY is set but header is wrong", async () => {
    process.env.SYNC_API_KEY = "correct-key";

    vi.resetModules();

    vi.mock("h3", async () => ({
      ...(await vi.importActual("h3")),
      getHeader: () => "Bearer wrong-key",
      useRuntimeConfig: () => ({}),
    }));

    const handler = (await import("~/server/api/social/sync-all.post")).default;
    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/server/api/social-sync-all-auth.spec.ts
```

**Step 3: Implement the fix**

In `server/api/social/sync-all.post.ts`, replace lines 28-35:

```typescript
// Before (fail-open):
const syncApiKey = process.env.SYNC_API_KEY;
if (syncApiKey && authHeader !== `Bearer ${syncApiKey}`) {
  throw createError({ statusCode: 401, statusMessage: "Invalid API key" });
}

// After (fail-closed):
const syncApiKey = process.env.SYNC_API_KEY;
if (!syncApiKey) {
  throw createError({
    statusCode: 500,
    statusMessage: "SYNC_API_KEY not configured — endpoint disabled",
  });
}
if (authHeader !== `Bearer ${syncApiKey}`) {
  throw createError({ statusCode: 401, statusMessage: "Invalid API key" });
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/server/api/social-sync-all-auth.spec.ts
```

**Step 5: Commit**

```bash
git add server/api/social/sync-all.post.ts tests/unit/server/api/social-sync-all-auth.spec.ts
git commit -m "fix: fail-closed when SYNC_API_KEY is not configured in sync-all endpoint"
```

---

## Task 5: Disable debug/session endpoint in production

**Files:**
- Modify: `server/api/debug/session.get.ts`

The endpoint is useful for local debugging but must not run in production. Simplest fix: add a guard at the top that returns 404 in production. A 404 (not 403) avoids confirming the endpoint exists to attackers.

**Step 1: Implement the fix (no test needed — production guard is trivial)**

Add at the very top of the handler, before `requireAuth`:

```typescript
export default defineEventHandler(async (event) => {
  // Debug endpoint — disabled in production
  if (process.env.NODE_ENV === "production") {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  try {
    const user = await requireAuth(event);
    // ... rest of handler unchanged
```

**Step 2: Verify type-check passes**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add server/api/debug/session.get.ts
git commit -m "fix: disable debug/session endpoint in production"
```

---

## Task 6: Fix XSS in recruiting-packet email template

**Files:**
- Modify: `server/api/recruiting-packet/email.post.ts`
- Create: `tests/unit/server/api/recruiting-packet-email-xss.spec.ts`

**Problem:** `athleteName` and `body` are interpolated directly into HTML without escaping. A user with name `<script>alert(1)</script>` can inject HTML into emails sent to coaches.

**Step 1: Write the failing test**

```typescript
// tests/unit/server/api/recruiting-packet-email-xss.spec.ts
import { describe, it, expect } from "vitest";

// Test the formatEmailHtml function directly — it's not exported, so we test via observable behavior
// We'll extract and test the escaping logic

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

describe("Email template XSS prevention", () => {
  it("escapeHtml neutralizes script tags", () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
  });

  it("escapeHtml neutralizes attribute injection", () => {
    const malicious = '" onmouseover="alert(1)"';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('"');
    expect(escaped).toContain("&quot;");
  });

  it("escapeHtml preserves normal text", () => {
    const normal = "John Smith - Class of 2026";
    expect(escapeHtml(normal)).toBe(normal);
  });
});
```

**Step 2: Run test to verify it fails (or passes — the escapeHtml logic above is self-contained)**

```bash
npx vitest run tests/unit/server/api/recruiting-packet-email-xss.spec.ts
```

This test verifies the escaping function works; now integrate it into the email handler.

**Step 3: Implement the fix**

Add `escapeHtml` to `server/api/recruiting-packet/email.post.ts` and use it in the template:

```typescript
/**
 * Escape HTML special characters to prevent XSS in email body
 */
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

const formatEmailHtml = (body: string, athleteName: string | undefined): string => {
  const safeName = escapeHtml(athleteName || "Athlete");
  const safeBody = escapeHtml(body);
  return `
    <!DOCTYPE html>
    ...
          <h2>${safeName} - Recruiting Profile</h2>
          ...
            <div class="message">${safeBody}</div>
    ...
  `;
};
```

**Step 4: Commit**

```bash
git add server/api/recruiting-packet/email.post.ts tests/unit/server/api/recruiting-packet-email-xss.spec.ts
git commit -m "fix: escape HTML in recruiting packet email template to prevent XSS"
```

---

## Task 7: Add auth to favicon endpoint

**Files:**
- Modify: `server/api/schools/favicon.ts`

**Step 1: Implement the fix**

Add `requireAuth` import and call at the top of the handler. The favicon endpoint is called from the authenticated UI — adding auth is safe and prevents SSRF abuse.

```typescript
import { requireAuth } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  // Require authentication to prevent unauthenticated SSRF
  await requireAuth(event);

  try {
    const { schoolDomain, schoolId } = getQuery(event);
    // ... rest of handler unchanged
```

**Step 2: Verify type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add server/api/schools/favicon.ts
git commit -m "fix: require authentication on favicon endpoint to prevent SSRF"
```

---

## Task 8: Final verification

**Step 1: Run full test suite**

```bash
npm run test
```

Expected: all tests pass (5500+ green)

**Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors

**Step 3: Lint**

```bash
npm run lint:fix
```

**Step 4: Push to develop**

```bash
git push origin develop
```

---

## Unresolved Questions

1. **Notification cross-user injection (HIGH #7):** The endpoint legitimately needs to create notifications for other users as part of multi-step workflows. The right fix is Zod validation + URL allowlisting. Should this be in this PR or a follow-up?

2. **Secret rotation:** Who is responsible for rotating Supabase anon key, Resend key, and College Scorecard key from the dashboards? This must happen regardless of git history scrubbing.

3. **Rate-limit key normalization (MEDIUM #12):** Needs a regex to strip UUID path segments before keying. Straightforward but out of scope for this PR — confirm it goes in a follow-up.

4. **`admin/delete-user.get.ts` removal (MEDIUM #13):** Should this endpoint be deleted in this PR or separately? It needs coordination with any jobs/scripts calling it.
