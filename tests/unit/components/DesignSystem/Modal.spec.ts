import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Modal from "~/components/DesignSystem/Modal.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("DesignSystemModal", () => {
  const mountOpen = (props: Record<string, unknown> = {}, slots = {}) =>
    mount(Modal, {
      props: { open: true, title: "Edit school", ...props },
      slots: { default: "Body copy", ...slots },
    });

  it("does not render when closed", () => {
    const wrapper = mount(Modal, { props: { open: false, title: "Hidden" } });
    expect(wrapper.find("dialog").exists()).toBe(false);
  });

  it("exposes dialog semantics with a labelled title", () => {
    const wrapper = mountOpen();
    const dialog = wrapper.get("dialog");
    expect(dialog.attributes("role")).toBe("dialog");
    expect(dialog.attributes("aria-modal")).toBe("true");
    const labelId = dialog.attributes("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(wrapper.get(`#${labelId}`).text()).toBe("Edit school");
  });

  it("uses aria-label when title is omitted", () => {
    const wrapper = mount(Modal, {
      props: { open: true, ariaLabel: "Filters" },
      slots: { default: "Filter fields" },
    });
    expect(wrapper.get("dialog").attributes("aria-label")).toBe("Filters");
  });

  it("emits close from the header button and Escape", async () => {
    const wrapper = mountOpen();
    await wrapper.get('[aria-label="Close dialog"]').trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);

    const again = mountOpen();
    await again.get("dialog").trigger("cancel");
    expect(again.emitted("close")).toHaveLength(1);
  });

  it("does not close on Escape or backdrop while busy", async () => {
    const wrapper = mountOpen({ busy: true });
    await wrapper.get("dialog").trigger("cancel");
    await wrapper.get("dialog").trigger("click");
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("renders a footer slot on small screens as a stacked action row", () => {
    const wrapper = mountOpen(
      {},
      { footer: "<button type='button'>Save</button>" },
    );
    const footer = wrapper.get(".sm\\:flex-row");
    expect(footer.classes()).toContain("flex-col-reverse");
    expect(wrapper.text()).toContain("Save");
  });

  it("has no axe violations", async () => {
    const wrapper = mountOpen();
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
  });
});
