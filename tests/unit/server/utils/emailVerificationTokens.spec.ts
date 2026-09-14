import { describe, it, expect, vi, beforeEach } from "vitest";

let mockTokenRow: Record<string, unknown> | null = null;
let mockUpdateCalls: Record<string, unknown>[] = [];
let mockInsertCalls: Record<string, unknown>[] = [];

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "email_verification_tokens") {
        return {
          update: (fields: Record<string, unknown>) => {
            mockUpdateCalls.push(fields);
            return {
              eq: () => ({
                is: async () => ({ error: null }),
              }),
            };
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
            mockUpdateCalls.push(fields);
            return {
              eq: async () => ({ error: null }),
            };
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
    mockUpdateCalls = [];
    mockInsertCalls = [];
  });

  it("issues a token with a 24h expiry and invalidates prior tokens first", async () => {
    const { token, expiresAt } = await issueVerificationToken("user-1");

    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    const expiresMs = new Date(expiresAt).getTime() - Date.now();
    expect(expiresMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(expiresMs).toBeLessThan(24.1 * 60 * 60 * 1000);
    expect(mockUpdateCalls).toEqual([{ consumed_at: expect.any(String) }]);
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

  it("verifies a valid unconsumed token", async () => {
    mockTokenRow = {
      user_id: "user-1",
      expires_at: new Date(Date.now() + 1000).toISOString(),
      consumed_at: null,
    };
    const result = await consumeVerificationToken("good");
    expect(result.status).toBe("verified");
    expect(result.userId).toBe("user-1");
  });
});
