# Logging Adoption Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete adoption of structured logging (useLogger/createLogger) across all 39 API routes, integrate correlation ID propagation into useAuthFetch, and add missing logger test coverage.

**Architecture:** API routes replace all `console.log/error/warn/debug` calls with `useLogger(event, "context")` so every log includes correlation ID and request context. Client-to-server correlation flows through `useAuthFetch`, which injects the stored `X-Request-ID` from the correlation plugin's `sessionStorage`.

**Tech Stack:** `server/utils/logger.ts` (`useLogger`, `createLogger`), `composables/useAuthFetch.ts`, Vitest

---

## Reference Pattern

Every API route handler should follow this structure:

```typescript
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "module-name");
  try {
    // ... handler logic
    logger.info("Operation description");
    return result;
  } catch (err) {
    logger.error("Operation failed", err);
    if (err instanceof Error && "statusCode" in err) throw err;
    throw createError({ statusCode: 500, statusMessage: "User-friendly message" });
  }
});
```

Import line: `import { useLogger } from "~/server/utils/logger";`

For routes that already have a module-level `createLogger` (e.g., `admin/health.get.ts`), keep that pattern since it's for background/non-request context.

**DO NOT** expose raw error messages to clients (e.g., `error.message` in `statusMessage`). Use generic messages like "Failed to fetch tasks", "Internal server error".

---

## Task 1: Integrate Correlation ID into useAuthFetch

**Files:**
- Modify: `composables/useAuthFetch.ts`
- Test: `tests/unit/composables/useAuthFetch.spec.ts`

This makes every authenticated API call propagate the client session's correlation ID to the server, completing the end-to-end tracing chain without requiring all composables to change.

**Step 1: Read the existing test file to understand test patterns**

```bash
cat tests/unit/composables/useAuthFetch.spec.ts
```

**Step 2: Write the failing test for correlation ID injection**

In `tests/unit/composables/useAuthFetch.spec.ts`, add a test verifying `X-Request-ID` header is included:

```typescript
it("should include X-Request-ID header from sessionStorage", async () => {
  // Set up correlation ID in sessionStorage
  Object.defineProperty(window, "sessionStorage", {
    value: { getItem: vi.fn().mockReturnValue("test-correlation-id-123") },
    writable: true,
  });

  // ... mock supabase session, call $fetchAuth
  // expect headers to contain "x-request-id": "test-correlation-id-123"
});
```

**Step 3: Run test to verify it fails**

```bash
npm run test -- tests/unit/composables/useAuthFetch.spec.ts
```

**Step 4: Modify `composables/useAuthFetch.ts`**

Add correlation ID injection into `$fetchAuth`. After building auth headers (line ~56), add:

```typescript
// Add correlation ID for request tracing
if (typeof window !== "undefined") {
  const correlationId = sessionStorage.getItem("correlation-id");
  if (correlationId) {
    headers["x-request-id"] = correlationId;
  }
}
```

This reads from the same `sessionStorage` key used by `plugins/correlation.client.ts` (`"correlation-id"`), so correlation IDs are consistent without needing to depend on the plugin's provide.

**Step 5: Run tests to verify they pass**

```bash
npm run test -- tests/unit/composables/useAuthFetch.spec.ts
npm run type-check
```

**Step 6: Commit**

```bash
git add composables/useAuthFetch.ts tests/unit/composables/useAuthFetch.spec.ts
git commit -m "feat: propagate correlation ID from client through useAuthFetch"
```

---

## Task 2: Migrate API Routes — Admin + Athlete + Auth (14 files)

**Files to modify:**
- `server/api/admin/users.get.ts`
- `server/api/athlete-tasks/[taskId].patch.ts`
- `server/api/athlete-tasks/index.get.ts`
- `server/api/athlete/fit-scores/recalculate-all.post.ts`
- `server/api/athlete/phase.get.ts`
- `server/api/athlete/phase/advance.post.ts`
- `server/api/athlete/portfolio-health.get.ts`
- `server/api/athlete/status.get.ts`
- `server/api/athlete/status/recalculate.post.ts`
- `server/api/auth/confirm-password-reset.post.ts`
- `server/api/auth/request-password-reset.post.ts`
- `server/api/auth/resend-verification.post.ts`
- `server/api/auth/verify-email.post.ts`
- `server/api/cron/daily-suggestions.post.ts`

**Step 1: For each file, apply the migration pattern**

For each file:
1. Add import: `import { useLogger } from "~/server/utils/logger";`
2. Remove any `import ... from "~/server/utils/logger"` that only imports `createLogger` (replace with `useLogger`)
3. Inside `defineEventHandler(async (event) => {`, add as first line: `const logger = useLogger(event, "<domain/route-name>");`
4. Replace every `console.error(...)` with `logger.error(...)`
5. Replace every `console.log(...)` with `logger.info(...)` or `logger.debug(...)` depending on content
6. Replace every `console.warn(...)` with `logger.warn(...)`
7. For existing `createLogger` at module level that was used for logging errors: remove it and use `useLogger(event)` in the handler instead
8. Do NOT expose raw error messages: replace `statusMessage: \`Failed to fetch tasks: ${error.message}\`` with `statusMessage: "Failed to fetch tasks"`

