import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import CoachingPhilosophy from "~/components/School/CoachingPhilosophy.vue";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";
import type { School } from "~/types/models";

vi.mock("@heroicons/vue/24/outline", () => ({
  PencilIcon: {
    template: '<span class="pencil-icon">P</span>',
  },
}));

vi.mock("~/components/School/NotesHistory.vue", () => ({
  default: {
    template: '<div data-testid="notes-history-stub"></div>',
    props: ["schoolId"],
  },
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    noteHistory: { value: [] },
    formattedNoteHistory: { value: [] },
    noteHistoryLoading: { value: false },
    noteHistoryError: { value: null },
    fetchNoteHistory: vi.fn(),
  }),
}));

describe("CoachingPhilosophy", () => {
  const schoolWithPhilosophy: School = {
    ...createMockSchool({ id: "s1", name: "Test U" }),
    coaching_philosophy: "Win with integrity",
    coaching_style: "High intensity",
    recruiting_approach: "Early contact",
    communication_style: "Direct and honest",
    success_metrics: "90% graduation rate",
  };

  const schoolWithoutPhilosophy: School = {
    ...createMockSchool({ id: "s2", name: "Empty U" }),
    coaching_philosophy: null,
    coaching_style: null,
    recruiting_approach: null,
    communication_style: null,
    success_metrics: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountComponent = (school: School = schoolWithPhilosophy) =>
    mount(CoachingPhilosophy, {
      props: { school, schoolId: school.id },
      global: {
        stubs: {
          NotesHistory: true,
        },
      },
    });

  describe("view mode", () => {
    it("renders heading", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Coaching Philosophy");
    });

    it("shows coaching style section", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Coaching Style");
      expect(wrapper.text()).toContain("High intensity");
    });

    it("shows recruiting approach section", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Recruiting Approach");
      expect(wrapper.text()).toContain("Early contact");
    });

    it("shows communication style section", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Communication Style");
      expect(wrapper.text()).toContain("Direct and honest");
    });

    it("shows success metrics section", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Success Metrics");
      expect(wrapper.text()).toContain("90% graduation rate");
    });

    it("shows overall philosophy section", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Overall Philosophy");
      expect(wrapper.text()).toContain("Win with integrity");
    });

    it("shows empty state when no coaching info", () => {
      const wrapper = mountComponent(schoolWithoutPhilosophy);
      expect(wrapper.text()).toContain(
        "No coaching philosophy information added yet",
      );
    });

    it("hides sections when specific field is null", () => {
      const partialSchool: School = {
        ...createMockSchool({ id: "s3" }),
        coaching_style: "Defensive",
        coaching_philosophy: null,
        recruiting_approach: null,
        communication_style: null,
        success_metrics: null,
      };
      const wrapper = mountComponent(partialSchool);

      expect(wrapper.text()).toContain("Coaching Style");
      expect(wrapper.text()).toContain("Defensive");
      expect(wrapper.text()).not.toContain("Recruiting Approach");
    });
  });

  describe("edit mode toggle", () => {
    it("shows Edit button in view mode", () => {
      const wrapper = mountComponent();
      const editBtn = wrapper.find(
        '[data-testid="coaching-philosophy-edit-btn"]',
      );
      expect(editBtn.text()).toContain("Edit");
    });

    it("shows Cancel text when in edit mode", async () => {
      const wrapper = mountComponent();
      const editBtn = wrapper.find(
        '[data-testid="coaching-philosophy-edit-btn"]',
      );

      await editBtn.trigger("click");

      expect(editBtn.text()).toContain("Cancel");
    });

    it("shows textareas when in edit mode", async () => {
      const wrapper = mountComponent();
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      expect(
        wrapper.find('[data-testid="coaching-style-textarea"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="recruiting-approach-textarea"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="communication-style-textarea"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="success-metrics-textarea"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="overall-philosophy-textarea"]').exists(),
      ).toBe(true);
    });

    it("populates textareas with existing data", async () => {
      const wrapper = mountComponent();
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      const textarea = wrapper.find('[data-testid="coaching-style-textarea"]');
      expect((textarea.element as HTMLTextAreaElement).value).toBe(
        "High intensity",
      );
    });
  });

  describe("cancel behavior", () => {
    it("resets form to original values on cancel", async () => {
      const wrapper = mountComponent();

      // Enter edit mode
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      // Modify a field
      const textarea = wrapper.find('[data-testid="coaching-style-textarea"]');
      await textarea.setValue("Changed value");

      // Cancel
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      // Re-enter edit mode
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      const resetTextarea = wrapper.find(
        '[data-testid="coaching-style-textarea"]',
      );
      expect((resetTextarea.element as HTMLTextAreaElement).value).toBe(
        "High intensity",
      );
    });
  });

  describe("save behavior", () => {
    it("emits update with edited data on save", async () => {
      const wrapper = mountComponent();

      // Enter edit mode
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      // Modify fields
      await wrapper
        .find('[data-testid="coaching-style-textarea"]')
        .setValue("New style");

      // Save
      await wrapper
        .find('[data-testid="save-philosophy-btn"]')
        .trigger("click");
      await flushPromises();

      const emitted = wrapper.emitted("update");
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toMatchObject({
        coaching_style: "New style",
      });
    });

    it("exits edit mode after save", async () => {
      const wrapper = mountComponent();

      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");
      await wrapper
        .find('[data-testid="save-philosophy-btn"]')
        .trigger("click");
      await flushPromises();

      expect(
        wrapper.find('[data-testid="coaching-style-textarea"]').exists(),
      ).toBe(false);
    });

    it("shows save button in edit mode", async () => {
      const wrapper = mountComponent();
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      const saveBtn = wrapper.find('[data-testid="save-philosophy-btn"]');
      expect(saveBtn.exists()).toBe(true);
      expect(saveBtn.text()).toBe("Save Philosophy");
    });
  });

  describe("school prop watcher", () => {
    it("updates local state when school prop changes", async () => {
      const wrapper = mountComponent();

      const updatedSchool: School = {
        ...createMockSchool({ id: "s1" }),
        coaching_style: "Completely new style",
      };

      await wrapper.setProps({ school: updatedSchool });
      await nextTick();

      // Enter edit mode to check the textarea value
      await wrapper
        .find('[data-testid="coaching-philosophy-edit-btn"]')
        .trigger("click");

      const textarea = wrapper.find('[data-testid="coaching-style-textarea"]');
      expect((textarea.element as HTMLTextAreaElement).value).toBe(
        "Completely new style",
      );
    });
  });

  describe("NotesHistory stub", () => {
    it("renders NotesHistory child component", () => {
      const wrapper = mountComponent();
      expect(
        wrapper.find('[data-testid="notes-history-stub"]').exists() ||
          wrapper.findComponent({ name: "NotesHistory" }).exists() ||
          wrapper.find("notes-history-stub").exists(),
      ).toBe(true);
    });
  });

  describe("data-testid attributes", () => {
    it("has coaching-philosophy-section testid", () => {
      const wrapper = mountComponent();
      expect(
        wrapper.find('[data-testid="coaching-philosophy-section"]').exists(),
      ).toBe(true);
    });
  });
});
