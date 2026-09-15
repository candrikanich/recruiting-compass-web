import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "~/stores/user";
import { useAuth } from "~/composables/useAuth";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useSupabase } from "~/composables/useSupabase";
import { useFormValidation } from "~/composables/useFormValidation";
import adminSignup from "~/pages/admin/signup.vue";

vi.mock("~/stores/user", () => ({ useUserStore: vi.fn() }));
vi.mock("~/composables/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("~/composables/useAuthFetch", () => ({ useAuthFetch: vi.fn() }));
vi.mock("~/composables/useSupabase", () => ({ useSupabase: vi.fn() }));
vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: vi.fn(),
}));

vi.mock("~/components/Validation/FormErrorSummary.vue", () => ({
  default: {
    name: "FormErrorSummary",
    template: '<div class="form-error-summary"><slot /></div>',
    props: ["errors"],
  },
}));
vi.mock("~/components/DesignSystem/FieldError.vue", () => ({
  default: {
    name: "FieldError",
    template: '<div class="field-error" v-if="error">{{ error }}</div>',
    props: ["error"],
  },
}));
const AnimatedCheckStub = {
  name: "DesignSystemFormAnimatedCheck",
  template:
    '<div><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></div>',
  props: ["modelValue"],
  emits: ["update:modelValue"],
};

const mockUseUserStore = vi.mocked(useUserStore);
const mockUseAuth = vi.mocked(useAuth);
const mockUseAuthFetch = vi.mocked(useAuthFetch);
const mockUseSupabase = vi.mocked(useSupabase);
const mockUseFormValidation = vi.mocked(useFormValidation);

describe("admin/signup.vue — recovery login captcha", () => {
  let mockAuth: any;
  let mockAuthFetch: any;
  let mockSupabase: any;
  let mockValidation: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockUseUserStore.mockReturnValue({
      initializeUser: vi.fn().mockResolvedValue(undefined),
    } as any);

    mockAuth = {
      signup: vi.fn(),
      login: vi.fn(),
    };
    mockUseAuth.mockReturnValue(mockAuth);

    mockAuthFetch = {
      $fetchAuth: vi.fn().mockResolvedValue({}),
    };
    mockUseAuthFetch.mockReturnValue(mockAuthFetch);

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    };
    mockUseSupabase.mockReturnValue(mockSupabase);

    mockValidation = {
      errors: { value: [] },
      fieldErrors: { value: {} },
      validate: vi.fn().mockResolvedValue({
        fullName: "Admin User",
        email: "admin@example.com",
        password: "Password123", // pragma: allowlist secret
      }),
      validateField: vi.fn(),
      clearErrors: vi.fn(),
      hasErrors: { value: false },
      setErrors: vi.fn(),
    };
    mockUseFormValidation.mockReturnValue(mockValidation);

    global.navigateTo = vi.fn();
    global.$fetch = vi.fn().mockResolvedValue({ valid: true }) as any;
  });

  const createWrapper = () =>
    mount(adminSignup, {
      global: {
        stubs: {
          NuxtLink: { template: "<a><slot /></a>" },
          UIcon: { template: "<span />" },
          DesignSystemFormAnimatedCheck: AnimatedCheckStub,
        },
      },
    });

  it("attempts a recovery login (not an immediate throw) when signup reports the user is already registered and no session exists yet", async () => {
    mockAuth.signup.mockRejectedValue(new Error("User already registered"));
    mockAuth.login.mockResolvedValue({
      data: { user: { id: "user-123" }, session: { user: { id: "user-123" } } },
      error: null,
    });

    const wrapper = createWrapper();

    await wrapper.find("#firstName").setValue("Admin");
    await wrapper.find("#lastName").setValue("User");
    await wrapper.find("#email").setValue("admin@example.com");
    await wrapper.find("#adminToken").setValue("token123");
    await wrapper.find("#password").setValue("Password123");
    await wrapper.find("#confirmPassword").setValue("Password123");
    await wrapper.find('input[type="checkbox"]').setValue(true);

    await wrapper.find("form").trigger("submit.prevent");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Root-cause assertion: recovery must go through login() so a fresh
    // (unconsumed) Turnstile token can be supplied — not fall straight
    // through to the "no active session" throw.
    expect(mockAuth.login).toHaveBeenCalledWith(
      "admin@example.com",
      "Password123",
      false,
      undefined, // captchaToken — Turnstile disabled in this test env
    );

    // Recovery succeeded, so the admin-profile call should still complete.
    expect(mockAuthFetch.$fetchAuth).toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockValidation.setErrors).not.toHaveBeenCalledWith([
      expect.objectContaining({ field: "form" }),
    ]);
  });

  it("still surfaces the original error when recovery login also fails", async () => {
    mockAuth.signup.mockRejectedValue(new Error("User already registered"));
    mockAuth.login.mockRejectedValue(new Error("Invalid login credentials"));

    const wrapper = createWrapper();

    await wrapper.find("#firstName").setValue("Admin");
    await wrapper.find("#lastName").setValue("User");
    await wrapper.find("#email").setValue("admin@example.com");
    await wrapper.find("#adminToken").setValue("token123");
    await wrapper.find("#password").setValue("Password123");
    await wrapper.find("#confirmPassword").setValue("Password123");
    await wrapper.find('input[type="checkbox"]').setValue(true);

    await wrapper.find("form").trigger("submit.prevent");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockAuth.login).toHaveBeenCalled();
    expect(mockValidation.setErrors).toHaveBeenCalledWith([
      expect.objectContaining({ field: "form" }),
    ]);
    expect(mockAuthFetch.$fetchAuth).not.toHaveBeenCalled();
  });
});
