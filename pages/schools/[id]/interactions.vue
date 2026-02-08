<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/schools/${id}`"
          class="text-blue-600 hover:text-blue-700 font-semibold text-sm"
        >
          ← Back to School
        </NuxtLink>
      </div>

      <!-- Header -->
      <div
        class="bg-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-8"
      >
        <div class="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">Interactions</h1>
            <p class="text-slate-600 text-sm">
              {{ interactions.length }} interaction{{
                interactions.length !== 1 ? "s" : ""
              }}
            </p>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
          >
            <span v-if="!showAddForm">+</span>
            {{ showAddForm ? "Cancel" : "Log Interaction" }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <InteractionFiltersBar
        v-model:selected-type="selectedType"
        v-model:selected-direction="selectedDirection"
        v-model:selected-date-range="selectedDateRange"
        v-model:selected-sentiment="selectedSentiment"
        @clear="clearFilters"
      />

      <!-- Summary Metrics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p class="text-slate-600 text-xs sm:text-sm font-medium">
            Total Interactions
          </p>
          <p class="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {{ filteredInteractions.length }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p class="text-slate-600 text-xs sm:text-sm font-medium">Sent</p>
          <p class="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
            {{ outboundCount }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p class="text-slate-600 text-xs sm:text-sm font-medium">Received</p>
          <p class="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
            {{ inboundCount }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p class="text-slate-600 text-xs sm:text-sm font-medium">
            Last Contact
          </p>
          <p class="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
            {{ lastContactDisplay }}
          </p>
        </div>
      </div>

      <!-- Add Interaction Form -->
      <InteractionAddForm
        v-if="showAddForm"
        :coaches="coaches"
        :loading="loading"
        @submit="handleAddInteraction"
        @cancel="showAddForm = false"
      />

      <!-- Loading State -->
      <div
        v-if="loading && interactions.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading interactions...</p>
      </div>

      <!-- Empty State (No Interactions at All) -->
      <div
        v-if="!loading && interactions.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <ChatBubbleLeftRightIcon
          class="w-12 h-12 text-slate-300 mx-auto mb-4"
        />
        <p class="text-slate-900 font-medium mb-2">
          No interactions logged yet
        </p>
        <button
          @click="showAddForm = true"
          class="text-blue-600 hover:text-blue-700 font-medium text-sm"
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
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <ChatBubbleLeftRightIcon
          class="w-12 h-12 text-slate-300 mx-auto mb-4"
        />
        <p class="text-slate-900 font-medium mb-2">
          No interactions match your filters
        </p>
        <button
          @click="clearFilters"
          class="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Clear Filters
        </button>
      </div>

      <!-- Interactions Timeline -->
      <div v-if="filteredInteractions.length > 0" class="space-y-4">
        <InteractionTimelineItem
          v-for="interaction in filteredInteractions"
          :key="interaction.id"
          :interaction="interaction"
          :coach-display="getCoachDisplay(interaction.coach_id)"
          @delete="deleteInteraction"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useInteractions } from "~/composables/useInteractions";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import type { Interaction } from "~/types/models";
import { ChatBubbleLeftRightIcon } from "@heroicons/vue/24/outline";

definePageMeta({});

const route = useRoute();
const id = route.params.id as string;

const {
  interactions,
  loading,
  fetchInteractions,
  createInteraction,
  smartDelete,
  createReminder,
} = useInteractions();
const { coaches, fetchCoaches } = useCoaches();
const { getSchool } = useSchools();

const showAddForm = ref(false);
const schoolName = ref("");
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
        const reminderDateTime = new Date(data.reminderDate).toISOString();
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
        console.error("Failed to create reminder:", reminderErr);
      }
    }

    showAddForm.value = false;
    await fetchInteractions({ schoolId: id });
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Failed to log interaction:", errorMsg);
    alert(`Failed to log interaction: ${errorMsg}`);
  }
};

const deleteInteraction = async (interactionId: string) => {
  if (confirm("Are you sure you want to delete this interaction?")) {
    try {
      const result = await smartDelete(interactionId);

      if (result.cascadeUsed) {
        console.log("Interaction and related records deleted successfully");
      } else {
        console.log("Interaction deleted successfully");
      }

      await fetchInteractions({
        schoolId: route.params.id as string,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete interaction";
      console.error("Failed to delete interaction:", message);
    }
  }
};

onMounted(async () => {
  try {
    const school = await getSchool(id);
    if (school) {
      schoolName.value = school.name;
    }

    await Promise.all([fetchInteractions({ schoolId: id }), fetchCoaches(id)]);

    coaches.value.forEach((coach) => {
      coachMap.value[coach.id] = `${coach.first_name} ${coach.last_name}`;
    });
  } catch (err) {
    console.error("Error loading interactions page:", err);
  }
});
</script>
