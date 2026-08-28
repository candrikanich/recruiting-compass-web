import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("ConfirmDialog", () => {
  const baseProps = {
    isOpen: true,
    title: "Are you sure?",
    message: "This action cannot be undone.",
  };

  const buttons = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll("button");

  it("renders title and message when open", () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    expect(wrapper.find("dialog").exists()).toBe(true);
    expect(wrapper.text()).toContain("Are you sure?");
    expect(wrapper.text()).toContain("This action cannot be undone.");
  });

  it("uses a native dialog element", () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    expect(wrapper.find("dialog").exists()).toBe(true);
    expect(wrapper.get("dialog").attributes("aria-modal")).toBe("true");
  });

  it("dialog is not rendered when isOpen is false", () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...baseProps, isOpen: false },
    });
    expect(wrapper.find("dialog").exists()).toBe(false);
  });

  it("emits confirm when confirm button clicked", async () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    await buttons(wrapper)[1].trigger("click");
    expect(wrapper.emitted("confirm")).toBeTruthy();
  });

  it("emits cancel when cancel button clicked", async () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    await buttons(wrapper)[0].trigger("click");
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("uses custom confirmText and cancelText", () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        ...baseProps,
        confirmText: "Yes, do it",
        cancelText: "Never mind",
      },
    });
    expect(wrapper.text()).toContain("Yes, do it");
    expect(wrapper.text()).toContain("Never mind");
  });

  it("defaults to danger variant styling", () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    const confirmBtn = buttons(wrapper)[1];
    expect(confirmBtn.classes()).toContain("bg-brand-red-600");
  });

  it("uses warning variant styling when variant is warning", () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...baseProps, variant: "warning" },
    });
    const confirmBtn = buttons(wrapper)[1];
    expect(confirmBtn.classes()).toContain("bg-brand-orange-600");
  });

  it("disables cancel and shows loading on confirm while confirming", () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...baseProps, confirming: true },
    });
    expect(buttons(wrapper)[0].attributes("disabled")).toBeDefined();
    expect(buttons(wrapper)[1].attributes("aria-busy")).toBe("true");
  });
});
