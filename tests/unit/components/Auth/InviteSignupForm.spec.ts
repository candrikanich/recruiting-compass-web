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
});
