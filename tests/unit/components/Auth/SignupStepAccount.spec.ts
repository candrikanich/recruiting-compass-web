import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SignupStepAccount from "~/components/Auth/SignupStepAccount.vue";

// Ports forward the a11y/emit assertions that used to live directly in
// SignupForm.spec.ts against the monolithic form — that layout is gone, but
// this markup (and the behavior it guarantees) only moved, not disappeared.

const baseProps = {
  userType: "player" as const,
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  password: "",
  confirmPassword: "",
  loading: false,
  fieldErrors: {} as Record<string, string>,
};

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(SignupStepAccount, {
    props: { ...baseProps, ...props },
    global: {
      stubs: {
        LoginInputField: {
          template:
            '<input :data-testid="id" :value="modelValue" @blur="$emit(\'blur\')" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: [
            "id",
            "modelValue",
            "error",
            "disabled",
            "icon",
            "required",
            "label",
            "type",
            "placeholder",
            "autocomplete",
          ],
          emits: ["update:modelValue", "blur"],
        },
        FieldError: {
          template:
            '<span v-if="error" :data-testid="id + \'-error\'">{{ error }}</span>',
          props: ["id", "error"],
        },
      },
    },
  });

describe("SignupStepAccount", () => {
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

  describe("Emits", () => {
    it("emits update:firstName when firstName input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="firstName"]').setValue("John");
      expect(wrapper.emitted("update:firstName")).toEqual([["John"]]);
    });

    it("emits update:lastName when lastName input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="lastName"]').setValue("Doe");
      expect(wrapper.emitted("update:lastName")).toEqual([["Doe"]]);
    });

    it("emits update:email when email input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="email"]').setValue("new@example.com");
      expect(wrapper.emitted("update:email")).toEqual([["new@example.com"]]);
    });

    it("emits validateEmail when email input blurs", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="email"]').trigger("blur");
      expect(wrapper.emitted("validateEmail")).toHaveLength(1);
    });

    it("emits update:dateOfBirth when dateOfBirth input fires input event", async () => {
      const wrapper = createWrapper({ userType: "player" });
      const input = wrapper.find("#dateOfBirth");
      await input.trigger("input");
      expect(wrapper.emitted("update:dateOfBirth")).toBeDefined();
    });

    // Safari/WebKit's native date-picker UI fires only `change`, not
    // `input`, on <input type="date"> — issue #696.
    it("emits update:dateOfBirth when dateOfBirth input fires change without input (Safari picker, #696)", async () => {
      const wrapper = createWrapper({ userType: "player" });
      const input = wrapper.find("#dateOfBirth");
      (input.element as HTMLInputElement).value = "2005-06-15";
      await input.trigger("change");
      expect(wrapper.emitted("update:dateOfBirth")).toEqual([["2005-06-15"]]);
    });

    it("emits update:password when password input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="password"]').setValue("NewPass1");
      expect(wrapper.emitted("update:password")).toEqual([["NewPass1"]]);
    });

    it("emits validatePassword when password input blurs", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="password"]').trigger("blur");
      expect(wrapper.emitted("validatePassword")).toHaveLength(1);
    });

    it("emits update:confirmPassword when confirmPassword input fires input", async () => {
      const wrapper = createWrapper();
      const input = wrapper.find("#confirmPassword");
      (input.element as HTMLInputElement).value = "NewPass1";
      await input.trigger("input");
      expect(wrapper.emitted("update:confirmPassword")).toEqual([["NewPass1"]]);
    });
  });

  describe("Disabled state", () => {
    it("disables dateOfBirth input when loading is true", () => {
      const wrapper = createWrapper({ userType: "player", loading: true });
      expect(wrapper.find("#dateOfBirth").attributes("disabled")).toBeDefined();
    });
  });

  describe("Field errors", () => {
    it("shows dateOfBirth-error span when fieldErrors.dateOfBirth is set", () => {
      const wrapper = createWrapper({
        userType: "player",
        fieldErrors: { dateOfBirth: "Date of birth is required" },
      });
      expect(
        wrapper.find('[data-testid="dateOfBirth-error-error"]').exists(),
      ).toBe(true);
    });
  });

  describe("aria-invalid on dateOfBirth", () => {
    it("sets aria-invalid to true when fieldErrors.dateOfBirth is set", () => {
      const wrapper = createWrapper({
        userType: "player",
        fieldErrors: { dateOfBirth: "Required" },
      });
      expect(wrapper.find("#dateOfBirth").attributes("aria-invalid")).toBe(
        "true",
      );
    });

    it("sets aria-invalid to false when no dateOfBirth error", () => {
      const wrapper = createWrapper({ userType: "player", fieldErrors: {} });
      expect(wrapper.find("#dateOfBirth").attributes("aria-invalid")).toBe(
        "false",
      );
    });
  });
});
