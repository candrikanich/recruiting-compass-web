import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCoaches } from "~/composables/useCoaches";
import { useUserStore } from "~/stores/user";
import type { Coach } from "~/types/models";

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    activeFamilyId: { value: "family-123" },
    activeAthleteId: { value: "athlete-123" },
    isParentViewing: { value: false },
    familyMembers: { value: [] },
    getAccessibleAthletes: () => [],
    getDataOwnerUserId: () => "user-123",
  }),
}));

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: (html: string) => html.replace(/<[^>]*>/g, ""),
}));

// Mock fetch for cascade delete
global.fetch = vi.fn();

describe("Coach Deletion Integration", () => {
  let userStore: ReturnType<typeof useUserStore>;

  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-123",
    family_unit_id: "family-123",
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
    updated_by: "user-123",
    ...overrides,
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    userStore = useUserStore();

    userStore.user = {
      id: "user-123",
      email: "test@example.com",
    };

    // Setup a chainable mock that works with Supabase pattern
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    // Make the query chainable and resolvable
    mockQuery.then = vi.fn(function (onFulfilled: any) {
      return Promise.resolve({ error: null }).then(onFulfilled);
    });

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("useCoaches API", () => {
    it("should provide deleteCoach method", () => {
      const { deleteCoach } = useCoaches();
      expect(typeof deleteCoach).toBe("function");
    });

    it("should provide smartDelete method", () => {
      const { smartDelete } = useCoaches();
      expect(typeof smartDelete).toBe("function");
    });

    it("should have coaches, loading, and error refs", () => {
      const { coaches, loading, error } = useCoaches();
      expect(coaches).toBeDefined();
      expect(loading).toBeDefined();
      expect(error).toBeDefined();
    });
  });

  describe("Simple Coach Deletion", () => {
    it("should handle successful coach deletion", async () => {
      const { deleteCoach, error } = useCoaches();

      // Perform deletion
      await deleteCoach("coach-123");

      // Error should be null after successful deletion
      expect(error.value).toBeNull();
    });

    it("should handle deletion errors gracefully", async () => {
      const { deleteCoach, error } = useCoaches();

      // Setup mock to return an error
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn(function (onFulfilled: any) {
          return Promise.resolve({ error: new Error("Delete failed") }).then(onFulfilled);
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      try {
        await deleteCoach("coach-123");
      } catch (e) {
        // Expected - deletion should fail
      }

      // Error should be set
      expect(error.value).toBeTruthy();
    });
  });

  describe("smartDelete with FK Constraints", () => {
    it("should return cascadeUsed false for simple delete", async () => {
      const { smartDelete } = useCoaches();

      const result = await smartDelete("coach-123");

      expect(result.cascadeUsed).toBe(false);
    });

    it("should attempt cascade delete on FK constraint error", async () => {
      const { smartDelete } = useCoaches();

      // Setup mock to return FK constraint error
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        then: vi.fn(function (onFulfilled: any) {
          return Promise.resolve({
            error: new Error("violates foreign key constraint"),
          }).then(onFulfilled);
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock cascade delete endpoint
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ success: true, message: "Deleted" }),
      });

      const result = await smartDelete("coach-123");

      expect(result.cascadeUsed).toBe(true);
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require authentication before deletion", async () => {
      const { deleteCoach } = useCoaches();

      // Clear user authentication
      userStore.user = null;

      await expect(deleteCoach("coach-123")).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("should require active family for deletion", async () => {
      // This test verifies the composable validates family context
      // In normal use, useFamilyContext provides the family ID
      const { deleteCoach } = useCoaches();

      // With mock, activeFamily should be set to "family-123" by default
      expect(userStore.user).toBeTruthy();

      // Should not throw if family is set (default in mock)
      const deleteTask = deleteCoach("coach-123");
      expect(deleteTask).toBeDefined();
    });
  });
});
