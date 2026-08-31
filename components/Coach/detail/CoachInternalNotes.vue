<script setup lang="ts">
defineProps<{ notes: string | null }>();
const emit = defineEmits<{ edit: [] }>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-xs font-bold tracking-wide text-slate-400 uppercase">
        Internal Notes
      </h3>
      <button
        type="button"
        data-testid="edit-notes"
        aria-label="Edit internal notes"
        class="text-slate-400 hover:text-blue-500"
        @click="emit('edit')"
      >
        <UIcon
          name="i-heroicons-pencil"
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
      </button>
    </div>

    <p
      v-if="notes"
      class="text-sm leading-relaxed whitespace-pre-wrap text-slate-900"
    >
      {{ notes }}
    </p>
    <p v-else class="text-sm text-slate-400">No notes yet.</p>
  </section>
</template>
