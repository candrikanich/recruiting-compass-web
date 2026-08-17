import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

const SAMPLE_ROWS = [
  {
    id: "a",
    actor_admin_id: "admin-1",
    action: "view_as.start",
    target_user_id: "u1",
    meta: {},
    created_at: "2026-08-17T00:00:00Z",
  },
];

const mockRange = vi.fn();
const mockEq = vi.fn(() => ({ eq: mockEq, range: mockRange }));
const mockOrder = vi.fn(() => ({ eq: mockEq, range: mockRange }));
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
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { getQuery } from "h3";

describe("GET /api/admin/audit-log", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockRange.mockResolvedValue({
      data: SAMPLE_ROWS,
      count: 1,
      error: null,
    });
    vi.resetModules();
  });

  it("uses default limit=50 and offset=0 when no query params provided", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import(
      "~/server/api/admin/audit-log.get"
    );
    await handler({} as any);

    expect(mockSelect).toHaveBeenCalledWith(
      "id, actor_admin_id, action, target_user_id, meta, created_at",
      { count: "exact" },
    );
    expect(mockRange).toHaveBeenCalledWith(0, 49);
  });

  it("uses provided limit and offset from query params", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "10", offset: "20" });
    const { default: handler } = await import(
      "~/server/api/admin/audit-log.get"
    );
    await handler({} as any);

    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });

  it("caps limit at 200 regardless of query param value", async () => {
    vi.mocked(getQuery).mockReturnValue({ limit: "9999" });
    const { default: handler } = await import(
      "~/server/api/admin/audit-log.get"
    );
    await handler({} as any);

    expect(mockRange).toHaveBeenCalledWith(0, 199);
  });

  it("filters by action and actor when provided", async () => {
    vi.mocked(getQuery).mockReturnValue({
      action: "user.delete",
      actor: "admin-2",
    });
    const { default: handler } = await import(
      "~/server/api/admin/audit-log.get"
    );
    await handler({} as any);

    expect(mockEq).toHaveBeenCalledWith("action", "user.delete");
    expect(mockEq).toHaveBeenCalledWith("actor_admin_id", "admin-2");
  });

  it("returns rows and total count", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import(
      "~/server/api/admin/audit-log.get"
    );
    const result = await handler({} as any);

    expect(result).toEqual({ rows: SAMPLE_ROWS, total: 1 });
  });

  it("throws 500 on database error", async () => {
    mockRange.mockResolvedValue({
      data: null,
      count: null,
      error: { message: "db error" },
    });
    vi.mocked(getQuery).mockReturnValue({});
    const { default: handler } = await import(
      "~/server/api/admin/audit-log.get"
    );

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
