import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import { useSchoolStore } from "~/stores/schools";
import { useSchools } from "~/composables/useSchools";
import { useNuxtApp } from "#app";

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

describe("useSchools", () => {
  let mockQuery: any;
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    userStore = useUserStore();
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
      role: "player",
    } as any;

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("createSchool", () => {
    it("should create a new school", async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: "school-1", name: "Test School" },
        error: null,
      });

      const { createSchool } = useSchools();

      const result = await createSchool({
        name: "Test School",
        city: "Test City",
        state: "TS",
        status: "researching",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
      expect(mockQuery.insert).toHaveBeenCalled();
      expect(result).toEqual({ id: "school-1", name: "Test School" });
    });

    it("captures school_added event on success", async () => {
      const mockCapture = vi.fn();
      vi.mocked(useNuxtApp).mockReturnValue({
        $posthog: { capture: mockCapture },
      } as ReturnType<typeof useNuxtApp>);

      mockQuery.single.mockResolvedValue({
        data: { id: "school-1", name: "Test School" },
        error: null,
      });

      const { createSchool } = useSchools();
      await createSchool({
        name: "Test School",
        city: "Test City",
        state: "TS",
        status: "researching",
      });

      expect(mockCapture).toHaveBeenCalledWith("school_added", {
        division: null,
      });
    });
  });

  describe("deleteSchool", () => {
    it("should delete a school without user_id check", async () => {
      mockQuery.delete.mockReturnThis();
      mockQuery.eq.mockReturnThis();

      // Seed via store — schools is now a computed read from useSchoolStore
      const schoolStore = useSchoolStore();
      schoolStore.schools = [
        { id: "school-1", name: "Baldwin Wallace" },
      ] as any;

      const { deleteSchool, schools } = useSchools();

      await deleteSchool("school-1");

      // Verify delete was called with only id and family_unit_id, not user_id
      const deleteCalls = mockSupabase.from.mock.calls;
      const deleteCall = deleteCalls.find(
        (call: any[]) => call[0] === "schools",
      );
      expect(deleteCall).toBeDefined();

      // The critical check: delete should NOT have eq("user_id", ...) call
      const eqCalls = mockQuery.eq.mock.calls;
      const userIdCheck = eqCalls.some((call: any[]) => call[0] === "user_id");
      expect(userIdCheck).toBe(false);

      // Verify schools array was updated (store removes the deleted school)
      expect(schools.value).toHaveLength(0);
    });
  });

  describe("fetchSchools - store delegation", () => {
    it("delegates fetchSchools to store and reflects store state", async () => {
      const schoolStore = useSchoolStore();
      // Seed the store directly — composable reflects store state
      schoolStore.schools = [
        {
          id: "school-1",
          name: "Baldwin Wallace",
          family_unit_id: "family-123",
        },
      ] as any;
      schoolStore.isFetched = true;

      const { schools } = useSchools();

      // Schools ref reads from store, so store-seeded data is visible
      expect(schools.value).toHaveLength(1);
      expect(schools.value[0].name).toBe("Baldwin Wallace");
    });

    it("concurrent fetchSchools calls complete without error", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      const { fetchSchools } = useSchools();

      // Both calls should complete without throwing (store deduplicates)
      await Promise.all([fetchSchools(), fetchSchools()]);
    });
  });
});
