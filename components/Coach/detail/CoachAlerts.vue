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
      class="flex items-center gap-3 rounded-[10px] border border-red-300 bg-red-50 px-4 py-3"
    >
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[14px] bg-red-500"
        aria-hidden="true"
      >
        <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-white" />
      </span>
      <div>
        <p class="text-sm font-bold text-red-500">Urgent: Outreach Overdue</p>
        <p class="text-xs text-slate-600">
          No contact in {{ daysSinceContact }} days – consider reaching out
          immediately to maintain connection.
        </p>
      </div>
    </div>
    <div
      v-if="channelPreference"
      class="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-blue-50 px-4 py-3"
    >
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[14px] bg-blue-500"
        aria-hidden="true"
      >
        <UIcon name="i-heroicons-information-circle" class="h-4 w-4 text-white" />
      </span>
      <div>
        <p class="text-sm font-bold text-blue-500">Channel Preference detected</p>
        <p class="text-xs text-slate-600">
          Prefers responding via {{ preferredChannel?.replace("_", " ") }}.
        </p>
      </div>
    </div>
  </div>
</template>
