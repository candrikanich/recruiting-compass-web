import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import SignupForm from "~/components/Auth/SignupForm.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const loginInputStub = {
  template: `<div><label :for="id">{{ label }}</label><input :id="id" :type="type || 'text'" :aria-invalid="!!error" :aria-describedby="error ? id + '-error' : undefined" /><div v-if="error" :id="id + '-error'" role="alert">{{ error }}</div></div>`,
  props: [
    "id",
    "label",
    "type",
    "error",
    "modelValue",
    "disabled",
    "icon",
    "autocomplete",
    "placeholder",
    "required",
  ],
};

const fieldErrorStub = {
  template: `<div v-if="error" :id="id" role="alert">{{ error }}</div>`,
  props: ["id", "error"],
};

const nuxtLinkStub = {
  template: `<a><slot /></a>`,
  props: ["to"],
};

const globalStubs = {
  LoginInputField: loginInputStub,
  FieldError: fieldErrorStub,
  NuxtLink: nuxtLinkStub,
};

const baseProps = {
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
  loading: false,
  hasErrors: false,
  fieldErrors: {},
};

describe("SignupForm accessibility", () => {
  it("has no violations for player signup", async () => {
    const wrapper = mount(SignupForm, {
      props: { ...baseProps, userType: "player" },
      global: { stubs: globalStubs },
      attachTo: document.body,
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations for parent signup", async () => {
    const wrapper = mount(SignupForm, {
      props: { ...baseProps, userType: "parent" },
      global: { stubs: globalStubs },
      attachTo: document.body,
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations when showing field errors", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        userType: "player",
        hasErrors: true,
        fieldErrors: {
          firstName: "First name is required",
          email: "Invalid email address",
        },
      },
      global: { stubs: globalStubs },
      attachTo: document.body,
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });
});
