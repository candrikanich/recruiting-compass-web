<template>
  <div
    class="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
  >
    <div class="flex items-center gap-4 flex-1">
      <div
        class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"
      >
        <span class="text-lg font-bold text-blue-600">
          {{
            account.full_name?.[0]?.toUpperCase() ||
            account.email[0].toUpperCase()
          }}
        </span>
      </div>

      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900">
          {{ account.full_name || "Unnamed User" }}
        </p>
        <p class="text-sm text-gray-600">{{ account.email }}</p>
        <div class="flex items-center gap-2 mt-1">
          <span
            class="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
          >
            {{ account.relationship }}
          </span>
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <CheckIcon class="w-3 h-3" />
            <span>Linked</span>
          </span>
        </div>
      </div>
    </div>

    <button
      type="button"
      @click="$emit('unlink', account.user_id)"
      :disabled="loading"
      class="ml-4 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition"
    >
      {{ loading ? "Unlinking..." : "Unlink" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon } from "@heroicons/vue/24/solid";
import type { LinkedAccount } from "~/types/models";

withDefaults(
  defineProps<{
    account: LinkedAccount;
    loading?: boolean;
  }>(),
  {
    loading: false,
  },
);

defineEmits<{
  unlink: [userId: string];
}>();
</script>
