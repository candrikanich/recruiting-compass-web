<template>
  <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <p class="font-semibold text-gray-900">
          Invitation sent to {{ invitation.invited_email }}
        </p>

        <!-- Status badge -->
        <div class="flex items-center gap-2 mt-2">
          <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
            <ClockIcon class="w-3 h-3" />
            <span>Awaiting response</span>
          </span>
          <span class="text-xs text-gray-600">
            Sent {{ sentRelativeTime }}
          </span>
        </div>

        <!-- Expiry info -->
        <div v-if="!isExpired" class="mt-2">
          <p class="text-xs text-gray-600">
            Expires {{ expiresIn }}
          </p>
        </div>

        <div v-else class="mt-2">
          <span class="text-xs text-red-600 font-medium">
            ❌ Invitation expired
          </span>
        </div>
      </div>

      <!-- Cancel button -->
      <button
        v-if="!isExpired"
        type="button"
        @click="$emit('cancel', invitation.id)"
        :disabled="loading"
        class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 disabled:opacity-50 text-sm font-medium transition flex-shrink-0"
      >
        {{ loading ? "Cancelling..." : "Cancel" }}
      </button>

      <button
        v-else
        type="button"
        disabled
        class="px-4 py-2 text-gray-400 border border-gray-300 rounded-lg text-sm font-medium flex-shrink-0"
      >
        Expired
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ClockIcon } from "@heroicons/vue/24/outline";
import type { AccountLink } from "~/types/models";

const props = withDefaults(
  defineProps<{
    invitation: AccountLink;
    loading?: boolean;
  }>(),
  {
    loading: false,
  },
);

defineEmits<{
  cancel: [linkId: string];
}>();

const sentAt = computed(() => new Date(props.invitation.invited_at || props.invitation.created_at || ""));
const expiresAt = computed(() => new Date(props.invitation.expires_at));
const now = computed(() => new Date());

const isExpired = computed(() => expiresAt.value < now.value);

const sentRelativeTime = computed(() => {
  const diff = now.value.getTime() - sentAt.value.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "just now";
});

const timeUntilExpiry = computed(() => {
  const diff = expiresAt.value.getTime() - now.value.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  return "very soon";
});

const expiresIn = computed(() => timeUntilExpiry.value);
</script>
