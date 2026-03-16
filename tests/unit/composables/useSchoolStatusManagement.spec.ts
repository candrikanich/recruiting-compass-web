import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSchoolStatusManagement } from "~/composables/useSchoolStatusManagement";
import type { School } from "~/types/models";

// Mock useSchools composable
const mockUpdateSchool = vi.fn();
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    updateSchool: mockUpdateSchool,
  }),
}));

// Mock useSchoolStatus composable
const mockUpdateStatus = vi.fn();
vi.mock("~/composables/useSchoolStatus", () => ({
  useSchoolStatus: () => ({
    updateStatus: mockUpdateStatus,
  }),
}));

describe("useSchoolStatusManagement", () => {
  const schoolId = "school-123";
  const mockSchool: School = {
    id: schoolId,
    name: "Test School",
    location: "Test City",
    division: "D1",
    status: "researching",
    is_favorite: false,
  } as School;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateStatus", () => {
    it("updates school status successfully", async () => {
      const updatedSchool = { ...mockSchool, status: "contacted" };
      mockUpdateStatus.mockResolvedValue(updatedSchool);

      const { updateStatus, statusUpdating } =
        useSchoolStatusManagement(schoolId);

      expect(statusUpdating.value).toBe(false);

      const promise = updateStatus("contacted");
      expect(statusUpdating.value).toBe(true);

      const result = await promise;

      expect(mockUpdateStatus).toHaveBeenCalledWith(schoolId, "contacted");
      expect(result).toEqual(updatedSchool);
      expect(statusUpdating.value).toBe(false);
    });

    it("sets loading state during update", async () => {
      mockUpdateStatus.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockSchool), 100)),
      );

      const { updateStatus, statusUpdating } =
        useSchoolStatusManagement(schoolId);

      const promise = updateStatus("interested");
      expect(statusUpdating.value).toBe(true);

      await promise;
      expect(statusUpdating.value).toBe(false);
    });

    it("handles update error and clears loading state", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockUpdateStatus.mockRejectedValue(new Error("Update failed"));

      const { updateStatus, statusUpdating } =
        useSchoolStatusManagement(schoolId);

      const result = await updateStatus("interested");

      expect(result).toBeNull();
      expect(statusUpdating.value).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[useSchoolStatusManagement]"),
        "Failed to update status:",
        expect.objectContaining({ message: "Update failed" }),
      );

      consoleErrorSpy.mockRestore();
    });

    it("returns null when update fails", async () => {
      mockUpdateStatus.mockResolvedValue(null);

      const { updateStatus } = useSchoolStatusManagement(schoolId);
      const result = await updateStatus("interested");

      expect(result).toBeNull();
    });

    it("updates to different status values", async () => {
      const statuses = [
        "researching",
        "contacted",
        "interested",
        "offer_received",
        "committed",
      ];

      const { updateStatus } = useSchoolStatusManagement(schoolId);

      for (const status of statuses) {
        const updatedSchool = { ...mockSchool, status };
        mockUpdateStatus.mockResolvedValue(updatedSchool);

        const result = await updateStatus(status);
        expect(result?.status).toBe(status);
      }
    });
  });

  describe("toggleFavorite", () => {
    it("toggles favorite from false to true", async () => {
      const updatedSchool = { ...mockSchool, is_favorite: true };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { toggleFavorite } = useSchoolStatusManagement(schoolId);
      const result = await toggleFavorite(mockSchool);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        is_favorite: true,
      });
      expect(result?.is_favorite).toBe(true);
    });

    it("toggles favorite from true to false", async () => {
      const favoriteSchool = { ...mockSchool, is_favorite: true };
      const updatedSchool = { ...mockSchool, is_favorite: false };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { toggleFavorite } = useSchoolStatusManagement(schoolId);
      const result = await toggleFavorite(favoriteSchool);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        is_favorite: false,
      });
      expect(result?.is_favorite).toBe(false);
    });

    it("returns null when update fails", async () => {
      mockUpdateSchool.mockResolvedValue(null);

      const { toggleFavorite } = useSchoolStatusManagement(schoolId);
      const result = await toggleFavorite(mockSchool);

      expect(result).toBeNull();
    });

    it("handles update error", async () => {
      mockUpdateSchool.mockRejectedValue(new Error("Update failed"));

      const { toggleFavorite } = useSchoolStatusManagement(schoolId);

      await expect(toggleFavorite(mockSchool)).rejects.toThrow("Update failed");
    });

    it("toggles multiple times correctly", async () => {
      const { toggleFavorite } = useSchoolStatusManagement(schoolId);

      // Toggle to true
      let updatedSchool = { ...mockSchool, is_favorite: true };
      mockUpdateSchool.mockResolvedValue(updatedSchool);
      let result = await toggleFavorite(mockSchool);
      expect(result?.is_favorite).toBe(true);

      // Toggle back to false
      updatedSchool = { ...mockSchool, is_favorite: false };
      mockUpdateSchool.mockResolvedValue(updatedSchool);
      result = await toggleFavorite({ ...mockSchool, is_favorite: true });
      expect(result?.is_favorite).toBe(false);

      // Toggle to true again
      updatedSchool = { ...mockSchool, is_favorite: true };
      mockUpdateSchool.mockResolvedValue(updatedSchool);
      result = await toggleFavorite(mockSchool);
      expect(result?.is_favorite).toBe(true);
    });
  });

});
