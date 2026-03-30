## Logging

**In API routes (Nitro handlers):** Always use `useLogger(event, "context")` as the first line inside `defineEventHandler`. This captures the correlation ID and request context automatically:

```typescript
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "feature/route-name");
  try {
    logger.info("Fetching data");
    return result;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err; // re-throw H3 first
    logger.error("Failed to fetch data", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch data" });
  }
});
```

**Context name convention:** Match the API route path — e.g., `"tasks"`, `"family/members"`, `"auth/verify-email"`.

**Never expose raw `error.message`** in `statusMessage` — leaks internal stack details, DB schema, and file paths to clients.

**Log levels:**
- `logger.error` — unexpected failures (DB errors, unhandled exceptions)
- `logger.warn` — expected but notable conditions (data not found, business rule blocks)
- `logger.info` — meaningful events (request processed, action completed)
- `logger.debug` — verbose data useful only during development

**Correlation IDs flow automatically:** client session ID → `useAuthFetch` injects `X-Request-ID` → correlation middleware reads it → `useLogger(event)` includes it in every log entry.

**Background/cron jobs** (no H3Event available): use `createLogger("cron/job-name")` at module level.
