import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
  };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockState = {
  memberships: undefined as { family_unit_id: string }[] | null | undefined,
  queryCalled: false as boolean,
  inFilteredWith: undefined as string[] | undefined,
};

const fakeClient = () => ({
  from: (table: string) => {
    if (table === "family_members") {
      return {
        select: () => ({
          eq: async () => ({
            data: mockState.memberships,
            error: null,
          }),
        }),
      };
    }
    if (table === "inbound_email_drafts") {
      return {
        select: () => ({
          in: (_col: string, ids: string[]) => {
            mockState.inFilteredWith = ids;
            return {
              eq: () => ({
                order: async () => {
                  mockState.queryCalled = true;
                  return {
                    data: [{ id: "draft-1", status: "pending" }],
                    error: null,
                  };
                },
              }),
              order: async () => {
                mockState.queryCalled = false;
                return {
                  data: [{ id: "draft-1", status: "all-statuses" }],
                  error: null,
                };
              },
            };
          },
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  },
});

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: fakeClient,
  createServerSupabaseUserClient: fakeClient,
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

import { getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("GET /api/inbound-drafts", () => {
  beforeEach(() => {
    vi.mocked(getQuery).mockReturnValue({});
    mockState.memberships = [{ family_unit_id: "family-1" }];
    mockState.queryCalled = false;
    mockState.inFilteredWith = undefined;
  });

  it("returns 403 when the caller has no family membership", async () => {
    mockState.memberships = [];
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } =
      await import("~/server/api/inbound-drafts/index.get");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns the family's pending drafts by default", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } =
      await import("~/server/api/inbound-drafts/index.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ drafts: [{ id: "draft-1", status: "pending" }] });
  });

  it("queries drafts across every family for a multi-family parent", async () => {
    mockState.memberships = [
      { family_unit_id: "family-1" },
      { family_unit_id: "family-2" },
    ];
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } =
      await import("~/server/api/inbound-drafts/index.get");
    await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.inFilteredWith).toEqual(["family-1", "family-2"]);
  });

  it("returns all drafts (all statuses) when ?status=all", async () => {
    vi.mocked(getQuery).mockReturnValue({ status: "all" });
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } =
      await import("~/server/api/inbound-drafts/index.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      drafts: [{ id: "draft-1", status: "all-statuses" }],
    });
    expect(mockState.queryCalled).toBe(false);
  });

  it("400s on an unrecognized status value", async () => {
    vi.mocked(getQuery).mockReturnValue({ status: "bogus" });
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } =
      await import("~/server/api/inbound-drafts/index.get");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("400s when status is repeated as a query param (array, not a string)", async () => {
    vi.mocked(getQuery).mockReturnValue({ status: ["pending", "confirmed"] });
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } =
      await import("~/server/api/inbound-drafts/index.get");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
