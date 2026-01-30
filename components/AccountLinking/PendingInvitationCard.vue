<template>
  <div class="border border-amber-200 bg-amber-50 rounded-lg p-4">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <p class="font-semibold text-gray-900">
          You've been invited to link accounts
        </p>
        <p class="text-sm text-gray-700 mt-2">
          <span class="font-medium">{{ initiatorName }}</span> ({{ invitation.invited_email }}) has invited you to link your Recruiting Compass accounts.
        </p>
        <p class="text-sm text-gray-600 mt-1">
          This will let you share recruiting data while keeping separate logins.
        </p>

        <!-- Expiry warning -->
        <div v-if="isExpiringSoon" class="mt-2 flex items-center gap-2">
          <span class="text-xs text-yellow-700 font-medium"
            >⚠️ Expires {{ expiresIn }}</span
          >
        </div>

        <div v-if="isExpired" class="mt-2">
          <span class="text-xs text-red-600 font-medium"
            >❌ Invitation expired</span
          >
        </div>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          v-if="!isExpired"
          type="button"
          @click="$emit('accept', invitation.id)"
          :disabled="loading"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition"
        >
          {{ loading ? "Accepting..." : "Accept" }}
        </button>

        <button
          v-if="!isExpired"
          type="button"
          @click="$emit('reject', invitation.id)"
          :disabled="loading"
          class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition"
        >
          {{ loading ? "Rejecting..." : "Decline" }}
        </button>

        <button
          v-if="isExpired"
          type="button"
          disabled
          class="px-4 py-2 text-gray-400 border border-gray-300 rounded-lg text-sm font-medium"
        >
          Expired
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AccountLink } from "~/types/models";

const props = withDefaults(
  defineProps<{
    invitation: AccountLink;
    initiatorName?: string | null;
    loading?: boolean;
  }>(),
  {
    initiatorName: null,
    loading: false,
  },
);

defineEmits<{
  accept: [linkId: string];
  reject: [linkId: string];
}>();

const expiresAt = computed(() => new Date(props.invitation.expires_at));
const now = computed(() => new Date());
const isExpired = computed(() => expiresAt.value < now.value);

const timeUntilExpiry = computed(() => {
  const diff = expiresAt.value.getTime() - now.value.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  return "very soon";
});

const isExpiringSoon = computed(() => {
  const diff = expiresAt.value.getTime() - now.value.getTime();
  const hoursLeft = diff / (1000 * 60 * 60);
  return hoursLeft < 48 && hoursLeft > 0;
});

const expiresIn = computed(() => timeUntilExpiry.value);
</script>
