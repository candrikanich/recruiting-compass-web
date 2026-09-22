import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
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
  memberships: [{ family_unit_id: "family-1" }] as
    | { family_unit_id: string }[]
    | null,
  families: [
    { id: "family-1", inbound_token: "5b011cb7", family_name: "The Smiths" },
  ] as { id: string; inbound_token: string; family_name: string }[] | null,
};

vi.mock("~/server/utils/supabase", () => ({
  // resolveFamilyUnitIds queries family_members via the admin client.
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: async () => ({ data: mockState.memberships, error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
  // The handler itself queries family_units via the session-scoped client.
  createServerSupabaseUserClient: () => ({
    from: (table: string) => {
      if (table === "family_units") {
        return {
          select: () => ({
            in: async () => ({ data: mockState.families, error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("#imports", () => ({
  useRuntimeConfig: () => ({
    public: { inboundEmailDomain: "belauso.resend.app" },
  }),
}));

import { requireAuth } from "~/server/utils/auth";

describe("GET /api/family/inbound-address", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    mockState.memberships = [{ family_unit_id: "family-1" }];
    mockState.families = [
      { id: "family-1", inbound_token: "5b011cb7", family_name: "The Smiths" },
    ];
  });

  it("returns the full forwarding address", async () => {
    const { default: handler } =
      await import("~/server/api/family/inbound-address.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      addresses: [
        {
          familyUnitId: "family-1",
          familyName: "The Smiths",
          address: "family-5b011cb7@belauso.resend.app",
        },
      ],
    });
  });

  it("returns one address per family for a multi-family parent", async () => {
    mockState.memberships = [
      { family_unit_id: "family-1" },
      { family_unit_id: "family-2" },
    ];
    mockState.families = [
      { id: "family-1", inbound_token: "5b011cb7", family_name: "The Smiths" },
      { id: "family-2", inbound_token: "9f2c1a44", family_name: "The Joneses" },
    ];
    const { default: handler } =
      await import("~/server/api/family/inbound-address.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      addresses: [
        {
          familyUnitId: "family-1",
          familyName: "The Smiths",
          address: "family-5b011cb7@belauso.resend.app",
        },
        {
          familyUnitId: "family-2",
          familyName: "The Joneses",
          address: "family-9f2c1a44@belauso.resend.app",
        },
      ],
    });
  });

  it("403s when the caller has no family", async () => {
    mockState.memberships = [];
    const { default: handler } =
      await import("~/server/api/family/inbound-address.get");
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
