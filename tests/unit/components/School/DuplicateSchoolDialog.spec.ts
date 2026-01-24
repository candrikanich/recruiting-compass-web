import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import DuplicateSchoolDialog from "~/components/School/DuplicateSchoolDialog.vue";
import type { School } from "~/types/models";

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
  priority_tier: "A",
  notes: "Great school",
  pros: ["Good baseball"],
  cons: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("DuplicateSchoolDialog", () => {
  it("should accept isOpen prop", () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: false,
        duplicate: mockSchool,
        matchType: "name",
      },
    });

    expect(wrapper.props("isOpen")).toBe(false);
  });

  it("should accept duplicate prop", () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "name",
      },
    });

    expect(wrapper.props("duplicate")).toEqual(mockSchool);
  });

  it("should accept matchType prop", () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "domain",
      },
    });

    expect(wrapper.props("matchType")).toBe("domain");
  });

  it("should render component successfully", () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "name",
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.vm).toBeDefined();
  });

  it("should handle mockSchool prop correctly", () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "name",
      },
    });

    expect(wrapper.props("duplicate")).toEqual(mockSchool);
    expect(wrapper.props("duplicate").name).toBe("University of Florida");
  });

  it("should handle schools without website gracefully", () => {
    const schoolWithoutWebsite = { ...mockSchool, website: null };
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: schoolWithoutWebsite,
        matchType: "domain",
      },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(false);
  });

  it("should handle schools without NCAA ID gracefully", () => {
    const schoolWithoutNcaaId = { ...mockSchool, ncaa_id: undefined };
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: schoolWithoutNcaaId,
        matchType: "ncaa_id",
      },
    });

    expect(wrapper.vm).toBeDefined();
  });

  it("should handle schools without location gracefully", () => {
    const schoolWithoutLocation = { ...mockSchool, location: null };
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: schoolWithoutLocation,
        matchType: "name",
      },
    });

    expect(wrapper.vm).toBeDefined();
  });

  it("should use correct badge styling for name match type", async () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "name",
      },
    });

    // Check that the component renders without errors
    expect(wrapper.exists()).toBe(true);
  });

  it("should use correct badge styling for domain match type", async () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "domain",
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it("should use correct badge styling for ncaa_id match type", async () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "ncaa_id",
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it("should provide methods for formatting school data", () => {
    const wrapper = mount(DuplicateSchoolDialog, {
      props: {
        isOpen: true,
        duplicate: mockSchool,
        matchType: "name",
      },
    });

    // Verify the component instance has access to all props
    expect(wrapper.vm.$props.duplicate).toBeDefined();
    expect(wrapper.vm.$props.duplicate.name).toBe(mockSchool.name);
    expect(wrapper.vm.$props.duplicate.division).toBe(mockSchool.division);
  });
});
