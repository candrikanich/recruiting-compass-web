import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useInteractions } from "~/composables/useInteractions";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import type { Interaction } from "~/types/models";

const mockSupabase = {
  from: vi.fn(),
};

let mockUser: {
  id: string;
  email: string;
} | null = {
  id: "user-123",
  email: "test@example.com",
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser;
    },
    loading: false,
    isAuthenticated: true,
  }),
}));

describe("useInteractions - Extended", () => {
  let mockQuery: any;
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    userStore = useUserStore();

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "550e8400-e29b-41d4-a716-446655440000",
    user_id: "550e8400-e29b-41d4-a716-446655440001",
    school_id: "550e8400-e29b-41d4-a716-446655440002",
    coach_id: "550e8400-e29b-41d4-a716-446655440003",
    type: "email",
    direction: "outbound",
    subject: "Recruiting Inquiry",
    content: "Hello, interested in your program",
    sentiment: "positive",
    occurred_at: "2025-12-20T10:00:00Z",
    created_at: "2025-12-20T10:00:00Z",
    logged_by: "user-123",
    attachments: [],
    ...overrides,
  });

  describe("fetchInteractions", () => {
    it("should fetch interactions with filters", async () => {
      const mockInteractions = [
        createMockInteraction(),
        createMockInteraction({
          id: "550e8400-e29b-41d4-a716-446655440001",
          type: "phone_call",
        }),
      ];
      // Set up the mock to resolve with interactions data
      mockQuery.then = vi.fn((resolve) =>
        resolve({ data: mockInteractions, error: null }),
      );

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions({ type: "email", direction: "outbound" });

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith("type", "email");
      expect(mockQuery.eq).toHaveBeenCalledWith("direction", "outbound");
      expect(interactions.value).toEqual(mockInteractions);
    });

    it("should apply date range filters client-side", async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const validInteraction = createMockInteraction({
        occurred_at: now.toISOString(),
      });
      const mockInteractions = [validInteraction];

      // Set up the mock to resolve with interactions data
      mockQuery.then = vi.fn((resolve) =>
        resolve({ data: mockInteractions, error: null }),
      );

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      expect(mockQuery.gte).toHaveBeenCalledWith(
        "occurred_at",
        expect.any(String),
      );
      expect(mockQuery.lte).toHaveBeenCalledWith(
        "occurred_at",
        expect.any(String),
      );
      expect(interactions.value).toEqual([validInteraction]);
      expect(interactions.value.length).toBe(1);
    });

    it("should handle fetch errors gracefully", async () => {
      const mockError = new Error("Fetch failed");
      mockQuery.then = vi.fn((resolve) =>
        resolve({ data: null, error: mockError }),
      );

      const { fetchInteractions, error } = useInteractions();
      await fetchInteractions();

      expect(error.value).toBe("Fetch failed");
    });
  });

  describe("exportToCSV", () => {
    it("should generate valid CSV from interactions", async () => {
      const mockInteractions = [
        createMockInteraction(),
        createMockInteraction({
          id: "550e8400-e29b-41d4-a716-446655440001",
          type: "text",
        }),
      ];

      mockQuery.then = vi.fn((resolve) =>
        resolve({ data: mockInteractions, error: null }),
      );

      const { exportToCSV, fetchInteractions } = useInteractions();
      await fetchInteractions();

      const csv = exportToCSV();

      expect(csv).toContain("Date");
      expect(csv).toContain("Type");
      expect(csv).toContain("Direction");
      expect(csv).toContain("email");
      expect(csv).toContain("text");
    });

    it("should escape quotes in CSV content", async () => {
      const mockInteractions = [
        createMockInteraction({
          content: 'He said "hello"',
        }),
      ];

      mockQuery.then = vi.fn((resolve) =>
        resolve({ data: mockInteractions, error: null }),
      );

      const { exportToCSV, fetchInteractions } = useInteractions();
      await fetchInteractions();

      const csv = exportToCSV();
      expect(csv).toContain('"He said ""hello"""');
    });

    it("should return empty string when no interactions", () => {
      const { exportToCSV, interactions } = useInteractions();
      interactions.value = [];

      const csv = exportToCSV();
      expect(csv).toBe("");
    });
  });

  describe("addInteraction", () => {
    it("should create new interaction", async () => {
      const newInteraction = createMockInteraction();
      const insertMock = vi.fn().mockReturnValue(mockQuery);
      mockQuery.insert = insertMock;
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null });

      const { createInteraction } = useInteractions();

      // Create interaction data without id and created_at as expected by the function
      const { id, created_at, ...interactionData } = newInteraction;
      await createInteraction(interactionData);

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      const insertedData = insertMock.mock.calls[0][0][0];
      expect(insertedData.coach_id).toBe(interactionData.coach_id);
      expect(insertedData.content).toBe(interactionData.content);
      expect(insertedData.direction).toBe(interactionData.direction);
      expect(insertedData.logged_by).toBe("user-123");
      expect(insertedData.occurred_at).toBe(interactionData.occurred_at);
      expect(insertedData.school_id).toBe(interactionData.school_id);
      expect(insertedData.sentiment).toBe(interactionData.sentiment);
      expect(insertedData.subject).toBe(interactionData.subject);
      expect(insertedData.type).toBe(interactionData.type);
    });

    it("should handle add errors", async () => {
      const mockError = new Error("Insert failed");
      mockQuery.insert = vi.fn().mockReturnValue(mockQuery);
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const { createInteraction, error } = useInteractions();
      const newInteraction = createMockInteraction();
      const { id, created_at, ...interactionData } = newInteraction;

      try {
        await createInteraction(interactionData);
      } catch (e) {
        // Expected error
      }

      expect(error.value).toBe("Insert failed");
    });
  });

  describe("deleteInteraction", () => {
    it("should delete interaction by id", async () => {
      mockQuery.delete = vi.fn().mockReturnValue(mockQuery);
      mockQuery.eq = vi.fn().mockReturnValue(mockQuery);
      mockQuery.then = vi.fn((resolve) => resolve({ data: null, error: null }));

      const { deleteInteraction } = useInteractions();
      await deleteInteraction("550e8400-e29b-41d4-a716-446655440000");

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.delete).toHaveBeenCalled();
    });
  });
});
