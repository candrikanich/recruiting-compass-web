import { describe, it, expect, vi, beforeEach } from "vitest";

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

describe("GET /api/schools/[id]/deletion-blockers security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated requests with 401", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const { createServerSupabaseUserClient } = await import("~/server/utils/supabase");
    const h3 = await import("h3");

    vi.mocked(h3.getRouterParam).mockReturnValue("some-school-id");
    vi.mocked(h3.getHeader).mockReturnValue(null);
    vi.mocked(h3.getCookie).mockReturnValue(undefined);
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 })
    );

    const { default: handler } = await import("~/server/api/schools/[id]/deletion-blockers.get");
    const mockEvent = { context: {}, node: { req: { headers: {} }, res: {} } } as any;

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
    expect(requireAuth).toHaveBeenCalledWith(mockEvent);
    expect(createServerSupabaseUserClient).not.toHaveBeenCalled();
  });
});
