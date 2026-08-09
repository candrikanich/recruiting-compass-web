import {
  ref,
  computed,
  watch,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { compressImage, validateImageFile } from "~/utils/image/compressImage";
import type { UploadResult } from "./useProfile";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useProfilePhoto");

/**
 * Profile-photo composable.
 *
 * @param targetUserId Whose photo to view/edit. Omit (or null) for the logged-in user's
 *   own photo. Pass a family athlete's id so a parent can view AND edit the athlete's photo
 *   — writes go through the `set_athlete_profile_photo` RPC (authorizes self or family athlete)
 *   and storage under the athlete's folder (family-write RLS).
 */
export const useProfilePhoto = (
  targetUserId?: MaybeRefOrGetter<string | null>,
): {
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

  // Effective subject of this composable: an explicit target, else the logged-in user.
  const effectiveId = computed<string | null>(
    () => toValue(targetUserId) ?? userStore.user?.id ?? null,
  );
  const isSelf = computed<boolean>(
    () => !!effectiveId.value && effectiveId.value === userStore.user?.id,
  );

  // Another family member's photo (athlete) is fetched on demand; self reads the store.
  const remotePhotoUrl = ref<string | null>(null);

  const loadRemotePhoto = async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("profile_photo_url")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) {
      logger.error("Failed to load athlete profile photo:", fetchError);
      return;
    }
    remotePhotoUrl.value =
      (data as { profile_photo_url: string | null } | null)?.profile_photo_url ??
      null;
  };

  watch(
    [effectiveId, isSelf],
    ([id, self]) => {
      if (id && !self) {
        void loadRemotePhoto(id);
      } else {
        remotePhotoUrl.value = null;
      }
    },
    { immediate: true },
  );

  const profilePhotoUrl = computed<string | null>(() => {
    return isSelf.value
      ? userStore.user?.profile_photo_url || null
      : remotePhotoUrl.value;
  });

  const hasProfilePhoto = computed<boolean>(() => {
    return !!profilePhotoUrl.value;
  });

  /** Persists the photo URL for the effective user via the family-aware RPC. */
  const persistPhotoUrl = async (userId: string, url: string | null) => {
    // Cast: the generated Database types don't yet include this RPC.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)(
      "set_athlete_profile_photo",
      { athlete_id: userId, photo_url: url },
    );
    if (rpcError) {
      throw rpcError;
    }
    if (isSelf.value) {
      userStore.setProfilePhotoUrl(url);
    } else {
      remotePhotoUrl.value = url;
    }
  };

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
      const userId = effectiveId.value;
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

      // Persist (self or family athlete) via RPC
      uploadProgress.value = 90;
      await persistPhotoUrl(userId, publicUrl);

      uploadProgress.value = 100;
      return {
        success: true,
        photoUrl: publicUrl,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload photo";
      error.value = errorMessage;
      logger.error("Profile photo upload error:", err);

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
      const userId = effectiveId.value;
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

      // Clear (self or family athlete) via RPC
      await persistPhotoUrl(userId, null);

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete photo";
      error.value = errorMessage;
      logger.error("Profile photo deletion error:", err);
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
