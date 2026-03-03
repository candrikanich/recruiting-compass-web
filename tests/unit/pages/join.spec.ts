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
  initializeUser: vi.fn().mockResolvedValue(undefined),
};

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => mockUserStore),
}));

const mockLogin = vi.fn().mockResolvedValue(undefined);
const mockSignup = vi.fn();

vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({ login: mockLogin, signup: mockSignup })),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

const mockFetch = vi.fn();
const mockCsrfPost = vi.fn().mockResolvedValue(undefined);
global.$fetch = mockFetch;
global.navigateTo = vi.fn();
global.useRoute = vi.fn(() => ({ query: { token: "valid-token-123" } }));
global.useUserStore = vi.fn(() => mockUserStore);
global.useCsrf = vi.fn(() => ({ post: mockCsrfPost }));
global.useAuthFetch = vi.fn(() => ({ $fetchAuth: mockFetch }));

const mockShowToast = vi.fn();
vi.mock("~/composables/useToast", () => ({
  useToast: vi.fn(() => ({ showToast: mockShowToast })),
}));
global.useToast = vi.fn(() => ({ showToast: mockShowToast }));

const createWrapper = () =>
  mount(JoinPage, {
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        DesignSystemButton: {
          template: "<button><slot /></button>",
          props: ["loading", "to", "variant", "color", "type", "fullWidth"],
        },
        DesignSystemInput: {
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ["modelValue", "label", "type", "placeholder"],
          emits: ["update:modelValue"],
        },
        AuthInviteSignupForm: {
          template: '<form data-testid="invite-signup-form" @submit.prevent="$emit(\'submit\')"><slot /></form>',
          props: ["email", "firstName", "lastName", "dateOfBirth", "password", "confirmPassword", "agreeToTerms", "loading", "prefill", "role"],
          emits: ["update:email", "update:firstName", "update:lastName", "update:dateOfBirth", "update:password", "update:confirmPassword", "update:agreeToTerms", "submit"],
        },
      },
    },
  });

const validInviteResponse = {
  invitationId: "inv-123",
  role: "player",
  familyName: "The Smiths",
};

describe("/join page", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUserStore.user.value = null;
    mockUserStore.isAuthenticated = false;
    (global.navigateTo as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    mockSignup.mockResolvedValue({ data: { user: { id: "new-u-1" } } });
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
      mockFetch.mockResolvedValue(validInviteResponse);
    });

    it("shows family name for valid token", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.text()).toContain("The Smiths");
    });

    it("shows hardcoded 'A family member' invite copy", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.text()).toContain("A family member");
    });

    it("shows login form when user is not authenticated", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="password-input"]').exists()).toBe(true);
    });

    it("shows signup form when user is not authenticated", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="invite-signup-form"]').exists()).toBe(true);
    });

    it("shows connect button when user is authenticated", async () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u-1", email: "player@example.com" };
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="connect-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(false);
    });

    it("calls accept endpoint and navigates to dashboard when authenticated user connects", async () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u-1", email: "player@example.com" };
      mockFetch
        .mockResolvedValueOnce(validInviteResponse)
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
        .mockResolvedValueOnce(validInviteResponse)
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

  describe("decline flow", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(validInviteResponse);
    });

    it("shows decline button when invite is valid", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="decline-button"]').exists()).toBe(true);
    });

    it("shows declined state after clicking decline", async () => {
      const wrapper = createWrapper();
      await flushPromises();
      await wrapper.find('[data-testid="decline-button"]').trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="invite-declined"]').exists()).toBe(true);
    });

    it("shows decline button for authenticated user", async () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u-1", email: "player@example.com" };
      const wrapper = createWrapper();
      await flushPromises();
      expect(wrapper.find('[data-testid="decline-button"]').exists()).toBe(true);
    });
  });

  describe("Connection toast", () => {
    it("shows connected toast when existing user accepts invite", async () => {
      mockFetch
        .mockResolvedValueOnce({ invitationId: "inv-1", role: "parent", familyName: "Smith" })
        .mockResolvedValueOnce({ success: true }); // accept

      mockUserStore.isAuthenticated = true;
      mockUserStore.user.value = { id: "u1", email: "parent@example.com" };

      const wrapper = createWrapper();
      await flushPromises();

      await wrapper.find('[data-testid="connect-button"]').trigger("click");
      await flushPromises();

      expect(mockShowToast).toHaveBeenCalledWith("You're connected!", "success");
    });

    it("shows connected toast when new user signs up and accepts invite", async () => {
      mockFetch
        .mockResolvedValueOnce({ invitationId: "inv-1", role: "parent", familyName: "Jones" })
        .mockResolvedValueOnce({ success: true }); // accept

      mockSignup.mockResolvedValueOnce({ data: { user: { id: "u2" } } });
      mockUserStore.isAuthenticated = false;
      mockUserStore.user.value = null;

      const wrapper = createWrapper();
      await flushPromises();

      await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
      await flushPromises();

      expect(mockShowToast).toHaveBeenCalledWith("You're connected!", "success");
    });
  });

  describe("signup flow (unauthenticated)", () => {
    it("calls signup then accept then navigates to player onboarding on signup submit", async () => {
      mockFetch
        .mockResolvedValueOnce({ invitationId: "inv-123", role: "player", familyName: "The Smiths" })
        .mockResolvedValueOnce({ success: true, familyUnitId: "fam-1" });

      const wrapper = createWrapper();
      await flushPromises();
      await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
      await flushPromises();

      expect(mockSignup).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/family/invite/valid-token-123/accept",
        { method: "POST" },
      );
      // No prefill data — navigate with plain string path
      expect(global.navigateTo).toHaveBeenCalledWith("/onboarding");
    });

    it("passes grad year, sport, and position as query params when invite has prefill", async () => {
      mockFetch
        .mockResolvedValueOnce({
          invitationId: "inv-123",
          role: "player",
          familyName: "The Smiths",
          prefill: { firstName: "Owen", lastName: "Smith", graduationYear: 2027, sport: "Soccer", position: "Midfielder" },
        })
        .mockResolvedValueOnce({ success: true, familyUnitId: "fam-1" });

      const wrapper = createWrapper();
      await flushPromises();
      await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
      await flushPromises();

      expect(global.navigateTo).toHaveBeenCalledWith({
        path: "/onboarding",
        query: { graduationYear: "2027", sport: "Soccer", position: "Midfielder" },
      });
    });

    it("navigates to dashboard when role is parent on signup submit", async () => {
      mockFetch
        .mockResolvedValueOnce({ invitationId: "inv-123", role: "parent", familyName: "The Smiths" })
        .mockResolvedValueOnce({ success: true });

      const wrapper = createWrapper();
      await flushPromises();
      await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
      await flushPromises();

      expect(mockSignup).toHaveBeenCalled();
      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
    });
  });
});
