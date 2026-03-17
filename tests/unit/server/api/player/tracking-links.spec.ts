import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  coachId: "coach-xyz",
  membership: { family_unit_id: "family-123" } as { family_unit_id: string } | null,
  profileRow: null as { id: string } | null,
  existingLink: null as Record<string, unknown> | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.membership, error: null }),
            }),
          }),
        };
      }
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
                  Promise.resolve({ data: mockState.existingLink, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "link-1",
                    profile_id: "p1",
                    coach_id: mockState.coachId,
                    ref_token: "tok123abc",
                    view_count: 0,
                    last_viewed_at: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => mockState.coachId),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & { statusCode: number };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

const { default: getHandler } = await import(
  "~/server/api/player/profile/tracking-links/[coachId].get"
);
const { default: postHandler } = await import(
  "~/server/api/player/profile/tracking-links/[coachId].post"
);

describe("Tracking Links API", () => {
  beforeEach(() => {
    mockState.membership = { family_unit_id: "family-123" };
    mockState.profileRow = { id: "p1" };
    mockState.existingLink = null;
  });

  describe("GET /api/player/profile/tracking-links/[coachId]", () => {
    it("returns null when no link exists for this coach", async () => {
      mockState.existingLink = null;
      const result = await getHandler({} as any);
      expect(result).toBeNull();
    });

    it("returns existing link with view stats", async () => {
      mockState.existingLink = {
        id: "link-1",
        ref_token: "tok123abc",
        view_count: 5,
        last_viewed_at: "2026-03-10T12:00:00Z",
      };
      const result = await getHandler({} as any);
      expect(result.ref_token).toBe("tok123abc");
      expect(result.view_count).toBe(5);
    });
  });

  describe("POST /api/player/profile/tracking-links/[coachId]", () => {
    it("returns existing link when one already exists (idempotent)", async () => {
      mockState.existingLink = {
        id: "link-1",
        ref_token: "existing-tok",
        view_count: 3,
        last_viewed_at: null,
      };
      const result = await postHandler({} as any);
      expect(result.ref_token).toBe("existing-tok");
    });

    it("creates a new link when none exists", async () => {
      mockState.existingLink = null;
      const result = await postHandler({} as any);
      expect(result.ref_token).toBeDefined();
      expect(result.coach_id).toBe("coach-xyz");
    });

    it("returns 404 when player has no profile", async () => {
      mockState.profileRow = null;
      await expect(postHandler({} as any)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
