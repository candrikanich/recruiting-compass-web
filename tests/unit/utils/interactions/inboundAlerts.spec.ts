import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInboundInteractionAlert } from "~/utils/interactions/inboundAlerts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interaction } from "~/types/models";

describe("Inbound Alerts", () => {
  let mockSupabase: any;
  const userId = "user-1";

  const createInteraction = (overrides?: Partial<Interaction>): Interaction =>
    ({
      id: "interaction-1",
      user_id: userId,
      school_id: "school-1",
      coach_id: "coach-1",
      type: "email" as const,
      direction: "inbound" as const,
      subject: "Test Subject",
      content: "Test Content",
      sentiment: "positive" as const,
      occurred_at: "2024-02-04T10:00:00Z",
      created_at: "2024-02-04T10:00:00Z",
      updated_at: "2024-02-04T10:00:00Z",
      attachment_count: 0,
      ...overrides,
    }) as Interaction;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn(),
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  // ============================================
  // createInboundInteractionAlert Tests
  // ============================================

  describe("createInboundInteractionAlert", () => {
    it("should skip outbound interactions", async () => {
      const interaction = createInteraction({ direction: "outbound" as const });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should fetch user preferences and coach data for inbound interactions", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("user_preferences");
      expect(mockSupabase.from).toHaveBeenCalledWith("coaches");
    });

    it("should create notification when alerts enabled", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should use coach name in notification when available", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].title).toContain("John Doe");
    });

    it("should use generic coach name when coach data unavailable", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].title).toContain("A coach");
    });

    it("should skip notification when alerts disabled", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: false },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("should include interaction type in notification", async () => {
      const interaction = createInteraction({
        direction: "inbound" as const,
        type: "phone" as const,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "Coach", last_name: "Smith" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].message).toContain("phone");
    });

    it("should set notification type to inbound_interaction", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].type).toBe("inbound_interaction");
    });

    it("should include interaction ID in notification", async () => {
      const interaction = createInteraction({
        id: "specific-interaction-id",
        direction: "inbound" as const,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].related_entity_id).toBe("specific-interaction-id");
    });

    it("should handle preference query failure gracefully", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      // Mock to return rejected promise for preferences
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_preferences") {
          return {
            select: vi.fn().mockImplementation(() => {
              return Promise.reject(new Error("Query failed"));
            }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        return mockSupabase;
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      // Should handle gracefully, not throw
      expect(true).toBe(true);
    });

    it("should handle coach query failure gracefully", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });

      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      // Simulate coach fetch failure with Promise.allSettled
      let callCount = 0;
      mockSupabase.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: {
              notification_settings: { enableInboundInteractionAlerts: true },
            },
            error: null,
          });
        }
        // Second call (coach) fails
        return Promise.reject(new Error("Coach query failed"));
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should continue when coach ID is null", async () => {
      const interaction = createInteraction({
        coach_id: null,
        direction: "inbound" as const,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should handle exception thrown during processing", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        createInboundInteractionAlert({
          interaction,
          userId,
          supabase: mockSupabase as SupabaseClient,
        }),
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });

    it("should not throw on notification insert error", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockRejectedValueOnce(new Error("Insert failed"));

      await expect(
        createInboundInteractionAlert({
          interaction,
          userId,
          supabase: mockSupabase as SupabaseClient,
        }),
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });

    it("should trim coach name if empty first or last name", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "", last_name: "Smith" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].title).toContain("Smith");
    });

    it("should set scheduled_for to current timestamp", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });
      const beforeTime = new Date();

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      const scheduledTime = new Date(insertData[0].scheduled_for);
      const afterTime = new Date();

      expect(scheduledTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(scheduledTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should set related_entity_type to interaction", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].related_entity_type).toBe("interaction");
    });

    it("should set user_id in notification", async () => {
      const interaction = createInteraction({ direction: "inbound" as const });
      const specificUserId = "specific-user-id";

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          notification_settings: { enableInboundInteractionAlerts: true },
        },
        error: null,
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { first_name: "John", last_name: "Doe" },
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: [{ id: "notification-1" }],
        error: null,
      });

      await createInboundInteractionAlert({
        interaction,
        userId: specificUserId,
        supabase: mockSupabase as SupabaseClient,
      });

      const [insertData] = mockSupabase.insert.mock.calls[0];
      expect(insertData[0].user_id).toBe(specificUserId);
    });
  });
});
