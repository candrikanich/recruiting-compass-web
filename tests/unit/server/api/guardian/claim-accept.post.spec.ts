import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// The endpoint's family-membership/consent logic now lives entirely inside the
// accept_guardian_claim() Postgres function (see
// supabase/migrations/20260928000003_atomic_guardian_claim_accept.sql) so that
// a failure partway through can't leave a player in a family without
// guardian_consent_at recorded. That function's own branching (family reuse,
// the create-race 23505 path, moving a player between families) is exercised
// by a live-Postgres integration test, not here -- this spec covers only the
// endpoint's own job: call the RPC with the right args and translate its
// result/errors into HTTP responses.

const state = {
  guardian: { id: "guardian-1", email: "parent@example.com" },
};

const mockRpc = vi.fn(async () => ({ data: "fam-1", error: null }) as {
  data: string | null;
  error: { message: string } | null;
});

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ rpc: mockRpc })),
}));
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => state.guardian),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "tok-1"),
  };
});
vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal("createError", createError);

const { default: handler } = await import(
  "~/server/api/guardian/claim/[token]/accept.post"
);

describe("POST /api/guardian/claim/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardian = { id: "guardian-1", email: "parent@example.com" };
    mockRpc.mockResolvedValue({ data: "fam-1", error: null });
  });

  it("calls accept_guardian_claim with the token, guardian, and terms version", async () => {
    await handler({} as never);

    expect(mockRpc).toHaveBeenCalledWith("accept_guardian_claim", {
      p_token: "tok-1",
      p_guardian_id: "guardian-1",
      p_guardian_email: "parent@example.com",
      p_terms_version: expect.any(String),
    });
  });

  it("returns the family unit id from the RPC on success", async () => {
    const result = await handler({} as never);

    expect(result).toMatchObject({ success: true, familyUnitId: "fam-1" });
  });

  it("requires the caller to have an email on file", async () => {
    state.guardian = { id: "guardian-1", email: null as unknown as string };

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps CLAIM_NOT_FOUND to 404", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "CLAIM_NOT_FOUND" } });

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("maps CLAIM_ALREADY_CLAIMED to 409", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "CLAIM_ALREADY_CLAIMED" } });

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("maps CLAIM_INVALID to 410", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "CLAIM_INVALID" } });

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 410 });
  });

  it("maps CLAIM_EXPIRED to 410", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "CLAIM_EXPIRED" } });

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 410 });
  });

  it("maps CLAIM_EMAIL_MISMATCH to 403 without leaking the claim's guardian_email", async () => {
    // Otherwise a forwarded link lets any account consent on a minor's behalf.
    mockRpc.mockResolvedValue({ data: null, error: { message: "CLAIM_EMAIL_MISMATCH" } });

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("maps any other RPC error to 500", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 500 });
  });
});
