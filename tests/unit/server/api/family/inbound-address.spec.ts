import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  membership: { family_unit_id: "family-1" } as { family_unit_id: string } | null,
  family: { inbound_token: "5b011cb7" } as { inbound_token: string } | null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: mockState.membership, error: null }) }) }) };
      }
      if (table === "family_units") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: mockState.family, error: null }) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => ({ public: { inboundEmailDomain: "belauso.resend.app" } }) }));

import { requireAuth } from "~/server/utils/auth";

describe("GET /api/family/inbound-address", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    mockState.membership = { family_unit_id: "family-1" };
    mockState.family = { inbound_token: "5b011cb7" };
  });

  it("returns the full forwarding address", async () => {
    const { default: handler } = await import("~/server/api/family/inbound-address.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ address: "family-5b011cb7@belauso.resend.app" });
  });

  it("403s when the caller has no family", async () => {
    mockState.membership = null;
    const { default: handler } = await import("~/server/api/family/inbound-address.get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });
});
