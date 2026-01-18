import { computed, type ComputedRef } from 'vue'
import { useDocumentFetch } from './useDocumentFetch'
import { useDocumentUpload } from './useDocumentUpload'
import { useDocumentSharing } from './useDocumentSharing'

/**
 * Composable for document management (backwards-compatible wrapper)
 *
 * Combines useDocumentFetch, useDocumentUpload, and useDocumentSharing
 * for a unified interface. For new code, prefer using the specific composables.
 *
 * @deprecated Prefer using useDocumentFetch, useDocumentUpload, useDocumentSharing directly
 *
 * @example
 * const { documents, uploadDocument, shareDocument } = useDocuments()
 *
 * @returns Combined object with all document operations
 */
export const useDocuments = (): {
  documents: any
  documentsByType: any
  fetchDocuments: any
  fetchDocumentVersions: any
  updateDocument: any
  deleteDocument: any
  isUploading: any
  uploadProgress: any
  uploadDocument: any
  uploadNewVersion: any
  validateFile: any
  isSharing: any
  shareDocumentWithSchools: any
  removeSchoolAccess: any
  error: ComputedRef<any>
  loading: ComputedRef<any>
} => {
  const fetch = useDocumentFetch()
  const upload = useDocumentUpload()
  const sharing = useDocumentSharing()

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
      return fetch.error.value || upload.error.value || sharing.error.value
    }),

    // Combined loading state
    loading: computed(() => {
      return fetch.loading.value || upload.isUploading.value || sharing.isSharing.value
    }),
  }
}
