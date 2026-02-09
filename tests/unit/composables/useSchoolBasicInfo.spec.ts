import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSchoolBasicInfo } from "~/composables/useSchoolBasicInfo";
import type { School } from "~/types/models";

// Mock useSchools composable
const mockUpdateSchool = vi.fn();
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    updateSchool: mockUpdateSchool,
  }),
}));

describe("useSchoolBasicInfo", () => {
  const schoolId = "school-123";
  const mockSchool: School = {
    id: schoolId,
    name: "Test School",
    location: "Test City",
    division: "D1",
    status: "researching",
    website: "https://example.com",
    twitter_handle: "@testschool",
    instagram_handle: "@testschool_ig",
    academic_info: {
      address: "123 Main St",
      baseball_facility_address: "456 Stadium Dr",
      mascot: "Eagles",
      undergrad_size: "5,000-10,000",
      distance_from_home: 50,
    },
  } as School;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("initializes with default empty values", () => {
      const { editedBasicInfo, editingBasicInfo } =
        useSchoolBasicInfo(schoolId);

      expect(editingBasicInfo.value).toBe(false);
      expect(editedBasicInfo.value).toEqual({
        address: "",
        baseball_facility_address: "",
        mascot: "",
        undergrad_size: "",
        distance_from_home: null,
        website: "",
        twitter_handle: "",
        instagram_handle: "",
      });
    });
  });

  describe("initializeForm", () => {
    it("populates form with school data", () => {
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(mockSchool);

      expect(editedBasicInfo.value).toEqual({
        address: "123 Main St",
        baseball_facility_address: "456 Stadium Dr",
        mascot: "Eagles",
        undergrad_size: "5,000-10,000",
        distance_from_home: 50,
        website: "https://example.com",
        twitter_handle: "@testschool",
        instagram_handle: "@testschool_ig",
      });
    });

    it("handles missing academic_info", () => {
      const schoolWithoutAcademicInfo = {
        ...mockSchool,
        academic_info: undefined,
      };
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(schoolWithoutAcademicInfo);

      expect(editedBasicInfo.value.address).toBe("");
      expect(editedBasicInfo.value.baseball_facility_address).toBe("");
      expect(editedBasicInfo.value.mascot).toBe("");
      expect(editedBasicInfo.value.undergrad_size).toBe("");
      expect(editedBasicInfo.value.distance_from_home).toBeNull();
    });

    it("handles null academic_info fields", () => {
      const schoolWithNullFields = {
        ...mockSchool,
        academic_info: {
          address: null,
          baseball_facility_address: null,
          mascot: null,
          undergrad_size: null,
          distance_from_home: null,
        },
      } as School;
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(schoolWithNullFields);

      expect(editedBasicInfo.value.address).toBe("");
      expect(editedBasicInfo.value.distance_from_home).toBeNull();
    });

    it("converts non-string academic info to strings", () => {
      const schoolWithNumbers = {
        ...mockSchool,
        academic_info: {
          address: 123 as unknown as string,
          mascot: 456 as unknown as string,
        },
      } as School;
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(schoolWithNumbers);

      expect(editedBasicInfo.value.address).toBe("123");
      expect(editedBasicInfo.value.mascot).toBe("456");
    });

    it("handles missing contact fields", () => {
      const schoolWithoutContact = {
        ...mockSchool,
        website: undefined,
        twitter_handle: undefined,
        instagram_handle: undefined,
      };
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(schoolWithoutContact);

      expect(editedBasicInfo.value.website).toBe("");
      expect(editedBasicInfo.value.twitter_handle).toBe("");
      expect(editedBasicInfo.value.instagram_handle).toBe("");
    });
  });

  describe("edit mode", () => {
    it("starts in non-editing mode", () => {
      const { editingBasicInfo } = useSchoolBasicInfo(schoolId);
      expect(editingBasicInfo.value).toBe(false);
    });

    it("enters edit mode with startEdit", () => {
      const { editingBasicInfo, startEdit } = useSchoolBasicInfo(schoolId);
      startEdit();
      expect(editingBasicInfo.value).toBe(true);
    });

    it("exits edit mode with cancelEdit", () => {
      const { editingBasicInfo, startEdit, cancelEdit } =
        useSchoolBasicInfo(schoolId);
      startEdit();
      expect(editingBasicInfo.value).toBe(true);

      cancelEdit();
      expect(editingBasicInfo.value).toBe(false);
    });

    it("toggles edit mode multiple times", () => {
      const { editingBasicInfo, startEdit, cancelEdit } =
        useSchoolBasicInfo(schoolId);

      expect(editingBasicInfo.value).toBe(false);
      startEdit();
      expect(editingBasicInfo.value).toBe(true);
      cancelEdit();
      expect(editingBasicInfo.value).toBe(false);
      startEdit();
      expect(editingBasicInfo.value).toBe(true);
    });
  });

  describe("saveBasicInfo", () => {
    it("saves changes successfully", async () => {
      const updatedSchool = {
        ...mockSchool,
        website: "https://newsite.com",
        academic_info: {
          ...mockSchool.academic_info,
          address: "456 New St",
        },
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { editedBasicInfo, initializeForm, saveBasicInfo } =
        useSchoolBasicInfo(schoolId);
      initializeForm(mockSchool);

      editedBasicInfo.value.address = "456 New St";
      editedBasicInfo.value.website = "https://newsite.com";

      const result = await saveBasicInfo(mockSchool);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        website: "https://newsite.com",
        twitter_handle: "@testschool",
        instagram_handle: "@testschool_ig",
        academic_info: {
          ...mockSchool.academic_info,
          address: "456 New St",
          baseball_facility_address: "456 Stadium Dr",
          mascot: "Eagles",
          undergrad_size: "5,000-10,000",
          distance_from_home: 50,
        },
      });
      expect(result).toEqual(updatedSchool);
    });

    it("exits edit mode after successful save", async () => {
      mockUpdateSchool.mockResolvedValue(mockSchool);

      const { editingBasicInfo, startEdit, saveBasicInfo } =
        useSchoolBasicInfo(schoolId);
      startEdit();
      expect(editingBasicInfo.value).toBe(true);

      await saveBasicInfo(mockSchool);
      expect(editingBasicInfo.value).toBe(false);
    });

    it("handles null/empty field values", async () => {
      const updatedSchool = { ...mockSchool };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { editedBasicInfo, saveBasicInfo } = useSchoolBasicInfo(schoolId);

      editedBasicInfo.value.website = "";
      editedBasicInfo.value.twitter_handle = "";

      await saveBasicInfo(mockSchool);

      expect(mockUpdateSchool).toHaveBeenCalledWith(
        schoolId,
        expect.objectContaining({
          website: null,
          twitter_handle: null,
        }),
      );
    });

    it("preserves existing academic_info when saving", async () => {
      const schoolWithExtraFields = {
        ...mockSchool,
        academic_info: {
          ...mockSchool.academic_info,
          student_size: 8000,
          tuition_in_state: 15000,
        },
      } as School;

      mockUpdateSchool.mockResolvedValue(schoolWithExtraFields);

      const { initializeForm, saveBasicInfo } = useSchoolBasicInfo(schoolId);
      initializeForm(schoolWithExtraFields);

      await saveBasicInfo(schoolWithExtraFields);

      expect(mockUpdateSchool).toHaveBeenCalledWith(
        schoolId,
        expect.objectContaining({
          academic_info: expect.objectContaining({
            student_size: 8000,
            tuition_in_state: 15000,
            address: "123 Main St",
          }),
        }),
      );
    });

    it("returns null when update fails", async () => {
      mockUpdateSchool.mockResolvedValue(null);

      const { editingBasicInfo, startEdit, saveBasicInfo } =
        useSchoolBasicInfo(schoolId);
      startEdit();

      const result = await saveBasicInfo(mockSchool);

      expect(result).toBeNull();
      expect(editingBasicInfo.value).toBe(true); // Stays in edit mode on failure
    });

    it("handles update error", async () => {
      mockUpdateSchool.mockRejectedValue(new Error("Update failed"));

      const { saveBasicInfo } = useSchoolBasicInfo(schoolId);

      await expect(saveBasicInfo(mockSchool)).rejects.toThrow("Update failed");
    });
  });

  describe("form field management", () => {
    it("allows updating individual form fields", () => {
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(mockSchool);

      editedBasicInfo.value.address = "New Address";
      expect(editedBasicInfo.value.address).toBe("New Address");

      editedBasicInfo.value.mascot = "Tigers";
      expect(editedBasicInfo.value.mascot).toBe("Tigers");
    });

    it("maintains separate form state from original school", () => {
      const { editedBasicInfo, initializeForm } = useSchoolBasicInfo(schoolId);
      initializeForm(mockSchool);

      const originalAddress = mockSchool.academic_info?.address;
      editedBasicInfo.value.address = "Changed Address";

      expect(mockSchool.academic_info?.address).toBe(originalAddress);
      expect(editedBasicInfo.value.address).toBe("Changed Address");
    });
  });
});
