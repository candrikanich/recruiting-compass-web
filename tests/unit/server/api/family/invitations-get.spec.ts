import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  membership: { family_unit_id: "family-123" } as object | null,
  invitations: null as Array<Record<string, unknown>> | null,
  invitationsError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockState.membership }),
            }),
          }),
        };
      }
      if (table === "family_invitations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({ data: mockState.invitations, error: mockState.invitationsError }),
              }),
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
    createError: (config: { statusCode: number; statusMessage?: string; message?: string }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/invitations/index.get");

describe("GET /api/family/invitations", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.membership = { family_unit_id: "family-123" };
    mockState.invitations = [
      {
        id: "inv-1",
        invited_email: "parent@example.com",
        role: "parent",
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        invited_by: "user-abc",
      },
    ];
    mockState.invitationsError = null;
  });

  it("returns pending invitations for a family member", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ invitations: [{ id: "inv-1", role: "parent" }] });
  });

  it("returns empty array when user has no family membership", async () => {
    mockState.membership = null;
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ invitations: [] });
  });

  it("returns empty array when there are no pending invitations", async () => {
    mockState.invitations = [];
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ invitations: [] });
  });

  it("returns empty array when invitations data is null", async () => {
    mockState.invitations = null;
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ invitations: [] });
  });

  it("returns 500 when the invitations fetch fails", async () => {
    mockState.invitationsError = { message: "db error" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });
});
