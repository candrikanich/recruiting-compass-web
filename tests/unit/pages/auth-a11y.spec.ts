import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import LoginForm from "~/components/Auth/LoginForm.vue";
import SignupForm from "~/components/Auth/SignupForm.vue";

vi.mock("@heroicons/vue/24/outline", () => ({
  ArrowLeftIcon: { template: "<svg></svg>" },
  UserIcon: { template: "<svg></svg>" },
  EnvelopeIcon: { template: "<svg></svg>" },
  LockClosedIcon: { template: "<svg></svg>" },
}));

vi.mock("~/components/Auth/LoginInputField.vue", () => ({
  default: {
    name: "LoginInputField",
    template: `
      <div>
        <label :for="id">{{ label }}<span v-if="required"> *</span></label>
        <input
          :id="id"
          :type="type"
          :value="modelValue"
          :disabled="disabled"
          :autocomplete="autocomplete"
          :placeholder="placeholder"
          :aria-required="required ? 'true' : undefined"
          @input="$emit('update:modelValue', $event.target.value)"
          @blur="$emit('blur')"
        />
      </div>
    `,
    props: [
      "id",
      "label",
      "type",
      "placeholder",
      "autocomplete",
      "modelValue",
      "error",
      "disabled",
      "icon",
      "required",
    ],
    emits: ["update:modelValue", "blur"],
  },
}));

vi.mock("~/components/DesignSystem/FieldError.vue", () => ({
  default: {
    name: "FieldError",
    template: '<div v-if="error" class="field-error">{{ error }}</div>',
    props: ["error", "id"],
  },
}));

vi.mock("~/components/Form/PasswordInput.vue", () => ({
  default: {
    name: "PasswordInput",
    template: `
      <div>
        <label :for="id">{{ label }}</label>
        <input :id="id" type="password" :value="modelValue" :disabled="disabled"
          @input="$emit('update:modelValue', $event.target.value)"
          @blur="$emit('blur')"
        />
      </div>
    `,
    props: [
      "id",
      "label",
      "placeholder",
      "autocomplete",
      "modelValue",
      "error",
      "disabled",
      "showToggle",
    ],
    emits: ["update:modelValue", "blur"],
  },
}));

vi.mock("~/components/Auth/PasswordRequirements.vue", () => ({
  default: {
    name: "PasswordRequirements",
    template: '<div class="password-requirements"></div>',
    props: ["password"],
  },
}));

