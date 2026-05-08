import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_UUID = "11111111-1111-1111-1111-111111111111";

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
  await import("~/server/api/interactions/[id]/cascade-delete.post");

const mockEvent = {
  context: { params: { id: TEST_UUID } },
  node: { req: { headers: {} }, res: {} },
} as any;

describe("POST /api/interactions/[id]/cascade-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all deletes succeed with 0 count (nothing to delete)
    mockDeleteEq.mockResolvedValue({ count: 0, error: null });
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-id" } as any);
    vi.mocked(h3Module.readBody).mockResolvedValue({ confirmDelete: true });
    vi.mocked(h3Module.getHeader).mockReturnValue("Bearer test-token");
    vi.mocked(h3Module.getCookie).mockReturnValue(undefined);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns success:true with deleted counts when all deletes succeed", async () => {
    // follow_up_reminders: 2 deleted, interactions: 1 deleted
    mockDeleteEq
      .mockResolvedValueOnce({ count: 2, error: null }) // follow_up_reminders
      .mockResolvedValueOnce({ count: 1, error: null }); // interactions

    const result = await handler(mockEvent);

    expect(result).toMatchObject({
      success: true,
      interactionId: TEST_UUID,
    });
    expect(result.deleted).toMatchObject({
      follow_up_reminders: 2,
      interactions: 1,
    });
    expect(result.message).toContain("Successfully deleted");
  });

  it("returns success:true with empty deleted when no related records exist", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null }) // follow_up_reminders (falsy → not recorded)
      .mockResolvedValueOnce({ count: 0, error: null }); // interactions (falsy → not recorded)

    const result = await handler(mockEvent);

    expect(result).toMatchObject({ success: true, interactionId: TEST_UUID });
    expect(result.message).toBe("No records to delete");
  });

  it("deletes tables in correct FK dependency order", async () => {
    mockDeleteEq.mockResolvedValue({ count: 0, error: null });

    await handler(mockEvent);

    const fromCalls = mockClientFrom.mock.calls.map(([table]) => table);
    expect(fromCalls[0]).toBe("follow_up_reminders");
    expect(fromCalls[1]).toBe("interactions");
  });

  it("passes the interaction UUID to eq filter for follow_up_reminders", async () => {
    mockDeleteEq.mockResolvedValue({ count: 0, error: null });

    await handler(mockEvent);

    // First delete: follow_up_reminders filtered by interaction_id
    expect(mockDeleteEq).toHaveBeenNthCalledWith(
      1,
      "interaction_id",
      TEST_UUID,
    );
  });

  it("passes the interaction UUID to eq filter for interactions", async () => {
    mockDeleteEq.mockResolvedValue({ count: 0, error: null });

    await handler(mockEvent);

    // Second delete: interactions filtered by id
    expect(mockDeleteEq).toHaveBeenNthCalledWith(2, "id", TEST_UUID);
  });

  // ── confirmDelete validation ───────────────────────────────────────────────

  it("throws 400 when confirmDelete is false", async () => {
    vi.mocked(h3Module.readBody).mockResolvedValue({ confirmDelete: false });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when confirmDelete is missing", async () => {
    vi.mocked(h3Module.readBody).mockResolvedValue({});

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when body is null/unparseable", async () => {
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
    mockDeleteEq.mockResolvedValue({ count: 0, error: null });

    const result = await handler(mockEvent);

    expect(result).toMatchObject({ success: true });
  });

  // ── requireAuth error propagation ─────────────────────────────────────────

  it("re-throws H3Error from requireAuth without wrapping in 500", async () => {
    const h3Error = Object.assign(new Error("Forbidden"), { statusCode: 403 });
    vi.mocked(requireAuth).mockRejectedValue(h3Error);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  // ── Delete failure → 500 ──────────────────────────────────────────────────

  it("throws 500 when follow_up_reminders delete returns an error", async () => {
    mockDeleteEq.mockResolvedValueOnce({
      count: null,
      error: { message: "db error" },
    });

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 500 when interactions delete returns an error", async () => {
    mockDeleteEq
      .mockResolvedValueOnce({ count: 0, error: null }) // follow_up_reminders OK
      .mockResolvedValueOnce({ count: null, error: { message: "db error" } }); // interactions fails

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
