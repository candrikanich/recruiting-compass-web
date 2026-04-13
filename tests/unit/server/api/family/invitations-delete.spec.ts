import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  invitationId: "invite-123" as string,
  deleteError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_invitations") {
        return {
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: mockState.deleteError }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => mockState.invitationId),
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/family/invitations/[id].delete");

describe("DELETE /api/family/invitations/[id]", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.invitationId = "invite-123";
    mockState.deleteError = null;
  });

  it("revokes an invitation successfully", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("returns 400 when invitation ID is missing", async () => {
    mockState.invitationId = "";
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 500 when the delete fails", async () => {
    mockState.deleteError = { message: "foreign key violation" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
