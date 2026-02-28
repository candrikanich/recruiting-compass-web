import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockSendInvite = vi.fn()
const mockFetchInvitations = vi.fn().mockResolvedValue(undefined)
const mockResendInvitation = vi.fn()
const mockRevokeInvitation = vi.fn()
const mockFetchMyCode = vi.fn().mockResolvedValue(undefined)

vi.mock('~/composables/useFamilyInvite', () => ({
  useFamilyInvite: () => ({
    sendInvite: mockSendInvite,
    loading: ref(false),
    error: ref(null),
  }),
}))

vi.mock('~/composables/useFamilyInvitations', () => ({
  useFamilyInvitations: () => ({
    invitations: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchInvitations: mockFetchInvitations,
    revokeInvitation: mockRevokeInvitation,
    resendInvitation: mockResendInvitation,
  }),
}))

vi.mock('~/composables/useFamilyCode', () => ({
  useFamilyCode: () => ({
    myFamilyCode: ref('FAM-TEST'),
    myFamilyId: ref('fam-1'),
    myFamilyName: ref('Test Family'),
    parentFamilies: ref([]),
    loading: ref(false),
    error: ref(null),
    successMessage: ref(null),
    fetchMyCode: mockFetchMyCode,
    createFamily: vi.fn(),
    joinByCode: vi.fn(),
    regenerateCode: vi.fn(),
    copyCodeToClipboard: vi.fn(),
    removeFamilyMember: vi.fn(),
  }),
}))

vi.mock('~/composables/useAuthFetch', () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn().mockResolvedValue({ members: [] }) }),
}))

const mockUserStore = {
  user: { id: 'u1', role: 'player', email: 'test@example.com' },
}

vi.mock('~/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore),
}))

import FamilyManagementPage from '~/pages/settings/family-management.vue'

function mountPage(role: 'player' | 'parent' = 'player') {
  mockUserStore.user = { id: 'u1', role, email: 'test@example.com' }
  return mount(FamilyManagementPage, {
    global: {
      stubs: {
        FamilyCodeDisplay: true,
        FamilyCodeInput: true,
        FamilyMemberCard: true,
        FamilyPendingInviteCard: true,
        NuxtLink: true,
        ArrowLeftIcon: true,
      },
    },
  })
}

describe('family-management invite form', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the invite form for players', () => {
    const wrapper = mountPage('player')
    expect(wrapper.find('[data-testid="invite-member-form"]').exists()).toBe(true)
  })

  it('renders the invite form for parents', () => {
    const wrapper = mountPage('parent')
    expect(wrapper.find('[data-testid="invite-member-form"]').exists()).toBe(true)
  })

  it('calls sendInvite with email and role on submit', async () => {
    mockSendInvite.mockResolvedValue(undefined)
    const wrapper = mountPage('player')

    await wrapper.find('[data-testid="invite-email-input"]').setValue('dad@example.com')
    await wrapper.find('[data-testid="invite-role-select"]').setValue('parent')
    await wrapper.find('[data-testid="send-invite-submit"]').trigger('click')

    expect(mockSendInvite).toHaveBeenCalledWith({ email: 'dad@example.com', role: 'parent' })
  })

  it('clears form and refreshes invitations on success', async () => {
    mockSendInvite.mockResolvedValue(undefined)
    mockFetchInvitations.mockResolvedValue(undefined)
    const wrapper = mountPage('player')

    await wrapper.find('[data-testid="invite-email-input"]').setValue('dad@example.com')
    await wrapper.find('[data-testid="invite-role-select"]').setValue('parent')
    await wrapper.find('[data-testid="send-invite-submit"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.find('[data-testid="invite-email-input"]').element as HTMLInputElement).value).toBe('')
    expect(mockFetchInvitations).toHaveBeenCalled()
  })

  it('disables submit when email is empty', () => {
    const wrapper = mountPage('player')
    const button = wrapper.find('[data-testid="send-invite-submit"]')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
  })
})
