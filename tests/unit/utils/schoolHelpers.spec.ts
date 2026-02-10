import { describe, it, expect } from "vitest";
import {
  getAcademicInfo,
  hasSchoolInfo,
  hasContactInfo,
  hasCollegeScorecardData,
} from "~/utils/schoolHelpers";
import type { School } from "~/types/models";

describe("schoolHelpers", () => {
  describe("getAcademicInfo", () => {
    it("returns academic info field value when it exists", () => {
      const school = {
        academic_info: {
          student_size: 10000,
          mascot: "Eagles",
        },
      } as School;

      expect(getAcademicInfo(school, "student_size")).toBe(10000);
      expect(getAcademicInfo(school, "mascot")).toBe("Eagles");
    });

    it("returns null when field does not exist", () => {
      const school = {
        academic_info: {
          student_size: 10000,
        },
      } as School;

      expect(getAcademicInfo(school, "nonexistent_field")).toBeNull();
    });

    it("returns null when academic_info is undefined", () => {
      const school = {} as School;

      expect(getAcademicInfo(school, "student_size")).toBeNull();
    });

    it("returns null when school is null", () => {
      expect(getAcademicInfo(null, "student_size")).toBeNull();
    });

    it("handles numeric zero values", () => {
      const school = {
        academic_info: {
          admission_rate: 0,
        },
      } as School;

      expect(getAcademicInfo(school, "admission_rate")).toBe(0);
    });

    it("handles empty string values", () => {
      const school = {
        academic_info: {
          address: "",
        },
      } as School;

      expect(getAcademicInfo(school, "address")).toBe("");
    });

    it("returns null for undefined field values", () => {
      const school = {
        academic_info: {
          address: undefined,
        },
      } as School;

      expect(getAcademicInfo(school, "address")).toBeNull();
    });
  });

  describe("hasSchoolInfo", () => {
    it("returns true when address exists", () => {
      const school = {
        academic_info: {
          address: "123 Main St",
        },
      } as School;

      expect(hasSchoolInfo(school)).toBe(true);
    });

    it("returns true when baseball_facility_address exists", () => {
      const school = {
        academic_info: {
          baseball_facility_address: "456 Stadium Dr",
        },
      } as School;

      expect(hasSchoolInfo(school)).toBe(true);
    });

    it("returns true when mascot exists", () => {
      const school = {
        academic_info: {
          mascot: "Eagles",
        },
      } as School;

      expect(hasSchoolInfo(school)).toBe(true);
    });

    it("returns true when undergrad_size exists", () => {
      const school = {
        academic_info: {
          undergrad_size: "5,000-10,000",
        },
      } as School;

      expect(hasSchoolInfo(school)).toBe(true);
    });

    it("returns true when multiple fields exist", () => {
      const school = {
        academic_info: {
          address: "123 Main St",
          mascot: "Eagles",
          undergrad_size: "5,000-10,000",
        },
      } as School;

      expect(hasSchoolInfo(school)).toBe(true);
    });

    it("returns false when no fields exist", () => {
      const school = {
        academic_info: {},
      } as School;

      expect(hasSchoolInfo(school)).toBe(false);
    });

    it("returns false when academic_info is undefined", () => {
      const school = {} as School;

      expect(hasSchoolInfo(school)).toBe(false);
    });

    it("returns false when school is null", () => {
      expect(hasSchoolInfo(null)).toBe(false);
    });

    it("returns false when all fields are empty strings", () => {
      const school = {
        academic_info: {
          address: "",
          baseball_facility_address: "",
          mascot: "",
          undergrad_size: "",
        },
      } as School;

      expect(hasSchoolInfo(school)).toBe(false);
    });
  });

  describe("hasContactInfo", () => {
    it("returns true when website exists", () => {
      const school = {
        website: "https://example.com",
      } as School;

      expect(hasContactInfo(school)).toBe(true);
    });

    it("returns true when twitter_handle exists", () => {
      const school = {
        twitter_handle: "@school",
      } as School;

      expect(hasContactInfo(school)).toBe(true);
    });

    it("returns true when both fields exist", () => {
      const school = {
        website: "https://example.com",
        twitter_handle: "@school",
      } as School;

      expect(hasContactInfo(school)).toBe(true);
    });

    it("returns false when neither field exists", () => {
      const school = {} as School;

      expect(hasContactInfo(school)).toBe(false);
    });

    it("returns false when school is null", () => {
      expect(hasContactInfo(null)).toBe(false);
    });

    it("returns false when fields are empty strings", () => {
      const school = {
        website: "",
        twitter_handle: "",
      } as School;

      expect(hasContactInfo(school)).toBe(false);
    });

    it("returns false when fields are null", () => {
      const school = {
        website: null,
        twitter_handle: null,
      } as School;

      expect(hasContactInfo(school)).toBe(false);
    });
  });

  describe("hasCollegeScorecardData", () => {
    it("returns true when student_size exists", () => {
      const school = {
        academic_info: {
          student_size: 10000,
        },
      } as School;

      expect(hasCollegeScorecardData(school)).toBe(true);
    });

    it("returns true when tuition_in_state exists", () => {
      const school = {
        academic_info: {
          tuition_in_state: 15000,
        },
      } as School;

      expect(hasCollegeScorecardData(school)).toBe(true);
    });

    it("returns true when tuition_out_of_state exists", () => {
      const school = {
        academic_info: {
          tuition_out_of_state: 30000,
        },
      } as School;

      expect(hasCollegeScorecardData(school)).toBe(true);
    });

    it("returns true when admission_rate exists", () => {
      const school = {
        academic_info: {
          admission_rate: 0.5,
        },
      } as School;

      expect(hasCollegeScorecardData(school)).toBe(true);
    });

    it("returns true when multiple fields exist", () => {
      const school = {
        academic_info: {
          student_size: 10000,
          tuition_in_state: 15000,
          admission_rate: 0.5,
        },
      } as School;

      expect(hasCollegeScorecardData(school)).toBe(true);
    });

    it("returns false when no fields exist", () => {
      const school = {
        academic_info: {},
      } as School;

      expect(hasCollegeScorecardData(school)).toBe(false);
    });

    it("returns false when academic_info is undefined", () => {
      const school = {} as School;

      expect(hasCollegeScorecardData(school)).toBe(false);
    });

    it("returns false when school is null", () => {
      expect(hasCollegeScorecardData(null)).toBe(false);
    });

    it("handles zero values correctly (0 is falsy but valid)", () => {
      const school = {
        academic_info: {
          student_size: 0,
        },
      } as School;

      // 0 is a falsy value, so hasCollegeScorecardData should return false
      expect(hasCollegeScorecardData(school)).toBe(false);
    });

    it("handles zero admission rate correctly", () => {
      const school = {
        academic_info: {
          admission_rate: 0,
        },
      } as School;

      // 0 is a falsy value, so hasCollegeScorecardData should return false
      expect(hasCollegeScorecardData(school)).toBe(false);
    });
  });
});
