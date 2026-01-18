import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDocuments } from '~/composables/useDocuments'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user'
import type { Document } from '~/types/models'

const mockSupabase = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => mockSupabase,
}))

describe('useDocuments', () => {
  let mockQuery: any
  let mockStorageQuery: any
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    userStore = useUserStore()
    userStore.user = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    mockStorageQuery = {
      upload: vi.fn().mockResolvedValue({ data: { path: 'documents/file.pdf' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }

    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.storage.from.mockReturnValue(mockStorageQuery)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockDocument = (overrides = {}): Document => ({
    id: 'doc-1',
    user_id: 'user-123',
    school_id: 'school-1',
    type: 'highlight_video',
    title: 'Game Highlight',
    description: 'Junior season highlights',
    file_url: 'https://example.com/highlight.mp4',
    file_type: 'video/mp4',
    version: 1,
    is_current: true,
    created_at: '2025-12-20T10:00:00Z',
    updated_at: '2025-12-20T10:00:00Z',
    shared_with_schools: [],
    ...overrides,
  })

  describe('fetchDocuments', () => {
    it('should fetch user documents', async () => {
      const mockDocuments = [
        createMockDocument(),
        createMockDocument({ id: 'doc-2', type: 'transcript' }),
      ]
      mockQuery.order.mockResolvedValue({ data: mockDocuments, error: null })

      const { fetchDocuments, documents } = useDocuments()
      await fetchDocuments()

      expect(mockSupabase.from).toHaveBeenCalledWith('documents')
      expect(documents.value).toEqual(mockDocuments)
    })

    it('should filter documents by school', async () => {
      const mockDocuments = [createMockDocument({ school_id: 'school-1' })]
      mockQuery.eq.mockReturnThis()
      mockQuery.order.mockResolvedValue({ data: mockDocuments, error: null })

      const { fetchDocuments, documents } = useDocuments()
      await fetchDocuments({ schoolId: 'school-1' })

      expect(documents.value).toEqual(mockDocuments)
    })
  })

  describe('uploadDocument', () => {
    it('should upload document file and create record', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const docData = createMockDocument()

      mockStorageQuery.upload.mockResolvedValue({ data: { path: 'docs/test.pdf' }, error: null })
      mockStorageQuery.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } })
      mockQuery.insert.mockResolvedValue({ data: docData, error: null })

      const { uploadDocument } = useDocuments()
      await uploadDocument(docData, file)

      expect(mockStorageQuery.upload).toHaveBeenCalled()
      expect(mockQuery.insert).toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      const file = new File(['content'], 'test.pdf')
      const docData = createMockDocument()
      const mockError = new Error('Upload failed')

      mockStorageQuery.upload.mockResolvedValue({ data: null, error: mockError })

      const { uploadDocument, error } = useDocuments()
      await uploadDocument(docData, file)

      expect(error.value).toContain('Upload failed')
    })
  })

  describe('deleteDocument', () => {
    it('should delete document and file', async () => {
      const docId = 'doc-1'
      const filePath = 'documents/test.pdf'

      mockQuery.select.mockReturnThis()
      mockQuery.eq.mockReturnThis()
      mockQuery.single.mockResolvedValue({ data: { file_url: filePath }, error: null })
      mockQuery.delete.mockResolvedValue({ error: null })
      mockStorageQuery.remove.mockResolvedValue({ error: null })

      const { deleteDocument } = useDocuments()
      await deleteDocument(docId)

      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })

  describe('shareDocument', () => {
    it('should share document with schools', async () => {
      const docId = 'doc-1'
      const schoolIds = ['school-1', 'school-2']

      mockQuery.update.mockResolvedValue({ data: { shared_with_schools: schoolIds }, error: null })

      const { shareDocument } = useDocuments()
      await shareDocument(docId, schoolIds)

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })
})
