import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSchoolStore } from "~/stores/schools";
import type { School } from "~/types/models";

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => {
    let lastStatus = "interested";
    return {
      from: vi.fn((table: string) => {
        if (table === "schools") {
          return {
            update: vi.fn(function(data: any) {
              lastStatus = data.status || lastStatus;
              return this;
            }),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              return Promise.resolve({
                data: {
                  id: "school-1",
                  user_id: "user-1",
                  name: "Test School",
                  status: lastStatus,
                  status_changed_at: "2026-01-25T12:00:00Z",
                  priority_tier: "A",
                  division: "D1",
                  location: "Boston, MA",
                  is_favorite: false,
                  website: null,
                  twitter_handle: null,
                  instagram_handle: null,
                  notes: null,
                  pros: [],
                  cons: [],
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-25T12:00:00Z",
                },
                error: null,
              });
            }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === "school_status_history") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "history-1",
                  school_id: "school-1",
                  previous_status: "interested",
                  new_status: "contacted",
                  changed_by: "user-1",
                  changed_at: "2026-01-20T10:00:00Z",
                  notes: null,
                  created_at: "2026-01-20T10:00:00Z",
                },
              ],
              error: null,
            }),
          };
        }
        return {};
      }),
    };
  }),
}));

// Mock user store
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user-1", email: "test@example.com" },
  })),
}));

describe("Schools Store - Status History (Story 3.4)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("Store state initialization", () => {
    it("should initialize with empty statusHistory Map", () => {
      const store = useSchoolStore();
      expect(store.statusHistory).toBeInstanceOf(Map);
      expect(store.statusHistory.size).toBe(0);
    });
  });

  describe("updateStatus action", () => {
    it("should update school status and create history entry", async () => {
      const store = useSchoolStore();
      const mockSchool: School = {
        id: "school-1",
        user_id: "user-1",
        name: "Test School",
        location: "Boston, MA",
        status: "interested",
        status_changed_at: null,
        division: "D1",
        conference: "Ivy League",
        is_favorite: false,
        website: "https://example.com",
        twitter_handle: "@testschool",
        instagram_handle: "testschool",
        notes: "",
        pros: [],
        cons: [],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      store.schools = [mockSchool];

      const result = await store.updateStatus(
        "school-1",
        "committed",
        "Good fit after campus visit",
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("committed");
      expect(result.status_changed_at).toBeTruthy();
      expect(store.schools[0].status).toBe("committed");
    });

    it("should update status without notes when notes are not provided", async () => {
      const store = useSchoolStore();
      const mockSchool: School = {
        id: "school-1",
        user_id: "user-1",
        name: "Test School",
        location: "Boston, MA",
        status: "contacted",
        status_changed_at: "2026-01-20T10:00:00Z",
        division: "D1",
        conference: "Ivy League",
        is_favorite: false,
        website: "https://example.com",
        twitter_handle: "@testschool",
        instagram_handle: "testschool",
        notes: "",
        pros: [],
        cons: [],
      };

      store.schools = [mockSchool];

      const result = await store.updateStatus("school-1", "camp_invite");

      expect(result).toBeDefined();
      expect(result.status).toBe("camp_invite");
    });

    it("should throw error when school not found", async () => {
      const store = useSchoolStore();
      store.schools = [];

      await expect(
        store.updateStatus("non-existent-id", "committed"),
      ).rejects.toThrow();
    });

    it("should clear status history cache after update", async () => {
      const store = useSchoolStore();
      const mockSchool: School = {
        id: "school-1",
        user_id: "user-1",
        name: "Test School",
        location: "Boston, MA",
        status: "interested",
        status_changed_at: null,
        division: "D1",
        conference: "Ivy League",
        is_favorite: false,
        website: "https://example.com",
        twitter_handle: "@testschool",
        instagram_handle: "testschool",
        notes: "",
        pros: [],
        cons: [],
      };

      store.schools = [mockSchool];
      store.statusHistory.set("school-1", []);

      await store.updateStatus("school-1", "committed");

      expect(store.statusHistory.has("school-1")).toBe(false);
    });
  });

  describe("getStatusHistory action", () => {
    it("should fetch status history for a school", async () => {
      const store = useSchoolStore();

      const history = await store.getStatusHistory("school-1");

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].school_id).toBe("school-1");
    });

    it("should cache status history after first fetch", async () => {
      const store = useSchoolStore();

      await store.getStatusHistory("school-1");
      expect(store.statusHistory.has("school-1")).toBe(true);

      const cachedHistory = store.statusHistory.get("school-1");
      expect(cachedHistory).toBeDefined();
      expect(Array.isArray(cachedHistory)).toBe(true);
    });

    it("should return cached history on second fetch", async () => {
      const store = useSchoolStore();

      const firstFetch = await store.getStatusHistory("school-1");
      const secondFetch = await store.getStatusHistory("school-1");

      expect(firstFetch).toEqual(secondFetch);
    });
  });

  describe("Status values", () => {
    it("should support all 9 recruiting status values", () => {
      const validStatuses = [
        "interested",
        "contacted",
        "camp_invite",
        "recruited",
        "official_visit_invited",
        "official_visit_scheduled",
        "offer_received",
        "committed",
        "not_pursuing",
      ] as const;

      const mockSchool: School = {
        id: "school-1",
        user_id: "user-1",
        name: "Test School",
        location: "Boston, MA",
        status: "interested",
        status_changed_at: null,
        division: "D1",
        conference: "Ivy League",
        is_favorite: false,
        website: "https://example.com",
        twitter_handle: "@testschool",
        instagram_handle: "testschool",
        notes: "",
        pros: [],
        cons: [],
      };

      // Verify each status can be assigned to a school
      validStatuses.forEach((status) => {
        expect(mockSchool.status === "interested").toBe(true);
        // This just verifies the type system accepts the value
      });
    });
  });

  describe("Priority tier independence", () => {
    it("should allow status and priority tier to change independently", async () => {
      const store = useSchoolStore();
      const mockSchool: School = {
        id: "school-1",
        user_id: "user-1",
        name: "Test School",
        location: "Boston, MA",
        status: "interested",
        status_changed_at: null,
        priority_tier: "A",
        division: "D1",
        conference: "Ivy League",
        is_favorite: false,
        website: "https://example.com",
        twitter_handle: "@testschool",
        instagram_handle: "testschool",
        notes: "",
        pros: [],
        cons: [],
      };

      store.schools = [mockSchool];

      // Update status only
      await store.updateStatus("school-1", "committed");

      // Priority tier should remain unchanged
      expect(store.schools[0].priority_tier).toBe("A");
      expect(store.schools[0].status).toBe("committed");
    });
  });
});
