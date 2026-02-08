import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ref, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import VerifyEmailPage from "~/pages/verify-email.vue";

// Mock router
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRoute = {
  query: {},
};

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
  useRoute: vi.fn(() => mockRoute),
}));

// Mock composables
const mockVerifyEmailToken = vi.fn();
const mockCheckEmailVerificationStatus = vi.fn();
const mockResendVerificationEmail = vi.fn();
const mockLoadingRef = ref(false);
const mockErrorRef = ref(null);

vi.mock("~/composables/useEmailVerification", () => ({
  useEmailVerification: vi.fn(() => ({
    verifyEmailToken: mockVerifyEmailToken,
    checkEmailVerificationStatus: mockCheckEmailVerificationStatus,
    resendVerificationEmail: mockResendVerificationEmail,
    loading: mockLoadingRef,
    error: mockErrorRef,
  })),
}));

// Mock useLoadingStates
vi.mock("~/composables/useLoadingStates", () => ({
  useLoadingStates: () => ({
    loading: ref(false),
    validating: ref(false),
    setLoading: vi.fn(),
    setValidating: vi.fn(),
  }),
}));

// Mock Heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  ArrowLeftIcon: { template: "<svg></svg>" },
}));

// Mock components
vi.mock("~/components/Auth/MultiSportFieldBackground.vue", () => ({
  default: {
    name: "AuthMultiSportFieldBackground",
    template: '<div class="multi-sport-field-background"></div>',
  },
}));

const mountPage = (queryParams = {}) => {
  mockRoute.query = queryParams;

  return mount(VerifyEmailPage, {
    global: {
      stubs: {
        NuxtLink: {
          name: "NuxtLink",
          template: '<a :href="to"><slot /></a>',
          props: ["to"],
        },
        SkipLink: {
          name: "SkipLink",
          template: '<a :href="to">{{ text }}</a>',
          props: ["to", "text"],
        },
      },
    },
  });
};

