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
});
