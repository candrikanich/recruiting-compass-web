import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  getUserRole: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
  useSupabaseAdmin: vi.fn(),
}));
vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

/**
 * A minimal chainable Supabase stub. Each `.from(...)` chain resolves via
 * `.maybeSingle()` to the next queued result, in call order.
 */
function makeSupabaseStub(results: Array<{ data: unknown; error: unknown }>) {
  let i = 0;
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve(results[i++] ?? { data: null, error: null }),
  };
  return { from: () => chain };
}

describe("resolveViewerAthleteId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the caller unchanged for a player", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("player" as never);

    const { resolveViewerAthleteId } = await import("~/server/utils/athleteAccess");
    const supabase = makeSupabaseStub([]);

    const result = await resolveViewerAthleteId(supabase as never, "player-1");
    expect(result).toBe("player-1");
  });

  it("resolves a parent to the linked player in their family unit", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("parent" as never);

    const { resolveViewerAthleteId } = await import("~/server/utils/athleteAccess");
    const supabase = makeSupabaseStub([
      { data: { family_unit_id: "unit-1" }, error: null },
      { data: { user_id: "player-9" }, error: null },
    ]);

    const result = await resolveViewerAthleteId(supabase as never, "parent-1");
    expect(result).toBe("player-9");
  });

  it("falls back to the parent when no player is linked", async () => {
    const { getUserRole } = await import("~/server/utils/auth");
    vi.mocked(getUserRole).mockResolvedValue("parent" as never);

    const { resolveViewerAthleteId } = await import("~/server/utils/athleteAccess");
    const supabase = makeSupabaseStub([
      { data: { family_unit_id: "unit-1" }, error: null },
      { data: null, error: null },
    ]);

    const result = await resolveViewerAthleteId(supabase as never, "parent-1");
    expect(result).toBe("parent-1");
  });
});

describe("GET /api/athlete/what-matters-now", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated requests with 401", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { createServerSupabaseClient } = await import("~/server/utils/supabase");
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );

    const { default: handler } = await import(
      "~/server/api/athlete/what-matters-now.get"
    );
    const mockEvent = {
      context: {},
      node: { req: { headers: {} }, res: {} },
    } as never;

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
