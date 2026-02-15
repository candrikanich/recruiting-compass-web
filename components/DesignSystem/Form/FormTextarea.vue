<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    error?: string
    rows?: number
    maxlength?: number
    showCounter?: boolean
  }>(),
  {
    placeholder: '',
    required: false,
    disabled: false,
    error: '',
    rows: 4,
    maxlength: undefined,
    showCounter: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const id = useId()

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

const handleBlur = () => {
  emit('blur')
}

const characterCount = computed(() => props.modelValue.length)
const isApproachingLimit = computed(() => {
  if (!props.maxlength) return false
  return characterCount.value > props.maxlength * 0.9
})
</script>

<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" aria-hidden="true">*</span>
      <span v-if="required" class="sr-only">(required)</span>
    </label>

    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="w-full px-4 py-3 bg-white border-2 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      :class="error ? 'border-red-500' : 'border-slate-300'"
      @input="handleInput"
      @blur="handleBlur"
    />

    <div v-if="showCounter && maxlength" class="text-xs mt-1" :class="isApproachingLimit ? 'text-red-600' : 'text-slate-500'">
      {{ characterCount }}/{{ maxlength }} characters
    </div>

    <div v-if="error" :id="`${id}-error`" role="alert" class="text-sm text-red-600 mt-1">
      {{ error }}
    </div>
  </div>
</template>
