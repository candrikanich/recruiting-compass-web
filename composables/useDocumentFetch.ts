import { ref, computed } from 'vue'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'
import type { Document } from '~/types/models'

/**
 * Composable for document fetching operations
 *
 * Handles retrieving documents and version history.
 * Part of split from useDocuments for focused responsibility.
 *
 * @example
 * const { documents, loading, error, fetchDocuments, fetchDocumentVersions } = useDocumentFetch()
 * await fetchDocuments({ type: 'resume' })
 *
 * @returns Object with fetching methods and state
 */
export const useDocumentFetch = () => {
  const supabase = useSupabase()
  const userStore = useUserStore()

  // State
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch documents with optional filters
   */
  const fetchDocuments = async (filters?: { type?: string; schoolId?: string }) => {
    if (!userStore.user) return

    loading.value = true
    error.value = null

    try {
      let query = supabase.from('documents').select('*').eq('user_id', userStore.user.id).eq('is_current', true)

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }

      if (filters?.schoolId) {
        query = query.eq('school_id', filters.schoolId)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      documents.value = data || []
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents'
      error.value = message
      console.error('Document fetch error:', message)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all versions of a document by title
   */
  const fetchDocumentVersions = async (documentTitle: string) => {
    if (!userStore.user) return []

    try {
      // Find all documents with same title and user (naive grouping)
      // Future: add parent_document_id FK for proper version linking
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userStore.user.id)
        .eq('title', documentTitle)
        .order('version', { ascending: false })

      if (fetchError) throw fetchError

      return data || []
    } catch (err: unknown) {
      console.error('Failed to fetch document versions:', err)
      return []
    }
  }

  /**
   * Update document metadata
   */
  const updateDocument = async (id: string, updates: Partial<Document>) => {
    if (!userStore.user) throw new Error('User not authenticated')

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const index = documents.value.findIndex((d) => d.id === id)
      if (index !== -1) {
        documents.value[index] = data
      }

      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update document'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a document and its associated file from storage
   */
  const deleteDocument = async (id: string) => {
    if (!userStore.user) throw new Error('User not authenticated')

    loading.value = true
    error.value = null

    try {
      // 1. Get document to retrieve file_url before deletion
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // 2. Delete file from storage if it exists
      if (doc?.file_url) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_url])

        if (storageError) console.error('Storage deletion failed:', storageError)
        // Continue even if storage delete fails - don't want orphaned DB records
      }

      // 3. Delete DB record
      const { error: deleteError } = await supabase.from('documents').delete().eq('id', id)

      if (deleteError) throw deleteError

      documents.value = documents.value.filter((d) => d.id !== id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete document'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Computed property: documents grouped by type
   */
  const documentsByType = computed(() => {
    const grouped: Record<string, Document[]> = {}
    documents.value.forEach((d) => {
      if (!grouped[d.type]) {
        grouped[d.type] = []
      }
      grouped[d.type].push(d)
    })
    return grouped
  })

  return {
    documents: computed(() => documents.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    documentsByType,
    fetchDocuments,
    fetchDocumentVersions,
    updateDocument,
    deleteDocument,
  }
}
