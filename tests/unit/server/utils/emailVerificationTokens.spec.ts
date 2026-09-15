import { describe, it, expect, vi, beforeEach } from "vitest";

let mockTokenUpdateCalls: Record<string, unknown>[] = [];
let mockInsertCalls: Record<string, unknown>[] = [];
let mockRpcCalls: { name: string; params: Record<string, unknown> }[] = [];
let mockRpcResult: { data: { status: string; user_id: string | null } | null; error: { message: string } | null } = {
  data: null,
  error: null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "email_verification_tokens") {
        return {
          update: (fields: Record<string, unknown>) => {
            mockTokenUpdateCalls.push(fields);
            // issueVerificationToken chains .eq(...).is(...).is(...) to
            // double-guard on consumed_at AND invalidated_at when
            // invalidating a prior token on resend.
            const isResult = Object.assign(Promise.resolve({ error: null }), {
              is: async () => ({ error: null }),
            });
            const eqResult = Object.assign(Promise.resolve({ error: null }), {
              is: () => isResult,
            });
            return { eq: () => eqResult };
          },
          insert: (fields: Record<string, unknown>) => {
            mockInsertCalls.push(fields);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    rpc: (name: string, params: Record<string, unknown>) => {
      mockRpcCalls.push({ name, params });
      return { single: async () => mockRpcResult };
    },
  })),
}));

import {
  issueVerificationToken,
  consumeVerificationToken,
} from "~/server/utils/emailVerificationTokens";

describe("emailVerificationTokens", () => {
  beforeEach(() => {
    mockTokenUpdateCalls = [];
    mockInsertCalls = [];
    mockRpcCalls = [];
    mockRpcResult = { data: null, error: null };
  });

  it("issues a token with a 24h expiry and invalidates prior tokens first", async () => {
    const { token, expiresAt } = await issueVerificationToken("user-1");

    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    const expiresMs = new Date(expiresAt).getTime() - Date.now();
    expect(expiresMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(expiresMs).toBeLessThan(24.1 * 60 * 60 * 1000);
    expect(mockTokenUpdateCalls).toEqual([{ invalidated_at: expect.any(String) }]);
    expect(mockInsertCalls[0]).toMatchObject({ user_id: "user-1", token });
  });

  it("delegates consumption to the atomic consume_email_verification_token RPC", async () => {
    mockRpcResult = { data: { status: "verified", user_id: "user-1" }, error: null };

    const result = await consumeVerificationToken("good");

    expect(mockRpcCalls).toEqual([
      { name: "consume_email_verification_token", params: { p_token: "good" } },
    ]);
    expect(result).toEqual({ status: "verified", userId: "user-1" });
  });

  it("returns not_found for an unknown token", async () => {
    mockRpcResult = { data: { status: "not_found", user_id: null }, error: null };
    const result = await consumeVerificationToken("missing");
    expect(result).toEqual({ status: "not_found", userId: undefined });
  });

  it("returns expired for a lapsed token", async () => {
    mockRpcResult = { data: { status: "expired", user_id: null }, error: null };
    const result = await consumeVerificationToken("stale");
    expect(result).toEqual({ status: "expired", userId: undefined });
  });

  it("returns already_verified for a consumed token, idempotently", async () => {
    mockRpcResult = { data: { status: "already_verified", user_id: "user-1" }, error: null };
    const result = await consumeVerificationToken("used");
    expect(result).toEqual({ status: "already_verified", userId: "user-1" });
  });

  it("returns invalidated for a token superseded by a resend, without touching email_verified_at", async () => {
    mockRpcResult = { data: { status: "invalidated", user_id: "user-1" }, error: null };
    const result = await consumeVerificationToken("invalidated-by-resend");
    expect(result).toEqual({ status: "invalidated", userId: "user-1" });
  });

  // Root-cause regression: the two-write sequence (mark token consumed, then
  // stamp users.email_verified_at) used to be two independent Supabase calls
  // that only checked `.error`, which stays null on a zero-row-matched
  // update. A missing/mismatched profile row silently reported "verified"
  // with email_verified_at never written. The DB function now does both
  // writes in one transaction and raises when the profile update affects
  // zero rows, rolling back the token-consumed write too — the RPC surfaces
  // that as a Postgres error, which the wrapper must propagate, not swallow.
  it("propagates a DB error instead of reporting success when the profile row is missing", async () => {
    mockRpcResult = {
      data: null,
      error: { message: "consume_email_verification_token: no users row for user-1" },
    };

    await expect(consumeVerificationToken("good")).rejects.toThrow(
      "consume_email_verification_token: no users row for user-1",
    );
  });

  it("propagates a DB error on the already-consumed retry path too", async () => {
    // Same failure class, but reached via a retry that lands in the
    // already-consumed branch inside the DB function — this is exactly the
    // case PR #841 left unguarded (client-side fix only checked the first
    // consume path).
    mockRpcResult = {
      data: null,
      error: { message: "consume_email_verification_token: no users row for user-1" },
    };

    await expect(consumeVerificationToken("used")).rejects.toThrow(
      "consume_email_verification_token: no users row for user-1",
    );
  });
});
