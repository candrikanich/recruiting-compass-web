import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Each test sets mockSupabaseResult before calling the composable method.
const mockSupabaseResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

// Chainable builder whose terminal methods return mockSupabaseResult
function buildChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const methods = [
    "from",
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "or",
    "is",
    "order",
    "single",
    "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      if (m === "single" || m === "maybeSingle") {
        return Promise.resolve(mockSupabaseResult);
      }
      // Most terminal queries are awaited directly
      const p = Promise.resolve(mockSupabaseResult) as Promise<unknown> &
        Record<string, unknown>;
      // attach chain methods on the promise so callers can do .select().single()
      for (const n of methods) {
        p[n] = vi.fn(() => Promise.resolve(mockSupabaseResult));
      }
      return Object.assign(buildChain(), {
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(mockSupabaseResult).then(res, rej),
      });
    });
  }
  return chain;
}

const mockSupabase = buildChain();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-123", email: "test@example.com" },
  }),
}));

import { useCollaboration } from "~/composables/useCollaboration";

describe("useCollaboration", () => {
  let collaboration: ReturnType<typeof useCollaboration>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseResult.data = null;
    mockSupabaseResult.error = null;
    collaboration = useCollaboration();
  });

  describe("initialization", () => {
    it("should initialize with empty shared records", () => {
      expect(collaboration.sharedRecords).toBeDefined();
      expect(Array.isArray(collaboration.sharedRecords.value)).toBe(true);
    });

    it("should initialize with empty comments", () => {
      expect(collaboration.recordComments).toBeDefined();
      expect(Array.isArray(collaboration.recordComments.value)).toBe(true);
    });

    it("should initialize with empty team members", () => {
      expect(collaboration.teamMembers).toBeDefined();
      expect(Array.isArray(collaboration.teamMembers.value)).toBe(true);
    });
  });

  describe("API surface", () => {
    it("should expose sharing methods", () => {
      expect(typeof collaboration.shareRecord).toBe("function");
      expect(typeof collaboration.revokeAccess).toBe("function");
      expect(typeof collaboration.updateAccessLevel).toBe("function");
    });

    it("should expose comment methods", () => {
      expect(typeof collaboration.addComment).toBe("function");
      expect(typeof collaboration.deleteComment).toBe("function");
    });

    it("should expose team members", () => {
      expect(collaboration.teamMembers).toBeDefined();
      expect(collaboration.activeTeamMembers).toBeDefined();
    });

    it("should expose filtered views", () => {
      expect(collaboration.mySharedRecords).toBeDefined();
      expect(collaboration.sharedWithMe).toBeDefined();
    });

    it("should expose loading and error states", () => {
      expect(collaboration.isLoading).toBeDefined();
      expect(collaboration.error).toBeDefined();
    });
  });

  describe("state management", () => {
    it("should have no shared records initially", () => {
      expect(collaboration.sharedRecords.value.length).toBe(0);
    });

    it("should have no comments initially", () => {
      expect(collaboration.recordComments.value.length).toBe(0);
    });

    it("should have no team members initially", () => {
      expect(collaboration.teamMembers.value.length).toBe(0);
    });
  });

  // ── loadSharedRecords ─────────────────────────────────────────────────────

  describe("loadSharedRecords", () => {
    it("populates sharedRecords on success", async () => {
      const records = [
        {
          id: "sr-1",
          owner_user_id: "user-123",
          shared_with_user_id: "user-456",
          entity_type: "school",
          entity_id: "school-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
      ];
      mockSupabaseResult.data = records;
      mockSupabaseResult.error = null;

      await collaboration.loadSharedRecords();

      expect(collaboration.sharedRecords.value).toEqual(records);
      expect(collaboration.error.value).toBeNull();
      expect(collaboration.isLoading.value).toBe(false);
    });

    it("sets error state when query fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("DB error");

      await collaboration.loadSharedRecords();

      expect(collaboration.error.value).toBe("DB error");
      expect(collaboration.isLoading.value).toBe(false);
    });

    it("clears error before each load", async () => {
      mockSupabaseResult.error = new Error("first error");
      await collaboration.loadSharedRecords();
      expect(collaboration.error.value).toBeTruthy();

      mockSupabaseResult.data = [];
      mockSupabaseResult.error = null;
      await collaboration.loadSharedRecords();
      expect(collaboration.error.value).toBeNull();
    });
  });

  // ── shareRecord ───────────────────────────────────────────────────────────

  describe("shareRecord", () => {
    it("inserts a new record and prepends it to sharedRecords", async () => {
      const newShare = {
        id: "sr-new",
        owner_user_id: "user-123",
        shared_with_user_id: "",
        entity_type: "school" as const,
        entity_id: "school-42",
        access_level: "view" as const,
        shared_at: new Date().toISOString(),
      };
      mockSupabaseResult.data = newShare;
      mockSupabaseResult.error = null;

      const result = await collaboration.shareRecord("school", "school-42");

      expect(result).toEqual(newShare);
      expect(collaboration.sharedRecords.value[0]).toEqual(newShare);
      expect(collaboration.error.value).toBeNull();
    });

    it("returns null and sets error when insert fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("Insert failed");

      const result = await collaboration.shareRecord("coach", "coach-1");

      expect(result).toBeNull();
      expect(collaboration.error.value).toBe("Insert failed");
    });
  });

  // ── revokeAccess ──────────────────────────────────────────────────────────

  describe("revokeAccess", () => {
    it("removes the record from sharedRecords on success", async () => {
      // Seed a record first
      collaboration.sharedRecords.value = [
        {
          id: "sr-1",
          owner_user_id: "user-123",
          shared_with_user_id: "user-456",
          entity_type: "school",
          entity_id: "school-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
      ];
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = null;

      const success = await collaboration.revokeAccess("sr-1");

      expect(success).toBe(true);
      expect(
        collaboration.sharedRecords.value.find((r) => r.id === "sr-1"),
      ).toBeUndefined();
    });

    it("returns false and sets error when delete fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("Delete failed");

      const success = await collaboration.revokeAccess("sr-1");

      expect(success).toBe(false);
      expect(collaboration.error.value).toBe("Delete failed");
    });
  });

  // ── loadComments ──────────────────────────────────────────────────────────

  describe("loadComments", () => {
    it("populates recordComments on success", async () => {
      const comments = [
        {
          id: "c-1",
          user_id: "user-123",
          entity_type: "school" as const,
          entity_id: "school-1",
          content: "Great school!",
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
      ];
      mockSupabaseResult.data = comments;
      mockSupabaseResult.error = null;

      await collaboration.loadComments("school", "school-1");

      expect(collaboration.recordComments.value).toEqual(comments);
      expect(collaboration.error.value).toBeNull();
      expect(collaboration.isLoading.value).toBe(false);
    });

    it("sets error state when query fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("Comments query failed");

      await collaboration.loadComments("school", "school-1");

      expect(collaboration.error.value).toBe("Comments query failed");
      expect(collaboration.isLoading.value).toBe(false);
    });
  });

  // ── addComment ────────────────────────────────────────────────────────────

  describe("addComment", () => {
    it("appends new comment to recordComments on success", async () => {
      const newComment = {
        id: "c-new",
        user_id: "user-123",
        entity_type: "school" as const,
        entity_id: "school-1",
        content: "Nice program",
        created_at: new Date().toISOString(),
        deleted_at: null,
      };
      mockSupabaseResult.data = newComment;
      mockSupabaseResult.error = null;

      const result = await collaboration.addComment(
        "school",
        "school-1",
        "Nice program",
      );

      expect(result).toEqual(newComment);
      expect(collaboration.recordComments.value).toContainEqual(newComment);
      expect(collaboration.error.value).toBeNull();
    });

    it("returns null and sets error when insert fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("Comment insert failed");

      const result = await collaboration.addComment("coach", "coach-1", "text");

      expect(result).toBeNull();
      expect(collaboration.error.value).toBe("Comment insert failed");
    });
  });

  // ── deleteComment ─────────────────────────────────────────────────────────

  describe("deleteComment", () => {
    it("soft-deletes comment and removes it from recordComments", async () => {
      collaboration.recordComments.value = [
        {
          id: "c-1",
          user_id: "user-123",
          entity_type: "school",
          entity_id: "school-1",
          content: "Old comment",
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
      ];
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = null;

      const success = await collaboration.deleteComment("c-1");

      expect(success).toBe(true);
      expect(
        collaboration.recordComments.value.find((c) => c.id === "c-1"),
      ).toBeUndefined();
    });

    it("returns false and sets error when update fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("Update failed");

      const success = await collaboration.deleteComment("c-1");

      expect(success).toBe(false);
      expect(collaboration.error.value).toBe("Update failed");
    });
  });

  // ── updateAccessLevel ─────────────────────────────────────────────────────

  describe("updateAccessLevel", () => {
    it("updates access_level on the matching shared record", async () => {
      collaboration.sharedRecords.value = [
        {
          id: "sr-1",
          owner_user_id: "user-123",
          shared_with_user_id: "user-456",
          entity_type: "school",
          entity_id: "school-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
      ];
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = null;

      const success = await collaboration.updateAccessLevel("sr-1", "edit");

      expect(success).toBe(true);
      expect(
        collaboration.sharedRecords.value.find((r) => r.id === "sr-1")
          ?.access_level,
      ).toBe("edit");
    });

    it("returns false and sets error when update fails", async () => {
      mockSupabaseResult.data = null;
      mockSupabaseResult.error = new Error("Access update failed");

      const success = await collaboration.updateAccessLevel("sr-1", "admin");

      expect(success).toBe(false);
      expect(collaboration.error.value).toBe("Access update failed");
    });
  });

  // ── computed views ────────────────────────────────────────────────────────

  describe("computed views", () => {
    it("mySharedRecords filters to records owned by current user", () => {
      collaboration.sharedRecords.value = [
        {
          id: "sr-1",
          owner_user_id: "user-123",
          shared_with_user_id: "user-456",
          entity_type: "school",
          entity_id: "school-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
        {
          id: "sr-2",
          owner_user_id: "user-other",
          shared_with_user_id: "user-123",
          entity_type: "coach",
          entity_id: "coach-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
      ];

      expect(collaboration.mySharedRecords.value.length).toBe(1);
      expect(collaboration.mySharedRecords.value[0].id).toBe("sr-1");
    });

    it("sharedWithMe filters to records where current user is recipient", () => {
      collaboration.sharedRecords.value = [
        {
          id: "sr-1",
          owner_user_id: "user-123",
          shared_with_user_id: "user-456",
          entity_type: "school",
          entity_id: "school-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
        {
          id: "sr-2",
          owner_user_id: "user-other",
          shared_with_user_id: "user-123",
          entity_type: "coach",
          entity_id: "coach-1",
          access_level: "view",
          shared_at: new Date().toISOString(),
        },
      ];

      expect(collaboration.sharedWithMe.value.length).toBe(1);
      expect(collaboration.sharedWithMe.value[0].id).toBe("sr-2");
    });

    it("activeTeamMembers excludes members with deleted_at set", () => {
      collaboration.teamMembers.value = [
        {
          id: "m-1",
          user_id: "u1",
          team_id: "t1",
          email: "a@test.com",
          role: "member",
          joined_at: new Date().toISOString(),
          deleted_at: null,
        },
        {
          id: "m-2",
          user_id: "u2",
          team_id: "t1",
          email: "b@test.com",
          role: "viewer",
          joined_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(),
        },
      ];

      expect(collaboration.activeTeamMembers.value.length).toBe(1);
      expect(collaboration.activeTeamMembers.value[0].id).toBe("m-1");
    });
  });
});
