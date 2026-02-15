<template>
  <div>
    <label :for="inputId" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(required)</span>
      <span v-if="autoFilled" class="text-xs font-normal text-blue-700 ml-1">(auto-filled)</span>
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
      class="px-4 py-3 bg-white border-2 rounded-xl"
      :class="[
        error ? 'border-red-500' : 'border-slate-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'transition-all placeholder:text-slate-600',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <DesignSystemFieldError v-if="error" :error="error" :id="`${inputId}-error`" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    error?: string
    autoFilled?: boolean
    type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number'
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
  'update:modelValue': [value: string]
  blur: []
}>()

const inputId = useId()
</script>
