import { describe, it, expect, beforeEach, vi } from "vitest";

const mockState = {
  data: null as Record<string, unknown> | null,
  error: null as object | null,
};

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseAnonClient: vi.fn(() => ({
    rpc: (fn: string) => {
      if (fn !== "get_family_invitation_by_token") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      return {
        single: () =>
          Promise.resolve({ data: mockState.data, error: mockState.error }),
      };
    },
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRouterParam: vi.fn(() => "test-token"),
  };
});

const { default: handler } =
  await import("~/server/api/family/invite/[token].get");
const mockEvent = {} as Parameters<typeof handler>[0];

describe("GET /api/family/invite/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.error = null;
    mockState.data = {
      invitation_id: "inv-1",
      role: "player",
      family_name: "The Smiths",
      invited_email: "player@example.com",
      error_code: null,
    };
  });

  it("returns invitationId, role, familyName, and invitedEmail — no other fields", async () => {
    const result = await handler(mockEvent);
    expect(result).toEqual({
      invitationId: "inv-1",
      role: "player",
      familyName: "The Smiths",
      invitedEmail: "player@example.com",
    });
  });

  it("works for parent-role invites too", async () => {
    mockState.data = { ...mockState.data, role: "parent" };
    const result = await handler(mockEvent);
    expect(result.role).toBe("parent");
  });

  it("throws 404 when the RPC reports the invitation wasn't found", async () => {
    mockState.data = { error_code: "NOT_FOUND" };
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("throws 409 when invitation status is no longer valid (accepted/declined)", async () => {
    mockState.data = { error_code: "INVALID_STATUS" };
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("throws 410 when the invitation has expired", async () => {
    mockState.data = { error_code: "EXPIRED" };
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 410,
    });
  });

  it("throws 500 on an unrecognized error_code", async () => {
    mockState.data = { error_code: "something_unexpected" };
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("throws 500 when the RPC returns an error", async () => {
    mockState.data = null;
    mockState.error = { message: "db error" };
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("throws 500 when the RPC returns no data and no error", async () => {
    mockState.data = null;
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("throws 400 when token is missing", async () => {
    const { getRouterParam } = await import("h3");
    vi.mocked(getRouterParam).mockReturnValueOnce(undefined);
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
