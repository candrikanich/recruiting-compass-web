<script setup lang="ts">
defineProps<{
  overdue: boolean;
  daysSinceContact: number | null;
  channelPreference: boolean;
  preferredChannel: string | null;
}>();
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="overdue"
      role="alert"
      class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="mt-0.5 h-5 w-5 text-red-500"
      />
      <div>
        <p class="font-semibold text-red-700">Urgent: Outreach Overdue</p>
        <p class="text-sm text-red-600">
          No contact in {{ daysSinceContact }} days – consider reaching out
          immediately to maintain connection.
        </p>
      </div>
    </div>
    <div
      v-if="channelPreference"
      class="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
    >
      <UIcon
        name="i-heroicons-information-circle"
        class="mt-0.5 h-5 w-5 text-blue-500"
      />
      <div>
        <p class="font-semibold text-blue-700">Channel Preference detected</p>
        <p class="text-sm text-blue-600">
          Prefers responding via {{ preferredChannel?.replace("_", " ") }}.
        </p>
      </div>
    </div>
  </div>
</template>
