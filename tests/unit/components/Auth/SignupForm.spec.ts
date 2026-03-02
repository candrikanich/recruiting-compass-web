import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SignupForm from "~/components/Auth/SignupForm.vue";

vi.mock("@heroicons/vue/24/outline", () => ({
  UserIcon: { template: "<svg />" },
  EnvelopeIcon: { template: "<svg />" },
  LockClosedIcon: { template: "<svg />" },
  CalendarIcon: { template: "<svg />" },
}));

const baseProps = {
  userType: "player" as const,
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  dateOfBirth: "2005-06-15",
  password: "Password1",
  confirmPassword: "Password1",
  agreeToTerms: true,
  loading: false,
  hasErrors: false,
  fieldErrors: {},
};

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(SignupForm, {
    props: { ...baseProps, ...props },
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        LoginInputField: {
          template:
            '<input :data-testid="id" :value="modelValue" @blur="$emit(\'blur\')" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ["id", "modelValue", "error", "disabled", "icon", "required", "label", "type", "placeholder", "autocomplete"],
          emits: ["update:modelValue", "blur"],
        },
        FieldError: {
          template: '<span v-if="error" :data-testid="id + \'-error\'">{{ error }}</span>',
          props: ["id", "error"],
        },
      },
    },
  });

describe("SignupForm", () => {
  describe("Conditional DOB field", () => {
    it("shows dateOfBirth input when userType is player", () => {
      const wrapper = createWrapper({ userType: "player" });
      expect(wrapper.find("#dateOfBirth").exists()).toBe(true);
    });

    it("hides dateOfBirth input when userType is parent", () => {
      const wrapper = createWrapper({ userType: "parent" });
      expect(wrapper.find("#dateOfBirth").exists()).toBe(false);
    });
  });

  describe("isFormValid (submit button disabled/enabled)", () => {
    it("enables button when all fields are filled and no errors", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeUndefined();
    });

    it("disables button when firstName is empty", () => {
      const wrapper = createWrapper({ firstName: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when lastName is empty", () => {
      const wrapper = createWrapper({ lastName: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when email is empty", () => {
      const wrapper = createWrapper({ email: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when password is empty", () => {
      const wrapper = createWrapper({ password: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when confirmPassword is empty", () => {
      const wrapper = createWrapper({ confirmPassword: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when agreeToTerms is false", () => {
      const wrapper = createWrapper({ agreeToTerms: false });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when hasErrors is true", () => {
      const wrapper = createWrapper({ hasErrors: true });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("disables button when player dateOfBirth is empty", () => {
      const wrapper = createWrapper({ userType: "player", dateOfBirth: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeDefined();
    });

    it("enables button when parent dateOfBirth is empty (DOB not required for parents)", () => {
      const wrapper = createWrapper({ userType: "parent", dateOfBirth: "" });
      expect(wrapper.find('[data-testid="signup-button"]').attributes("disabled")).toBeUndefined();
    });
  });

  describe("Emit: submit", () => {
    it("emits submit when form is submitted", async () => {
      const wrapper = createWrapper();
      await wrapper.find("form").trigger("submit");
      expect(wrapper.emitted("submit")).toHaveLength(1);
    });
  });

  describe("Emit: update:firstName", () => {
    it("emits update:firstName when firstName input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="firstName"]').setValue("John");
      expect(wrapper.emitted("update:firstName")).toEqual([["John"]]);
    });
  });

  describe("Emit: update:lastName", () => {
    it("emits update:lastName when lastName input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="lastName"]').setValue("Doe");
      expect(wrapper.emitted("update:lastName")).toEqual([["Doe"]]);
    });
  });

  describe("Emit: update:email", () => {
    it("emits update:email when email input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="email"]').setValue("new@example.com");
      expect(wrapper.emitted("update:email")).toEqual([["new@example.com"]]);
    });
  });

  describe("Emit: update:dateOfBirth", () => {
    it("emits update:dateOfBirth when dateOfBirth input fires input event", async () => {
      const wrapper = createWrapper({ userType: "player" });
      const input = wrapper.find("#dateOfBirth");
      await input.trigger("input");
      expect(wrapper.emitted("update:dateOfBirth")).toBeDefined();
    });
  });

  describe("Emit: update:password", () => {
    it("emits update:password when password input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="password"]').setValue("NewPass1");
      expect(wrapper.emitted("update:password")).toEqual([["NewPass1"]]);
    });
  });

  describe("Emit: update:confirmPassword", () => {
    it("emits update:confirmPassword when confirmPassword input fires input", async () => {
      const wrapper = createWrapper();
      const input = wrapper.find("#confirmPassword");
      (input.element as HTMLInputElement).value = "NewPass1";
      await input.trigger("input");
      expect(wrapper.emitted("update:confirmPassword")).toEqual([["NewPass1"]]);
    });
  });

  describe("Emit: update:agreeToTerms", () => {
    it("emits update:agreeToTerms when checkbox changes", async () => {
      const wrapper = createWrapper({ agreeToTerms: true });
      const checkbox = wrapper.find("#agreeToTerms");
      (checkbox.element as HTMLInputElement).checked = false;
      await checkbox.trigger("change");
      expect(wrapper.emitted("update:agreeToTerms")).toEqual([[false]]);
    });
  });

  describe("Emit: validateEmail", () => {
    it("emits validateEmail when email input blurs", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="email"]').trigger("blur");
      expect(wrapper.emitted("validateEmail")).toHaveLength(1);
    });
  });

  describe("Emit: validatePassword", () => {
    it("emits validatePassword when password input blurs", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="password"]').trigger("blur");
      expect(wrapper.emitted("validatePassword")).toHaveLength(1);
    });
  });

  describe("Disabled state", () => {
    it("disables dateOfBirth input when loading is true", () => {
      const wrapper = createWrapper({ userType: "player", loading: true });
      expect(wrapper.find("#dateOfBirth").attributes("disabled")).toBeDefined();
    });

    it("does not disable agreeToTerms checkbox when loading is true (only dateOfBirth is disabled)", () => {
      const wrapper = createWrapper({ loading: true });
      // The agreeToTerms checkbox does not receive the disabled prop in the template;
      // only the raw dateOfBirth input (and LoginInputField wrappers) are gated by `disabled`.
      expect(wrapper.find("#agreeToTerms").attributes("disabled")).toBeUndefined();
    });
  });

  describe("Field errors", () => {
    it("shows dateOfBirth-error span when fieldErrors.dateOfBirth is set", () => {
      const wrapper = createWrapper({
        userType: "player",
        fieldErrors: { dateOfBirth: "Date of birth is required" },
      });
      expect(wrapper.find('[data-testid="dateOfBirth-error-error"]').exists()).toBe(true);
    });

    it("shows terms-error span when fieldErrors.terms is set", () => {
      const wrapper = createWrapper({
        fieldErrors: { terms: "You must agree to the terms" },
      });
      expect(wrapper.find('[data-testid="terms-error-error"]').exists()).toBe(true);
    });
  });

  describe("aria-invalid on dateOfBirth", () => {
    it("sets aria-invalid to true when fieldErrors.dateOfBirth is set", () => {
      const wrapper = createWrapper({
        userType: "player",
        fieldErrors: { dateOfBirth: "Required" },
      });
      expect(wrapper.find("#dateOfBirth").attributes("aria-invalid")).toBe("true");
    });

    it("sets aria-invalid to false when no dateOfBirth error", () => {
      const wrapper = createWrapper({ userType: "player", fieldErrors: {} });
      expect(wrapper.find("#dateOfBirth").attributes("aria-invalid")).toBe("false");
    });
  });

  describe("Loading indicator", () => {
    it("renders role=status div when loading is true", () => {
      const wrapper = createWrapper({ loading: true });
      expect(wrapper.find('[role="status"]').exists()).toBe(true);
    });

    it("does not render role=status div when loading is false", () => {
      const wrapper = createWrapper({ loading: false });
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
    });
  });

  describe("Form accessibility", () => {
    it("sets aria-describedby to form-error-summary when hasErrors is true", () => {
      const wrapper = createWrapper({ hasErrors: true });
      expect(wrapper.find("form").attributes("aria-describedby")).toBe("form-error-summary");
    });

    it("omits aria-describedby when hasErrors is false", () => {
      const wrapper = createWrapper({ hasErrors: false });
      expect(wrapper.find("form").attributes("aria-describedby")).toBeUndefined();
    });
  });
});
