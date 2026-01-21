import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCoaches } from "~/composables/useCoaches";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import type { Coach } from "~/types/models";

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

describe("useCoaches", () => {
  let mockQuery: any;
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    userStore = useUserStore();
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
    };

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-123",
    user_id: "user-123",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john.smith@university.edu",
    phone: "555-123-4567",
    twitter_handle: "@coachsmith",
    instagram_handle: "coachsmith",
    notes: "Head coach",
    responsiveness_score: 85,
    last_contact_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  describe("fetchCoaches", () => {
    it("should fetch coaches for a specific school", async () => {
      const mockCoaches = [
        createMockCoach(),
        createMockCoach({
          id: "coach-2",
          first_name: "Jane",
          role: "assistant",
        }),
      ];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(mockSupabase.from).toHaveBeenCalledWith("coaches");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", "school-123");
      expect(mockQuery.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(coaches.value).toEqual(mockCoaches);
    });

    it("should handle fetch error", async () => {
      const fetchError = new Error("Database error");
      mockQuery.order.mockResolvedValue({ data: null, error: fetchError });

      const { fetchCoaches, error } = useCoaches();
      await fetchCoaches("school-123");

      expect(error.value).toBe("Database error");
      expect(console.error).toHaveBeenCalledWith("Fetch error:", fetchError);
      expect(console.error).toHaveBeenCalledWith(
        "Coach fetch error:",
        "Database error",
      );
    });

    it("should set loading state during fetch", async () => {
      mockQuery.order.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: [], error: null }), 100),
          ),
      );

      const { fetchCoaches, loading } = useCoaches();

      const fetchPromise = fetchCoaches("school-123");
      expect(loading.value).toBe(true);

      await fetchPromise;
      expect(loading.value).toBe(false);
    });

    it("should handle empty results", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(coaches.value).toEqual([]);
    });

    it("should handle null data response", async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(coaches.value).toEqual([]);
    });

    it("should fetch coaches for different schools independently", async () => {
      const school1Coaches = [
        createMockCoach({ id: "coach-1", school_id: "school-1" }),
      ];
      const school2Coaches = [
        createMockCoach({ id: "coach-2", school_id: "school-2" }),
      ];

      const { fetchCoaches, coaches } = useCoaches();

      mockQuery.order.mockResolvedValueOnce({
        data: school1Coaches,
        error: null,
      });
      await fetchCoaches("school-1");
      expect(coaches.value).toEqual(school1Coaches);

      mockQuery.order.mockResolvedValueOnce({
        data: school2Coaches,
        error: null,
      });
      await fetchCoaches("school-2");
      expect(coaches.value).toEqual(school2Coaches);
    });
  });

  describe("getCoach", () => {
    it("should fetch single coach by id", async () => {
      const mockCoach = createMockCoach();
      mockQuery.single.mockResolvedValue({ data: mockCoach, error: null });

      const { getCoach } = useCoaches();
      const result = await getCoach("coach-1");

      expect(mockQuery.eq).toHaveBeenCalledWith("id", "coach-1");
      expect(result).toEqual(mockCoach);
    });

    it("should return null if user not authenticated", async () => {
      userStore.user = null;

      const { getCoach } = useCoaches();
      const result = await getCoach("coach-1");

      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const { getCoach, error } = useCoaches();
      const result = await getCoach("coach-1");

      expect(result).toBeNull();
      expect(error.value).toBe("Not found");
    });

    it("should handle non-existent coach", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("No rows returned"),
      });

      const { getCoach } = useCoaches();
      const result = await getCoach("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("createCoach", () => {
    it("should create a new coach", async () => {
      const newCoachData = {
        role: "assistant" as const,
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@university.edu",
        phone: "555-567-8901",
        twitter_handle: "coachdoe",
        instagram_handle: "coachdoe",
        notes: "Assistant coach",
        responsiveness_score: 90,
        last_contact_date: "2024-02-01",
      };

      const createdCoach = createMockCoach({
        ...newCoachData,
        id: "new-coach-id",
      });
      mockQuery.single.mockResolvedValue({ data: createdCoach, error: null });

      const { createCoach, coaches } = useCoaches();
      const result = await createCoach("school-123", newCoachData);

      expect(mockQuery.insert).toHaveBeenCalledWith([
        {
          email: "jane.doe@university.edu",
          first_name: "Jane",
          instagram_handle: "coachdoe",
          last_name: "Doe",
          notes: "Assistant coach",
          phone: "555-567-8901",
          role: "assistant",
          school_id: "school-123",
          twitter_handle: "coachdoe",
        },
      ]);

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should handle null values in coach data", async () => {
      const coachWithNulls = createMockCoach({
        email: null,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
        notes: null,
        last_contact_date: null,
      });

      mockQuery.order.mockResolvedValue({
        data: [coachWithNulls],
        error: null,
      });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(coaches.value[0]).toEqual(coachWithNulls);
    });

    it("should handle responsiveness_score edge values", async () => {
      const coaches = [
        createMockCoach({ id: "coach-1", responsiveness_score: 0 }),
        createMockCoach({ id: "coach-2", responsiveness_score: 100 }),
        createMockCoach({ id: "coach-3", responsiveness_score: 50 }),
      ];

      mockQuery.order.mockResolvedValue({ data: coaches, error: null });

      const { fetchCoaches, coaches: coachesRef } = useCoaches();
      await fetchCoaches("school-123");

      expect(coachesRef.value.map((c) => c.responsiveness_score)).toEqual([
        0, 100, 50,
      ]);
    });
  });

  describe("Computed Properties", () => {
    it("should expose coaches as computed ref", async () => {
      const mockCoaches = [createMockCoach()];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(coaches.value).toEqual(mockCoaches);
      // Verify it's a computed ref (readonly) - check it has effect property (Vue 3 computed)
      expect(coaches.effect).toBeDefined();
      // Should not be directly writable
      expect(typeof coaches.value).toBe("object");
    });

    it("should expose loading as computed ref", () => {
      const { loading } = useCoaches();

      expect(loading.value).toBe(false);
      // Verify it's a computed ref (readonly)
      expect(loading.effect).toBeDefined();
      expect(typeof loading.value).toBe("boolean");
    });

    it("should expose error as computed ref", () => {
      const { error } = useCoaches();

      expect(error.value).toBeNull();
      // Verify it's a computed ref (readonly)
      expect(error.effect).toBeDefined();
      expect(typeof error.value).toBe("object"); // can be null or string
    });
  });
});
