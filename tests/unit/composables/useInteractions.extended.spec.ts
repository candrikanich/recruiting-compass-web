import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { Interaction } from "~/types/models";

// Factory functions to create fresh mock instances per test
const createMockQuery = () => {
  let testResponse = { data: [], error: null };

  const mockQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    single: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
  };

  // Make each chainable method return the mock query itself
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);
  mockQuery.order.mockReturnValue(mockQuery);
  mockQuery.insert.mockReturnValue(mockQuery);
  mockQuery.update.mockReturnValue(mockQuery);
  mockQuery.delete.mockReturnValue(mockQuery);
  mockQuery.single.mockReturnValue(mockQuery);
  mockQuery.gte.mockReturnValue(mockQuery);
  mockQuery.lte.mockReturnValue(mockQuery);

  // Make mockQuery thenable with a proper .then() method
  Object.defineProperty(mockQuery, "then", {
    value: (
      onFulfilled: (value: any) => any,
      onRejected?: (reason: any) => any,
    ) => {
      return Promise.resolve(testResponse).then(onFulfilled, onRejected);
    },
  });

  // Allow tests to set the response data
  mockQuery.__setTestResponse = (response: any) => {
    testResponse = response;
  };

  return mockQuery;
};

const createMockSupabase = () => ({
  from: vi.fn().mockReturnValue(createMockQuery()),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  },
});

const createMockUser = () => ({
  id: "user-123",
  email: "test@example.com",
  role: "player",
});

// These will be reassigned in beforeEach
let mockSupabase = createMockSupabase();
let mockUser = createMockUser();

describe("useInteractions - Extended", () => {
  let mockQuery: any;
  let useInteractions: any;
  let useUserStore: any;

  beforeEach(async () => {
    // Clear module cache to reimport with fresh mocks
    vi.resetModules();

    // Create fresh mock instances for this test
    mockSupabase = createMockSupabase();
    mockQuery = createMockQuery();
    mockUser = createMockUser();

    // Register fresh mocks for this test
    vi.doMock("~/composables/useSupabase", () => ({
      useSupabase: () => mockSupabase,
    }));

    vi.doMock("~/stores/user", () => ({
      useUserStore: () => ({
        get user() {
          return mockUser;
        },
        loading: false,
        isAuthenticated: true,
      }),
    }));

    vi.doMock("~/composables/useActiveFamily", () => ({
      useActiveFamily: () => ({
        activeFamilyId: { value: "family-123" },
        activeAthleteId: { value: "athlete-123" },
        isParentViewing: { value: false },
        familyMembers: { value: [] },
        getAccessibleAthletes: () => [],
        getDataOwnerUserId: () => "athlete-123",
        switchAthlete: vi.fn(),
        initializeFamily: vi.fn(),
        fetchFamilyMembers: vi.fn(),
        loading: { value: false },
        error: { value: null },
      }),
    }));

    // Set up mockSupabase.from to return the chainable mockQuery
    mockSupabase.from.mockReturnValue(mockQuery);

    // Dynamically import after mocks are registered
    const composableModule = await import("~/composables/useInteractions");
    useInteractions = composableModule.useInteractions;

    const storeModule = await import("~/stores/user");
    useUserStore = storeModule.useUserStore;

    // Reset Pinia after mocks are set up
    setActivePinia(createPinia());
  });

  afterEach(() => {
    // Clear all mocks (vi.doMock mocks are file-scoped, no need to unmock globally)
    vi.clearAllMocks();
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
      mockQuery.__setTestResponse({ data: mockInteractions, error: null });

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
      mockQuery.__setTestResponse({ data: mockInteractions, error: null });

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
      mockQuery.__setTestResponse({ data: null, error: mockError });

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

      mockQuery.__setTestResponse({ data: mockInteractions, error: null });

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

      mockQuery.__setTestResponse({ data: mockInteractions, error: null });

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
      mockQuery.__setTestResponse({ data: null, error: null });

      const { deleteInteraction } = useInteractions();
      await deleteInteraction("550e8400-e29b-41d4-a716-446655440000");

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(mockQuery.delete).toHaveBeenCalled();
    });
  });
});
