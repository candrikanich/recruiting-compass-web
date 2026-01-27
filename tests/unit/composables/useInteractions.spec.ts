import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useInteractions } from "~/composables/useInteractions";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import type { Interaction } from "~/types/models";

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

let mockUser: {
  id: string;
  email: string;
} | null = {
  id: "user-123",
  email: "test@example.com",
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser;
    },
    isAuthenticated: true,
  }),
}));

describe("useInteractions", () => {
  let mockQuery: any;
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    userStore = useUserStore();

    // Create mock query that returns itself for chaining
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
    };

    // Store test data for the mock query to return
    let testResponses: { data: any[]; error: null } = { data: [], error: null };

    // Make the mock query itself thenable
    Object.defineProperty(mockQuery, "then", {
      value: (
        onFulfilled: (value: any) => any,
        onRejected?: (reason: any) => any,
      ) => {
        return Promise.resolve(testResponses).then(onFulfilled, onRejected);
      },
    });

    // Helper to set test data for specific tests
    mockQuery.__setTestData = (data: any[]) => {
      testResponses.data = data;
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "550e8400-e29b-41d4-a716-446655440000",
    school_id: "550e8400-e29b-41d4-a716-446655440001",
    coach_id: "550e8400-e29b-41d4-a716-446655440002",
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Introduction",
    content: "Hello coach",
    sentiment: "positive",
    occurred_at: "2024-01-01T12:00:00Z",
    logged_by: "user-123",
    attachments: [],
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-01T12:00:00Z",
    user_id: "user-123",
    ...overrides,
  });

  describe("fetchInteractions", () => {
    it("should fetch all interactions when no filters provided", async () => {
      const mockInteractions = [
        createMockInteraction(),
        createMockInteraction({
          id: "550e8400-e29b-41d4-a716-446655440003",
          type: "phone_call",
        }),
      ];
      mockQuery.order.mockResolvedValue({
        data: mockInteractions,
        error: null,
      });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(interactions.value).toEqual(mockInteractions);
    });

    it("should fetch interactions filtered by schoolId", async () => {
      const mockInteractions = [
        createMockInteraction({
          school_id: "550e8400-e29b-41d4-a716-446655440001",
        }),
      ];

      // The mock query object needs to resolve on the final method call
      // Since eq is called after order, we need to mock eq to resolve the promise
      mockQuery.eq.mockResolvedValue({
        data: mockInteractions,
        error: null,
      });

      const { fetchInteractions } = useInteractions();
      await fetchInteractions({
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "school_id",
        "550e8400-e29b-41d4-a716-446655440001",
      );
    });

    it("should fetch interactions filtered by schoolId and type", async () => {
      const mockInteractions = [
        createMockInteraction({
          school_id: "550e8400-e29b-41d4-a716-446655440001",
          type: "email",
        }),
      ];

      mockQuery.__setTestData(mockInteractions);

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions({
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
        type: "email",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "school_id",
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(mockQuery.eq).toHaveBeenCalledWith("type", "email");

      // Check that interactions are properly set
      expect(interactions.value).toEqual(mockInteractions);
    });

    it("should fetch interactions filtered by coachId", async () => {
      const mockInteractions = [
        createMockInteraction({
          coach_id: "550e8400-e29b-41d4-a716-446655440002",
        }),
      ];

      mockQuery.__setTestData(mockInteractions);

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions({
        coachId: "550e8400-e29b-41d4-a716-446655440002",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "coach_id",
        "550e8400-e29b-41d4-a716-446655440002",
      );

      expect(interactions.value).toEqual(mockInteractions);
    });

    it("should fetch interactions filtered by both schoolId and coachId", async () => {
      const mockInteractions = [createMockInteraction()];

      mockQuery.__setTestData(mockInteractions);

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions({
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
        coachId: "550e8400-e29b-41d4-a716-446655440002",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "school_id",
        "550e8400-e29b-41d4-a716-446655440001",
      );
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "coach_id",
        "550e8400-e29b-41d4-a716-446655440002",
      );
    });

    it("should handle fetch error", async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      });

      const { fetchInteractions, error } = useInteractions();
      await fetchInteractions();

      expect(error.value).toBe("Database error");
    });

    it("should set loading state during fetch", async () => {
      mockQuery.order.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: [], error: null }), 100),
          ),
      );

      const { fetchInteractions, loading } = useInteractions();

      const fetchPromise = fetchInteractions();
      expect(loading.value).toBe(true);

      await fetchPromise;
      expect(loading.value).toBe(false);
    });

    it("should handle empty results", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(interactions.value).toEqual([]);
    });

    it("should handle null data response", async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(interactions.value).toEqual([]);
    });
  });

  describe("getInteraction", () => {
    it("should fetch single interaction by id", async () => {
      const mockInteraction = createMockInteraction();
      mockQuery.single.mockResolvedValue({
        data: mockInteraction,
        error: null,
      });

      const { getInteraction } = useInteractions();
      const result = await getInteraction(
        "550e8400-e29b-41d4-a716-446655440000",
      );

      expect(mockQuery.eq).toHaveBeenCalledWith(
        "id",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(result).toEqual(mockInteraction);
    });

    it("should return null on error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const { getInteraction, error } = useInteractions();
      const result = await getInteraction(
        "550e8400-e29b-41d4-a716-446655440000",
      );

      expect(result).toBeNull();
      expect(error.value).toBe("Not found");
    });

    it("should handle non-existent interaction", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("No rows returned"),
      });

      const { getInteraction } = useInteractions();
      const result = await getInteraction("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("createInteraction", () => {
    it("should create a new interaction", async () => {
      const newInteractionData = {
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: "550e8400-e29b-41d4-a716-446655440002",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Follow-up",
        content: "Thanks for the call",
        sentiment: "positive" as const,
        occurred_at: "2024-01-15T10:00:00Z",
      };

      const createdInteraction = createMockInteraction({
        ...newInteractionData,
        id: "550e8400-e29b-41d4-a716-446655440004",
      });
      mockQuery.single.mockResolvedValue({
        data: createdInteraction,
        error: null,
      });

      const { createInteraction, interactions } = useInteractions();
      const result = await createInteraction(newInteractionData);

      expect(mockQuery.insert).toHaveBeenCalledWith([
        {
          ...newInteractionData,
          logged_by: "user-123",
        },
      ]);
      expect(result).toEqual(createdInteraction);
      expect(interactions.value[0]).toEqual(createdInteraction);
    });

    it("should throw error if user not authenticated", async () => {
      mockUser = null;

      const { createInteraction } = useInteractions();

      const validData = {
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: "550e8400-e29b-41d4-a716-446655440002",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
      };

      await expect(createInteraction(validData)).rejects.toThrow(
        "User not authenticated",
      );

      // Reset user for other tests
      mockUser = {
        id: "user-123",
        email: "test@example.com",
      };
    });

    it("should handle creation error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Insert failed"),
      });

      const { createInteraction, error } = useInteractions();

      const validData = {
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: "550e8400-e29b-41d4-a716-446655440002",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
      };

      await expect(createInteraction(validData)).rejects.toThrow(
        "Insert failed",
      );
      expect(error.value).toBe("Insert failed");
    });

    it("should include logged_by in created interaction", async () => {
      const newInteractionData = {
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: "550e8400-e29b-41d4-a716-446655440002",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
      };
      const createdInteraction = createMockInteraction();
      mockQuery.single.mockResolvedValue({
        data: createdInteraction,
        error: null,
      });

      const { createInteraction } = useInteractions();
      await createInteraction(newInteractionData);

      const insertCall = mockQuery.insert.mock.calls[0][0][0];
      expect(insertCall.logged_by).toBe("user-123");
    });

    it("should add new interaction to beginning of list (unshift)", async () => {
      const existingInteraction = createMockInteraction({
        id: "550e8400-e29b-41d4-a716-446655440005",
      });
      const newInteraction = createMockInteraction({
        id: "550e8400-e29b-41d4-a716-446655440006",
      });

      // Make the final query resolve correctly
      mockQuery.order.mockReturnValue({
        ...mockQuery,
        then: vi
          .fn()
          .mockImplementation((resolve) =>
            resolve({ data: [existingInteraction], error: null }),
          ),
      });
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null });

      const { fetchInteractions, createInteraction, interactions } =
        useInteractions();

      await fetchInteractions();
      expect(interactions.value).toHaveLength(1);

      const validData = {
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: "550e8400-e29b-41d4-a716-446655440002",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
      };

      await createInteraction(validData);
      expect(interactions.value).toHaveLength(2);
      expect(interactions.value[0].id).toBe(
        "550e8400-e29b-41d4-a716-446655440006",
      );
      expect(interactions.value[1].id).toBe(
        "550e8400-e29b-41d4-a716-446655440005",
      );
    });

    it("should create interaction with different types", async () => {
      const types: Array<Interaction["type"]> = [
        "email",
        "phone_call",
        "text",
        "in_person_visit",
        "virtual_meeting",
        "camp",
        "showcase",
        "tweet",
        "dm",
      ];

      for (const type of types) {
        const interactionData = {
          school_id: "550e8400-e29b-41d4-a716-446655440001",
          coach_id: "550e8400-e29b-41d4-a716-446655440002",
          type,
          direction: "outbound" as const,
          subject: "Test",
          content: "Test content",
          occurred_at: "2024-01-15T10:00:00Z",
        };
        const createdInteraction = createMockInteraction({ type });
        mockQuery.single.mockResolvedValue({
          data: createdInteraction,
          error: null,
        });

        const { createInteraction } = useInteractions();
        const result = await createInteraction(interactionData);

        expect(result.type).toBe(type);
      }
    });
  });

  describe("updateInteraction", () => {
    it("should update interaction", async () => {
      const updates = {
        subject: "Updated subject",
        sentiment: "very_positive" as const,
      };
      const updatedInteraction = createMockInteraction(updates);
      mockQuery.single.mockResolvedValue({
        data: updatedInteraction,
        error: null,
      });

      const { updateInteraction, interactions, fetchInteractions } =
        useInteractions();

      // First fetch to populate interactions
      mockQuery.order.mockResolvedValue({
        data: [createMockInteraction()],
        error: null,
      });
      await fetchInteractions();

      // Then update
      const result = await updateInteraction(
        "550e8400-e29b-41d4-a716-446655440000",
        updates,
      );

      expect(mockQuery.update).toHaveBeenCalledWith(updates);
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "id",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", "user-123");
      expect(result).toEqual(updatedInteraction);
      expect(interactions.value[0]).toEqual(updatedInteraction);
    });

    it("should throw error if user not authenticated", async () => {
      mockUser = null;

      const { updateInteraction } = useInteractions();

      await expect(
        updateInteraction("550e8400-e29b-41d4-a716-446655440000", {}),
      ).rejects.toThrow("User not authenticated");

      // Reset user for other tests
      mockUser = {
        id: "user-123",
        email: "test@example.com",
      };
    });

    it("should handle update error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Update failed"),
      });

      const { updateInteraction, error } = useInteractions();

      await expect(
        updateInteraction("550e8400-e29b-41d4-a716-446655440000", {}),
      ).rejects.toThrow("Update failed");
      expect(error.value).toBe("Update failed");
    });

    it("should update local state when interaction exists", async () => {
      const initialInteraction = createMockInteraction();
      const updatedInteraction = createMockInteraction({ subject: "Updated" });

      // Mock fetchInteractions call to populate interactions
      mockQuery.order.mockResolvedValue({
        data: [initialInteraction],
        error: null,
      });
      mockQuery.single.mockResolvedValue({
        data: updatedInteraction,
        error: null,
      });

      const { fetchInteractions, updateInteraction, interactions } =
        useInteractions();
      await fetchInteractions();

      await updateInteraction("550e8400-e29b-41d4-a716-446655440000", {
        subject: "Updated",
      });

      expect(interactions.value[0].subject).toBe("Updated");
    });

    it("should enforce user ownership via logged_by check", async () => {
      mockQuery.single.mockResolvedValue({
        data: createMockInteraction(),
        error: null,
      });

      const { updateInteraction } = useInteractions();
      await updateInteraction("550e8400-e29b-41d4-a716-446655440000", {});

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", "user-123");
    });
  });

  describe("deleteInteraction", () => {
    it("should delete interaction", async () => {
      const { deleteInteraction, interactions, fetchInteractions } =
        useInteractions();

      // First fetch to populate interactions
      mockQuery.__setTestData([
        createMockInteraction(),
        createMockInteraction({ id: "550e8400-e29b-41d4-a716-446655403" }),
      ]);
      await fetchInteractions();

      // Mock delete query resolution - delete() returns a query object with eq() method
      const deleteQueryEq = vi.fn().mockReturnThis();
      const deleteQuery = {
        eq: deleteQueryEq,
        then: vi
          .fn()
          .mockImplementation((onFulfilled) =>
            Promise.resolve({ error: null }).then(onFulfilled),
          ),
      };
      mockQuery.delete.mockReturnValue(deleteQuery);

      // Then delete
      await deleteInteraction("550e8400-e29b-41d4-a716-446655440000");

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(deleteQueryEq).toHaveBeenCalledWith(
        "id",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(deleteQueryEq).toHaveBeenCalledWith("logged_by", "user-123");
      expect(
        interactions.value.find(
          (i) => i.id === "550e8400-e29b-41d4-a716-446655440000",
        ),
      ).toBeUndefined();
      expect(interactions.value).toHaveLength(1);
    });

    it("should throw error if user not authenticated", async () => {
      mockUser = null;

      const { deleteInteraction } = useInteractions();

      await expect(
        deleteInteraction("550e8400-e29b-41d4-a716-446655440000"),
      ).rejects.toThrow("User not authenticated");

      // Reset user for other tests
      mockUser = {
        id: "user-123",
        email: "test@example.com",
      };
    });

    it("should handle delete error", async () => {
      // Mock delete query resolution with error - delete() returns a query object with eq() method
      const deleteQueryEq = vi.fn().mockReturnThis();
      const deleteQuery = {
        eq: deleteQueryEq,
        then: vi
          .fn()
          .mockImplementation((onFulfilled) =>
            Promise.resolve({ error: new Error("Delete failed") }).then(
              onFulfilled,
            ),
          ),
      };
      mockQuery.delete.mockReturnValue(deleteQuery);

      const { deleteInteraction, error } = useInteractions();

      await expect(
        deleteInteraction("550e8400-e29b-41d4-a716-446655440000"),
      ).rejects.toThrow("Delete failed");
      expect(error.value).toBe("Delete failed");
    });

    it("should enforce user ownership via logged_by check", async () => {
      // Mock delete query resolution - delete() returns a query object with eq() method
      const deleteQueryEq = vi.fn().mockReturnThis();
      const deleteQuery = {
        eq: deleteQueryEq,
        then: vi
          .fn()
          .mockImplementation((onFulfilled) =>
            Promise.resolve({ error: null }).then(onFulfilled),
          ),
      };
      mockQuery.delete.mockReturnValue(deleteQuery);

      const { deleteInteraction } = useInteractions();
      await deleteInteraction("550e8400-e29b-41d4-a716-446655440000");

      // Should check both id and logged_by
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(deleteQueryEq).toHaveBeenCalledWith(
        "id",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(deleteQueryEq).toHaveBeenCalledWith("logged_by", "user-123");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown error types", async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: { message: "Custom error" },
      });

      const { fetchInteractions } = useInteractions();
      await fetchInteractions();

      // Should not crash
    });

    it("should clear error on successful operation after previous error", async () => {
      // First call fails
      mockQuery.order.mockResolvedValueOnce({
        data: null,
        error: new Error("Failed"),
      });

      const { fetchInteractions, error } = useInteractions();
      await fetchInteractions();
      expect(error.value).toBe("Failed");

      // Second call succeeds
      mockQuery.order.mockResolvedValueOnce({ data: [], error: null });
      await fetchInteractions();
      expect(error.value).toBeNull();
    });

    it("should handle null values in interaction data", async () => {
      const interactionWithNulls = createMockInteraction({
        coach_id: null,
        event_id: null,
        subject: "Test interaction",
        content: "Test content",
        sentiment: "positive",
      });

      mockQuery.order.mockResolvedValue({
        data: [interactionWithNulls],
        error: null,
      });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(interactions.value[0]).toEqual(interactionWithNulls);
    });

    it("should handle different sentiment values", async () => {
      const sentiments: Array<Interaction["sentiment"]> = [
        "positive",
        "neutral",
        "negative",
        "very_positive",
        null,
      ];

      for (const sentiment of sentiments) {
        const interaction = createMockInteraction({
          id: `int-${sentiment}`,
          sentiment,
        });
        mockQuery.order.mockResolvedValue({ data: [interaction], error: null });

        const { fetchInteractions, interactions } = useInteractions();
        await fetchInteractions();

        expect(interactions.value[0].sentiment).toBe(sentiment);
      }
    });

    it("should handle different direction values", async () => {
      const outbound = createMockInteraction({ direction: "outbound" });
      const inbound = createMockInteraction({
        id: "int-2",
        direction: "inbound",
      });

      mockQuery.order.mockResolvedValue({
        data: [outbound, inbound],
        error: null,
      });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(interactions.value[0].direction).toBe("outbound");
      expect(interactions.value[1].direction).toBe("inbound");
    });

    it("should handle interactions with attachments", async () => {
      const interactionWithAttachments = createMockInteraction({
        attachments: ["file1.pdf", "file2.jpg", "transcript.docx"],
      });

      mockQuery.single.mockResolvedValue({
        data: interactionWithAttachments,
        error: null,
      });

      const { createInteraction } = useInteractions();
      const result = await createInteraction({
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: "550e8400-e29b-41d4-a716-446655440002",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test",
        content: "Test content",
        occurred_at: "2024-01-15T10:00:00Z",
        attachments: ["file1.pdf", "file2.jpg", "transcript.docx"],
      });

      expect(result.attachments).toEqual([
        "file1.pdf",
        "file2.jpg",
        "transcript.docx",
      ]);
    });

    it("should handle concurrent operations", async () => {
      mockQuery.order.mockResolvedValue({
        data: [createMockInteraction()],
        error: null,
      });

      const { fetchInteractions } = useInteractions();

      await Promise.all([
        fetchInteractions("school-1"),
        fetchInteractions("school-2"),
        fetchInteractions(undefined, "coach-1"),
      ]);

      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    });
  });

  describe("Computed Properties", () => {
    it("should expose interactions as computed ref", async () => {
      const mockInteractions = [createMockInteraction()];
      mockQuery.order.mockResolvedValue({
        data: mockInteractions,
        error: null,
      });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(interactions.value).toEqual(mockInteractions);
    });

    it("should expose loading as computed ref", () => {
      const { loading } = useInteractions();

      expect(loading.value).toBe(false);
    });

    it("should expose error as computed ref", () => {
      const { error } = useInteractions();

      expect(error.value).toBeNull();
    });
  });

  describe("Query Building", () => {
    it("should build correct query with no filters", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const { fetchInteractions } = useInteractions();
      await fetchInteractions();

      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.order).toHaveBeenCalledWith("occurred_at", {
        ascending: false,
      });
      expect(mockQuery.eq).not.toHaveBeenCalled();
    });

    it("should build correct query with only schoolId filter", async () => {
      // Mock the final eq call to resolve the query
      mockQuery.eq.mockImplementation((field, value) => {
        if (field === "school_id") {
          return Promise.resolve({ data: [], error: null });
        }
        return mockQuery;
      });

      const { fetchInteractions } = useInteractions();
      await fetchInteractions({
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
      });

      expect(mockQuery.eq).toHaveBeenCalledWith(
        "school_id",
        "550e8400-e29b-41d4-a716-446655440001",
      );
    });

    it("should build correct query with only coachId filter", async () => {
      // Mock the final eq call to resolve the query
      mockQuery.eq.mockImplementation((field, value) => {
        if (field === "coach_id") {
          return Promise.resolve({ data: [], error: null });
        }
        return mockQuery;
      });

      const { fetchInteractions } = useInteractions();
      await fetchInteractions({
        coachId: "550e8400-e29b-41d4-a716-446655440002",
      });

      expect(mockQuery.eq).toHaveBeenCalledWith(
        "coach_id",
        "550e8400-e29b-41d4-a716-446655440002",
      );
    });

    it("should build correct query with both filters", async () => {
      // Track eq calls
      const eqCalls: Array<[string, any]> = [];
      mockQuery.eq.mockImplementation((field, value) => {
        eqCalls.push([field, value]);
        if (field === "coach_id") {
          // Final eq call resolves the query
          return Promise.resolve({ data: [], error: null });
        }
        return mockQuery;
      });

      const { fetchInteractions } = useInteractions();
      await fetchInteractions({
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
        coachId: "550e8400-e29b-41d4-a716-446655440002",
      });

      expect(eqCalls).toHaveLength(2);
      expect(eqCalls[0]).toEqual([
        "school_id",
        "550e8400-e29b-41d4-a716-446655440001",
      ]);
      expect(eqCalls[1]).toEqual([
        "coach_id",
        "550e8400-e29b-41d4-a716-446655440002",
      ]);
    });
  });

  describe("New Interaction Types", () => {
    beforeEach(() => {
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "550e8400-e29b-41d4-a716-446655440099",
            school_id: "550e8400-e29b-41d4-a716-446655440001",
            coach_id: null,
            type: "game",
            direction: "inbound",
            subject: "Test interaction",
            content: "Player competed at game",
            sentiment: "positive",
            occurred_at: "2024-01-01T12:00:00Z",
            logged_by: "user-123",
            attachments: [],
            created_at: "2024-01-01T12:00:00Z",
            updated_at: "2024-01-01T12:00:00Z",
          },
          error: null,
        }),
      });
    });

    it("should create interaction with type=game", async () => {
      const { createInteraction } = useInteractions();

      const result = await createInteraction({
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: null,
        event_id: null,
        type: "game",
        direction: "inbound",
        subject: "Game appearance",
        content: "Player competed at game",
        sentiment: "positive",
        occurred_at: "2024-01-01T12:00:00Z",
        logged_by: "user-123",
        attachments: [],
      });

      expect(result.type).toBe("game");
      expect(result.content).toBe("Player competed at game");
    });

    it("should create interaction with type=unofficial_visit", async () => {
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockInteraction({
            type: "unofficial_visit",
            content: "Campus tour and facility visit",
          }),
          error: null,
        }),
      });

      const { createInteraction } = useInteractions();

      const result = await createInteraction({
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: null,
        event_id: null,
        type: "unofficial_visit",
        direction: "outbound",
        subject: "Unofficial visit",
        content: "Campus tour and facility visit",
        sentiment: "positive",
        occurred_at: "2024-01-01T12:00:00Z",
        logged_by: "user-123",
        attachments: [],
      });

      expect(result.type).toBe("unofficial_visit");
    });

    it("should create interaction with type=official_visit", async () => {
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockInteraction({
            type: "official_visit",
            content: "Official visit with meals and overnight stay",
          }),
          error: null,
        }),
      });

      const { createInteraction } = useInteractions();

      const result = await createInteraction({
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: null,
        event_id: null,
        type: "official_visit",
        direction: "inbound",
        subject: "Official visit",
        content: "Official visit with meals and overnight stay",
        sentiment: "very_positive",
        occurred_at: "2024-01-01T12:00:00Z",
        logged_by: "user-123",
        attachments: [],
      });

      expect(result.type).toBe("official_visit");
    });

    it("should create interaction with type=other", async () => {
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockInteraction({
            type: "other",
            content: "Custom interaction type",
          }),
          error: null,
        }),
      });

      const { createInteraction } = useInteractions();

      const result = await createInteraction({
        school_id: "550e8400-e29b-41d4-a716-446655440001",
        coach_id: null,
        event_id: null,
        type: "other",
        direction: "outbound",
        subject: "Other interaction",
        content: "Custom interaction type",
        sentiment: "neutral",
        occurred_at: "2024-01-01T12:00:00Z",
        logged_by: "user-123",
        attachments: [],
      });

      expect(result.type).toBe("other");
    });
  });

  describe("File Attachments", () => {
    it("should validate file type and size", async () => {
      const { createInteraction } = useInteractions();

      // Create a mock PDF file
      const mockFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockInteraction(),
          error: null,
        }),
      });

      // Should not throw for valid file
      const result = await createInteraction(
        {
          school_id: "550e8400-e29b-41d4-a716-446655440001",
          coach_id: null,
          event_id: null,
          type: "email",
          direction: "outbound",
          subject: "Test interaction",
          content: "With attachment",
          sentiment: "positive",
          occurred_at: "2024-01-01T12:00:00Z",
          logged_by: "user-123",
          attachments: [],
        },
        [mockFile]
      );

      expect(result).toBeDefined();
    });

    it("should reject files exceeding 10MB", async () => {
      const { createInteraction } = useInteractions();

      // Create a mock file larger than 10MB
      const largeContent = new Array(11 * 1024 * 1024).fill("x").join("");
      const mockLargeFile = new File([largeContent], "large.pdf", {
        type: "application/pdf",
      });

      // Should throw for oversized file
      expect(
        createInteraction(
          {
            school_id: "550e8400-e29b-41d4-a716-446655440001",
            coach_id: null,
            event_id: null,
            type: "email",
            direction: "outbound",
            subject: "Test interaction",
            content: "With attachment",
            sentiment: "positive",
            occurred_at: "2024-01-01T12:00:00Z",
            logged_by: "user-123",
            attachments: [],
          },
          [mockLargeFile]
        )
      ).rejects.toThrow();
    });

    it("should accept multiple file types", async () => {
      const { createInteraction } = useInteractions();

      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createMockInteraction({
            attachments: [
              "https://example.com/files/document.pdf",
              "https://example.com/files/image.jpg",
              "https://example.com/files/spreadsheet.xlsx",
            ],
          }),
          error: null,
        }),
      });

      const files = [
        new File(["content"], "document.pdf", { type: "application/pdf" }),
        new File(["content"], "image.jpg", { type: "image/jpeg" }),
        new File(["content"], "spreadsheet.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ];

      const result = await createInteraction(
        {
          school_id: "550e8400-e29b-41d4-a716-446655440001",
          coach_id: null,
          event_id: null,
          type: "email",
          direction: "outbound",
          subject: "Test interaction",
          content: "Multiple attachments",
          sentiment: "positive",
          occurred_at: "2024-01-01T12:00:00Z",
          logged_by: "user-123",
          attachments: [],
        },
        files
      );

      expect(result.attachments).toHaveLength(3);
    });
  });

  describe("fetchNoteHistory (consolidated from useNotesHistory)", () => {
    it("should initialize with empty note history state", () => {
      const { noteHistory, noteHistoryLoading, noteHistoryError } = useInteractions();

      expect(noteHistory.value).toEqual([]);
      expect(noteHistoryLoading.value).toBe(false);
      expect(noteHistoryError.value).toBeNull();
    });

    it("should have fetchNoteHistory method", () => {
      const { fetchNoteHistory } = useInteractions();

      expect(typeof fetchNoteHistory).toBe("function");
    });

    it("should format history entries with dates", () => {
      const { formattedNoteHistory } = useInteractions();

      expect(formattedNoteHistory.value).toBeDefined();
      expect(Array.isArray(formattedNoteHistory.value)).toBe(true);
    });

    it("should handle missing user gracefully", async () => {
      mockUser = null;
      const { fetchNoteHistory, noteHistory, noteHistoryError } = useInteractions();

      // When no user is authenticated
      await fetchNoteHistory("test-school-id");

      // Should not crash and history should remain empty
      expect(noteHistory.value).toEqual([]);
      expect(noteHistoryError.value).toBeNull();

      mockUser = { id: "user-123", email: "test@example.com" };
    });

    it("should return composable functions and properties", () => {
      const composable = useInteractions();

      expect(composable).toHaveProperty("noteHistory");
      expect(composable).toHaveProperty("formattedNoteHistory");
      expect(composable).toHaveProperty("noteHistoryLoading");
      expect(composable).toHaveProperty("noteHistoryError");
      expect(composable).toHaveProperty("fetchNoteHistory");
    });

    it("should have formattedNoteHistory as computed", () => {
      const { formattedNoteHistory } = useInteractions();

      // Computed properties are reactive
      expect(formattedNoteHistory.value).toBeDefined();
    });
  });
});
