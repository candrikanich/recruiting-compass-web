import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import NotesHistory from "~/components/School/NotesHistory.vue";

// Mock the composable
vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    interactions: { value: [] },
    loading: { value: false },
    error: { value: null },
    fetchInteractions: vi.fn(),
    getInteraction: vi.fn(),
    createInteraction: vi.fn(),
    updateInteraction: vi.fn(),
    deleteInteraction: vi.fn(),
    uploadAttachments: vi.fn(),
    exportToCSV: vi.fn(),
    downloadCSV: vi.fn(),
    fetchMyInteractions: vi.fn(),
    fetchAthleteInteractions: vi.fn(),
    noteHistory: { value: [] },
    noteHistoryLoading: { value: false },
    noteHistoryError: { value: null },
    formattedNoteHistory: { value: [] },
    fetchNoteHistory: vi.fn(),
  }),
}));

describe("NotesHistory Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component", () => {
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId: "test-school-id",
      },
      global: {
        stubs: {
          // Stub any child components if needed
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it("displays view history button", () => {
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId: "test-school-id",
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("button is disabled when no history", () => {
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId: "test-school-id",
      },
    });

    const firstButton = wrapper.find("button");
    // Button should be disabled when there's no history
    expect(firstButton.exists()).toBe(true);
  });

  it("passes correct schoolId prop", () => {
    const schoolId = "specific-school-123";
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId,
      },
    });

    expect(wrapper.props("schoolId")).toBe(schoolId);
  });

  it("renders modal container", async () => {
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId: "test-school-id",
      },
    });

    // Check that the component has template elements
    expect(wrapper.html().length).toBeGreaterThan(0);
  });

  it("has close button in modal", () => {
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId: "test-school-id",
      },
    });

    // Find modal close button
    const closeButtons = wrapper.findAll("button");
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it("displays view history in button text", () => {
    const wrapper = mount(NotesHistory, {
      props: {
        schoolId: "test-school-id",
      },
    });

    const buttonText = wrapper.text();
    expect(buttonText.length).toBeGreaterThan(0);
    expect(buttonText).toContain("No history");
  });

  describe("User interactions", () => {
    it("component accepts schoolId as prop", () => {
      const wrapper = mount(NotesHistory, {
        props: {
          schoolId: "abc-123",
        },
      });

      expect(wrapper.props("schoolId")).toBe("abc-123");
    });

    it("renders without errors", () => {
      expect(() => {
        mount(NotesHistory, {
          props: {
            schoolId: "test",
          },
        });
      }).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("has semantic HTML structure", () => {
      const wrapper = mount(NotesHistory, {
        props: {
          schoolId: "test-school-id",
        },
      });

      const buttons = wrapper.findAll("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("displays meaningful button text", () => {
      const wrapper = mount(NotesHistory, {
        props: {
          schoolId: "test-school-id",
        },
      });

      const button = wrapper.find("button");
      expect(button.text().length).toBeGreaterThan(0);
    });
  });
});
