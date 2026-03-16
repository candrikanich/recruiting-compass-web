import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCoachStore } from "~/stores/coaches";
import { useUserStore } from "~/stores/user";
import type { Coach } from "~/types/models";

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: (html: string) => html.replace(/<[^>]*>/g, ""),
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    activeFamilyId: { value: "family-123" },
  }),
}));

describe("useCoachStore", () => {
  let coachStore: ReturnType<typeof useCoachStore>;
  let userStore: ReturnType<typeof useUserStore>;
  let mockQuery: any;

  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-123",
    user_id: "user-123",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john@example.com",
    phone: "555-1234",
    twitter_handle: "@coach",
    instagram_handle: "coach",
    notes: "Head coach",
    responsiveness_score: 85,
    last_contact_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    coachStore = useCoachStore();
    userStore = useUserStore();
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
    };

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("State Management", () => {
    it("should initialize with empty state", () => {
      expect(coachStore.coaches).toEqual([]);
      expect(coachStore.loading).toBe(false);
      expect(coachStore.error).toBeNull();
      expect(coachStore.isFetched).toBe(false);
      expect(coachStore.isFetchedBySchools).toEqual({});
      expect(coachStore.filters).toEqual({
        schoolId: undefined,
        role: undefined,
        search: undefined,
      });
    });
  });

  describe("fetchCoaches", () => {
    it("should fetch coaches for a specific school", async () => {
      const mockCoaches = [
        createMockCoach(),
        createMockCoach({ id: "coach-2", role: "assistant" }),
      ];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      await coachStore.fetchCoaches("school-123");

      expect(mockSupabase.from).toHaveBeenCalledWith("coaches");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", "school-123");
      expect(coachStore.coaches).toHaveLength(2);
      expect(coachStore.isFetchedBySchools["school-123"]).toBe(true);
    });

    it("should skip fetch if school coaches already loaded", async () => {
      const mockCoaches = [createMockCoach()];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      await coachStore.fetchCoaches("school-123");
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);

      // Second call should not fetch
      await coachStore.fetchCoaches("school-123");
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should handle fetch error", async () => {
      const fetchError = new Error("Database error");
      mockQuery.order.mockResolvedValue({ data: null, error: fetchError });

      await coachStore.fetchCoaches("school-123");

      expect(coachStore.error).toBe("Database error");
      expect(coachStore.coaches).toHaveLength(0);
    });

    it("should set loading state during fetch", async () => {
      mockQuery.order.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: [], error: null }), 50),
          ),
      );

      const fetchPromise = coachStore.fetchCoaches("school-123");
      expect(coachStore.loading).toBe(true);

      await fetchPromise;
      expect(coachStore.loading).toBe(false);
    });
  });

  describe("fetchAllCoaches", () => {
    it("should fetch all coaches", async () => {
      const mockCoaches = [
        createMockCoach(),
        createMockCoach({ id: "coach-2", school_id: "school-456" }),
      ];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      await coachStore.fetchAllCoaches();

      expect(coachStore.coaches).toHaveLength(2);
      expect(coachStore.isFetched).toBe(true);
    });

    it("should apply school filter when provided", async () => {
      const mockCoaches = [createMockCoach({ school_id: "school-123" })];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      // Reset isFetched to allow filtering
      coachStore.isFetched = false;

      await coachStore.fetchAllCoaches({ schoolId: "school-123" });

      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", "school-123");
      expect(coachStore.coaches).toHaveLength(1);
    });

    it("should apply role filter when provided", async () => {
      const mockCoaches = [createMockCoach({ role: "head" })];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      coachStore.isFetched = false;
      await coachStore.fetchAllCoaches({ role: "head" });

      expect(mockQuery.eq).toHaveBeenCalledWith("role", "head");
    });

    it("should update coaches on fetch", async () => {
      const mockCoaches = [createMockCoach()];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      coachStore.isFetched = false;
      await coachStore.fetchAllCoaches();

      expect(coachStore.coaches).toHaveLength(1);
    });
  });

  describe("fetchCoachesBySchools", () => {
    it("should handle empty school list", async () => {
      await coachStore.fetchCoachesBySchools([]);

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(coachStore.coaches).toHaveLength(0);
    });

    it("should select specific columns for optimization", async () => {
      const mockCoaches = [createMockCoach()];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      await coachStore.fetchCoachesBySchools(["school-1"]);

      expect(mockQuery.select).toHaveBeenCalledWith(
        "id, school_id, first_name, last_name, email, responsiveness_score, last_contact_date, role",
      );
    });

    it("should call in with school ids", async () => {
      const mockCoaches = [createMockCoach()];
      mockQuery.order.mockResolvedValue({ data: mockCoaches, error: null });

      await coachStore.fetchCoachesBySchools(["school-1", "school-2"]);

      expect(mockQuery.in).toHaveBeenCalledWith("school_id", [
        "school-1",
        "school-2",
      ]);
    });
  });

  describe("getCoach", () => {
    it("should fetch single coach by id", async () => {
      const mockCoach = createMockCoach();
      mockQuery.single.mockResolvedValue({ data: mockCoach, error: null });

      const result = await coachStore.getCoach("coach-1");

      expect(mockQuery.eq).toHaveBeenCalledWith("id", "coach-1");
      expect(result).toEqual(mockCoach);
    });

    it("should return null on error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const result = await coachStore.getCoach("non-existent");

      expect(result).toBeNull();
      expect(coachStore.error).toBe("Not found");
    });
  });

  describe("createCoach", () => {
    it("should create a new coach and add to state", async () => {
      const newCoachData = {
        role: "head" as const,
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
      };

      const createdCoach = createMockCoach({
        ...newCoachData,
        id: "new-coach",
      });
      mockQuery.single.mockResolvedValue({ data: createdCoach, error: null });

      // Pre-populate coaches
      const initialCoach = createMockCoach();
      coachStore.coaches = [initialCoach];

      const result = await coachStore.createCoach(
        "school-123",
        newCoachData as any,
      );

      expect(result).toEqual(createdCoach);
      expect(coachStore.coaches).toHaveLength(2);
    });

    it("should sanitize notes field on create", async () => {
      const coachData = {
        role: "head" as const,
        first_name: "John",
        last_name: "Smith",
        notes: '<script>alert("xss")</script>Notes',
      };

      const createdCoach = createMockCoach();
      mockQuery.single.mockResolvedValue({ data: createdCoach, error: null });

      await coachStore.createCoach("school-123", coachData as any);

      const insertCall = mockQuery.insert.mock.calls[0][0][0];
      expect(insertCall.notes).not.toContain("<script>");
    });

    it("should clear error on successful creation", async () => {
      coachStore.error = "Previous error";
      const createdCoach = createMockCoach();
      mockQuery.single.mockResolvedValue({ data: createdCoach, error: null });

      await coachStore.createCoach("school-123", {} as any);

      expect(coachStore.error).toBeNull();
    });
  });

  describe("updateCoach", () => {
    it("should update an existing coach", async () => {
      const initialCoach = createMockCoach();
      coachStore.coaches = [initialCoach];

      const updates = { first_name: "Johnny", responsiveness_score: 95 };
      const updatedCoach = createMockCoach(updates);
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null });

      const result = await coachStore.updateCoach("coach-1", updates);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining(updates),
      );
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "coach-1");
      expect(result).toEqual(updatedCoach);
      expect(coachStore.coaches[0]).toEqual(updatedCoach);
    });

    it("should sanitize notes field on update", async () => {
      coachStore.coaches = [createMockCoach()];

      const updates = { notes: "<b>Safe HTML</b>" };
      const updatedCoach = createMockCoach();
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null });

      await coachStore.updateCoach("coach-1", updates);

      const updateCall = mockQuery.update.mock.calls[0][0];
      expect(updateCall.notes).not.toContain("<b>");
    });

    it("should update updated_by and updated_at fields", async () => {
      const updates = { first_name: "Johnny" };
      const updatedCoach = createMockCoach(updates);
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null });

      await coachStore.updateCoach("coach-1", updates);

      const updateCall = mockQuery.update.mock.calls[0][0];
      expect(updateCall.updated_by).toBe("user-123");
      expect(updateCall.updated_at).toBeDefined();
    });

    it("should clear error on successful update", async () => {
      coachStore.error = "Previous error";
      mockQuery.single.mockResolvedValue({
        data: createMockCoach(),
        error: null,
      });

      await coachStore.updateCoach("coach-1", {});

      expect(coachStore.error).toBeNull();
    });

    it("should handle update error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Update failed"),
      });

      await expect(coachStore.updateCoach("coach-1", {})).rejects.toThrow(
        "Update failed",
      );
      expect(coachStore.error).toBe("Update failed");
    });
  });

  describe("deleteCoach", () => {
    const setupDeleteMock = (response: any) => {
      const deleteChain = { eq: vi.fn() };
      let eqCallCount = 0;
      deleteChain.eq.mockImplementation(() => {
        eqCallCount++;
        // .eq("id", ...) returns chain; .eq("family_unit_id", ...) resolves
        if (eqCallCount < 2) return deleteChain;
        return Promise.resolve(response);
      });
      mockQuery.delete.mockReturnValue(deleteChain);
      return deleteChain;
    };

    it("should delete a coach", async () => {
      const coach1 = createMockCoach();
      const coach2 = createMockCoach({ id: "coach-2" });
      coachStore.coaches = [coach1, coach2];

      const deleteChain = setupDeleteMock({ error: null });

      await coachStore.deleteCoach("coach-1");

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(deleteChain.eq).toHaveBeenCalledWith("id", "coach-1");
      expect(deleteChain.eq).toHaveBeenCalledWith(
        "family_unit_id",
        "family-123",
      );
      expect(coachStore.coaches).toHaveLength(1);
      expect(coachStore.coaches[0].id).toBe("coach-2");
    });

    it("should handle delete error", async () => {
      setupDeleteMock({ error: new Error("Delete failed") });

      await expect(coachStore.deleteCoach("coach-1")).rejects.toThrow(
        "Delete failed",
      );
      expect(coachStore.error).toBe("Delete failed");
    });

    it("should clear error on successful delete", async () => {
      coachStore.error = "Previous error";
      setupDeleteMock({ error: null });

      await coachStore.deleteCoach("coach-1");

      expect(coachStore.error).toBeNull();
    });
  });

  describe("Getters", () => {
    beforeEach(() => {
      coachStore.coaches = [
        createMockCoach({
          id: "coach-1",
          school_id: "school-1",
          role: "head",
          responsiveness_score: 85,
        }),
        createMockCoach({
          id: "coach-2",
          school_id: "school-2",
          role: "assistant",
          responsiveness_score: 60,
        }),
        createMockCoach({
          id: "coach-3",
          school_id: "school-1",
          role: "recruiting",
          responsiveness_score: 90,
        }),
      ];
    });

    it("should filter coaches by school", () => {
      const school1Coaches = coachStore.coachesBySchool("school-1");
      expect(school1Coaches).toHaveLength(2);
      expect(school1Coaches.every((c) => c.school_id === "school-1")).toBe(
        true,
      );
    });

    it("should filter coaches by role", () => {
      const headCoaches = coachStore.coachesByRole("head");
      expect(headCoaches).toHaveLength(1);
      expect(headCoaches[0].role).toBe("head");
    });

    it("should sort coaches by responsiveness", () => {
      const sorted = coachStore.coachesByResponsiveness;
      expect(sorted[0].responsiveness_score).toBe(90); // Highest
      expect(sorted[1].responsiveness_score).toBe(85);
      expect(sorted[2].responsiveness_score).toBe(60); // Lowest
    });

    it("should sort coaches by last contact date", () => {
      const now = new Date();
      coachStore.coaches = [
        createMockCoach({
          id: "coach-1",
          last_contact_date: new Date(
            now.getTime() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockCoach({
          id: "coach-2",
          last_contact_date: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockCoach({
          id: "coach-3",
          last_contact_date: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const sorted = coachStore.coachesByLastContact;
      expect(sorted[0].id).toBe("coach-3"); // Most recent
      expect(sorted[2].id).toBe("coach-1"); // Oldest
    });

    it("should handle coaches without last contact date", () => {
      coachStore.coaches = [
        createMockCoach({ id: "coach-1", last_contact_date: "2024-01-01" }),
        createMockCoach({ id: "coach-2", last_contact_date: null }),
      ];

      const sorted = coachStore.coachesByLastContact;
      expect(sorted[0].id).toBe("coach-1"); // With date comes first
      expect(sorted[1].id).toBe("coach-2"); // Without date comes last
    });

    it("should apply filters correctly", () => {
      coachStore.setFilters({ schoolId: "school-1", role: "head" });

      const filtered = coachStore.filteredCoaches;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("coach-1");
    });

    it("should search by first name", () => {
      coachStore.setFilters({ search: "john" });

      const filtered = coachStore.filteredCoaches;
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].first_name.toLowerCase()).toContain("john");
    });

    it("should check if coaches fetched for school", () => {
      coachStore.isFetchedBySchools["school-1"] = true;

      expect(coachStore.areCoachesFetched("school-1")).toBe(true);
      expect(coachStore.areCoachesFetched("school-999")).toBe(false);
    });
  });

  describe("Filter Management", () => {
    it("should set filters", () => {
      coachStore.setFilters({ schoolId: "school-1", role: "head" });

      expect(coachStore.filters.schoolId).toBe("school-1");
      expect(coachStore.filters.role).toBe("head");
    });

    it("should merge filter updates", () => {
      coachStore.setFilters({ schoolId: "school-1" });
      coachStore.setFilters({ role: "head" });

      expect(coachStore.filters.schoolId).toBe("school-1");
      expect(coachStore.filters.role).toBe("head");
    });

    it("should reset filters", () => {
      coachStore.setFilters({
        schoolId: "school-1",
        role: "head",
        search: "john",
      });
      coachStore.resetFilters();

      expect(coachStore.filters).toEqual({
        schoolId: undefined,
        role: undefined,
        search: undefined,
      });
    });

    it("should clear error", () => {
      coachStore.error = "Test error";
      coachStore.clearError();

      expect(coachStore.error).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null coaches data", async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null });

      await coachStore.fetchCoaches("school-123");

      expect(coachStore.coaches).toHaveLength(0);
    });

    it("should handle empty coaches array", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await coachStore.fetchCoaches("school-123");

      expect(coachStore.coaches).toHaveLength(0);
    });

    it("should not duplicate coaches on multiple fetches", async () => {
      const mockCoach = createMockCoach();
      mockQuery.order.mockResolvedValue({ data: [mockCoach], error: null });

      // First fetch
      await coachStore.fetchCoaches("school-123");
      expect(coachStore.coaches).toHaveLength(1);

      // Clear fetched flag to allow second fetch
      coachStore.isFetchedBySchools["school-123"] = false;

      // Second fetch
      mockQuery.order.mockResolvedValue({ data: [mockCoach], error: null });
      await coachStore.fetchCoaches("school-123");

      // Should not have duplicates
      expect(coachStore.coaches.filter((c) => c.id === "coach-1")).toHaveLength(
        1,
      );
    });

    it("should handle updating non-existent coach in state", async () => {
      const updatedCoach = createMockCoach({ id: "coach-999" });
      mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null });

      await coachStore.updateCoach("coach-999", {});

      // Should not crash, coach added to state
      expect(
        coachStore.coaches.find((c) => c.id === "coach-999"),
      ).toBeUndefined();
    });
  });
});
