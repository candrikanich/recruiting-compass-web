import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("DeleteConfirmationModal accessibility", () => {
  let wrapper: ReturnType<typeof mount>;

  afterEach(() => {
    wrapper?.unmount();
  });

  it("has no violations when open", async () => {
    wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemType: "school",
        itemName: "Stanford University",
        isLoading: false,
      },
      attachTo: document.body,
    });
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
  });

  it("has no violations in loading state", async () => {
    wrapper = mount(DeleteConfirmationModal, {
      props: {
        isOpen: true,
        itemType: "coach",
        itemName: "Jane Smith",
        isLoading: true,
      },
      attachTo: document.body,
    });
    expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
  });
});
