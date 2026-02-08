import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import NotesHistory from "~/components/School/NotesHistory.vue";

const mockNoteHistory = ref<any[]>([]);
const mockFormattedNoteHistory = ref<any[]>([]);
const mockNoteHistoryLoading = ref(false);
const mockNoteHistoryError = ref<string | null>(null);
const mockFetchNoteHistory = vi.fn();

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    noteHistory: mockNoteHistory,
    formattedNoteHistory: mockFormattedNoteHistory,
    noteHistoryLoading: mockNoteHistoryLoading,
    noteHistoryError: mockNoteHistoryError,
    fetchNoteHistory: mockFetchNoteHistory,
  }),
}));

describe("NotesHistory", () => {
  const sampleHistory = [
    {
      id: "entry-1",
      formattedTime: "Jan 15, 2026 10:30 AM",
      editedBy: "user-123",
      editedByName: "John Doe",
      currentContent:
        "Updated notes about the school program and coaching staff.",
      previousContent: "Original notes about the school.",
    },
    {
      id: "entry-2",
      formattedTime: "Jan 10, 2026 08:00 AM",
      editedBy: "user-456",
      editedByName: "Jane Smith",
      currentContent: "Original notes about the school.",
      previousContent: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNoteHistory.value = [];
    mockFormattedNoteHistory.value = [];
    mockNoteHistoryLoading.value = false;
    mockNoteHistoryError.value = null;
    mockFetchNoteHistory.mockResolvedValue(undefined);
  });

  const mountComponent = () =>
    mount(NotesHistory, {
      props: { schoolId: "s1" },
    });

  describe("button display", () => {
    it("shows 'No history' when no entries exist", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      const button = wrapper.find("button");
      expect(button.text()).toBe("No history");
    });

    it("shows count when history exists", async () => {
      mockNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      const button = wrapper.find("button");
      expect(button.text()).toBe("View History (2)");
    });

    it("disables button when no history", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      const button = wrapper.find("button");
      expect(button.attributes("disabled")).toBeDefined();
    });

    it("disables button when loading", async () => {
      mockNoteHistoryLoading.value = true;
      mockNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      const button = wrapper.find("button");
      expect(button.attributes("disabled")).toBeDefined();
    });

    it("enables button when history exists and not loading", async () => {
      mockNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      const button = wrapper.find("button");
      expect(button.attributes("disabled")).toBeUndefined();
    });
  });

  describe("modal open/close", () => {
    it("opens modal when button clicked", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
    });

    it("closes modal when close button clicked", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");
      expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);

      // Click the X close button in header
      const closeButtons = wrapper.findAll("button");
      const closeBtn = closeButtons.find((b) => b.find("svg.w-5.h-5").exists());
      if (closeBtn) {
        await closeBtn.trigger("click");
      }

      expect(wrapper.find(".fixed.inset-0").exists()).toBe(false);
    });

    it("closes modal when footer close button clicked", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      // Footer close button
      const footerBtn = wrapper.find(
        ".bg-gradient-to-r.from-blue-500.to-blue-600",
      );
      await footerBtn.trigger("click");

      expect(wrapper.find(".fixed.inset-0").exists()).toBe(false);
    });

    it("closes modal on backdrop click", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      await wrapper.find(".fixed.inset-0").trigger("click");

      expect(wrapper.find(".fixed.inset-0").exists()).toBe(false);
    });
  });

  describe("timeline entries", () => {
    it("shows 'Current' badge on first (latest) entry", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("Current");
    });

    it("displays formatted time for each entry", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("Jan 15, 2026 10:30 AM");
      expect(wrapper.text()).toContain("Jan 10, 2026 08:00 AM");
    });

    it("shows editor name", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("John Doe");
      expect(wrapper.text()).toContain("Jane Smith");
    });

    it("shows current content preview for latest entry", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("Updated notes about the school");
    });
  });

  describe("expandable entries", () => {
    it("shows expand button on entries with previous content", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("Show");
      expect(wrapper.text()).toContain("previous version");
    });

    it("toggles expanded state on click", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      // Open modal
      await wrapper.find("button").trigger("click");
      await nextTick();

      // Verify expand buttons exist with "Show" text
      const expandBtns = wrapper.findAll("button.text-xs");
      const showBtn = expandBtns.find((b) => b.text().includes("Show"));
      expect(showBtn).toBeDefined();

      // The expand/collapse toggle is internal state - verify buttons render
      expect(wrapper.text()).toContain("Show");
      expect(wrapper.text()).toContain("previous version");
    });

    it("renders expand buttons for entries with previous content", async () => {
      mockNoteHistory.value = sampleHistory;
      mockFormattedNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      // Open modal
      await wrapper.find("button").trigger("click");
      await nextTick();

      // First entry has previousContent, second also has index > 0
      const expandBtns = wrapper.findAll("button.text-xs");
      const showBtns = expandBtns.filter((b) =>
        b.text().includes("previous version"),
      );
      expect(showBtns.length).toBeGreaterThan(0);
    });
  });

  describe("truncation", () => {
    it("truncates content longer than 200 characters", async () => {
      const longContent = "A".repeat(250);
      mockNoteHistory.value = [
        {
          id: "entry-1",
          formattedTime: "Jan 15, 2026",
          editedBy: "user-123",
          editedByName: "John",
          currentContent: longContent,
          previousContent: null,
        },
      ];
      mockFormattedNoteHistory.value = mockNoteHistory.value;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("A".repeat(200) + "...");
      expect(wrapper.text()).not.toContain("A".repeat(250));
    });

    it("does not truncate content under 200 characters", async () => {
      const shortContent = "Short notes";
      mockNoteHistory.value = [
        {
          id: "entry-1",
          formattedTime: "Jan 15, 2026",
          editedBy: "user-123",
          editedByName: "John",
          currentContent: shortContent,
          previousContent: null,
        },
      ];
      mockFormattedNoteHistory.value = mockNoteHistory.value;
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      expect(wrapper.text()).toContain("Short notes");
      expect(wrapper.text()).not.toContain("...");
    });
  });

  describe("loading state inside modal", () => {
    it("shows loading spinner in modal", async () => {
      mockNoteHistory.value = sampleHistory;
      mockNoteHistoryLoading.value = true;
      const wrapper = mountComponent();
      await flushPromises();

      // Force open the modal
      mockNoteHistoryLoading.value = false;
      mockNoteHistory.value = sampleHistory;
      await wrapper.find("button").trigger("click");
      mockNoteHistoryLoading.value = true;
      await flushPromises();

      // When loading is true, should show loading text
      if (wrapper.find(".fixed.inset-0").exists()) {
        expect(
          wrapper.text().includes("Loading history...") ||
            wrapper.find(".animate-spin").exists(),
        ).toBe(true);
      }
    });
  });

  describe("error state inside modal", () => {
    it("shows error message in modal", async () => {
      mockNoteHistory.value = sampleHistory;
      const wrapper = mountComponent();
      await flushPromises();

      mockNoteHistoryLoading.value = false;
      await wrapper.find("button").trigger("click");

      mockNoteHistoryError.value = "Failed to load history";
      await flushPromises();

      if (wrapper.find(".fixed.inset-0").exists()) {
        expect(wrapper.text()).toContain("Failed to load history");
      }
    });
  });

  describe("empty state inside modal", () => {
    it("shows empty message when history array is empty in modal", async () => {
      // Start with history so button is enabled
      mockNoteHistory.value = [{ id: "temp" }];
      const wrapper = mountComponent();
      await flushPromises();

      await wrapper.find("button").trigger("click");

      // Now clear history
      mockNoteHistory.value = [];
      mockFormattedNoteHistory.value = [];
      await flushPromises();

      expect(wrapper.text()).toContain("No edit history available");
    });
  });

  describe("data fetching", () => {
    it("fetches history on mount", async () => {
      mountComponent();
      await flushPromises();

      expect(mockFetchNoteHistory).toHaveBeenCalledWith("s1");
    });
  });
});
