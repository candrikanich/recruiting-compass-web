<template>
  <div class="border border-amber-200 bg-amber-50 rounded-lg p-4">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <p class="font-semibold text-gray-900 flex items-center gap-2">
          <ExclamationCircleIcon class="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>{{ link.invited_email }} accepted your invitation!</span>
        </p>

        <!-- Verification message -->
        <p class="text-sm text-gray-700 mt-3 font-medium">
          Please confirm this is the person you invited:
        </p>

        <!-- Details -->
        <div class="mt-3 pl-7 space-y-1 text-sm text-gray-600">
          <p>
            <span class="font-medium text-gray-700">Email:</span>
            {{ link.invited_email }}
          </p>
          <p v-if="inviteeName">
            <span class="font-medium text-gray-700">Name:</span>
            {{ inviteeName }}
          </p>
          <p>
            <span class="font-medium text-gray-700">Role:</span>
            <span class="capitalize">{{ inviteeRole }}</span>
          </p>
        </div>

        <!-- Warning -->
        <div class="mt-3 p-3 bg-amber-100 border border-amber-200 rounded text-xs text-amber-800">
          <p class="font-medium">⚠️ This action cannot be undone once confirmed.</p>
          <p class="mt-1">Confirming will activate data sharing between both accounts.</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          @click="$emit('reject', link.id)"
          :disabled="loading"
          class="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition"
        >
          {{ loading ? "Rejecting..." : "Reject" }}
        </button>

        <button
          type="button"
          @click="$emit('confirm', link.id)"
          :disabled="loading"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition"
        >
          {{ loading ? "Confirming..." : "Confirm" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ExclamationCircleIcon } from "@heroicons/vue/24/solid";
import type { AccountLink } from "~/types/models";

const props = withDefaults(
  defineProps<{
    link: AccountLink;
    inviteeName?: string | null;
    loading?: boolean;
  }>(),
  {
    inviteeName: null,
    loading: false,
  },
);

defineEmits<{
  confirm: [linkId: string];
  reject: [linkId: string];
}>();

const inviteeRole = computed(() => {
  if (props.link.player_user_id) return "Player/Student";
  if (props.link.parent_user_id) return "Parent";
  return "Family Member";
});
</script>
