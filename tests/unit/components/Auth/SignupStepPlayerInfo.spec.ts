import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SignupStepPlayerInfo from "~/components/Auth/SignupStepPlayerInfo.vue";

// Ports forward the "about the player" a11y/emit assertions that used to
// live directly in SignupForm.spec.ts against the monolithic form.

const baseProps = {
  graduationYear: 2027,
  primarySport: "Basketball",
  gender: undefined as string | undefined,
  zipCode: "",
  agreeToTerms: true,
  loading: false,
  fieldErrors: {} as Record<string, string>,
};

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(SignupStepPlayerInfo, {
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

describe("SignupStepPlayerInfo", () => {
  describe("Fields render", () => {
    it("shows graduation year, sport, and zip fields", () => {
      const wrapper = createWrapper();
      expect(wrapper.find("#signup-graduation-year").exists()).toBe(true);
      expect(wrapper.find("#signup-primary-sport").exists()).toBe(true);
      expect(wrapper.find("#signup-zip-code").exists()).toBe(true);
    });
  });

  describe("Gender auto-derive", () => {
    it("shows gender field when sport doesn't auto-derive it", () => {
      const wrapper = createWrapper({ primarySport: "Basketball" });
      expect(wrapper.find("#signup-gender").exists()).toBe(true);
    });

    it("hides gender field when sport auto-derives it (e.g. Baseball)", () => {
      const wrapper = createWrapper({ primarySport: "Baseball" });
      expect(wrapper.find("#signup-gender").exists()).toBe(false);
    });
  });

  describe("Submit readiness (via TermsAndSubmit's disabled prop)", () => {
    it("disables submit when missing graduation year", () => {
      const wrapper = createWrapper({ graduationYear: undefined });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("disabled"),
      ).toBeDefined();
    });

    it("disables submit when missing primary sport", () => {
      const wrapper = createWrapper({ primarySport: "" });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("disabled"),
      ).toBeDefined();
    });

    it("disables submit when terms not agreed", () => {
      const wrapper = createWrapper({ agreeToTerms: false });
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("disabled"),
      ).toBeDefined();
    });

    it("enables submit when grad year, sport, and terms are all set", () => {
      const wrapper = createWrapper();
      expect(
        wrapper.find('[data-testid="signup-button"]').attributes("disabled"),
      ).toBeUndefined();
    });
  });

  describe("Emits", () => {
    it("emits update:primarySport when sport select changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find("#signup-primary-sport").setValue("Soccer");
      expect(wrapper.emitted("update:primarySport")).toEqual([["Soccer"]]);
    });

    it("emits update:graduationYear when year select changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find("#signup-graduation-year").setValue("2028");
      expect(wrapper.emitted("update:graduationYear")).toEqual([[2028]]);
    });

    it("emits update:zipCode when zip input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find("#signup-zip-code").setValue("90210");
      expect(wrapper.emitted("update:zipCode")).toEqual([["90210"]]);
    });

    it("emits submit when the form submits", async () => {
      const wrapper = createWrapper();
      await wrapper.find("form").trigger("submit");
      expect(wrapper.emitted("submit")).toHaveLength(1);
    });
  });
});
