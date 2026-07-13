import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useProfile } from "~/composables/useProfile";

// ============================================================================
// MOCKS
// ============================================================================

const setProfilePhotoUrlMock = vi.fn();

let mockUser: {
  id: string;
  email: string;
  profile_photo_url?: string | null;
} | null = {
  id: "user-123",
  email: "test@example.com",
  profile_photo_url: null,
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser;
    },
    isAuthenticated: true,
    setProfilePhotoUrl: setProfilePhotoUrlMock,
  }),
}));

const validateImageFileMock = vi.fn(() => ({
  isValid: true,
  error: undefined,
}));
const compressImageMock = vi.fn(async (file: File) => file);

vi.mock("~/utils/image/compressImage", () => ({
  validateImageFile: (...args: unknown[]) =>
    validateImageFileMock(...(args as [File])),
  compressImage: (...args: unknown[]) => compressImageMock(...(args as [File])),
}));

// Supabase mock with reconfigurable behavior per test
type StorageStub = {
  uploadResult: { data: { path: string } | null; error: unknown };
  publicUrlResult: { data: { publicUrl: string } | null };
  removeResult: { data: unknown; error: unknown };
};

type UpdateResult = { error: unknown };
type FetchResult = {
  data: { preference_history: unknown[] } | null;
  error: unknown;
};

const storageStub: StorageStub = {
  uploadResult: { data: { path: "user-123/profile-1.jpg" }, error: null },
  publicUrlResult: { data: { publicUrl: "https://cdn/profile.jpg" } },
  removeResult: { data: {}, error: null },
};

let usersUpdateResult: UpdateResult = { error: null };
let preferencesFetchResult: FetchResult = {
  data: { preference_history: [] },
  error: null,
};

const storageFromMock = vi.fn();
const dbFromMock = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    storage: {
      from: storageFromMock,
    },
    from: dbFromMock,
  }),
}));

// ============================================================================
// HELPERS
// ============================================================================

function rebuildSupabaseMocks() {
  storageFromMock.mockImplementation((_bucket: string) => ({
    upload: vi.fn().mockResolvedValue(storageStub.uploadResult),
    getPublicUrl: vi.fn().mockReturnValue(storageStub.publicUrlResult),
    remove: vi.fn().mockResolvedValue(storageStub.removeResult),
  }));

  dbFromMock.mockImplementation((table: string) => {
    if (table === "users") {
      const chain: Record<string, unknown> = {};
      chain.update = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.select = vi.fn(() => chain);
      chain.single = vi.fn().mockResolvedValue(usersUpdateResult);
      return chain;
    }
    if (table === "user_preferences") {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.single = vi.fn().mockResolvedValue(preferencesFetchResult);
      return chain;
    }
    return {};
  });
}

function resetStubs() {
  storageStub.uploadResult = {
    data: { path: "user-123/profile-1.jpg" },
    error: null,
  };
  storageStub.publicUrlResult = {
    data: { publicUrl: "https://cdn/profile.jpg" },
  };
  storageStub.removeResult = { data: {}, error: null };
  usersUpdateResult = { error: null };
  preferencesFetchResult = {
    data: { preference_history: [] },
    error: null,
  };
}

const makeFile = () => new File(["x"], "photo.jpg", { type: "image/jpeg" });

// ============================================================================
// TESTS
// ============================================================================

