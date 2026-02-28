import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import JoinPage from "~/pages/join.vue";

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useRoute: vi.fn(() => ({ query: { token: "valid-token-123" } })),
}));

const mockUserStore = {
  user: ref<{ id: string; email: string } | null>(null),
  isAuthenticated: false,
};

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => mockUserStore),
}));

const mockLogin = vi.fn().mockResolvedValue(undefined);

vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({ login: mockLogin })),
}));

const mockFetch = vi.fn();
global.$fetch = mockFetch;
global.navigateTo = vi.fn();
global.useRoute = vi.fn(() => ({ query: { token: "valid-token-123" } }));
global.useUserStore = vi.fn(() => mockUserStore);

const createWrapper = () =>
  mount(JoinPage, {
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        UButton: { template: "<button><slot /></button>", props: ["loading", "to"] },
        UInput: {
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ["modelValue", "label", "type", "placeholder"],
          emits: ["update:modelValue"],
        },
      },
    },
  });

describe("/join page", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUserStore.user.value = null;
    mockUserStore.isAuthenticated = false;
    (global.navigateTo as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe("loading state", () => {
    it("shows loading text while fetching invite", async () => {
      // Never resolves — stays in pending
      mockFetch.mockReturnValue(new Promise(() => {}));
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true);
    });
  });

  describe("valid invite", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        invitationId: "inv-123",
        email: "player@example.com",
        role: "player",
        familyName: "The Smiths",
        inviterName: "Jane Smith",
      });
    });

    it("shows family and inviter info for valid token", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.text()).toContain("The Smiths");
      expect(wrapper.text()).toContain("Jane Smith");
    });

    it("shows login form when user is not authenticated", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="password-input"]').exists()).toBe(true);
    });

    it("shows connect button when user is authenticated", async () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u-1", email: "player@example.com" };
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="connect-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(false);
    });

    it("shows email mismatch warning when authenticated user email differs", async () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u-1", email: "other@example.com" };
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.text()).toContain("player@example.com");
    });

    it("calls accept endpoint and navigates to dashboard when authenticated user connects", async () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u-1", email: "player@example.com" };
      // First call: GET invite, second: POST accept
      mockFetch
        .mockResolvedValueOnce({
          invitationId: "inv-123",
          email: "player@example.com",
          role: "player",
          familyName: "The Smiths",
          inviterName: "Jane Smith",
        })
        .mockResolvedValueOnce({ success: true, familyUnitId: "family-1" });

      const wrapper = createWrapper();
      await flushPromises();
      await wrapper.find('[data-testid="connect-button"]').trigger("click");
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/family/invite/valid-token-123/accept",
        { method: "POST" },
      );
      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
    });

    it("logs in then accepts when unauthenticated user submits login form", async () => {
      mockFetch
        .mockResolvedValueOnce({
          invitationId: "inv-123",
          email: "player@example.com",
          role: "player",
          familyName: "The Smiths",
          inviterName: "Jane Smith",
        })
        .mockResolvedValueOnce({ success: true, familyUnitId: "family-1" });

      const wrapper = createWrapper();
      await flushPromises();

      await wrapper.find('[data-testid="email-input"]').setValue("player@example.com");
      await wrapper.find('[data-testid="password-input"]').setValue("secret");
      await wrapper.find('[data-testid="login-connect-button"]').trigger("click");
      await flushPromises();

      expect(mockLogin).toHaveBeenCalledWith("player@example.com", "secret");
      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("error states", () => {
    it("shows expired message for 410 response", async () => {
      mockFetch.mockRejectedValue({ statusCode: 410, statusMessage: "Expired" });
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="error-expired"]').exists()).toBe(true);
    });

    it("shows already accepted message for 409 response", async () => {
      mockFetch.mockRejectedValue({ statusCode: 409, statusMessage: "Already accepted" });
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="error-accepted"]').exists()).toBe(true);
    });

    it("shows not found message for 404 response", async () => {
      mockFetch.mockRejectedValue({ statusCode: 404, statusMessage: "Not found" });
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="error-not-found"]').exists()).toBe(true);
    });
  });
});
