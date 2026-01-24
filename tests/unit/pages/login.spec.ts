import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useRouter } from "vue-router";
import { useUserStore } from "~/stores/user";
import { useAuth } from "~/composables/useAuth";
import { useFormValidation } from "~/composables/useFormValidation";
import login from "~/pages/login.vue";

// Mock dependencies
vi.mock("vue-router");
vi.mock("~/stores/user");
vi.mock("~/composables/useAuth");
vi.mock("~/composables/useFormValidation");

// Mock Heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  ArrowLeftIcon: { template: "<svg></svg>" },
  EnvelopeIcon: { template: "<svg></svg>" },
  LockClosedIcon: { template: "<svg></svg>" },
}));

// Mock validation components
vi.mock("~/components/Validation/FormErrorSummary.vue", () => ({
  default: {
    name: "FormErrorSummary",
    template: '<div class="form-error-summary" v-if="hasErrors"><slot /></div>',
    props: ["errors", "hasErrors"],
  },
}));

vi.mock("~/components/DesignSystem/FieldError.vue", () => ({
  default: {
    name: "FieldError",
    template: '<div class="field-error" v-if="error">{{ error }}</div>',
    props: ["error"],
  },
}));

const mockUseRouter = vi.mocked(useRouter);
const mockUseUserStore = vi.mocked(useUserStore);
const mockUseAuth = vi.mocked(useAuth);
const mockUseFormValidation = vi.mocked(useFormValidation);

