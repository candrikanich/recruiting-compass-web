import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TermsAndSubmit from "~/components/Auth/TermsAndSubmit.vue";

// Ports forward the terms/submit/loading assertions that used to live
// directly in SignupForm.spec.ts against the monolithic form.

const baseProps = {
  agreeToTerms: false,
  loading: false,
  fieldErrors: {} as Record<string, string>,
  disabled: false,
};

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(TermsAndSubmit, {
    props: { ...baseProps, ...props },
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        FieldError: {
          template:
            '<span v-if="error" :data-testid="id + \'-error\'">{{ error }}</span>',
          props: ["id", "error"],
        },
      },
    },
  });

describe("TermsAndSubmit", () => {
  describe("Submit button disabled state", () => {
    it("enables the button when disabled prop is false", () => {
      const wrapper = createWrapper({ disabled: false });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("disabled"),
      ).toBeUndefined();
    });

    it("disables the button when disabled prop is true", () => {
      const wrapper = createWrapper({ disabled: true });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("disabled"),
      ).toBeDefined();
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

  describe("Field errors", () => {
    it("shows terms-error span when fieldErrors.terms is set", () => {
      const wrapper = createWrapper({
        fieldErrors: { terms: "You must agree to the terms" },
      });
      expect(wrapper.find('[data-testid="terms-error-error"]').exists()).toBe(
        true,
      );
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

    it("does not disable the agreeToTerms checkbox when loading is true", () => {
      const wrapper = createWrapper({ loading: true });
      // The checkbox never had a :disabled binding in the original markup —
      // only the submit button's aria-busy/text reflect loading.
      expect(
        wrapper.find("#agreeToTerms").attributes("disabled"),
      ).toBeUndefined();
    });
  });

  describe("Submit button aria attributes", () => {
    it("has aria-label 'Create Account' when not loading", () => {
      const wrapper = createWrapper({ loading: false });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("aria-label"),
      ).toBe("Create Account");
    });

    it("updates aria-label during loading", () => {
      const wrapper = createWrapper({ loading: true });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("aria-label"),
      ).toBe("Creating account, please wait");
    });

    it("sets aria-busy during loading", () => {
      const wrapper = createWrapper({ loading: true });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("aria-busy"),
      ).toBe("true");
    });
  });
});
