import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DuplicateSchoolDialog from "~/components/School/DuplicateSchoolDialog.vue";
import type { School } from "~/types/models";

const mountOptions = {
  global: {
    stubs: {
      Teleport: true,
      Transition: false,
    },
  },
};

const mockSchool: School = {
  id: "1",
  user_id: "user1",
  name: "University of Florida",
  location: "Gainesville, Florida",
  city: "Gainesville",
  state: "Florida",
  division: "D1",
  conference: "SEC",
  ranking: 5,
  is_favorite: false,
  website: "https://www.ufl.edu",
  favicon_url: "https://example.com/ufl.ico",
  twitter_handle: "@UF",
  instagram_handle: "universityofflorida",
  ncaa_id: "UFL",
  status: "researching",
  notes: "Great school",
  pros: ["Good baseball"],
  cons: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("DuplicateSchoolDialog", () => {
  describe("visibility", () => {
    it("renders dialog content when isOpen is true", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
      expect(wrapper.text()).toContain("Duplicate School Detected");
    });

    it("hides dialog content when isOpen is false", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: false, duplicate: mockSchool, matchType: "name" },
      });

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });
  });

  describe("school information display", () => {
    it("shows the existing school name", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      expect(wrapper.text()).toContain("University of Florida");
    });

    it("shows division and conference when present", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      expect(wrapper.text()).toContain("D1");
      expect(wrapper.text()).toContain("SEC");
    });

    it("shows location when present", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      expect(wrapper.text()).toContain("Gainesville, Florida");
    });
  });

  describe("match type display", () => {
    it("shows 'Name Match' label for name match type", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      expect(wrapper.text()).toContain("Name Match");
    });

    it("shows 'Website Domain' label for domain match type", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "domain" },
      });

      expect(wrapper.text()).toContain("Website Domain");
    });

    it("shows 'NCAA ID' label for ncaa_id match type", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "ncaa_id" },
      });

      expect(wrapper.text()).toContain("NCAA ID");
    });

    it("shows the website link for domain match type", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "domain" },
      });

      const link = wrapper.find("a");
      expect(link.exists()).toBe(true);
      expect(link.attributes("href")).toBe("https://www.ufl.edu");
    });

    it("shows the NCAA ID value for ncaa_id match type", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "ncaa_id" },
      });

      expect(wrapper.text()).toContain("UFL");
    });

    it("applies red badge styling for name match", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      const badge = wrapper.find(".bg-red-100");
      expect(badge.exists()).toBe(true);
    });

    it("applies yellow badge styling for domain match", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "domain" },
      });

      const badge = wrapper.find(".bg-yellow-100");
      expect(badge.exists()).toBe(true);
    });

    it("applies orange badge styling for ncaa_id match", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "ncaa_id" },
      });

      const badge = wrapper.find(".bg-orange-100");
      expect(badge.exists()).toBe(true);
    });
  });

  describe("user interactions", () => {
    it("emits confirm when 'Proceed Anyway' is clicked", async () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      const buttons = wrapper.findAll("button");
      const proceedBtn = buttons.find((b) => b.text().includes("Proceed Anyway"));
      await proceedBtn!.trigger("click");

      expect(wrapper.emitted("confirm")).toBeTruthy();
      expect(wrapper.emitted("confirm")).toHaveLength(1);
    });

    it("emits cancel when 'Cancel' button is clicked", async () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      const buttons = wrapper.findAll("button");
      const cancelBtn = buttons.find((b) => b.text().includes("Cancel"));
      await cancelBtn!.trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("emits cancel when the close (×) button is clicked", async () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: { isOpen: true, duplicate: mockSchool, matchType: "name" },
      });

      const closeBtn = wrapper.find("button[aria-label='Close dialog']");
      expect(closeBtn.exists()).toBe(true);
      await closeBtn.trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });
  });

  describe("graceful handling of missing data", () => {
    it("hides website link when website is null and match type is domain", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: {
          isOpen: true,
          duplicate: { ...mockSchool, website: null },
          matchType: "domain",
        },
      });

      expect(wrapper.find("a").exists()).toBe(false);
    });

    it("hides NCAA ID section when ncaa_id is undefined and match type is ncaa_id", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: {
          isOpen: true,
          duplicate: { ...mockSchool, ncaa_id: undefined },
          matchType: "ncaa_id",
        },
      });

      // The NCAA ID section is conditionally rendered only when ncaa_id has a value
      expect(wrapper.text()).not.toContain("UFL");
    });

    it("hides location section when location is null", () => {
      const wrapper = mount(DuplicateSchoolDialog, {
        ...mountOptions,
        props: {
          isOpen: true,
          duplicate: { ...mockSchool, location: null },
          matchType: "name",
        },
      });

      expect(wrapper.find('[class*="location"]').exists()).toBe(false);
    });
  });
});
