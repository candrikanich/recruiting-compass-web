import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";

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
  });

  describe("deleteSchool", () => {
    it("should delete a school without user_id check", async () => {
      mockQuery.delete.mockReturnThis();
      mockQuery.eq.mockReturnThis();

      const { deleteSchool, schools } = useSchools();

      // Manually set schools state for this test
      schools.value = [{ id: "school-1", name: "Baldwin Wallace" }] as any;

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

      // Verify schools array was updated
      expect(schools.value).toHaveLength(0);
    });
  });

  describe("fetchSchools - deduplication", () => {
    it("should not display duplicate schools in list", async () => {
      // Simulate database returning duplicate schools
      mockQuery.order.mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "school-1",
                  name: "Baldwin Wallace",
                  family_unit_id: "family-123",
                },
                {
                  id: "school-1",
                  name: "Baldwin Wallace",
                  family_unit_id: "family-123",
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const { fetchSchools, schools } = useSchools();
      await fetchSchools();

      // Should only have one Baldwin Wallace after deduplication
      const baldwinWallaces = schools.value.filter(
        (s) => s.name === "Baldwin Wallace",
      );
      expect(baldwinWallaces).toHaveLength(1);
    });

    it("deduplicates concurrent fetchSchools calls - only one Supabase query fires", async () => {
      let resolveQuery!: (val: any) => void;
      const queryPromise = new Promise((resolve) => {
        resolveQuery = resolve;
      });
      mockQuery.order.mockReturnValue(queryPromise);

      const { fetchSchools } = useSchools();

      const p1 = fetchSchools();
      const p2 = fetchSchools();

      resolveQuery({ data: [], error: null });
      await Promise.all([p1, p2]);

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });
});
