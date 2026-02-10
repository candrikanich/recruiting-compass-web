<script setup lang="ts">
interface Props {
  modelValue: File[];
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  accept: "",
  multiple: true,
  label: "Attachments (Optional)",
});

const emit = defineEmits<{
  "update:modelValue": [files: File[]];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

const handleClick = () => {
  if (!props.disabled && fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const newFiles = Array.from(target.files);
    const updatedFiles = props.multiple
      ? [...props.modelValue, ...newFiles]
      : newFiles;
    emit("update:modelValue", updatedFiles);

    // Reset input so same file can be selected again
    target.value = "";
  }
};

const removeFile = (index: number) => {
  const updatedFiles = [...props.modelValue];
  updatedFiles.splice(index, 1);
  emit("update:modelValue", updatedFiles);
};
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-slate-700">
      {{ label }}
    </label>

    <div class="mt-2">
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        class="hidden"
        @change="handleFileChange"
      />

      <button
        type="button"
        :disabled="disabled"
        class="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-4 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleClick"
      >
        <svg
          class="mr-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Click to upload files
      </button>

      <div v-if="modelValue.length > 0" class="mt-3 space-y-2">
        <p class="text-xs text-slate-600">
          {{ modelValue.length }}
          {{ modelValue.length === 1 ? "file" : "files" }} selected
        </p>
        <div
          v-for="(file, index) in modelValue"
          :key="`${file.name}-${index}`"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span class="truncate text-sm text-slate-700">{{ file.name }}</span>
          <button
            type="button"
            :disabled="disabled"
            class="ml-2 flex-shrink-0 text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="removeFile(index)"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
