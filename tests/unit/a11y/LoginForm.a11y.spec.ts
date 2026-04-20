import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import LoginForm from "~/components/Auth/LoginForm.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("LoginForm accessibility", () => {
  it("has no violations in default state", async () => {
    const wrapper = mount(LoginForm, {
      props: {
        email: "",
        password: "",
        rememberMe: false,
        loading: false,
        validating: false,
        hasErrors: false,
        fieldErrors: {},
      },
      attachTo: document.body,
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });

  it("has no violations when showing field errors", async () => {
    const wrapper = mount(LoginForm, {
      props: {
        email: "",
        password: "",
        rememberMe: false,
        loading: false,
        validating: false,
        hasErrors: true,
        fieldErrors: {
          email: "Invalid email",
          password: "Password is required",
        },
      },
      attachTo: document.body,
    });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
    wrapper.unmount();
  });
});
