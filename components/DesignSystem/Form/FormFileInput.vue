<script setup lang="ts">
import { useId } from "vue";

interface Props {
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  accept: "",
  multiple: false,
  required: false,
  disabled: false,
  helperText: "",
});

const emit = defineEmits<{
  change: [files: FileList | null];
}>();

const id = useId();

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("change", target.files);
}
</script>

<template>
  <div class="space-y-1">
    <label :for="id" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
    </label>
    <input
      :id="id"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :required="required"
      :disabled="disabled"
      class="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      @change="handleChange"
    />
    <p v-if="helperText" class="text-xs text-slate-500">
      {{ helperText }}
    </p>
  </div>
</template>
