<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";

definePageMeta({ auth: false })

const route = useRoute()
const token = computed(() => route.query.token as string)

const { login } = useAuth()
const userStore = useUserStore()

interface InviteDetails {
  invitationId: string
  email: string
  role: 'player' | 'parent'
  familyName: string
  inviterName: string
}

const invite = ref<InviteDetails | null>(null)
const fetchError = ref<{ statusCode: number; statusMessage?: string } | null>(null)
const fetchStatus = ref<'pending' | 'success' | 'error' | 'declined'>('pending')

const loginEmail = ref('')
const loginPassword = ref('')
const loading = ref(false)
const declining = ref(false)

onMounted(async () => {
  if (!token.value) {
    fetchStatus.value = 'error'
    fetchError.value = { statusCode: 404, statusMessage: 'No token provided' }
    return
  }
  try {
    invite.value = await $fetch<InviteDetails>(`/api/family/invite/${token.value}`)
    fetchStatus.value = 'success'
  } catch (err: unknown) {
    fetchStatus.value = 'error'
    const e = err as { statusCode?: number; statusMessage?: string }
    fetchError.value = { statusCode: e?.statusCode ?? 500, statusMessage: e?.statusMessage }
  }
})

async function accept() {
  loading.value = true
  try {
    if (!userStore.isAuthenticated) {
      await login(loginEmail.value, loginPassword.value)
    }
    await $fetch(`/api/family/invite/${token.value}/accept`, { method: 'POST' })
    await navigateTo('/dashboard')
  } finally {
    loading.value = false
  }
}

async function decline() {
  declining.value = true
  try {
    await $fetch(`/api/family/invite/${token.value}/decline`, { method: 'POST' })
    fetchStatus.value = 'declined'
  } finally {
    declining.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-16 px-4">
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" data-testid="loading">
      Loading invite...
    </div>

    <!-- Declined -->
    <div v-else-if="fetchStatus === 'declined'" data-testid="invite-declined">
      <h1 class="text-xl font-semibold mb-2">Invitation declined</h1>
      <p class="text-gray-600">You've declined this invitation. No action is needed.</p>
    </div>

    <!-- Error: expired -->
    <div v-else-if="fetchError?.statusCode === 410" data-testid="error-expired">
      <h1 class="text-xl font-semibold mb-2">This invite has expired</h1>
      <p class="text-gray-600">Ask {{ invite?.inviterName ?? 'the sender' }} to send a new invite.</p>
    </div>

    <!-- Error: already accepted -->
    <div v-else-if="fetchError?.statusCode === 409" data-testid="error-accepted">
      <h1 class="text-xl font-semibold mb-2">Already connected</h1>
      <p class="text-gray-600">You're already a member of this family.</p>
      <DesignSystemButton to="/dashboard" class="mt-4">Go to dashboard</DesignSystemButton>
    </div>

    <!-- Error: not found or other -->
    <div v-else-if="fetchStatus === 'error'" data-testid="error-not-found">
      <h1 class="text-xl font-semibold mb-2">Invite not found</h1>
      <p class="text-gray-600">This link may be invalid or already used.</p>
    </div>

    <!-- Valid invite -->
    <div v-else-if="invite">
      <h1 class="text-2xl font-semibold mb-1">
        You're invited to join {{ invite.familyName }}'s recruiting journey
      </h1>
      <p class="text-gray-600 mb-6">
        {{ invite.inviterName }} has invited you as a {{ invite.role }}.
      </p>

      <!-- Authenticated: just confirm -->
      <div v-if="userStore.isAuthenticated">
        <p class="text-sm text-gray-500 mb-4">
          Connecting as {{ userStore.user?.email }}
          <span
            v-if="userStore.user?.email !== invite.email"
            class="text-amber-600 ml-1"
          >
            (invite was sent to {{ invite.email }})
          </span>
        </p>
        <div class="flex gap-3">
          <DesignSystemButton
            data-testid="connect-button"
            :loading="loading"
            @click="accept"
          >
            Connect to {{ invite.familyName }}
          </DesignSystemButton>
          <DesignSystemButton
            data-testid="decline-button"
            variant="outline"
            color="red"
            :loading="declining"
            @click="decline"
          >
            Decline
          </DesignSystemButton>
        </div>
      </div>

      <!-- Not authenticated: login or sign up -->
      <div v-else>
        <p class="text-sm text-gray-500 mb-4">
          Log in to connect, or
          <NuxtLink to="/signup" class="text-blue-600 hover:underline">create an account</NuxtLink>.
        </p>
        <DesignSystemInput
          v-model="loginEmail"
          data-testid="email-input"
          label="Email"
          type="email"
          :placeholder="invite.email"
          class="mb-3"
        />
        <DesignSystemInput
          v-model="loginPassword"
          data-testid="password-input"
          label="Password"
          type="password"
          class="mb-4"
        />
        <div class="flex gap-3">
          <DesignSystemButton
            data-testid="login-connect-button"
            :loading="loading"
            @click="accept"
          >
            Log in and connect
          </DesignSystemButton>
          <DesignSystemButton
            data-testid="decline-button"
            variant="outline"
            color="red"
            :loading="declining"
            @click="decline"
          >
            Decline
          </DesignSystemButton>
        </div>
      </div>
    </div>
  </div>
</template>
