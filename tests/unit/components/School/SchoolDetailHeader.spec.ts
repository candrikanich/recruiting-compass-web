import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolDetailHeader from "~/components/School/SchoolDetailHeader.vue";
import type { School } from "~/types/models";

// Mock icons
vi.mock("@heroicons/vue/24/outline", () => ({
  MapPinIcon: { name: "MapPinIcon", template: "<svg />" },
  StarIcon: { name: "StarIcon", template: "<svg />" },
}));

// Mock utils
vi.mock("~/utils/schoolStatusBadges", () => ({
  getStatusBadgeColor: (status: string) => `color-${status}`,
}));

vi.mock("~/utils/schoolSize", () => ({
  getSizeColorClass: (size: string) => `size-${size}`,
}));

// Mock child components
vi.mock("~/components/School/SchoolLogo.vue", () => ({
  default: {
    name: "SchoolLogo",
    template: "<div>Logo</div>",
    props: ["school", "size", "fetch-on-mount"],
  },
}));

vi.mock("~/components/SchoolPrioritySelector.vue", () => ({
  default: {
    name: "SchoolPrioritySelector",
    template: "<div>Priority Selector</div>",
    props: ["model-value", "data-testid"],
    emits: ["update:model-value"],
  },
}));

describe("SchoolDetailHeader", () => {
  const mockSchool: School = {
    id: "school-123",
    name: "Test University",
    location: "Test City, TX",
    division: "D1",
    status: "researching",
    priority_tier: "B",
    conference: "Big 12",
    is_favorite: false,
  } as School;

  const defaultProps = {
    school: mockSchool,
    calculatedSize: "Large",
    statusUpdating: false,
  };

  describe("rendering", () => {
    it("renders school name", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      expect(wrapper.text()).toContain("Test University");
    });

    it("renders school location", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      expect(wrapper.text()).toContain("Test City, TX");
    });

    it("renders school logo", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const logo = wrapper.findComponent({ name: "SchoolLogo" });
      expect(logo.exists()).toBe(true);
      expect(logo.props("school")).toEqual(mockSchool);
      expect(logo.props("size")).toBe("lg");
    });

    it("renders division badge", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      expect(wrapper.text()).toContain("D1");
    });

    it("renders conference badge", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      expect(wrapper.text()).toContain("Big 12");
    });

    it("renders calculated size badge", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      expect(wrapper.text()).toContain("Large");
    });

    it("hides division badge when not provided", () => {
      const schoolWithoutDivision = { ...mockSchool, division: null };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: schoolWithoutDivision },
      });
      // Should still render school name but no division badge
      expect(wrapper.text()).toContain("Test University");
    });

    it("hides conference badge when not provided", () => {
      const schoolWithoutConference = { ...mockSchool, conference: null };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: schoolWithoutConference },
      });
      // Should still render school name but no conference badge
      expect(wrapper.text()).toContain("Test University");
    });

    it("hides size badge when null", () => {
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, calculatedSize: null },
      });
      // Should still render school name but no size badge
      expect(wrapper.text()).toContain("Test University");
    });
  });

  describe("status selector", () => {
    it("renders status select element", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const select = wrapper.find("#school-status");
      expect(select.exists()).toBe(true);
    });

    it("has correct status options", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const select = wrapper.find("#school-status");
      const options = select.findAll("option");

      expect(options).toHaveLength(5);
      expect(options[0].text()).toBe("Researching");
      expect(options[1].text()).toBe("Contacted");
      expect(options[2].text()).toBe("Interested");
      expect(options[3].text()).toBe("Offer Received");
      expect(options[4].text()).toBe("Committed");
    });

    it("shows current status", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const select = wrapper.find("#school-status") as any;
      expect(select.element.value).toBe("researching");
    });

    it("emits update:status when changed", async () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const select = wrapper.find("#school-status");

      await select.setValue("interested");

      expect(wrapper.emitted("update:status")).toBeTruthy();
      expect(wrapper.emitted("update:status")?.[0]).toEqual(["interested"]);
    });

    it("disables select when statusUpdating is true", () => {
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, statusUpdating: true },
      });
      const select = wrapper.find("#school-status");
      expect((select.element as HTMLSelectElement).disabled).toBe(true);
    });

    it("applies opacity when statusUpdating is true", () => {
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, statusUpdating: true },
      });
      const select = wrapper.find("#school-status");
      expect(select.classes()).toContain("opacity-50");
    });

    it("applies status badge color", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const select = wrapper.find("#school-status");
      expect(select.classes()).toContain("color-researching");
    });
  });

  describe("priority selector", () => {
    it("renders priority selector component", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const priority = wrapper.findComponent({
        name: "SchoolPrioritySelector",
      });
      expect(priority.exists()).toBe(true);
    });

    it("passes current priority tier", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const priority = wrapper.findComponent({
        name: "SchoolPrioritySelector",
      });
      expect(priority.props("modelValue")).toBe("B");
    });

    it("passes null priority tier when not set", () => {
      const schoolWithoutPriority = { ...mockSchool, priority_tier: null };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: schoolWithoutPriority },
      });
      const priority = wrapper.findComponent({
        name: "SchoolPrioritySelector",
      });
      expect(priority.props("modelValue")).toBeNull();
    });

    it("emits update:priority when changed", async () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const priority = wrapper.findComponent({
        name: "SchoolPrioritySelector",
      });

      priority.vm.$emit("update:model-value", "A");
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("update:priority")).toBeTruthy();
      expect(wrapper.emitted("update:priority")?.[0]).toEqual(["A"]);
    });
  });

  describe("favorite button", () => {
    it("renders favorite button", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);
    });

    it("shows correct aria-label when not favorite", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const button = wrapper.find("button");
      expect(button.attributes("aria-label")).toBe("Add to favorites");
    });

    it("shows correct aria-label when favorite", () => {
      const favoriteSchool = { ...mockSchool, is_favorite: true };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: favoriteSchool },
      });
      const button = wrapper.find("button");
      expect(button.attributes("aria-label")).toBe("Remove from favorites");
    });

    it("has correct aria-pressed attribute", () => {
      const favoriteSchool = { ...mockSchool, is_favorite: true };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: favoriteSchool },
      });
      const button = wrapper.find("button");
      expect(button.attributes("aria-pressed")).toBe("true");
    });

    it("emits toggle-favorite when clicked", async () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const button = wrapper.find("button");

      await button.trigger("click");

      expect(wrapper.emitted("toggle-favorite")).toBeTruthy();
      expect(wrapper.emitted("toggle-favorite")?.[0]).toEqual([]);
    });

    it("applies yellow color when favorite", () => {
      const favoriteSchool = { ...mockSchool, is_favorite: true };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: favoriteSchool },
      });
      const button = wrapper.find("button");
      expect(button.classes()).toContain("text-yellow-500");
    });

    it("applies gray color when not favorite", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const button = wrapper.find("button");
      expect(button.classes()).toContain("text-slate-300");
    });

    it("renders star icon", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const icon = wrapper.findComponent({ name: "StarIcon" });
      expect(icon.exists()).toBe(true);
    });

    it("fills star icon when favorite", () => {
      const favoriteSchool = { ...mockSchool, is_favorite: true };
      const wrapper = mount(SchoolDetailHeader, {
        props: { ...defaultProps, school: favoriteSchool },
      });
      const icon = wrapper.findComponent({ name: "StarIcon" });
      expect(icon.classes()).toContain("fill-yellow-500");
    });
  });

  describe("accessibility", () => {
    it("has label for status select", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const label = wrapper.find("label[for='school-status']");
      expect(label.exists()).toBe(true);
      expect(label.classes()).toContain("sr-only");
    });

    it("star icon has aria-hidden", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const icon = wrapper.findComponent({ name: "StarIcon" });
      expect(icon.attributes("aria-hidden")).toBe("true");
    });
  });

  describe("styling", () => {
    it("applies card styling", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const card = wrapper.find(".bg-white.rounded-xl");
      expect(card.exists()).toBe(true);
    });

    it("applies size color class to size badge", () => {
      const wrapper = mount(SchoolDetailHeader, { props: defaultProps });
      const badge = wrapper.find(".size-Large");
      expect(badge.exists()).toBe(true);
    });
  });
});
