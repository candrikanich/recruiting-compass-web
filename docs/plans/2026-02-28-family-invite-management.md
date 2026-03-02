# Family Invite Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add invite send/resend/revoke to the Family Management settings page so any family member can invite others after onboarding.

**Architecture:** Add a `resendInvitation` action to `useFamilyInvitations`, add a Resend button to `FamilyPendingInviteCard`, and add an "Invite a Family Member" inline form section to `family-management.vue`. No new API endpoints — all functionality uses existing `POST /api/family/invite` and `DELETE /api/family/invitations/:id`.

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Vitest for unit tests, existing composables (`useFamilyInvite`, `useFamilyInvitations`), TailwindCSS utilities.

---

### Task 1: Add `resendInvitation` to `useFamilyInvitations`

**Files:**
- Modify: `composables/useFamilyInvitations.ts`
- Test: `tests/unit/composables/useFamilyInvitations.spec.ts`

**Step 1: Write the failing test**

Open (or create) `tests/unit/composables/useFamilyInvitations.spec.ts` and add:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/unit/composables/useFamilyInvitations.spec.ts
```

Expected: FAIL — `resendInvitation is not a function`

**Step 3: Implement `resendInvitation`**

In `composables/useFamilyInvitations.ts`, add the action and expose it:

```typescript
async function resendInvitation(id: string, email: string, role: 'player' | 'parent') {
  await $fetchAuth(`/api/family/invitations/${id}`, { method: 'DELETE' })
  await $fetchAuth('/api/family/invite', { method: 'POST', body: { email, role } })
  await fetchInvitations()
}
```

Add `resendInvitation` to the return object.

**Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/unit/composables/useFamilyInvitations.spec.ts
```

Expected: PASS (all tests green)

**Step 5: Commit**

```bash
git add composables/useFamilyInvitations.ts tests/unit/composables/useFamilyInvitations.spec.ts
git commit -m "feat(family): add resendInvitation to useFamilyInvitations"
```

---

### Task 2: Add Resend button to `FamilyPendingInviteCard`

**Files:**
- Modify: `components/Family/FamilyPendingInviteCard.vue`
- Test: `tests/unit/components/Family/FamilyPendingInviteCard.spec.ts`

**Step 1: Write the failing test**

Open (or create) `tests/unit/components/Family/FamilyPendingInviteCard.spec.ts` and add:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/unit/components/Family/FamilyPendingInviteCard.spec.ts
```

Expected: FAIL — `data-testid="resend-invite-button"` not found

**Step 3: Update the component**

In `components/Family/FamilyPendingInviteCard.vue`, add the `resend` emit and button:

```vue
<script setup lang="ts">
defineProps<{
  invitation: {
    id: string
    invited_email: string
    role: 'player' | 'parent'
    expires_at: string
  }
}>()

const emit = defineEmits<{
  revoke: [id: string]
  resend: [payload: { id: string; email: string; role: 'player' | 'parent' }]
}>()

function formatExpiry(dateStr: string): string {
  const expires = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  return `in ${diffDays} days`
}
</script>

