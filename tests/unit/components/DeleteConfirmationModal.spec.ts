import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";

describe("DeleteConfirmationModal", () => {
  it("should render with item name in title", () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
      },
    });
    expect(wrapper.text()).toContain("Delete coach?");
    expect(wrapper.text()).toContain("John Smith");
  });

  it("should emit cancel event when cancel clicked", async () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
      },
    });
    const cancelBtn = wrapper.findAll("button")[0];
    await cancelBtn.trigger("click");
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("should emit confirm event when delete clicked", async () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
      },
    });
    const deleteBtn = wrapper.findAll("button")[1];
    await deleteBtn.trigger("click");
    expect(wrapper.emitted("confirm")).toBeTruthy();
  });

  it("should show loading state when isLoading is true", () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemName: "John Smith",
        itemType: "coach",
        isLoading: true,
      },
    });
    const deleteBtn = wrapper.findAll("button")[1];
    expect(deleteBtn.attributes("disabled")).toBeDefined();
  });

  it("should not render when isOpen is false", () => {
    const wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: false,
        itemName: "John Smith",
        itemType: "coach",
      },
    });
    expect(wrapper.find("dialog").exists()).toBe(false);
  });
});
