import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolInformationCard from "~/components/School/SchoolInformationCard.vue";
import type { School } from "~/types/models";

// Mock child components
vi.mock("~/components/School/SchoolMap.vue", () => ({
  default: {
    name: "SchoolMap",
    template: "<div>School Map</div>",
    props: ["latitude", "longitude", "school-name"],
  },
}));

// Mock utils
vi.mock("~/utils/schoolHelpers", () => ({
  getAcademicInfo: vi.fn((school, key) => school?.academic_info?.[key]),
  hasContactInfo: vi.fn(
    (school) =>
      !!(
        school?.academic_info?.address ||
        school?.website ||
        school?.twitter_handle ||
        school?.instagram_handle ||
        school?.phone
      ),
  ),
  hasCollegeScorecardData: vi.fn(
    (school) => !!school?.academic_info?.student_size,
  ),
}));

describe("SchoolInformationCard", () => {
  const mockSchool: School = {
    id: "school-123",
    name: "Test University",
    website: "https://test.edu",
    twitter_handle: "@testuniversity",
    instagram_handle: "@testuniversity_ig",
    phone: "(555) 111-2222",
    academic_info: {
      address: "123 Main St",
      latitude: 30.2672,
      longitude: -97.7431,
      student_size: 10000,
      tuition_in_state: 15000,
      tuition_out_of_state: 30000,
      admission_rate: 0.5,
    },
  } as School;

  const mockFormData = {
    address: "123 Main St",
    website: "https://test.edu",
    twitter_handle: "@testuniversity",
    instagram_handle: "@testuniversity_ig",
    phone: "(555) 111-2222",
  };

  const defaultProps = {
    school: mockSchool,
    calculatedDistance: "50 miles",
    collegeDataLoading: false,
    collegeDataError: null,
    editingBasicInfo: false,
    editedBasicInfo: mockFormData,
    isSaving: false,
  };

  describe("rendering", () => {
    it("renders both section headings", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Contact & Social");
      expect(wrapper.text()).toContain("College Data");
    });

    it("renders school map", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const map = wrapper.findComponent({ name: "SchoolMap" });
      expect(map.exists()).toBe(true);
    });

    it("passes coordinates to map", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const map = wrapper.findComponent({ name: "SchoolMap" });
      expect(map.props("latitude")).toBe(30.2672);
      expect(map.props("longitude")).toBe(-97.7431);
      expect(map.props("schoolName")).toBe("Test University");
    });
  });

  describe("distance from home", () => {
    it("displays distance when provided", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Distance from Home:");
      expect(wrapper.text()).toContain("50 miles");
    });

    it("hides distance when null", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, calculatedDistance: null },
      });
      expect(wrapper.text()).not.toContain("Distance from Home:");
    });
  });

  describe("buttons", () => {
    it("renders lookup button when not editing", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const buttons = wrapper.findAll("button");
      const lookupBtn = buttons.find((btn) => btn.text().includes("Lookup"));
      expect(lookupBtn).toBeDefined();
    });

    it("hides lookup button when editing", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      const buttons = wrapper.findAll("button");
      const lookupBtn = buttons.find((btn) => btn.text().includes("Lookup"));
      expect(lookupBtn).toBeUndefined();
    });

    it("renders edit button when not editing", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const buttons = wrapper.findAll("button");
      const editBtn = buttons.find((btn) => btn.text() === "Edit");
      expect(editBtn).toBeDefined();
    });

    it("renders cancel button when editing", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      const buttons = wrapper.findAll("button");
      const cancelBtn = buttons.find((btn) => btn.text() === "Cancel");
      expect(cancelBtn).toBeDefined();
    });

    it("emits lookup-data when lookup clicked", async () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const buttons = wrapper.findAll("button");
      const lookupBtn = buttons.find((btn) => btn.text().includes("Lookup"));
      await lookupBtn?.trigger("click");

      expect(wrapper.emitted("lookup-data")).toBeTruthy();
    });

    it("emits toggle-edit when edit clicked", async () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const buttons = wrapper.findAll("button");
      const editBtn = buttons.find((btn) => btn.text() === "Edit");
      await editBtn?.trigger("click");

      expect(wrapper.emitted("toggle-edit")).toBeTruthy();
    });

    it("disables lookup button when loading", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, collegeDataLoading: true },
      });
      const buttons = wrapper.findAll("button");
      const lookupBtn = buttons.find((btn) =>
        btn.text().includes("Looking up"),
      );
      expect(lookupBtn?.attributes("disabled")).toBeDefined();
    });

    it("shows loading text on lookup button", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, collegeDataLoading: true },
      });
      expect(wrapper.text()).toContain("Looking up...");
    });
  });

  describe("error display", () => {
    it("shows error message when provided", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, collegeDataError: "Failed to fetch data" },
      });
      expect(wrapper.text()).toContain("Failed to fetch data");
    });

    it("hides error when null", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const errorBanner = wrapper.find(".bg-red-50");
      expect(errorBanner.exists()).toBe(false);
    });
  });

  describe("edit form", () => {
    it("shows form when editing", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      const inputs = wrapper.findAll("input");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it("hides form when not editing", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const inputs = wrapper.findAll("input");
      expect(inputs.length).toBe(0);
    });

    it("renders all Contact & Social form fields", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      expect(wrapper.text()).toContain("Campus Address");
      expect(wrapper.text()).toContain("Phone");
      expect(wrapper.text()).toContain("Website");
      expect(wrapper.text()).toContain("Twitter Handle");
      expect(wrapper.text()).toContain("Instagram Handle");
    });

    it("does not render removed school-detail fields", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      expect(wrapper.text()).not.toContain("Baseball Facility");
      expect(wrapper.text()).not.toContain("Mascot");
      expect(wrapper.text()).not.toContain("Undergraduate Size");
    });

    it("renders save button in edit mode", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      const buttons = wrapper.findAll("button");
      const saveBtn = buttons.find((btn) => btn.text() === "Save");
      expect(saveBtn).toBeDefined();
    });

    it("emits save when save button clicked", async () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true },
      });
      const buttons = wrapper.findAll("button");
      const saveBtn = buttons.find((btn) => btn.text() === "Save");
      await saveBtn?.trigger("click");

      expect(wrapper.emitted("save")).toBeTruthy();
    });

    it("disables save button when saving", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true, isSaving: true },
      });
      const buttons = wrapper.findAll("button");
      const saveBtn = buttons.find((btn) => btn.text().includes("Saving..."));
      expect(saveBtn).toBeDefined();
      expect((saveBtn?.element as HTMLButtonElement).disabled).toBe(true);
    });

    it("shows saving text when saving", () => {
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, editingBasicInfo: true, isSaving: true },
      });
      expect(wrapper.text()).toContain("Saving...");
    });
  });

  describe("display mode - contact and social", () => {
    it("displays campus address", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Address:");
      expect(wrapper.text()).toContain("123 Main St");
    });

    it("displays phone", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Phone:");
      expect(wrapper.text()).toContain("(555) 111-2222");
    });

    it("displays website link", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Website:");
      expect(wrapper.text()).toContain("https://test.edu");
    });

    it("displays twitter handle link", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Twitter:");
      expect(wrapper.text()).toContain("@testuniversity");
    });

    it("displays instagram handle link", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Instagram:");
      expect(wrapper.text()).toContain("@testuniversity_ig");
    });
  });

  describe("display mode - college data", () => {
    it("shows college data section heading", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("College Data");
    });

    it("displays student size", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Students");
      expect(wrapper.text()).toContain("10,000");
    });

    it("displays in-state tuition", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Tuition (In-State)");
      expect(wrapper.text()).toContain("$15,000");
    });

    it("displays out-of-state tuition", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Tuition (Out-of-State)");
      expect(wrapper.text()).toContain("$30,000");
    });

    it("displays admission rate as percentage", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      expect(wrapper.text()).toContain("Admission Rate");
      expect(wrapper.text()).toContain("50%");
    });
  });

  describe("conditional rendering", () => {
    it("shows contact empty state when no contact data", () => {
      const schoolWithoutContact = {
        ...mockSchool,
        website: null,
        twitter_handle: null,
        instagram_handle: null,
        phone: null,
        academic_info: { student_size: 10000 },
      } as School;
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, school: schoolWithoutContact },
      });
      expect(wrapper.text()).not.toContain("Website:");
      expect(wrapper.text()).toContain("No contact info yet");
    });

    it("shows college-data empty state when no scorecard data", () => {
      const schoolWithoutScorecard = {
        ...mockSchool,
        academic_info: { address: "123 Main St" },
      } as School;
      const wrapper = mount(SchoolInformationCard, {
        props: { ...defaultProps, school: schoolWithoutScorecard },
      });
      expect(wrapper.text()).toContain("No college data yet");
    });
  });

  describe("styling", () => {
    it("applies card styling", () => {
      const wrapper = mount(SchoolInformationCard, { props: defaultProps });
      const card = wrapper.find(".bg-white.rounded-xl");
      expect(card.exists()).toBe(true);
    });
  });
});
