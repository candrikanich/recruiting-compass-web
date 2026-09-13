import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SignupForm from "~/components/Auth/SignupForm.vue";

const baseProps = {
  userType: "player" as const,
  firstName: "Owen",
  lastName: "Smith",
  email: "",
  dateOfBirth: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
  loading: false,
  hasErrors: false,
  fieldErrors: {},
  requiresGuardian: true,
  guardianEmail: "",
};

describe("SignupForm wizard steps (13-17 player)", () => {
  it("starts on the account step and does not show guardian or player-info fields", () => {
    const wrapper = mount(SignupForm, { props: baseProps });

    expect(wrapper.find("#firstName").exists()).toBe(true);
    expect(wrapper.find("#guardianEmail").exists()).toBe(false);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(false);
  });

  it("advances to the guardian step after Continue, once account-step fields are valid", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        email: "owen@example.com",
        dateOfBirth: "2012-01-01",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
      },
    });

    await wrapper.find('[data-testid="signup-step-continue"]').trigger("click");

    expect(wrapper.find("#guardianEmail").exists()).toBe(true);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(false);
  });

  it("advancing past the guardian step via Skip emits an empty guardianEmail and reaches player-info", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        email: "owen@example.com",
        dateOfBirth: "2012-01-01",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
      },
    });

    await wrapper.find('[data-testid="signup-step-continue"]').trigger("click");
    await wrapper.find('[data-testid="signup-guardian-skip"]').trigger("click");

    expect(wrapper.emitted("update:guardianEmail")?.at(-1)).toEqual([""]);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(true);
    expect(wrapper.find("#guardianEmail").exists()).toBe(false);
  });

  it("skips the guardian step entirely for an 18+ player (requiresGuardian false)", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        requiresGuardian: false,
        email: "owen@example.com",
        dateOfBirth: "1990-01-01",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
      },
    });

    await wrapper.find('[data-testid="signup-step-continue"]').trigger("click");

    expect(wrapper.find("#guardianEmail").exists()).toBe(false);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(true);
  });

  it("renders a single unstepped form for a parent (no wizard)", () => {
    const wrapper = mount(SignupForm, {
      props: { ...baseProps, userType: "parent", requiresGuardian: false },
    });

    expect(wrapper.find('[data-testid="signup-step-continue"]').exists()).toBe(false);
    expect(wrapper.find("[data-testid='signup-button']").exists()).toBe(true);
  });

  it("keeps account-step fields in document order for tab navigation", () => {
    const wrapper = mount(SignupForm, { props: baseProps });

    const allFocusable = wrapper.findAll("input, button");
    const ids = ["firstName", "lastName", "dateOfBirth", "email", "password", "confirmPassword"];
    const indices = ids.map((id) =>
      allFocusable.findIndex((el) => el.attributes("id") === id),
    );

    expect(indices.every((idx) => idx !== -1)).toBe(true);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
    // Continue is the last focusable element on this step.
    const continueIdx = allFocusable.findIndex(
      (el) => el.attributes("data-testid") === "signup-step-continue",
    );
    expect(continueIdx).toBeGreaterThan(indices[indices.length - 1]);
  });
});
