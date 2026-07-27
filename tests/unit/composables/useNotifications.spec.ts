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

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-123", email: "test@example.com" },
  }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

function createMockNotification(overrides: Partial<Notification> = {}): Notification {
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
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [unread], error: null }),
    });

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
});
