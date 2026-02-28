import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFamilyInvitations } from '~/composables/useFamilyInvitations'

const mockFetchAuth = vi.fn()
vi.mock('~/composables/useAuthFetch', () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}))

describe('useFamilyInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAuth.mockResolvedValue({ invitations: [] })
  })

  describe('resendInvitation', () => {
    it('revokes the old invite then creates a new one with the same email and role', async () => {
      const { resendInvitation } = useFamilyInvitations()

      await resendInvitation('inv-123', 'owen@example.com', 'player')

      expect(mockFetchAuth).toHaveBeenCalledWith(
        '/api/family/invitations/inv-123',
        { method: 'DELETE' },
      )
      expect(mockFetchAuth).toHaveBeenCalledWith('/api/family/invite', {
        method: 'POST',
        body: { email: 'owen@example.com', role: 'player' },
      })
    })

    it('sets error when the POST invite call fails', async () => {
      const { resendInvitation, error } = useFamilyInvitations()
      mockFetchAuth
        .mockResolvedValueOnce(undefined) // DELETE succeeds
        .mockRejectedValueOnce(new Error('Server error')) // POST fails

      await resendInvitation('inv-123', 'owen@example.com', 'player')

      expect(error.value).toBe('Failed to resend invitation')
    })

    it('refreshes invitations after resend', async () => {
      const { resendInvitation, invitations } = useFamilyInvitations()
      mockFetchAuth
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(undefined) // POST invite
        .mockResolvedValueOnce({ invitations: [{ id: 'new-inv', invited_email: 'owen@example.com', role: 'player', expires_at: '2099-01-01', created_at: '2026-02-28' }] })

      await resendInvitation('inv-123', 'owen@example.com', 'player')

      expect(invitations.value).toHaveLength(1)
      expect(invitations.value[0].id).toBe('new-inv')
    })
  })
})
