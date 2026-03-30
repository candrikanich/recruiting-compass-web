import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  profileRow: null as { id: string } | null,
  linkRow: null as { id: string } | null,
  insertError: null as object | null,
  refToken: null as string | null,
};

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "player_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.profileRow, error: null }),
            }),
          }),
        };
      }
      if (table === "profile_tracking_links") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: mockState.linkRow, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "profile_views") {
        return {
          insert: () => Promise.resolve({ error: mockState.insertError }),
        };
      }
      return {};
    },
    // Top-level rpc — used for increment_profile_link_view
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "abc123"),
    getQuery: vi.fn(() => ({ ref: mockState.refToken })),
    getRequestHeader: vi.fn(() => "Mozilla/5.0"),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/public/profile/[slug]/view.post");

describe("POST /api/public/profile/[slug]/view", () => {
  beforeEach(() => {
    mockState.profileRow = null;
    mockState.linkRow = null;
    mockState.insertError = null;
    mockState.refToken = null;
  });

  it("throws 404 when profile slug not found", async () => {
    mockState.profileRow = null;
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("records anonymous view when no ref token", async () => {
    mockState.profileRow = { id: "p1" };
    mockState.refToken = null;
    const result = await handler({} as any);
    expect(result.ok).toBe(true);
  });

  it("records view and returns ok even if ref token not found", async () => {
    mockState.profileRow = { id: "p1" };
    mockState.refToken = "unknown-token";
    mockState.linkRow = null;
    const result = await handler({} as any);
    expect(result.ok).toBe(true);
  });
});
