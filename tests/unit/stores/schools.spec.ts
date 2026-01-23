import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSchoolStore } from "~/stores/schools";
import { useUserStore } from "~/stores/user";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";
import type { School } from "~/types/models";

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

describe("useSchoolStore", () => {
  let schoolStore: ReturnType<typeof useSchoolStore>;
  let userStore: ReturnType<typeof useUserStore>;
  let mockQuery: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    schoolStore = useSchoolStore();
    userStore = useUserStore();
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
    };

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

  describe("createSchool", () => {
    it("should create a school successfully", async () => {
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        user_id: undefined,
        created_by: undefined,
        updated_by: undefined,
      });

      const expectedSchool = {
        ...schoolData,
        id: "new-school-id",
        user_id: "user-123",
      };

      mockQuery.single.mockResolvedValue({
        data: expectedSchool,
        error: null,
      });

      const result = await schoolStore.createSchool(schoolData as any);

      expect(result).toEqual(expectedSchool);
      expect(schoolStore.schools).toHaveLength(1);
      expect(schoolStore.schools[0]).toEqual(expectedSchool);
      expect(mockSupabase.from).toHaveBeenCalledWith("schools");

      // Verify insert was called with the data including user tracking fields
      const insertCall = mockQuery.insert.mock.calls[0];
      expect(insertCall).toBeDefined();
      expect(insertCall[0]).toBeInstanceOf(Array);
      expect(insertCall[0][0].user_id).toBe("user-123");
      expect(insertCall[0][0].created_by).toBe("user-123");
      expect(insertCall[0][0].updated_by).toBe("user-123");
    });

    it("should sanitize HTML in notes, pros, and cons", async () => {
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        user_id: undefined,
        created_by: undefined,
        updated_by: undefined,
        notes: '<script>alert("xss")</script>Safe notes',
        pros: ["<b>Bold pro</b>", "Safe pro"],
        cons: ["<i>Italic con</i>", undefined, "Safe con"],
      });

      const expectedSchool = {
        ...schoolData,
        id: "new-school-id",
        user_id: "user-123",
      };

      mockQuery.single.mockResolvedValue({
        data: expectedSchool,
        error: null,
      });

      await schoolStore.createSchool(schoolData as any);

      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          notes: 'alert("xss")Safe notes',
          pros: ["Bold pro", "Safe pro"],
          cons: ["Italic con", "Safe con"],
        }),
      ]);
    });

    it("should handle empty/null pros and cons arrays", async () => {
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        user_id: undefined,
        created_by: undefined,
        updated_by: undefined,
        pros: [undefined, "", "Valid pro"],
        cons: [null, "", "Valid con"],
      });

      mockQuery.single.mockResolvedValue({
        data: { ...schoolData, id: "new-school-id", user_id: "user-123" },
        error: null,
      });

      await schoolStore.createSchool(schoolData as any);

      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          pros: ["Valid pro"],
          cons: ["Valid con"],
        }),
      ]);
    });

    it("should throw error when user is not authenticated", async () => {
      userStore.user = null;
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      });

      await expect(schoolStore.createSchool(schoolData as any)).rejects.toThrow(
        "User not authenticated",
      );
      expect(schoolStore.error).toBe("User not authenticated");
    });

    it("should handle Supabase insert errors", async () => {
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      });

      const dbError = new Error("Database error");
      mockQuery.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        schoolStore.createSchool(schoolData as any),
      ).rejects.toThrow();
      expect(schoolStore.error).toBe("Database error");
    });
  });

  describe("updateSchool", () => {
    const existingSchool = createMockSchool({ id: "existing-school" });

    beforeEach(() => {
      schoolStore.schools = [existingSchool];
    });

    it("should update a school successfully", async () => {
      const updates = { name: "Updated Name", notes: "Updated notes" };
      const updatedSchool = {
        ...existingSchool,
        ...updates,
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockQuery.single.mockResolvedValue({
        data: updatedSchool,
        error: null,
      });

      const result = await schoolStore.updateSchool("existing-school", updates);

      expect(result).toEqual(updatedSchool);
      expect(schoolStore.schools[0]).toEqual(updatedSchool);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_by: "user-123",
          updated_at: expect.any(String),
        }),
      );
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "existing-school");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should sanitize HTML in updates", async () => {
      const updates = {
        notes: '<script>alert("xss")</script>Updated notes',
        pros: ["<b>New pro</b>", "Safe pro"],
        cons: ["<i>New con</i>"],
      };

      mockQuery.single.mockResolvedValue({
        data: { ...existingSchool, ...updates },
        error: null,
      });

      await schoolStore.updateSchool("existing-school", updates);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'alert("xss")Updated notes',
          pros: ["New pro", "Safe pro"],
          cons: ["New con"],
          updated_by: "user-123",
          updated_at: expect.any(String),
        }),
      );
    });

    it("should throw error when user is not authenticated", async () => {
      userStore.user = null;

      await expect(
        schoolStore.updateSchool("existing-school", { name: "New Name" }),
      ).rejects.toThrow("User not authenticated");
      expect(schoolStore.error).toBe("User not authenticated");
    });

    it("should handle Supabase update errors", async () => {
      const updates = { name: "New Name" };

      const updateError = new Error("Update failed");
      mockQuery.single.mockResolvedValue({
        data: null,
        error: updateError,
      });

      await expect(
        schoolStore.updateSchool("existing-school", updates),
      ).rejects.toThrow();
      expect(schoolStore.error).toBe("Update failed");
    });

    it("should not update local state if school not found", async () => {
      const updates = { name: "New Name" };

      mockQuery.single.mockResolvedValue({
        data: { ...existingSchool, ...updates },
        error: null,
      });

      await schoolStore.updateSchool("non-existent-school", updates);

      // Original school should remain unchanged
      expect(schoolStore.schools[0]).toEqual(existingSchool);
    });
  });

  describe("deleteSchool", () => {
    const existingSchool = createMockSchool({ id: "school-to-delete" });

    const setupDeleteMock = (response: any) => {
      const deleteChain = {
        eq: vi.fn(),
      };
      let eqCallCount = 0;
      deleteChain.eq.mockImplementation(() => {
        eqCallCount++;
        // Return the chain for the first eq call (for further chaining)
        // Return the response for the second eq call (to be awaited)
        if (eqCallCount === 1) {
          return deleteChain;
        }
        // For the second call, return something awaitable
        return Promise.resolve(response);
      });

      mockQuery.delete.mockReturnValue(deleteChain);
    };

    beforeEach(() => {
      schoolStore.schools = [existingSchool];
      schoolStore.selectedSchoolId = "school-to-delete";
    });

    it("should delete a school successfully", async () => {
      setupDeleteMock({ data: null, error: null });

      await schoolStore.deleteSchool("school-to-delete");

      expect(schoolStore.schools).toHaveLength(0);
      expect(schoolStore.selectedSchoolId).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it("should throw error when user is not authenticated", async () => {
      userStore.user = null;

      await expect(
        schoolStore.deleteSchool("school-to-delete"),
      ).rejects.toThrow("User not authenticated");
      expect(schoolStore.error).toBe("User not authenticated");
    });

    it("should handle Supabase delete errors", async () => {
      const deleteError = new Error("Delete failed");
      setupDeleteMock({
        data: null,
        error: deleteError,
      });

      await expect(
        schoolStore.deleteSchool("school-to-delete"),
      ).rejects.toThrow();
      expect(schoolStore.error).toBe("Delete failed");
      // School should remain in state on error
      expect(schoolStore.schools).toHaveLength(1);
    });

    it("should clear selected school if it was the deleted one", async () => {
      setupDeleteMock({ data: null, error: null });

      await schoolStore.deleteSchool("school-to-delete");

      expect(schoolStore.selectedSchoolId).toBeNull();
    });

    it("should not clear selected school if different school was deleted", async () => {
      schoolStore.selectedSchoolId = "other-school-id";
      setupDeleteMock({ data: null, error: null });

      await schoolStore.deleteSchool("school-to-delete");

      expect(schoolStore.selectedSchoolId).toBe("other-school-id");
    });
  });

  describe("getSchool", () => {
    const existingSchool = createMockSchool({ id: "school-to-get" });

    it("should get a school successfully", async () => {
      mockQuery.single.mockResolvedValue({
        data: existingSchool,
        error: null,
      });

      const result = await schoolStore.getSchool("school-to-get");

      expect(result).toEqual(existingSchool);
      expect(mockSupabase.from).toHaveBeenCalledWith("schools");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "school-to-get");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockQuery.single).toHaveBeenCalled();
    });

    it("should return null when school not found", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "No rows returned" },
      });

      const result = await schoolStore.getSchool("non-existent-school");

      expect(result).toBeNull();
      expect(schoolStore.error).toBe("Failed to fetch school");
    });

    it("should throw error when user is not authenticated", async () => {
      userStore.user = null;

      const result = await schoolStore.getSchool("school-to-get");

      expect(result).toBeNull();
      expect(schoolStore.error).toBe("User not authenticated");
    });

    it("should handle Supabase query errors", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await schoolStore.getSchool("school-to-get");

      expect(result).toBeNull();
      expect(schoolStore.error).toBe("Failed to fetch school");
    });
  });

  describe("error handling and loading states", () => {
    it("should set loading to true during operations", async () => {
      const schoolData = createMockSchool({
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
      });

      let wasLoadingTrue = false;

      // Track when the async single() call happens
      mockQuery.single.mockImplementation(
        () =>
          new Promise((resolve) => {
            wasLoadingTrue = schoolStore.loading;
            resolve({ data: schoolData, error: null });
          }),
      );

      expect(schoolStore.loading).toBe(false);

      // Call and immediately await - this tests that loading is managed through the operation
      await schoolStore.createSchool(schoolData as any);

      // After completion, should be false
      expect(schoolStore.loading).toBe(false);
      // Should have been true during the async single() call
      expect(wasLoadingTrue).toBe(true);
    });

    it("should reset loading state on error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "Error" },
      });

      try {
        await schoolStore.createSchool({} as any);
      } catch (e) {
        // Expected to throw
      }

      expect(schoolStore.loading).toBe(false);
    });

    it("should clear error state", () => {
      schoolStore.error = "Previous error";

      schoolStore.clearError();

      expect(schoolStore.error).toBeNull();
    });
  });
});
