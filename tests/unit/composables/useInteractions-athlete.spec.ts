import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useInteractions } from "~/composables/useInteractions";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import type { Interaction } from "~/types/models";

let mockSupabase: any;
let mockUser: any;

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

describe("useInteractions - Athlete Features", () => {
  let mockQuery: any;
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    // Create fresh mockUser for each test
    mockUser = {
      id: "athlete-123",
      email: "athlete@example.com",
    };

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
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    let testResponses: { data: any[]; error: null } = { data: [], error: null };

    Object.defineProperty(mockQuery, "then", {
      value: (
        onFulfilled: (value: any) => any,
        onRejected?: (reason: any) => any,
      ) => {
        return Promise.resolve(testResponses).then(onFulfilled, onRejected);
      },
    });

    mockQuery.__setTestData = (data: any[]) => {
      testResponses.data = data;
    };

    // Create fresh mockSupabase for each test
    mockSupabase = {
      from: vi.fn(),
    };
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    // Reset to prevent pollution
    mockUser = null;
    mockSupabase = null;
  });

  const createMockInteraction = (
    overrides: Partial<Interaction> = {},
  ): Interaction => ({
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
    logged_by: "athlete-123",
    attachments: [],
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-01T12:00:00Z",
    user_id: "athlete-123",
    ...overrides,
  });

  describe("fetchInteractions with loggedBy filter", () => {
    it("should filter interactions by loggedBy field", async () => {
      const athleteId = "athlete-123";
      const mockInteractions = [
        createMockInteraction({ logged_by: athleteId }),
        createMockInteraction({ logged_by: "parent-456" }),
      ];

      mockQuery.__setTestData(mockInteractions);
      const { fetchInteractions, interactions } = useInteractions();

      await fetchInteractions({ loggedBy: athleteId });

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", athleteId);
      expect(interactions.value.length).toBe(2);
    });

    it("should support loggedBy filter combined with other filters", async () => {
      const athleteId = "athlete-123";
      const schoolId = "school-789";
      const mockInteractions = [
        createMockInteraction({
          logged_by: athleteId,
          school_id: schoolId,
        }),
      ];

      mockQuery.__setTestData(mockInteractions);
      const { fetchInteractions, interactions } = useInteractions();

      await fetchInteractions({
        loggedBy: athleteId,
        schoolId: schoolId,
        type: "email",
      });

      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", schoolId);
      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", athleteId);
      expect(mockQuery.eq).toHaveBeenCalledWith("type", "email");
    });
  });

  describe("fetchMyInteractions", () => {
    it("should fetch only current user interactions", async () => {
      const userId = "athlete-123";
      const mockInteractions = [
        createMockInteraction({ logged_by: userId }),
        createMockInteraction({ logged_by: userId }),
      ];

      mockQuery.__setTestData(mockInteractions);
      const { fetchMyInteractions, interactions } = useInteractions();

      await fetchMyInteractions();

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", userId);
      expect(interactions.value.length).toBe(2);
    });

    it("should support filters for own interactions", async () => {
      const userId = "athlete-123";
      const schoolId = "school-789";

      mockQuery.__setTestData([
        createMockInteraction({
          logged_by: userId,
          school_id: schoolId,
        }),
      ]);

      const { fetchMyInteractions, interactions } = useInteractions();

      await fetchMyInteractions({ schoolId });

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", userId);
      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", schoolId);
      expect(interactions.value.length).toBe(1);
    });
  });

  describe("fetchAthleteInteractions", () => {
    it("should fetch interactions for specific athlete", async () => {
      const athleteId = "athlete-456";
      const mockInteractions = [
        createMockInteraction({ logged_by: athleteId }),
        createMockInteraction({ logged_by: athleteId }),
      ];

      mockQuery.__setTestData(mockInteractions);
      const { fetchAthleteInteractions, interactions } = useInteractions();

      await fetchAthleteInteractions(athleteId);

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", athleteId);
      expect(interactions.value.length).toBe(2);
    });

    it("should support filters for athlete interactions", async () => {
      const athleteId = "athlete-456";
      const schoolId = "school-789";

      mockQuery.__setTestData([
        createMockInteraction({
          logged_by: athleteId,
          school_id: schoolId,
        }),
      ]);

      const { fetchAthleteInteractions, interactions } = useInteractions();

      await fetchAthleteInteractions(athleteId, { schoolId });

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", athleteId);
      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", schoolId);
      expect(interactions.value.length).toBe(1);
    });
  });

  describe("createInteraction with logged_by", () => {
    it("should set logged_by to current user", async () => {
      const newInteraction = {
        school_id: "550e8400-e29b-41d4-a716-446655440000",
        coach_id: "550e8400-e29b-41d4-a716-446655440001",
        type: "email" as const,
        direction: "outbound" as const,
        occurred_at: "2024-01-01T12:00:00Z",
        subject: "Test",
        content: "Test content",
      };

      mockQuery.__setTestData([newInteraction]);
      mockQuery.single.mockReturnThis();

      const { createInteraction } = useInteractions();

      const result = await createInteraction(newInteraction);

      expect(mockQuery.insert).toHaveBeenCalled();
      const insertCall = mockQuery.insert.mock.calls[0][0];
      expect(insertCall[0].logged_by).toBe("athlete-123");
    });
  });
});
