<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { navigateTo } from "#app";
import { useRoute } from "vue-router";
import { useInteractions } from "~/composables/useInteractions";
import { useInboundDrafts } from "~/composables/useInboundDrafts";
import { useUserStore } from "~/stores/user";
import { useAppToast } from "~/composables/useAppToast";
import { useSupabase } from "~/composables/useSupabase";
import type { Interaction, School } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

definePageMeta({
  middleware: "auth",
});

const logger = createClientLogger("InteractionAdd");
const route = useRoute();
const userStore = useUserStore();
const { createInteraction, loading } = useInteractions();
const { showToast } = useAppToast();

// Reviewing an inbound-email draft (#678): the parser's output is prefilled
// here for editing rather than inserted verbatim.
const draftId = computed(() =>
  typeof route.query.draftId === "string" ? route.query.draftId : null,
);
const { drafts, fetchDrafts, confirmDraft } = useInboundDrafts();
const draft = ref<(typeof drafts.value)[number] | null>(null);

// InteractionForm snapshots `initialData` once during its own setup, which Vue
// runs before this page's onMounted. Rendering it before the draft resolves
// would silently drop the parsed subject/body/direction — so hold the form back
// until the fetch settles (found or not). Manual logging has no draft to wait on.
const draftLoaded = ref(false);
const formReady = computed(() => !draftId.value || draftLoaded.value);

onMounted(async () => {
  if (!draftId.value) return;
  try {
    await fetchDrafts();
    draft.value = drafts.value.find((d) => d.id === draftId.value) ?? null;
  } finally {
    // Never leave the page stuck on the spinner: an unfound (or unfetchable)
    // draft still falls through to the blank manual-log form.
    draftLoaded.value = true;
  }
});

// Prefill coach/school when arriving from a coach's "Log Interaction" action,
// or the full parsed draft when reviewing an inbound-email draft. A
// `schoolId` query param — set when returning from creating a new school via
// InteractionForm's "Add it" link (#675) — always wins over the draft's own
// matched_school_id, since it represents the user's most recent choice.
const schoolIdOverride = computed(() =>
  typeof route.query.schoolId === "string" ? route.query.schoolId : "",
);

const initialData = computed<Partial<Interaction>>(() => {
  if (draft.value) {
    return {
      school_id: schoolIdOverride.value || draft.value.matched_school_id || "",
      coach_id: draft.value.matched_coach_id,
      type: "email",
      direction: "inbound",
      subject: draft.value.subject ?? "",
      content: draft.value.body_text ?? "",
      occurred_at: draft.value.occurred_at,
    };
  }
  const coachId =
    typeof route.query.coachId === "string" ? route.query.coachId : "";
  return {
    ...(coachId ? { coach_id: coachId } : {}),
    ...(schoolIdOverride.value ? { school_id: schoolIdOverride.value } : {}),
  };
});

const senderName = computed(() => draft.value?.sender_name ?? null);
const senderEmail = computed(() => draft.value?.sender_email ?? null);
const draftReturnTo = computed(() =>
  draftId.value ? `/interactions/add?draftId=${draftId.value}` : null,
);

const pageTitle = computed(() => {
  if (draftId.value) return "Review Coach Email";
  return userStore.isAthlete ? "Log My Interaction" : "Log Interaction";
});

const handleSubmit = async (formData: any) => {
  // Convert local datetime to UTC ISO string
  const localDate = new Date(formData.occurred_at);
  const utcDatetime = localDate.toISOString();

  if (draftId.value) {
    try {
      await confirmDraft(draftId.value, {
        schoolId: formData.school_id,
        coachId: formData.coach_id || null,
        type: formData.type,
        direction: formData.direction,
        occurredAt: utcDatetime,
        subject: formData.subject || null,
        content: formData.content || null,
      });
      await navigateTo("/inbox/inbound-drafts");
    } catch (err) {
      logger.error("Failed to confirm inbound draft", err);
      showToast(
        "Something went wrong logging this interaction. Please try again.",
        "error",
      );
    }
    return;
  }

  try {
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

const backTo = computed(() =>
  draftId.value ? "/inbox/inbound-drafts" : "/interactions",
);
const backText = computed(() =>
  draftId.value ? "Back to Coach Emails" : "Back to Interactions",
);
const description = computed(() =>
  draftId.value
    ? "Review the parsed email before saving it as an interaction"
    : "Record a new communication with a school or coach",
);

const handleCancel = () => {
  navigateTo(backTo.value);
};
</script>

<template>
  <FormPageLayout
    :back-to="backTo"
    :back-text="backText"
    :title="pageTitle"
    :description="description"
    header-color="indigo"
  >
    <DesignSystemLoadingState v-if="!formReady" />
    <InteractionForm
      v-else
      :loading="loading"
      :initial-data="initialData"
      :sender-name="senderName"
      :sender-email="senderEmail"
      :draft-return-to="draftReturnTo"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </FormPageLayout>
</template>
