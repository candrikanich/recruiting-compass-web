<script setup lang="ts">
import { useId } from 'vue'

interface Props {
  modelValue: string
  label: string
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1">
    <label
      :for="id"
      class="block text-sm font-medium text-slate-700"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
        aria-hidden="true"
      >*</span>
    </label>
    <input
      :id="id"
      type="date"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
      :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500': error }"
      @input="handleInput"
    />
    <DesignSystemFieldError :error="error" />
  </div>
</template>
