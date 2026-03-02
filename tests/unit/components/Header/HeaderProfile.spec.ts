import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import HeaderProfile from "~/components/Header/HeaderProfile.vue";

const mockFamilyCode = ref<string | null>(null);
const mockFetchMyCode = vi.fn();

vi.mock("~/composables/useFamilyCode", () => ({
  useFamilyCode: vi.fn(() => ({
    myFamilyCode: mockFamilyCode,
    fetchMyCode: mockFetchMyCode,
    createFamily: vi.fn(),
  })),
}));

const mockUser = ref({ id: "u1", email: "test@example.com", full_name: "Test User", role: "player" });
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({ user: mockUser.value, isAuthenticated: true })),
}));
vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({ logout: vi.fn() })),
}));

const createWrapper = () =>
  mount(HeaderProfile, {
    global: {
      stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
    },
  });

describe("HeaderProfile", () => {
  beforeEach(() => {
    mockFamilyCode.value = null;
    mockFetchMyCode.mockReset();
    mockFetchMyCode.mockResolvedValue(undefined);
  });

  it("calls fetchMyCode on mount", async () => {
    createWrapper();
    await flushPromises();
    expect(mockFetchMyCode).toHaveBeenCalledOnce();
  });

  it("shows family code in dropdown when available", async () => {
    mockFamilyCode.value = "FAM-ABC123";
    const wrapper = createWrapper();
    await wrapper.find('[data-testid="profile-menu"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="family-code"]').text()).toContain("FAM-ABC123");
  });

  it("hides family code section when code is null", async () => {
    mockFamilyCode.value = null;
    const wrapper = createWrapper();
    await wrapper.find('[data-testid="profile-menu"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="family-code"]').exists()).toBe(false);
  });
});
