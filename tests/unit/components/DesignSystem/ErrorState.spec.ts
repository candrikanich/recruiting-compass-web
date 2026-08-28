import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ErrorState from "~/components/DesignSystem/ErrorState.vue";

describe("DesignSystemErrorState", () => {
  it("renders string errors inside an alert", () => {
    const wrapper = mount(ErrorState, { props: { error: "Could not load." } });
    expect(wrapper.get('[role="alert"]').text()).toContain("Could not load.");
  });

  it("falls back when the error is empty or null", () => {
    const empty = mount(ErrorState, { props: { error: "   " } });
    expect(empty.text()).toContain("An unexpected error occurred");

    const none = mount(ErrorState, { props: { error: null } });
    expect(none.text()).toContain("An unexpected error occurred");
  });

  it("uses Error.message when given an Error", () => {
    const wrapper = mount(ErrorState, {
      props: { error: new Error("Timed out") },
    });
    expect(wrapper.text()).toContain("Timed out");
  });

  it("emits retry and can hide the retry control", async () => {
    const wrapper = mount(ErrorState, { props: { error: "Nope" } });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);

    const hidden = mount(ErrorState, {
      props: { error: "Nope", retryable: false },
    });
    expect(hidden.find("button").exists()).toBe(false);
  });
});
