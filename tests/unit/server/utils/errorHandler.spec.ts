import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { captureException, captureMessage, withScope, setContext } = vi.hoisted(
  () => {
    const setContext = vi.fn();
    const captureException = vi.fn();
    const captureMessage = vi.fn();
    const withScope = vi.fn(
      (cb: (scope: { setContext: typeof setContext }) => void) => {
        cb({ setContext });
      },
    );
    return { captureException, captureMessage, withScope, setContext };
  },
);

vi.mock("@sentry/nuxt", () => ({
  withScope,
  captureException,
  captureMessage,
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  sanitizeError,
  createSafeErrorResponse,
  sanitizeDatabaseError,
} from "~/server/utils/errorHandler";
import { AppError } from "~/types/errors";

describe("sanitizeError", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("maps TypeError to 500 (programming bug, not a client 400)", () => {
    process.env.NODE_ENV = "production";
    const err = new TypeError(
      "Cannot read properties of undefined (reading 'id')",
    );
    const safe = sanitizeError(err);
    expect(safe.statusCode).toBe(500);
    expect(safe.statusMessage).toBe("Internal Server Error");
    expect(safe.data?.message).toBe("An error occurred");
  });

  it("maps SyntaxError to 400 (malformed payload)", () => {
    process.env.NODE_ENV = "production";
    const safe = sanitizeError(new SyntaxError("Unexpected token"));
    expect(safe.statusCode).toBe(400);
    expect(safe.statusMessage).toBe("Bad Request");
  });

  it("does not capture to Sentry on its own (avoids double-report)", () => {
    process.env.NODE_ENV = "production";
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    captureException.mockClear();
    sanitizeError(new TypeError("boom"));
    expect(captureException).not.toHaveBeenCalled();
  });

  it("preserves H3 statusCode", () => {
    const err = Object.assign(new Error("nope"), { statusCode: 404 });
    expect(sanitizeError(err).statusCode).toBe(404);
  });

  it("uses AppError.statusCode", () => {
    const err = new AppError(409, "conflict", "already exists");
    expect(sanitizeError(err).statusCode).toBe(409);
  });
});

describe("createSafeErrorResponse", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalPublic = process.env.NUXT_PUBLIC_SENTRY_DSN;
  const originalPrivate = process.env.SENTRY_DSN;

  beforeEach(() => {
    captureException.mockClear();
    captureMessage.mockClear();
    setContext.mockClear();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalPublic === undefined) delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    else process.env.NUXT_PUBLIC_SENTRY_DSN = originalPublic;
    if (originalPrivate === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalPrivate;
  });

  it("captures once in production when only NUXT_PUBLIC_SENTRY_DSN is set", () => {
    process.env.NODE_ENV = "production";
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    delete process.env.SENTRY_DSN;

    const err = new TypeError("Cannot read properties of undefined");
    const safe = createSafeErrorResponse(err, "help/feedback");

    expect(safe.statusCode).toBe(500);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(err);
    expect(setContext).toHaveBeenCalledWith(
      "error_details",
      expect.objectContaining({
        context: "help/feedback",
        error_name: "TypeError",
      }),
    );
  });

  it("does not capture in development", () => {
    process.env.NODE_ENV = "development";
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    createSafeErrorResponse(new Error("dev"), "help/feedback");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does not capture in production without a DSN", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    createSafeErrorResponse(new Error("no dsn"), "help/feedback");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("captures a non-Error value via captureMessage", () => {
    process.env.NODE_ENV = "production";
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    createSafeErrorResponse("string-fail", "help/feedback");
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe("sanitizeDatabaseError", () => {
  it("maps unique violations to 409", () => {
    expect(
      sanitizeDatabaseError(new Error("duplicate key unique constraint"))
        .statusCode,
    ).toBe(409);
  });

  it("maps RLS denials to 403", () => {
    expect(
      sanitizeDatabaseError(new Error("permission denied by rls")).statusCode,
    ).toBe(403);
  });
});
