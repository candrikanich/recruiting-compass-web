import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("ConfirmDialog", () => {
  const baseProps = {
    isOpen: true,
    title: "Are you sure?",
    message: "This action cannot be undone.",
  };

  it("renders title and message when open", () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    expect(wrapper.find("dialog").exists()).toBe(true);
    expect(wrapper.text()).toContain("Are you sure?");
    expect(wrapper.text()).toContain("This action cannot be undone.");
  });

  it("uses a native dialog element", () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    expect(wrapper.find("dialog").exists()).toBe(true);
  });

  it("dialog is not rendered when isOpen is false", () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...baseProps, isOpen: false },
    });
    expect(wrapper.find("dialog").exists()).toBe(false);
  });

  it("emits confirm when confirm button clicked", async () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    await wrapper.findAll("button")[1].trigger("click");
    expect(wrapper.emitted("confirm")).toBeTruthy();
  });

  it("emits cancel when cancel button clicked", async () => {
    const wrapper = mount(ConfirmDialog, { props: baseProps });
    await wrapper.findAll("button")[0].trigger("click");
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
    const confirmBtn = wrapper.findAll("button")[1];
    expect(confirmBtn.classes()).toContain("bg-red-600");
  });

  it("uses warning variant styling when variant is warning", () => {
    const wrapper = mount(ConfirmDialog, {
      props: { ...baseProps, variant: "warning" },
    });
    const confirmBtn = wrapper.findAll("button")[1];
    expect(confirmBtn.classes()).toContain("bg-amber-600");
  });
});
