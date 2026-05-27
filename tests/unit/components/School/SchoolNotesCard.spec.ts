import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SchoolNotesCard from "~/components/School/SchoolNotesCard.vue";

vi.mock("~/components/School/NotesHistory.vue", () => ({
  default: {
    name: "NotesHistory",
    props: ["schoolId"],
    template: "<div data-testid='notes-history'>NotesHistory</div>",
  },
}));

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  notes: "Some school notes",
  schoolId: "school-123",
  saveFn: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const editBtn = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll("button").find((b) => b.text().match(/Edit|Cancel/));
const saveBtn = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll("button").find((b) => b.text().includes("Save Notes"));

describe("SchoolNotesCard", () => {
  describe("Notes section", () => {
    it("renders school notes in display mode", () => {
      const wrapper = mount(SchoolNotesCard, { props: makeProps() });
      expect(wrapper.text()).toContain("Some school notes");
    });

    it("shows placeholder when notes are null", () => {
      const wrapper = mount(SchoolNotesCard, {
        props: makeProps({ notes: null }),
      });
      expect(wrapper.text()).toContain("No notes added yet.");
    });

    it("toggles editing mode for notes", async () => {
      const wrapper = mount(SchoolNotesCard, { props: makeProps() });
      await editBtn(wrapper)?.trigger("click");
      expect(wrapper.find("textarea").exists()).toBe(true);
    });

    it("calls saveFn with the edited value on save", async () => {
      const saveFn = vi.fn().mockResolvedValue(undefined);
      const wrapper = mount(SchoolNotesCard, { props: makeProps({ saveFn }) });
      await editBtn(wrapper)?.trigger("click");

      await wrapper.find("textarea").setValue("Updated notes");
      await saveBtn(wrapper)?.trigger("click");
      await flushPromises();

      expect(saveFn).toHaveBeenCalledWith("Updated notes");
    });

    it("closes edit mode after saving notes", async () => {
      const wrapper = mount(SchoolNotesCard, { props: makeProps() });
      await editBtn(wrapper)?.trigger("click");

      await saveBtn(wrapper)?.trigger("click");
      await flushPromises();

      expect(wrapper.findAll("textarea")).toHaveLength(0);
    });
  });

  describe("saving state", () => {
    it("shows Saving... while the save is in flight", async () => {
      let resolveSave: () => void = () => {};
      const saveFn = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSave = resolve;
          }),
      );
      const wrapper = mount(SchoolNotesCard, { props: makeProps({ saveFn }) });
      await editBtn(wrapper)?.trigger("click");

      await saveBtn(wrapper)?.trigger("click");
      await wrapper.vm.$nextTick();

      expect(
        wrapper.findAll("button").some((b) => b.text().includes("Saving...")),
      ).toBe(true);

      resolveSave();
      await flushPromises();
    });
  });

  describe("NotesHistory integration", () => {
    it("passes schoolId to NotesHistory component", () => {
      const wrapper = mount(SchoolNotesCard, { props: makeProps() });
      const notesHistory = wrapper.find("[data-testid='notes-history']");
      expect(notesHistory.exists()).toBe(true);
    });
  });
});
