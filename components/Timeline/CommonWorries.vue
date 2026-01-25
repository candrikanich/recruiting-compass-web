<template>
  <div
    class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200 shadow-sm p-6"
  >
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">❓</span>
      <h3 class="text-lg font-bold text-slate-900">Common Worries</h3>
    </div>

    <p class="text-sm text-slate-600 mb-4">
      Questions other parents ask at this stage
    </p>

    <div class="space-y-2">
      <div
        v-if="worries.length === 0"
        class="text-sm text-slate-500 py-4 text-center"
      >
        No common worries at this stage.
      </div>

      <details
        v-for="worry in worries"
        :key="worry.id"
        class="group bg-white rounded-lg border border-amber-100 p-3 cursor-pointer hover:border-amber-200 transition"
      >
        <summary class="font-medium text-slate-900 flex items-center gap-2">
          <span
            class="text-amber-600 transition group-open:rotate-90"
            style="display: inline-block"
          >
            ▶
          </span>
          {{ worry.question }}
        </summary>
        <div class="mt-3 ml-6 text-sm text-slate-600 leading-relaxed">
          {{ worry.answer }}
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ParentWorry } from "~/utils/parentWorries";

interface Props {
  worries: ParentWorry[];
}

defineProps<Props>();
</script>
