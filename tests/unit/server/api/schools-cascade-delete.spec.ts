import { describe, it, expect, vi, beforeEach } from "vitest";

// All mocks must be at top-level so Vitest can hoist them
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    readBody: vi.fn(),
    getRouterParam: vi.fn(),
    getHeader: vi.fn(),
    getCookie: vi.fn(),
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

describe("POST /api/schools/[id]/cascade-delete security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401 before touching the database", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { createServerSupabaseUserClient } = await import("~/server/utils/supabase");
    const h3 = await import("h3");

    // Set up h3 mocks for this test
    vi.mocked(h3.getRouterParam).mockReturnValue("some-school-id");
    vi.mocked(h3.readBody).mockResolvedValue({ confirmDelete: true });
    vi.mocked(h3.getHeader).mockReturnValue(null);
    vi.mocked(h3.getCookie).mockReturnValue(undefined);

    // requireAuth throws 401
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );

    // Import handler (after mocks are set at module level)
    const { default: handler } = await import(
      "~/server/api/schools/[id]/cascade-delete.post"
    );

    const mockEvent = {
      context: {},
      node: { req: { headers: {} }, res: {} },
    } as any;

    // Should propagate the 401 from requireAuth
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });

    // requireAuth must have been called
    expect(requireAuth).toHaveBeenCalledWith(mockEvent);

    // Database client must NOT have been created
    expect(createServerSupabaseUserClient).not.toHaveBeenCalled();
  });
});
