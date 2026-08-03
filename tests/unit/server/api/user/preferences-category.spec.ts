/**
 * GET/POST/DELETE /api/user/preferences/[category] — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md listed the preferences endpoints
 * among the ~35/98 untested API endpoints (only indirect e2e/composable
 * coverage existed; the handlers themselves had no direct test). Covers
 * category validation, the parent-reads-linked-athlete resolution (the
 * same family_members pattern proven live in
 * parent-access-control.integration.spec.ts, exercised here at the unit
 * level for the category-specific PLAYER_OWNED_CATEGORIES branch), the
 * no-data-yet empty response, upsert/delete happy paths, and Zod
 * validation on POST.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  getUserRole: vi.fn(),
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

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
    }) => Error & {
      statusCode: number;
    };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage) as Error & { statusCode: number };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(
  category: string | undefined,
  body?: Record<string, unknown>,
): H3Event {
  return {
    context: { params: { category } },
    _body: body,
  } as unknown as H3Event;
}

vi.mock("~/server/utils/supabase", () => ({ useSupabaseAdmin: vi.fn() }));

describe("GET /api/user/preferences/[category]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { requireAuth, getUserRole } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    vi.mocked(getUserRole).mockResolvedValue("player");
  });

  async function loadHandler() {
    return (await import("~/server/api/user/preferences/[category].get"))
      .default;
  }

  it("rejects an invalid category with 400", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue({ from: vi.fn() } as never);
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent("not-a-real-category")),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns an empty, exists:false response when no preferences row exists yet", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as never);
    const handler = await loadHandler();

    const result = (await handler(fakeEvent("dashboard"))) as {
      exists: boolean;
      data: unknown;
    };
    expect(result.exists).toBe(false);
    expect(result.data).toEqual({});
  });

  it("returns the caller's own preferences for a non-player-owned category even when the caller is a parent", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("parent");
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const selectedUserIds: string[] = [];
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: (col: string, val: string) => {
            if (col === "user_id") selectedUserIds.push(val);
            return {
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { data: { theme: "dark" }, updated_at: "now" },
                    error: null,
                  }),
              }),
            };
          },
        }),
      }),
    } as never);
    const handler = await loadHandler();

    // "dashboard" is not in PLAYER_OWNED_CATEGORIES, so no family resolution.
    await handler(fakeEvent("dashboard"));
    expect(selectedUserIds).toEqual(["user-1"]);
  });

  it("resolves a parent's request for a PLAYER_OWNED category to the linked athlete's data", async () => {
    const { requireAuth, getUserRole } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockResolvedValue({
      id: "parent-1",
      email: "parent@example.com",
    });
    vi.mocked(getUserRole).mockResolvedValue("parent");

    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const selectedUserIds: string[] = [];
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: (table: string) => {
        if (table === "family_members") {
          return {
            select: () => ({
              eq: (col: string, val: string) => ({
                eq: (roleCol: string, roleVal: string) => ({
                  maybeSingle: () => {
                    if (roleVal === "parent") {
                      return Promise.resolve({
                        data: { family_unit_id: "family-a" },
                        error: null,
                      });
                    }
                    return Promise.resolve({
                      data: { user_id: "athlete-1" },
                      error: null,
                    });
                  },
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              if (col === "user_id") selectedUserIds.push(val);
              return {
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              };
            },
          }),
        };
      },
    } as never);
    const handler = await loadHandler();

    // "player" IS in PLAYER_OWNED_CATEGORIES.
    await handler(fakeEvent("player"));
    expect(selectedUserIds).toEqual(["athlete-1"]);
  });
});

describe("POST /api/user/preferences/[category]", () => {
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
    return (await import("~/server/api/user/preferences/[category].post"))
      .default;
  }

  it("rejects an invalid category with 422", async () => {
    const handler = await loadHandler();
    await expect(
      handler(fakeEvent("bogus-category", { data: { x: 1 } })),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  // Regression for the Zod v4 rename (ZodError.errors -> .issues): the
  // handler must surface a clean 422 with the first issue's message, not
  // crash with "Cannot read properties of undefined" from reading the
  // removed `.errors` property inside its own catch block.
  it("rejects a body that fails Zod validation with 422 and the first issue message (zod v4 .issues)", async () => {
    const handler = await loadHandler();
    await expect(
      handler(fakeEvent("dashboard", { data: "not-an-object" })),
    ).rejects.toMatchObject({
      statusCode: 422,
      statusMessage: expect.stringContaining("Invalid preference data:"),
    });
  });

  it("upserts the preference row and returns the saved data", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const upsertCalls: unknown[] = [];
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: () => ({
        upsert: (row: unknown) => {
          upsertCalls.push(row);
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { data: { theme: "dark" }, updated_at: "2026-01-01" },
                  error: null,
                }),
            }),
          };
        },
      }),
    } as never);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent("dashboard", { data: { theme: "dark" } }),
    )) as { success: boolean; data: { theme: string } };

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ theme: "dark" });
    expect(upsertCalls).toEqual([
      expect.objectContaining({ user_id: "user-1", category: "dashboard" }),
    ]);
  });
});

describe("DELETE /api/user/preferences/[category]", () => {
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
    return (await import("~/server/api/user/preferences/[category].delete"))
      .default;
  }

  it("deletes the caller's own preferences row for the category", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const deleteCalls: Array<{ col: string; val: string }[]> = [];
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: () => ({
        delete: () => ({
          eq: (col: string, val: string) => {
            const chain: Array<{ col: string; val: string }> = [{ col, val }];
            deleteCalls.push(chain);
            return {
              eq: (col2: string, val2: string) => {
                chain.push({ col: col2, val: val2 });
                return Promise.resolve({ error: null });
              },
            };
          },
        }),
      }),
    } as never);
    const handler = await loadHandler();

    const result = (await handler(fakeEvent("dashboard"))) as {
      success: boolean;
    };
    expect(result.success).toBe(true);
    expect(deleteCalls[0]).toEqual([
      { col: "user_id", val: "user-1" },
      { col: "category", val: "dashboard" },
    ]);
  });

  it("returns 500 when the delete fails", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue({
      from: () => ({
        delete: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({ error: { message: "constraint violation" } }),
          }),
        }),
      }),
    } as never);
    const handler = await loadHandler();

    await expect(handler(fakeEvent("dashboard"))).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
