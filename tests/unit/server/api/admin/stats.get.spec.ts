import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Each table query returns { count, error } via a chainable select()
const mockSelectResult: { count: number | null; error: null | object } = {
  count: 0,
  error: null,
};
const mockSelect = vi.fn(() => Promise.resolve(mockSelectResult));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { requireAdmin } from "~/server/utils/auth";

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns correct numeric counts from all DB queries", async () => {
    const tableCounts: Record<string, number> = {
      users: 10,
      schools: 20,
      coaches: 30,
      interactions: 40,
      family_units: 5,
    };

    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn(() =>
        Promise.resolve({ count: tableCounts[table] ?? 0, error: null }),
      ),
    }));

    const { default: handler } = await import("~/server/api/admin/stats.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    const response = await handler(mockEvent);

    expect(response.users).toBe(10);
    expect(response.schools).toBe(20);
    expect(response.coaches).toBe(30);
    expect(response.interactions).toBe(40);
    expect(response.family_units).toBe(5);
  });

  it("defaults null counts to 0 via the ?? 0 branch", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => Promise.resolve({ count: null, error: null })),
    }));

    const { default: handler } = await import("~/server/api/admin/stats.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    const response = await handler(mockEvent);

    expect(response.users).toBe(0);
    expect(response.schools).toBe(0);
    expect(response.coaches).toBe(0);
    expect(response.interactions).toBe(0);
    expect(response.family_units).toBe(0);
  });

  it("re-throws H3Error from requireAdmin without wrapping in 500", async () => {
    const h3Error = new Error("Forbidden") as Error & { statusCode: number };
    h3Error.statusCode = 403;
    vi.mocked(requireAdmin).mockRejectedValue(h3Error);

    const { default: handler } = await import("~/server/api/admin/stats.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("wraps generic Error from requireAdmin in a 500 createError", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("unexpected failure"));

    const { default: handler } = await import("~/server/api/admin/stats.get");
    const mockEvent = { context: {}, node: { req: {}, res: {} } } as any;

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch stats",
    });
  });
});
