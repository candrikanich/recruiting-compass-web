import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionActions from "~/components/Interaction/InteractionActions.vue";

describe("InteractionActions", () => {
  describe("Event Emissions", () => {
    it("emits 'export' event when Export button is clicked", async () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      await exportButton.trigger("click");

      expect(wrapper.emitted("export")).toBeTruthy();
      expect(wrapper.emitted("export")?.length).toBe(1);
    });

    it("emits 'delete' event when Delete button is clicked", async () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      await deleteButton.trigger("click");

      expect(wrapper.emitted("delete")).toBeTruthy();
      expect(wrapper.emitted("delete")?.length).toBe(1);
    });

    it("does not emit any events on mount", () => {
      const wrapper = mount(InteractionActions);

      expect(wrapper.emitted("export")).toBeFalsy();
      expect(wrapper.emitted("delete")).toBeFalsy();
    });

    it("emits multiple export events on multiple clicks", async () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      await exportButton.trigger("click");
      await exportButton.trigger("click");
      await exportButton.trigger("click");

      expect(wrapper.emitted("export")?.length).toBe(3);
    });

    it("emits multiple delete events on multiple clicks", async () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      await deleteButton.trigger("click");
      await deleteButton.trigger("click");

      expect(wrapper.emitted("delete")?.length).toBe(2);
    });
  });

  describe("Button Rendering", () => {
    it("renders both Export and Delete buttons", () => {
      const wrapper = mount(InteractionActions);

      const buttons = wrapper.findAll("button");
      expect(buttons.length).toBe(2);
    });

    it("renders Export button with correct text", () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      expect(exportButton.text()).toContain("Export");
    });

    it("renders Delete button with correct text", () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      expect(deleteButton.text()).toContain("Delete");
    });

    it("renders Export button with emoji icon", () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      expect(exportButton.text()).toContain("📤");
    });

    it("renders Delete button with emoji icon", () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      expect(deleteButton.text()).toContain("🗑️");
    });
  });

  describe("Button Styling", () => {
    it("applies correct base classes to Export button", () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      expect(exportButton.classes()).toContain("px-4");
      expect(exportButton.classes()).toContain("py-2");
      expect(exportButton.classes()).toContain("rounded");
      expect(exportButton.classes()).toContain("transition");
    });

    it("applies blue color classes to Export button", () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      expect(exportButton.classes()).toContain("bg-blue-500");
      expect(exportButton.classes()).toContain("text-white");
      expect(exportButton.classes()).toContain("hover:bg-blue-600");
    });

    it("applies correct base classes to Delete button", () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      expect(deleteButton.classes()).toContain("px-4");
      expect(deleteButton.classes()).toContain("py-2");
      expect(deleteButton.classes()).toContain("rounded");
      expect(deleteButton.classes()).toContain("transition");
    });

    it("applies red color classes to Delete button", () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      expect(deleteButton.classes()).toContain("bg-red-500");
      expect(deleteButton.classes()).toContain("text-white");
      expect(deleteButton.classes()).toContain("hover:bg-red-600");
    });
  });

  describe("Container Layout", () => {
    it("renders buttons in a flex container", () => {
      const wrapper = mount(InteractionActions);

      const container = wrapper.find("div");
      expect(container.classes()).toContain("flex");
      expect(container.classes()).toContain("gap-2");
    });

    it("renders buttons in correct order: Export first, Delete second", () => {
      const wrapper = mount(InteractionActions);

      const buttons = wrapper.findAll("button");
      expect(buttons[0].text()).toContain("Export");
      expect(buttons[1].text()).toContain("Delete");
    });
  });

  describe("Accessibility", () => {
    it("Export button has type attribute", () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      // Button should have type="button" to prevent form submission
      expect(exportButton.element.type).toBe("button");
    });

    it("Delete button has type attribute", () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      expect(deleteButton.element.type).toBe("button");
    });

    it("Export button is keyboard accessible", async () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      // Simulate keyboard press (Enter/Space)
      await exportButton.trigger("keydown.enter");

      // Button should still be clickable via keyboard
      expect(exportButton.element.disabled).toBe(false);
    });

    it("Delete button is keyboard accessible", async () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      await deleteButton.trigger("keydown.enter");

      expect(deleteButton.element.disabled).toBe(false);
    });

    it("buttons have sufficient padding for touch targets", () => {
      const wrapper = mount(InteractionActions);

      const buttons = wrapper.findAll("button");
      buttons.forEach((button) => {
        // px-4 py-2 provides at least 32px height + 48px width (with text)
        expect(button.classes()).toContain("px-4");
        expect(button.classes()).toContain("py-2");
      });
    });

    it("Export button text is clear and descriptive", () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      const text = exportButton.text();
      expect(text).toContain("Export");
      // Verify it's not just an icon without text
      expect(text.length).toBeGreaterThan(5);
    });

    it("Delete button text is clear and descriptive", () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];
      const text = deleteButton.text();
      expect(text).toContain("Delete");
      expect(text.length).toBeGreaterThan(5);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid consecutive clicks on Export button", async () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];

      // Rapid clicks
      await exportButton.trigger("click");
      await exportButton.trigger("click");
      await exportButton.trigger("click");
      await exportButton.trigger("click");
      await exportButton.trigger("click");

      expect(wrapper.emitted("export")?.length).toBe(5);
    });

    it("handles rapid consecutive clicks on Delete button", async () => {
      const wrapper = mount(InteractionActions);

      const deleteButton = wrapper.findAll("button")[1];

      await deleteButton.trigger("click");
      await deleteButton.trigger("click");
      await deleteButton.trigger("click");

      expect(wrapper.emitted("delete")?.length).toBe(3);
    });

    it("handles alternating button clicks", async () => {
      const wrapper = mount(InteractionActions);

      const exportButton = wrapper.findAll("button")[0];
      const deleteButton = wrapper.findAll("button")[1];

      await exportButton.trigger("click");
      await deleteButton.trigger("click");
      await exportButton.trigger("click");
      await deleteButton.trigger("click");

      expect(wrapper.emitted("export")?.length).toBe(2);
      expect(wrapper.emitted("delete")?.length).toBe(2);
    });

    it("maintains state after multiple interactions", async () => {
      const wrapper = mount(InteractionActions);

      const buttons = wrapper.findAll("button");

      // Click Export
      await buttons[0].trigger("click");

      // Verify Delete button is still rendered and functional
      expect(buttons[1].exists()).toBe(true);
      await buttons[1].trigger("click");

      expect(wrapper.emitted("export")?.length).toBe(1);
      expect(wrapper.emitted("delete")?.length).toBe(1);
    });
  });
});
