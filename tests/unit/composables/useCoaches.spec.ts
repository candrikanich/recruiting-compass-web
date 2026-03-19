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

vi.mock("~/composables/useActiveFamily", () => ({
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

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    activeFamilyId: { value: "family-123" },
  }),
}));

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn() }),
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
      role: "player",
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
    mockSupabase.from.mockReturnValue(mockQuery);

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
    last_contact_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  describe("fetchCoaches", () => {
    it("delegates to store and populates coaches ref", async () => {
      const mockCoaches = [
        createMockCoach(),
        createMockCoach({ id: "coach-2", first_name: "Jane", role: "assistant" }),
      ];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(coaches.value).toEqual(mockCoaches);
    });

    it("should handle fetch error via store", async () => {
      const fetchError = new Error("Database error");
      mockQuery.order.mockResolvedValue({ data: null, error: fetchError });

      const { fetchCoaches, error } = useCoaches();
      await fetchCoaches("school-123");

      expect(error.value).toBe("Database error");
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
  });

  describe("getCoach", () => {
    it("should fetch single coach by id via store", async () => {
      const mockCoach = createMockCoach();
      mockQuery.single.mockResolvedValue({ data: mockCoach, error: null });

      const { getCoach } = useCoaches();
      const result = await getCoach("coach-1");

      expect(mockQuery.eq).toHaveBeenCalledWith("id", "coach-1");
      expect(result).toEqual(mockCoach);
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

  });

  describe("Computed Properties", () => {
    it("should expose coaches as computed ref", async () => {
      const mockCoaches = [createMockCoach()];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      const { fetchCoaches, coaches } = useCoaches();
      await fetchCoaches("school-123");

      expect(coaches.value).toEqual(mockCoaches);
      expect(coaches.effect).toBeDefined();
      expect(typeof coaches.value).toBe("object");
    });

    it("should expose loading as computed ref", () => {
      const { loading } = useCoaches();

      expect(loading.value).toBe(false);
      expect(loading.effect).toBeDefined();
      expect(typeof loading.value).toBe("boolean");
    });

    it("should expose error as computed ref", () => {
      const { error } = useCoaches();

      expect(error.value).toBeNull();
      expect(error.effect).toBeDefined();
      expect(typeof error.value).toBe("object");
    });
  });
});
