import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import EmailVerificationBanner from "~/components/Dashboard/EmailVerificationBanner.vue";

const mockUser = { id: "user-123", email: "player@example.com" };
const mockIsAuthenticated = ref(true);
const mockEmailVerified = ref(false);
const mockRefreshVerificationStatus = vi.fn();

// Real Pinia setup-stores auto-unwrap top-level refs on the returned store
// instance, so the mock must expose plain values via getters, not Refs.
const buildMockUserStore = () => ({
  user: mockUser,
  get isAuthenticated() {
    return mockIsAuthenticated.value;
  },
  get emailVerified() {
    return mockEmailVerified.value;
  },
  refreshVerificationStatus: mockRefreshVerificationStatus,
});

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(buildMockUserStore),
}));
global.useUserStore = vi.fn(buildMockUserStore);

const mockLoading = ref(false);
const mockError = ref<string | null>(null);
const mockResendVerificationEmail = vi.fn().mockResolvedValue(true);

vi.mock("~/composables/useEmailVerification", () => ({
  useEmailVerification: vi.fn(() => ({
    loading: mockLoading,
    error: mockError,
    resendVerificationEmail: mockResendVerificationEmail,
  })),
}));
global.useEmailVerification = vi.fn(() => ({
  loading: mockLoading,
  error: mockError,
  resendVerificationEmail: mockResendVerificationEmail,
}));

const createWrapper = () =>
  mount(EmailVerificationBanner, {
    global: {
      stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
    },
  });

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    mockIsAuthenticated.value = true;
    mockEmailVerified.value = false;
    mockLoading.value = false;
    mockError.value = null;
    mockRefreshVerificationStatus.mockClear();
    mockResendVerificationEmail.mockClear();
    sessionStorage.clear();
  });

  it("shows the banner when authenticated and unverified", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-testid="verify-email-banner"]').exists()).toBe(
      true,
    );
  });

  it("hides the banner when the email is verified", async () => {
    mockEmailVerified.value = true;
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-testid="verify-email-banner"]').exists()).toBe(
      false,
    );
  });

  it("hides the banner when not authenticated", async () => {
    mockIsAuthenticated.value = false;
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-testid="verify-email-banner"]').exists()).toBe(
      false,
    );
  });

  it("refreshes verification status on mount", async () => {
    createWrapper();
    await flushPromises();
    expect(mockRefreshVerificationStatus).toHaveBeenCalledTimes(1);
  });

  it("resends the verification email to the user's address", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    await wrapper.get('[data-testid="resend-verification"]').trigger("click");
    await flushPromises();
    expect(mockResendVerificationEmail).toHaveBeenCalledWith();
    expect(wrapper.text()).toContain("Sent");
  });

  it("surfaces a resend failure", async () => {
    mockResendVerificationEmail.mockResolvedValueOnce(false);
    mockError.value = "Failed to resend verification email";
    const wrapper = createWrapper();
    await flushPromises();
    await wrapper.get('[data-testid="resend-verification"]').trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Failed to resend verification email");
  });

  it("dismisses for the session and stays hidden on remount", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    await wrapper.find("button[aria-label]").trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="verify-email-banner"]').exists()).toBe(
      false,
    );
    expect(sessionStorage.getItem("email_verify_ack_user-123")).toBe("true");

    const remounted = createWrapper();
    await flushPromises();
    expect(remounted.find('[data-testid="verify-email-banner"]').exists()).toBe(
      false,
    );
  });
});
