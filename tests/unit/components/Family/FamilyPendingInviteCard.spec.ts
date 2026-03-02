import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FamilyPendingInviteCard from '~/components/Family/FamilyPendingInviteCard.vue'

const invitation = {
  id: 'inv-1',
  invited_email: 'owen@example.com',
  role: 'player' as const,
  expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
}

describe('FamilyPendingInviteCard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('shows "Sent ✓" and disables the button immediately after clicking Resend', async () => {
    vi.useFakeTimers()
    const wrapper = mount(FamilyPendingInviteCard, { props: { invitation } })
    await wrapper.find('[data-testid="resend-invite-button"]').trigger('click')
    const btn = wrapper.find('[data-testid="resend-invite-button"]')
    expect(btn.text()).toBe('Sent ✓')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('reverts button to "Resend" and re-enables it after 3 seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(FamilyPendingInviteCard, { props: { invitation } })
    await wrapper.find('[data-testid="resend-invite-button"]').trigger('click')
    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()
    const btn = wrapper.find('[data-testid="resend-invite-button"]')
    expect(btn.text()).toBe('Resend')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not emit resend a second time when clicked during the cooldown period', async () => {
    vi.useFakeTimers()
    const wrapper = mount(FamilyPendingInviteCard, { props: { invitation } })
    const btn = wrapper.find('[data-testid="resend-invite-button"]')
    await btn.trigger('click')
    await btn.trigger('click')
    expect(wrapper.emitted('resend')).toHaveLength(1)
  })
})
