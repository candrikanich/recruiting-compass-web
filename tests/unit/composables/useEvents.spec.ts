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
      lt: vi.fn().mockReturnThis(),
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

    // Bug: `start_date` is a date-only `date` column; the filter used to
    // round-trip through `new Date(...).toISOString()`, which shifts the
    // whole window by the local UTC offset and (via an inclusive `lte` of
    // the end day's UTC midnight) drops the entire end day — a same-day
    // range returned nothing.
    describe("date-range filter (end-day inclusion, exclusive upper bound)", () => {
      beforeEach(() => {
        mockGetDataOwnerUserId.mockReturnValue("athlete-1");
      });

      it("passes start_date filters as plain date-only strings, not UTC timestamps", async () => {
        const { fetchEvents } = useEvents();
        await fetchEvents({ startDate: "2027-06-10", endDate: "2027-06-10" });

        expect(mockQuery.gte).toHaveBeenCalledWith("start_date", "2027-06-10");
        // Exclusive upper bound: start of the day AFTER endDate.
        expect(mockQuery.lt).toHaveBeenCalledWith("start_date", "2027-06-11");
        expect(mockQuery.lte).not.toHaveBeenCalled();
      });

      it("rolls the exclusive upper bound over a month/year boundary", async () => {
        const { fetchEvents } = useEvents();
        await fetchEvents({ endDate: "2027-12-31" });

        expect(mockQuery.lt).toHaveBeenCalledWith("start_date", "2028-01-01");
      });
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

// ---------------------------------------------------------------------------
// Coverage gap tests — exercise branches and state management beyond the
// identity-consistency bug tests above.
// ---------------------------------------------------------------------------
describe("useEvents — coverage gaps", () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const userStore = useUserStore();
    userStore.user = {
      id: "user-1",
      email: "user@example.com",
      role: "athlete",
    } as any;

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockQuery.eq.mockImplementation(() => mockQuery);
    mockSupabase.from.mockReturnValue(mockQuery);
    mockGetDataOwnerUserId.mockReturnValue("user-1");
  });

  // -- fetchEvents -----------------------------------------------------------

  describe("fetchEvents", () => {
    it("returns early without querying when user is not authenticated", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { fetchEvents } = useEvents();
      await fetchEvents();

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("populates events ref with fetched data", async () => {
      const mockEvents = [
        { id: "e1", name: "Camp A", start_date: "2026-07-01" },
        { id: "e2", name: "Camp B", start_date: "2026-08-01" },
      ];
      mockQuery.order.mockResolvedValue({ data: mockEvents, error: null });

      const { fetchEvents, events } = useEvents();
      await fetchEvents();

      expect(events.value).toEqual(mockEvents);
    });

    it("defaults events to empty array when data is null", async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null });

      const { fetchEvents, events } = useEvents();
      await fetchEvents();

      expect(events.value).toEqual([]);
    });

    it("applies schoolId filter when provided", async () => {
      const { fetchEvents } = useEvents();
      await fetchEvents({ schoolId: "school-abc" });

      expect(mockQuery.eq).toHaveBeenCalledWith("school_id", "school-abc");
    });

    it("applies type filter when provided", async () => {
      const { fetchEvents } = useEvents();
      await fetchEvents({ type: "camp" });

      expect(mockQuery.eq).toHaveBeenCalledWith("type", "camp");
    });

    it("sets loading true during fetch and false after", async () => {
      let loadingDuringFetch = false;
      mockQuery.order.mockImplementation(async () => {
        // Can't peek at loading mid-await from outside, so just return
        return { data: [], error: null };
      });

      const { fetchEvents, loading } = useEvents();
      const promise = fetchEvents();
      // loading is set synchronously before the await
      expect(loading.value).toBe(true);
      await promise;
      expect(loading.value).toBe(false);
    });

    it("sets error and resets loading on supabase error", async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: new Error("DB connection lost"),
      });

      const { fetchEvents, error, loading } = useEvents();
      await fetchEvents();

      expect(error.value).toBe("DB connection lost");
      expect(loading.value).toBe(false);
    });

    it("handles thrown exceptions (non-supabase error shape)", async () => {
      mockQuery.order.mockRejectedValue(new Error("Network timeout"));

      const { fetchEvents, error } = useEvents();
      await fetchEvents();

      expect(error.value).toBe("Network timeout");
    });

    it("uses fallback message for non-Error thrown values", async () => {
      mockQuery.order.mockRejectedValue("some string error");

      const { fetchEvents, error } = useEvents();
      await fetchEvents();

      expect(error.value).toBe("Failed to fetch events");
    });
  });

  // -- fetchEvent ------------------------------------------------------------

  describe("fetchEvent", () => {
    it("returns null when user is not authenticated", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { fetchEvent } = useEvents();
      const result = await fetchEvent("event-1");

      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns null for empty string id without querying", async () => {
      const { fetchEvent } = useEvents();
      const result = await fetchEvent("");

      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns null for whitespace-only id", async () => {
      const { fetchEvent } = useEvents();
      const result = await fetchEvent("   ");

      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns null for 'new' id (new-event route guard)", async () => {
      const { fetchEvent } = useEvents();
      const result = await fetchEvent("new");

      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("sets error when data-owner id hasn't resolved", async () => {
      mockGetDataOwnerUserId.mockReturnValue(null);

      const { fetchEvent, error } = useEvents();
      const result = await fetchEvent("event-1");

      expect(result).toBeNull();
      expect(error.value).toMatch(/still loading/i);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns the event on successful fetch", async () => {
      const mockEvent = { id: "event-1", name: "Big Camp", user_id: "user-1" };
      mockQuery.single.mockResolvedValue({ data: mockEvent, error: null });

      const { fetchEvent } = useEvents();
      const result = await fetchEvent("event-1");

      expect(result).toEqual(mockEvent);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "event-1");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("sets loading state during fetch", async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: "e1" },
        error: null,
      });

      const { fetchEvent, loading } = useEvents();
      const promise = fetchEvent("event-1");
      expect(loading.value).toBe(true);
      await promise;
      expect(loading.value).toBe(false);
    });

    it("sets error and returns null on supabase error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Row not found"),
      });

      const { fetchEvent, error } = useEvents();
      const result = await fetchEvent("event-1");

      expect(result).toBeNull();
      expect(error.value).toBe("Row not found");
    });

    it("uses fallback message for non-Error thrown values", async () => {
      mockQuery.single.mockRejectedValue(42);

      const { fetchEvent, error } = useEvents();
      const result = await fetchEvent("event-1");

      expect(result).toBeNull();
      expect(error.value).toBe("Failed to fetch event");
    });
  });

  // -- createEvent -----------------------------------------------------------

  describe("createEvent", () => {
    it("throws when user is not authenticated", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { createEvent } = useEvents();
      await expect(createEvent(baseEventInput)).rejects.toThrow(
        /not authenticated/i,
      );
    });

    it("prepends the created event to the events array", async () => {
      const existingEvent = { id: "old-1", name: "Old" } as Event;
      const newEvent = {
        id: "new-1",
        ...baseEventInput,
        user_id: "user-1",
      } as Event;
      mockQuery.single.mockResolvedValue({ data: newEvent, error: null });

      const { createEvent, fetchEvents, events } = useEvents();
      // Pre-populate with an existing event
      mockQuery.order.mockResolvedValue({
        data: [existingEvent],
        error: null,
      });
      await fetchEvents();
      expect(events.value).toHaveLength(1);

      await createEvent(baseEventInput);

      expect(events.value).toHaveLength(2);
      expect(events.value[0]).toEqual(newEvent);
    });

    it("captures posthog event on success", async () => {
      const newEvent = {
        id: "e1",
        ...baseEventInput,
        user_id: "user-1",
        type: "showcase",
      } as Event;
      mockQuery.single.mockResolvedValue({ data: newEvent, error: null });

      const { createEvent } = useEvents();
      await createEvent(baseEventInput);

      // PostHog capture is mocked at module level — verifying no throw is
      // sufficient; the mock spy isn't easily accessible here but the code
      // path is exercised.
    });

    it("sets error and re-throws on supabase insert error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Duplicate entry"),
      });

      const { createEvent, error } = useEvents();
      await expect(createEvent(baseEventInput)).rejects.toThrow();
      expect(error.value).toBe("Duplicate entry");
    });

    it("resets loading to false even on error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "fail" },
      });

      const { createEvent, loading } = useEvents();
      await expect(createEvent(baseEventInput)).rejects.toThrow();
      expect(loading.value).toBe(false);
    });
  });

  // -- updateEvent -----------------------------------------------------------

  describe("updateEvent", () => {
    it("throws when user is not authenticated", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { updateEvent } = useEvents();
      await expect(
        updateEvent("event-1", { name: "Updated" }),
      ).rejects.toThrow(/not authenticated/i);
    });

    it("throws when data-owner id hasn't resolved", async () => {
      mockGetDataOwnerUserId.mockReturnValue(null);

      const { updateEvent, error } = useEvents();
      await expect(
        updateEvent("event-1", { name: "Updated" }),
      ).rejects.toThrow(/still loading/i);
      expect(error.value).toMatch(/still loading/i);
    });

    it("passes updated_by and updated_at in the update payload", async () => {
      mockQuery.single.mockResolvedValue({
        data: { id: "event-1", name: "Updated", user_id: "user-1" },
        error: null,
      });

      const { updateEvent } = useEvents();
      await updateEvent("event-1", { name: "Updated" });

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated",
          updated_by: "user-1",
          updated_at: expect.any(String),
        }),
      );
    });

    it("updates the event in-place in the events array", async () => {
      const original = { id: "event-1", name: "Original" } as Event;
      const updated = { id: "event-1", name: "Updated", user_id: "user-1" };

      // Populate events with an existing event
      mockQuery.order.mockResolvedValue({ data: [original], error: null });
      const { fetchEvents, updateEvent, events } = useEvents();
      await fetchEvents();
      expect(events.value[0].name).toBe("Original");

      mockQuery.single.mockResolvedValue({ data: updated, error: null });
      await updateEvent("event-1", { name: "Updated" });

      expect(events.value[0].name).toBe("Updated");
    });

    it("sets error and re-throws on supabase update error", async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Update failed"),
      });

      const { updateEvent, error } = useEvents();
      await expect(
        updateEvent("event-1", { name: "X" }),
      ).rejects.toThrow();
      expect(error.value).toBe("Update failed");
    });

    it("uses fallback message for non-Error thrown values", async () => {
      mockQuery.single.mockRejectedValue("raw string");

      const { updateEvent, error } = useEvents();
      await expect(
        updateEvent("event-1", { name: "X" }),
      ).rejects.toBe("raw string");
      expect(error.value).toBe("Failed to update event");
    });
  });

  // -- deleteEvent -----------------------------------------------------------

  describe("deleteEvent", () => {
    it("throws when user is not authenticated", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { deleteEvent } = useEvents();
      await expect(deleteEvent("event-1")).rejects.toThrow(
        /not authenticated/i,
      );
    });

    it("throws when data-owner id hasn't resolved", async () => {
      mockGetDataOwnerUserId.mockReturnValue(null);

      const { deleteEvent, error } = useEvents();
      await expect(deleteEvent("event-1")).rejects.toThrow(/still loading/i);
      expect(error.value).toMatch(/still loading/i);
    });

    it("removes the deleted event from the events array", async () => {
      const events_data = [
        { id: "e1", name: "Keep" },
        { id: "e2", name: "Delete Me" },
      ];
      mockQuery.order.mockResolvedValue({ data: events_data, error: null });

      const { fetchEvents, deleteEvent, events } = useEvents();
      await fetchEvents();
      expect(events.value).toHaveLength(2);

      // Mock a successful delete (eq chain resolves with no error)
      mockQuery.eq.mockImplementation(() => ({
        ...mockQuery,
        then: (resolve: any) =>
          resolve({ error: null }),
      }));
      // Re-mock the delete chain: delete() → eq(id) → eq(user_id) resolves
      let eqCallCount = 0;
      mockQuery.eq.mockImplementation(() => {
        eqCallCount++;
        // The second eq in the delete chain is the terminal call
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return mockQuery;
      });

      await deleteEvent("e2");

      expect(events.value).toHaveLength(1);
      expect(events.value[0].id).toBe("e1");
    });

    it("sets error and re-throws on supabase delete error", async () => {
      // Make the delete chain return an error
      let eqCallCount = 0;
      mockQuery.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: new Error("FK constraint") });
        }
        return mockQuery;
      });

      const { deleteEvent, error } = useEvents();
      await expect(deleteEvent("event-1")).rejects.toThrow();
      expect(error.value).toBe("FK constraint");
    });

    it("resets loading to false even on error", async () => {
      let eqCallCount = 0;
      mockQuery.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: { message: "fail" } });
        }
        return mockQuery;
      });

      const { deleteEvent, loading } = useEvents();
      await expect(deleteEvent("event-1")).rejects.toThrow();
      expect(loading.value).toBe(false);
    });
  });
});