**Context names to use (match the API route path):**
- `admin/users`, `athlete-tasks`, `athlete/fit-scores`, `athlete/phase`, `athlete/phase/advance`, `athlete/portfolio-health`, `athlete/status`, `athlete/status/recalculate`, `auth/confirm-password-reset`, `auth/request-password-reset`, `auth/resend-verification`, `auth/verify-email`, `cron/daily-suggestions`

**Step 2: Type-check after all files are modified**

```bash
npm run type-check
```

**Step 3: Run the full test suite**

```bash
npm run test
```

**Step 4: Commit**

```bash
git add server/api/admin/users.get.ts server/api/athlete-tasks/ server/api/athlete/ server/api/auth/ server/api/cron/
git commit -m "refactor: migrate admin/athlete/auth API routes to structured logging"
```

---

## Task 3: Migrate API Routes — Coaches + Family + Interactions + Notifications (9 files)

**Files to modify:**
- `server/api/coaches/[id]/cascade-delete.post.ts`
- `server/api/family/accessible.get.ts`
- `server/api/family/code/join.post.ts`
- `server/api/family/code/regenerate.post.ts`
- `server/api/family/create.post.ts`
- `server/api/family/members.get.ts`
- `server/api/family/members/[memberId].delete.ts`
- `server/api/interactions/[id]/cascade-delete.post.ts`
- `server/api/notifications/create.post.ts`
- `server/api/notifications/generate.post.ts`

**Step 1: Apply migration pattern (same as Task 2)**

Note for `family/accessible.get.ts`: this file has many `console.log` calls for debugging that should become `logger.debug(...)` calls (they log user IDs and intermediate state, which is debug-level noise).

**Context names:** `coaches/cascade-delete`, `family/accessible`, `family/code/join`, `family/code/regenerate`, `family/create`, `family/members`, `family/members/delete`, `interactions/cascade-delete`, `notifications/create`, `notifications/generate`

**Step 2: Type-check and test**

```bash
npm run type-check
npm run test
```

**Step 3: Commit**

```bash
git add server/api/coaches/ server/api/family/ server/api/interactions/ server/api/notifications/
git commit -m "refactor: migrate coaches/family/notifications API routes to structured logging"
```

---

## Task 4: Migrate API Routes — Recruiting Packet + Schools + Suggestions + Tasks + User Preferences (16 files)

**Files to modify:**
- `server/api/recruiting-packet/email.post.ts`
- `server/api/schools/[id]/cascade-delete.post.ts`
- `server/api/schools/[id]/fit-score.get.ts`
- `server/api/schools/[id]/fit-score.post.ts`
- `server/api/schools/favicon.ts`
- `server/api/suggestions/surface.post.ts`
- `server/api/tasks/[taskId]/dependencies.get.ts`
- `server/api/tasks/index.get.ts`
- `server/api/tasks/with-status.get.ts`
- `server/api/user/preferences/[category].delete.ts`
- `server/api/user/preferences/[category].get.ts`
- `server/api/user/preferences/[category].post.ts`
- `server/api/user/preferences/[category]/history.get.ts`
- `server/api/user/preferences/history.post.ts`
- `server/api/user/preferences/player-details.patch.ts`

**Step 1: Apply migration pattern (same as Tasks 2 and 3)**

Note for `tasks/index.get.ts`: also fix the security issue of exposing `error.message` in `statusMessage`.
```typescript
// BEFORE (bad - exposes DB internals)
statusMessage: `Failed to fetch tasks: ${error.message}`
// AFTER
statusMessage: "Failed to fetch tasks"
```

**Context names:** `recruiting-packet/email`, `schools/cascade-delete`, `schools/fit-score`, `schools/favicon`, `suggestions/surface`, `tasks/dependencies`, `tasks`, `tasks/with-status`, `user/preferences`, `user/preferences/history`, `user/preferences/player-details`

**Step 2: Type-check and test**

```bash
npm run type-check
npm run test
```

**Step 3: Commit**

```bash
git add server/api/recruiting-packet/ server/api/schools/ server/api/suggestions/ server/api/tasks/ server/api/user/
git commit -m "refactor: migrate schools/tasks/preferences API routes to structured logging"
```

---

## Task 5: Enhance Logger Test Coverage

**Files:**
- Modify: `tests/unit/server/utils/logger.spec.ts`

The existing tests cover `createLogger` in dev/prod mode. Missing coverage:
1. `useLogger(event)` — the variant that accepts an H3Event
2. Correlation ID appearing in dev-mode log prefix
3. Production mode with `LOG_LEVEL` env var set (logs should appear)
4. Sanitization of sensitive fields

**Step 1: Add tests for `useLogger(event)` with correlation ID**

