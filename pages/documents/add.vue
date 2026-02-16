<script setup lang="ts">
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useUserStore } from "~/stores/user";
import type { Database } from "~/types/database";

type DocumentType = Database["public"]["Enums"]["document_type"];

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const { uploadDocument, loading, uploadError } = useDocumentsConsolidated();

const pageTitle = computed(() => {
  return userStore.isAthlete ? "Upload My Document" : "Upload Document";
});

const handleSubmit = async (formData: any) => {
  try {
    if (!formData.file) {
      throw new Error("No file selected");
    }

    const result = await uploadDocument(
      formData.file,
      formData.type as DocumentType,
      formData.title,
      formData.description || undefined
    );

    if (result.success) {
      await navigateTo("/documents");
    } else {
      console.error("Upload failed:", uploadError.value);
    }
  } catch (err) {
    console.error("Failed to upload document:", err);
  }
};

const handleCancel = () => {
  navigateTo("/documents");
};
</script>

<template>
  <FormPageLayout
    back-to="/documents"
    back-text="Back to Documents"
    :title="pageTitle"
    description="Upload a video, transcript, resume, or other recruiting document"
    header-color="blue"
  >
    <!-- Error Message -->
    <div
      v-if="uploadError"
      class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
    >
      <p class="text-sm text-red-700">{{ uploadError }}</p>
    </div>

    <DocumentForm
      :loading="loading"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </FormPageLayout>
</template>
