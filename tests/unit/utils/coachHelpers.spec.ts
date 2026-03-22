import { describe, it, expect } from "vitest";
import {
  getInitials,
  getSchoolById,
  getSchoolName,
} from "~/utils/coachHelpers";
import type { Coach, School } from "~/types/models";

const mockCoach: Coach = {
  id: "1",
  first_name: "John",
  last_name: "Smith",
  role: "head",
  email: null,
  phone: null,
  twitter_handle: null,
  instagram_handle: null,
  notes: null,
  last_contact_date: null,
};

const mockSchools: School[] = [
  {
    id: "s1",
    user_id: "u1",
    name: "Stanford",
    location: "Stanford, CA",
    division: "D1",
    conference: "Pac-12",
    is_favorite: false,
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    status: "interested",
    notes: null,
    pros: [],
    cons: [],
  },
  {
    id: "s2",
    user_id: "u1",
    name: "UCLA",
    location: "Los Angeles, CA",
    division: "D1",
    conference: "Pac-12",
    is_favorite: false,
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    status: "contacted",
    notes: null,
    pros: [],
    cons: [],
  },
];

describe("coachHelpers", () => {
  describe("getInitials", () => {
    it("returns uppercase initials from first and last name", () => {
      expect(getInitials(mockCoach)).toBe("JS");
    });

    it("uppercases lowercase first letters", () => {
      const coach: Coach = { ...mockCoach, first_name: "alice", last_name: "brown" };
      expect(getInitials(coach)).toBe("AB");
    });

    it("handles single character names", () => {
      const coach: Coach = { ...mockCoach, first_name: "X", last_name: "Y" };
      expect(getInitials(coach)).toBe("XY");
    });
  });

  describe("getSchoolById", () => {
    it("returns undefined when schoolId is undefined", () => {
      expect(getSchoolById(undefined, [])).toBeUndefined();
    });

    it("returns undefined when schoolId is undefined and schools are present", () => {
      expect(getSchoolById(undefined, mockSchools)).toBeUndefined();
    });

    it("returns the matching school when found", () => {
      expect(getSchoolById("s1", mockSchools)).toBe(mockSchools[0]);
    });

    it("returns undefined when no school matches", () => {
      expect(getSchoolById("missing", mockSchools)).toBeUndefined();
    });

    it("returns undefined for empty schools array", () => {
      expect(getSchoolById("s1", [])).toBeUndefined();
    });
  });

  describe("getSchoolName", () => {
    it("returns 'Unknown' when schoolId is undefined", () => {
      expect(getSchoolName(undefined, [])).toBe("Unknown");
    });

    it("returns school name when found", () => {
      expect(getSchoolName("s1", mockSchools)).toBe("Stanford");
    });

    it("returns 'Unknown' when school not found", () => {
      expect(getSchoolName("missing", mockSchools)).toBe("Unknown");
    });

    it("returns second school name when queried", () => {
      expect(getSchoolName("s2", mockSchools)).toBe("UCLA");
    });
  });
});
