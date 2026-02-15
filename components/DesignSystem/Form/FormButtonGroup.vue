<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  submitDisabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  submitLabel: 'Submit',
  cancelLabel: 'Cancel',
  loading: false,
  submitDisabled: false,
})

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const computedSubmitLabel = computed(() => {
  if (!props.loading) return props.submitLabel

  // Convert "Add School" → "Adding...", "Save" → "Saving...", etc.
  // Handle verbs ending in 'e' (save, update, delete, create) by removing the 'e' before adding 'ing'
  let base = props.submitLabel
  base = base.replace(/^(Save|Update|Delete|Create)(\s|$)/, '$1ing$2')
  base = base.replace(/^(Add|Submit)(\s|$)/, '$1ing$2')

  // Remove the double 'e' that results from "Saveing" → "Saving", etc.
  base = base.replace(/eing/, 'ing')

  return base === props.submitLabel ? 'Loading...' : `${base}...`
})
</script>

<template>
  <div class="flex gap-3 justify-end">
    <button
      type="button"
      class="px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading"
      @click="emit('cancel')"
    >
      {{ cancelLabel }}
    </button>
    <button
      type="submit"
      class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="submitDisabled || loading"
      @click.prevent="emit('submit')"
    >
      {{ computedSubmitLabel }}
    </button>
  </div>
</template>
