import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import ParentOnboardingBanner from "~/components/Dashboard/ParentOnboardingBanner.vue";

const mockFamilies = ref<unknown[]>([]);
const mockLoading = ref(false);

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    parentAccessibleFamilies: mockFamilies,
    loading: mockLoading,
  })),
}));
global.useFamilyContext = vi.fn(() => ({
  parentAccessibleFamilies: mockFamilies,
  loading: mockLoading,
}));

const mockUserId = "user-123";
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({ user: { id: mockUserId } })),
}));
global.useUserStore = vi.fn(() => ({ user: { id: mockUserId } }));

const createWrapper = () =>
  mount(ParentOnboardingBanner, {
    global: {
      stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
    },
  });

describe("ParentOnboardingBanner", () => {
  beforeEach(() => {
    mockFamilies.value = [];
    mockLoading.value = false;
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows invite CTA when no family members", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(false);
  });

  it("shows connected state on first view after player joins", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    mockFamilies.value = [{ id: "fam-1" }];
    await flushPromises();
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(false);
  });

  it("sets localStorage flag when showing connected state", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    mockFamilies.value = [{ id: "fam-1" }];
    await flushPromises();
    expect(localStorage.getItem("family_connected_ack_user-123")).toBe("true");
  });

  it("hides entirely after connected state timeout", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    mockFamilies.value = [{ id: "fam-1" }];
    await flushPromises();
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(true);
    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(false);
  });

  it("stays hidden on mount when already acknowledged", async () => {
    localStorage.setItem("family_connected_ack_user-123", "true");
    mockFamilies.value = [{ id: "fam-1" }];
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(false);
  });
});
