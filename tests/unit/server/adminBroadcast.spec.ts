import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Import the schema directly by re-exporting it from the module under test.
// Since we only want to test Zod schema validation (not Supabase calls),
// we mock the heavy dependencies and exercise broadcastSchema directly.

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn(async () => ({
    id: "admin-uuid",
    email: "admin@example.com",
  })),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
  useSupabaseAdmin: vi.fn(() => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "users")
        return {
          select: vi
            .fn()
            .mockReturnValue({ data: [{ id: "user-1" }], error: null }),
        };
      if (table === "notifications")
        return { insert: vi.fn().mockReturnValue({ error: null }) };
      return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
    });
    return { from: mockFrom };
  }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async (event: any) => event._body),
  };
});

// Import the exported schema AFTER mocks are in place
const { broadcastSchema } =
  await import("~/server/api/admin/notifications/broadcast.post");

describe("broadcastSchema validation", () => {
  describe("valid inputs", () => {
    it("accepts a valid all-users broadcast", () => {
      const result = broadcastSchema.safeParse({
        target: "all",
        type: "weekly_digest",
        title: "Weekly Digest",
        message: "Here is your weekly summary.",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid single-user broadcast with a UUID", () => {
      const result = broadcastSchema.safeParse({
        target: "user",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "follow_up_reminder",
        title: "Follow up with Coach Smith",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid notification types", () => {
      const types = [
        "follow_up_reminder",
        "deadline_alert",
        "weekly_digest",
        "event",
      ] as const;
      for (const type of types) {
        const result = broadcastSchema.safeParse({
          target: "all",
          type,
          title: "Test",
        });
        expect(result.success, `type '${type}' should be valid`).toBe(true);
      }
    });

    it("accepts a broadcast without an optional message", () => {
      const result = broadcastSchema.safeParse({
        target: "all",
        type: "deadline_alert",
        title: "Deadline approaching",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects an empty title", () => {
      const result = broadcastSchema.safeParse({
        target: "all",
        type: "weekly_digest",
        title: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.issues.map((i) => i.path[0]);
        expect(fields).toContain("title");
      }
    });

    it("rejects a title exceeding 200 characters", () => {
      const result = broadcastSchema.safeParse({
        target: "all",
        type: "weekly_digest",
        title: "x".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown notification type", () => {
      const result = broadcastSchema.safeParse({
        target: "all",
        type: "promo_blast",
        title: "Flash sale",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.issues.map((i) => i.path[0]);
        expect(fields).toContain("type");
      }
    });

    it("rejects a non-UUID user_id", () => {
      const result = broadcastSchema.safeParse({
        target: "user",
        user_id: "not-a-uuid",
        type: "follow_up_reminder",
        title: "Hey",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.issues.map((i) => i.path[0]);
        expect(fields).toContain("user_id");
      }
    });

    it("rejects an unknown target value", () => {
      const result = broadcastSchema.safeParse({
        target: "group",
        type: "event",
        title: "Team meeting",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a message exceeding 1000 characters", () => {
      const result = broadcastSchema.safeParse({
        target: "all",
        type: "event",
        title: "Big event",
        message: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cross-field rules", () => {
    it("schema allows target=user without user_id (runtime guard enforces this)", () => {
      const result = broadcastSchema.safeParse({
        target: "user",
        type: "event",
        title: "Test",
      });
      // Zod doesn't enforce cross-field — runtime handler does
      expect(result.success).toBe(true);
    });
  });
});
