<template>
  <div>
    <label :for="inputId" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(required)</span>
      <span v-if="autoFilled" class="text-sm text-blue-700 ml-2">(auto-filled)</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      class="w-full px-4 py-3 border-2 rounded-xl transition-colors"
      :class="[
        error ? 'border-red-500' : 'border-slate-300',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
    />
    <DesignSystemFieldError v-if="error" :error="error" :id="`${inputId}-error`" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    label: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    error?: string
    autoFilled?: boolean
    type?: string
    maxlength?: number
  }>(),
  {
    placeholder: '',
    required: false,
    disabled: false,
    autoFilled: false,
    type: 'text',
    maxlength: undefined
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur', event: FocusEvent): void
}>()

const inputId = computed(() => {
  return `input-${props.label.toLowerCase().replace(/\s+/g, '-')}`
})
</script>
