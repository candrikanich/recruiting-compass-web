<template>
  <div class="divide-y divide-gray-200">
    <div v-for="entry in entries" :key="entry.id" class="py-4">
      <button
        :data-testid="`faq-question-${entry.id}`"
        class="flex w-full items-center justify-between text-left font-medium text-gray-900"
        :aria-expanded="openId === entry.id"
        :aria-controls="`faq-answer-${entry.id}`"
        @click="toggle(entry.id)"
      >
        {{ entry.question }}
        <UIcon
          :name="
            openId === entry.id
              ? 'i-heroicons-chevron-up'
              : 'i-heroicons-chevron-down'
          "
        />
      </button>
      <p
        v-if="openId === entry.id"
        :id="`faq-answer-${entry.id}`"
        role="region"
        class="mt-2 text-gray-600"
      >
        {{ entry.answer }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { FaqEntry } from "./faqEntries";

defineProps<{ entries: FaqEntry[] }>();

const openId = ref<string | null>(null);
const toggle = (id: string) => {
  openId.value = openId.value === id ? null : id;
};
</script>
