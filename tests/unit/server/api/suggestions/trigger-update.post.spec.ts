/**
 * POST /api/suggestions/trigger-update — parent/athlete resolution (#555).
 *
 * The `assertNotParent` gate that blocked parents outright was removed:
 * family-shared profile means a parent triggering this re-evaluates the
 * LINKED ATHLETE's suggestions (resolveAthleteId), never their own.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const mockRequireAuth = vi.fn();
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

const mockResolveAthleteId = vi.fn();
vi.mock("~/server/utils/resolveAthleteId", () => ({
  resolveAthleteId: (...args: unknown[]) => mockResolveAthleteId(...args),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({})),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockTriggerSuggestionUpdate = vi.fn(async () => ({
  generated: 0,
  surfaced: 0,
  reason: "daily_refresh" as const,
}));
vi.mock("~/server/utils/triggerSuggestionUpdate", () => ({
  triggerSuggestionUpdate: (...args: unknown[]) =>
    mockTriggerSuggestionUpdate(...args),
}));

const mockReadBody = vi.fn();
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: (...args: unknown[]) => mockReadBody(...args),
  };
});

(
  globalThis as unknown as {
    createError: (config: { statusCode: number; message?: string }) => Error & {
      statusCode: number;
    };
  }
).createError = (config) => {
  const err = new Error(config.message) as Error & { statusCode: number };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(): H3Event {
  return { context: {}, node: { req: {}, res: {} } } as unknown as H3Event;
}

describe("POST /api/suggestions/trigger-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadBody.mockResolvedValue({ reason: "daily_refresh" });
  });

  it("a parent's request re-evaluates the LINKED ATHLETE's suggestions, not their own", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "parent-1",
      email: "parent@example.com",
    });
    mockResolveAthleteId.mockResolvedValue("athlete-9");

    const handler = (
      await import("~/server/api/suggestions/trigger-update.post")
    ).default;
    await handler(fakeEvent());

    expect(mockResolveAthleteId).toHaveBeenCalledWith(
      "parent-1",
      expect.anything(),
    );
    expect(mockTriggerSuggestionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      "athlete-9",
      "daily_refresh",
      expect.anything(),
    );
  });

  it("a player's own request scopes to their own id", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "athlete-9",
      email: "athlete@example.com",
    });
    mockResolveAthleteId.mockResolvedValue("athlete-9");

    const handler = (
      await import("~/server/api/suggestions/trigger-update.post")
    ).default;
    await handler(fakeEvent());

    expect(mockTriggerSuggestionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      "athlete-9",
      "daily_refresh",
      expect.anything(),
    );
  });
});
