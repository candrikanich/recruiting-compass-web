import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock state holders
let mockExistingClaim: { value: unknown } = { value: null };
let mockInsertError: unknown = null;
let mockBody: Record<string, unknown> = {};

const mockInsert = vi.fn(async () => ({ error: mockInsertError }));

// All vi.mock calls first
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "player-1", email: "player@example.com" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ success: true })),
  throwIfRateLimited: vi.fn(),
}));

vi.mock("~/server/utils/emailService", () => ({
  sendGuardianClaimEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockExistingClaim.value }),
          }),
        }),
      }),
      insert: mockInsert,
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  })),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    readBody: vi.fn(async () => mockBody),
  };
});

import handler from "~/server/api/guardian/resend.post";

const fakeEvent = {} as Parameters<typeof handler>[0];

describe("POST /api/guardian/resend — no existing claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingClaim = { value: null };
    mockInsertError = null;
    mockBody = {};
  });

  it("creates a fresh claim when no claim exists and an email is provided", async () => {
    mockBody = { guardianEmail: "newparent@example.com" };

    const result = await handler(fakeEvent);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        player_user_id: "player-1",
        guardian_email: "newparent@example.com",
      }),
    );
  });

  it("rejects when no claim exists and no email is provided", async () => {
    mockBody = {};

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a guardian email equal to the player's own", async () => {
    mockBody = { guardianEmail: "player@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
