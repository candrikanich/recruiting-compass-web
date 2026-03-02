import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import InviteSignupForm from "~/components/Auth/InviteSignupForm.vue";

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(InviteSignupForm, {
    props: {
      email: "player@example.com",
      loading: false,
      ...props,
    },
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        DesignSystemButton: {
          template: "<button :type=\"type || 'button'\" :disabled=\"loading\"><slot /></button>",
          props: ["loading", "type", "fullWidth"],
        },
        DesignSystemInput: {
          template:
            '<input :data-testid="id" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ["modelValue", "label", "type", "disabled", "id", "placeholder", "hint"],
          emits: ["update:modelValue"],
        },
      },
    },
  });

describe("InviteSignupForm", () => {
  it("renders a locked email field with the invited email", () => {
    const wrapper = createWrapper({ email: "test@example.com" });
    const emailInput = wrapper.find('[data-testid="invite-email"]');
    expect(emailInput.exists()).toBe(true);
    expect(emailInput.attributes("disabled")).toBeDefined();
    expect((emailInput.element as HTMLInputElement).value).toBe("test@example.com");
  });

  it("pre-fills firstName and lastName inputs from prefill prop", async () => {
    const wrapper = createWrapper({
      prefill: { firstName: "Alex", lastName: "Johnson" },
    });
    await flushPromises();
    const firstInput = wrapper.find('[data-testid="firstName"]');
    const lastInput = wrapper.find('[data-testid="lastName"]');
    expect((firstInput.element as HTMLInputElement).value).toBe("Alex");
    expect((lastInput.element as HTMLInputElement).value).toBe("Johnson");
  });

  it("emits submit when form is submitted", async () => {
    const wrapper = createWrapper();
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("submit")).toHaveLength(1);
  });

  it("shows loading text on submit button when loading is true", () => {
    const wrapper = createWrapper({ loading: true });
    expect(wrapper.text()).toContain("Creating account");
  });

  it("emits update:firstName when first name input changes", async () => {
    const wrapper = createWrapper();
    await wrapper.find('[data-testid="firstName"]').setValue("Sam");
    expect(wrapper.emitted("update:firstName")).toEqual([["Sam"]]);
  });

  describe("role-conditional DOB field", () => {
    it("renders the date of birth input when role is player", () => {
      const wrapper = createWrapper({ role: "player" });
      expect(wrapper.find('[data-testid="invite-dob"]').exists()).toBe(true);
    });

    it("does not render the date of birth input when role is not set", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="invite-dob"]').exists()).toBe(false);
    });
  });

  describe("missing emit coverage", () => {
    it("emits update:lastName when the lastName input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="lastName"]').setValue("Rivera");
      expect(wrapper.emitted("update:lastName")).toEqual([["Rivera"]]);
    });

    it("emits update:password when the password input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="password"]').setValue("Secret1!");
      expect(wrapper.emitted("update:password")).toEqual([["Secret1!"]]);
    });

    it("emits update:confirmPassword when the confirmPassword input changes", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="confirmPassword"]').setValue("Secret1!");
      expect(wrapper.emitted("update:confirmPassword")).toEqual([["Secret1!"]]);
    });

    it("emits update:agreeToTerms with true when the terms checkbox is checked", async () => {
      const wrapper = createWrapper();
      const checkbox = wrapper.find("#invite-terms");
      (checkbox.element as HTMLInputElement).checked = true;
      await checkbox.trigger("change");
      expect(wrapper.emitted("update:agreeToTerms")).toEqual([[true]]);
    });

    it("emits update:dateOfBirth when the DOB input fires (role=player)", async () => {
      const wrapper = createWrapper({ role: "player" });
      const dob = wrapper.find('[data-testid="invite-dob"]');
      (dob.element as HTMLInputElement).value = "2010-06-15";
      await dob.trigger("input");
      expect(wrapper.emitted("update:dateOfBirth")).toEqual([["2010-06-15"]]);
    });
  });

  describe("disabled state when loading", () => {
    it("disables the DOB input when loading is true (role=player)", () => {
      const wrapper = createWrapper({ role: "player", loading: true });
      const dob = wrapper.find('[data-testid="invite-dob"]');
      expect(dob.attributes("disabled")).toBeDefined();
    });

    it("disables the terms checkbox when loading is true", () => {
      const wrapper = createWrapper({ loading: true });
      const checkbox = wrapper.find("#invite-terms");
      expect(checkbox.attributes("disabled")).toBeDefined();
    });
  });
});
