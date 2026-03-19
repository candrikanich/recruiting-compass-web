import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock $fetch
vi.stubGlobal('$fetch', vi.fn())

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
vi.mock('~/utils/logger', () => ({
  createClientLogger: () => mockLogger,
}))

describe('useDeadlines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports fetchDeadlines, createDeadline, and removeDeadline', async () => {
    const mod = await import('~/composables/useDeadlines')
    expect(typeof mod.useDeadlines).toBe('function')
    const { fetchDeadlines, createDeadline, removeDeadline } = mod.useDeadlines()
    expect(typeof fetchDeadlines).toBe('function')
    expect(typeof createDeadline).toBe('function')
    expect(typeof removeDeadline).toBe('function')
  })

  it('fetchDeadlines calls GET /api/deadlines', async () => {
    const mockFetch = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', mockFetch)
    const { useDeadlines } = await import('~/composables/useDeadlines')
    const { fetchDeadlines } = useDeadlines()
    await fetchDeadlines()
    expect(mockFetch).toHaveBeenCalledWith('/api/deadlines')
  })

  it('fetchDeadlines sets error when $fetch rejects and resets loading to false', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('$fetch', mockFetch)
    const { useDeadlines } = await import('~/composables/useDeadlines')
    const { fetchDeadlines, error, loading } = useDeadlines()
    await fetchDeadlines()
    expect(error.value).toBe('Failed to load deadlines')
    expect(loading.value).toBe(false)
  })

  it('createDeadline POSTs to /api/deadlines, re-fetches, and returns the deadline', async () => {
    const newDeadline = { id: 'dead-2', label: 'Visit', deadline_date: '2026-12-01', category: 'visit' }
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ success: true, deadline: newDeadline }) // POST
      .mockResolvedValueOnce([newDeadline]) // re-fetch GET
    vi.stubGlobal('$fetch', mockFetch)
    const { useDeadlines } = await import('~/composables/useDeadlines')
    const { createDeadline } = useDeadlines()
    const result = await createDeadline({ label: 'Visit', deadline_date: '2026-12-01', category: 'visit' })
    expect(mockFetch).toHaveBeenCalledWith('/api/deadlines', {
      method: 'POST',
      body: { label: 'Visit', deadline_date: '2026-12-01', category: 'visit' },
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/deadlines')
    expect(result).toEqual(newDeadline)
  })

  it('createDeadline logs error and re-throws when $fetch rejects', async () => {
    const fetchError = new Error('Create failed')
    const mockFetch = vi.fn().mockRejectedValue(fetchError)
    vi.stubGlobal('$fetch', mockFetch)
    const { useDeadlines } = await import('~/composables/useDeadlines')
    const { createDeadline } = useDeadlines()
    await expect(createDeadline({ label: 'X', deadline_date: '2026-01-01', category: 'other' })).rejects.toThrow('Create failed')
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to create deadline', fetchError)
  })

  it('removeDeadline removes item from local state optimistically', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce([
        { id: 'dead-1', label: 'App deadline', deadline_date: '2026-11-01', category: 'application' },
      ])
      .mockResolvedValue(undefined)
    vi.stubGlobal('$fetch', mockFetch)
    const { useDeadlines } = await import('~/composables/useDeadlines')
    const { fetchDeadlines, removeDeadline, deadlines } = useDeadlines()
    await fetchDeadlines()
    expect(deadlines.value).toHaveLength(1)
    await removeDeadline('dead-1')
    expect(deadlines.value).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledWith('/api/deadlines/dead-1', { method: 'DELETE' })
  })

  it('removeDeadline logs error and re-throws when $fetch rejects', async () => {
    const fetchError = new Error('Delete failed')
    const mockFetch = vi.fn().mockRejectedValue(fetchError)
    vi.stubGlobal('$fetch', mockFetch)
    const { useDeadlines } = await import('~/composables/useDeadlines')
    const { removeDeadline } = useDeadlines()
    await expect(removeDeadline('dead-99')).rejects.toThrow('Delete failed')
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to remove deadline', fetchError)
  })
})
