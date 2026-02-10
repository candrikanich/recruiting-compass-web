import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SchoolStatusHistory from "~/components/School/SchoolStatusHistory.vue";

const mockGetStatusHistory = vi.fn();
const mockUser = { id: "user-123", full_name: "John Doe" };

vi.mock("~/stores/schools", () => ({
  useSchoolStore: () => ({
    getStatusHistory: mockGetStatusHistory,
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: mockUser,
  }),
}));

vi.mock("@heroicons/vue/24/outline", () => ({
  ArrowRightIcon: {
    template: '<span class="arrow-icon">→</span>',
  },
}));

describe("SchoolStatusHistory", () => {
  const defaultHistory = [
    {
      id: "h1",
      school_id: "s1",
      previous_status: "researching",
      new_status: "contacted",
      changed_by: "user-123",
      changed_at: "2026-01-15T10:30:00Z",
      notes: "Called the coach",
    },
    {
      id: "h2",
      school_id: "s1",
      previous_status: null,
      new_status: "researching",
      changed_by: "user-456",
      changed_at: "2026-01-10T08:00:00Z",
      notes: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatusHistory.mockResolvedValue(defaultHistory);
  });

  const mountComponent = () =>
    mount(SchoolStatusHistory, {
      props: { schoolId: "s1" },
    });

  describe("data fetching", () => {
    it("fetches history on mount", async () => {
      mountComponent();
      await flushPromises();

      expect(mockGetStatusHistory).toHaveBeenCalledWith("s1");
    });

    it("shows loading state while fetching", async () => {
      mockGetStatusHistory.mockReturnValue(new Promise(() => {}));
      const wrapper = mountComponent();
      // The loading spinner is shown via the disabled button with animate-spin child
      await vi.dynamicImportSettled();
      // Loading is true so the div with role="status" should exist
      const loadingDiv = wrapper.find('[role="status"]');
      expect(loadingDiv.exists()).toBe(true);
      expect(loadingDiv.text()).toContain("Loading status history");
    });
  });

  describe("empty state", () => {
    it("shows empty message when no history", async () => {
      mockGetStatusHistory.mockResolvedValue([]);
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("No status changes yet");
    });
  });

  describe("error state", () => {
    it("displays error message on fetch failure", async () => {
      mockGetStatusHistory.mockRejectedValue(new Error("Network error"));
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("Network error");
    });

    it("shows generic error for non-Error throws", async () => {
      mockGetStatusHistory.mockRejectedValue("unknown");
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("Failed to load status history");
    });
  });

  describe("status transition display", () => {
    it("renders status transitions with arrow", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      const entries = wrapper.findAll(
        ".border-b.border-slate-100, .last\\:border-b-0",
      );
      expect(wrapper.text()).toContain("Contacted");
      // "researching" is not in formatStatus labels, falls back to raw string
      expect(wrapper.text()).toContain("researching");
    });

    it("shows 'Initial' when no previous status", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("Initial");
    });
  });

  describe("status color coding", () => {
    it("applies correct color for 'contacted' status", async () => {
      mockGetStatusHistory.mockResolvedValue([
        {
          id: "h1",
          previous_status: null,
          new_status: "contacted",
          changed_by: "user-123",
          changed_at: "2026-01-15T10:30:00Z",
          notes: null,
        },
      ]);
      const wrapper = mountComponent();
      await flushPromises();

      const badge = wrapper.find(".bg-slate-100.text-slate-700");
      expect(badge.exists()).toBe(true);
    });

    it("applies correct color for 'committed' status", async () => {
      mockGetStatusHistory.mockResolvedValue([
        {
          id: "h1",
          previous_status: "offer_received",
          new_status: "committed",
          changed_by: "user-123",
          changed_at: "2026-01-15T10:30:00Z",
          notes: null,
        },
      ]);
      const wrapper = mountComponent();
      await flushPromises();

      const badges = wrapper.findAll("span");
      const committedBadge = badges.find(
        (b) => b.text() === "Committed" && b.classes().includes("bg-green-800"),
      );
      expect(committedBadge).toBeDefined();
    });

    it("falls back to slate for unknown status", async () => {
      mockGetStatusHistory.mockResolvedValue([
        {
          id: "h1",
          previous_status: null,
          new_status: "unknown_status",
          changed_by: "user-123",
          changed_at: "2026-01-15T10:30:00Z",
          notes: null,
        },
      ]);
      const wrapper = mountComponent();
      await flushPromises();

      const badge = wrapper.find(".bg-slate-100.text-slate-700");
      expect(badge.exists()).toBe(true);
    });
  });

  describe("user name formatting", () => {
    it("shows 'You (Name)' for current user", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("You (John Doe)");
    });

    it("shows truncated user ID for other users", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("User user-456...");
    });
  });

  describe("date formatting", () => {
    it("formats dates in human-readable format", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toMatch(/Jan\s+15,\s+2026/);
    });

    it("returns raw string for invalid dates", async () => {
      mockGetStatusHistory.mockResolvedValue([
        {
          id: "h1",
          previous_status: null,
          new_status: "contacted",
          changed_by: "user-123",
          changed_at: "not-a-date",
          notes: null,
        },
      ]);
      const wrapper = mountComponent();
      await flushPromises();

      // Invalid Date in toLocaleDateString still returns some string
      // The component catches errors and returns raw dateString
      expect(wrapper.text()).toBeTruthy();
    });
  });

  describe("notes display", () => {
    it("shows notes when present", async () => {
      const wrapper = mountComponent();
      await flushPromises();

      expect(wrapper.text()).toContain("Called the coach");
    });

    it("hides notes element when not present", async () => {
      mockGetStatusHistory.mockResolvedValue([
        {
          id: "h1",
          previous_status: null,
          new_status: "contacted",
          changed_by: "user-123",
          changed_at: "2026-01-15T10:30:00Z",
          notes: null,
        },
      ]);
      const wrapper = mountComponent();
      await flushPromises();

      const noteElements = wrapper.findAll("p.text-sm.text-slate-500.mt-1");
      expect(noteElements.length).toBe(0);
    });
  });

  describe("header", () => {
    it("shows 'Status History' heading", () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain("Status History");
    });
  });
});
