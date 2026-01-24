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
    } as any;

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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
});
