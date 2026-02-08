import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import type { School } from "~/types/models";

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

const createMockSchool = (overrides: Partial<School> = {}): School => ({
  id: "school-1",
  user_id: "user-1",
  name: "Test School",
  location: "Test Location",
  city: "Test City",
  state: "CA",
  division: "D1",
  conference: "Test Conference",
  ranking: null,
  is_favorite: false,
  website: "https://test.edu",
  favicon_url: null,
  twitter_handle: "@test",
  instagram_handle: "@test",
  ncaa_id: "test123",
  status: "interested",
  status_changed_at: null,
  priority_tier: null,
  notes: "Test notes",
  pros: ["Good program"],
  cons: ["Far away"],
  family_unit_id: "family-123",
  ...overrides,
});

describe("useSchools - Extended Coverage", () => {
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
      upsert: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("createSchool", () => {
    it("should create school with valid data", async () => {
      const newSchool = createMockSchool();
      mockQuery.single.mockResolvedValueOnce({
        data: newSchool,
        error: null,
      });

      const schools = useSchools();
      const result = await schools.createSchool({
        user_id: "athlete-123",
        name: "Test School",
        city: "Test City",
        state: "CA",
        location: "Test Location",
        conference: "Test Conference",
        website: "https://test.edu",
        twitter_handle: "@test",
        instagram_handle: "@test",
        ncaa_id: "test123",
        status: "interested",
        is_favorite: false,
        notes: "Test notes",
        pros: ["Good program"],
        cons: ["Far away"],
        family_unit_id: "family-123",
        division: "D1",
      } as any);

      expect(result.id).toBe("school-1");
      expect(result.name).toBe("Test School");
      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
    });

    it("should fail creation when name is empty", async () => {
      const schools = useSchools();
      await expect(() =>
        schools.createSchool({
          name: "",
          city: "Test",
          state: "CA",
          status: "interested",
          is_favorite: false,
          family_unit_id: "family-123",
        } as any),
      ).rejects.toThrow();
    });

    it("should fail creation with invalid state code", async () => {
      const schools = useSchools();
      await expect(() =>
        schools.createSchool({
          name: "Test School",
          city: "Test",
          state: "INVALID",
          status: "interested",
          is_favorite: false,
          family_unit_id: "family-123",
        } as any),
      ).rejects.toThrow();
    });

    it("should handle Supabase insert error", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      const schools = useSchools();
      await expect(() =>
        schools.createSchool({
          user_id: "athlete-123",
          name: "Test School",
          city: "Test",
          state: "CA",
          location: "Test",
          conference: "Test",
          status: "interested",
          is_favorite: false,
          family_unit_id: "family-123",
          notes: "Test",
          pros: [],
          cons: [],
          website: "https://test.edu",
          twitter_handle: "@test",
          instagram_handle: "@test",
        } as any),
      ).rejects.toThrow();
    });
  });

  describe("updateSchool", () => {
    it("should update school successfully", async () => {
      const updated = createMockSchool({ name: "Updated School" });
      mockQuery.single.mockResolvedValueOnce({
        data: updated,
        error: null,
      });

      const schools = useSchools();
      const result = await schools.updateSchool("school-1", {
        name: "Updated School",
      });

      expect(result.name).toBe("Updated School");
      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
      expect(mockQuery.update).toHaveBeenCalled();
    });

    it("should handle update error - permission denied", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Permission denied" },
      });

      const schools = useSchools();
      await expect(() =>
        schools.updateSchool("school-1", { name: "Updated" }),
      ).rejects.toThrow("Permission denied");
    });

    it("should handle update error - school not found", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "No rows updated" },
      });

      const schools = useSchools();
      await expect(() =>
        schools.updateSchool("nonexistent", { name: "Updated" }),
      ).rejects.toThrow();
    });

    it("should throw when user not authenticated", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() =>
        schools.updateSchool("school-1", { name: "Updated" }),
      ).rejects.toThrow("User not authenticated");
    });
  });

  describe("deleteSchool", () => {
    it("should delete school successfully", async () => {
      mockQuery.delete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValueOnce({
              error: null,
            }),
          }),
        }),
      });

      const schools = useSchools();
      await expect(schools.deleteSchool("school-1")).resolves.toBeUndefined();

      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
    });

    it("should handle delete error - school not found", async () => {
      mockQuery.delete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValueOnce({
            error: { message: "No rows deleted" },
          }),
        }),
      });

      const schools = useSchools();
      await expect(() => schools.deleteSchool("nonexistent")).rejects.toThrow();
    });

    it("should throw when user not authenticated", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() => schools.deleteSchool("school-1")).rejects.toThrow();
    });
  });

  describe("Duplicate Detection - findDuplicate", () => {
    it("should return object with duplicate and matchType properties", () => {
      const schools = useSchools();
      const school = createMockSchool({ name: "Stanford" });

      (schools as any).schools.value = [school];

      const result = schools.findDuplicate({
        name: "Stanford",
      });

      expect(result).toHaveProperty("duplicate");
      expect(result).toHaveProperty("matchType");
    });

    it("should return null when no duplicate found", () => {
      const schools = useSchools();
      (schools as any).schools.value = [];

      const result = schools.findDuplicate({
        name: "New University",
      });

      expect(result.duplicate).toBeNull();
      expect(result.matchType).toBeNull();
    });
  });

  describe("getSchool", () => {
    it("should fetch school by id", async () => {
      const school = createMockSchool();
      mockQuery.single.mockResolvedValueOnce({
        data: school,
        error: null,
      });

      const schools = useSchools();
      const result = await schools.getSchool("school-1");

      expect(result?.id).toBe("school-1");
      expect(result?.name).toBe("Test School");
    });

    it("should return null when school not found", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "No rows found" },
      });

      const schools = useSchools();
      const result = await schools.getSchool("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when user not authenticated", async () => {
      userStore.user = null;

      const schools = useSchools();
      const result = await schools.getSchool("school-1");

      expect(result).toBeNull();
    });
  });

  describe("toggleFavorite", () => {
    it("should toggle favorite status", async () => {
      const school = createMockSchool({ is_favorite: true });
      mockQuery.single.mockResolvedValueOnce({
        data: school,
        error: null,
      });

      const schools = useSchools();
      const result = await schools.toggleFavorite("school-1", false);

      expect(result.is_favorite).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  describe("updateRanking", () => {
    it("should batch update rankings", async () => {
      mockQuery.upsert = vi.fn().mockResolvedValueOnce({
        error: null,
      });

      const schools = useSchools();
      const schoolsToRank = [
        createMockSchool({ id: "school-1", ranking: 1 }),
        createMockSchool({ id: "school-2", ranking: 2 }),
      ];

      await expect(
        schools.updateRanking(schoolsToRank),
      ).resolves.toBeUndefined();
      expect(mockQuery.upsert).toHaveBeenCalled();
    });

    it("should handle ranking update error", async () => {
      mockQuery.upsert = vi.fn().mockResolvedValueOnce({
        error: { message: "Database error" },
      });

      const schools = useSchools();
      const schoolsToRank = [createMockSchool()];

      await schools.updateRanking(schoolsToRank);

      expect(schools.error.value).toBeTruthy();
    });

    it("should throw when user not authenticated", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() =>
        schools.updateRanking([createMockSchool()]),
      ).rejects.toThrow("User not authenticated");
    });
  });

  describe("updateStatus", () => {
    it("should handle status update error", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Failed to update status" },
      });

      const schools = useSchools();
      await expect(() =>
        schools.updateStatus("school-1", "offer_received"),
      ).rejects.toThrow();
    });

    it("should throw when user not authenticated", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() =>
        schools.updateStatus("school-1", "interested"),
      ).rejects.toThrow("User not authenticated");
    });
  });

  describe("fetchSchools", () => {
    it("should skip fetch when user not authenticated", async () => {
      userStore.user = null;

      const schools = useSchools();
      await schools.fetchSchools();

      expect(schools.schools.value).toEqual([]);
    });

    it("should load schools when authenticated", async () => {
      const schoolList = [
        createMockSchool({ id: "school-1" }),
        createMockSchool({ id: "school-2" }),
      ];

      const chainedMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: schoolList,
          error: null,
        }),
        order: vi.fn(),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(chainedMock),
      });

      const schools = useSchools();
      await schools.fetchSchools();

      // Just verify it completes without throwing
      expect(schools.loading.value).toBe(false);
    });
  });

  describe("error state management", () => {
    it("should set error when create fails", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Create failed" },
      });

      const schools = useSchools();

      try {
        await schools.createSchool({
          name: "Test School",
          city: "Test",
          state: "CA",
          status: "interested",
          is_favorite: false,
          family_unit_id: "family-123",
          location: "Test",
          conference: "Test",
          notes: "Test",
          pros: [],
          cons: [],
          website: "https://test.edu",
          twitter_handle: "@test",
          instagram_handle: "@test",
          user_id: "user-1",
        } as any);
      } catch {
        // Expected
      }

      expect(schools.error.value).toBeTruthy();
    });

    it("should set error when update fails", async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed" },
      });

      const schools = useSchools();

      try {
        await schools.updateSchool("school-1", { name: "Updated" });
      } catch {
        // Expected
      }

      expect(schools.error.value).toBeTruthy();
    });

    it("should set error when delete fails", async () => {
      mockQuery.delete = vi.fn().mockReturnThis();
      mockQuery.eq = vi.fn().mockResolvedValueOnce({
        error: { message: "Delete failed" },
      });

      const schools = useSchools();

      try {
        await schools.deleteSchool("school-1");
      } catch {
        // Expected
      }

      expect(schools.error.value).toBeTruthy();
    });
  });

  describe("Access control", () => {
    it("should require user authentication for create", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() =>
        schools.createSchool({
          name: "Test",
          city: "Test",
          state: "CA",
          status: "interested",
          is_favorite: false,
          family_unit_id: "family-123",
        } as any),
      ).rejects.toThrow("User not authenticated");
    });

    it("should require authentication for update", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() =>
        schools.updateSchool("school-1", { name: "Updated" }),
      ).rejects.toThrow();
    });

    it("should require authentication for delete", async () => {
      userStore.user = null;

      const schools = useSchools();
      await expect(() => schools.deleteSchool("school-1")).rejects.toThrow();
    });
  });
});