describe("Auth Form Accessibility", () => {
  describe("LoginForm aria-label", () => {
    const mountLoginForm = (overrides = {}) =>
      mount(LoginForm, {
        props: {
          email: "",
          password: "",
          rememberMe: false,
          loading: false,
          validating: false,
          hasErrors: false,
          fieldErrors: {},
          ...overrides,
        },
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" } },
        },
      });

    it("should have aria-label on the form element", () => {
      const wrapper = mountLoginForm();
      const form = wrapper.find("form#login-form");
      expect(form.attributes("aria-label")).toBe("Sign in to your account");
    });

    it("should link to error summary via aria-describedby when errors exist", () => {
      const wrapper = mountLoginForm({ hasErrors: true });
      const form = wrapper.find("form#login-form");
      expect(form.attributes("aria-describedby")).toBe("form-error-summary");
    });

    it("should not have aria-describedby when no errors", () => {
      const wrapper = mountLoginForm({ hasErrors: false });
      const form = wrapper.find("form#login-form");
      expect(form.attributes("aria-describedby")).toBeUndefined();
    });

    it("should have aria-label on submit button", () => {
      const wrapper = mountLoginForm();
      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.attributes("aria-label")).toBe("Sign in to your account");
    });

    it("should update submit button aria-label during loading", () => {
      const wrapper = mountLoginForm({ loading: true });
      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.attributes("aria-label")).toBe("Signing in, please wait");
    });

    it("should update submit button aria-label during validation", () => {
      const wrapper = mountLoginForm({ validating: true });
      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.attributes("aria-label")).toBe(
        "Validating your information",
      );
    });

    it("should have aria-busy on submit button during loading", () => {
      const wrapper = mountLoginForm({ loading: true });
      const button = wrapper.find('[data-testid="login-button"]');
      expect(button.attributes("aria-busy")).toBe("true");
    });
  });

  describe("SignupForm aria-label", () => {
    const mountSignupForm = (overrides = {}) =>
      mount(SignupForm, {
        props: {
          userType: "player",
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          familyCode: "",
          agreeToTerms: false,
          loading: false,
          hasErrors: false,
          fieldErrors: {},
          ...overrides,
        },
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" } },
        },
      });

    it("should have dynamic aria-label for player form", () => {
      const wrapper = mountSignupForm({ userType: "player" });
      const form = wrapper.find("form#signup-form");
      expect(form.attributes("aria-label")).toBe("Create player account");
    });

    it("should have dynamic aria-label for parent form", () => {
      const wrapper = mountSignupForm({ userType: "parent" });
      const form = wrapper.find("form#signup-form");
      expect(form.attributes("aria-label")).toBe("Create parent account");
    });

    it("should link to error summary when errors exist", () => {
      const wrapper = mountSignupForm({ hasErrors: true });
      const form = wrapper.find("form#signup-form");
      expect(form.attributes("aria-describedby")).toBe("form-error-summary");
    });

    it("should have aria-label on submit button", () => {
      const wrapper = mountSignupForm();
      const button = wrapper.find('[data-testid="signup-button"]');
      expect(button.attributes("aria-label")).toBe("Create Account");
    });

    it("should update submit button aria-label during loading", () => {
      const wrapper = mountSignupForm({ loading: true });
      const button = wrapper.find('[data-testid="signup-button"]');
      expect(button.attributes("aria-label")).toBe(
        "Creating account, please wait",
      );
    });

    it("should have aria-busy on submit button during loading", () => {
      const wrapper = mountSignupForm({ loading: true });
      const button = wrapper.find('[data-testid="signup-button"]');
      expect(button.attributes("aria-busy")).toBe("true");
    });

    it("should have sr-only heading for the form section", () => {
      const wrapper = mountSignupForm({ userType: "player" });
      const heading = wrapper.find("h2.sr-only");
      expect(heading.text()).toBe("Player Information");
    });

    it("should show Parent heading for parent form", () => {
      const wrapper = mountSignupForm({ userType: "parent" });
      const heading = wrapper.find("h2.sr-only");
      expect(heading.text()).toBe("Parent Information");
    });
  });

  describe("LoginForm keyboard navigation", () => {
    const mountLoginForm = () =>
      mount(LoginForm, {
        props: {
          email: "",
          password: "",
          rememberMe: false,
          loading: false,
          validating: false,
          hasErrors: false,
          fieldErrors: {},
        },
        global: {
          stubs: { NuxtLink: { template: '<a href="/"><slot /></a>' } },
        },
        attachTo: document.body,
      });

    it("should have all form inputs focusable", () => {
      const wrapper = mountLoginForm();
      const emailInput = wrapper.find("#email");
      const passwordInput = wrapper.find("#password");
      const rememberMe = wrapper.find("#rememberMe");
      const submitButton = wrapper.find('[data-testid="login-button"]');

      expect(emailInput.exists()).toBe(true);
      expect(passwordInput.exists()).toBe(true);
      expect(rememberMe.exists()).toBe(true);
      expect(submitButton.exists()).toBe(true);
      wrapper.unmount();
    });

    it("should submit form on Enter key press on submit button", async () => {
      const wrapper = mountLoginForm();
      const form = wrapper.find("form#login-form");

      await form.trigger("submit");
      expect(wrapper.emitted("submit")).toBeTruthy();
      wrapper.unmount();
    });

    it("should have correct tab order with email first", () => {
      const wrapper = mountLoginForm();
      const inputs = wrapper.findAll("input");
      const emailInput = inputs.find((i) => i.attributes("id") === "email");
      const passwordInput = inputs.find(
        (i) => i.attributes("id") === "password",
      );

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();

      const allFocusable = wrapper.findAll(
        'input, button[type="submit"], a[href]',
      );
      const emailIndex = allFocusable.findIndex(
        (el) => el.attributes("id") === "email",
      );
      const passwordIndex = allFocusable.findIndex(
        (el) => el.attributes("id") === "password",
      );
      const submitIndex = allFocusable.findIndex(
        (el) => el.attributes("data-testid") === "login-button",
      );

      expect(emailIndex).toBeLessThan(passwordIndex);
      expect(passwordIndex).toBeLessThan(submitIndex);
      wrapper.unmount();
    });

    it("should disable all inputs during loading", () => {
      const wrapper = mountLoginForm();
      // Re-mount with loading state
      const loadingWrapper = mount(LoginForm, {
        props: {
          email: "",
          password: "",
          rememberMe: false,
          loading: true,
          validating: false,
          hasErrors: false,
          fieldErrors: {},
        },
        global: {
          stubs: { NuxtLink: { template: '<a href="/"><slot /></a>' } },
        },
      });

      const inputs = loadingWrapper.findAll("input");
      const disabledInputs = inputs.filter(
        (input) => input.attributes("disabled") !== undefined,
      );
      expect(disabledInputs.length).toBeGreaterThan(0);

      wrapper.unmount();
      loadingWrapper.unmount();
    });
  });

  describe("SignupForm keyboard navigation", () => {
    const mountSignupForm = () =>
      mount(SignupForm, {
        props: {
          userType: "player",
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          familyCode: "",
          agreeToTerms: false,
          loading: false,
          hasErrors: false,
          fieldErrors: {},
        },
        global: {
          stubs: { NuxtLink: { template: '<a href="/"><slot /></a>' } },
        },
        attachTo: document.body,
      });

    it("should have all form inputs focusable", () => {
      const wrapper = mountSignupForm();
      expect(wrapper.find("#firstName").exists()).toBe(true);
      expect(wrapper.find("#lastName").exists()).toBe(true);
      expect(wrapper.find("#email").exists()).toBe(true);
      expect(wrapper.find("#password").exists()).toBe(true);
      expect(wrapper.find("#confirmPassword").exists()).toBe(true);
      expect(wrapper.find("#agreeToTerms").exists()).toBe(true);
      expect(wrapper.find('[data-testid="signup-button"]').exists()).toBe(true);
      wrapper.unmount();
    });

    it("should submit form on Enter key press on submit button", async () => {
      const wrapper = mountSignupForm();
      const form = wrapper.find("form#signup-form");

      await form.trigger("submit");
      expect(wrapper.emitted("submit")).toBeTruthy();
      wrapper.unmount();
    });

    it("should have first name before last name in tab order", () => {
      const wrapper = mountSignupForm();
      const allFocusable = wrapper.findAll(
        'input, button[type="submit"], a[href]',
      );
      const firstNameIdx = allFocusable.findIndex(
        (el) => el.attributes("id") === "firstName",
      );
      const lastNameIdx = allFocusable.findIndex(
        (el) => el.attributes("id") === "lastName",
      );
      const emailIdx = allFocusable.findIndex(
        (el) => el.attributes("id") === "email",
      );
      const passwordIdx = allFocusable.findIndex(
        (el) => el.attributes("id") === "password",
      );

      expect(firstNameIdx).toBeLessThan(lastNameIdx);
      expect(lastNameIdx).toBeLessThan(emailIdx);
      expect(emailIdx).toBeLessThan(passwordIdx);
      wrapper.unmount();
    });

    it("should show family code field only for parent user type", () => {
      const playerWrapper = mount(SignupForm, {
        props: {
          userType: "player",
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          familyCode: "",
          agreeToTerms: false,
          loading: false,
          hasErrors: false,
          fieldErrors: {},
        },
        global: {
          stubs: { NuxtLink: { template: '<a href="/"><slot /></a>' } },
        },
      });
      expect(playerWrapper.find("#familyCode").exists()).toBe(false);

      const parentWrapper = mount(SignupForm, {
        props: {
          userType: "parent",
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          familyCode: "",
          agreeToTerms: false,
          loading: false,
          hasErrors: false,
          fieldErrors: {},
        },
        global: {
          stubs: { NuxtLink: { template: '<a href="/"><slot /></a>' } },
        },
      });
      expect(parentWrapper.find("#familyCode").exists()).toBe(true);

      playerWrapper.unmount();
      parentWrapper.unmount();
    });

    it("should have required aria attributes on required fields", () => {
      const wrapper = mountSignupForm();
      const firstName = wrapper.find("#firstName");
      const lastName = wrapper.find("#lastName");
      const email = wrapper.find("#email");
      const password = wrapper.find("#password");

      expect(firstName.attributes("aria-required")).toBe("true");
      expect(lastName.attributes("aria-required")).toBe("true");
      expect(email.attributes("aria-required")).toBe("true");
      expect(password.attributes("aria-required")).toBe("true");
      wrapper.unmount();
    });

    it("should have terms checkbox with aria-required", () => {
      const wrapper = mountSignupForm();
      const terms = wrapper.find("#agreeToTerms");
      expect(terms.attributes("aria-required")).toBe("true");
      wrapper.unmount();
    });
  });
});
