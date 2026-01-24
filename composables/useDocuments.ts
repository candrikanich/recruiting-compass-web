import { computed, type ComputedRef } from "vue";
import { useDocumentFetch } from "./useDocumentFetch";
import { useDocumentUpload } from "./useDocumentUpload";
import { useDocumentSharing } from "./useDocumentSharing";

/**
 * Composable for document management (backwards-compatible wrapper)
 *
 * ⚠️ DEPRECATED: This composable is deprecated as of Phase 4
 * Use useDocumentsConsolidated() instead for new code
 *
 * Migration guide: See docs/phase-4/DEPRECATION_AUDIT.md
 * Timeline: Will be removed in Phase 5
 *
 * Combines useDocumentFetch, useDocumentUpload, and useDocumentSharing
 * for a unified interface. For new code, prefer using useDocumentsConsolidated.
 *
 * @deprecated Use useDocumentsConsolidated() instead
 *
 * @example
 * // OLD (deprecated)
 * const { documents, uploadDocument, shareDocument } = useDocuments()
 *
 * // NEW (preferred)
 * const { documents, uploadDocument, shareDocument } = useDocumentsConsolidated()
 *
 * @returns Combined object with all document operations
 */
export const useDocuments = (): {
  documents: any;
  documentsByType: any;
  fetchDocuments: any;
  fetchDocumentVersions: any;
  updateDocument: any;
  deleteDocument: any;
  isUploading: any;
  uploadProgress: any;
  uploadDocument: any;
  uploadNewVersion: any;
  validateFile: any;
  isSharing: any;
  shareDocumentWithSchools: any;
  removeSchoolAccess: any;
  error: ComputedRef<any>;
  loading: ComputedRef<any>;
} => {
  const fetch = useDocumentFetch();
  const upload = useDocumentUpload();
  const sharing = useDocumentSharing();

  // Deprecation warning
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[DEPRECATED] useDocuments is deprecated as of Phase 4. " +
        "Use useDocumentsConsolidated() instead.\n" +
        "Migration guide: See DEPRECATION_AUDIT.md",
    );
  }

  return {
    // From fetch
    documents: fetch.documents,
    documentsByType: fetch.documentsByType,
    fetchDocuments: fetch.fetchDocuments,
    fetchDocumentVersions: fetch.fetchDocumentVersions,
    updateDocument: fetch.updateDocument,
    deleteDocument: fetch.deleteDocument,

    // From upload
    isUploading: upload.isUploading,
    uploadProgress: upload.uploadProgress,
    uploadDocument: upload.uploadDocument,
    uploadNewVersion: upload.uploadNewVersion,
    validateFile: upload.validateFile,

    // From sharing
    isSharing: sharing.isSharing,
    shareDocumentWithSchools: sharing.shareDocument,
    removeSchoolAccess: sharing.revokeSharing,

    // Combined error state
    error: computed(() => {
      return fetch.error.value || upload.error.value || sharing.error.value;
    }),

    // Combined loading state
    loading: computed(() => {
      return (
        fetch.loading.value ||
        upload.isUploading.value ||
        sharing.isSharing.value
      );
    }),
  };
};
