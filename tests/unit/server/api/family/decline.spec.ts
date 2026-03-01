import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  token: "valid-token" as string,
  invitation: null as Record<string, unknown> | null,
  updateError: null as object | null,
};

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_invitations") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockState.invitation }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: mockState.updateError }),
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
    getRouterParam: vi.fn(() => mockState.token),
    createError: (config: { statusCode: number; statusMessage?: string; message?: string }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & { statusCode: number };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/invite/[token]/decline.post");

describe("POST /api/family/invite/[token]/decline", () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 1000).toISOString();

  beforeEach(() => {
    mockState.token = "valid-token";
    mockState.invitation = { id: "invite-abc", status: "pending", expires_at: futureDate };
    mockState.updateError = null;
  });

  it("declines a pending invitation", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("returns 404 for unknown token", async () => {
    mockState.invitation = null;
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 409 for already-accepted invitation", async () => {
    mockState.invitation = { ...mockState.invitation!, status: "accepted" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 409 for already-declined invitation", async () => {
    mockState.invitation = { ...mockState.invitation!, status: "declined" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 410 for expired invitation", async () => {
    mockState.invitation = { ...mockState.invitation!, expires_at: pastDate };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 410 });
  });

  it("returns 400 when token is missing", async () => {
    mockState.token = "";
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 500 when DB update fails", async () => {
    mockState.updateError = { message: "db error" };
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 500 });
  });
});
