<script setup lang="ts">
import { ref } from "vue";
import { useInteractions } from "~/composables/useInteractions";
import { useUserStore } from "~/stores/user";
import type { Interaction } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const { createInteraction, loading } = useInteractions();

const pageTitle = computed(() => {
  return userStore.isAthlete ? "Log My Interaction" : "Log Interaction";
});

const handleSubmit = async (formData: any) => {
  try {
    // Convert local datetime to UTC ISO string
    const localDate = new Date(formData.occurred_at);
    const utcDatetime = localDate.toISOString();

    const interactionData: Omit<Interaction, "id" | "created_at"> = {
      school_id: formData.school_id,
      coach_id: formData.coach_id || null,
      type: formData.type as Interaction["type"],
      direction: formData.direction as Interaction["direction"],
      occurred_at: utcDatetime,
      subject: formData.subject || null,
      content: formData.content || null,
      sentiment: formData.sentiment as Interaction["sentiment"],
      attachments: [], // Will be populated by createInteraction if files are uploaded
    };

    await createInteraction(interactionData);

    await navigateTo("/interactions");
  } catch (err) {
    console.error("Failed to log interaction:", err);
  }
};

const handleCancel = () => {
  navigateTo("/interactions");
};
</script>

<template>
  <FormPageLayout
    back-to="/interactions"
    back-text="Back to Interactions"
    :title="pageTitle"
    description="Record a new communication with a school or coach"
    header-color="indigo"
  >
    <InteractionForm
      :loading="loading"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </FormPageLayout>
</template>
