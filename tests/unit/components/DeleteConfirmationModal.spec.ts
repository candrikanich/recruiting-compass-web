import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";

describe("DeleteConfirmationModal", () => {
  let hostElement: HTMLElement;

  beforeEach(() => {
    hostElement = document.createElement("div");
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    document.body.removeChild(hostElement);
  });

  it("should render with item name in title", () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
      },
      attachTo: hostElement,
    });
    expect(document.body.textContent).toContain("Delete coach?");
    expect(document.body.textContent).toContain("John Smith");
    wrapper.unmount();
  });

  it("should emit cancel event when cancel clicked", async () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
      },
      attachTo: hostElement,
    });
    const cancelBtn = document.querySelectorAll("button")[0];
    await cancelBtn.click();
    expect(wrapper.emitted("cancel")).toBeTruthy();
    wrapper.unmount();
  });

  it("should emit confirm event when delete clicked", async () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
      },
      attachTo: hostElement,
    });
    const deleteBtn = document.querySelectorAll("button")[1];
    await deleteBtn.click();
    expect(wrapper.emitted("confirm")).toBeTruthy();
    wrapper.unmount();
  });

  it("should show loading state when isLoading is true", () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
        isLoading: true,
      },
      attachTo: hostElement,
    });
    const deleteBtn = document.querySelectorAll("button")[1];
    expect(deleteBtn.getAttribute("disabled")).toBeDefined();
    wrapper.unmount();
  });

  it("should not render when isOpen is false", () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: false,
        itemName: "John Smith",
        itemType: "coach",
      },
    });
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false);
  });
});
