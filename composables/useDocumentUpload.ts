import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { Document } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];

// File validation constants
const ALLOWED_MIME_TYPES = {
  highlight_video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  transcript: ["application/pdf", "text/plain"],
  resume: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  rec_letter: ["application/pdf"],
  questionnaire: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  stats_sheet: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

const ALLOWED_EXTENSIONS = {
  highlight_video: [".mp4", ".mov", ".avi"],
  transcript: [".pdf", ".txt"],
  resume: [".pdf", ".doc", ".docx"],
  rec_letter: [".pdf"],
  questionnaire: [".pdf", ".doc", ".docx"],
  stats_sheet: [".csv", ".xls", ".xlsx"],
};

const FILE_SIZE_LIMITS = {
  highlight_video: 100 * 1024 * 1024,
  transcript: 10 * 1024 * 1024,
  resume: 5 * 1024 * 1024,
  rec_letter: 10 * 1024 * 1024,
  questionnaire: 10 * 1024 * 1024,
  stats_sheet: 5 * 1024 * 1024,
};

const validateFile = (
  file: File,
  documentType: string,
): { valid: boolean; error?: string } => {
  const typeKey = documentType as keyof typeof ALLOWED_MIME_TYPES;

  if (!ALLOWED_MIME_TYPES[typeKey]) {
    return { valid: false, error: "Invalid document type" };
  }

  const allowedTypes = ALLOWED_MIME_TYPES[typeKey];
  const allowedExts = ALLOWED_EXTENSIONS[typeKey];
  const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

  const isValidType =
    allowedTypes.includes(file.type) || allowedExts.includes(fileExtension);
  if (!isValidType) {
    return { valid: false, error: `File type not allowed` };
  }

  const maxSize = FILE_SIZE_LIMITS[typeKey];
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size: ${maxMB}MB` };
  }

  return { valid: true };
};

/**
 * Composable for document upload operations
 *
 * ⚠️ DEPRECATED: This composable is deprecated as of Phase 4
 * Use useDocumentsConsolidated() instead for new code
 *
 * Migration guide: See docs/phase-4/DEPRECATION_AUDIT.md
 * Timeline: Will be removed in Phase 5
 *
 * Handles file uploads with progress tracking.
 * For new code, use useDocumentsConsolidated instead.
 *
 * @deprecated Use useDocumentsConsolidated() instead
 *
 * @example
 * // OLD (deprecated)
 * const { uploadDocument, isUploading, uploadProgress } = useDocumentUpload()
 *
 * // NEW (preferred)
 * const { uploadDocument, isUploading, uploadProgress } = useDocumentsConsolidated()
 *
 * @returns Object with upload methods and state
 */
export const useDocumentUpload = () => {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[DEPRECATED] useDocumentUpload is deprecated as of Phase 4. " +
        "Use useDocumentsConsolidated() instead.\n" +
        "Migration guide: See DEPRECATION_AUDIT.md",
    );
  }

  const supabase = useSupabase();
  let userStore: ReturnType<typeof useUserStore> | undefined;
  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore();
    }
    return userStore;
  };

  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);

  const uploadDocument = async (
    documentData: Omit<Document, "id" | "created_at" | "updated_at">,
    file?: File,
  ) => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");
    isUploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    try {
      let fileUrl = documentData.file_url;

      if (file) {
        const validation = validateFile(file, documentData.type);
        if (!validation.valid) {
          throw new Error(validation.error || "File validation failed");
        }

        uploadProgress.value = 10;

        const fileName = `${store.user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file);

        if (uploadError) {
          console.warn("Storage upload failed:", uploadError);
          fileUrl = fileName;
        } else if (uploadData) {
          fileUrl = uploadData.path;
        }

        uploadProgress.value = 80;
      }

      uploadProgress.value = 90;

      const { data, error: insertError } = await supabase
        .from("documents")
        .insert([
          {
            ...documentData,
            file_url: fileUrl,
            user_id: store.user.id,
            uploaded_by: store.user.id,
            file_type: file?.type,
          },
        ] as DocumentInsert[])
        .select()
        .single();

      if (insertError) throw insertError;

      uploadProgress.value = 100;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document";
      error.value = message;
      throw err;
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  };

  const uploadNewVersion = async (
    documentId: string,
    file: File,
    currentDoc: Document,
    metadata?: Partial<Document>,
  ) => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    isUploading.value = true;
    error.value = null;

    try {
      const validation = validateFile(file, currentDoc.type);
      if (!validation.valid) {
        throw new Error(validation.error || "File validation failed");
      }

      const fileName = `${userStore.user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error("Upload failed");

      const newVersion = (currentDoc.version || 1) + 1;
      const { data, error: insertError } = await supabase
        .from("documents")
        .insert([
          {
            ...currentDoc,
            id: undefined,
            version: newVersion,
            is_current: true,
            file_url: uploadData.path,
            file_type: file.type,
            updated_at: new Date().toISOString(),
            ...metadata,
          },
        ] as DocumentInsert[])
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload new version";
      error.value = message;
      throw err;
    } finally {
      isUploading.value = false;
    }
  };

  return {
    isUploading,
    uploadProgress,
    error,
    uploadDocument,
    uploadNewVersion,
    validateFile,
  };
};
