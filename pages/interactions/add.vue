<script setup lang="ts">
import { ref, computed } from "vue";
import { navigateTo } from "#app";
import { useInteractions } from "~/composables/useInteractions";
import { useUserStore } from "~/stores/user";
import { useAppToast } from "~/composables/useAppToast";
import { useSupabase } from "~/composables/useSupabase";
import type { Interaction, School } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

definePageMeta({
  middleware: "auth",
});

const logger = createClientLogger("InteractionAdd");
const userStore = useUserStore();
const { createInteraction, loading } = useInteractions();
const { showToast } = useAppToast();

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

    // A DB trigger auto-advances a pre-contact school to `contacted` when an
    // interaction is logged. Look up the school's pre-contact state (no School
    // object is in scope here) so we can confirm the advance afterward — matches
    // the iOS manual-log flow.
    let wasPreContact = false;
    let advancedSchoolName = "";
    if (formData.school_id) {
      const supabase = useSupabase();
      const { data: schoolRow } = await supabase
        .from("schools")
        .select("status, name")
        .eq("id", formData.school_id)
        .maybeSingle();
      const school = schoolRow as Pick<School, "status" | "name"> | null;
      wasPreContact = school?.status === "researching";
      advancedSchoolName = school?.name ?? "";
    }

    await createInteraction(interactionData);

    if (wasPreContact) {
      showToast(`${advancedSchoolName} moved to Contacted`, "success");
    }

    await navigateTo("/interactions");
  } catch (err) {
    logger.error("Failed to log interaction", err);
    showToast(
      "Something went wrong logging this interaction. Please try again.",
      "error",
    );
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
