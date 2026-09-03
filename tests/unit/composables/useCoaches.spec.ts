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

const mockFetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
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
        createMockCoach({
          id: "coach-2",
          first_name: "Jane",
          role: "assistant",
        }),
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

  describe("fetchAllCoaches", () => {
    it("delegates to store without filters", async () => {
      const mockCoaches = [
        createMockCoach(),
        createMockCoach({ id: "coach-2", last_name: "Adams" }),
      ];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      const { fetchAllCoaches, coaches } = useCoaches();
      await fetchAllCoaches();

      expect(coaches.value).toEqual(mockCoaches);
    });

    it("delegates to store with filters", async () => {
      const filtered = [createMockCoach({ role: "assistant" })];
      mockQuery.order.mockResolvedValue({ data: filtered, error: null });

      const { fetchAllCoaches, coaches } = useCoaches();
      await fetchAllCoaches({ role: "assistant", schoolId: "school-123" });

      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", "school-123");
      expect(mockQuery.eq).toHaveBeenCalledWith("role", "assistant");
      expect(coaches.value).toEqual(filtered);
    });

    it("handles fetch error", async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: new Error("Network failure"),
      });

      const { fetchAllCoaches, error } = useCoaches();
      await fetchAllCoaches();

      expect(error.value).toBe("Network failure");
    });
  });

  describe("fetchCoachesBySchools", () => {
    it("fetches coaches for multiple school IDs", async () => {
      const mockCoaches = [
        createMockCoach({ school_id: "school-1" }),
        createMockCoach({ id: "coach-2", school_id: "school-2" }),
      ];
      mockQuery.in = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi
            .fn()
            .mockResolvedValue({ data: mockCoaches, error: null }),
        }),
      });

      const { fetchCoachesBySchools, coaches } = useCoaches();
      await fetchCoachesBySchools(["school-1", "school-2"]);

      expect(coaches.value).toEqual(mockCoaches);
    });

    it("clears coaches when given empty array", async () => {
      const { fetchCoachesBySchools, coaches } = useCoaches();
      await fetchCoachesBySchools([]);

      expect(coaches.value).toEqual([]);
    });

    it("handles fetch error", async () => {
      mockQuery.in = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi
            .fn()
            .mockResolvedValue({
              data: null,
              error: new Error("Query failed"),
            }),
        }),
      });

      const { fetchCoachesBySchools, error } = useCoaches();
      await fetchCoachesBySchools(["school-1"]);

      expect(error.value).toBe("Query failed");
    });
  });

  describe("createCoach", () => {
    it("creates coach via store and captures posthog event", async () => {
      const newCoach = createMockCoach({ id: "coach-new" });
      mockQuery.single.mockResolvedValue({ data: newCoach, error: null });
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);

      const mockCapture = vi.fn();
      vi.mocked(globalThis.useNuxtApp).mockReturnValue({
        $posthog: { capture: mockCapture },
      } as any);

      const { createCoach } = useCoaches();
      const result = await createCoach("school-123", {
        school_id: "school-123",
        user_id: "user-123",
        first_name: "New",
        last_name: "Coach",
        role: "head",
      } as any);

      expect(result).toEqual(newCoach);
      expect(mockCapture).toHaveBeenCalledWith("coach_added");
    });

    it("still returns coach when posthog is unavailable", async () => {
      const newCoach = createMockCoach({ id: "coach-new" });
      mockQuery.single.mockResolvedValue({ data: newCoach, error: null });
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);

      vi.mocked(globalThis.useNuxtApp).mockReturnValue({
        $posthog: undefined,
      } as any);

      const { createCoach } = useCoaches();
      const result = await createCoach("school-123", {
        school_id: "school-123",
        user_id: "user-123",
        first_name: "New",
        last_name: "Coach",
        role: "head",
      } as any);

      expect(result).toEqual(newCoach);
    });
  });

  describe("updateCoach", () => {
    it("updates coach via store", async () => {
      const updated = createMockCoach({ first_name: "Updated" });
      mockQuery.single.mockResolvedValue({ data: updated, error: null });
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);

      // Seed store with initial coach
      mockQuery.order.mockResolvedValue({
        data: [createMockCoach()],
        error: null,
      });
      const { fetchCoaches, updateCoach, coaches } = useCoaches();
      await fetchCoaches("school-123");

      const result = await updateCoach("coach-1", { first_name: "Updated" });

      expect(result).toEqual(updated);
    });

    it("propagates store errors", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Update denied"),
      });
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);

      const { updateCoach } = useCoaches();

      await expect(
        updateCoach("coach-1", { first_name: "X" }),
      ).rejects.toThrow("Update denied");
    });
  });

  describe("deleteCoach", () => {
    it("deletes coach via store and removes from local state", async () => {
      // Seed the store directly via fetchAllCoaches (no per-school cache guard)
      mockQuery.order.mockResolvedValue({
        data: [createMockCoach()],
        error: null,
      });
      const { fetchAllCoaches, deleteCoach, coaches } = useCoaches();
      await fetchAllCoaches();
      expect(coaches.value).toHaveLength(1);

      // Set up delete mock chain
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      await deleteCoach("coach-1");
      expect(coaches.value).toHaveLength(0);
    });

    it("propagates delete errors", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockResolvedValue({ error: new Error("Cannot delete") }),
          }),
        }),
      });

      const { deleteCoach } = useCoaches();
      await expect(deleteCoach("coach-1")).rejects.toThrow("Cannot delete");
    });
  });

  describe("smartDelete", () => {
    it("returns cascadeUsed: false when simple delete succeeds", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const { smartDelete } = useCoaches();
      const result = await smartDelete("coach-1");

      expect(result).toEqual({ cascadeUsed: false });
    });

    it("falls back to cascade when FK constraint error occurs", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error(
                "Cannot delete: violates foreign key constraint",
              ),
            }),
          }),
        }),
      });

      mockFetchAuth.mockResolvedValue({ success: true });

      const { smartDelete } = useCoaches();
      const result = await smartDelete("coach-1");

      expect(result).toEqual({ cascadeUsed: true });
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/coaches/coach-1/cascade-delete",
        { method: "POST", body: { confirmDelete: true } },
      );
    });

    it("throws when cascade delete also fails", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error("Cannot delete: still referenced"),
            }),
          }),
        }),
      });

      mockFetchAuth.mockResolvedValue({
        success: false,
        message: "Cascade not allowed",
      });

      const { smartDelete } = useCoaches();
      await expect(smartDelete("coach-1")).rejects.toThrow(
        "Cascade not allowed",
      );
    });

    it("re-throws non-FK errors without attempting cascade", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error("Permission denied"),
            }),
          }),
        }),
      });

      const { smartDelete } = useCoaches();
      await expect(smartDelete("coach-1")).rejects.toThrow(
        "Permission denied",
      );
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });
  });
});
