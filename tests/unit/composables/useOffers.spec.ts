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

// ── Mock useActiveFamily ───────────────────────────────────────────────────────
vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({
    activeFamilyId: { value: "family-123" },
    getDataOwnerUserId: () => "user-123",
  }),
}));

// ── Mock Supabase ──────────────────────────────────────────────────────────────
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

// ── Mock offerSchema (pass-through) ───────────────────────────────────────────
vi.mock("~/utils/validation/schemas", () => ({
  offerSchema: {
    parseAsync: vi.fn(async (data: unknown) => data),
  },
}));

// ── Mock useNuxtApp ────────────────────────────────────────────────────────────
vi.mock("#app", () => ({
  useNuxtApp: vi.fn(() => ({ $posthog: { capture: vi.fn() } })),
}));

// ── Shared offer fixture ───────────────────────────────────────────────────────
const makeOffer = (overrides: Record<string, unknown> = {}) => ({
  id: "offer-1",
  school_id: "school-abc",
  offer_type: "partial" as const,
  offer_date: "2026-06-01",
  status: "pending" as const,
  family_unit_id: "family-123",
  user_id: "user-123",
  ...overrides,
});

describe("useOffers", () => {
  let userStore: ReturnType<typeof useUserStore>;
  let mockQuery: ReturnType<typeof buildMockQuery>;

  function buildMockQuery() {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    userStore = useUserStore();
    userStore.user = { id: "user-123", email: "test@example.com" } as any;
    userStore.isAuthenticated = true;

    mockQuery = buildMockQuery();
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  it("should import and return basic structure", async () => {
    const { useOffers } = await import("~/composables/useOffers");

    expect(typeof useOffers).toBe("function");

    const result = useOffers();
    expect(result).toHaveProperty("offers");
    expect(result).toHaveProperty("fetchOffers");
  });

  describe("createOffer", () => {
    it("inserts the offer and prepends it to the offers list", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { createOffer, offers } = useOffers();

      const newOffer = makeOffer();
      mockQuery.single.mockResolvedValueOnce({ data: newOffer, error: null });

      const result = await createOffer({
        school_id: "school-abc",
        offer_type: "partial",
        offer_date: "2026-06-01",
        status: "pending",
      } as any);

      expect(result).toEqual(newOffer);
      expect(offers.value).toContainEqual(newOffer);
      expect(offers.value[0]).toEqual(newOffer);
    });

    it("calls supabase.from('offers') with insert", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { createOffer } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: makeOffer(),
        error: null,
      });

      await createOffer({
        school_id: "school-abc",
        offer_type: "partial",
        offer_date: "2026-06-01",
        status: "pending",
      } as any);

      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it("sets error.value and re-throws when insert fails", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { createOffer, error } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error("Insert error"),
      });

      await expect(
        createOffer({
          school_id: "school-abc",
          offer_type: "partial",
          offer_date: "2026-06-01",
          status: "pending",
        } as any),
      ).rejects.toThrow("Insert error");

      expect(error.value).toBe("Insert error");
    });

    it("resets loading to false after success", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { createOffer, loading } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: makeOffer(),
        error: null,
      });

      await createOffer({
        school_id: "school-abc",
        offer_type: "partial",
        offer_date: "2026-06-01",
        status: "pending",
      } as any);

      expect(loading.value).toBe(false);
    });

    it("resets loading to false after failure", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { createOffer, loading } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error("fail"),
      });

      await expect(createOffer({} as any)).rejects.toThrow();
      expect(loading.value).toBe(false);
    });

    it("throws 'User not authenticated' when no user is set", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      userStore.user = null as any;
      const { createOffer } = useOffers();

      await expect(createOffer({} as any)).rejects.toThrow(
        "User not authenticated",
      );
    });
  });

  describe("updateOffer", () => {
    it("updates the offer in-place in the offers list", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const composable = useOffers();

      // Seed offers list via fetchOffers
      mockQuery.order = vi.fn().mockResolvedValueOnce({
        data: [makeOffer({ status: "pending" })],
        error: null,
      });
      await composable.fetchOffers();

      const updatedOffer = makeOffer({ status: "accepted" });
      mockQuery.single.mockResolvedValueOnce({
        data: updatedOffer,
        error: null,
      });

      const result = await composable.updateOffer("offer-1", {
        status: "accepted",
      });

      expect(result).toEqual(updatedOffer);
      expect(composable.offers.value[0].status).toBe("accepted");
    });

    it("calls supabase.from('offers') with update", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { updateOffer } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: makeOffer({ status: "accepted" }),
        error: null,
      });

      await updateOffer("offer-1", { status: "accepted" });

      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(mockQuery.update).toHaveBeenCalledWith({ status: "accepted" });
    });

    it("sets error.value and re-throws when update fails", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { updateOffer, error } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error("Update error"),
      });

      await expect(
        updateOffer("offer-1", { status: "accepted" }),
      ).rejects.toThrow("Update error");

      expect(error.value).toBe("Update error");
    });

    it("resets loading to false after success", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { updateOffer, loading } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: makeOffer(),
        error: null,
      });

      await updateOffer("offer-1", { status: "accepted" });
      expect(loading.value).toBe(false);
    });

    it("resets loading to false after failure", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { updateOffer, loading } = useOffers();

      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error("fail"),
      });

      await expect(updateOffer("offer-1", {})).rejects.toThrow();
      expect(loading.value).toBe(false);
    });

    it("throws 'User not authenticated' when no user is set", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      userStore.user = null as any;
      const { updateOffer } = useOffers();

      await expect(updateOffer("offer-1", {})).rejects.toThrow(
        "User not authenticated",
      );
    });
  });

  describe("deleteOffer", () => {
    /**
     * The delete chain in useOffers is:
     *   supabase.from("offers").delete().eq("id", id).eq("family_unit_id", ...)
     * The await resolves the last .eq() call.  We need a second eq mock that
     * returns a resolved promise rather than `this`.
     */
    function setupDeleteMock(result: { error: Error | null }) {
      // First .eq() → returns an object whose second .eq() resolves with result
      mockQuery.eq.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce(result),
      });
    }

    it("removes the offer from the offers list after delete", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const composable = useOffers();

      // Seed the list
      mockQuery.order = vi.fn().mockResolvedValueOnce({
        data: [makeOffer()],
        error: null,
      });
      await composable.fetchOffers();
      expect(composable.offers.value).toHaveLength(1);

      setupDeleteMock({ error: null });

      await composable.deleteOffer("offer-1");

      expect(composable.offers.value).toHaveLength(0);
    });

    it("calls supabase.from('offers') with delete and filters by id", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { deleteOffer } = useOffers();

      setupDeleteMock({ error: null });

      await deleteOffer("offer-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it("sets error.value and re-throws when delete fails", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { deleteOffer, error } = useOffers();

      setupDeleteMock({ error: new Error("Delete error") });

      await expect(deleteOffer("offer-1")).rejects.toThrow("Delete error");
      expect(error.value).toBe("Delete error");
    });

    it("resets loading to false after success", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { deleteOffer, loading } = useOffers();

      setupDeleteMock({ error: null });

      await deleteOffer("offer-1");
      expect(loading.value).toBe(false);
    });

    it("resets loading to false after failure", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      const { deleteOffer, loading } = useOffers();

      setupDeleteMock({ error: new Error("fail") });

      await expect(deleteOffer("offer-1")).rejects.toThrow();
      expect(loading.value).toBe(false);
    });

    it("throws 'User not authenticated' when no user is set", async () => {
      const { useOffers } = await import("~/composables/useOffers");
      userStore.user = null as any;
      const { deleteOffer } = useOffers();

      await expect(deleteOffer("offer-1")).rejects.toThrow(
        "User not authenticated",
      );
    });
  });
});
