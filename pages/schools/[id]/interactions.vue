<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/schools/${id}`"
          class="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to School
        </NuxtLink>
      </div>

      <!-- Header -->
      <div
        class="-mx-4 mb-8 border-b border-slate-200 bg-white px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div class="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <SchoolLogo
              v-if="schoolData"
              :school="schoolData"
              size="md"
              :transition-name="`school-logo-${id}`"
            />
            <div>
              <h1 class="text-2xl font-semibold text-slate-900">
                Interactions
              </h1>
              <p class="text-sm text-slate-600">
                {{ interactions.length }} interaction{{
                  interactions.length !== 1 ? "s" : ""
                }}
              </p>
            </div>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
          >
            <span v-if="!showAddForm">+</span>
            {{ showAddForm ? "Cancel" : "Log Interaction" }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <InteractionsInteractionFiltersBar
        v-model:selected-type="selectedType"
        v-model:selected-direction="selectedDirection"
        v-model:selected-date-range="selectedDateRange"
        v-model:selected-sentiment="selectedSentiment"
        @clear="clearFilters"
      />

      <!-- Summary Metrics -->
      <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-600 sm:text-sm">
            Total Interactions
          </p>
          <p class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {{ filteredInteractions.length }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-600 sm:text-sm">Sent</p>
          <p class="mt-1 text-2xl font-bold text-blue-600 sm:text-3xl">
            {{ outboundCount }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-600 sm:text-sm">Received</p>
          <p class="mt-1 text-2xl font-bold text-emerald-600 sm:text-3xl">
            {{ inboundCount }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-600 sm:text-sm">
            Last Contact
          </p>
          <p class="mt-1 text-xl font-bold text-purple-600 sm:text-2xl">
            {{ lastContactDisplay }}
          </p>
        </div>
      </div>

      <!-- Add Interaction Form -->
      <InteractionsInteractionAddForm
        v-if="showAddForm"
        :coaches="coaches"
        :loading="loading"
        @submit="handleAddInteraction"
        @cancel="showAddForm = false"
      />

      <!-- Loading State -->
      <div
        v-if="loading && interactions.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
        aria-live="polite"
      >
        <div
          class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading interactions...</p>
      </div>

      <!-- Empty State (No Interactions at All) -->
      <div
        v-if="!loading && interactions.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="mx-auto mb-4 h-12 w-12 text-slate-300"
        />
        <p class="mb-2 font-medium text-slate-900">
          No interactions logged yet
        </p>
        <button
          @click="showAddForm = true"
          class="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Log your first interaction
        </button>
      </div>

      <!-- Empty State (No Matching Filters) -->
      <div
        v-if="
          !loading &&
          interactions.length > 0 &&
          filteredInteractions.length === 0
        "
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="mx-auto mb-4 h-12 w-12 text-slate-300"
        />
        <p class="mb-2 font-medium text-slate-900">
          No interactions match your filters
        </p>
        <button
          @click="clearFilters"
          class="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Clear Filters
        </button>
      </div>

      <!-- Interactions Timeline -->
      <div v-if="filteredInteractions.length > 0" class="space-y-4">
        <InteractionsInteractionTimelineItem
          v-for="interaction in filteredInteractions"
          :key="interaction.id"
          :interaction="interaction"
          :coach-display="getCoachDisplay(interaction.coach_id)"
          @delete="deleteInteraction"
        />
      </div>
    </div>

    <!-- Live Region for Screen Reader Announcements -->
    <div v-bind="liveRegionAttrs">{{ announcement }}</div>

    <!-- Confirm Delete Dialog -->
    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Interaction"
      message="Are you sure you want to delete this interaction?"
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="executeDeleteInteraction"
      @cancel="cancelDeleteInteraction"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useInteractions } from "~/composables/useInteractions";
import { useInteractionReminders } from "~/composables/useInteractionReminders";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useAppToast } from "~/composables/useAppToast";
import type { Interaction, School } from "~/types/models";
import { useLiveRegion } from "~/composables/useLiveRegion";
import { parseLocalDateOnly } from "~/utils/localDate";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("SchoolInteractions");

const route = useRoute();
const id = route.params.id as string;

const {
  interactions,
  loading,
  fetchInteractions,
  createInteraction,
  smartDelete,
} = useInteractions();

const { createReminder } = useInteractionReminders();
const { coaches, fetchCoaches } = useCoaches();
const { getSchool } = useSchools();
const { showToast } = useAppToast();

const { announcement, announce, liveRegionAttrs } = useLiveRegion();
const isDeleteDialogOpen = ref(false);
const interactionToDeleteId = ref<string | null>(null);
const showAddForm = ref(false);
const schoolName = ref("");
const schoolData = ref<School | null>(null);
const coachMap = ref<Record<string, string>>({});

const selectedType = ref("");
const selectedDirection = ref("");
const selectedDateRange = ref("");
const selectedSentiment = ref("");

const filteredInteractions = computed(() => {
  let filtered = interactions.value;

  if (selectedType.value) {
    filtered = filtered.filter((i) => i.type === selectedType.value);
  }

  if (selectedDirection.value) {
    filtered = filtered.filter((i) => i.direction === selectedDirection.value);
  }

  if (selectedSentiment.value) {
    filtered = filtered.filter((i) => i.sentiment === selectedSentiment.value);
  }

  if (selectedDateRange.value) {
    const days = parseInt(selectedDateRange.value);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    filtered = filtered.filter(
      (i) => new Date(i.occurred_at || "") > cutoffDate,
    );
  }

  return filtered.sort(
    (a, b) =>
      new Date(b.occurred_at || "").getTime() -
      new Date(a.occurred_at || "").getTime(),
  );
});

const outboundCount = computed(
  () =>
    filteredInteractions.value.filter((i) => i.direction === "outbound").length,
);

const inboundCount = computed(
  () =>
    filteredInteractions.value.filter((i) => i.direction === "inbound").length,
);

const lastContactDisplay = computed(() => {
  if (filteredInteractions.value.length === 0) return "—";
  const lastInteraction = filteredInteractions.value[0];
  if (!lastInteraction.occurred_at) return "Unknown";

  const date = new Date(lastInteraction.occurred_at);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
  if (secondsAgo < 2592000) return "weeks ago";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
});

const clearFilters = () => {
  selectedType.value = "";
  selectedDirection.value = "";
  selectedDateRange.value = "";
  selectedSentiment.value = "";
};

const getCoachDisplay = (coachId: string | null | undefined) => {
  if (!coachId) return "";
  return coachMap.value[coachId] || "";
};

type InteractionSubmitData = {
  type: string;
  direction: string;
  coach_id: string;
  subject: string;
  content: string;
  sentiment: string;
  occurred_at: string;
  selectedFiles: File[];
  reminderEnabled: boolean;
  reminderDate: string;
  reminderType: "email" | "sms" | "phone_call";
};

const handleAddInteraction = async (data: InteractionSubmitData) => {
  try {
    const occurredAtDate = new Date(data.occurred_at);
    const isoDatetime = occurredAtDate.toISOString();

    // A DB trigger auto-advances a pre-contact school to `contacted` when an
    // interaction is logged. Capture the pre-contact state before the create so
    // we can confirm the advance to the user afterward (matches iOS manual-log).
    const wasPreContact = schoolData.value?.status === "researching";
    const advancedSchoolName = schoolName.value;

    const createdInteraction = await createInteraction(
      {
        school_id: id,
        coach_id: data.coach_id ? data.coach_id : null,
        event_id: null,
        type: data.type as Interaction["type"],
        direction: data.direction as "outbound" | "inbound",
        subject: data.subject || null,
        content: data.content,
        sentiment: (data.sentiment || null) as Interaction["sentiment"],
        occurred_at: isoDatetime,
        logged_by: "",
        attachments: [],
      },
      data.selectedFiles.length > 0 ? data.selectedFiles : undefined,
    );

    if (data.reminderEnabled && data.reminderDate && createdInteraction?.id) {
      try {
        // `data.reminderDate` comes from a date-only `<input type="date">` —
        // parse as LOCAL midnight before storing, or the reminder's due_date
        // ends up at UTC midnight, which is the previous evening in every
        // US timezone (reminder shows/expires a day early).
        const reminderDateTime = parseLocalDateOnly(
          data.reminderDate,
        ).toISOString();
        await createReminder(
          `Follow up on ${data.subject || "interaction"}`,
          reminderDateTime,
          "follow_up",
          "medium",
          data.content,
          id,
          data.coach_id ? data.coach_id : undefined,
          createdInteraction.id,
        );
      } catch (reminderErr) {
        logger.error("Failed to create reminder", reminderErr);
      }
    }

    showAddForm.value = false;
    await fetchInteractions({ schoolId: id });

    if (wasPreContact) {
      showToast(`${advancedSchoolName} moved to Contacted`, "success");
    }
  } catch (err) {
    logger.error("Failed to log interaction", err);
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error occurred";
    announce(`Failed to log interaction: ${errorMsg}`);
  }
};

const deleteInteraction = (interactionId: string) => {
  interactionToDeleteId.value = interactionId;
  isDeleteDialogOpen.value = true;
};

const executeDeleteInteraction = async () => {
  if (!interactionToDeleteId.value) return;
  const deletingId = interactionToDeleteId.value;
  isDeleteDialogOpen.value = false;
  interactionToDeleteId.value = null;
  try {
    const result = await smartDelete(deletingId);
    const message = result.cascadeUsed
      ? "Interaction and related records deleted"
      : "Interaction deleted";
    announce(message);
    await fetchInteractions({ schoolId: route.params.id as string });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to delete interaction";
    announce(errorMessage);
    logger.error("Failed to delete interaction", errorMessage);
  }
};

const cancelDeleteInteraction = () => {
  isDeleteDialogOpen.value = false;
  interactionToDeleteId.value = null;
};

onMounted(async () => {
  try {
    const school = await getSchool(id);
    if (school) {
      schoolName.value = school.name;
      schoolData.value = school;
    }

    await Promise.all([fetchInteractions({ schoolId: id }), fetchCoaches(id)]);

    coaches.value.forEach((coach) => {
      coachMap.value[coach.id] = `${coach.first_name} ${coach.last_name}`;
    });
  } catch (err) {
    logger.error("Error loading interactions page", err);
  }
});
</script>
