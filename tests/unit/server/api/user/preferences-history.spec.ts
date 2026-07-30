/**
 * POST /api/user/preferences/history — behavioral tests.
 *
 * Covers the Zod-validation rejection path (regression for the Zod v4
 * ZodError.errors -> .issues rename, which made the handler crash with an
 * unhandled TypeError instead of a clean 400) and the happy-path insert.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
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

vi.mock("~/server/utils/supabase", () => ({ useSupabaseAdmin: vi.fn() }));

function fakeEvent(body: unknown): H3Event {
  return { context: {}, _body: body } as unknown as H3Event;
}

describe("POST /api/user/preferences/history", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
  });

  async function loadHandler() {
    return (await import("~/server/api/user/preferences/history.post"))
      .default;
  }

  it("rejects a body that fails Zod validation with 400 and the first issue message (zod v4 .issues)", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue({ from: vi.fn() } as never);
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ category: 123 })),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining("Invalid history data:"),
    });
  });

  it("inserts the history row and returns its id", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const insertCalls: unknown[] = [];
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: () => ({
        insert: (row: unknown) => {
          insertCalls.push(row);
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "hist-1", created_at: "2026-01-01" },
                  error: null,
                }),
            }),
          };
        },
      }),
    } as never);
    const handler = await loadHandler();

    const result = await handler(
      fakeEvent({ category: "dashboard", changed_fields: ["theme"] }),
    );

    expect(result).toMatchObject({ success: true, history_id: "hist-1" });
    expect(insertCalls[0]).toMatchObject({
      user_id: "user-1",
      category: "dashboard",
      changed_fields: ["theme"],
      changed_by: "user-1",
    });
  });
});
