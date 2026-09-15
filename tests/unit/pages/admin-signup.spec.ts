import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useAuth } from "~/composables/useAuth";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useUserStore } from "~/stores/user";
import { useFormValidation } from "~/composables/useFormValidation";
import adminSignup from "~/pages/admin/signup.vue";

vi.mock("~/composables/useAuth");
vi.mock("~/composables/useAuthFetch");
vi.mock("~/stores/user");
vi.mock("~/composables/useFormValidation");

vi.mock("~/components/Validation/FormErrorSummary.vue", () => ({
  default: {
    name: "FormErrorSummary",
    template: '<div class="form-error-summary" v-if="errors"><slot /></div>',
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


const mockUseAuth = vi.mocked(useAuth);
const mockUseAuthFetch = vi.mocked(useAuthFetch);
const mockUseUserStore = vi.mocked(useUserStore);
const mockUseFormValidation = vi.mocked(useFormValidation);

const validated = {
  fullName: "Jo Admin",
  email: "admin@example.com",
  password: "Password1!",
  confirmPassword: "Password1!",
  role: "admin",
};

describe("admin/signup.vue", () => {
  let mockAuth: any;
  let mockAuthFetch: any;
  let mockUserStore: any;
  let mockValidation: any;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    mockAuth = {
      signup: vi.fn(),
      login: vi.fn(),
      loading: ref(false),
      error: { value: null },
    };
    mockUseAuth.mockReturnValue(mockAuth);

    mockAuthFetch = {
      $fetchAuth: vi.fn().mockResolvedValue({}),
    };
    mockUseAuthFetch.mockReturnValue(mockAuthFetch);

    mockUserStore = {
      initializeUser: vi.fn().mockResolvedValue(undefined),
      user: null,
    };
    mockUseUserStore.mockReturnValue(mockUserStore);

    mockValidation = {
      errors: { value: [] },
      fieldErrors: { value: {} },
      validate: vi.fn().mockResolvedValue(validated),
      validateField: vi.fn(),
      clearErrors: vi.fn(),
      hasErrors: { value: false },
      setErrors: vi.fn(),
    };
    mockUseFormValidation.mockReturnValue(mockValidation);

    global.navigateTo = vi.fn();
    global.$fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/validate-admin-token") {
        return Promise.resolve({ valid: true });
      }
      return Promise.resolve({});
    });
  });

  const createWrapper = () => {
    return mount(adminSignup, {
      global: {
        stubs: {
          NuxtLink: {
            name: "NuxtLink",
            template: "<a :data-to='to'><slot /></a>",
            props: ["to"],
          },
          DesignSystemFormAnimatedCheck: {
            name: "DesignSystemFormAnimatedCheck",
            template:
              '<div><input id="agreeToTerms" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></div>',
            props: ["modelValue"],
            emits: ["update:modelValue"],
          },
        },
      },
    });
  };

  const fillAndSubmit = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.find("#firstName").setValue("Jo");
    await wrapper.find("#lastName").setValue("Admin");
    await wrapper.find("#email").setValue(validated.email);
    await wrapper.find("#adminToken").setValue("valid-token");
    await wrapper.find("#password").setValue(validated.password);
    await wrapper.find("#confirmPassword").setValue(validated.confirmPassword);
    await wrapper.find("#agreeToTerms").setValue(true);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
  };

  it("recovers when the account already exists but admin-profile previously failed", async () => {
    // signup() fails with the deliberately generic duplicate-account message
    // (accountCreation.ts) — no way to tell "already exists" from any other
    // failure by message text alone.
    mockAuth.signup.mockRejectedValue(
      new Error("Unable to create account. Please try again."),
    );
    // But the submitted credentials are valid — the account was created by
    // a prior attempt whose admin-profile call failed.
    mockAuth.login.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });

    const wrapper = createWrapper();
    await fillAndSubmit(wrapper);

    expect(mockAuth.login).toHaveBeenCalledWith(
      validated.email,
      validated.password,
    );
    expect(mockAuthFetch.$fetchAuth).toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          userId: "user-123",
          adminToken: "valid-token",
        }),
      }),
    );
    expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
  });

  it("surfaces the original error when the account doesn't exist (or credentials are wrong)", async () => {
    mockAuth.signup.mockRejectedValue(
      new Error("Unable to create account. Please try again."),
    );
    mockAuth.login.mockRejectedValue(new Error("Invalid login credentials"));

    const wrapper = createWrapper();
    await fillAndSubmit(wrapper);

    expect(mockAuthFetch.$fetchAuth).not.toHaveBeenCalled();
    expect(mockValidation.setErrors).toHaveBeenCalledWith([
      {
        field: "form",
        message: "Unable to create account. Please try again.",
      },
    ]);
  });

  it("still requires a fresh, server-validated adminToken on the recovery path", async () => {
    mockAuth.signup.mockRejectedValue(
      new Error("Unable to create account. Please try again."),
    );
    mockAuth.login.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    mockAuthFetch.$fetchAuth.mockRejectedValue({
      data: { statusMessage: "Forbidden" },
    });

    const wrapper = createWrapper();
    await fillAndSubmit(wrapper);

    // The token was still validated server-side before signup() was ever
    // attempted (validate-admin-token), and is still the one sent to
    // admin-profile — never anything pulled from metadata.
    expect(global.$fetch).toHaveBeenCalledWith(
      "/api/auth/validate-admin-token",
      expect.objectContaining({ body: { token: "valid-token" } }),
    );
    expect(mockValidation.setErrors).toHaveBeenCalledWith([
      { field: "form", message: "Forbidden" },
    ]);
  });

  it("happy path: signup succeeds normally without needing recovery", async () => {
    mockAuth.signup.mockResolvedValue({
      data: { user: { id: "user-456" } },
    });

    const wrapper = createWrapper();
    await fillAndSubmit(wrapper);

    expect(mockAuth.login).not.toHaveBeenCalled();
    expect(mockAuthFetch.$fetchAuth).toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.objectContaining({
        body: expect.objectContaining({ userId: "user-456" }),
      }),
    );
    expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
  });
});
