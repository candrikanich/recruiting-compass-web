import { ref, computed, type ComputedRef, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { compressImage, validateImageFile } from "~/utils/image/compressImage";

export interface UploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

export const useProfilePhoto = (): {
  uploading: Ref<boolean>;
  uploadProgress: Ref<number>;
  error: Ref<string | null>;
  profilePhotoUrl: ComputedRef<string | null>;
  hasProfilePhoto: ComputedRef<boolean>;
  uploadProfilePhoto: (file: File) => Promise<UploadResult>;
  deleteProfilePhoto: () => Promise<boolean>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const uploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);

  const profilePhotoUrl = computed<string | null>(() => {
    return userStore.user?.profile_photo_url || null;
  });

  const hasProfilePhoto = computed<boolean>(() => {
    return !!profilePhotoUrl.value;
  });

  const uploadProfilePhoto = async (file: File): Promise<UploadResult> => {
    uploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

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
      const { data: uploadData, error: uploadError } = await supabase
        .storage.from("profile-photos")
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
      const { data: updateData, error: updateError } = await supabase
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
      error.value = errorMessage;
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
    error.value = null;

    try {
      const userId = userStore.user?.id;
      if (!userId) {
        throw new Error("User ID not available");
      }

      // Extract path from URL
      // URL format: https://example.supabase.co/storage/v1/object/public/profile-photos/{userId}/profile-{timestamp}.jpg
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
      error.value = errorMessage;
      console.error("Profile photo deletion error:", err);
      throw err;
    } finally {
      uploading.value = false;
    }
  };

  return {
    uploading,
    uploadProgress,
    error,
    profilePhotoUrl,
    hasProfilePhoto,
    uploadProfilePhoto,
    deleteProfilePhoto,
  };
};
