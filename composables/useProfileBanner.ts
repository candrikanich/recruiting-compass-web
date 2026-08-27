import { ref, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useProfileBanner");

const BUCKET = "profile-banners";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Validates + uploads a public-profile banner image to Supabase Storage.
 * Rejects oversize (>4MB) and non-accepted types (jpeg/png/webp only)
 * BEFORE attempting an upload.
 */
export const useProfileBanner = (): {
  uploading: Ref<boolean>;
  error: Ref<string | null>;
  uploadBanner: (file: File) => Promise<string>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const uploading = ref(false);
  const error = ref<string | null>(null);

  const fail = (message: string): never => {
    error.value = message;
    throw new Error(message);
  };

  const uploadBanner = async (file: File): Promise<string> => {
    uploading.value = true;
    error.value = null;

    try {
      if (file.size > MAX_FILE_SIZE) {
        fail("Image must be smaller than 4 MB.");
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        fail("Please upload a JPEG, PNG, or WebP image.");
      }

      const userId = userStore.user?.id;
      if (!userId) {
        fail("You must be signed in to upload a banner.");
      }

      const extension = EXTENSION_BY_TYPE[file.type] ?? "jpg";
      const path = `${userId}/banner-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        fail("Failed to upload banner. Please try again.");
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        fail("Upload succeeded but no public URL was returned.");
      }

      return publicUrl as string;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload banner.";
      error.value = message;
      logger.error("Profile banner upload error:", err);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      uploading.value = false;
    }
  };

  return { uploading, error, uploadBanner };
};
