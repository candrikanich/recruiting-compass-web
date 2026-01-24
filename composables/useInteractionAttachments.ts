import { ref } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";

export const useInteractionAttachments = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const uploading = ref(false);
  const uploadProgress = ref(0);

  /**
   * Upload files to Supabase Storage for an interaction
   * @param interactionId - The interaction ID
   * @param files - Files to upload
   * @returns Array of URLs to uploaded files
   */
  const uploadAttachments = async (
    interactionId: string,
    files: File[],
  ): Promise<string[]> => {
    if (!userStore.user || files.length === 0) {
      return [];
    }

    uploading.value = true;
    uploadProgress.value = 0;
    const uploadedUrls: string[] = [];

    try {
      const userId = userStore.user.id;
      const bucket = "interaction-attachments";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file
        if (!isValidFile(file)) {
          throw new Error(`File ${file.name} is not supported`);
        }

        // Create unique file path
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = file.name.split(".").pop() || "";
        const fileName = `${userId}/${interactionId}/${timestamp}-${random}.${extension}`;

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }

        // Update progress
        uploadProgress.value = Math.round(((i + 1) / files.length) * 100);
      }

      return uploadedUrls;
    } finally {
      uploading.value = false;
      uploadProgress.value = 0;
    }
  };

  /**
   * Delete a file from Supabase Storage
   * @param fileUrl - The public URL of the file
   */
  const deleteAttachment = async (fileUrl: string): Promise<boolean> => {
    try {
      const bucket = "interaction-attachments";

      // Extract file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/interaction-attachments/[path]
      const urlParts = fileUrl.split(`/${bucket}/`);
      if (urlParts.length !== 2) {
        throw new Error("Invalid file URL");
      }

      const filePath = urlParts[1];

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (err) {
      console.error("Error deleting attachment:", err);
      return false;
    }
  };

  /**
   * Validate file type and size
   */
  const isValidFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];

    return file.size <= maxSize && allowedTypes.includes(file.type);
  };

  /**
   * Get file icon based on type
   */
  const getFileIcon = (fileUrl: string): string => {
    const extension = fileUrl.split(".").pop()?.toLowerCase() || "";

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
      return "🖼️";
    } else if (extension === "pdf") {
      return "📄";
    } else if (["doc", "docx"].includes(extension)) {
      return "📝";
    } else if (["xls", "xlsx"].includes(extension)) {
      return "📊";
    } else if (["mp4", "mov", "avi"].includes(extension)) {
      return "🎥";
    } else {
      return "📎";
    }
  };

  /**
   * Get human-readable file name from URL
   */
  const getFileName = (fileUrl: string): string => {
    const parts = fileUrl.split("/");
    const lastPart = parts[parts.length - 1];
    // Remove timestamp and random suffix
    const cleaned = lastPart.replace(/^\d+-[a-z0-9]+\./, "");
    return decodeURIComponent(cleaned) || "Attachment";
  };

  return {
    uploading,
    uploadProgress,
    uploadAttachments,
    deleteAttachment,
    isValidFile,
    getFileIcon,
    getFileName,
  };
};