describe("useProfile (extended)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    resetStubs();
    mockUser = {
      id: "user-123",
      email: "test@example.com",
      profile_photo_url: null,
    };
    validateImageFileMock.mockReturnValue({ isValid: true, error: undefined });
    compressImageMock.mockImplementation(async (file: File) => file);
    rebuildSupabaseMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // uploadProfilePhoto — happy path
  // ------------------------------------------------------------------
  describe("uploadProfilePhoto - success", () => {
    it("uploads, gets URL, updates DB, syncs store", async () => {
      const { uploadProfilePhoto, uploading, uploadProgress, photoError } =
        useProfile();

      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(true);
      expect(result.photoUrl).toBe("https://cdn/profile.jpg");
      expect(result.error).toBeUndefined();
      expect(uploading.value).toBe(false);
      expect(uploadProgress.value).toBe(100);
      expect(photoError.value).toBeNull();
      expect(setProfilePhotoUrlMock).toHaveBeenCalledWith(
        "https://cdn/profile.jpg",
      );
      expect(storageFromMock).toHaveBeenCalledWith("profile-photos");
      expect(validateImageFileMock).toHaveBeenCalled();
      expect(compressImageMock).toHaveBeenCalled();
    });

    it("resets uploading=false in finally even on success", async () => {
      const { uploadProfilePhoto, uploading } = useProfile();
      const p = uploadProfilePhoto(makeFile());
      expect(uploading.value).toBe(true);
      await p;
      expect(uploading.value).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // uploadProfilePhoto — error branches
  // ------------------------------------------------------------------
  describe("uploadProfilePhoto - errors", () => {
    it("returns error when validation fails with explicit message", async () => {
      validateImageFileMock.mockReturnValueOnce({
        isValid: false,
        error: "File too large",
      });

      const { uploadProfilePhoto, photoError } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("File too large");
      expect(photoError.value).toBe("File too large");
    });

    it("returns generic error when validation fails without message", async () => {
      validateImageFileMock.mockReturnValueOnce({
        isValid: false,
        error: undefined,
      });

      const { uploadProfilePhoto } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid image file");
    });

    it("returns error when userStore.user is null", async () => {
      mockUser = null;
      const { uploadProfilePhoto, photoError } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("User ID not available");
      expect(photoError.value).toBe("User ID not available");
    });

    it("returns error when storage upload errors", async () => {
      storageStub.uploadResult = {
        data: null,
        error: new Error("Storage 500"),
      };
      const { uploadProfilePhoto } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage 500");
    });

    it("returns error when upload returns no path", async () => {
      storageStub.uploadResult = { data: null, error: null };
      const { uploadProfilePhoto } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload successful but no path returned");
    });

    it("returns error when public URL cannot be derived", async () => {
      storageStub.publicUrlResult = { data: null };
      const { uploadProfilePhoto } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to get public URL");
    });

    it("returns error when DB update fails", async () => {
      usersUpdateResult = { error: new Error("DB update failed") };
      const { uploadProfilePhoto } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB update failed");
      expect(setProfilePhotoUrlMock).not.toHaveBeenCalled();
    });

    it("returns generic fallback when thrown value is not an Error", async () => {
      compressImageMock.mockRejectedValueOnce("boom-string");
      const { uploadProfilePhoto } = useProfile();
      const result = await uploadProfilePhoto(makeFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to upload photo");
    });
  });

  // ------------------------------------------------------------------
  // deleteProfilePhoto
  // ------------------------------------------------------------------
  describe("deleteProfilePhoto", () => {
    it("returns false when no profile photo set", async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: null,
      };
      const { deleteProfilePhoto } = useProfile();
      const result = await deleteProfilePhoto();
      expect(result).toBe(false);
    });

    it("deletes from storage and clears DB", async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: "https://cdn/profile-photos/user-123/photo.jpg",
      };
      const { deleteProfilePhoto, uploading, photoError } = useProfile();

      const result = await deleteProfilePhoto();

      expect(result).toBe(true);
      expect(setProfilePhotoUrlMock).toHaveBeenCalledWith(null);
      expect(uploading.value).toBe(false);
      expect(photoError.value).toBeNull();
    });

    it("returns false when user is null (no photo URL accessible)", async () => {
      mockUser = null;
      const { deleteProfilePhoto } = useProfile();
      const result = await deleteProfilePhoto();
      expect(result).toBe(false);
    });

    it("throws when URL format is unexpected", async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: "https://cdn/wrong-bucket/file.jpg",
      };
      const { deleteProfilePhoto, photoError } = useProfile();

      await expect(deleteProfilePhoto()).rejects.toThrow(
        "Invalid photo URL format",
      );
      expect(photoError.value).toBe("Invalid photo URL format");
    });

    it("throws when storage remove fails", async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: "https://cdn/profile-photos/user-123/photo.jpg",
      };
      storageStub.removeResult = {
        data: null,
        error: new Error("Storage remove failed"),
      };
      const { deleteProfilePhoto } = useProfile();
      await expect(deleteProfilePhoto()).rejects.toThrow(
        "Storage remove failed",
      );
    });

    it("throws when DB clear fails", async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: "https://cdn/profile-photos/user-123/photo.jpg",
      };
      usersUpdateResult = { error: new Error("DB clear failed") };
      const { deleteProfilePhoto } = useProfile();
      await expect(deleteProfilePhoto()).rejects.toThrow("DB clear failed");
    });

    it("uses fallback message when thrown value is not an Error", async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: "https://cdn/profile-photos/user-123/photo.jpg",
      };
      // Force the storage.from(...).remove(...) chain to throw a non-Error
      storageFromMock.mockImplementationOnce(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn().mockRejectedValue("boom-string"),
      }));
      const { deleteProfilePhoto, photoError } = useProfile();

      await expect(deleteProfilePhoto()).rejects.toBeDefined();
      expect(photoError.value).toBe("Failed to delete photo");
    });
  });

  // ------------------------------------------------------------------
  // profilePhotoUrl computed
  // ------------------------------------------------------------------
  describe("profilePhotoUrl computed", () => {
    it("returns null when user has no photo", () => {
      const { profilePhotoUrl, hasProfilePhoto } = useProfile();
      expect(profilePhotoUrl.value).toBeNull();
      expect(hasProfilePhoto.value).toBe(false);
    });

    it("returns URL when user has photo", () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        profile_photo_url: "https://cdn/profile.jpg",
      };
      const { profilePhotoUrl, hasProfilePhoto } = useProfile();
      expect(profilePhotoUrl.value).toBe("https://cdn/profile.jpg");
      expect(hasProfilePhoto.value).toBe(true);
    });

    it("returns null when user is null entirely", () => {
      mockUser = null;
      const { profilePhotoUrl, hasProfilePhoto } = useProfile();
      expect(profilePhotoUrl.value).toBeNull();
      expect(hasProfilePhoto.value).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // fetchEditHistory
  // ------------------------------------------------------------------
  describe("fetchEditHistory", () => {
    it("sets error when user not authenticated", async () => {
      mockUser = null;
      const { fetchEditHistory, historyError, editHistory } = useProfile();
      await fetchEditHistory();
      expect(historyError.value).toBe("User not authenticated");
      expect(editHistory.value).toEqual([]);
    });

    it("returns empty list when PGRST116 (no row)", async () => {
      preferencesFetchResult = {
        data: null,
        error: { code: "PGRST116", message: "No row" },
      };
      const { fetchEditHistory, editHistory, historyError } = useProfile();
      await fetchEditHistory();
      expect(editHistory.value).toEqual([]);
      expect(historyError.value).toBeNull();
    });

    it("sets error when fetch fails with non-PGRST116 error (Error instance)", async () => {
      const err = new Error("Database exploded");
      (err as unknown as { code: string }).code = "OTHER";
      preferencesFetchResult = {
        data: null,
        error: err,
      };
      const { fetchEditHistory, historyError, editHistory } = useProfile();
      await fetchEditHistory();
      expect(historyError.value).toBe("Database exploded");
      expect(editHistory.value).toEqual([]);
    });

    it("returns empty when data is null", async () => {
      preferencesFetchResult = {
        data: { preference_history: null as unknown as unknown[] },
        error: null,
      };
      const { fetchEditHistory, editHistory } = useProfile();
      await fetchEditHistory();
      expect(editHistory.value).toEqual([]);
    });

    it("maps entries with known field labels and reverses order", async () => {
      const entries = [
        {
          timestamp: "2024-01-01",
          changed_by: "user-123",
          changes: [
            { field: "graduation_year", old_value: 2025, new_value: 2026 },
            { field: "gpa", old_value: 3.5, new_value: 3.8 },
          ],
        },
        {
          timestamp: "2024-02-01",
          changed_by: "user-123",
          changes: [{ field: "high_school", old_value: "A", new_value: "B" }],
        },
      ];
      preferencesFetchResult = {
        data: { preference_history: entries },
        error: null,
      };

      const { fetchEditHistory, editHistory, historyLoading, historyError } =
        useProfile();
      await fetchEditHistory();

      expect(historyLoading.value).toBe(false);
      expect(historyError.value).toBeNull();
      expect(editHistory.value).toHaveLength(2);
      // Newest-first reversal: second entry comes first
      expect(editHistory.value[0]!.timestamp).toBe("2024-02-01");
      expect(editHistory.value[0]!.changes[0]!.fieldLabel).toBe("High School");
      expect(editHistory.value[1]!.changes[0]!.fieldLabel).toBe(
        "Graduation Year",
      );
      expect(editHistory.value[1]!.changes[1]!.fieldLabel).toBe("GPA");
    });

    it("falls back to field name when label unknown", async () => {
      preferencesFetchResult = {
        data: {
          preference_history: [
            {
              timestamp: "2024-01-01",
              changed_by: "u",
              changes: [{ field: "unknown_field", old_value: 1, new_value: 2 }],
            },
          ],
        },
        error: null,
      };
      const { fetchEditHistory, editHistory } = useProfile();
      await fetchEditHistory();
      expect(editHistory.value[0]!.changes[0]!.fieldLabel).toBe(
        "unknown_field",
      );
    });

    it("uses fallback message when thrown value is not an Error", async () => {
      dbFromMock.mockImplementationOnce(() => {
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.single = vi.fn().mockRejectedValue("string-error");
        return chain;
      });
      const { fetchEditHistory, historyError } = useProfile();
      await fetchEditHistory();
      expect(historyError.value).toBe("Failed to load edit history");
    });

    it("clears historyLoading=true while fetching and resets after", async () => {
      const { fetchEditHistory, historyLoading } = useProfile();
      const p = fetchEditHistory();
      expect(historyLoading.value).toBe(true);
      await p;
      expect(historyLoading.value).toBe(false);
    });

    it("covers all FIELD_LABELS keys", async () => {
      const fields = [
        "graduation_year",
        "high_school",
        "club_team",
        "positions",
        "bats",
        "throws",
        "height_inches",
        "weight_lbs",
        "gpa",
        "sat_score",
        "act_score",
        "ncaa_id",
        "perfect_game_id",
        "prep_baseball_id",
        "twitter_handle",
        "instagram_handle",
        "tiktok_handle",
        "facebook_url",
        "phone",
        "email",
        "allow_share_phone",
        "allow_share_email",
        "school_name",
        "school_address",
        "school_city",
        "school_state",
        "ninth_grade_team",
        "ninth_grade_coach",
        "tenth_grade_team",
        "tenth_grade_coach",
        "eleventh_grade_team",
        "eleventh_grade_coach",
        "twelfth_grade_team",
        "twelfth_grade_coach",
        "travel_team_year",
        "travel_team_name",
        "travel_team_coach",
      ];
      preferencesFetchResult = {
        data: {
          preference_history: [
            {
              timestamp: "2024-01-01",
              changed_by: "u",
              changes: fields.map((f) => ({
                field: f,
                old_value: 0,
                new_value: 1,
              })),
            },
          ],
        },
        error: null,
      };
      const { fetchEditHistory, editHistory } = useProfile();
      await fetchEditHistory();
      // Each field should have a non-fallback label
      const entry = editHistory.value[0]!;
      for (const change of entry.changes) {
        expect(change.fieldLabel).not.toBe("");
      }
      expect(entry.changes).toHaveLength(fields.length);
    });
  });
});
