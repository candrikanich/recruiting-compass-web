import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock $fetch
vi.stubGlobal('$fetch', vi.fn())

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
})
