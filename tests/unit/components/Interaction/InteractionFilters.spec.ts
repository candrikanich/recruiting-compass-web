import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionFilters from "~/components/Interaction/InteractionFilters.vue";
import type { User } from "~/types/models";

describe("InteractionFilters", () => {
  const createWrapper = (
    props: {
      filterValues?: Map<string, string | null>;
      isParent?: boolean;
      linkedAthletes?: User[];
      currentUserId?: string;
    } = {},
  ) => {
    return mount(InteractionFilters, {
      props: {
        filterValues: new Map(),
        isParent: false,
        linkedAthletes: [],
        ...props,
      },
    });
  };

  describe("Rendering", () => {
    it("renders all filter fields when not parent", () => {
      const wrapper = createWrapper({ isParent: false });

      expect(
        wrapper.find('input[placeholder="Subject, content..."]').exists(),
      ).toBe(true);
      expect(wrapper.findAll("select")).toHaveLength(4); // Type, Direction, Sentiment, Time Period
      expect(wrapper.text()).toContain("Search");
      expect(wrapper.text()).toContain("Type");
      expect(wrapper.text()).toContain("Direction");
      expect(wrapper.text()).toContain("Sentiment");
      expect(wrapper.text()).toContain("Time Period");
    });

    it("renders logged by filter when parent", () => {
      const wrapper = createWrapper({ isParent: true });

      expect(wrapper.findAll("select")).toHaveLength(5); // Type, Logged By, Direction, Sentiment, Time Period
      expect(wrapper.text()).toContain("Logged By");
    });

    it("does not render logged by filter when not parent", () => {
      const wrapper = createWrapper({ isParent: false });

      expect(wrapper.text()).not.toContain("Logged By");
    });

    it("applies 5-column grid when not parent", () => {
      const wrapper = createWrapper({ isParent: false });

      const gridContainer = wrapper.find("div");
      expect(gridContainer.classes()).toContain("lg:grid-cols-5");
      expect(gridContainer.classes()).not.toContain("lg:grid-cols-6");
    });

    it("applies 6-column grid when parent", () => {
      const wrapper = createWrapper({ isParent: true });

      const gridContainer = wrapper.find("div");
      expect(gridContainer.classes()).toContain("lg:grid-cols-6");
      expect(gridContainer.classes()).not.toContain("lg:grid-cols-5");
    });
  });

  describe("Filter Options", () => {
    it("renders all type options", () => {
      const wrapper = createWrapper();
      const typeSelect = wrapper.findAll("select")[0];

      expect(typeSelect.html()).toContain("-- All --");
      expect(typeSelect.html()).toContain("Email");
      expect(typeSelect.html()).toContain("Text");
      expect(typeSelect.html()).toContain("Phone Call");
      expect(typeSelect.html()).toContain("In-Person Visit");
      expect(typeSelect.html()).toContain("Virtual Meeting");
      expect(typeSelect.html()).toContain("Camp");
      expect(typeSelect.html()).toContain("Showcase");
      expect(typeSelect.html()).toContain("Tweet");
      expect(typeSelect.html()).toContain("Direct Message");
    });

    it("renders all direction options", () => {
      const wrapper = createWrapper();
      const directionSelect = wrapper.findAll("select")[1];

      expect(directionSelect.html()).toContain("-- All --");
      expect(directionSelect.html()).toContain("Outbound");
      expect(directionSelect.html()).toContain("Inbound");
    });

    it("renders all sentiment options", () => {
      const wrapper = createWrapper();
      const sentimentSelect = wrapper.findAll("select")[2];

      expect(sentimentSelect.html()).toContain("-- All --");
      expect(sentimentSelect.html()).toContain("Very Positive");
      expect(sentimentSelect.html()).toContain("Positive");
      expect(sentimentSelect.html()).toContain("Neutral");
      expect(sentimentSelect.html()).toContain("Negative");
    });

    it("renders all time period options", () => {
      const wrapper = createWrapper();
      const timePeriodSelect = wrapper.findAll("select")[3];

      expect(timePeriodSelect.html()).toContain("-- All Time --");
      expect(timePeriodSelect.html()).toContain("Last 7 days");
      expect(timePeriodSelect.html()).toContain("Last 14 days");
      expect(timePeriodSelect.html()).toContain("Last 30 days");
      expect(timePeriodSelect.html()).toContain("Last 90 days");
    });
  });

  describe("Logged By Filter (Parent Only)", () => {
    const mockAthletes: User[] = [
      {
        id: "athlete-1",
        email: "athlete1@example.com",
        full_name: "John Smith",
        role: "student",
        family_unit_id: "family-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "athlete-2",
        email: "athlete2@example.com",
        full_name: "Jane Doe",
        role: "student",
        family_unit_id: "family-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    it("shows 'Me (Parent)' option when currentUserId is provided", () => {
      const wrapper = createWrapper({
        isParent: true,
        currentUserId: "parent-1",
        linkedAthletes: [],
      });

      const loggedBySelect = wrapper.findAll("select")[1];
      expect(loggedBySelect.html()).toContain("Me (Parent)");
      expect(loggedBySelect.html()).toContain('value="parent-1"');
    });

    it("does not show 'Me (Parent)' option when currentUserId is undefined", () => {
      const wrapper = createWrapper({
        isParent: true,
        linkedAthletes: [],
      });

      const loggedBySelect = wrapper.findAll("select")[1];
      expect(loggedBySelect.html()).not.toContain("Me (Parent)");
    });

    it("shows all linked athletes in dropdown", () => {
      const wrapper = createWrapper({
        isParent: true,
        linkedAthletes: mockAthletes,
      });

      const loggedBySelect = wrapper.findAll("select")[1];
      expect(loggedBySelect.html()).toContain("John Smith");
      expect(loggedBySelect.html()).toContain("Jane Doe");
      expect(loggedBySelect.html()).toContain('value="athlete-1"');
      expect(loggedBySelect.html()).toContain('value="athlete-2"');
    });

    it("shows both parent and athletes when both are provided", () => {
      const wrapper = createWrapper({
        isParent: true,
        currentUserId: "parent-1",
        linkedAthletes: mockAthletes,
      });

      const loggedBySelect = wrapper.findAll("select")[1];
      expect(loggedBySelect.html()).toContain("Me (Parent)");
      expect(loggedBySelect.html()).toContain("John Smith");
      expect(loggedBySelect.html()).toContain("Jane Doe");
    });
  });

  describe("Filter Values", () => {
    it("displays current search value", () => {
      const filterValues = new Map([["search", "test search"]]);
      const wrapper = createWrapper({ filterValues });

      const searchInput = wrapper.find(
        'input[placeholder="Subject, content..."]',
      );
      expect((searchInput.element as HTMLInputElement).value).toBe(
        "test search",
      );
    });

    it("displays current type value", () => {
      const filterValues = new Map([["type", "email"]]);
      const wrapper = createWrapper({ filterValues });

      const typeSelect = wrapper.findAll("select")[0];
      expect((typeSelect.element as HTMLSelectElement).value).toBe("email");
    });

    it("displays current direction value", () => {
      const filterValues = new Map([["direction", "inbound"]]);
      const wrapper = createWrapper({ filterValues });

      const directionSelect = wrapper.findAll("select")[1];
      expect((directionSelect.element as HTMLSelectElement).value).toBe(
        "inbound",
      );
    });

    it("displays current sentiment value", () => {
      const filterValues = new Map([["sentiment", "positive"]]);
      const wrapper = createWrapper({ filterValues });

      const sentimentSelect = wrapper.findAll("select")[2];
      expect((sentimentSelect.element as HTMLSelectElement).value).toBe(
        "positive",
      );
    });

    it("displays current time period value", () => {
      const filterValues = new Map([["timePeriod", "30"]]);
      const wrapper = createWrapper({ filterValues });

      const timePeriodSelect = wrapper.findAll("select")[3];
      expect((timePeriodSelect.element as HTMLSelectElement).value).toBe("30");
    });

    it("displays current logged by value for parent", () => {
      const filterValues = new Map([["loggedBy", "athlete-1"]]);
      const wrapper = createWrapper({
        isParent: true,
        filterValues,
        linkedAthletes: [
          {
            id: "athlete-1",
            email: "athlete1@example.com",
            full_name: "John Smith",
            role: "student",
            family_unit_id: "family-1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const loggedBySelect = wrapper.findAll("select")[1];
      expect((loggedBySelect.element as HTMLSelectElement).value).toBe(
        "athlete-1",
      );
    });
  });

  describe("Emits", () => {
    it("emits update:filter when search input changes", async () => {
      const wrapper = createWrapper();
      const searchInput = wrapper.find(
        'input[placeholder="Subject, content..."]',
      );

      await searchInput.setValue("new search");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "search", value: "new search" },
      ]);
    });

    it("emits update:filter when type changes", async () => {
      const wrapper = createWrapper();
      const typeSelect = wrapper.findAll("select")[0];

      await typeSelect.setValue("email");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "type", value: "email" },
      ]);
    });

    it("emits update:filter with null when type cleared", async () => {
      const wrapper = createWrapper();
      const typeSelect = wrapper.findAll("select")[0];

      await typeSelect.setValue("");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "type", value: null },
      ]);
    });

    it("emits update:filter when direction changes", async () => {
      const wrapper = createWrapper();
      const directionSelect = wrapper.findAll("select")[1];

      await directionSelect.setValue("outbound");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "direction", value: "outbound" },
      ]);
    });

    it("emits update:filter when sentiment changes", async () => {
      const wrapper = createWrapper();
      const sentimentSelect = wrapper.findAll("select")[2];

      await sentimentSelect.setValue("positive");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "sentiment", value: "positive" },
      ]);
    });

    it("emits update:filter when time period changes", async () => {
      const wrapper = createWrapper();
      const timePeriodSelect = wrapper.findAll("select")[3];

      await timePeriodSelect.setValue("30");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "timePeriod", value: "30" },
      ]);
    });

    it("emits update:filter when logged by changes (parent)", async () => {
      const wrapper = createWrapper({
        isParent: true,
        linkedAthletes: [
          {
            id: "athlete-1",
            email: "athlete1@example.com",
            full_name: "John Smith",
            role: "student",
            family_unit_id: "family-1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const loggedBySelect = wrapper.findAll("select")[1];
      await loggedBySelect.setValue("athlete-1");

      expect(wrapper.emitted("update:filter")).toBeTruthy();
      expect(wrapper.emitted("update:filter")![0]).toEqual([
        { field: "loggedBy", value: "athlete-1" },
      ]);
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for all inputs", () => {
      const wrapper = createWrapper({ isParent: true });

      expect(wrapper.html()).toContain(
        '<label class="block text-sm font-medium text-slate-700 mb-1">Search</label>',
      );
      expect(wrapper.html()).toContain(
        '<label class="block text-sm font-medium text-slate-700 mb-1">Type</label>',
      );
      expect(wrapper.html()).toContain(
        '<label class="block text-sm font-medium text-slate-700 mb-1">Logged By</label>',
      );
      expect(wrapper.html()).toContain(
        '<label class="block text-sm font-medium text-slate-700 mb-1">Direction</label>',
      );
      expect(wrapper.html()).toContain(
        '<label class="block text-sm font-medium text-slate-700 mb-1">Sentiment</label>',
      );
      expect(wrapper.html()).toContain(
        '<label class="block text-sm font-medium text-slate-700 mb-1">Time Period</label>',
      );
    });

    it("has placeholder text for search input", () => {
      const wrapper = createWrapper();
      const searchInput = wrapper.find(
        'input[placeholder="Subject, content..."]',
      );

      expect(searchInput.attributes("placeholder")).toBe("Subject, content...");
    });
  });
});
