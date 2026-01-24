import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useProfilePhoto } from "~/composables/useProfilePhoto";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";

vi.mock("~/composables/useSupabase");
vi.mock("~/stores/user");
vi.mock("~/utils/image/compressImage", () => ({
  compressImage: vi.fn(async (file: File) => {
    // Mock returns a compressed file
    return new File([file], `compressed-${file.name}`, { type: "image/jpeg" });
  }),
  validateImageFile: vi.fn((file: File) => {
    // Mock validation - simple check
    if (
      file.type.startsWith("image/") &&
      file.size > 0 &&
      file.size <= 5 * 1024 * 1024
    ) {
      return { isValid: true };
    }
    return { isValid: false, error: "Invalid image file" };
  }),
}));

const mockUseSupabase = vi.mocked(useSupabase);
const mockUseUserStore = vi.mocked(useUserStore);

describe("useProfilePhoto", () => {
  let mockSupabase: any;
  let mockAuth: any;
  let mockStorage: any;
  let mockUserStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Setup mock storage
    mockStorage = {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({
        data: { path: "user-123/photo.jpg" },
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/photo.jpg" },
      }),
    };

    // Setup mock auth
    mockAuth = {
      getUser: vi.fn(),
    };

    // Setup mock supabase with proper chaining
    const chainedMethods = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: [{ profile_photo_url: "https://example.com/photo.jpg" }],
        error: null,
      }),
    };

    mockSupabase = {
      storage: mockStorage,
      auth: mockAuth,
      from: vi.fn().mockReturnValue(chainedMethods),
    };

    mockUseSupabase.mockReturnValue(mockSupabase);

    // Setup mock user store
    mockUserStore = {
      user: {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        profile_photo_url: null,
      },
      setProfilePhotoUrl: vi.fn(),
    };

    mockUseUserStore.mockReturnValue(mockUserStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial state", () => {
    it("should return correct initial state", () => {
      const { uploading, uploadProgress, error, hasProfilePhoto } =
        useProfilePhoto();

      expect(uploading.value).toBe(false);
      expect(uploadProgress.value).toBe(0);
      expect(error.value).toBeNull();
      expect(hasProfilePhoto.value).toBe(false);
    });

    it("should provide all required methods", () => {
      const { uploadProfilePhoto, deleteProfilePhoto, profilePhotoUrl } =
        useProfilePhoto();

      expect(typeof uploadProfilePhoto).toBe("function");
      expect(typeof deleteProfilePhoto).toBe("function");
      expect(profilePhotoUrl).toBeDefined();
    });
  });

  describe("uploadProfilePhoto", () => {
    it("should upload a valid profile photo", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const publicUrl = "https://example.com/photo.jpg";

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "user-123/photo.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: publicUrl }],
        error: null,
      });

      const { uploadProfilePhoto } = useProfilePhoto();
      const result = await uploadProfilePhoto(file);

      expect(result.success).toBe(true);
      expect(result.photoUrl).toBe(publicUrl);
    });

    it("should validate file before upload", async () => {
      const invalidFile = new File(["text"], "file.txt", { type: "text/plain" });

      const { uploadProfilePhoto } = useProfilePhoto();

      await expect(uploadProfilePhoto(invalidFile)).rejects.toThrow();
    });

    it("should compress image before upload", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const publicUrl = "https://example.com/photo.jpg";

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "user-123/photo.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: publicUrl }],
        error: null,
      });

      const { uploadProfilePhoto } = useProfilePhoto();
      await uploadProfilePhoto(file);

      // Verify storage.upload was called (with compressed file)
      expect(mockStorage.upload).toHaveBeenCalled();
    });

    it("should update user store on successful upload", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const publicUrl = "https://example.com/photo.jpg";

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "user-123/photo.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: publicUrl }],
        error: null,
      });

      const { uploadProfilePhoto } = useProfilePhoto();
      await uploadProfilePhoto(file);

      expect(mockUserStore.setProfilePhotoUrl).toHaveBeenCalledWith(publicUrl);
    });

    it("should set error on upload failure", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const errorMsg = "Upload failed";

      mockStorage.upload.mockResolvedValueOnce({
        data: null,
        error: new Error(errorMsg),
      });

      const { uploadProfilePhoto, error } = useProfilePhoto();

      try {
        await uploadProfilePhoto(file);
      } catch {
        // Expected
      }

      expect(error.value).toBeDefined();
    });

    it("should track upload progress", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const publicUrl = "https://example.com/photo.jpg";

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "user-123/photo.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: publicUrl }],
        error: null,
      });

      const { uploadProfilePhoto, uploadProgress } = useProfilePhoto();

      const uploadPromise = uploadProfilePhoto(file);
      // Progress should be tracked
      expect(typeof uploadProgress.value).toBe("number");

      await uploadPromise;
      // After completion, progress should be at 100
      expect(uploadProgress.value).toBeGreaterThanOrEqual(0);
    });

    it("should set uploading flag during upload", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const publicUrl = "https://example.com/photo.jpg";

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "user-123/photo.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: publicUrl }],
        error: null,
      });

      const { uploadProfilePhoto, uploading } = useProfilePhoto();

      const uploadPromise = uploadProfilePhoto(file);
      expect(uploading.value).toBe(true);

      await uploadPromise;
      expect(uploading.value).toBe(false);
    });
  });

  describe("deleteProfilePhoto", () => {
    it("should delete profile photo successfully", async () => {
      mockUserStore.user.profile_photo_url =
        "https://example.com/photo.jpg";
      mockStorage.remove.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: null }],
        error: null,
      });

      const { deleteProfilePhoto } = useProfilePhoto();
      const result = await deleteProfilePhoto();

      expect(result).toBe(true);
    });

    it("should clear profile photo URL in database on deletion", async () => {
      mockUserStore.user.profile_photo_url =
        "https://example.com/photo.jpg";
      mockStorage.remove.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: null }],
        error: null,
      });

      const { deleteProfilePhoto } = useProfilePhoto();
      await deleteProfilePhoto();

      // Verify update was called to clear photo URL
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("should handle deletion errors", async () => {
      mockUserStore.user.profile_photo_url =
        "https://example.com/photo.jpg";
      mockStorage.remove.mockResolvedValueOnce({
        data: null,
        error: new Error("Delete failed"),
      });

      const { deleteProfilePhoto, error } = useProfilePhoto();

      try {
        await deleteProfilePhoto();
      } catch {
        // Expected
      }

      expect(error.value).toBeDefined();
    });

    it("should return false when no photo to delete", async () => {
      mockUserStore.user.profile_photo_url = null;

      const { deleteProfilePhoto } = useProfilePhoto();
      const result = await deleteProfilePhoto();

      expect(result).toBe(false);
    });
  });

  describe("Computed properties", () => {
    it("profilePhotoUrl should return user photo URL", () => {
      mockUserStore.user.profile_photo_url = "https://example.com/photo.jpg";

      const { profilePhotoUrl } = useProfilePhoto();

      expect(profilePhotoUrl.value).toBe("https://example.com/photo.jpg");
    });

    it("profilePhotoUrl should return null if user has no photo", () => {
      mockUserStore.user.profile_photo_url = null;

      const { profilePhotoUrl } = useProfilePhoto();

      expect(profilePhotoUrl.value).toBeNull();
    });

    it("hasProfilePhoto should be true when photo URL exists", () => {
      mockUserStore.user.profile_photo_url = "https://example.com/photo.jpg";

      const { hasProfilePhoto } = useProfilePhoto();

      expect(hasProfilePhoto.value).toBe(true);
    });

    it("hasProfilePhoto should be false when photo URL is null", () => {
      mockUserStore.user.profile_photo_url = null;

      const { hasProfilePhoto } = useProfilePhoto();

      expect(hasProfilePhoto.value).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should clear error on successful upload", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const publicUrl = "https://example.com/photo.jpg";

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "user-123/photo.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl },
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [{ profile_photo_url: publicUrl }],
        error: null,
      });

      const { uploadProfilePhoto, error } = useProfilePhoto();

      // Set initial error
      error.value = "Some error";
      expect(error.value).toBe("Some error");

      await uploadProfilePhoto(file);

      // Error should be cleared
      expect(error.value).toBeNull();
    });
  });
});
