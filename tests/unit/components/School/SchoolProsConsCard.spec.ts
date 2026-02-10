import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolProsConsCard from "~/components/School/SchoolProsConsCard.vue";

vi.mock("@heroicons/vue/24/outline", () => ({
  CheckIcon: { name: "CheckIcon", template: "<svg />" },
  XMarkIcon: { name: "XMarkIcon", template: "<svg />" },
}));

const defaultProps = {
  pros: ["Great campus", "Strong program"],
  cons: ["Far from home", "Expensive"],
};

describe("SchoolProsConsCard", () => {
  describe("Pros display", () => {
    it("renders all pros", () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Great campus");
      expect(wrapper.text()).toContain("Strong program");
    });

    it("shows empty state when no pros", () => {
      const wrapper = mount(SchoolProsConsCard, {
        props: { ...defaultProps, pros: [] },
      });
      expect(wrapper.text()).toContain("No pros added yet");
    });
  });

  describe("Cons display", () => {
    it("renders all cons", () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Far from home");
      expect(wrapper.text()).toContain("Expensive");
    });

    it("shows empty state when no cons", () => {
      const wrapper = mount(SchoolProsConsCard, {
        props: { ...defaultProps, cons: [] },
      });
      expect(wrapper.text()).toContain("No cons added yet");
    });
  });

  describe("Adding items", () => {
    it("emits add-pro with input value", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      const proInput = inputs[0];

      await proInput.setValue("New pro item");
      await proInput.trigger("keyup.enter");

      expect(wrapper.emitted("add-pro")).toBeTruthy();
      expect(wrapper.emitted("add-pro")![0]).toEqual(["New pro item"]);
    });

    it("emits add-con with input value", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      const conInput = inputs[1];

      await conInput.setValue("New con item");
      await conInput.trigger("keyup.enter");

      expect(wrapper.emitted("add-con")).toBeTruthy();
      expect(wrapper.emitted("add-con")![0]).toEqual(["New con item"]);
    });

    it("clears input after adding a pro", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      const proInput = inputs[0];

      await proInput.setValue("New pro item");
      await proInput.trigger("keyup.enter");

      expect((proInput.element as HTMLInputElement).value).toBe("");
    });

    it("clears input after adding a con", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      const conInput = inputs[1];

      await conInput.setValue("New con item");
      await conInput.trigger("keyup.enter");

      expect((conInput.element as HTMLInputElement).value).toBe("");
    });

    it("does not emit add-pro when input is empty", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      const proInput = inputs[0];

      await proInput.setValue("   ");
      await proInput.trigger("keyup.enter");

      expect(wrapper.emitted("add-pro")).toBeFalsy();
    });

    it("does not emit add-con when input is empty", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      const conInput = inputs[1];

      await conInput.setValue("   ");
      await conInput.trigger("keyup.enter");

      expect(wrapper.emitted("add-con")).toBeFalsy();
    });

    it("disables pro add button when input is empty", () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const addButtons = wrapper
        .findAll("button")
        .filter((b) => b.text() === "+");
      expect(addButtons[0].attributes("disabled")).toBeDefined();
    });

    it("disables con add button when input is empty", () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const addButtons = wrapper
        .findAll("button")
        .filter((b) => b.text() === "+");
      expect(addButtons[1].attributes("disabled")).toBeDefined();
    });
  });

  describe("Removing items", () => {
    it("emits remove-pro with correct index", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      // Find remove buttons in the pros section (first column)
      // Each pro item has an XMarkIcon button
      const proItems = wrapper.findAll("[class*='bg-emerald-50']");
      const removeBtn = proItems[0].find("button");
      await removeBtn.trigger("click");

      expect(wrapper.emitted("remove-pro")).toBeTruthy();
      expect(wrapper.emitted("remove-pro")![0]).toEqual([0]);
    });

    it("emits remove-con with correct index", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const conItems = wrapper.findAll("[class*='bg-red-50']");
      const removeBtn = conItems[0].find("button");
      await removeBtn.trigger("click");

      expect(wrapper.emitted("remove-con")).toBeTruthy();
      expect(wrapper.emitted("remove-con")![0]).toEqual([0]);
    });

    it("emits remove-pro with second index", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const proItems = wrapper.findAll("[class*='bg-emerald-50']");
      const removeBtn = proItems[1].find("button");
      await removeBtn.trigger("click");

      expect(wrapper.emitted("remove-pro")![0]).toEqual([1]);
    });
  });

  describe("Add button click", () => {
    it("emits add-pro when + button is clicked", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      await inputs[0].setValue("Button pro");

      const addButtons = wrapper
        .findAll("button")
        .filter((b) => b.text() === "+");
      await addButtons[0].trigger("click");

      expect(wrapper.emitted("add-pro")).toBeTruthy();
      expect(wrapper.emitted("add-pro")![0]).toEqual(["Button pro"]);
    });

    it("emits add-con when + button is clicked", async () => {
      const wrapper = mount(SchoolProsConsCard, { props: defaultProps });
      const inputs = wrapper.findAll("input[type='text']");
      await inputs[1].setValue("Button con");

      const addButtons = wrapper
        .findAll("button")
        .filter((b) => b.text() === "+");
      await addButtons[1].trigger("click");

      expect(wrapper.emitted("add-con")).toBeTruthy();
      expect(wrapper.emitted("add-con")![0]).toEqual(["Button con"]);
    });
  });
});
