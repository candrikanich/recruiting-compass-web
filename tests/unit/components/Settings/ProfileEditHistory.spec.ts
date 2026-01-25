import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import ProfileEditHistory from "~/components/Settings/ProfileEditHistory.vue";
import type { FormattedHistoryEntry } from "~/composables/useProfileEditHistory";

// Mock state - will be reset in beforeEach
let mockHistory: any;
let mockLoading: any;
let mockError: any;
const mockFetchHistory = vi.fn();

vi.mock("~/composables/useProfileEditHistory", () => ({
  useProfileEditHistory: () => ({
    get history() {
      return mockHistory;
    },
    get loading() {
      return mockLoading;
    },
    get error() {
      return mockError;
    },
    fetchHistory: mockFetchHistory,
  }),
}));

// Mock Heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  HistoryIcon: { name: "HistoryIcon" },
  XIcon: { name: "XIcon" },
}));

describe("ProfileEditHistory Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory = ref([] as FormattedHistoryEntry[]);
    mockLoading = ref(false);
    mockError = ref(null as string | null);
  });

  it("renders the trigger button", () => {
    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.text()).toContain("View Edit History");
  });

  it("displays history count when available", async () => {
    const mockEntry: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:00:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "gpa",
          fieldLabel: "GPA",
          old_value: 3.5,
          new_value: 3.8,
        },
      ],
    };

    mockHistory.value = [mockEntry];

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("(1)");
  });

  it("opens modal when button is clicked", async () => {
    mockHistory.value = [];

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(mockFetchHistory).toHaveBeenCalled();
  });

  it("displays loading state", async () => {
    mockLoading.value = true;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    // Check for loading spinner
    expect(wrapper.html()).toContain("animate-spin");
  });

  it("displays error state", async () => {
    mockError.value = "Failed to load history";

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Failed to load history");
  });

  it("displays empty state when no history", async () => {
    mockHistory.value = [];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("No edit history available");
  });

  it("displays timeline with history entries", async () => {
    const mockEntry: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:00:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "gpa",
          fieldLabel: "GPA",
          old_value: 3.5,
          new_value: 3.8,
        },
      ],
    };

    mockHistory.value = [mockEntry];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("GPA");
    expect(wrapper.text()).toContain("3.5"); // old value
    expect(wrapper.text()).toContain("3.8"); // new value
  });

  it("shows 'Most Recent' badge on first entry", async () => {
    const mockEntry: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:00:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "gpa",
          fieldLabel: "GPA",
          old_value: 3.5,
          new_value: 3.8,
        },
      ],
    };

    mockHistory.value = [mockEntry];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Most Recent");
  });

  it("formats timestamps correctly", async () => {
    const mockEntry: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:30:45Z",
      changed_by: "user-123",
      changes: [
        {
          field: "gpa",
          fieldLabel: "GPA",
          old_value: 3.5,
          new_value: 3.8,
        },
      ],
    };

    mockHistory.value = [mockEntry];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    // Check that timestamp is formatted as a date
    const text = wrapper.text();
    expect(text).toMatch(/Jan|Jan\.|January/i);
  });

  it("displays field labels instead of field keys", async () => {
    const mockEntry: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:00:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "sat_score",
          fieldLabel: "SAT Score",
          old_value: 1200,
          new_value: 1350,
        },
        {
          field: "positions",
          fieldLabel: "Positions",
          old_value: ["P"],
          new_value: ["P", "SS"],
        },
      ],
    };

    mockHistory.value = [mockEntry];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    // Field labels should be displayed
    expect(wrapper.text()).toContain("SAT Score");
    expect(wrapper.text()).toContain("Positions");

    // Not raw field names
    expect(wrapper.text()).not.toContain("sat_score");
  });

  it("formats array values properly", async () => {
    const mockEntry: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:00:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "positions",
          fieldLabel: "Positions",
          old_value: ["P"],
          new_value: ["P", "SS"],
        },
      ],
    };

    mockHistory.value = [mockEntry];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("P");
    expect(wrapper.text()).toContain("P, SS");
  });

  it("closes modal when close button is clicked", async () => {
    mockHistory.value = [];

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    let button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    // Modal should be open
    expect(wrapper.html()).toContain("Profile Edit History");

    // Find close button - it's the X icon button in the modal
    const allButtons = wrapper.findAll("button");
    const closeButton = allButtons[allButtons.length - 1]; // Last button is close
    await closeButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Modal should be closed
    expect(wrapper.html()).not.toContain("Profile Edit History");
  });

  it("renders multiple history entries", async () => {
    const mockEntry1: FormattedHistoryEntry = {
      timestamp: "2024-01-20T10:00:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "gpa",
          fieldLabel: "GPA",
          old_value: 3.5,
          new_value: 3.8,
        },
      ],
    };

    const mockEntry2: FormattedHistoryEntry = {
      timestamp: "2024-01-19T14:30:00Z",
      changed_by: "user-123",
      changes: [
        {
          field: "sat_score",
          fieldLabel: "SAT Score",
          old_value: 1200,
          new_value: 1350,
        },
      ],
    };

    mockHistory.value = [mockEntry1, mockEntry2];
    mockLoading.value = false;

    const wrapper = mount(ProfileEditHistory, {
      global: {
        stubs: {
          HistoryIcon: true,
          XIcon: true,
        },
      },
    });

    // Open modal
    const button = wrapper.find("button");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("GPA");
    expect(wrapper.text()).toContain("SAT Score");
  });
});
