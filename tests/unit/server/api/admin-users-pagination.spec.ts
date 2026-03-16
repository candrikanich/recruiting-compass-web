import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

const mockRange = vi.fn();
const mockOrder = vi.fn(() => ({ range: mockRange }));
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getQuery: vi.fn(),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { getQuery } from "h3";

const SAMPLE_USERS = [
  { id: "1", email: "a@test.com", full_name: "A", role: "player", is_admin: false, created_at: "2024-01-01" },
  { id: "2", email: "b@test.com", full_name: "B", role: "parent", is_admin: false, created_at: "2024-01-02" },
];

describe("GET /api/admin/users - pagination", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockRange.mockResolvedValue({
      data: SAMPLE_USERS,
      count: 42,
      error: null,
    });
    // Reset module cache so each test gets a fresh handler
    vi.resetModules();
  });

  it("uses default limit=50 and offset=0 when no query params provided", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import("~/server/api/admin/users.get");
    const mockEvent = {} as any;

    await handler(mockEvent);

    expect(mockSelect).toHaveBeenCalledWith(
      "id, email, full_name, role, is_admin, created_at",
      { count: "exact" }
    );
    expect(mockRange).toHaveBeenCalledWith(0, 49);
  });

  it("uses provided limit and offset from query params", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "25", offset: "50" });
    const { default: handler } = await import("~/server/api/admin/users.get");
    const mockEvent = {} as any;

    await handler(mockEvent);

    expect(mockRange).toHaveBeenCalledWith(50, 74);
  });

  it("caps limit at 100 regardless of query param value", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "999" });
    const { default: handler } = await import("~/server/api/admin/users.get");
    const mockEvent = {} as any;

    await handler(mockEvent);

    expect(mockRange).toHaveBeenCalledWith(0, 99);
  });

  it("returns users, total count, limit, and offset in response", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import("~/server/api/admin/users.get");
    const mockEvent = {} as any;

    const result = await handler(mockEvent);

    expect(result).toEqual({
      users: SAMPLE_USERS,
      total: 42,
      limit: 50,
      offset: 0,
    });
  });

  it("throws 500 on database error", async () => {
    mockRange.mockResolvedValue({ data: null, count: null, error: { message: "db error" } });
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import("~/server/api/admin/users.get");
    const mockEvent = {} as any;

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
