import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ActiveFilterChips from "~/components/Interaction/ActiveFilterChips.vue";
import type { User } from "~/types/models";

describe("ActiveFilterChips", () => {
  const mockLinkedAthletes: User[] = [
    {
      id: "athlete-1",
      full_name: "John Doe",
      email: "john@example.com",
      role: "student",
      created_at: "2026-01-01",
    },
    {
      id: "athlete-2",
      full_name: "Jane Smith",
      email: "jane@example.com",
      role: "student",
      created_at: "2026-01-01",
    },
  ];

  const currentUserId = "parent-1";

  describe("Rendering", () => {
    it("does not render when no active filters", () => {
      const filterValues = new Map<string, string | null>();
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.find(".border-t").exists()).toBe(false);
    });

    it("renders when there are active filters", () => {
      const filterValues = new Map<string, string | null>([["search", "test"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.find(".border-t").exists()).toBe(true);
      expect(wrapper.text()).toContain("Active filters:");
    });

    it("renders search chip with correct text", () => {
      const filterValues = new Map<string, string | null>([
        ["search", "test query"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Search: test query");
    });

    it("renders type chip with formatted type", () => {
      const filterValues = new Map<string, string | null>([["type", "email"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Type: Email");
    });

    it("renders logged by chip with formatted name for current user", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", currentUserId],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Logged By:");
      expect(chip.text()).toContain("Me (Parent)");
    });

    it("renders logged by chip with athlete name", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", "athlete-1"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Logged By:");
      expect(chip.text()).toContain("John Doe");
    });

    it("renders logged by chip with 'Unknown' for unknown user", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", "unknown-user"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Logged By:");
      expect(chip.text()).toContain("Unknown");
    });

    it("renders direction chip with formatted direction", () => {
      const filterValues = new Map<string, string | null>([
        ["direction", "outbound"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Outbound");
    });

    it("renders sentiment chip with formatted sentiment", () => {
      const filterValues = new Map<string, string | null>([
        ["sentiment", "very_positive"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Very Positive");
    });

    it("renders time period chip with days", () => {
      const filterValues = new Map<string, string | null>([
        ["timePeriod", "30"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.text()).toContain("Last 30 days");
    });

    it("renders multiple chips for multiple filters", () => {
      const filterValues = new Map<string, string | null>([
        ["search", "test"],
        ["type", "email"],
        ["direction", "outbound"],
        ["sentiment", "positive"],
        ["timePeriod", "7"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chips = wrapper.findAll("button");
      // 5 filter chips + 1 clear all button = 6 total
      expect(chips.length).toBe(6);
    });

    it("renders clear all button", () => {
      const filterValues = new Map<string, string | null>([["search", "test"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const clearButton = wrapper.findAll("button").at(-1);
      expect(clearButton?.text()).toContain("Clear all");
      expect(clearButton?.classes()).toContain("underline");
    });
  });

  describe("Events", () => {
    it("emits remove:filter when search chip is clicked", async () => {
      const filterValues = new Map<string, string | null>([["search", "test"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("remove:filter")).toBeTruthy();
      expect(wrapper.emitted("remove:filter")?.[0]).toEqual([
        { field: "search" },
      ]);
    });

    it("emits remove:filter when type chip is clicked", async () => {
      const filterValues = new Map<string, string | null>([["type", "email"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("remove:filter")?.[0]).toEqual([
        { field: "type" },
      ]);
    });

    it("emits remove:filter when logged by chip is clicked", async () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", "athlete-1"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("remove:filter")?.[0]).toEqual([
        { field: "loggedBy" },
      ]);
    });

    it("emits remove:filter when direction chip is clicked", async () => {
      const filterValues = new Map<string, string | null>([
        ["direction", "outbound"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("remove:filter")?.[0]).toEqual([
        { field: "direction" },
      ]);
    });

    it("emits remove:filter when sentiment chip is clicked", async () => {
      const filterValues = new Map<string, string | null>([
        ["sentiment", "positive"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("remove:filter")?.[0]).toEqual([
        { field: "sentiment" },
      ]);
    });

    it("emits remove:filter when time period chip is clicked", async () => {
      const filterValues = new Map<string, string | null>([
        ["timePeriod", "30"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("remove:filter")?.[0]).toEqual([
        { field: "timePeriod" },
      ]);
    });

    it("emits clear:all when clear all button is clicked", async () => {
      const filterValues = new Map<string, string | null>([
        ["search", "test"],
        ["type", "email"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      // Find the clear all button (last button)
      const clearButton = wrapper.findAll("button").at(-1);
      await clearButton?.trigger("click");

      expect(wrapper.emitted("clear:all")).toBeTruthy();
      expect(wrapper.emitted("clear:all")?.length).toBe(1);
    });
  });

  describe("Format Functions", () => {
    it("formats type correctly", () => {
      const filterValues = new Map<string, string | null>([
        ["type", "phone_call"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.text()).toContain("Type: Phone Call");
    });

    it("formats direction correctly", () => {
      const filterValues = new Map<string, string | null>([
        ["direction", "inbound"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.text()).toContain("Inbound");
    });

    it("formats sentiment correctly", () => {
      const filterValues = new Map<string, string | null>([
        ["sentiment", "neutral"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.text()).toContain("Neutral");
    });

    it("formats logged by for current user", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", currentUserId],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.text()).toContain("Me (Parent)");
    });

    it("formats logged by for athlete", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", "athlete-2"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.text()).toContain("Jane Smith");
    });
  });

  describe("Chip Styling", () => {
    it("applies correct chip classes", () => {
      const filterValues = new Map<string, string | null>([["search", "test"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      const chip = wrapper.find("button");
      expect(chip.classes()).toContain("inline-flex");
      expect(chip.classes()).toContain("items-center");
      expect(chip.classes()).toContain("gap-1");
      expect(chip.classes()).toContain("px-2");
      expect(chip.classes()).toContain("py-1");
      expect(chip.classes()).toContain("bg-blue-50");
      expect(chip.classes()).toContain("text-blue-700");
      expect(chip.classes()).toContain("rounded-full");
      expect(chip.classes()).toContain("text-xs");
      expect(chip.classes()).toContain("font-medium");
    });

    it("renders XMarkIcon in chips", () => {
      const filterValues = new Map<string, string | null>([["search", "test"]]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      expect(wrapper.find("svg").exists()).toBe(true);
      expect(wrapper.find("svg").classes()).toContain("w-3");
      expect(wrapper.find("svg").classes()).toContain("h-3");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty linkedAthletes array", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", "athlete-1"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: [],
          currentUserId,
        },
      });

      expect(wrapper.text()).toContain("Unknown");
    });

    it("handles missing currentUserId", () => {
      const filterValues = new Map<string, string | null>([
        ["loggedBy", "athlete-1"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
        },
      });

      expect(wrapper.text()).toContain("John Doe");
    });

    it("handles null filter values in Map", () => {
      const filterValues = new Map<string, string | null>([
        ["search", null],
        ["type", "email"],
      ]);
      const wrapper = mount(ActiveFilterChips, {
        props: {
          filterValues,
          linkedAthletes: mockLinkedAthletes,
          currentUserId,
        },
      });

      // Only type chip should render
      const chips = wrapper.findAll("button");
      // 1 type chip + 1 clear all button = 2 total
      expect(chips.length).toBe(2);
    });
  });
});
