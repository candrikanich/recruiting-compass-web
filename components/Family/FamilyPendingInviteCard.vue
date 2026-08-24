<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  invitation: {
    id: string;
    invited_email: string;
    role: "player" | "parent";
    expires_at: string;
  };
}>();

const emit = defineEmits<{
  revoke: [id: string];
  resend: [payload: { id: string; email: string; role: "player" | "parent" }];
}>();

const resent = ref(false);

function handleResend() {
  if (resent.value) return;
  resent.value = true;
  emit("resend", {
    id: props.invitation.id,
    email: props.invitation.invited_email,
    role: props.invitation.role,
  });
  setTimeout(() => {
    resent.value = false;
  }, 3000);
}

function formatExpiry(dateStr: string): string {
  const expires = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil(
    (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days`;
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
        Invited as {{ invitation.role }} · expires
        {{ formatExpiry(invitation.expires_at) }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button
        data-testid="resend-invite-button"
        :disabled="resent"
        :class="[
          'rounded-lg px-3 py-1 text-sm font-medium transition-all',
          resent
            ? 'sent-flash cursor-not-allowed bg-emerald-50 text-emerald-600'
            : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
        ]"
        @click="handleResend"
      >
        {{ resent ? "Sent ✓" : "Resend" }}
      </button>
      <button
        data-testid="revoke-invite-button"
        class="rounded-lg px-3 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
        @click="emit('revoke', invitation.id)"
      >
        Revoke
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes sent-flash {
  0% {
    transform: scale(0.92);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
.sent-flash {
  animation: sent-flash 0.25s ease-out forwards;
}
</style>
