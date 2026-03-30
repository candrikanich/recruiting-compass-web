import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_UUID = "22222222-2222-2222-2222-222222222222";

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
    createError: (opts: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(opts.statusMessage ?? opts.message) as Error & {
        statusCode: number;
      };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import { requireAuth } from "~/server/utils/auth";
import * as h3Module from "h3";

const { default: handler } =
  await import("~/server/api/coaches/[id]/cascade-delete.post");

const mockEvent = {
  context: { params: { id: TEST_UUID } },
  node: { req: { headers: {} }, res: {} },
} as any;

// 5 delete steps: follow_up_reminders, interactions, offers, social_media_posts, coaches
const ALL_SUCCEED = [
  { count: 0, error: null },
  { count: 0, error: null },
  { count: 0, error: null },
  { count: 0, error: null },
  { count: 0, error: null },
];

describe("POST /api/coaches/[id]/cascade-delete", () => {
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
      .mockResolvedValueOnce({ count: 3, error: null }) // follow_up_reminders
      .mockResolvedValueOnce({ count: 5, error: null }) // interactions
      .mockResolvedValueOnce({ count: 2, error: null }) // offers
      .mockResolvedValueOnce({ count: 1, error: null }) // social_media_posts
      .mockResolvedValueOnce({ count: 1, error: null }); // coaches

    const result = await handler(mockEvent);

    expect(result).toMatchObject({
      success: true,
      coachId: TEST_UUID,
    });
    expect(result.deleted).toMatchObject({
      follow_up_reminders: 3,
      interactions: 5,
      offers: 2,
      social_media_posts: 1,
      coaches: 1,
    });
    expect(result.message).toContain("Successfully deleted");
  });

  it("returns success:true with empty deleted when no related records exist", async () => {
    // All counts are 0/falsy → nothing recorded in deleted
    ALL_SUCCEED.forEach(() =>
      mockDeleteEq.mockResolvedValueOnce({ count: 0, error: null }),
    );

    const result = await handler(mockEvent);

    expect(result).toMatchObject({ success: true, coachId: TEST_UUID });
    expect(result.message).toBe("No records to delete");
  });

  it("deletes tables in correct FK dependency order", async () => {
    await handler(mockEvent);

    const fromCalls = mockClientFrom.mock.calls.map(([table]) => table);
    expect(fromCalls).toEqual([
      "follow_up_reminders",
      "interactions",
      "offers",
      "social_media_posts",
      "coaches",
    ]);
  });

  it("passes coachId to eq for follow_up_reminders via coach_id", async () => {
    await handler(mockEvent);
    expect(mockDeleteEq).toHaveBeenNthCalledWith(1, "coach_id", TEST_UUID);
  });

  it("passes coachId to eq for interactions via coach_id", async () => {
    await handler(mockEvent);
    expect(mockDeleteEq).toHaveBeenNthCalledWith(2, "coach_id", TEST_UUID);
  });

  it("passes coachId to eq for offers via coach_id", async () => {
    await handler(mockEvent);
    expect(mockDeleteEq).toHaveBeenNthCalledWith(3, "coach_id", TEST_UUID);
  });

  it("passes coachId to eq for social_media_posts via coach_id", async () => {
    await handler(mockEvent);
    expect(mockDeleteEq).toHaveBeenNthCalledWith(4, "coach_id", TEST_UUID);
  });

  it("passes coachId to eq for coaches via id", async () => {
    await handler(mockEvent);
    expect(mockDeleteEq).toHaveBeenNthCalledWith(5, "id", TEST_UUID);
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

  // ── Delete failure → 500 (one test per step) ──────────────────────────────

  it("throws 500 when follow_up_reminders delete fails", async () => {
    mockDeleteEq.mockResolvedValueOnce({
      count: null,
      error: { message: "db error" },
    });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when interactions delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null }) // follow_up_reminders OK
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } }); // interactions fails

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when offers delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when social_media_posts delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when coaches delete fails", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
