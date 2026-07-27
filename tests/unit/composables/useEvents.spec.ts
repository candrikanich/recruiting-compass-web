import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";
import { useEvents } from "~/composables/useEvents";
import type { Event } from "~/types/models";

/**
 * Bug: composables/useEvents.ts:90 vs :180 (planning/audit-2026-07-27-findings.md).
 *
 * fetchEvents filtered by the viewing user's own id (userStore.user.id) while
 * createEvent inserted using the data-owner id
 * (activeFamily.getDataOwnerUserId()). For a parent viewing a linked athlete
 * these two ids differ, so:
 *  - a parent-created event is invisible on the next fetchEvents (wrong
 *    filter — AC2 in the phase-6 brief)
 *  - if the family context hasn't resolved yet, getDataOwnerUserId() returns
 *    null and the insert would violate the events.user_id NOT NULL
 *    constraint with a raw DB error instead of a clear message
 *
 * These tests mock Supabase, so they can't prove the Postgres NOT NULL
 * constraint itself — that's exercised implicitly by never letting a null
 * id reach the query builder in the first place (asserted directly below).
 * The identity-consistency bug (fetch vs. create using different ids) is a
 * pure composable-logic bug, not a cross-account authz/data-resolution one,
 * so a mocked-Supabase unit test is the right tool here (contrast with the
 * live-DB integration test for the athlete-tasks authz bug).
 */

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

const mockGetDataOwnerUserId = vi.fn();

vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({
    getDataOwnerUserId: mockGetDataOwnerUserId,
  }),
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    getDataOwnerUserId: mockGetDataOwnerUserId,
  }),
}));

vi.mock("#app", () => ({
  useNuxtApp: () => ({ $posthog: { capture: vi.fn() } }),
}));

const baseEventInput: Omit<Event, "id" | "created_at" | "updated_at"> = {
  user_id: "unused-overwritten-by-composable",
  type: "showcase",
  name: "Test Showcase",
  location: "Test Field",
  city: "Testville",
  state: "CA",
  address: "123 Test St",
  start_date: "2026-08-01",
  end_date: null,
  start_time: null,
  end_time: null,
  url: null,
  description: "",
  cost: null,
  school_id: undefined,
  registered: false,
  attended: false,
  performance_notes: "",
} as unknown as Omit<Event, "id" | "created_at" | "updated_at">;

describe("useEvents — parent/athlete identity consistency", () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const userStore = useUserStore();
    // The viewing user is the PARENT — distinct from the athlete they're
    // viewing, which is the whole point of the bug.
    userStore.user = {
      id: "parent-1",
      email: "parent@example.com",
      role: "parent",
    } as any;

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    // The final .eq() in the delete chain is the one that resolves (no
    // .single()/.order() after it) — make the last eq() in a chain thenable.
    mockQuery.eq.mockImplementation(() => mockQuery);
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("fetchEvents", () => {
    it("filters by the data-owner id (athlete), not the viewing parent's own id", async () => {
      mockGetDataOwnerUserId.mockReturnValue("athlete-1");

      const { fetchEvents } = useEvents();
      await fetchEvents();

      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "athlete-1");
      expect(mockQuery.eq).not.toHaveBeenCalledWith("user_id", "parent-1");
    });

    it("surfaces a clear loading error instead of querying when the data-owner id hasn't resolved yet", async () => {
      mockGetDataOwnerUserId.mockReturnValue(null);

      const { fetchEvents, error } = useEvents();
      await fetchEvents();

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(error.value).toMatch(/still loading/i);
    });
  });

  describe("createEvent", () => {
    it("inserts using the data-owner id", async () => {
      mockGetDataOwnerUserId.mockReturnValue("athlete-1");
      mockQuery.single.mockResolvedValue({
        data: { id: "event-1", ...baseEventInput, user_id: "athlete-1" },
        error: null,
      });

      const { createEvent } = useEvents();
      await createEvent(baseEventInput);

      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: "athlete-1" }),
      ]);
    });

    it("refuses to insert (no DB call) when the data-owner id hasn't resolved yet, and throws a clear error", async () => {
      mockGetDataOwnerUserId.mockReturnValue(null);

      const { createEvent } = useEvents();

      await expect(createEvent(baseEventInput)).rejects.toThrow(
        /still loading/i,
      );
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });
  });

  describe("createEvent + fetchEvents identity consistency", () => {
    it("uses the SAME id to create and to filter on fetch, so a parent-created event is visible on the next fetch", async () => {
      mockGetDataOwnerUserId.mockReturnValue("athlete-1");
      mockQuery.single.mockResolvedValue({
        data: { id: "event-1", ...baseEventInput, user_id: "athlete-1" },
        error: null,
      });

      const { createEvent, fetchEvents } = useEvents();
      await createEvent(baseEventInput);
      const createInsertId = mockQuery.insert.mock.calls[0][0][0].user_id;

      await fetchEvents();
      const fetchFilterId = mockQuery.eq.mock.calls.find(
        (call: unknown[]) => call[0] === "user_id",
      )?.[1];

      expect(createInsertId).toBe(fetchFilterId);
    });
  });

  describe("updateEvent / deleteEvent", () => {
    it("updateEvent scopes the update to the data-owner id", async () => {
      mockGetDataOwnerUserId.mockReturnValue("athlete-1");
      mockQuery.single.mockResolvedValue({
        data: { id: "event-1", user_id: "athlete-1" },
        error: null,
      });

      const { updateEvent } = useEvents();
      await updateEvent("event-1", { name: "Updated" });

      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "athlete-1");
    });

    it("deleteEvent scopes the delete to the data-owner id", async () => {
      mockGetDataOwnerUserId.mockReturnValue("athlete-1");

      const { deleteEvent } = useEvents();
      await deleteEvent("event-1");

      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "athlete-1");
    });
  });
});
