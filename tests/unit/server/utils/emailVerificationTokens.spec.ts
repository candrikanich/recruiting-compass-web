import { describe, it, expect, vi, beforeEach } from "vitest";

let mockTokenRow: Record<string, unknown> | null = null;
let mockTokenUpdateCalls: Record<string, unknown>[] = [];
let mockInsertCalls: Record<string, unknown>[] = [];
let mockUsersUpdateCalls: Record<string, unknown>[] = [];
let mockTokenUpdateError: { message: string } | null = null;
let mockUsersUpdateError: { message: string } | null = null;

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "email_verification_tokens") {
        return {
          update: (fields: Record<string, unknown>) => {
            mockTokenUpdateCalls.push(fields);
            // .eq(...) is awaitable on its own (the plain consume-token path)
            // AND chains into .is(...) for the resend-invalidation path.
            const eqResult = Object.assign(
              Promise.resolve({ error: mockTokenUpdateError }),
              { is: async () => ({ error: mockTokenUpdateError }) },
            );
            return { eq: () => eqResult };
          },
          insert: (fields: Record<string, unknown>) => {
            mockInsertCalls.push(fields);
            return { error: null };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockTokenRow }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          update: (fields: Record<string, unknown>) => {
            mockUsersUpdateCalls.push(fields);
            // .eq(...) is awaitable on its own AND chains into .is(...) for
            // the "only if still null" guard on the already_verified path.
            const eqResult = Object.assign(
              Promise.resolve({ error: mockUsersUpdateError }),
              { is: async () => ({ error: mockUsersUpdateError }) },
            );
            return { eq: () => eqResult };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

import {
  issueVerificationToken,
  consumeVerificationToken,
} from "~/server/utils/emailVerificationTokens";

describe("emailVerificationTokens", () => {
  beforeEach(() => {
    mockTokenRow = null;
    mockTokenUpdateCalls = [];
    mockInsertCalls = [];
    mockUsersUpdateCalls = [];
    mockTokenUpdateError = null;
    mockUsersUpdateError = null;
  });

  it("issues a token with a 24h expiry and invalidates prior tokens first", async () => {
    const { token, expiresAt } = await issueVerificationToken("user-1");

    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    const expiresMs = new Date(expiresAt).getTime() - Date.now();
    expect(expiresMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(expiresMs).toBeLessThan(24.1 * 60 * 60 * 1000);
    expect(mockTokenUpdateCalls).toEqual([{ consumed_at: expect.any(String) }]);
    expect(mockInsertCalls[0]).toMatchObject({ user_id: "user-1", token });
  });

  it("returns not_found for an unknown token", async () => {
    mockTokenRow = null;
    const result = await consumeVerificationToken("missing");
    expect(result.status).toBe("not_found");
  });

  it("returns expired for a lapsed token", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      consumed_at: null,
    };
    const result = await consumeVerificationToken("stale");
    expect(result.status).toBe("expired");
  });

  it("returns already_verified for a consumed token, idempotently", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: new Date().toISOString(),
    };
    const result = await consumeVerificationToken("used");
    expect(result.status).toBe("already_verified");
    expect(result.userId).toBe("user-1");
  });

  it("stamps email_verified_at on a consumed token that was never verified", async () => {
    // consumed_at is also set when issueVerificationToken invalidates a prior
    // token on resend — clicking that older email must not report success
    // while leaving users.email_verified_at null.
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: new Date().toISOString(),
    };

    const result = await consumeVerificationToken("invalidated-by-resend");

    expect(result.status).toBe("already_verified");
    expect(mockUsersUpdateCalls[0]).toMatchObject({
      email_verified_at: expect.any(String),
    });
  });

  it("verifies a valid unconsumed token", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: null,
    };
    const result = await consumeVerificationToken("good");
    expect(result.status).toBe("verified");
    expect(result.userId).toBe("user-1");
    // Verify that token was marked consumed
    expect(mockTokenUpdateCalls[0]).toMatchObject({
      consumed_at: expect.any(String),
    });
    // Verify that users.email_verified_at was set (the key side effect)
    expect(mockUsersUpdateCalls[0]).toMatchObject({
      email_verified_at: expect.any(String),
    });
  });

  it("does not report verified when marking the token consumed fails", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: null,
    };
    mockTokenUpdateError = { message: "connection reset" };

    await expect(consumeVerificationToken("good")).rejects.toThrow(
      "connection reset",
    );
    // Must not have gone on to stamp email_verified_at off an unconfirmed write.
    expect(mockUsersUpdateCalls).toEqual([]);
  });

  it("does not report verified when stamping email_verified_at fails", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: null,
    };
    mockUsersUpdateError = { message: "connection reset" };

    await expect(consumeVerificationToken("good")).rejects.toThrow(
      "connection reset",
    );
  });

  it("does not report already_verified on retry when the profile write failed both times", async () => {
    // First request: token gets marked consumed, then the users update
    // throws (simulated by the caller not being modeled here — we start
    // the retry from the post-consume state the first call would have left).
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: new Date().toISOString(),
    };
    mockUsersUpdateError = { message: "connection reset" };

    // Retry lands in the already-consumed branch; its backfill also fails.
    await expect(consumeVerificationToken("good")).rejects.toThrow(
      "connection reset",
    );
  });
});