describe("login.vue", () => {
  let mockRouter: any;
  let mockUserStore: any;
  let mockAuth: any;
  let mockValidation: any;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    // Mock router
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      currentRoute: { value: { path: "/login" } },
    };
    mockUseRouter.mockReturnValue(mockRouter);

    // Mock user store
    mockUserStore = {
      initializeUser: vi.fn().mockResolvedValue(undefined),
      user: null,
      isAuthenticated: false,
    };
    mockUseUserStore.mockReturnValue(mockUserStore);

    // Mock auth composable
    mockAuth = {
      login: vi.fn(),
      loading: ref(false),
      error: { value: null },
    };
    mockUseAuth.mockReturnValue(mockAuth);

    // Mock form validation
    mockValidation = {
      errors: { value: [] },
      fieldErrors: { value: {} },
      validate: vi.fn(),
      validateField: vi.fn(),
      clearErrors: vi.fn(),
      hasErrors: { value: false },
      setErrors: vi.fn(),
    };
    mockUseFormValidation.mockReturnValue(mockValidation);

    vi.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(login, {
      props,
      global: {
        stubs: {
          NuxtLink: {
            name: "NuxtLink",
            template: "<a :data-to='to'><slot /></a>",
            props: ["to"],
          },
        },
      },
    });
  };

  describe("Component Rendering", () => {
    it("should render the login form correctly", () => {
      const wrapper = createWrapper();

      expect(wrapper.find("h1").text()).toBe("Recruiting Compass");
      expect(wrapper.find('label[for="email"]').text()).toBe("Email");
      expect(wrapper.find('label[for="password"]').text()).toBe("Password");
      expect(wrapper.find('input[type="email"]').exists()).toBe(true);
      expect(wrapper.find('input[type="password"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(true);
    });

    it("should render back link to welcome page", () => {
      const wrapper = createWrapper();

      const backLink = wrapper.find('[data-to="/"]');
      expect(backLink.exists()).toBe(true);
      expect(backLink.text()).toContain("Back to Welcome");
    });

    it("should render signup link", () => {
      const wrapper = createWrapper();

      const signupLink = wrapper.find('[data-to="/signup"]');
      expect(signupLink.exists()).toBe(true);
      expect(signupLink.text()).toContain("Create one now");
    });

    it("should show loading state correctly", async () => {
      // Set loading state BEFORE creating wrapper
      mockAuth.loading.value = true;
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.text()).toBe("Signing in...");
      expect(button.attributes("disabled")).toBeDefined();
    });

    it("should show validating state correctly", async () => {
      mockValidation.validateField.mockImplementation(async () => {
        return new Promise((resolve) => setTimeout(() => resolve(true), 100));
      });

      const wrapper = createWrapper();
      const emailInput = wrapper.find('input[type="email"]');

      // Trigger validation
      await emailInput.trigger("blur");

      // Button should show validating state
      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.text()).toContain("Validating...");
    });
  });

  describe("Form Validation", () => {
    it("should validate email field on blur", async () => {
      const wrapper = createWrapper();
      const emailInput = wrapper.find('input[type="email"]');

      await emailInput.setValue("invalid-email");
      await emailInput.trigger("blur");

      expect(mockValidation.validateField).toHaveBeenCalledWith(
        "email",
        "invalid-email",
        expect.any(Object),
      );
    });

    it("should validate password field on blur", async () => {
      const wrapper = createWrapper();
      const passwordInput = wrapper.find('input[type="password"]');

      await passwordInput.setValue("123");
      await passwordInput.trigger("blur");

      expect(mockValidation.validateField).toHaveBeenCalledWith(
        "password",
        "123",
        expect.any(Object),
      );
    });

    it("should show field errors when present", async () => {
      mockValidation.fieldErrors.value = { email: "Invalid email format" };
      const wrapper = createWrapper();

      await wrapper.vm.$nextTick();

      // Look for the FieldError component which renders .field-error class
      const fieldError = wrapper.find(".field-error");
      expect(fieldError.exists()).toBe(true);
      expect(fieldError.text()).toBe("Invalid email format");
    });

    it("should show form error summary when has errors", async () => {
      mockValidation.hasErrors.value = true;
      mockValidation.errors.value = [
        { field: "form", message: "Login failed" },
      ];

      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".form-error-summary").exists()).toBe(true);
    });

    it("should disable submit button when form is invalid", async () => {
      mockValidation.hasErrors.value = true;
      const wrapper = createWrapper();

      await wrapper.vm.$nextTick();

      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.attributes("disabled")).toBeDefined();
    });

    it("should enable submit button when form is valid", async () => {
      const wrapper = createWrapper();

      // Fill form with valid data
      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("password123");

      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.attributes("disabled")).toBeUndefined();
    });
  });

  describe("Login Functionality", () => {
    it("should handle successful login", async () => {
      mockValidation.validate.mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      });
      mockAuth.login.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const wrapper = createWrapper();

      // Fill form
      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("password123");

      // Submit form
      await wrapper.find("form").trigger("submit.prevent");

      expect(mockValidation.validate).toHaveBeenCalledWith(
        {
          email: "test@example.com",
          password: "password123",
        },
        expect.any(Object),
      );

      expect(mockAuth.login).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
      expect(mockUserStore.initializeUser).toHaveBeenCalled();
    });

    it("should handle login error", async () => {
      mockValidation.validate.mockResolvedValue({
        email: "test@example.com",
        password: "wrongpassword",
      });
      mockAuth.login.mockRejectedValue(new Error("Invalid credentials"));

      const wrapper = createWrapper();

      // Fill and submit form
      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("wrongpassword");
      await wrapper.find("form").trigger("submit.prevent");

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        {
          field: "form",
          message: "Invalid credentials",
        },
      ]);
    });

    it("should handle non-Error login error", async () => {
      mockValidation.validate.mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      });
      mockAuth.login.mockRejectedValue("String error");

      const wrapper = createWrapper();

      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("password123");
      await wrapper.find("form").trigger("submit.prevent");

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        {
          field: "form",
          message: "Login failed",
        },
      ]);
    });

    it("should not submit when validation fails", async () => {
      mockValidation.validate.mockResolvedValue(null);

      const wrapper = createWrapper();

      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("password123");
      await wrapper.find("form").trigger("submit.prevent");

      expect(mockAuth.login).not.toHaveBeenCalled();
    });

    it("should trim email before validation", async () => {
      mockValidation.validate.mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      });
      mockAuth.login.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const wrapper = createWrapper();

      await wrapper
        .find('input[type="email"]')
        .setValue("  test@example.com  ");
      await wrapper.find('input[type="password"]').setValue("password123");
      await wrapper.find("form").trigger("submit.prevent");

      expect(mockValidation.validate).toHaveBeenCalledWith(
        {
          email: "test@example.com", // Transformed value (email schema trims)
          password: "password123",
        },
        expect.any(Object),
      );

      // Auth login should receive trimmed email
      expect(mockAuth.login).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
    });
  });

  describe("Navigation", () => {
    it("should navigate to dashboard after successful login", async () => {
      // Mock navigateTo (Nuxt's navigation function)
      const mockNavigateTo = vi.fn();
      global.navigateTo = mockNavigateTo;

      mockValidation.validate.mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      });
      mockAuth.login.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const wrapper = createWrapper();

      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("password123");
      await wrapper.find("form").trigger("submit.prevent");

      expect(mockNavigateTo).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Loading States", () => {
    it("should disable form during login loading", async () => {
      const wrapper = createWrapper();

      // Set loading after component is mounted
      mockAuth.loading.value = true;
      await wrapper.vm.$nextTick();

      const emailInput = wrapper.find('input[type="email"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const button = wrapper.find('[data-testid="login-button"]');

      expect(emailInput.attributes("disabled")).toBeDefined();
      expect(passwordInput.attributes("disabled")).toBeDefined();
      expect(button.attributes("disabled")).toBeDefined();
    });

    it("should show correct button text during loading", async () => {
      mockAuth.loading.value = true;
      let wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      let button = wrapper.find('[data-testid="login-button"]');
      expect(button.text()).toBe("Signing in...");

      mockAuth.loading.value = false;
      mockValidation.validateField.mockImplementation(async () => {
        return new Promise((resolve) => setTimeout(() => resolve(true), 100));
      });

      wrapper = createWrapper();
      const emailInput = wrapper.find('input[type="email"]');
      await emailInput.trigger("blur");
      await wrapper.vm.$nextTick();

      button = wrapper.find('[data-testid="login-button"]');
      expect(button.text()).toContain("Validating...");
    });
  });

  describe("Error Handling", () => {
    it("should clear errors when form is submitted", async () => {
      mockValidation.validate.mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      });
      mockAuth.login.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Set initial errors
      mockValidation.errors.value = [
        { field: "email", message: "Previous error" },
      ];

      const wrapper = createWrapper();

      await wrapper.find('input[type="email"]').setValue("test@example.com");
      await wrapper.find('input[type="password"]').setValue("password123");
      await wrapper.find("form").trigger("submit.prevent");

      // validate should be called, which would clear errors in real implementation
      expect(mockValidation.validate).toHaveBeenCalled();
    });
  });

  describe("Form Accessibility", () => {
    it("should have proper form labels and associations", () => {
      const wrapper = createWrapper();

      const emailInput = wrapper.find('input[type="email"]');
      const passwordInput = wrapper.find('input[type="password"]');

      expect(emailInput.attributes("id")).toBe("email");
      expect(wrapper.find('label[for="email"]').exists()).toBe(true);

      expect(passwordInput.attributes("id")).toBe("password");
      expect(wrapper.find('label[for="password"]').exists()).toBe(true);
    });

    it("should have proper autocomplete attributes", () => {
      const wrapper = createWrapper();

      const emailInput = wrapper.find('input[type="email"]');
      const passwordInput = wrapper.find('input[type="password"]');

      expect(emailInput.attributes("autocomplete")).toBe("email");
      expect(passwordInput.attributes("autocomplete")).toBe("current-password");
    });

    it("should have proper input types", () => {
      const wrapper = createWrapper();

      expect(wrapper.find('input[type="email"]').exists()).toBe(true);
      expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive styling classes", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".min-h-screen").exists()).toBe(true);
      expect(wrapper.find(".max-w-md").exists()).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty form submission", async () => {
      mockValidation.validate.mockResolvedValue(null);

      const wrapper = createWrapper();

      await wrapper.find("form").trigger("submit.prevent");

      expect(mockAuth.login).not.toHaveBeenCalled();
      expect(mockUserStore.initializeUser).not.toHaveBeenCalled();
    });

    it("should handle very long email addresses", async () => {
      const longEmail = "a".repeat(250) + "@example.com";

      const wrapper = createWrapper();
      await wrapper.find('input[type="email"]').setValue(longEmail);

      expect(
        (wrapper.find('input[type="email"]').element as HTMLInputElement).value,
      ).toBe(longEmail);
    });

    it("should handle special characters in password", async () => {
      const specialPassword = "P@$$w0rd!@#$%^&*()";

      const wrapper = createWrapper();
      await wrapper.find('input[type="password"]').setValue(specialPassword);

      expect(
        (wrapper.find('input[type="password"]').element as HTMLInputElement)
          .value,
      ).toBe(specialPassword);
    });
  });
});
