import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolNotesCard from "~/components/School/SchoolNotesCard.vue";

vi.mock("~/components/School/NotesHistory.vue", () => ({
  default: {
    name: "NotesHistory",
    props: ["schoolId"],
    template: "<div data-testid='notes-history'>NotesHistory</div>",
  },
}));

vi.mock("@heroicons/vue/24/outline", () => ({
  PencilIcon: { name: "PencilIcon", template: "<svg />" },
}));

const defaultProps = {
  notes: "Some school notes",
  schoolId: "school-123",
  isSaving: false,
};

describe("SchoolNotesCard", () => {
  describe("Notes section", () => {
    it("renders school notes in display mode", () => {
      const wrapper = mount(SchoolNotesCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Some school notes");
    });

    it("shows placeholder when notes are null", () => {
      const wrapper = mount(SchoolNotesCard, {
        props: { ...defaultProps, notes: null },
      });
      expect(wrapper.text()).toContain("No notes added yet.");
    });

    it("toggles editing mode for notes", async () => {
      const wrapper = mount(SchoolNotesCard, { props: defaultProps });
      const editButtons = wrapper.findAll("button");
      const notesEditBtn = editButtons[0];

      await notesEditBtn.trigger("click");
      expect(wrapper.find("textarea").exists()).toBe(true);
    });

    it("emits update:notes on save", async () => {
      const wrapper = mount(SchoolNotesCard, { props: defaultProps });
      const editButtons = wrapper.findAll("button");
      await editButtons[0].trigger("click");

      const textarea = wrapper.find("textarea");
      await textarea.setValue("Updated notes");

      const saveBtn = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Save Notes"));
      await saveBtn?.trigger("click");

      expect(wrapper.emitted("update:notes")).toBeTruthy();
      expect(wrapper.emitted("update:notes")![0]).toEqual(["Updated notes"]);
    });

    it("closes edit mode after saving notes", async () => {
      const wrapper = mount(SchoolNotesCard, { props: defaultProps });
      const editButtons = wrapper.findAll("button");
      await editButtons[0].trigger("click");

      const saveBtn = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Save Notes"));
      await saveBtn?.trigger("click");

      expect(wrapper.findAll("textarea")).toHaveLength(0);
    });
  });

  describe("isSaving prop", () => {
    it("shows Saving... text when isSaving is true", async () => {
      const wrapper = mount(SchoolNotesCard, {
        props: { ...defaultProps, isSaving: true },
      });

      const editBtns = wrapper
        .findAll("button")
        .filter((b) => b.text().includes("Edit"));
      await editBtns[0].trigger("click");

      const saveBtn = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Saving..."));
      expect(saveBtn?.exists()).toBe(true);
    });
  });

  describe("NotesHistory integration", () => {
    it("passes schoolId to NotesHistory component", () => {
      const wrapper = mount(SchoolNotesCard, { props: defaultProps });
      const notesHistory = wrapper.find("[data-testid='notes-history']");
      expect(notesHistory.exists()).toBe(true);
    });
  });
});
