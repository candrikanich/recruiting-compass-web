<script setup lang="ts">
defineProps<{ notes: string | null }>();
const emit = defineEmits<{ edit: [] }>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Internal Notes</h3>
      <button
        type="button"
        data-testid="edit-notes"
        class="text-xs font-medium text-brand-blue-600 hover:underline"
        @click="emit('edit')"
      >
        Edit
      </button>
    </div>

    <p v-if="notes" class="whitespace-pre-wrap text-sm text-slate-700">{{ notes }}</p>
    <p v-else class="text-sm text-slate-400">No notes yet.</p>
  </section>
</template>
