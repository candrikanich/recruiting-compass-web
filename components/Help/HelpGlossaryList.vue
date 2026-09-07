<template>
  <div>
    <div v-for="[letter, group] in groupedTerms" :key="letter" class="mb-6">
      <h3 class="mb-2 text-sm font-semibold text-gray-400 uppercase">
        {{ letter }}
      </h3>
      <dl>
        <div v-for="entry in group" :key="entry.id" class="mb-3">
          <dt class="font-medium text-gray-900">{{ entry.term }}</dt>
          <dd class="text-gray-600">{{ entry.definition }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { GlossaryTerm } from "./glossaryTerms";

const props = defineProps<{ terms: GlossaryTerm[] }>();

const groupedTerms = computed(() => {
  const groups = new Map<string, GlossaryTerm[]>();
  for (const entry of props.terms) {
    const letter = entry.term[0]!.toUpperCase();
    const existing = groups.get(letter) ?? [];
    groups.set(letter, [...existing, entry]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
});
</script>
