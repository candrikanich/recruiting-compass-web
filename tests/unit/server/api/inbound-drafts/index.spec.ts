import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn, getQuery: vi.fn() };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  membership: undefined as { family_unit_id: string } | null | undefined,
  queryCalled: false as boolean,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: mockState.membership, error: mockState.membership ? null : { code: "PGRST116" } }),
            }),
          }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => {
                  mockState.queryCalled = true;
                  return { data: [{ id: "draft-1", status: "pending" }], error: null };
                },
              }),
              order: async () => {
                mockState.queryCalled = false;
                return { data: [{ id: "draft-1", status: "all-statuses" }], error: null };
              },
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("GET /api/inbound-drafts", () => {
  beforeEach(() => {
    vi.mocked(getQuery).mockReturnValue({});
    mockState.membership = { family_unit_id: "family-1" };
    mockState.queryCalled = false;
  });

  it("returns 403 when the caller has no family membership", async () => {
    mockState.membership = null;
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } = await import("~/server/api/inbound-drafts/index.get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns the family's pending drafts by default", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } = await import("~/server/api/inbound-drafts/index.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ drafts: [{ id: "draft-1", status: "pending" }] });
  });

  it("returns all drafts (all statuses) when ?status=all", async () => {
    vi.mocked(getQuery).mockReturnValue({ status: "all" });
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } = await import("~/server/api/inbound-drafts/index.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ drafts: [{ id: "draft-1", status: "all-statuses" }] });
    expect(mockState.queryCalled).toBe(false);
  });
});
