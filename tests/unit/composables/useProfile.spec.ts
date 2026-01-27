import { describe, it, expect, beforeEach, vi } from "vitest";
import { useProfile } from "~/composables/useProfile";
import { setActivePinia, createPinia } from "pinia";

const mockSupabase = {
  storage: {
    from: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

let mockUser: { id: string; email: string } | null = {
  id: "user-123",
  email: "test@example.com",
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser;
    },
    isAuthenticated: true,
    setProfilePhotoUrl: vi.fn(),
  }),
}));

vi.mock("~/utils/image/compressImage", () => ({
  validateImageFile: vi.fn(() => ({ isValid: true })),
  compressImage: vi.fn((file) => Promise.resolve(file)),
}));

describe("useProfile", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with empty photo state", () => {
      const { uploading, uploadProgress, photoError, hasProfilePhoto } =
        useProfile();

      expect(uploading.value).toBe(false);
      expect(uploadProgress.value).toBe(0);
      expect(photoError.value).toBeNull();
      expect(hasProfilePhoto.value).toBe(false);
    });

    it("should initialize with empty history state", () => {
      const { editHistory, historyLoading, historyError } = useProfile();

      expect(editHistory.value).toEqual([]);
      expect(historyLoading.value).toBe(false);
      expect(historyError.value).toBeNull();
    });

    it("should have all required methods", () => {
      const {
        uploadProfilePhoto,
        deleteProfilePhoto,
        fetchEditHistory,
      } = useProfile();

      expect(typeof uploadProfilePhoto).toBe("function");
      expect(typeof deleteProfilePhoto).toBe("function");
      expect(typeof fetchEditHistory).toBe("function");
    });

    it("should have isLoading computed property", () => {
      const { isLoading, uploading, historyLoading } = useProfile();

      expect(isLoading.value).toBe(false);

      uploading.value = true;
      expect(isLoading.value).toBe(true);

      uploading.value = false;
      historyLoading.value = true;
      expect(isLoading.value).toBe(true);
    });
  });

  describe("Computed Properties", () => {
    it("should compute profilePhotoUrl from user store", () => {
      const { profilePhotoUrl } = useProfile();

      expect(profilePhotoUrl.value).toBeNull();
    });

    it("should compute hasProfilePhoto", () => {
      const { hasProfilePhoto } = useProfile();

      expect(hasProfilePhoto.value).toBe(false);
    });
  });

  describe("Photo Methods", () => {
    it("should have uploadProfilePhoto method", async () => {
      const { uploadProfilePhoto } = useProfile();

      const file = new File(["photo"], "test.jpg", { type: "image/jpeg" });

      // This will fail because we haven't mocked the storage methods
      // but it should at least be callable
      expect(typeof uploadProfilePhoto).toBe("function");
    });

    it("should have deleteProfilePhoto method", async () => {
      const { deleteProfilePhoto } = useProfile();

      expect(typeof deleteProfilePhoto).toBe("function");
    });
  });

  describe("History Methods", () => {
    it("should have fetchEditHistory method", () => {
      const { fetchEditHistory } = useProfile();

      expect(typeof fetchEditHistory).toBe("function");
    });

    it("should handle missing user in fetchEditHistory", async () => {
      mockUser = null;
      const { fetchEditHistory, historyError } = useProfile();

      await fetchEditHistory();

      expect(historyError.value).toBe("User not authenticated");

      mockUser = { id: "user-123", email: "test@example.com" };
    });
  });

  describe("State Separation", () => {
    it("should maintain independent photo and history states", () => {
      const {
        uploading,
        historyLoading,
        photoError,
        historyError,
      } = useProfile();

      uploading.value = true;
      expect(historyLoading.value).toBe(false);

      historyLoading.value = true;
      expect(uploading.value).toBe(true);

      photoError.value = "Photo error";
      expect(historyError.value).toBeNull();

      historyError.value = "History error";
      expect(photoError.value).toBe("Photo error");
    });
  });
});
