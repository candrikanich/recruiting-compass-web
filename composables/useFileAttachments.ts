import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";

/**
 * Unified file attachment composable
 * Combines file upload, download, delete, and validation logic
 * Replaces useAttachments and useInteractionAttachments
 */
export const useFileAttachments = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const uploading = ref(false);
  const uploadProgress = ref(0);

  // File validation rules
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  /**
   * Validate file type and size
   */
  const isValidFile = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE && ALLOWED_TYPES.includes(file.type);
  };

  /**
   * Upload files to Supabase Storage for an interaction
   * @param interactionId - The interaction ID
   * @param files - Files to upload
   * @returns Array of public URLs to uploaded files
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
          console.error(`File ${file.name} is not supported`);
          continue;
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
          console.error(`Failed to upload ${file.name}: ${error.message}`);
          continue;
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
   * Download an attachment by file path
   * @param filepath - The file path in storage
   * @param filename - Optional custom filename for download
   */
  const downloadAttachment = async (filepath: string, filename?: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("interaction-attachments")
        .download(filepath);

      if (error) throw error;

      // Create blob and download
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || filepath.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download attachment:", err);
    }
  };

  /**
   * Delete an attachment by file URL
   * @param fileUrl - The public URL of the file
   * @returns Boolean indicating success
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
   * Get public download URL for a file path
   */
  const getDownloadUrl = (filepath: string): string => {
    const { data } = supabase.storage
      .from("interaction-attachments")
      .getPublicUrl(filepath);
    return data.publicUrl;
  };

  /**
   * Get file icon emoji based on file type
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
    downloadAttachment,
    deleteAttachment,
    getDownloadUrl,
    isValidFile,
    getFileIcon,
    getFileName,
  };
};
