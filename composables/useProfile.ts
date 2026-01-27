import { ref, computed, type ComputedRef, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { compressImage, validateImageFile } from "~/utils/image/compressImage";
import type { PreferenceHistoryEntry } from "~/types/models";

export interface UploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

export interface FormattedHistoryEntry extends PreferenceHistoryEntry {
  changes: Array<{
    field: string;
    fieldLabel: string;
    old_value: unknown;
    new_value: unknown;
  }>;
}

/**
 * Field labels for profile edit history
 */
const FIELD_LABELS: Record<string, string> = {
  graduation_year: "Graduation Year",
  high_school: "High School",
  club_team: "Club/Travel Team",
  positions: "Positions",
  bats: "Bats",
  throws: "Throws",
  height_inches: "Height",
  weight_lbs: "Weight",
  gpa: "GPA",
  sat_score: "SAT Score",
  act_score: "ACT Score",
  ncaa_id: "NCAA ID",
  perfect_game_id: "Perfect Game ID",
  prep_baseball_id: "Prep Baseball ID",
  twitter_handle: "Twitter Handle",
  instagram_handle: "Instagram Handle",
  tiktok_handle: "TikTok Handle",
  facebook_url: "Facebook Profile",
  phone: "Phone Number",
  email: "Email",
  allow_share_phone: "Allow Coaches to See Phone",
  allow_share_email: "Allow Coaches to See Email",
  school_name: "School Name",
  school_address: "School Address",
  school_city: "School City",
  school_state: "School State",
  ninth_grade_team: "9th Grade Team",
  ninth_grade_coach: "9th Grade Coach",
  tenth_grade_team: "10th Grade Team",
  tenth_grade_coach: "10th Grade Coach",
  eleventh_grade_team: "11th Grade Team",
  eleventh_grade_coach: "11th Grade Coach",
  twelfth_grade_team: "12th Grade Team",
  twelfth_grade_coach: "12th Grade Coach",
  travel_team_year: "Travel Team Year",
  travel_team_name: "Travel Team Name",
  travel_team_coach: "Travel Team Coach",
};

/**
 * useProfile composable
 * Consolidated from useProfilePhoto + useProfileEditHistory
 * Manages athlete profile including photo uploads and edit history tracking
 *
 * Features:
 * - Upload and delete profile photos with compression
 * - Track upload progress
 * - Fetch and display profile edit history
 * - Format history entries with readable field labels
 */
export const useProfile = (): {
  // Photo State
  uploading: Ref<boolean>;
  uploadProgress: Ref<number>;
  photoError: Ref<string | null>;
  profilePhotoUrl: ComputedRef<string | null>;
  hasProfilePhoto: ComputedRef<boolean>;

  // History State
  editHistory: Ref<FormattedHistoryEntry[]>;
  historyLoading: Ref<boolean>;
  historyError: Ref<string | null>;

  // Computed
  isLoading: ComputedRef<boolean>;

  // Photo Methods
  uploadProfilePhoto: (file: File) => Promise<UploadResult>;
  deleteProfilePhoto: () => Promise<boolean>;

  // History Methods
  fetchEditHistory: () => Promise<void>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  // ============================================================================
  // PHOTO STATE (from useProfilePhoto)
  // ============================================================================
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const photoError = ref<string | null>(null);

  // ============================================================================
  // HISTORY STATE (from useProfileEditHistory)
  // ============================================================================
  const editHistory = ref<FormattedHistoryEntry[]>([]);
  const historyLoading = ref(false);
  const historyError = ref<string | null>(null);

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================

  const profilePhotoUrl = computed<string | null>(() => {
    return userStore.user?.profile_photo_url || null;
  });

  const hasProfilePhoto = computed<boolean>(() => {
    return !!profilePhotoUrl.value;
  });

  const isLoading = computed<boolean>(() => {
    return uploading.value || historyLoading.value;
  });

  // ============================================================================
  // PHOTO METHODS (from useProfilePhoto)
  // ============================================================================

  const uploadProfilePhoto = async (file: File): Promise<UploadResult> => {
    uploading.value = true;
    uploadProgress.value = 0;
    photoError.value = null;

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid image file");
      }

      // Compress image
      uploadProgress.value = 25;
      const compressedFile = await compressImage(file);

      // Upload to storage
      uploadProgress.value = 50;
      const userId = userStore.user?.id;
      if (!userId) {
        throw new Error("User ID not available");
      }

      const storagePath = `${userId}/profile-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(storagePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      if (!uploadData?.path) {
        throw new Error("Upload successful but no path returned");
      }

      // Get public URL
      uploadProgress.value = 75;
      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        throw new Error("Failed to get public URL");
      }

      // Update database
      uploadProgress.value = 90;
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_photo_url: publicUrl })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update user store
      uploadProgress.value = 100;
      userStore.setProfilePhotoUrl(publicUrl);

      return {
        success: true,
        photoUrl: publicUrl,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload photo";
      photoError.value = errorMessage;
      console.error("Profile photo upload error:", err);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      uploading.value = false;
    }
  };

  const deleteProfilePhoto = async (): Promise<boolean> => {
    if (!profilePhotoUrl.value) {
      return false;
    }

    uploading.value = true;
    photoError.value = null;

    try {
      const userId = userStore.user?.id;
      if (!userId) {
        throw new Error("User ID not available");
      }

      // Extract path from URL
      const urlParts = profilePhotoUrl.value.split("/profile-photos/");
      if (urlParts.length < 2) {
        throw new Error("Invalid photo URL format");
      }

      const storagePath = urlParts[1];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("profile-photos")
        .remove([storagePath]);

      if (deleteError) {
        throw deleteError;
      }

      // Clear from database
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_photo_url: null })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update user store
      userStore.setProfilePhotoUrl(null);

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete photo";
      photoError.value = errorMessage;
      console.error("Profile photo deletion error:", err);
      throw err;
    } finally {
      uploading.value = false;
    }
  };

  // ============================================================================
  // HISTORY METHODS (from useProfileEditHistory)
  // ============================================================================

  const fetchEditHistory = async () => {
    historyLoading.value = true;
    historyError.value = null;

    try {
      if (!userStore.user?.id) {
        historyError.value = "User not authenticated";
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("user_preferences")
        .select("preference_history")
        .eq("user_id", userStore.user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No preferences found
          editHistory.value = [];
          return;
        }
        throw fetchError;
      }

      if (!data?.preference_history) {
        editHistory.value = [];
        return;
      }

      // Map history entries with formatted labels, newest first
      editHistory.value = (data.preference_history as PreferenceHistoryEntry[])
        .map((entry) => ({
          ...entry,
          changes: entry.changes.map((change) => ({
            ...change,
            fieldLabel: FIELD_LABELS[change.field] || change.field,
          })),
        }))
        .reverse();
    } catch (err) {
      historyError.value =
        err instanceof Error ? err.message : "Failed to load edit history";
      console.error("Error fetching edit history:", err);
    } finally {
      historyLoading.value = false;
    }
  };

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    // Photo State
    uploading,
    uploadProgress,
    photoError,
    profilePhotoUrl,
    hasProfilePhoto,

    // History State
    editHistory,
    historyLoading,
    historyError,

    // Computed
    isLoading,

    // Photo Methods
    uploadProfilePhoto,
    deleteProfilePhoto,

    // History Methods
    fetchEditHistory,
  };
};
