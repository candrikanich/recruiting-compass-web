<script setup lang="ts">
import { useId } from 'vue'

interface Props {
  modelValue: boolean
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const id = useId()

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :id="id"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="w-4 h-4 border-2 border-slate-300 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      @change="handleChange"
    />
    <label
      :for="id"
      class="text-sm font-medium text-slate-700"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    >
      {{ label }}
    </label>
  </div>
</template>
