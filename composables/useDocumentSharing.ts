import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'
import type { Document } from '~/types/models'

/**
 * Composable for document sharing operations
 *
 * Handles sharing documents with schools and managing access.
 * Part of split from useDocuments for focused responsibility.
 *
 * @example
 * const { shareDocument, revokeSharing } = useDocumentSharing()
 * await shareDocument(docId, ['school-1', 'school-2'])
 *
 * @returns Object with sharing methods and state
 */
export const useDocumentSharing = () => {
  const supabase = useSupabase()
  const userStore = useUserStore()

  // State
  const isSharing = ref(false)
  const error = ref<string | null>(null)

  /**
   * Share a document with specific schools
   */
  const shareDocument = async (documentId: string, schoolIds: string[]): Promise<Document | null> => {
    if (!userStore.user) throw new Error('User not authenticated')

    isSharing.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('documents')
        .update({ shared_with_schools: schoolIds })
        .eq('id', documentId)
        .select()
        .single()

      if (updateError) throw updateError

      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to share document'
      error.value = message
      throw err
    } finally {
      isSharing.value = false
    }
  }

  /**
   * Revoke school access to a document
   */
  const revokeSharing = async (documentId: string, schoolIdToRemove: string): Promise<Document | null> => {
    if (!userStore.user) throw new Error('User not authenticated')

    isSharing.value = true
    error.value = null

    try {
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('shared_with_schools')
        .eq('id', documentId)
        .single()

      if (fetchError) throw fetchError
      if (!doc) throw new Error('Document not found')

      const updatedSchools = (doc.shared_with_schools || []).filter((id: string) => id !== schoolIdToRemove)

      const { data, error: updateError } = await supabase
        .from('documents')
        .update({ shared_with_schools: updatedSchools })
        .eq('id', documentId)
        .select()
        .single()

      if (updateError) throw updateError

      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove school access'
      error.value = message
      throw err
    } finally {
      isSharing.value = false
    }
  }

  return {
    isSharing,
    error,
    shareDocument,
    revokeSharing,
  }
}
