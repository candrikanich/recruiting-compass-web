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
    priority_tier: "B",
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
        "Failed to update status:",
        expect.any(Error),
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

  describe("updatePriority", () => {
    it("updates priority tier successfully", async () => {
      const updatedSchool = { ...mockSchool, priority_tier: "A" };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { updatePriority, priorityUpdating } =
        useSchoolStatusManagement(schoolId);

      expect(priorityUpdating.value).toBe(false);

      const promise = updatePriority("A");
      expect(priorityUpdating.value).toBe(true);

      const result = await promise;

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        priority_tier: "A",
      });
      expect(result).toEqual(updatedSchool);
      expect(priorityUpdating.value).toBe(false);
    });

    it("sets loading state during update", async () => {
      mockUpdateSchool.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockSchool), 100)),
      );

      const { updatePriority, priorityUpdating } =
        useSchoolStatusManagement(schoolId);

      const promise = updatePriority("C");
      expect(priorityUpdating.value).toBe(true);

      await promise;
      expect(priorityUpdating.value).toBe(false);
    });

    it("handles null priority tier (removes priority)", async () => {
      const updatedSchool = { ...mockSchool, priority_tier: null };
      mockUpdateSchool.mockResolvedValue(updatedSchool);

      const { updatePriority } = useSchoolStatusManagement(schoolId);
      const result = await updatePriority(null);

      expect(mockUpdateSchool).toHaveBeenCalledWith(schoolId, {
        priority_tier: null,
      });
      expect(result?.priority_tier).toBeNull();
    });

    it("updates to different priority tiers", async () => {
      const priorities: Array<"A" | "B" | "C" | null> = ["A", "B", "C", null];

      const { updatePriority } = useSchoolStatusManagement(schoolId);

      for (const tier of priorities) {
        const updatedSchool = { ...mockSchool, priority_tier: tier };
        mockUpdateSchool.mockResolvedValue(updatedSchool);

        const result = await updatePriority(tier);
        expect(result?.priority_tier).toBe(tier);
      }
    });

    it("clears loading state even on error", async () => {
      mockUpdateSchool.mockRejectedValue(new Error("Update failed"));

      const { updatePriority, priorityUpdating } =
        useSchoolStatusManagement(schoolId);

      try {
        await updatePriority("A");
      } catch {
        // Expected to throw
      }

      expect(priorityUpdating.value).toBe(false);
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

  describe("loading states", () => {
    it("maintains separate loading states for status and priority", async () => {
      mockUpdateStatus.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockSchool), 100)),
      );
      mockUpdateSchool.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockSchool), 100)),
      );

      const { updateStatus, updatePriority, statusUpdating, priorityUpdating } =
        useSchoolStatusManagement(schoolId);

      // Start status update
      const statusPromise = updateStatus("interested");
      expect(statusUpdating.value).toBe(true);
      expect(priorityUpdating.value).toBe(false);

      await statusPromise;
      expect(statusUpdating.value).toBe(false);

      // Start priority update
      const priorityPromise = updatePriority("A");
      expect(statusUpdating.value).toBe(false);
      expect(priorityUpdating.value).toBe(true);

      await priorityPromise;
      expect(priorityUpdating.value).toBe(false);
    });
  });
});
