import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockActiveFamily = {
  activeFamilyId: { value: "family-123" },
  activeAthleteId: { value: "user-123" },
  isViewingAsParent: { value: false },
  getDataOwnerUserId: () => "user-123",
};

vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => mockActiveFamily,
}));

const mockSupabase = { from: vi.fn() };
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/utils/validation/schemas", () => ({
  offerSchema: { parseAsync: vi.fn(async (data: unknown) => data) },
}));

vi.mock("#app", () => ({
  useNuxtApp: vi.fn(() => ({ $posthog: { capture: vi.fn() } })),
}));

import { useOffersStore, OFFERS_SOFT_WARN_THRESHOLD } from "~/stores/offers";

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

function buildChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {} as never;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("useOffersStore", () => {
  let userStore: ReturnType<typeof useUserStore>;
  let chain: ReturnType<typeof buildChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    userStore = useUserStore();
    userStore.user = { id: "user-123", email: "test@example.com" } as never;
    userStore.isAuthenticated = true;

    chain = buildChain();
    mockSupabase.from.mockReturnValue(chain);
  });

  describe("fetchOffers", () => {
    it("loads the first page and seeds offers + totalCount", async () => {
      const rows = [makeOffer(), makeOffer({ id: "offer-2" })];
      chain.range.mockResolvedValueOnce({ data: rows, error: null, count: 2 });

      const store = useOffersStore();
      await store.fetchOffers();

      expect(mockSupabase.from).toHaveBeenCalledWith("offers");
      expect(chain.eq).toHaveBeenCalledWith("family_unit_id", "family-123");
      expect(chain.range).toHaveBeenCalledWith(0, 99);
      expect(store.offers).toEqual(rows);
      expect(store.totalCount).toBe(2);
      expect(store.isFetched).toBe(true);
    });

    it("guards against double-fetch when isFetched is true", async () => {
      chain.range.mockResolvedValueOnce({
        data: [makeOffer()],
        error: null,
        count: 1,
      });

      const store = useOffersStore();
      await store.fetchOffers();
      await store.fetchOffers();

      expect(chain.range).toHaveBeenCalledTimes(1);
    });

    it("refetches when force: true", async () => {
      chain.range
        .mockResolvedValueOnce({ data: [makeOffer()], error: null, count: 1 })
        .mockResolvedValueOnce({
          data: [makeOffer({ id: "offer-2" })],
          error: null,
          count: 1,
        });

      const store = useOffersStore();
      await store.fetchOffers();
      await store.fetchOffers({ force: true });

      expect(chain.range).toHaveBeenCalledTimes(2);
    });

    it("sets error and leaves offers empty when fetch fails", async () => {
      chain.range.mockResolvedValueOnce({
        data: null,
        error: new Error("boom"),
        count: null,
      });

      const store = useOffersStore();
      await store.fetchOffers();

      expect(store.offers).toEqual([]);
      expect(store.error).toBe("boom");
      expect(store.loading).toBe(false);
    });

    it("does nothing without an active family", async () => {
      mockActiveFamily.activeFamilyId.value = null as never;
      const store = useOffersStore();
      await store.fetchOffers();

      expect(chain.range).not.toHaveBeenCalled();
      mockActiveFamily.activeFamilyId.value = "family-123";
    });
  });

  describe("loadMore", () => {
    it("appends the next page when hasMore is true", async () => {
      chain.range
        .mockResolvedValueOnce({
          data: [makeOffer()],
          error: null,
          count: 2,
        })
        .mockResolvedValueOnce({
          data: [makeOffer({ id: "offer-2" })],
          error: null,
          count: 2,
        });

      const store = useOffersStore();
      await store.fetchOffers();
      expect(store.hasMore).toBe(true);

      await store.loadMore();

      expect(chain.range).toHaveBeenNthCalledWith(2, 100, 199);
      expect(store.offers).toHaveLength(2);
    });

    it("no-ops when hasMore is false", async () => {
      chain.range.mockResolvedValueOnce({
        data: [makeOffer()],
        error: null,
        count: 1,
      });

      const store = useOffersStore();
      await store.fetchOffers();
      await store.loadMore();

      expect(chain.range).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOffer", () => {
    it("returns cached offer without hitting Supabase", async () => {
      chain.range.mockResolvedValueOnce({
        data: [makeOffer()],
        error: null,
        count: 1,
      });

      const store = useOffersStore();
      await store.fetchOffers();
      mockSupabase.from.mockClear();

      const result = await store.getOffer("offer-1");
      expect(result?.id).toBe("offer-1");
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("fetches directly and seeds the cache when not cached", async () => {
      const offer = makeOffer({ id: "offer-X" });
      chain.maybeSingle.mockResolvedValueOnce({ data: offer, error: null });

      const store = useOffersStore();
      const result = await store.getOffer("offer-X");

      expect(result?.id).toBe("offer-X");
      expect(store.offers.find((o) => o.id === "offer-X")).toEqual(offer);
    });

    it("returns null when the offer does not exist", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const store = useOffersStore();
      const result = await store.getOffer("missing");
      expect(result).toBeNull();
    });
  });

  describe("createOffer", () => {
    it("inserts and prepends the new offer, bumps totalCount", async () => {
      const created = makeOffer();
      chain.single.mockResolvedValueOnce({ data: created, error: null });

      const store = useOffersStore();
      const result = await store.createOffer({
        school_id: "school-abc",
        offer_type: "partial",
        offer_date: "2026-06-01",
        status: "pending",
      } as never);

      expect(result).toEqual(created);
      expect(store.offers[0]).toEqual(created);
      expect(store.totalCount).toBe(1);
    });

    it("re-throws and surfaces error.value on insert failure", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: new Error("insert boom"),
      });

      const store = useOffersStore();
      await expect(
        store.createOffer({
          school_id: "school-abc",
          offer_type: "partial",
          offer_date: "2026-06-01",
          status: "pending",
        } as never),
      ).rejects.toThrow("insert boom");
      expect(store.error).toBe("insert boom");
    });

    it("throws when user is not authenticated", async () => {
      userStore.user = null as never;
      const store = useOffersStore();
      await expect(store.createOffer({} as never)).rejects.toThrow(
        "User not authenticated",
      );
    });
  });

  describe("updateOffer", () => {
    it("updates the offer in-place", async () => {
      const initial = makeOffer({ status: "pending" });
      chain.range.mockResolvedValueOnce({
        data: [initial],
        error: null,
        count: 1,
      });

      const store = useOffersStore();
      await store.fetchOffers();

      const updated = { ...initial, status: "accepted" };
      chain.single.mockResolvedValueOnce({ data: updated, error: null });

      const result = await store.updateOffer("offer-1", { status: "accepted" });

      expect(result.status).toBe("accepted");
      expect(store.offers[0].status).toBe("accepted");
    });

    it("re-throws on update error", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: new Error("update boom"),
      });
      const store = useOffersStore();
      await expect(store.updateOffer("offer-1", {})).rejects.toThrow(
        "update boom",
      );
      expect(store.error).toBe("update boom");
    });
  });

  describe("deleteOffer", () => {
    it("removes the offer locally and decrements totalCount", async () => {
      chain.range.mockResolvedValueOnce({
        data: [makeOffer()],
        error: null,
        count: 1,
      });
      const store = useOffersStore();
      await store.fetchOffers();
      expect(store.offers).toHaveLength(1);

      // delete chain resolves on the second .eq()
      const deleteEq2 = vi.fn().mockResolvedValueOnce({ error: null });
      const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
      chain.delete.mockReturnValueOnce({ eq: deleteEq1 });

      await store.deleteOffer("offer-1");

      expect(store.offers).toHaveLength(0);
      expect(store.totalCount).toBe(0);
    });

    it("re-throws when delete fails", async () => {
      const deleteEq2 = vi
        .fn()
        .mockResolvedValueOnce({ error: new Error("delete boom") });
      const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
      chain.delete.mockReturnValueOnce({ eq: deleteEq1 });

      const store = useOffersStore();
      await expect(store.deleteOffer("offer-1")).rejects.toThrow("delete boom");
      expect(store.error).toBe("delete boom");
    });
  });

  describe("computed getters", () => {
    it("partitions offers by status", async () => {
      chain.range.mockResolvedValueOnce({
        data: [
          makeOffer({ id: "a", status: "pending" }),
          makeOffer({ id: "b", status: "accepted" }),
          makeOffer({ id: "c", status: "declined" }),
        ],
        error: null,
        count: 3,
      });

      const store = useOffersStore();
      await store.fetchOffers();

      expect(store.pendingOffers).toHaveLength(1);
      expect(store.acceptedOffers).toHaveLength(1);
      expect(store.declinedOffers).toHaveLength(1);
    });

    it("flips softWarnVisible at the threshold", async () => {
      const store = useOffersStore();
      expect(store.softWarnVisible).toBe(false);

      store.totalCount = OFFERS_SOFT_WARN_THRESHOLD - 1;
      expect(store.softWarnVisible).toBe(false);

      store.totalCount = OFFERS_SOFT_WARN_THRESHOLD;
      expect(store.softWarnVisible).toBe(true);
    });
  });

  describe("daysUntilDeadline", () => {
    it("returns null when no deadline", () => {
      const store = useOffersStore();
      expect(
        store.daysUntilDeadline(
          makeOffer({ deadline_date: null }) as never,
        ),
      ).toBeNull();
    });

    it("returns a positive number for future deadlines", () => {
      const store = useOffersStore();
      const future = new Date(Date.now() + 10 * 86400000)
        .toISOString()
        .split("T")[0];
      const days = store.daysUntilDeadline(
        makeOffer({ deadline_date: future }) as never,
      );
      expect(days).toBeGreaterThanOrEqual(9);
      expect(days).toBeLessThanOrEqual(10);
    });
  });

  describe("reset", () => {
    it("clears all state", async () => {
      chain.range.mockResolvedValueOnce({
        data: [makeOffer()],
        error: null,
        count: 1,
      });
      const store = useOffersStore();
      await store.fetchOffers();
      expect(store.isFetched).toBe(true);

      store.reset();

      expect(store.offers).toEqual([]);
      expect(store.isFetched).toBe(false);
      expect(store.totalCount).toBe(0);
      expect(store.currentPage).toBe(0);
    });
  });
});
