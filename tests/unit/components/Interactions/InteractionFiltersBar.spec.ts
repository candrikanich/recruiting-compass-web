import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionFiltersBar from "~/components/Interactions/InteractionFiltersBar.vue";

describe("InteractionFiltersBar Component", () => {
  describe("Rendering", () => {
    it("should render all four filter dropdowns", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      expect(wrapper.find("#type-filter").exists()).toBe(true);
      expect(wrapper.find("#direction-filter").exists()).toBe(true);
      expect(wrapper.find("#date-filter").exists()).toBe(true);
      expect(wrapper.find("#sentiment-filter").exists()).toBe(true);
    });

    it("should render clear filters button", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const clearButton = wrapper.find("button");
      expect(clearButton.exists()).toBe(true);
      expect(clearButton.text()).toContain("Clear Filters");
    });

    it("should have proper labels for all filters", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      expect(wrapper.text()).toContain("Type");
      expect(wrapper.text()).toContain("Direction");
      expect(wrapper.text()).toContain("Date Range");
      expect(wrapper.text()).toContain("Sentiment");
    });
  });

  describe("Type Filter", () => {
    it("should display all type options", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const typeFilter = wrapper.find("#type-filter");
      const options = typeFilter.findAll("option");

      expect(options.length).toBe(8); // All Types + 7 specific types
      expect(typeFilter.text()).toContain("All Types");
      expect(typeFilter.text()).toContain("Email");
      expect(typeFilter.text()).toContain("Phone Call");
      expect(typeFilter.text()).toContain("Text Message");
      expect(typeFilter.text()).toContain("In-Person Visit");
      expect(typeFilter.text()).toContain("Virtual Meeting");
      expect(typeFilter.text()).toContain("Direct Message");
      expect(typeFilter.text()).toContain("Tweet");
    });

    it("should emit update:selectedType when type changes", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const typeFilter = wrapper.find("#type-filter");
      await typeFilter.setValue("email");

      expect(wrapper.emitted("update:selectedType")).toBeTruthy();
      expect(wrapper.emitted("update:selectedType")?.[0]).toEqual(["email"]);
    });

    it("should display selected type value", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "phone_call",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const typeFilter = wrapper.find("#type-filter");
      expect((typeFilter.element as HTMLSelectElement).value).toBe(
        "phone_call",
      );
    });
  });

  describe("Direction Filter", () => {
    it("should display all direction options", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const directionFilter = wrapper.find("#direction-filter");
      const options = directionFilter.findAll("option");

      expect(options.length).toBe(3); // Both + Outbound + Inbound
      expect(directionFilter.text()).toContain("Both");
      expect(directionFilter.text()).toContain("Sent by Us");
      expect(directionFilter.text()).toContain("Received");
    });

    it("should emit update:selectedDirection when direction changes", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const directionFilter = wrapper.find("#direction-filter");
      await directionFilter.setValue("outbound");

      expect(wrapper.emitted("update:selectedDirection")).toBeTruthy();
      expect(wrapper.emitted("update:selectedDirection")?.[0]).toEqual([
        "outbound",
      ]);
    });

    it("should display selected direction value", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "inbound",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const directionFilter = wrapper.find("#direction-filter");
      expect((directionFilter.element as HTMLSelectElement).value).toBe(
        "inbound",
      );
    });
  });

  describe("Date Range Filter", () => {
    it("should display all date range options", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const dateFilter = wrapper.find("#date-filter");
      const options = dateFilter.findAll("option");

      expect(options.length).toBe(5); // All Time + 4 ranges
      expect(dateFilter.text()).toContain("All Time");
      expect(dateFilter.text()).toContain("Last 7 Days");
      expect(dateFilter.text()).toContain("Last 30 Days");
      expect(dateFilter.text()).toContain("Last 90 Days");
      expect(dateFilter.text()).toContain("Last 6 Months");
    });

    it("should emit update:selectedDateRange when date range changes", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const dateFilter = wrapper.find("#date-filter");
      await dateFilter.setValue("30");

      expect(wrapper.emitted("update:selectedDateRange")).toBeTruthy();
      expect(wrapper.emitted("update:selectedDateRange")?.[0]).toEqual(["30"]);
    });

    it("should display selected date range value", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "7",
          selectedSentiment: "",
        },
      });

      const dateFilter = wrapper.find("#date-filter");
      expect((dateFilter.element as HTMLSelectElement).value).toBe("7");
    });
  });

  describe("Sentiment Filter", () => {
    it("should display all sentiment options", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const sentimentFilter = wrapper.find("#sentiment-filter");
      const options = sentimentFilter.findAll("option");

      expect(options.length).toBe(5); // All Sentiments + 4 specific
      expect(sentimentFilter.text()).toContain("All Sentiments");
      expect(sentimentFilter.text()).toContain("Very Positive");
      expect(sentimentFilter.text()).toContain("Positive");
      expect(sentimentFilter.text()).toContain("Neutral");
      expect(sentimentFilter.text()).toContain("Negative");
    });

    it("should emit update:selectedSentiment when sentiment changes", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const sentimentFilter = wrapper.find("#sentiment-filter");
      await sentimentFilter.setValue("positive");

      expect(wrapper.emitted("update:selectedSentiment")).toBeTruthy();
      expect(wrapper.emitted("update:selectedSentiment")?.[0]).toEqual([
        "positive",
      ]);
    });

    it("should display selected sentiment value", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "very_positive",
        },
      });

      const sentimentFilter = wrapper.find("#sentiment-filter");
      expect((sentimentFilter.element as HTMLSelectElement).value).toBe(
        "very_positive",
      );
    });
  });

  describe("Clear Filters", () => {
    it("should emit clear event when clear button clicked", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "email",
          selectedDirection: "outbound",
          selectedDateRange: "30",
          selectedSentiment: "positive",
        },
      });

      const clearButton = wrapper.find("button");
      await clearButton.trigger("click");

      expect(wrapper.emitted("clear")).toBeTruthy();
      expect(wrapper.emitted("clear")?.length).toBe(1);
    });

    it("should be clickable even when no filters are active", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const clearButton = wrapper.find("button");
      await clearButton.trigger("click");

      expect(wrapper.emitted("clear")).toBeTruthy();
    });
  });

  describe("Multiple Filter Combinations", () => {
    it("should display multiple active filters correctly", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "email",
          selectedDirection: "outbound",
          selectedDateRange: "7",
          selectedSentiment: "positive",
        },
      });

      const typeFilter = wrapper.find("#type-filter");
      const directionFilter = wrapper.find("#direction-filter");
      const dateFilter = wrapper.find("#date-filter");
      const sentimentFilter = wrapper.find("#sentiment-filter");

      expect((typeFilter.element as HTMLSelectElement).value).toBe("email");
      expect((directionFilter.element as HTMLSelectElement).value).toBe(
        "outbound",
      );
      expect((dateFilter.element as HTMLSelectElement).value).toBe("7");
      expect((sentimentFilter.element as HTMLSelectElement).value).toBe(
        "positive",
      );
    });

    it("should emit multiple events when changing multiple filters", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      await wrapper.find("#type-filter").setValue("email");
      await wrapper.find("#direction-filter").setValue("outbound");
      await wrapper.find("#date-filter").setValue("30");

      expect(wrapper.emitted("update:selectedType")).toBeTruthy();
      expect(wrapper.emitted("update:selectedDirection")).toBeTruthy();
      expect(wrapper.emitted("update:selectedDateRange")).toBeTruthy();
    });
  });

  describe("v-model Bindings", () => {
    it("should update when props change", async () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      await wrapper.setProps({ selectedType: "phone_call" });

      const typeFilter = wrapper.find("#type-filter");
      expect((typeFilter.element as HTMLSelectElement).value).toBe(
        "phone_call",
      );
    });

    it("should handle empty string values correctly", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const typeFilter = wrapper.find("#type-filter");
      const directionFilter = wrapper.find("#direction-filter");
      const dateFilter = wrapper.find("#date-filter");
      const sentimentFilter = wrapper.find("#sentiment-filter");

      expect((typeFilter.element as HTMLSelectElement).value).toBe("");
      expect((directionFilter.element as HTMLSelectElement).value).toBe("");
      expect((dateFilter.element as HTMLSelectElement).value).toBe("");
      expect((sentimentFilter.element as HTMLSelectElement).value).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("should have proper label associations", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      const typeLabel = wrapper.find('label[for="type-filter"]');
      const directionLabel = wrapper.find('label[for="direction-filter"]');
      const dateLabel = wrapper.find('label[for="date-filter"]');
      const sentimentLabel = wrapper.find('label[for="sentiment-filter"]');

      expect(typeLabel.exists()).toBe(true);
      expect(directionLabel.exists()).toBe(true);
      expect(dateLabel.exists()).toBe(true);
      expect(sentimentLabel.exists()).toBe(true);
    });

    it("should have proper ids on all select elements", () => {
      const wrapper = mount(InteractionFiltersBar, {
        props: {
          selectedType: "",
          selectedDirection: "",
          selectedDateRange: "",
          selectedSentiment: "",
        },
      });

      expect(wrapper.find("#type-filter").exists()).toBe(true);
      expect(wrapper.find("#direction-filter").exists()).toBe(true);
      expect(wrapper.find("#date-filter").exists()).toBe(true);
      expect(wrapper.find("#sentiment-filter").exists()).toBe(true);
    });
  });
});
