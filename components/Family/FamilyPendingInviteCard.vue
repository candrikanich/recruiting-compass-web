<script setup lang="ts">
defineProps<{
  invitation: {
    id: string
    invited_email: string
    role: 'player' | 'parent'
    expires_at: string
  }
}>()

const emit = defineEmits<{ revoke: [id: string] }>()

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
    <button
      data-testid="revoke-invite-button"
      class="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
      @click="emit('revoke', invitation.id)"
    >
      Revoke
    </button>
  </div>
</template>
