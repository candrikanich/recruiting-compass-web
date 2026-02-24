import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSchools } from "~/composables/useSchools";
import * as authFetchModule from "~/composables/useAuthFetch";

const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: mockFrom,
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-123", full_name: "Test User" },
  }),
}));

vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({
    activeFamilyId: { value: "family-123" },
    getDataOwnerUserId: () => "user-123",
  }),
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    activeFamilyId: { value: "family-123" },
    getDataOwnerUserId: () => "user-123",
  }),
}));

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: (s: string) => s,
}));

vi.mock("~/utils/validation/schemas", () => ({
  schoolSchema: {
    parseAsync: vi
      .fn()
      .mockResolvedValue({ name: "Test", status: "researching" }),
    shape: {},
  },
}));

describe("useSchools error scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset chain mocks
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      delete: mockDelete.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder,
      single: mockSingle,
    });
  });

  const getComposable = () => useSchools();

  describe("fetchSchools error handling", () => {
    it("sets error ref on Supabase fetch error", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "Connection refused" },
      });

      const { fetchSchools, error } = getComposable();
      await fetchSchools();

      expect(error.value).toBeTruthy();
    });

    it("sets user-friendly error on unknown error type", async () => {
      mockOrder.mockRejectedValue("unknown");

      const { fetchSchools, error } = getComposable();
      await fetchSchools();

      expect(error.value).toBe("Failed to fetch schools");
    });

    it("clears loading after error", async () => {
      mockOrder.mockRejectedValue(new Error("Network timeout"));

      const { fetchSchools, loading } = getComposable();
      await fetchSchools();

      expect(loading.value).toBe(false);
    });
  });

  describe("createSchool error handling", () => {
    it("sets error and re-throws on insert failure", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { createSchool, error } = getComposable();

      await expect(
        createSchool({
          name: "Test School",
          status: "researching",
        } as any),
      ).rejects.toThrow();

      expect(error.value).toBeTruthy();
    });

    it("preserves error message from Error instances", async () => {
      mockSingle.mockRejectedValue(
        new Error("Validation error: name too long"),
      );
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { createSchool, error } = getComposable();

      await expect(
        createSchool({ name: "Test", status: "researching" } as any),
      ).rejects.toThrow("Validation error: name too long");
    });
  });

  describe("updateSchool error handling", () => {
    it("sets error and re-throws on update failure", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const { updateSchool, error } = getComposable();

      await expect(
        updateSchool("school-1", { name: "Updated Name" }),
      ).rejects.toThrow();

      expect(error.value).toBeTruthy();
    });
  });

  describe("deleteSchool error handling", () => {
    it("provides specific FK constraint error message", async () => {
      const fkError = {
        message: "violates foreign key constraint on coaches",
      };
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: fkError }),
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      const { deleteSchool, error } = getComposable();

      await expect(deleteSchool("school-1")).rejects.toThrow(
        "Cannot delete this school",
      );

      expect(error.value).toContain("associated coaches");
    });

    it("passes through non-FK errors", async () => {
      const genericError = { message: "Database unavailable" };
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: genericError }),
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      const { deleteSchool, error } = getComposable();

      await expect(deleteSchool("school-1")).rejects.toBeDefined();
      // The error message is set from the Supabase error before the catch
      expect(error.value).toBeTruthy();
    });

    it("clears loading after delete error", async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: "Delete failed" },
        }),
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      const { deleteSchool, loading } = getComposable();

      await expect(deleteSchool("school-1")).rejects.toBeDefined();
      expect(loading.value).toBe(false);
    });
  });

  describe("smartDelete error handling", () => {
    it("falls back to cascade on FK constraint error", async () => {
      const mockFetchAuth = vi
        .fn()
        .mockResolvedValue({ success: true });
      vi.spyOn(authFetchModule, "useAuthFetch").mockReturnValue({
        $fetchAuth: mockFetchAuth,
      });

      const fkError = {
        message: "violates foreign key constraint on coaches",
      };
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: fkError }),
        }),
      });

      const { smartDelete } = getComposable();
      const result = await smartDelete("school-1");

      expect(result.cascadeUsed).toBe(true);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/schools/school-1/cascade-delete",
        expect.objectContaining({
          method: "POST",
          body: { confirmDelete: true },
        }),
      );
    });

    it("throws when cascade delete also fails", async () => {
      const fkError = {
        message: "Cannot delete this school because it has associated coaches",
      };
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: fkError }),
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      vi.spyOn(authFetchModule, "useAuthFetch").mockReturnValue({
        $fetchAuth: vi
          .fn()
          .mockResolvedValue({ success: false, message: "Cascade failed" }),
      });

      const { smartDelete } = getComposable();

      await expect(smartDelete("school-1")).rejects.toBeDefined();
    });

    it("re-throws non-FK errors without cascade attempt", async () => {
      const genericError = { message: "Permission denied" };
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: genericError }),
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      const mockFetchAuth = vi.fn();
      vi.spyOn(authFetchModule, "useAuthFetch").mockReturnValue({
        $fetchAuth: mockFetchAuth,
      });

      const { smartDelete } = getComposable();

      await expect(smartDelete("school-1")).rejects.toBeDefined();
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });
  });

  describe("session/auth handling", () => {
    it("skips fetch when no user is set", async () => {
      // Override userStore mock for this test
      const userStoreMod = await import("~/stores/user");
      vi.spyOn(userStoreMod, "useUserStore").mockReturnValue({
        user: null,
      } as any);

      const { fetchSchools } = getComposable();
      await fetchSchools();

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
