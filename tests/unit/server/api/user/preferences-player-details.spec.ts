/**
 * PATCH /api/user/preferences/player-details — Zod validation behavior.
 *
 * Regression for the Zod v4 ZodError.errors -> .issues rename: the handler
 * builds its 400 response's `data` payload from the validation issues, and
 * reading the removed `.errors` property silently produced `data: undefined`
 * (the client-facing field errors vanished).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  assertNotParent: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/auditLog", () => ({
  logCRUD: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("~/server/utils/triggerSuggestionUpdate", () => ({
  triggerSuggestionUpdate: vi.fn(),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: async (event: H3Event) =>
      (event as unknown as { _body: unknown })._body,
  };
});

function fakeEvent(body: unknown): H3Event {
  return { context: {}, _body: body } as unknown as H3Event;
}

describe("PATCH /api/user/preferences/player-details", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { requireAuth, assertNotParent } = await import(
      "~/server/utils/auth"
    );
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    vi.mocked(assertNotParent).mockResolvedValue(undefined);
    const { createServerSupabaseClient } = await import(
      "~/server/utils/supabase"
    );
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: vi.fn(),
    } as never);
  });

  it("rejects a body that fails Zod validation with 400 and the issue list in data (zod v4 .issues)", async () => {
    const handler = (
      await import("~/server/api/user/preferences/player-details.patch")
    ).default;

    await expect(handler(fakeEvent({ bats: "X" }))).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid player details",
      data: expect.arrayContaining([
        expect.objectContaining({ message: expect.any(String) }),
      ]),
    });
  });
});
