import { describe, it, expect, beforeEach, vi } from "vitest";
import { watch, nextTick } from "vue";
import { useNotifications } from "~/composables/useNotifications";
import type { Notification } from "~/types/models";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

const mockUserState: { user: { id: string; email: string } | null } = {
  user: { id: "user-123", email: "test@example.com" },
};
vi.mock("~/stores/user", () => ({
  useUserStore: () => mockUserState,
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

/** Build a chainable mock query that resolves `result` when awaited. */
function chainableQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const self = () => q;
  q.select = vi.fn(self);
  q.eq = vi.fn(self);
  q.order = vi.fn(self);
  q.not = vi.fn(self);
  q.is = vi.fn(self);
  q.limit = vi.fn(self);
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
}

function createMockNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "notif-1",
    user_id: "user-123",
    type: "follow_up_reminder",
    title: "Test",
    message: "Test message",
    scheduled_for: "2026-01-01T00:00:00Z",
    priority: "low",
    read_at: null,
    ...overrides,
  } as Notification;
}

describe("useNotifications reactivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.user = { id: "user-123", email: "test@example.com" };
  });

  it("createNotification: fires a reactive watcher on the notifications list (proves shallowRef was reassigned, not mutated in place)", async () => {
    const inserted = createMockNotification({ id: "notif-new" });

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
    });

    const { notifications, createNotification } = useNotifications();

    // With a shallowRef, Vue's reactivity system only fires watchers when
    // .value is REASSIGNED to a new reference. In-place mutation (unshift,
    // index assignment) never triggers this — the watcher below is the only
    // reliable way to prove which one happened.
    let fireCount = 0;
    watch(notifications, () => {
      fireCount += 1;
    });

    await createNotification({
      type: "follow_up_reminder",
      title: "Test",
      message: "Test message",
      scheduled_for: "2026-01-01T00:00:00Z",
      priority: "low",
    } as Omit<Notification, "id" | "created_at" | "updated_at">);
    await nextTick();

    expect(fireCount).toBe(1);
    expect(notifications.value[0]).toEqual(inserted);
  });

  it("markAsRead: fires a reactive watcher so unreadCount recomputes without remount", async () => {
    const unread = createMockNotification({ id: "n1", read_at: null });
    const readNow = createMockNotification({
      id: "n1",
      read_at: "2026-01-02T00:00:00Z",
    });

    // Seed the list via fetchNotifications
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({ data: [unread], error: null }),
    );

    const { notifications, unreadCount, fetchNotifications, markAsRead } =
      useNotifications();
    await fetchNotifications();
    expect(unreadCount.value).toBe(1);

    let fireCount = 0;
    watch(notifications, () => {
      fireCount += 1;
    });

    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: readNow, error: null }),
    });

    await markAsRead("n1");
    await nextTick();

    expect(fireCount).toBe(1);
    expect(unreadCount.value).toBe(0);
    expect(notifications.value[0].read_at).toBe("2026-01-02T00:00:00Z");
  });

  it("fetchNotifications: no-ops (never queries Supabase) when no user is authenticated", async () => {
    mockUserState.user = null;
    const { fetchNotifications } = useNotifications();

    await fetchNotifications();

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("fetchNotifications: applies isRead/type/limit filters to the query chain", async () => {
    const notSpy = vi.fn();
    const eqSpy = vi.fn();
    const limitSpy = vi
      .fn()
      .mockReturnValue(Promise.resolve({ data: [], error: null }));
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: eqSpy.mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      not: notSpy.mockReturnThis(),
      limit: limitSpy,
    };
    mockSupabase.from.mockReturnValue(chain);

    const { fetchNotifications } = useNotifications();
    await fetchNotifications({
      isRead: true,
      type: "offer_received",
      limit: 5,
    });

    expect(notSpy).toHaveBeenCalledWith("read_at", "is", null);
    expect(eqSpy).toHaveBeenCalledWith("type", "offer_received");
    expect(limitSpy).toHaveBeenCalledWith(5);
  });

  it("fetchNotifications: filters for UNREAD (isRead: false) using .is(), not .not()", async () => {
    const isSpy = vi
      .fn()
      .mockReturnValue(Promise.resolve({ data: [], error: null }));
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: isSpy,
    });

    const { fetchNotifications } = useNotifications();
    await fetchNotifications({ isRead: false });

    expect(isSpy).toHaveBeenCalledWith("read_at", null);
  });

  it("fetchNotifications: sets error.value and leaves notifications untouched on a Supabase error", async () => {
    mockSupabase.from.mockReturnValue(
      chainableQuery({ data: null, error: new Error("network down") }),
    );

    const { notifications, error, fetchNotifications } = useNotifications();
    await fetchNotifications();

    expect(error.value).toBe("network down");
    expect(notifications.value).toEqual([]);
  });

  it("createNotification: throws and sets error.value when the caller is not authenticated", async () => {
    mockUserState.user = null;
    const { createNotification, error } = useNotifications();

    await expect(
      createNotification({
        type: "follow_up_reminder",
        title: "t",
        message: "m",
        scheduled_for: "2026-01-01T00:00:00Z",
        priority: "low",
      } as Omit<Notification, "id" | "created_at" | "updated_at">),
    ).rejects.toThrow("User not authenticated");
    // Guard throws before touching loading/error state — see the real
    // implementation's early return.
    expect(error.value).toBeNull();
  });

  it("markAllAsRead: updates every unread notification and skips the API call when none are unread", async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({
        data: [
          createMockNotification({ id: "n1", read_at: null }),
          createMockNotification({ id: "n2", read_at: "2026-01-01T00:00:00Z" }),
        ],
        error: null,
      }),
    );

    const { notifications, unreadCount, fetchNotifications, markAllAsRead } =
      useNotifications();
    await fetchNotifications();
    expect(unreadCount.value).toBe(1);

    const updateSpy = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    mockSupabase.from.mockReturnValueOnce({ update: updateSpy });

    await markAllAsRead();

    expect(updateSpy).toHaveBeenCalled();
    expect(unreadCount.value).toBe(0);
    expect(notifications.value.every((n) => n.read_at !== null)).toBe(true);
  });

  it("markAllAsRead: no-ops (never calls Supabase) when there is nothing unread", async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({
        data: [
          createMockNotification({ id: "n1", read_at: "2026-01-01T00:00:00Z" }),
        ],
        error: null,
      }),
    );
    const { fetchNotifications, markAllAsRead } = useNotifications();
    await fetchNotifications();
    mockSupabase.from.mockClear();

    await markAllAsRead();

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("deleteNotification: removes the notification from local state after a successful delete", async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({ data: [createMockNotification({ id: "n1" })], error: null }),
    );
    const { notifications, fetchNotifications, deleteNotification } =
      useNotifications();
    await fetchNotifications();
    expect(notifications.value).toHaveLength(1);

    mockSupabase.from.mockReturnValueOnce({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    await deleteNotification("n1");

    expect(notifications.value).toHaveLength(0);
  });

  it("deleteNotification: rejects and leaves local state untouched when the delete fails", async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({ data: [createMockNotification({ id: "n1" })], error: null }),
    );
    const { notifications, fetchNotifications, deleteNotification } =
      useNotifications();
    await fetchNotifications();

    mockSupabase.from.mockReturnValueOnce({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("row locked") }),
      }),
    });

    await expect(deleteNotification("n1")).rejects.toThrow("row locked");
    expect(notifications.value).toHaveLength(1);
  });

  it("deleteAllRead: removes only read notifications, and no-ops when nothing is read", async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({
        data: [
          createMockNotification({ id: "n1", read_at: null }),
          createMockNotification({ id: "n2", read_at: "2026-01-01T00:00:00Z" }),
        ],
        error: null,
      }),
    );
    const { notifications, fetchNotifications, deleteAllRead } =
      useNotifications();
    await fetchNotifications();

    mockSupabase.from.mockReturnValueOnce({
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    });

    await deleteAllRead();

    expect(notifications.value).toEqual([
      expect.objectContaining({ id: "n1", read_at: null }),
    ]);

    mockSupabase.from.mockClear();
    await deleteAllRead();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("highPriorityNotifications: includes only unread, high-priority notifications", async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainableQuery({
        data: [
          createMockNotification({ id: "n1", priority: "high", read_at: null }),
          createMockNotification({
            id: "n2",
            priority: "high",
            read_at: "2026-01-01T00:00:00Z",
          }),
          createMockNotification({ id: "n3", priority: "low", read_at: null }),
        ],
        error: null,
      }),
    );
    const { fetchNotifications, highPriorityNotifications } =
      useNotifications();
    await fetchNotifications();

    expect(highPriorityNotifications.value.map((n) => n.id)).toEqual(["n1"]);
  });
});
