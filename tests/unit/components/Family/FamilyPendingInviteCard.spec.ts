import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FamilyPendingInviteCard from '~/components/Family/FamilyPendingInviteCard.vue'

const invitation = {
  id: 'inv-1',
  invited_email: 'owen@example.com',
  role: 'player' as const,
  expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
}

describe('FamilyPendingInviteCard', () => {
  it('emits resend with id, email, and role when Resend is clicked', async () => {
    const wrapper = mount(FamilyPendingInviteCard, { props: { invitation } })
    await wrapper.find('[data-testid="resend-invite-button"]').trigger('click')
    expect(wrapper.emitted('resend')).toEqual([[{ id: 'inv-1', email: 'owen@example.com', role: 'player' }]])
  })

  it('emits revoke with id when Revoke is clicked', async () => {
    const wrapper = mount(FamilyPendingInviteCard, { props: { invitation } })
    await wrapper.find('[data-testid="revoke-invite-button"]').trigger('click')
    expect(wrapper.emitted('revoke')).toEqual([['inv-1']])
  })
})