<template>
  <div
    data-testid="pending-invite-card"
    class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
  >
    <div>
      <p class="font-medium text-slate-900">{{ invitation.invited_email }}</p>
      <p class="text-sm text-slate-500">
        Invited as {{ invitation.role }} · expires {{ formatExpiry(invitation.expires_at) }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button
        data-testid="resend-invite-button"
        class="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
        @click="emit('resend', { id: invitation.id, email: invitation.invited_email, role: invitation.role })"
      >
        Resend
      </button>
      <button
        data-testid="revoke-invite-button"
        class="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
        @click="emit('revoke', invitation.id)"
      >
        Revoke
      </button>
    </div>
  </div>
</template>
```

Note: the existing `data-testid="revoke-invite-button"` was added to match the new test. The old test used `data-testid="revoke-invite-button"` — verify the existing spec (if any) still passes after this change.

**Step 4: Run tests**

```bash
npm run test -- tests/unit/components/Family/FamilyPendingInviteCard.spec.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add components/Family/FamilyPendingInviteCard.vue tests/unit/components/Family/FamilyPendingInviteCard.spec.ts
git commit -m "feat(family): add Resend button to FamilyPendingInviteCard"
```

---

### Task 3: Add invite form section to `family-management.vue`

**Files:**
- Modify: `pages/settings/family-management.vue`
- Test: `tests/unit/pages/family-management.spec.ts`

**Step 1: Write the failing test**

Open (or create) `tests/unit/pages/family-management.spec.ts` and add:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

// Mock composables
const mockSendInvite = vi.fn()
const mockFetchInvitations = vi.fn()
const mockResendInvitation = vi.fn()
const mockRevokeInvitation = vi.fn()
const mockFetchMyCode = vi.fn()

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

import { ref } from 'vue'
import FamilyManagementPage from '~/pages/settings/family-management.vue'

function mountPage(role: 'player' | 'parent' = 'player') {
  return mount(FamilyManagementPage, {
    global: {
      plugins: [
        createTestingPinia({
          initialState: { user: { user: { id: 'u1', role, email: 'test@example.com' } } },
          stubActions: false,
        }),
      ],
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
  beforeEach(() => vi.clearAllMocks())

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
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/unit/pages/family-management.spec.ts
```

Expected: FAIL — `data-testid="invite-member-form"` not found

**Step 3: Add the invite form section to the page**

In `pages/settings/family-management.vue`:

1. Add imports at the top of `<script setup>`:

```typescript
import { useFamilyInvite } from '~/composables/useFamilyInvite'
```

2. Add state for the invite form (after the existing composable calls):

```typescript
const inviteEmail = ref('')
const inviteRole = ref<'player' | 'parent'>('player')
const inviteSuccess = ref<string | null>(null)

const {
  sendInvite,
  loading: inviteLoading,
  error: inviteError,
} = useFamilyInvite()

async function handleSendInvite() {
  if (!inviteEmail.value) return
  inviteSuccess.value = null
  await sendInvite({ email: inviteEmail.value, role: inviteRole.value })
  inviteEmail.value = ''
  inviteSuccess.value = `Invite sent to ${inviteEmail.value}`
  await fetchInvitations().catch(() => {})
}
```

Note: `inviteSuccess` must be set before clearing `inviteEmail`. Fix the order:

```typescript
async function handleSendInvite() {
  if (!inviteEmail.value) return
  inviteSuccess.value = null
  const sentTo = inviteEmail.value
  await sendInvite({ email: sentTo, role: inviteRole.value })
  inviteEmail.value = ''
  inviteSuccess.value = `Invite sent to ${sentTo}`
  await fetchInvitations().catch(() => {})
}
```

3. Also destructure `resendInvitation` from `useFamilyInvitations` and add the handler:

```typescript
const {
  invitations: pendingInvitations,
  fetchInvitations,
  revokeInvitation,
  resendInvitation,
} = useFamilyInvitations()

async function handleResendInvitation(payload: { id: string; email: string; role: 'player' | 'parent' }) {
  await resendInvitation(payload.id, payload.email, payload.role)
}
```

4. Add the invite form section in `<template>` — insert it **before** the "Pending Invitations" section:

```html
<!-- Invite a Family Member -->
<section
  class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
  data-testid="invite-member-form"
>
  <h2 class="text-xl font-bold text-slate-900 mb-4">Invite a Family Member</h2>

  <div class="space-y-4">
    <div>
      <label for="inviteMemberEmail" class="block text-sm font-medium text-slate-700 mb-1">
        Email address
      </label>
      <input
        id="inviteMemberEmail"
        v-model="inviteEmail"
        data-testid="invite-email-input"
        type="email"
        placeholder="family@example.com"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <label for="inviteMemberRole" class="block text-sm font-medium text-slate-700 mb-1">
        Role
      </label>
      <select
        id="inviteMemberRole"
        v-model="inviteRole"
        data-testid="invite-role-select"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="player">Player</option>
        <option value="parent">Parent</option>
      </select>
    </div>

    <button
      data-testid="send-invite-submit"
      type="button"
      :disabled="!inviteEmail || inviteLoading"
      class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      @click="handleSendInvite"
    >
      {{ inviteLoading ? 'Sending\u2026' : 'Send invite' }}
    </button>

    <p v-if="inviteError" class="text-sm text-red-600">{{ inviteError }}</p>
    <p v-if="inviteSuccess" class="text-sm text-green-600">{{ inviteSuccess }}</p>
  </div>
</section>
```

5. Update the `FamilyPendingInviteCard` usage to wire up the new `@resend` event:

```html
<FamilyPendingInviteCard
  v-for="inv in pendingInvitations"
  :key="inv.id"
  :invitation="inv"
  @revoke="revokeInvitation"
  @resend="handleResendInvitation"
/>
```

**Step 4: Run tests**

```bash
npm run test -- tests/unit/pages/family-management.spec.ts
```

Expected: PASS

**Step 5: Run full test suite**

```bash
npm run test
```

Expected: All tests pass. Fix any regressions before continuing.

**Step 6: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

**Step 7: Commit**

```bash
git add pages/settings/family-management.vue tests/unit/pages/family-management.spec.ts
git commit -m "feat(family): add invite form and resend to family management page"
```

---

### Task 4: Manual verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Log in and navigate to Settings → Family Management**

Go to `http://localhost:3000/settings/family-management`

**Step 3: Verify invite form is visible**

- "Invite a Family Member" section with email input, role dropdown, and Send button should be present

**Step 4: Send an invite**

- Enter an email, select a role, click Send
- Verify the pending invitations list updates
- Check server logs for the Resend warn (from the earlier fix) — this will surface the actual Resend error if email fails

**Step 5: Verify Resend button on pending invite**

- Find an existing pending invite in the list
- Click Resend — old entry should disappear and reappear with a fresh expiry

**Step 6: Verify Revoke still works**

- Click Revoke on a pending invite — it should be removed from the list
