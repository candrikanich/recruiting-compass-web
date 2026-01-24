import { ref, computed, type ComputedRef } from "vue";
import {
  querySelect,
  querySingle,
  queryInsert,
  queryUpdate,
  queryDelete,
  isQuerySuccess,
} from "~/utils/supabaseQuery";
import { useFormValidation } from "~/composables/useFormValidation";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useErrorHandler } from "./useErrorHandler";
import type { Document } from "~/types/models";

/**
 * Consolidated composable for all document management operations
 *
 * Merges functionality from:
 * - useDocumentFetch (CRUD operations, version history)
 * - useDocumentUpload (file uploads, versioning)
 * - useDocumentSharing (access control, permissions)
 *
 * Uses queryService layer and unified validation for consistency.
 *
 * @example
 * const {
 *   documents,
 *   fetchDocuments,
 *   uploadDocument,
 *   shareDocument,
 *   deleteDocument,
 *   loading,
 *   error
 * } = useDocumentsConsolidated()
 *
 * await fetchDocuments({ type: 'resume' })
 * const { success, data } = await uploadDocument(file, 'resume', 'My Resume')
 * await shareDocument('doc-123', 'school-456', 'view')
 *
 * @returns Combined object with all document operations
 */
export const useDocumentsConsolidated = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const { getErrorMessage, logError } = useErrorHandler();
  const { validateFile, fileErrors } = useFormValidation();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Fetch state
  const documents = ref<Document[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Upload state
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const uploadError = ref<string | null>(null);

  // Sharing state
  const isSharing = ref(false);
  const sharingError = ref<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch documents with optional filters
   *
   * @param filters - Optional filters (type, schoolId, status)
   * @returns Promise resolving to documents array
   */
  const fetchDocuments = async (filters?: {
    type?: string;
    schoolId?: string;
    status?: "current" | "archived" | "all";
  }) => {
    if (!userStore.user) {
      error.value = "User not authenticated";
      return [];
    }

    loading.value = true;
    error.value = null;

    try {
      const { data, error: queryError } = await querySelect<Document>(
        "documents",
        {
          select: "*",
          filters: {
            user_id: userStore.user.id,
            ...(filters?.status === "archived" && { is_current: false }),
            ...(filters?.status === "current" && { is_current: true }),
            ...(filters?.type && { type: filters.type }),
            ...(filters?.schoolId && { school_id: filters.schoolId }),
          },
          order: { column: "created_at", ascending: false },
          limit: 1000,
        },
        { context: "fetchDocuments" },
      );

      if (queryError) {
        throw queryError;
      }

      documents.value = data || [];
      return data || [];
    } catch (err) {
      const message = getErrorMessage(err, { context: "fetchDocuments" });
      error.value = message;
      logError(err, { context: "fetchDocuments" });
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch all versions of a document by title
   *
   * @param documentTitle - Title to search for
   * @returns Promise resolving to document versions array
   */
  const fetchDocumentVersions = async (
    documentTitle: string,
  ): Promise<Document[]> => {
    if (!userStore.user) return [];

    try {
      const { data, error: queryError } = await querySelect<Document>(
        "documents",
        {
          select: "*",
          filters: {
            user_id: userStore.user.id,
            title: documentTitle,
          },
          order: { column: "version", ascending: false },
        },
        { context: "fetchDocumentVersions" },
      );

      if (queryError) {
        throw queryError;
      }

      return data || [];
    } catch (err) {
      logError(err, {
        context: "fetchDocumentVersions",
        details: { documentTitle },
      });
      return [];
    }
  };

  /**
   * Fetch single document by ID
   *
   * @param id - Document ID
   * @returns Promise resolving to document or null
   */
  const getDocument = async (id: string): Promise<Document | null> => {
    try {
      const { data, error: queryError } = await querySingle<Document>(
        "documents",
        { filters: { id, user_id: userStore.user?.id } },
        { context: "getDocument" },
      );

      if (queryError) {
        throw queryError;
      }

      return data;
    } catch (err) {
      logError(err, { context: "getDocument", details: { id } });
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update document metadata
   *
   * @param id - Document ID
   * @param updates - Partial document updates
   * @returns Promise resolving to updated document or null
   */
  const updateDocument = async (
    id: string,
    updates: Partial<Document>,
  ): Promise<Document | null> => {
    if (!userStore.user) {
      error.value = "User not authenticated";
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const { data, error: queryError } = await queryUpdate<Document>(
        "documents",
        updates,
        { id, user_id: userStore.user.id },
        { context: "updateDocument" },
      );

      if (queryError) {
        throw queryError;
      }

      if (data && data.length > 0) {
        const index = documents.value.findIndex((d) => d.id === id);
        if (index !== -1) {
          documents.value[index] = data[0];
        }
      }

      return data?.[0] || null;
    } catch (err) {
      const message = getErrorMessage(err, { context: "updateDocument" });
      error.value = message;
      logError(err, { context: "updateDocument" });
      return null;
    } finally {
      loading.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Delete a document and its associated file from storage
   *
   * @param id - Document ID
   * @returns Promise<boolean> - Success status
   */
  const deleteDocument = async (id: string): Promise<boolean> => {
    if (!userStore.user) {
      error.value = "User not authenticated";
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      // 1. Get document to retrieve file_url
      const doc = await getDocument(id);
      if (!doc) {
        throw new Error("Document not found");
      }

      // 2. Delete file from storage if it exists
      if (doc.file_url) {
        try {
          await supabase.storage.from("documents").remove([doc.file_url]);
        } catch (storageErr) {
          console.warn("Storage deletion failed:", storageErr);
          // Continue - don't want orphaned DB records
        }
      }

      // 3. Delete DB record
      const { error: deleteError } = await queryDelete(
        "documents",
        { id, user_id: userStore.user.id },
        { context: "deleteDocument" },
      );

      if (deleteError) {
        throw deleteError;
      }

      documents.value = documents.value.filter((d) => d.id !== id);
      return true;
    } catch (err) {
      const message = getErrorMessage(err, { context: "deleteDocument" });
      error.value = message;
      logError(err, { context: "deleteDocument" });
      return false;
    } finally {
      loading.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upload a new document file
   *
   * @param file - File to upload
   * @param type - Document type
   * @param title - Document title
   * @param description - Optional description
   * @returns Promise with success status and uploaded document
   */
  const uploadDocument = async (
    file: File,
    type: string,
    title: string,
    description?: string,
  ): Promise<{ success: boolean; data?: Document; error?: string }> => {
    if (!userStore.user) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate file
    try {
      validateFile(file, type as any);
    } catch (err) {
      const fileError = err instanceof Error ? err.message : "Invalid file";
      uploadError.value = fileError;
      return { success: false, error: fileError };
    }

    isUploading.value = true;
    uploadProgress.value = 0;
    uploadError.value = null;

    try {
      // Generate file path
      const timestamp = Date.now();
      const fileName = `${userStore.user.id}/${timestamp}-${file.name}`;

      // 1. Upload file to storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr || !uploadData) {
        throw uploadErr || new Error("Upload failed");
      }

      uploadProgress.value = 50;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // 3. Create DB record
      const { data: docData, error: insertErr } = await queryInsert<Document>(
        "documents",
        [
          {
            user_id: userStore.user.id,
            title,
            description,
            type,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            version: 1,
            is_current: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        { context: "uploadDocument" },
      );

      if (insertErr || !docData) {
        throw insertErr || new Error("Failed to create document record");
      }

      uploadProgress.value = 100;
      const doc = Array.isArray(docData) ? docData[0] : docData;
      documents.value.unshift(doc);

      return { success: true, data: doc };
    } catch (err) {
      const message = getErrorMessage(err, { context: "uploadDocument" });
      uploadError.value = message;
      logError(err, { context: "uploadDocument" });
      return { success: false, error: message };
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  };

  /**
   * Upload a new version of an existing document
   *
   * @param documentId - Document ID to version
   * @param file - New file version
   * @returns Promise with success status and new version
   */
  const uploadNewVersion = async (
    documentId: string,
    file: File,
  ): Promise<{ success: boolean; data?: Document; error?: string }> => {
    if (!userStore.user) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Get original document
      const originalDoc = await getDocument(documentId);
      if (!originalDoc) {
        return { success: false, error: "Document not found" };
      }

      // Validate new file
      validateFile(file, originalDoc.type);

      isUploading.value = true;

      // 1. Mark old version as archived
      await updateDocument(documentId, { is_current: false });

      // 2. Upload new file
      const timestamp = Date.now();
      const fileName = `${userStore.user.id}/${timestamp}-${file.name}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadErr || !uploadData) {
        throw uploadErr || new Error("Upload failed");
      }

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // 3. Create new document record as current version
      const newVersion = (originalDoc.version || 1) + 1;
      const { data: docData, error: insertErr } = await queryInsert<Document>(
        "documents",
        [
          {
            ...originalDoc,
            id: undefined, // Let DB generate new ID
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            version: newVersion,
            is_current: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        { context: "uploadNewVersion" },
      );

      if (insertErr || !docData) {
        throw insertErr || new Error("Failed to create new version");
      }

      const doc = Array.isArray(docData) ? docData[0] : docData;
      documents.value.unshift(doc);

      return { success: true, data: doc };
    } catch (err) {
      const message = getErrorMessage(err, { context: "uploadNewVersion" });
      uploadError.value = message;
      logError(err, { context: "uploadNewVersion" });
      return { success: false, error: message };
    } finally {
      isUploading.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARING OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Share document with schools or users
   *
   * @param documentId - Document ID
   * @param recipientId - School or user ID
   * @param permission - Permission level (view, edit, admin)
   * @returns Promise<boolean> - Success status
   */
  const shareDocument = async (
    documentId: string,
    recipientId: string,
    permission: "view" | "edit" | "admin" = "view",
  ): Promise<boolean> => {
    if (!userStore.user) {
      sharingError.value = "User not authenticated";
      return false;
    }

    isSharing.value = true;
    sharingError.value = null;

    try {
      const { data, error: insertErr } = await queryInsert(
        "document_shares",
        [
          {
            document_id: documentId,
            shared_by_id: userStore.user.id,
            recipient_id: recipientId,
            permission,
            created_at: new Date().toISOString(),
          },
        ],
        { context: "shareDocument" },
      );

      if (insertErr || !data) {
        throw insertErr || new Error("Share failed");
      }

      return true;
    } catch (err) {
      const message = getErrorMessage(err, { context: "shareDocument" });
      sharingError.value = message;
      logError(err, { context: "shareDocument" });
      return false;
    } finally {
      isSharing.value = false;
    }
  };

  /**
   * Revoke document access
   *
   * @param documentId - Document ID
   * @param recipientId - Recipient ID to revoke
   * @returns Promise<boolean> - Success status
   */
  const revokeAccess = async (
    documentId: string,
    recipientId: string,
  ): Promise<boolean> => {
    if (!userStore.user) {
      sharingError.value = "User not authenticated";
      return false;
    }

    isSharing.value = true;
    sharingError.value = null;

    try {
      const { error: deleteErr } = await queryDelete(
        "document_shares",
        {
          document_id: documentId,
          recipient_id: recipientId,
          shared_by_id: userStore.user.id,
        },
        { context: "revokeAccess" },
      );

      if (deleteErr) {
        throw deleteErr;
      }

      return true;
    } catch (err) {
      const message = getErrorMessage(err, { context: "revokeAccess" });
      sharingError.value = message;
      logError(err, { context: "revokeAccess" });
      return false;
    } finally {
      isSharing.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Documents grouped by type
   */
  const documentsByType = computed(() => {
    const grouped: Record<string, Document[]> = {};
    documents.value.forEach((doc) => {
      if (!grouped[doc.type]) {
        grouped[doc.type] = [];
      }
      grouped[doc.type].push(doc);
    });
    return grouped;
  });

  /**
   * Current (non-archived) documents
   */
  const currentDocuments = computed(() =>
    documents.value.filter((d) => d.is_current),
  );

  /**
   * Archived documents
   */
  const archivedDocuments = computed(() =>
    documents.value.filter((d) => !d.is_current),
  );

  /**
   * Combined error state
   */
  const allErrors = computed(
    () => error.value || uploadError.value || sharingError.value,
  );

  /**
   * Combined loading state
   */
  const isLoading = computed(
    () => loading.value || isUploading.value || isSharing.value,
  );

  return {
    // State
    documents: computed(() => documents.value),
    loading,
    error,
    isUploading,
    uploadProgress,
    uploadError,
    isSharing,
    sharingError,
    fileErrors,
    allErrors,
    isLoading,

    // Computed
    documentsByType,
    currentDocuments,
    archivedDocuments,

    // Fetch methods
    fetchDocuments,
    fetchDocumentVersions,
    getDocument,

    // Update methods
    updateDocument,

    // Delete methods
    deleteDocument,

    // Upload methods
    uploadDocument,
    uploadNewVersion,

    // Sharing methods
    shareDocument,
    revokeAccess,
  };
};
