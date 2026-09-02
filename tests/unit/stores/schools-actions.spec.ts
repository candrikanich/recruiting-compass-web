import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSchoolStore } from "~/stores/schools";
import { useUserStore } from "~/stores/user";
import {
  createMockSchool,
  createMockSchools,
} from "~/tests/fixtures/schools.fixture";
import type { School } from "~/types/models";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: (html: string) => html.replace(/<[^>]*>/g, ""),
}));

describe("useSchoolStore — computed getters and sync actions", () => {
  let store: ReturnType<typeof useSchoolStore>;
  let userStore: ReturnType<typeof useUserStore>;
  let mockQuery: Record<string, ReturnType<typeof vi.fn>>;

  const d1School = createMockSchool({
    id: "s1",
    name: "Alpha University",
    division: "D1",
    state: "MA",
    status: "researching",
    is_favorite: true,
  });

  const d2School = createMockSchool({
    id: "s2",
    name: "Beta College",
    division: "D2",
    state: "CA",
    status: "contacted",
    is_favorite: false,
  });

  const d1SchoolB = createMockSchool({
    id: "s3",
    name: "Gamma State",
    division: "D1",
    state: "CA",
    status: "researching",
    is_favorite: true,
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSchoolStore();
    userStore = useUserStore();
    userStore.user = { id: "user-123", email: "test@example.com" };

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };
    mockSupabase.from.mockReturnValue(mockQuery);
    vi.clearAllMocks();
  });

  describe("selectedSchool", () => {
    it("returns null when no school is selected", () => {
      store.schools = [d1School, d2School];
      store.selectedSchoolId = null;

      expect(store.selectedSchool).toBeNull();
    });

    it("returns the matching school when one is selected", () => {
      store.schools = [d1School, d2School];
      store.selectedSchoolId = "s2";

      expect(store.selectedSchool).toEqual(d2School);
    });

    it("returns null when selectedSchoolId does not match any school", () => {
      store.schools = [d1School];
      store.selectedSchoolId = "nonexistent";

      expect(store.selectedSchool).toBeNull();
    });
  });

  describe("filteredSchools", () => {
    beforeEach(() => {
      store.schools = [d1School, d2School, d1SchoolB];
    });

    it("returns all schools when no filters are set", () => {
      expect(store.filteredSchools).toHaveLength(3);
    });

    it("filters by division", () => {
      store.setFilters({ division: "D1" });

      expect(store.filteredSchools).toHaveLength(2);
      expect(store.filteredSchools.every((s) => s.division === "D1")).toBe(true);
    });

    it("filters by state", () => {
      store.setFilters({ state: "CA" });

      expect(store.filteredSchools).toHaveLength(2);
      expect(store.filteredSchools.every((s) => s.state === "CA")).toBe(true);
    });

    it("combines division and state filters", () => {
      store.setFilters({ division: "D1", state: "CA" });

      expect(store.filteredSchools).toHaveLength(1);
      expect(store.filteredSchools[0].id).toBe("s3");
    });

    it("returns empty array when no schools match filters", () => {
      store.setFilters({ division: "D3" });

      expect(store.filteredSchools).toHaveLength(0);
    });
  });

  describe("favoriteSchools", () => {
    it("returns only schools marked as favorite", () => {
      store.schools = [d1School, d2School, d1SchoolB];

      expect(store.favoriteSchools).toHaveLength(2);
      expect(store.favoriteSchools.every((s) => s.is_favorite)).toBe(true);
    });

    it("returns empty array when no favorites exist", () => {
      store.schools = [d2School];

      expect(store.favoriteSchools).toHaveLength(0);
    });
  });

  describe("hasSchools", () => {
    it("returns false when schools array is empty", () => {
      expect(store.hasSchools).toBe(false);
    });

    it("returns true when schools exist", () => {
      store.schools = [d1School];

      expect(store.hasSchools).toBe(true);
    });
  });

  describe("schoolsByStatus", () => {
    beforeEach(() => {
      store.schools = [d1School, d2School, d1SchoolB];
    });

    it("returns schools matching the given status", () => {
      const researching = store.schoolsByStatus("researching");

      expect(researching).toHaveLength(2);
      expect(researching.every((s) => s.status === "researching")).toBe(true);
    });

    it("returns empty array for a status with no matches", () => {
      expect(store.schoolsByStatus("committed")).toHaveLength(0);
    });
  });

  describe("schoolsByDivision", () => {
    beforeEach(() => {
      store.schools = [d1School, d2School, d1SchoolB];
    });

    it("returns schools matching the given division", () => {
      const d1 = store.schoolsByDivision("D1");

      expect(d1).toHaveLength(2);
      expect(d1.every((s) => s.division === "D1")).toBe(true);
    });

    it("returns empty array for a division with no matches", () => {
      expect(store.schoolsByDivision("JUCO")).toHaveLength(0);
    });
  });

  describe("statusHistoryFor", () => {
    it("returns cached history for a school", () => {
      const history = [
        { id: "h1", school_id: "s1", new_status: "contacted" },
      ] as School[];
      store.statusHistory = { s1: history as any };

      expect(store.statusHistoryFor("s1")).toEqual(history);
    });

    it("returns empty array for a school with no cached history", () => {
      expect(store.statusHistoryFor("no-history")).toEqual([]);
    });
  });

  describe("setSelectedSchool", () => {
    it("sets the selected school id", () => {
      store.setSelectedSchool("s1");

      expect(store.selectedSchoolId).toBe("s1");
    });

    it("clears selection when null is passed", () => {
      store.selectedSchoolId = "s1";
      store.setSelectedSchool(null);

      expect(store.selectedSchoolId).toBeNull();
    });
  });

  describe("setFilters", () => {
    it("merges partial filters into current state", () => {
      store.setFilters({ division: "D1" });

      expect(store.filters).toEqual({
        division: "D1",
        state: "",
        verified: null,
      });
    });

    it("preserves existing filter values when updating others", () => {
      store.setFilters({ division: "D1" });
      store.setFilters({ state: "MA" });

      expect(store.filters).toEqual({
        division: "D1",
        state: "MA",
        verified: null,
      });
    });
  });

  describe("resetFilters", () => {
    it("restores all filters to defaults", () => {
      store.setFilters({ division: "D1", state: "MA" });
      store.resetFilters();

      expect(store.filters).toEqual({
        division: "",
        state: "",
        verified: null,
      });
    });
  });

  describe("toggleFavorite", () => {
    it("inverts is_favorite via updateSchool", async () => {
      store.schools = [d1School]; // is_favorite: true
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: { ...d1School, is_favorite: false },
        error: null,
      });

      const result = await store.toggleFavorite("s1", true, "family-123");

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_favorite: false }),
      );
      expect(result).toEqual(
        expect.objectContaining({ is_favorite: false }),
      );
    });

    it("sets is_favorite to true when currently false", async () => {
      store.schools = [d2School]; // is_favorite: false
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: { ...d2School, is_favorite: true },
        error: null,
      });

      await store.toggleFavorite("s2", false, "family-123");

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_favorite: true }),
      );
    });
  });

  describe("fetchSchools — error paths", () => {
    it("sets error when user is not authenticated", async () => {
      userStore.user = null;

      await store.fetchSchools("family-123");

      expect(store.error).toBe("User not authenticated");
      expect(store.loading).toBe(false);
    });

    it("sets error when familyId is empty", async () => {
      await store.fetchSchools("");

      expect(store.error).toBe("No family context");
      expect(store.loading).toBe(false);
    });

    it("sets error on supabase fetch failure", async () => {
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.order.mockResolvedValue({
        data: null,
        error: new Error("Connection refused"),
      });

      await store.fetchSchools("family-123");

      expect(store.error).toBe("Connection refused");
      expect(store.schools).toEqual([]);
      expect(store.loading).toBe(false);
    });

    it("stores fetched schools and marks isFetched on success", async () => {
      const schoolList = createMockSchools(3);
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.order.mockResolvedValue({
        data: schoolList,
        error: null,
      });

      await store.fetchSchools("family-123");

      expect(store.schools).toEqual(schoolList);
      expect(store.isFetched).toBe(true);
      expect(store.fetchedFamilyId).toBe("family-123");
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it("handles null data as empty array", async () => {
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.order.mockResolvedValue({ data: null, error: null });

      await store.fetchSchools("family-123");

      expect(store.schools).toEqual([]);
      expect(store.isFetched).toBe(true);
    });
  });

  describe("createSchool — duplicate error code 23505", () => {
    it("surfaces a user-friendly message for unique constraint violations", async () => {
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      });

      const duplicateErr = Object.assign(new Error("unique_violation"), {
        code: "23505",
      });
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: null,
        error: duplicateErr,
      });

      await expect(store.createSchool(schoolData as any)).rejects.toThrow(
        "This school is already on your list.",
      );
      expect(store.error).toBe("This school is already on your list.");
    });
  });

  describe("getSchool — missing familyId", () => {
    it("returns null and sets error when familyId is empty", async () => {
      const result = await store.getSchool("s1", "");

      expect(result).toBeNull();
      expect(store.error).toBe("No family context");
    });
  });

  describe("updateSchool — missing familyId", () => {
    it("throws when familyId is empty", async () => {
      await expect(
        store.updateSchool("s1", { name: "X" }, ""),
      ).rejects.toThrow("No family context");
      expect(store.error).toBe("No family context");
    });
  });

  describe("deleteSchool — missing familyId", () => {
    it("throws when familyId is empty", async () => {
      await expect(store.deleteSchool("s1", "")).rejects.toThrow(
        "No family context",
      );
      expect(store.error).toBe("No family context");
    });
  });
});
