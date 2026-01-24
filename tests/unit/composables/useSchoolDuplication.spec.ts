import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import type { School } from "~/types/models";

// Mock data
const mockSchools: School[] = [
  {
    id: "1",
    user_id: "user1",
    name: "University of Arizona",
    website: "https://www.arizona.edu",
    ncaa_id: "ARIZ",
    is_favorite: false,
    pros: [],
    cons: [],
    status: "researching",
    location: null,
    division: null,
    conference: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    notes: null,
  } as School,
  {
    id: "2",
    user_id: "user1",
    name: "Florida State University",
    website: "https://www.fsu.edu",
    ncaa_id: "FSU",
    is_favorite: false,
    pros: [],
    cons: [],
    status: "contacted",
    location: null,
    division: null,
    conference: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    notes: null,
  } as School,
  {
    id: "3",
    user_id: "user1",
    name: "Vanderbilt University",
    website: "https://vanderbilt.edu",
    ncaa_id: "VAND",
    is_favorite: false,
    pros: [],
    cons: [],
    status: "interested",
    location: null,
    division: null,
    conference: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    notes: null,
  } as School,
];

vi.mock("~/composables/useSchools", () => ({
  useSchools: vi.fn(() => ({
    schools: ref(mockSchools),
  })),
}));

import { useSchoolDuplication } from "~/composables/useSchoolDuplication";

describe("useSchoolDuplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isNameDuplicate", () => {
    it("should find duplicate by exact name match", () => {
      const { isNameDuplicate } = useSchoolDuplication();
      const duplicate = isNameDuplicate("University of Arizona");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate with case-insensitive match", () => {
      const { isNameDuplicate } = useSchoolDuplication();
      const duplicate = isNameDuplicate("university of arizona");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate with leading/trailing whitespace", () => {
      const { isNameDuplicate } = useSchoolDuplication();
      const duplicate = isNameDuplicate("  Florida State University  ");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("2");
    });

    it("should not find duplicate for non-existent name", () => {
      const { isNameDuplicate } = useSchoolDuplication();
      const duplicate = isNameDuplicate("Harvard University");
      expect(duplicate).toBeNull();
    });

    it("should return null for empty name", () => {
      const { isNameDuplicate } = useSchoolDuplication();
      const duplicate = isNameDuplicate("");
      expect(duplicate).toBeNull();
    });

    it("should return null for undefined name", () => {
      const { isNameDuplicate } = useSchoolDuplication();
      const duplicate = isNameDuplicate(undefined);
      expect(duplicate).toBeNull();
    });
  });

  describe("isDomainDuplicate", () => {
    it("should find duplicate by exact domain match", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      const duplicate = isDomainDuplicate("https://www.arizona.edu");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate and strip www prefix", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      const duplicate = isDomainDuplicate("https://arizona.edu");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate when existing has www and new doesn't", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      // Vanderbilt is stored without www
      const duplicate = isDomainDuplicate("https://www.vanderbilt.edu");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("3");
    });

    it("should not find duplicate for different domain", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      const duplicate = isDomainDuplicate("https://harvard.edu");
      expect(duplicate).toBeNull();
    });

    it("should return null for invalid URL", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      const duplicate = isDomainDuplicate("not a url");
      expect(duplicate).toBeNull();
    });

    it("should return null for null/undefined URL", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      expect(isDomainDuplicate(null)).toBeNull();
      expect(isDomainDuplicate(undefined)).toBeNull();
    });
  });

  describe("isNCAAAIDuplicate", () => {
    it("should find duplicate by NCAA ID match", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate("ARIZ");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("1");
    });

    it("should find duplicate with case-insensitive NCAA ID", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate("fsu");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("2");
    });

    it("should find duplicate with whitespace in NCAA ID", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate("  VAND  ");
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe("3");
    });

    it("should not find duplicate for non-existent NCAA ID", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate("HARV");
      expect(duplicate).toBeNull();
    });

    it("should return null for empty NCAA ID", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate("");
      expect(duplicate).toBeNull();
    });

    it("should return null for undefined NCAA ID", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate(undefined);
      expect(duplicate).toBeNull();
    });
  });

  describe("findDuplicate", () => {
    it("should prioritize name match over domain and NCAA ID", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({
        name: "University of Arizona",
        website: "https://differentschool.edu",
        ncaa_id: "DIFF",
      });
      expect(result.duplicate?.id).toBe("1");
      expect(result.matchType).toBe("name");
    });

    it("should check domain if name has no match", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({
        name: "New School Name",
        website: "https://fsu.edu",
        ncaa_id: "NEW",
      });
      expect(result.duplicate?.id).toBe("2");
      expect(result.matchType).toBe("domain");
    });

    it("should check NCAA ID if name and domain have no match", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({
        name: "Brand New School",
        website: "https://brandnewschool.edu",
        ncaa_id: "VAND",
      });
      expect(result.duplicate?.id).toBe("3");
      expect(result.matchType).toBe("ncaa_id");
    });

    it("should return null for no duplicates", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({
        name: "Harvard University",
        website: "https://harvard.edu",
        ncaa_id: "HARV",
      });
      expect(result.duplicate).toBeNull();
      expect(result.matchType).toBeNull();
    });

    it("should handle partial school data", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({
        name: "Florida State University",
      });
      expect(result.duplicate?.id).toBe("2");
      expect(result.matchType).toBe("name");
    });

    it("should handle empty partial school data", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({});
      expect(result.duplicate).toBeNull();
      expect(result.matchType).toBeNull();
    });
  });

  describe("hasDuplicate computed", () => {
    it("should return true when duplicate exists", () => {
      const { hasDuplicate } = useSchoolDuplication();
      const result = hasDuplicate.value({
        name: "Vanderbilt University",
      });
      expect(result).toBe(true);
    });

    it("should return false when no duplicate exists", () => {
      const { hasDuplicate } = useSchoolDuplication();
      const result = hasDuplicate.value({
        name: "Yale University",
        website: "https://yale.edu",
      });
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle schools with null ncaa_id", () => {
      const { isNCAAAIDuplicate } = useSchoolDuplication();
      const duplicate = isNCAAAIDuplicate("ARIZ");
      // Should still find the duplicate since one school has ncaa_id
      expect(duplicate).not.toBeNull();
    });

    it("should handle multiple criteria matching same school", () => {
      const { findDuplicate } = useSchoolDuplication();
      const result = findDuplicate({
        name: "University of Arizona",
        website: "https://www.arizona.edu",
        ncaa_id: "ARIZ",
      });
      // Should return name match (highest priority)
      expect(result.duplicate?.id).toBe("1");
      expect(result.matchType).toBe("name");
    });

    it("should handle URL with subdomain", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      const duplicate = isDomainDuplicate("https://subdomain.arizona.edu");
      // Should not match because subdomain changes the domain
      expect(duplicate).toBeNull();
    });

    it("should be case-insensitive for domain matching", () => {
      const { isDomainDuplicate } = useSchoolDuplication();
      const duplicate = isDomainDuplicate("https://www.ARIZONA.EDU");
      // URLs are case-insensitive for domain
      expect(duplicate).not.toBeNull();
    });
  });
});
