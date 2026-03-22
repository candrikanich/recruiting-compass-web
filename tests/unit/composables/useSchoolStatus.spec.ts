import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";

// ── Mock logger ────────────────────────────────────────────────────────────────
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ── Mock Supabase ──────────────────────────────────────────────────────────────
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

const mockSupabase = {
  from: vi.fn().mockReturnValue(mockQuery),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

// ── Mock useActiveFamily / useFamilyContext (injected via Vue inject) ──────────
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

// Vue inject returns undefined by default in test — the composable falls back to
// useFamilyContext().  Providing it here ensures no error/warning branch fires.
vi.mock("vue", async (importOriginal) => {
  const vue = await importOriginal<typeof import("vue")>();
  return {
    ...vue,
    inject: vi.fn(() => ({
      activeFamilyId: { value: "family-123" },
      getDataOwnerUserId: () => "user-123",
    })),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const SCHOOL_ID = "school-abc";
const FAMILY_ID = "family-123";
const USER_ID = "user-123";

const makeSchool = (status: string) => ({
  id: SCHOOL_ID,
  status,
  family_unit_id: FAMILY_ID,
});

describe("useSchoolStatus", () => {
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    userStore = useUserStore();
    userStore.user = { id: USER_ID, email: "test@example.com" } as any;
    userStore.isAuthenticated = true;

    // Reset chain
    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.update.mockReturnThis();
    mockQuery.insert.mockReturnThis();
  });

  it("exports updateStatus, loading, and error", async () => {
    const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
    const { updateStatus, loading, error } = useSchoolStatus();

    expect(typeof updateStatus).toBe("function");
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  describe("updateStatus — happy path", () => {
    it("fetches the school, updates status, and returns the updated school", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus } = useSchoolStatus();

      const existingSchool = makeSchool("interested");
      const updatedSchool = makeSchool("contacted");

      // First .single() call → fetch current school
      // Second .single() call → updated school from update query
      mockQuery.single
        .mockResolvedValueOnce({ data: existingSchool, error: null })
        .mockResolvedValueOnce({ data: updatedSchool, error: null });

      // insert (history) — no .single(), just returns { error: null }
      mockQuery.insert.mockResolvedValueOnce({ error: null });

      const result = await updateStatus(SCHOOL_ID, "contacted");

      expect(result).toEqual(updatedSchool);
    });

    it("calls supabase.from('schools') for fetch and update", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus } = useSchoolStatus();

      mockQuery.single
        .mockResolvedValueOnce({ data: makeSchool("interested"), error: null })
        .mockResolvedValueOnce({ data: makeSchool("recruited"), error: null });
      mockQuery.insert.mockResolvedValueOnce({ error: null });

      await updateStatus(SCHOOL_ID, "recruited");

      const fromCalls = mockSupabase.from.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(fromCalls).toContain("schools");
    });

    it("records history in school_status_history table", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus } = useSchoolStatus();

      mockQuery.single
        .mockResolvedValueOnce({ data: makeSchool("interested"), error: null })
        .mockResolvedValueOnce({
          data: makeSchool("offer_received"),
          error: null,
        });
      mockQuery.insert.mockResolvedValueOnce({ error: null });

      await updateStatus(SCHOOL_ID, "offer_received", "First offer!");

      const fromCalls = mockSupabase.from.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(fromCalls).toContain("school_status_history");
    });

    it("resets loading to false after a successful update", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus, loading } = useSchoolStatus();

      mockQuery.single
        .mockResolvedValueOnce({ data: makeSchool("interested"), error: null })
        .mockResolvedValueOnce({ data: makeSchool("contacted"), error: null });
      mockQuery.insert.mockResolvedValueOnce({ error: null });

      await updateStatus(SCHOOL_ID, "contacted");

      expect(loading.value).toBe(false);
    });
  });

  describe("updateStatus — error paths", () => {
    it("throws and sets error.value when school is not found", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus, error } = useSchoolStatus();

      mockQuery.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(updateStatus(SCHOOL_ID, "contacted")).rejects.toThrow(
        "School not found",
      );
      expect(error.value).toBe("School not found");
    });

    it("throws and sets error.value when fetch returns an error", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus, error } = useSchoolStatus();

      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error("DB error"),
      });

      await expect(updateStatus(SCHOOL_ID, "contacted")).rejects.toThrow();
      expect(error.value).not.toBeNull();
    });

    it("throws and sets error.value when the update query fails", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus, error } = useSchoolStatus();

      mockQuery.single
        .mockResolvedValueOnce({ data: makeSchool("interested"), error: null })
        .mockResolvedValueOnce({
          data: null,
          error: new Error("Update failed"),
        });

      await expect(updateStatus(SCHOOL_ID, "contacted")).rejects.toThrow(
        "Update failed",
      );
      expect(error.value).toBe("Update failed");
    });

    it("throws and sets error.value when inserting history fails", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus, error } = useSchoolStatus();

      mockQuery.single
        .mockResolvedValueOnce({ data: makeSchool("interested"), error: null })
        .mockResolvedValueOnce({ data: makeSchool("contacted"), error: null });
      mockQuery.insert.mockResolvedValueOnce({
        error: new Error("History insert failed"),
      });

      await expect(updateStatus(SCHOOL_ID, "contacted")).rejects.toThrow(
        "History insert failed",
      );
      expect(error.value).toBe("History insert failed");
    });

    it("resets loading to false even when an error is thrown", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");
      const { updateStatus, loading } = useSchoolStatus();

      mockQuery.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(updateStatus(SCHOOL_ID, "contacted")).rejects.toThrow();
      expect(loading.value).toBe(false);
    });

    it("throws 'User not authenticated' when no user is set", async () => {
      const { useSchoolStatus } = await import("~/composables/useSchoolStatus");

      userStore.user = null as any;
      const { updateStatus } = useSchoolStatus();

      await expect(updateStatus(SCHOOL_ID, "contacted")).rejects.toThrow(
        "User not authenticated",
      );
    });
  });
});
