import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import Header from "~/components/Header.vue";

// Regression guard: the header bell is presentational (renders whatever
// `notifications` it's handed). Header owns the fetch and must pass the result
// down — it previously rendered <NotificationCenter /> with no prop, so the
// dropdown was always empty. This asserts Header fetches and forwards.

const sampleNotifications = [
  {
    id: "n1",
    title: "New contact from a coach",
    message: "A coach reached out.",
    scheduled_for: "2026-08-27T12:00:00.000Z",
    read_at: null,
  },
];
const mockNotifications = ref(sampleNotifications);
const mockFetchNotifications = vi.fn();
const mockMarkAsRead = vi.fn();
vi.mock("~/composables/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    notifications: mockNotifications,
    fetchNotifications: mockFetchNotifications,
    markAsRead: mockMarkAsRead,
  })),
}));

const mockUser = ref<{ id: string } | null>({ id: "u1" });
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    get user() {
      return mockUser.value;
    },
    isAuthenticated: true,
  })),
}));
vi.mock("~/composables/useAuthLifecycle", () => ({
  useAuthLifecycle: vi.fn(() => ({})),
}));
vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ path: "/dashboard" })),
}));

const NotificationCenterStub = {
  name: "NotificationCenter",
  props: ["notifications"],
  emits: ["mark-as-read", "notification-click"],
  template: `<div data-test="bell" :data-count="notifications.length"></div>`,
};

const createWrapper = () =>
  mount(Header, {
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        NotificationCenter: NotificationCenterStub,
        AthleteSwitcher: true,
        HeaderNav: true,
        HeaderProfile: true,
      },
    },
  });

describe("Header notifications wiring", () => {
  beforeEach(() => {
    mockNotifications.value = sampleNotifications;
    mockUser.value = { id: "u1" };
    mockFetchNotifications.mockReset();
    mockMarkAsRead.mockReset();
  });

  it("fetches notifications once the user is present and passes them to the bell", async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(mockFetchNotifications).toHaveBeenCalledWith({ limit: 10 });
    const bell = wrapper.find('[data-test="bell"]');
    expect(bell.exists()).toBe(true);
    expect(bell.attributes("data-count")).toBe("1");
  });

  it("forwards the bell's mark-as-read to the composable", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    wrapper
      .findComponent(NotificationCenterStub)
      .vm.$emit("mark-as-read", "n1");
    expect(mockMarkAsRead).toHaveBeenCalledWith("n1");
  });
});
