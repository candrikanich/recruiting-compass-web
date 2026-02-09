import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSchoolProsCons } from "~/composables/useSchoolProsCons";
import type { School } from "~/types/models";

// Mock useSchools composable
const mockUpdateSchool = vi.fn();
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    updateSchool: mockUpdateSchool,
  }),
}));

describe("useSchoolProsCons", () => {
  const schoolId = "school-123";
  const mockSchool: School = {
    id: schoolId,
    name: "Test School",
    location: "Test City",
    division: "D1",
    status: "researching",
    pros: ["Great campus", "Strong program"],
    cons: ["Far from home", "Expensive"],
  } as School;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addPro", () => {
    it("adds a pro to the school", async () => {
      const updatedSchool = {
        ...mockSchool,
        pros: [...mockSchool.pros!, "Excellent facilities"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { addPro } = useSchoolProsCons(schoolId);
      const result = await addPro(mockSchool, "Excellent facilities");

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: ["Great campus", "Strong program", "Excellent facilities"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("adds a pro when pros array is empty", async () => {
      const schoolWithoutPros = { ...mockSchool, pros: [] };
      const updatedSchool = {
        ...schoolWithoutPros,
        pros: ["First pro"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { addPro } = useSchoolProsCons(schoolId);
      const result = await addPro(schoolWithoutPros, "First pro");

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: ["First pro"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("adds a pro when pros is null", async () => {
      const schoolWithNullPros = { ...mockSchool, pros: null };
      const updatedSchool = {
        ...schoolWithNullPros,
        pros: ["First pro"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { addPro } = useSchoolProsCons(schoolId);
      const result = await addPro(schoolWithNullPros, "First pro");

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: ["First pro"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("returns null when pro value is empty string", async () => {
      const { addPro } = useSchoolProsCons(schoolId);
      const result = await addPro(mockSchool, "");

      expect(mockUpdateSchool).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("returns null when pro value is only whitespace", async () => {
      const { addPro } = useSchoolProsCons(schoolId);
      const result = await addPro(mockSchool, "   ");

      expect(mockUpdateSchool).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("handles update failure", async () => {
      mockUpdateSchool.mockResolvedValue(null);

      const { addPro } = useSchoolProsCons(schoolId);
      const result = await addPro(mockSchool, "New pro");

      expect(result).toBeNull();
    });
  });

  describe("removePro", () => {
    it("removes a pro at specified index", async () => {
      const updatedSchool = {
        ...mockSchool,
        pros: ["Strong program"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removePro } = useSchoolProsCons(schoolId);
      const result = await removePro(mockSchool, 0);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: ["Strong program"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("removes last pro", async () => {
      const updatedSchool = {
        ...mockSchool,
        pros: ["Great campus"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removePro } = useSchoolProsCons(schoolId);
      const result = await removePro(mockSchool, 1);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: ["Great campus"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("removes all pros when only one exists", async () => {
      const schoolWithOnePro = { ...mockSchool, pros: ["Only pro"] };
      const updatedSchool = {
        ...schoolWithOnePro,
        pros: [],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removePro } = useSchoolProsCons(schoolId);
      const result = await removePro(schoolWithOnePro, 0);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: [],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("handles null pros array", async () => {
      const schoolWithNullPros = { ...mockSchool, pros: null };
      const updatedSchool = {
        ...schoolWithNullPros,
        pros: [],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removePro } = useSchoolProsCons(schoolId);
      const result = await removePro(schoolWithNullPros, 0);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        pros: [],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("handles update failure", async () => {
      mockUpdateSchool.mockResolvedValue(null);

      const { removePro } = useSchoolProsCons(schoolId);
      const result = await removePro(mockSchool, 0);

      expect(result).toBeNull();
    });
  });

  describe("addCon", () => {
    it("adds a con to the school", async () => {
      const updatedSchool = {
        ...mockSchool,
        cons: [...mockSchool.cons!, "Limited scholarships"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { addCon } = useSchoolProsCons(schoolId);
      const result = await addCon(mockSchool, "Limited scholarships");

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: ["Far from home", "Expensive", "Limited scholarships"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("adds a con when cons array is empty", async () => {
      const schoolWithoutCons = { ...mockSchool, cons: [] };
      const updatedSchool = {
        ...schoolWithoutCons,
        cons: ["First con"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { addCon } = useSchoolProsCons(schoolId);
      const result = await addCon(schoolWithoutCons, "First con");

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: ["First con"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("adds a con when cons is null", async () => {
      const schoolWithNullCons = { ...mockSchool, cons: null };
      const updatedSchool = {
        ...schoolWithNullCons,
        cons: ["First con"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { addCon } = useSchoolProsCons(schoolId);
      const result = await addCon(schoolWithNullCons, "First con");

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: ["First con"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("returns null when con value is empty string", async () => {
      const { addCon } = useSchoolProsCons(schoolId);
      const result = await addCon(mockSchool, "");

      expect(mockUpdateSchool).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("returns null when con value is only whitespace", async () => {
      const { addCon } = useSchoolProsCons(schoolId);
      const result = await addCon(mockSchool, "   ");

      expect(mockUpdateSchool).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("handles update failure", async () => {
      mockUpdateSchool.mockResolvedValue(null);

      const { addCon } = useSchoolProsCons(schoolId);
      const result = await addCon(mockSchool, "New con");

      expect(result).toBeNull();
    });
  });

  describe("removeCon", () => {
    it("removes a con at specified index", async () => {
      const updatedSchool = {
        ...mockSchool,
        cons: ["Expensive"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removeCon } = useSchoolProsCons(schoolId);
      const result = await removeCon(mockSchool, 0);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: ["Expensive"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("removes last con", async () => {
      const updatedSchool = {
        ...mockSchool,
        cons: ["Far from home"],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removeCon } = useSchoolProsCons(schoolId);
      const result = await removeCon(mockSchool, 1);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: ["Far from home"],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("removes all cons when only one exists", async () => {
      const schoolWithOneCon = { ...mockSchool, cons: ["Only con"] };
      const updatedSchool = {
        ...schoolWithOneCon,
        cons: [],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removeCon } = useSchoolProsCons(schoolId);
      const result = await removeCon(schoolWithOneCon, 0);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: [],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("handles null cons array", async () => {
      const schoolWithNullCons = { ...mockSchool, cons: null };
      const updatedSchool = {
        ...schoolWithNullCons,
        cons: [],
      };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { removeCon } = useSchoolProsCons(schoolId);
      const result = await removeCon(schoolWithNullCons, 0);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        cons: [],
      });
      expect(result).toEqual(updatedSchool);
    });

    it("handles update failure", async () => {
      mockUpdateSchool.mockResolvedValue(null);

      const { removeCon } = useSchoolProsCons(schoolId);
      const result = await removeCon(mockSchool, 0);

      expect(result).toBeNull();
    });
  });
});