Import `useLogger` at the top:
```typescript
import { createLogger, useLogger } from "~/server/utils/logger";
```

Add a `describe("useLogger", ...)` block after existing tests:

```typescript
describe("useLogger", () => {
  it("should create a logger with event context", () => {
    const mockEvent = {
      context: { requestId: "test-req-id-12345678", user: { id: "user-abc" } },
      path: "/api/test",
      method: "GET",
    } as any;

    const logger = useLogger(mockEvent, "test-context");
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
  });

  describe("in development mode", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("should include correlation ID prefix in dev logs", () => {
      const mockEvent = {
        context: { requestId: "test-req-id-12345678" },
        path: "/api/test",
        method: "GET",
      } as any;

      const logger = useLogger(mockEvent, "test");
      logger.info("Test with correlation");

      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0];
      // Correlation ID is truncated to 8 chars in dev mode
      expect(call).toContain("[req:test-req");
    });

    it("should not include request prefix when no requestId", () => {
      const mockEvent = {
        context: {},
        path: "/api/test",
        method: "GET",
      } as any;

      const logger = useLogger(mockEvent);
      logger.info("Test without correlation");

      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).not.toContain("[req:");
    });
  });
});
```

**Step 2: Add test for production mode with LOG_LEVEL set**

In the `describe("production mode")` block, add:

```typescript
it("should log in production when LOG_LEVEL is set", () => {
  process.env.LOG_LEVEL = "error";
  const logger = createLogger("test");
  logger.error("Production error");

  // In production with LOG_LEVEL set, outputs JSON
  expect(consoleLogSpy).toHaveBeenCalled();
  const jsonStr = consoleLogSpy.mock.calls[0][0];
  const parsed = JSON.parse(jsonStr);
  expect(parsed.level).toBe("ERROR");
  expect(parsed.message).toBe("Production error");

  delete process.env.LOG_LEVEL;
});

it("should respect LOG_LEVEL threshold in production", () => {
  process.env.LOG_LEVEL = "error";
  const logger = createLogger("test");
  logger.warn("This should be suppressed");

  expect(consoleWarnSpy).not.toHaveBeenCalled();
  expect(consoleLogSpy).not.toHaveBeenCalled(); // warn is below error threshold

  delete process.env.LOG_LEVEL;
});
```

**Step 3: Add sanitization tests**

```typescript
describe("sanitizeLogData (via production logging)", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "info";
  });
  afterEach(() => {
    delete process.env.LOG_LEVEL;
  });

  it("should redact password fields", () => {
    const logger = createLogger("test");
    logger.info("User login", { email: "user@example.com", password: "secret123" });

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.data.password).toBe("[REDACTED]");
    expect(parsed.data.email).toBe("user@example.com");
  });

  it("should redact token fields", () => {
    const logger = createLogger("test");
    logger.info("Token refresh", { access_token: "bearer-xyz", userId: "123" });

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.data.access_token).toBe("[REDACTED]");
    expect(parsed.data.userId).toBe("123");
  });

  it("should serialize Error objects safely", () => {
    const logger = createLogger("test");
    logger.error("Operation failed", new Error("DB connection refused"));

    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.data.name).toBe("Error");
    expect(parsed.data.message).toBe("DB connection refused");
    expect(parsed.data.stack).toBeUndefined(); // stack hidden in production
  });
});
```

**Step 4: Run tests to verify all pass**

```bash
npm run test -- tests/unit/server/utils/logger.spec.ts
```

**Step 5: Commit**

```bash
git add tests/unit/server/utils/logger.spec.ts
git commit -m "test: add useLogger(event), LOG_LEVEL, and sanitization test coverage"
```

---

## Task 6: Update CLAUDE.md with Logging Patterns

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add a "Logging" section to CLAUDE.md**

After the "## Supabase & Database" section, add:

```markdown
## Logging

**In API routes (Nitro handlers):** Always use `useLogger(event, "context")` for request-aware logs with correlation ID:
```typescript
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "feature/route-name");
  try {
    logger.info("Fetching data");
    // ...
    return result;
  } catch (err) {
    logger.error("Failed to fetch data", err);
    if (err instanceof Error && "statusCode" in err) throw err;
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch data" });
  }
});
```

**Context name convention:** Match the API route path, e.g., `"tasks"`, `"family/members"`, `"auth/verify-email"`.

**Never expose raw error messages** to clients: use generic `statusMessage` strings.

**Background/cron jobs** (no H3Event): Use `createLogger("cron/job-name")` at module level.

**Correlation IDs** flow automatically: client → `useAuthFetch` injects `X-Request-ID` → correlation middleware reads it → `useLogger(event)` includes it in every log entry.
```

**Step 2: Verify the file looks correct**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add logging patterns and correlation ID documentation to CLAUDE.md"
```

---

## Verification

After all tasks complete, run the full suite:

```bash
npm run type-check
npm run test
```

Expected: All ~5600+ tests pass, type-check clean.
