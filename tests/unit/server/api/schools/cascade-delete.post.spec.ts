import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_UUID = "33333333-3333-3333-3333-333333333333";

// ── Supabase delete chain state ─────────────────────────────────────────────
const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));
const mockClientFrom = vi.fn(() => ({ delete: mockDelete }));
const mockClient = { from: mockClientFrom };

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => mockClient),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-id" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => TEST_UUID),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn().mockResolvedValue({ confirmDelete: true }),
    getHeader: vi.fn().mockReturnValue("Bearer test-token"),
    getCookie: vi.fn().mockReturnValue(undefined),
    createError: (opts: { statusCode: number; statusMessage?: string; message?: string }) => {
      const err = new Error(opts.statusMessage ?? opts.message) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import { requireAuth } from "~/server/utils/auth";
import * as h3Module from "h3";

const { default: handler } = await import(
  "~/server/api/schools/[id]/cascade-delete.post"
);

const mockEvent = {
  context: { params: { id: TEST_UUID } },
  node: { req: { headers: {} }, res: {} },
} as any;

// 9 child deletes + 1 school delete = 10 total calls
const makeSuccessResponses = (count: number) =>
  Array.from({ length: count }, () => ({ count: 0, error: null }));

describe("POST /api/schools/[id]/cascade-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteEq.mockResolvedValue({ count: 0, error: null });
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-id" } as any);
    vi.mocked(h3Module.readBody).mockResolvedValue({ confirmDelete: true });
    vi.mocked(h3Module.getHeader).mockReturnValue("Bearer test-token");
    vi.mocked(h3Module.getCookie).mockReturnValue(undefined);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns success:true with deleted counts when all deletes succeed", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 2, error: null })  // school_status_history
      .mockResolvedValueOnce({ count: 4, error: null })  // coaches
      .mockResolvedValueOnce({ count: 7, error: null })  // interactions
      .mockResolvedValueOnce({ count: 1, error: null })  // offers
      .mockResolvedValueOnce({ count: 3, error: null })  // social_media_posts
      .mockResolvedValueOnce({ count: 5, error: null })  // documents
      .mockResolvedValueOnce({ count: 2, error: null })  // events
      .mockResolvedValueOnce({ count: 1, error: null })  // suggestion
      .mockResolvedValueOnce({ count: 6, error: null })  // follow_up_reminders
      .mockResolvedValueOnce({ count: 1, error: null }); // school itself

    const result = await handler(mockEvent);

    expect(result).toMatchObject({
      success: true,
      schoolId: TEST_UUID,
    });
    expect(result.deleted).toMatchObject({
      school_status_history: 2,
      coaches: 4,
      interactions: 7,
      offers: 1,
      social_media_posts: 3,
      documents: 5,
      events: 2,
      suggestion: 1,
      follow_up_reminders: 6,
      schools: 1,
    });
    expect(result.message).toContain("Successfully deleted");
    expect(result.message).toContain("school itself");
  });

  it("returns success:true with empty deleted when no related records exist", async () => {
    // All counts are 0/falsy → nothing recorded in deleted
    makeSuccessResponses(10).forEach(() =>
      mockDeleteEq.mockResolvedValueOnce({ count: 0, error: null }),
    );

    const result = await handler(mockEvent);

    expect(result).toMatchObject({ success: true, schoolId: TEST_UUID });
    expect(result.message).toBe("No records to delete");
  });

  it("deletes child tables before the school itself", async () => {
    await handler(mockEvent);

    const fromCalls = mockClientFrom.mock.calls.map(([table]) => table);
    // School itself must be last
    expect(fromCalls[fromCalls.length - 1]).toBe("schools");
    // All 9 child tables must appear before the school
    const childTables = fromCalls.slice(0, -1);
    expect(childTables).toContain("school_status_history");
    expect(childTables).toContain("coaches");
    expect(childTables).toContain("interactions");
    expect(childTables).toContain("offers");
    expect(childTables).toContain("social_media_posts");
    expect(childTables).toContain("documents");
    expect(childTables).toContain("events");
    expect(childTables).toContain("suggestion");
    expect(childTables).toContain("follow_up_reminders");
  });

  it("uses school_id column for child table deletes", async () => {
    await handler(mockEvent);

    // suggestion uses related_school_id; all others use school_id
    const eqCalls = mockDeleteEq.mock.calls;
    const childEqCalls = eqCalls.slice(0, 9); // first 9 are child tables, last is the school

    // At least most children filter by school_id
    const schoolIdCols = childEqCalls.filter(([col]) => col === "school_id");
    expect(schoolIdCols.length).toBeGreaterThanOrEqual(8);
  });

  it("uses id column when deleting the school row itself", async () => {
    await handler(mockEvent);

    // Last eq call is the school delete
    const lastEqCall = mockDeleteEq.mock.calls[mockDeleteEq.mock.calls.length - 1];
    expect(lastEqCall).toEqual(["id", TEST_UUID]);
  });

  // ── confirmDelete validation ───────────────────────────────────────────────

  it("throws 400 when confirmDelete is false", async () => {
    vi.mocked(h3Module.readBody).mockResolvedValue({ confirmDelete: false });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when confirmDelete is missing from body", async () => {
    vi.mocked(h3Module.readBody).mockResolvedValue({});

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when body cannot be parsed", async () => {
    vi.mocked(h3Module.readBody).mockRejectedValue(new Error("parse error"));

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  // ── Auth token validation ──────────────────────────────────────────────────

  it("throws 401 when no authorization header and no cookie", async () => {
    vi.mocked(h3Module.getHeader).mockReturnValue(null);
    vi.mocked(h3Module.getCookie).mockReturnValue(undefined);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("accepts token from cookie when authorization header is absent", async () => {
    vi.mocked(h3Module.getHeader).mockReturnValue(null);
    vi.mocked(h3Module.getCookie).mockReturnValue("cookie-token");

    const result = await handler(mockEvent);

    expect(result).toMatchObject({ success: true });
  });

  // ── requireAuth error propagation ─────────────────────────────────────────

  it("re-throws H3Error from requireAuth without wrapping in 500", async () => {
    const h3Error = Object.assign(new Error("Forbidden"), { statusCode: 403 });
    vi.mocked(requireAuth).mockRejectedValue(h3Error);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  // ── Child delete failures → 500 ───────────────────────────────────────────

  it("throws 500 when school_status_history delete fails", async () => {
    mockDeleteEq.mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when coaches delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null }) // school_status_history OK
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } }); // coaches fails

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when interactions delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when offers delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when follow_up_reminders delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when school delete itself fails", async () => {
    // All 9 child deletes succeed, but the school delete fails
    for (let i = 0; i < 9; i++) {
      mockDeleteEq.mockResolvedValueOnce({ count: 0, error: null });
    }
    mockDeleteEq.mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
