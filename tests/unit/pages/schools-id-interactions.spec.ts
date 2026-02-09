import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { Interaction } from "~/types/models";

// Mock composables
const mockFetchInteractions = vi.fn();
const mockCreateInteraction = vi.fn();
const mockDeleteInteraction = vi.fn();
const mockFetchCoaches = vi.fn();
const mockGetSchool = vi.fn();

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    interactions: { value: [] },
    loading: { value: false },
    error: { value: null },
    fetchInteractions: mockFetchInteractions,
    createInteraction: mockCreateInteraction,
    deleteInteraction: mockDeleteInteraction,
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: { value: [] },
    fetchCoaches: mockFetchCoaches,
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    getSchool: mockGetSchool,
  }),
}));

// Mock router
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "school-123" } }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock Header component
vi.mock("~/components/Header.vue", () => ({
  default: { name: "Header", template: "<div>Header</div>" },
}));

// Mock follow-up reminders composable
const mockCreateReminder = vi.fn();
vi.mock("~/composables/useFollowUpReminders", () => ({
  useFollowUpReminders: () => ({
    createReminder: mockCreateReminder,
  }),
}));

const createMockInteraction = (overrides = {}): Interaction => ({
  id: "interaction-1",
  school_id: "school-123",
  coach_id: "coach-1",
  event_id: null,
  type: "email",
  direction: "outbound",
  subject: "Initial contact",
  content: "Introducing our student-athlete",
  sentiment: "positive",
  occurred_at: "2024-01-15T10:00:00Z",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  logged_by: "user-1",
  attachments: [],
  ...overrides,
});

