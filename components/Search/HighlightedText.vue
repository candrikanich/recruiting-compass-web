<template>
  <span>
    <template v-for="(part, index) in parts" :key="index">
      <mark v-if="part.highlight" class="bg-yellow-200 font-semibold">{{ part.text }}</mark>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  text: string
  query: string
}

const props = defineProps<Props>()

const parts = computed(() => {
  if (!props.query || !props.text) {
    return [{ text: props.text, highlight: false }]
  }

  const query = props.query.toLowerCase()
  const text = props.text
  const parts: Array<{ text: string; highlight: boolean }> = []

  let lastIndex = 0
  let index = 0

  // Find all occurrences of the query in the text (case-insensitive)
  while ((index = text.toLowerCase().indexOf(query, lastIndex)) !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, index), highlight: false })
    }

    // Add matched text
    parts.push({ text: text.substring(index, index + query.length), highlight: true })
    lastIndex = index + query.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlight: false })
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }]
})
</script>

<style scoped>
mark {
  background-color: #fef08a;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
</style>
