import { describe, it, expect, beforeEach, vi } from 'vitest'
import viewLoggingMiddleware from '~/middleware/viewLogging.global'
import { useViewLogging } from '~/composables/useViewLogging'
import { useUserStore } from '~/stores/user'
import { useAccountLinks } from '~/composables/useAccountLinks'

// Mock the composables
vi.mock('~/composables/useViewLogging')
vi.mock('~/stores/user')
vi.mock('~/composables/useAccountLinks')

describe('viewLogging middleware', () => {
  let mockLogParentView: any
  let mockUserStore: any
  let mockAccountLinks: any

  beforeEach(() => {
    mockLogParentView = vi.fn()
    vi.mocked(useViewLogging).mockReturnValue({
      logParentView: mockLogParentView,
      getViewLogs: vi.fn(),
      hasParentViewed: vi.fn(),
      getViewCount: vi.fn(),
      getLastParentView: vi.fn(),
    })

    mockUserStore = {
      user: {
        id: 'parent-123',
        role: 'parent',
      },
    }
    vi.mocked(useUserStore).mockReturnValue(mockUserStore)

    mockAccountLinks = {
      linkedAccounts: {
        value: [
          {
            user_id: 'athlete-456',
            relationship: 'student',
            full_name: 'John Athlete',
          },
        ],
      },
    }
    vi.mocked(useAccountLinks).mockReturnValue(mockAccountLinks)
  })

  describe('route detection', () => {
    it('should log view for schools route', async () => {
      const to = {
        path: '/schools/school-789',
        params: { id: 'school-789' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'school',
        'athlete-456',
        'school-789'
      )
    })

    it('should log view for coaches route', async () => {
      const to = {
        path: '/coaches/coach-789',
        params: { id: 'coach-789' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'coach',
        'athlete-456',
        'coach-789'
      )
    })

    it('should log view for interactions route', async () => {
      const to = {
        path: '/interactions/interaction-789',
        params: { id: 'interaction-789' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'interaction',
        'athlete-456',
        'interaction-789'
      )
    })

    it('should log view for events route', async () => {
      const to = {
        path: '/events/event-789',
        params: { id: 'event-789' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'event',
        'athlete-456',
        'event-789'
      )
    })

    it('should log view for timeline route', async () => {
      const to = {
        path: '/timeline',
        params: {},
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'timeline',
        'athlete-456',
        undefined
      )
    })

    it('should log view for performance route', async () => {
      const to = {
        path: '/performance',
        params: {},
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'performance',
        'athlete-456',
        undefined
      )
    })

    it('should log view for dashboard route', async () => {
      const to = {
        path: '/dashboard',
        params: {},
      }
      const from = { path: '/' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'dashboard',
        'athlete-456',
        undefined
      )
    })

    it('should not log for unknown routes', async () => {
      const to = {
        path: '/settings',
        params: {},
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).not.toHaveBeenCalled()
    })
  })

  describe('user type checks', () => {
    it('should not log when user is not a parent', async () => {
      mockUserStore.user.role = 'student'

      const to = {
        path: '/schools/school-789',
        params: { id: 'school-789' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).not.toHaveBeenCalled()
    })

    it('should not log when user has no linked athlete', async () => {
      mockAccountLinks.linkedAccounts.value = [
        {
          user_id: 'parent-123',
          relationship: 'parent',
        },
      ]

      const to = {
        path: '/schools/school-789',
        params: { id: 'school-789' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).not.toHaveBeenCalled()
    })
  })

  describe('route params handling', () => {
    it('should extract id from route params', async () => {
      const to = {
        path: '/schools/my-school-id',
        params: { id: 'my-school-id' },
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'school',
        'athlete-456',
        'my-school-id'
      )
    })

    it('should handle missing id param', async () => {
      const to = {
        path: '/timeline',
        params: {},
      }
      const from = { path: '/dashboard' }

      await viewLoggingMiddleware(to as any, from as any)

      expect(mockLogParentView).toHaveBeenCalledWith(
        'timeline',
        'athlete-456',
        undefined
      )
    })
  })
})
