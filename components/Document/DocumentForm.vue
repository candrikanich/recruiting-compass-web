<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useFormValidation } from "~/composables/useFormValidation";
import { useSchools } from "~/composables/useSchools";
import type { Database } from "~/types/database";

type DocumentType = Database["public"]["Enums"]["document_type"];

interface DocumentFormData {
  type: string;
  title: string;
  description: string;
  schoolId: string;
  version: string;
  file: File | null;
}

interface Props {
  loading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  submit: [data: DocumentFormData];
  cancel: [];
}>();

const { validateFile } = useFormValidation();
const { schools, fetchSchools } = useSchools();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");
const fileError = ref("");

const form = reactive({
  type: "",
  title: "",
  description: "",
  schoolId: "",
  version: "1",
});

const typeOptions = computed(() => [
  { value: "", label: "Select Type" },
  { value: "highlight_video", label: "🎥 Highlight Video" },
  { value: "transcript", label: "📄 Transcript" },
  { value: "resume", label: "📋 Resume" },
  { value: "rec_letter", label: "💌 Recommendation Letter" },
  { value: "questionnaire", label: "📝 Questionnaire" },
  { value: "stats_sheet", label: "📊 Stats Sheet" },
]);

const schoolOptions = computed(() => [
  { value: "", label: "General / Not School-Specific" },
  ...schools.value.map((s) => ({ value: s.id, label: s.name })),
]);

const allowedFileTypes = computed(() => {
  const typeExtensions: Record<string, string[]> = {
    highlight_video: [".mp4", ".mov", ".avi"],
    transcript: [".pdf", ".txt"],
    resume: [".pdf", ".doc", ".docx"],
    rec_letter: [".pdf"],
    questionnaire: [".pdf", ".doc", ".docx"],
    stats_sheet: [".csv", ".xls", ".xlsx"],
  };

  if (!form.type || !typeExtensions[form.type]) {
    return "Select a document type first";
  }

  return typeExtensions[form.type].join(", ");
});

const isFormValid = computed(() => {
  return form.type && form.title && selectedFile.value;
});

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  fileError.value = "";

  if (target.files && target.files.length > 0) {
    const file = target.files[0];

    try {
      validateFile(file, form.type as DocumentType);
      selectedFile.value = file;
      selectedFileName.value = file.name;
    } catch (err) {
      fileError.value = err instanceof Error ? err.message : "Invalid file";
      selectedFile.value = null;
      selectedFileName.value = "";
      target.value = "";
    }
  }
};

const handleSubmit = () => {
  if (!isFormValid.value) return;

  emit("submit", {
    ...form,
    file: selectedFile.value,
  });
};

onMounted(async () => {
  await fetchSchools();
});
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Document Type -->
    <DesignSystemFormSelect
      v-model="form.type"
      label="Document Type"
      :required="true"
      :disabled="loading"
      :options="typeOptions"
    />

    <!-- Title -->
    <DesignSystemFormInput
      v-model="form.title"
      label="Title"
      :required="true"
      :disabled="loading"
      placeholder="e.g., Spring 2025 Highlights"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- School -->
      <DesignSystemFormSelect
        v-model="form.schoolId"
        label="School"
        :disabled="loading"
        :options="schoolOptions"
      />

      <!-- Version -->
      <DesignSystemFormInput
        v-model="form.version"
        label="Version"
        type="number"
        :disabled="loading"
        placeholder="1"
        :min="1"
      />
    </div>

    <!-- Description -->
    <DesignSystemFormTextarea
      v-model="form.description"
      label="Description"
      :disabled="loading"
      placeholder="Additional details about this document..."
      :rows="4"
    />

    <!-- File Upload -->
    <div>
      <label
        for="file"
        class="block text-sm font-medium mb-2 text-slate-700"
      >
        Select File <span class="text-red-500" aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
      </label>
      <div class="relative">
        <input
          id="file"
          ref="fileInput"
          type="file"
          @change="handleFileSelect"
          :disabled="!form.type || loading"
          class="sr-only"
        />
        <button
          type="button"
          @click="fileInput?.click()"
          :disabled="!form.type || loading"
          class="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ selectedFileName || "Click to select file" }}
        </button>
      </div>
      <p v-if="form.type" class="text-xs text-slate-500 mt-2">
        Allowed formats: {{ allowedFileTypes }}
      </p>
      <p v-if="fileError" class="text-xs text-red-600 mt-2">
        {{ fileError }}
      </p>
    </div>

    <!-- Submit and Cancel buttons -->
    <div class="flex gap-3 pt-4">
      <button
        data-testid="upload-document-button"
        type="submit"
        :disabled="loading || !isFormValid"
        class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? "Uploading..." : "Upload Document" }}
      </button>
      <button
        data-testid="cancel-document-button"
        type="button"
        @click="$emit('cancel')"
        :disabled="loading"
        class="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  </form>
</template>
