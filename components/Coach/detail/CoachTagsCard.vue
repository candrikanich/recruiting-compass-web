<script setup lang="ts">
import { ref } from "vue";

defineProps<{ tags: string[] }>();
const emit = defineEmits<{ add: [tag: string]; remove: [tag: string] }>();

const draft = ref("");

function submit(): void {
  const t = draft.value.trim();
  if (t) emit("add", t);
  draft.value = "";
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</h3>
    <div class="flex flex-wrap gap-2">
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
      >
        {{ tag }}
        <button
          :data-testid="`remove-tag-${tag}`"
          type="button"
          class="text-slate-400 hover:text-slate-700"
          :aria-label="`Remove tag ${tag}`"
          @click="emit('remove', tag)"
        >
          ×
        </button>
      </span>
    </div>
    <input
      data-testid="add-tag-input"
      v-model="draft"
      type="text"
      placeholder="+ Add Tag"
      class="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      @keydown.enter.prevent="submit"
    />
  </section>
</template>