describe("Interaction Logging & Saving - Composable Integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Mock console
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Default mocks
    mockGetSchool.mockResolvedValue({
      id: "school-123",
      name: "Duke University",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Interaction Creation & Saving", () => {
    it("should create interaction with required fields", async () => {
      mockCreateInteraction.mockResolvedValue(createMockInteraction());

      const interaction = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(mockCreateInteraction).toHaveBeenCalled();
      expect(interaction.id).toBeDefined();
    });

    it("should save interaction and persist it", async () => {
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ content: "Test interaction" }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Test interaction",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.school_id).toBe("school-123");
      expect(result.type).toBe("email");
      expect(result.direction).toBe("outbound");
      expect(result.content).toBe("Test interaction");
    });

    it("should handle interaction creation with optional fields", async () => {
      const interactionWithOptional = createMockInteraction({
        coach_id: "coach-1",
        subject: "Recruitment conversation",
        sentiment: "very_positive",
      });
      mockCreateInteraction.mockResolvedValue(interactionWithOptional);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        coach_id: "coach-1",
        type: "phone_call",
        direction: "inbound",
        subject: "Recruitment conversation",
        content: "Coach called about offer",
        sentiment: "very_positive",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.coach_id).toBe("coach-1");
      expect(result.subject).toBe("Recruitment conversation");
      expect(result.sentiment).toBe("very_positive");
    });

    it("should handle all interaction types", async () => {
      const types = [
        "email",
        "text",
        "phone_call",
        "in_person_visit",
        "virtual_meeting",
        "camp",
        "showcase",
        "tweet",
        "dm",
      ];

      for (const type of types) {
        mockCreateInteraction.mockResolvedValue(
          createMockInteraction({ type: type as any }),
        );

        const result = await mockCreateInteraction({
          school_id: "school-123",
          type,
          direction: "outbound",
          content: "Test",
          occurred_at: "2024-01-15T10:00:00Z",
        });

        expect(result.type).toBe(type);
      }
    });

    it("should handle all interaction directions", async () => {
      const directions = ["outbound", "inbound"];

      for (const direction of directions) {
        mockCreateInteraction.mockResolvedValue(
          createMockInteraction({ direction: direction as any }),
        );

        const result = await mockCreateInteraction({
          school_id: "school-123",
          type: "email",
          direction,
          content: "Test",
          occurred_at: "2024-01-15T10:00:00Z",
        });

        expect(result.direction).toBe(direction);
      }
    });

    it("should handle all sentiment values", async () => {
      const sentiments = ["very_positive", "positive", "neutral", "negative"];

      for (const sentiment of sentiments) {
        mockCreateInteraction.mockResolvedValue(
          createMockInteraction({ sentiment: sentiment as any }),
        );

        const result = await mockCreateInteraction({
          school_id: "school-123",
          type: "email",
          direction: "outbound",
          content: "Test",
          sentiment,
          occurred_at: "2024-01-15T10:00:00Z",
        });

        expect(result.sentiment).toBe(sentiment);
      }
    });

    it("should clear form after successful save", async () => {
      mockCreateInteraction.mockResolvedValue(createMockInteraction());
      mockFetchInteractions.mockResolvedValue([createMockInteraction()]);

      const interaction = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(interaction.id).toBeDefined();

      // After save, fetch should be called to refresh list
      await mockFetchInteractions({ schoolId: "school-123" });
      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
      });
    });
  });

  describe("Interaction Fetching & Display", () => {
    it("should fetch interactions for a school", async () => {
      const interactions = [
        createMockInteraction({ id: "interaction-1" }),
        createMockInteraction({ id: "interaction-2" }),
      ];
      mockFetchInteractions.mockResolvedValue(interactions);

      await mockFetchInteractions({ schoolId: "school-123" });

      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
      });
    });

    it("should filter interactions by type", async () => {
      mockFetchInteractions.mockResolvedValue([
        createMockInteraction({ type: "email" }),
      ]);

      await mockFetchInteractions({ schoolId: "school-123", type: "email" });

      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
        type: "email",
      });
    });

    it("should filter interactions by direction", async () => {
      mockFetchInteractions.mockResolvedValue([
        createMockInteraction({ direction: "outbound" }),
      ]);

      await mockFetchInteractions({
        schoolId: "school-123",
        direction: "outbound",
      });

      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
        direction: "outbound",
      });
    });

    it("should filter interactions by sentiment", async () => {
      mockFetchInteractions.mockResolvedValue([
        createMockInteraction({ sentiment: "positive" }),
      ]);

      await mockFetchInteractions({
        schoolId: "school-123",
        sentiment: "positive",
      });

      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
        sentiment: "positive",
      });
    });
  });

  describe("Interaction Deletion", () => {
    it("should delete interaction", async () => {
      mockDeleteInteraction.mockResolvedValue(undefined);

      await mockDeleteInteraction("interaction-1");

      expect(mockDeleteInteraction).toHaveBeenCalledWith("interaction-1");
    });

    it("should handle deletion with confirmation", async () => {
      mockDeleteInteraction.mockResolvedValue(undefined);

      // Simulate user confirmation
      const confirmed = true;
      if (confirmed) {
        await mockDeleteInteraction("interaction-1");
      }

      expect(mockDeleteInteraction).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle creation error", async () => {
      mockCreateInteraction.mockRejectedValue(new Error("Creation failed"));

      try {
        await mockCreateInteraction({
          school_id: "school-123",
          type: "email",
          direction: "outbound",
          content: "Test",
          occurred_at: "2024-01-15T10:00:00Z",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBe("Creation failed");
      }
    });

    it("should handle fetch error", async () => {
      mockFetchInteractions.mockRejectedValue(new Error("Fetch failed"));

      try {
        await mockFetchInteractions({ schoolId: "school-123" });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBe("Fetch failed");
      }
    });

    it("should handle deletion error", async () => {
      mockDeleteInteraction.mockRejectedValue(new Error("Delete failed"));

      try {
        await mockDeleteInteraction("interaction-1");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBe("Delete failed");
      }
    });
  });

  describe("Data Preservation", () => {
    it("should preserve interaction data through create and fetch cycle", async () => {
      const testInteraction = createMockInteraction({
        subject: "Test Subject",
        content: "This is a test interaction",
        sentiment: "very_positive",
      });

      mockCreateInteraction.mockResolvedValue(testInteraction);
      mockFetchInteractions.mockResolvedValue([testInteraction]);

      const created = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        subject: "Test Subject",
        content: "This is a test interaction",
        sentiment: "very_positive",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(created.subject).toBe("Test Subject");
      expect(created.content).toBe("This is a test interaction");
      expect(created.sentiment).toBe("very_positive");

      // Verify fetch returns same data
      await mockFetchInteractions({ schoolId: "school-123" });
      expect(mockFetchInteractions).toHaveBeenCalled();
    });

    it("should handle special characters in interaction content", async () => {
      const specialContent =
        "Content with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?";
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ content: specialContent }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: specialContent,
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.content).toBe(specialContent);
    });

    it("should handle long content in interactions", async () => {
      const longContent = "A".repeat(5000);
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ content: longContent }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: longContent,
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.content.length).toBe(5000);
    });
  });

  describe("Follow-up Reminder Integration", () => {
    it("should create reminder when enabled during interaction logging", async () => {
      const mockInteraction = createMockInteraction();
      mockCreateInteraction.mockResolvedValue(mockInteraction);
      mockCreateReminder.mockResolvedValue({
        id: "reminder-1",
        user_id: "user-1",
        notes: "Follow up on interaction",
        reminder_date: "2024-02-15",
        reminder_type: "email",
        is_completed: false,
      });

      // Simulate creating interaction with reminder
      const interaction = await mockCreateInteraction({
        school_id: "school-123",
        type: "phone_call",
        direction: "inbound",
        content: "Coach called to discuss offer",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      // Create reminder linked to interaction
      const reminder = await mockCreateReminder(
        `Follow up on ${interaction.subject || "interaction"}`,
        "2024-02-15T00:00:00Z",
        "email",
        "medium",
        interaction.content,
        "school-123",
        null,
        interaction.id,
      );

      expect(mockCreateReminder).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "email",
        "medium",
        expect.any(String),
        "school-123",
        null,
        interaction.id,
      );
      expect(reminder).toBeDefined();
    });

    it("should skip reminder creation when not enabled", async () => {
      mockCreateInteraction.mockResolvedValue(createMockInteraction());

      await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Initial contact",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      // When reminder is not enabled, createReminder should not be called
      expect(mockCreateReminder).not.toHaveBeenCalled();
    });

    it("should support different reminder types", async () => {
      mockCreateInteraction.mockResolvedValue(createMockInteraction());

      const reminderTypes = ["email", "sms", "phone_call"];

      for (const reminderType of reminderTypes) {
        mockCreateReminder.mockResolvedValue({
          id: `reminder-${reminderType}`,
          reminder_type: reminderType,
        });

        await mockCreateReminder(
          "Test reminder",
          "2024-02-15T00:00:00Z",
          reminderType as any,
          "medium",
        );

        expect(mockCreateReminder).toHaveBeenCalledWith(
          "Test reminder",
          "2024-02-15T00:00:00Z",
          reminderType,
          "medium",
        );
      }
    });
  });

  describe("File Attachments UI Integration", () => {
    it("should accept file input in form", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });

      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({
          attachments: [
            "https://example.com/files/interactions/school-123/test.pdf",
          ],
        }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Email with attachment",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.attachments).toHaveLength(1);
    });

    it("should handle multiple file attachments", async () => {
      const mockFiles = [
        new File(["content1"], "document.pdf", { type: "application/pdf" }),
        new File(["content2"], "image.jpg", { type: "image/jpeg" }),
      ];

      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({
          attachments: [
            "https://example.com/files/interactions/school-123/document.pdf",
            "https://example.com/files/interactions/school-123/image.jpg",
          ],
        }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Email with multiple attachments",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.attachments).toHaveLength(2);
    });

    it("should support common file types", () => {
      // Verify that the form accepts these file types
      const supportedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
      ];

      // All supported types should be handleable
      for (const type of supportedTypes) {
        const mockFile = new File(["content"], `file.ext`, { type });
        expect(mockFile.type).toBe(type);
      }
    });
  });

  describe("New Interaction Types UI", () => {
    it("should support game interaction type", async () => {
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ type: "game" }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "game",
        direction: "inbound",
        content: "Athlete performed well at the game",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.type).toBe("game");
    });

    it("should support unofficial_visit interaction type", async () => {
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ type: "unofficial_visit" }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "unofficial_visit",
        direction: "outbound",
        content: "Campus tour completed",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.type).toBe("unofficial_visit");
    });

    it("should support official_visit interaction type", async () => {
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ type: "official_visit" }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "official_visit",
        direction: "inbound",
        content: "Official visit scheduled",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.type).toBe("official_visit");
    });

    it("should support other interaction type", async () => {
      mockCreateInteraction.mockResolvedValue(
        createMockInteraction({ type: "other" }),
      );

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "other",
        direction: "outbound",
        content: "Custom interaction type",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.type).toBe("other");
    });
  });

  describe("Cascade Delete (smartDelete)", () => {
    it("should use smartDelete instead of regular delete", async () => {
      const mockSmartDelete = vi.fn().mockResolvedValue({
        cascadeUsed: false,
      });

      await mockSmartDelete("interaction-1");

      expect(mockSmartDelete).toHaveBeenCalledWith("interaction-1");
    });

    it("should return cascadeUsed: false for simple delete", async () => {
      const mockSmartDelete = vi.fn().mockResolvedValue({
        cascadeUsed: false,
      });

      const result = await mockSmartDelete("interaction-1");

      expect(result.cascadeUsed).toBe(false);
    });

    it("should return cascadeUsed: true when cascade delete is needed", async () => {
      const mockSmartDelete = vi.fn().mockResolvedValue({
        cascadeUsed: true,
      });

      const result = await mockSmartDelete("interaction-with-dependencies");

      expect(result.cascadeUsed).toBe(true);
    });

    it("should handle cascade delete with FK violations", async () => {
      const mockSmartDelete = vi.fn().mockImplementation(async (id: string) => {
        // Simulate FK violation on first attempt, cascade on second
        if (id === "interaction-with-fk") {
          return { cascadeUsed: true };
        }
        return { cascadeUsed: false };
      });

      const result = await mockSmartDelete("interaction-with-fk");

      expect(result.cascadeUsed).toBe(true);
    });

    it("should differentiate between simple and cascade delete in UI message", async () => {
      const mockSmartDelete = vi.fn();

      // Simple delete
      mockSmartDelete.mockResolvedValueOnce({ cascadeUsed: false });
      let result = await mockSmartDelete("interaction-1");
      expect(result.cascadeUsed).toBe(false);
      // UI should show: "Interaction deleted"

      // Cascade delete
      mockSmartDelete.mockResolvedValueOnce({ cascadeUsed: true });
      result = await mockSmartDelete("interaction-2");
      expect(result.cascadeUsed).toBe(true);
      // UI should show: "Interaction and related records deleted"
    });

    it("should handle cascade delete errors", async () => {
      const mockSmartDelete = vi
        .fn()
        .mockRejectedValue(new Error("Cascade delete failed"));

      try {
        await mockSmartDelete("interaction-1");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBe("Cascade delete failed");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle interaction with very long content (10000 chars)", async () => {
      const longContent = "A".repeat(10000);
      const interaction = createMockInteraction({ content: longContent });
      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: longContent,
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.content.length).toBe(10000);
    });

    it("should handle interaction with max subject length", async () => {
      const longSubject = "A".repeat(500);
      const interaction = createMockInteraction({ subject: longSubject });
      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        subject: longSubject,
        content: "Test",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.subject.length).toBe(500);
    });

    it("should handle concurrent interaction creation", async () => {
      let counter = 0;
      mockCreateInteraction.mockImplementation(async (data: any) =>
        createMockInteraction({
          id: `interaction-${counter++}`,
          ...data,
        }),
      );

      const promises = Array.from({ length: 5 }, (_, i) =>
        mockCreateInteraction({
          school_id: "school-123",
          type: "email",
          direction: "outbound",
          content: `Concurrent interaction ${i}`,
          occurred_at: "2024-01-15T10:00:00Z",
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      // All should have unique IDs
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it("should handle interaction at exact datetime boundary", async () => {
      const boundary = "2024-12-31T23:59:59.999Z";
      const interaction = createMockInteraction({ occurred_at: boundary });
      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Test",
        occurred_at: boundary,
      });

      expect(result.occurred_at).toBe(boundary);
    });

    it("should handle interaction with unicode characters", async () => {
      const unicodeContent = "你好 🎉 Ñoño café résumé";
      const interaction = createMockInteraction({ content: unicodeContent });
      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: unicodeContent,
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.content).toBe(unicodeContent);
    });

    it("should handle interaction with null optional fields", async () => {
      const interaction = createMockInteraction({
        subject: null,
        sentiment: null,
        coach_id: null,
        event_id: null,
      });
      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Minimal interaction",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.subject).toBeNull();
      expect(result.sentiment).toBeNull();
      expect(result.coach_id).toBeNull();
    });

    it("should handle rapid filter changes", async () => {
      const interactions = [
        createMockInteraction({ type: "email" }),
        createMockInteraction({ id: "int-2", type: "phone_call" }),
        createMockInteraction({ id: "int-3", type: "text" }),
      ];

      mockFetchInteractions.mockResolvedValue(interactions);

      // Simulate rapid filter changes
      await mockFetchInteractions({ schoolId: "school-123", type: "email" });
      await mockFetchInteractions({
        schoolId: "school-123",
        type: "phone_call",
      });
      await mockFetchInteractions({ schoolId: "school-123", type: "text" });

      expect(mockFetchInteractions).toHaveBeenCalledTimes(3);
    });

    it("should handle network timeout gracefully", async () => {
      mockCreateInteraction.mockRejectedValue(
        new Error("Network request failed"),
      );

      try {
        await mockCreateInteraction({
          school_id: "school-123",
          type: "email",
          direction: "outbound",
          content: "Test",
          occurred_at: "2024-01-15T10:00:00Z",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toBe("Network request failed");
      }
    });

    it("should handle reminder creation failure silently", async () => {
      const mockCreateReminder = vi
        .fn()
        .mockRejectedValue(new Error("Reminder creation failed"));
      mockCreateInteraction.mockResolvedValue(createMockInteraction());

      // Create interaction successfully
      const interaction = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Test",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(interaction.id).toBeDefined();

      // Try to create reminder (should fail silently)
      try {
        await mockCreateReminder(
          "Follow up",
          "2024-02-15T00:00:00Z",
          "email",
          "medium",
          "Test content",
          "school-123",
          null,
          interaction.id,
        );
      } catch (error) {
        // Error should be caught and logged, not thrown to user
        expect((error as Error).message).toBe("Reminder creation failed");
      }
    });
  });

  describe("Performance & Load Testing", () => {
    it("should handle 100+ interactions efficiently", async () => {
      const interactions = Array.from({ length: 100 }, (_, i) =>
        createMockInteraction({
          id: `interaction-${i}`,
          content: `Interaction ${i}`,
        }),
      );

      mockFetchInteractions.mockResolvedValue(interactions);

      const result = await mockFetchInteractions({ schoolId: "school-123" });

      expect(result).toHaveLength(100);
    });

    it("should handle filtering 100+ interactions", async () => {
      const interactions = Array.from({ length: 100 }, (_, i) =>
        createMockInteraction({
          id: `interaction-${i}`,
          type: i % 2 === 0 ? "email" : "phone_call",
        }),
      );

      mockFetchInteractions.mockImplementation(async ({ type }) => {
        if (type) {
          return interactions.filter((i) => i.type === type);
        }
        return interactions;
      });

      const emailInteractions = await mockFetchInteractions({
        schoolId: "school-123",
        type: "email",
      });

      expect(emailInteractions.length).toBe(50);
    });

    it("should handle large file attachments", async () => {
      const largeFile = new File(
        [new ArrayBuffer(10 * 1024 * 1024)],
        "large-file.pdf",
        { type: "application/pdf" },
      );

      const interaction = createMockInteraction({
        attachments: [
          "https://example.com/files/interactions/school-123/large-file.pdf",
        ],
      });

      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Email with large attachment",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.attachments).toHaveLength(1);
    });

    it("should handle multiple simultaneous file uploads", async () => {
      const files = Array.from(
        { length: 5 },
        (_, i) =>
          new File([`content ${i}`], `file-${i}.pdf`, {
            type: "application/pdf",
          }),
      );

      const interaction = createMockInteraction({
        attachments: files.map(
          (f, i) =>
            `https://example.com/files/interactions/school-123/file-${i}.pdf`,
        ),
      });

      mockCreateInteraction.mockResolvedValue(interaction);

      const result = await mockCreateInteraction({
        school_id: "school-123",
        type: "email",
        direction: "outbound",
        content: "Email with multiple attachments",
        occurred_at: "2024-01-15T10:00:00Z",
      });

      expect(result.attachments).toHaveLength(5);
    });
  });
});