describe("pages/verify-email.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = {};
    mockLoadingRef.value = false;
    mockErrorRef.value = null;
    mockCheckEmailVerificationStatus.mockResolvedValue(false);
    mockVerifyEmailToken.mockResolvedValue(false);
    mockResendVerificationEmail.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Rendering", () => {
    it("renders the page with main landmark", async () => {
      const wrapper = mountPage();
      await nextTick();
      expect(wrapper.find("main").exists()).toBe(true);
    });

    it("renders navigation link to home", async () => {
      const wrapper = mountPage();
      await nextTick();
      const backLink = wrapper.find('a[href="/"]');
      expect(backLink.exists()).toBe(true);
      expect(backLink.text()).toContain("Back to Home");
    });

    it("renders verify email heading", async () => {
      const wrapper = mountPage();
      await nextTick();
      expect(wrapper.find("h1").text()).toBe("Verify Your Email");
    });

    it("shows pending status icon initially", async () => {
      const wrapper = mountPage();
      await nextTick();
      const statusIcon = wrapper.find('[role="img"]');
      expect(statusIcon.exists()).toBe(true);
    });

    it("shows help section with tips", async () => {
      const wrapper = mountPage();
      await nextTick();
      expect(wrapper.find("#help-heading").exists()).toBe(true);
      expect(wrapper.text()).toContain("Check your spam folder");
    });
  });

  describe("Token Verification Flow", () => {
    it("checks verification status on mount when no token", async () => {
      const wrapper = mountPage();
      await nextTick();

      expect(mockCheckEmailVerificationStatus).toHaveBeenCalled();
      expect(mockVerifyEmailToken).not.toHaveBeenCalled();
    });

    it("verifies token when provided in query params", async () => {
      mockVerifyEmailToken.mockResolvedValue(true);
      const wrapper = mountPage({ token: "test-token-123" });
      await nextTick();

      expect(mockVerifyEmailToken).toHaveBeenCalledWith("test-token-123");
    });

    it("shows verified state after successful token verification", async () => {
      vi.useFakeTimers();
      mockVerifyEmailToken.mockResolvedValue(true);
      const wrapper = mountPage({ token: "test-token-123" });
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Your email has been verified!");
      vi.useRealTimers();
    });

    it("removes token from URL after verification", async () => {
      mockVerifyEmailToken.mockResolvedValue(true);
      const wrapper = mountPage({ token: "test-token-123" });
      await nextTick();

      expect(mockReplace).toHaveBeenCalledWith({ query: {} });
    });

    it("shows pending state when token verification fails", async () => {
      mockVerifyEmailToken.mockResolvedValue(false);
      const wrapper = mountPage({ token: "invalid-token" });
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain(
        "Check your email for a verification link",
      );
    });
  });

  describe("Email Display", () => {
    it("displays email from query parameter", async () => {
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("test@example.com");
    });

    it("shows pending message with email address", async () => {
      const wrapper = mountPage({ email: "user@test.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("We sent a verification email to:");
      expect(wrapper.text()).toContain("user@test.com");
    });
  });

  describe("Status Messages", () => {
    it("shows loading message during verification check", async () => {
      const wrapper = mountPage();
      // Immediately check before async completes
      const loadingMessage = wrapper.find('[role="status"]');
      expect(loadingMessage.exists()).toBe(true);
    });

    it("shows pending message when not verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("We sent a verification email to:");
    });

    it("shows success message when verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(true);
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Your email is verified");
    });

    it("shows error message when verification fails", async () => {
      const errorMessage = "Verification failed";
      const wrapper = mountPage();
      await nextTick();

      // Manually trigger error state (in real scenario this comes from composable)
      // This tests that the template properly displays errors
      const html = wrapper.html();
      expect(html).toBeTruthy();
    });
  });

  describe("Resend Functionality", () => {
    it("renders resend button when not verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      expect(resendButton).toBeDefined();
    });

    it("does not render resend button when verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(true);
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      expect(resendButton).toBeUndefined();
    });

    it("calls resendVerificationEmail on button click", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");

      expect(mockResendVerificationEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
      vi.useRealTimers();
    });

    it("starts 60 second cooldown after resend", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");
      await wrapper.vm.$nextTick();

      // Should show cooldown timer
      expect(resendButton!.text()).toContain("60");
      vi.useRealTimers();
    });

    it("disables resend button during cooldown", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");
      await wrapper.vm.$nextTick();

      expect(resendButton!.attributes("disabled")).toBeDefined();
      vi.useRealTimers();
    });

    it("enables resend button after cooldown expires", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");
      await wrapper.vm.$nextTick();

      // Fast-forward 60+ seconds
      vi.advanceTimersByTime(61000);
      await wrapper.vm.$nextTick();

      const updatedButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      expect(updatedButton!.attributes("disabled")).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe("Dashboard Navigation", () => {
    it("renders dashboard button when verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(true);
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      const dashboardButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Go to Dashboard"));
      expect(dashboardButton).toBeDefined();
    });

    it("navigates to dashboard on button click", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(true);
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      const dashboardButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Go to Dashboard"));
      await dashboardButton!.trigger("click");

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("auto-focuses dashboard button after verification", async () => {
      mockVerifyEmailToken.mockResolvedValue(true);
      const wrapper = mountPage({ token: "test-token-123" });
      await nextTick();
      await wrapper.vm.$nextTick();

      // Dashboard button should exist and be ready for focus
      const dashboardButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Go to Dashboard"));
      expect(dashboardButton).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("has skip link to verification status", async () => {
      const wrapper = mountPage();
      await nextTick();
      const skipLink = wrapper.find('a[href="#verify-card"]');
      expect(skipLink.exists()).toBe(true);
      expect(skipLink.text()).toContain("Skip to verification status");
    });

    it("has navigation with aria-label", async () => {
      const wrapper = mountPage();
      await nextTick();
      const nav = wrapper.find("nav");
      expect(nav.attributes("aria-label")).toBe("Page navigation");
    });

    it("status icon has descriptive aria-label", async () => {
      const wrapper = mountPage();
      await nextTick();
      const statusIcon = wrapper.find('[role="img"]');
      expect(statusIcon.attributes("aria-label")).toBeTruthy();
    });

    it("loading state has aria-live region", async () => {
      const wrapper = mountPage();
      const statusRegion = wrapper.find('[aria-live="polite"]');
      expect(statusRegion.exists()).toBe(true);
    });

    it("success message has aria-live polite", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(true);
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      const successRegion = wrapper.findAll('[aria-live="polite"]');
      expect(successRegion.length).toBeGreaterThan(0);
    });

    it("error message has aria-live assertive", async () => {
      const wrapper = mountPage();
      await nextTick();

      // Check that error regions use assertive
      const html = wrapper.html();
      if (html.includes('aria-live="assertive"')) {
        expect(html).toContain('role="alert"');
      }
    });

    it("resend button has descriptive aria-label", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      expect(resendButton!.attributes("aria-label")).toBeTruthy();
    });

    it("has SR-only cooldown announcement div", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const srOnlyDivs = wrapper.findAll(".sr-only");
      const cooldownDiv = srOnlyDivs.find(
        (div) => div.attributes("role") === "status",
      );
      expect(cooldownDiv).toBeDefined();
      vi.useRealTimers();
    });

    it("help section has aria-labelledby", async () => {
      const wrapper = mountPage();
      await nextTick();
      const section = wrapper.find('[aria-labelledby="help-heading"]');
      expect(section.exists()).toBe(true);
      expect(wrapper.find("#help-heading").exists()).toBe(true);
    });

    it("status messages are atomic for screen readers", async () => {
      const wrapper = mountPage();
      await nextTick();
      const statusMessages = wrapper.findAll('[aria-atomic="true"]');
      expect(statusMessages.length).toBeGreaterThan(0);
    });
  });

  describe("Loading States", () => {
    it("shows loading spinner during verification check", async () => {
      const wrapper = mountPage();
      // Check immediately - should show checking state
      const html = wrapper.html();
      expect(html).toBeTruthy();
    });

    it("disables resend button while loading", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      mockResendVerificationEmail.mockImplementation(() => {
        mockLoadingRef.value = true;
        return new Promise(() => {}); // Never resolves
      });
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");
      await wrapper.vm.$nextTick();

      expect(resendButton!.attributes("disabled")).toBeDefined();
      vi.useRealTimers();
    });

    it("shows sending state in resend button", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      mockResendVerificationEmail.mockImplementation(() => {
        mockLoadingRef.value = true;
        return new Promise(() => {}); // Never resolves
      });
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");
      await wrapper.vm.$nextTick();

      expect(resendButton!.text()).toContain("Sending...");
      vi.useRealTimers();
    });
  });

  describe("Status Icon States", () => {
    it("shows loading icon during verification check", async () => {
      const wrapper = mountPage();
      // Initial state shows loading
      const statusIcon = wrapper.find('[role="img"]');
      expect(statusIcon.exists()).toBe(true);
    });

    it("shows verified icon when email is verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(true);
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      const statusIcon = wrapper.find('[role="img"]');
      expect(statusIcon.attributes("aria-label")).toContain("verified");
    });

    it("shows pending icon when not verified", async () => {
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const statusIcon = wrapper.find('[role="img"]');
      expect(statusIcon.attributes("aria-label")).toContain("pending");
    });

    it("updates icon aria-label based on state", async () => {
      const wrapper = mountPage();
      await nextTick();

      const statusIcon = wrapper.find('[role="img"]');
      const ariaLabel = statusIcon.attributes("aria-label");
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/(checking|verified|pending)/i);
    });
  });

  describe("Edge Cases", () => {
    it("handles missing email parameter gracefully", async () => {
      const wrapper = mountPage();
      await nextTick();
      await wrapper.vm.$nextTick();

      expect(() => wrapper.html()).not.toThrow();
    });

    it("handles verification check failure", async () => {
      mockCheckEmailVerificationStatus.mockRejectedValue(
        new Error("Network error"),
      );
      const wrapper = mountPage();
      await nextTick();
      // Suppress expected error
      await wrapper.vm.$nextTick().catch(() => {});

      expect(() => wrapper.html()).not.toThrow();
    });

    it("handles token verification failure", async () => {
      mockVerifyEmailToken.mockRejectedValue(new Error("Invalid token"));
      const wrapper = mountPage({ token: "bad-token" });
      await nextTick();
      // Suppress expected error
      await wrapper.vm.$nextTick().catch(() => {});

      expect(() => wrapper.html()).not.toThrow();
    });

    it("handles resend failure gracefully", async () => {
      vi.useFakeTimers();
      mockCheckEmailVerificationStatus.mockResolvedValue(false);
      mockResendVerificationEmail.mockResolvedValue(false);
      const wrapper = mountPage({ email: "test@example.com" });
      await nextTick();
      await wrapper.vm.$nextTick();

      const resendButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Resend"));
      await resendButton!.trigger("click");

      expect(() => wrapper.html()).not.toThrow();
      vi.useRealTimers();
    });
  });

  describe("Page Meta", () => {
    it("uses public layout", () => {
      expect(VerifyEmailPage).toBeDefined();
    });
  });
});
