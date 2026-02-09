<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
    >
      Skip to main content
    </a>

    <div id="main-content" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/coaches/${coachId}`"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Coach
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900">Communication Log</h1>
        <p class="text-gray-600 mt-2">{{ coachName }} - {{ schoolName }}</p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Type Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Communication Type</label
            >
            <select
              v-model="selectedType"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="email">Email</option>
              <option value="phone_call">Phone Call</option>
              <option value="text">Text</option>
              <option value="in_person_visit">In-Person Visit</option>
              <option value="virtual_meeting">Virtual Meeting</option>
              <option value="dm">Direct Message</option>
              <option value="tweet">Tweet</option>
            </select>
          </div>

          <!-- Direction Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Direction</label
            >
            <select
              v-model="selectedDirection"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Both</option>
              <option value="outbound">Sent by Us</option>
              <option value="inbound">Received from Coach</option>
            </select>
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Date Range</label
            >
            <select
              v-model="selectedDateRange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 6 Months</option>
            </select>
          </div>

          <!-- Sentiment Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Sentiment</label
            >
            <select
              v-model="selectedSentiment"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sentiments</option>
              <option value="very_positive">Very Positive</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        <!-- Clear Filters Button -->
        <div class="mt-4">
          <button
            @click="clearFilters"
            class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-600 text-sm">Total Messages</p>
          <p class="text-2xl font-bold text-gray-900">
            {{ filteredInteractions.length }}
          </p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-600 text-sm">Sent</p>
          <p class="text-2xl font-bold text-blue-600">{{ outboundCount }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-600 text-sm">Received</p>
          <p class="text-2xl font-bold text-green-600">{{ inboundCount }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-gray-600 text-sm">Avg Response Time</p>
          <p class="text-2xl font-bold text-purple-600">
            {{ avgResponseTime }}h
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading communications...</p>
      </div>

      <!-- Messages Thread -->
      <div v-if="!loading && filteredInteractions.length > 0" class="space-y-4">
        <div
          v-for="interaction in filteredInteractions"
          :key="interaction.id"
          :class="[
            'bg-white rounded-lg shadow p-6 border-l-4',
            interaction.direction === 'outbound'
              ? 'border-l-blue-500'
              : 'border-l-green-500',
          ]"
        >
          <!-- Message Header -->
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-semibold',
                    interaction.direction === 'outbound'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800',
                  ]"
                >
                  {{
                    interaction.direction === "outbound" ? "Sent" : "Received"
                  }}
                </span>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800"
                >
                  {{ formatInteractionType(interaction.type) }}
                </span>
                <span
                  v-if="interaction.sentiment"
                  :class="getSentimentClass(interaction.sentiment)"
                  :aria-label="`Sentiment: ${formatSentimentText(interaction.sentiment)}`"
                >
                  <span aria-hidden="true">{{
                    getSentimentEmoji(interaction.sentiment)
                  }}</span>
                  {{ formatSentimentText(interaction.sentiment) }}
                </span>
              </div>
              <p class="text-sm text-gray-500">
                {{ formatDate(interaction.occurred_at) }}
              </p>
            </div>
          </div>

          <!-- Subject -->
          <div v-if="interaction.subject" class="mb-3">
            <p class="font-semibold text-gray-900">{{ interaction.subject }}</p>
          </div>

          <!-- Content -->
          <div
            v-if="interaction.content"
            class="mb-4 text-gray-700 whitespace-pre-wrap break-words"
          >
            {{ interaction.content }}
          </div>

          <!-- Attachments -->
          <div
            v-if="interaction.attachments && interaction.attachments.length > 0"
            class="mt-4 pt-4 border-t border-gray-200"
          >
            <p class="text-sm font-medium text-gray-600 mb-2">Attachments</p>
            <InteractionAttachments :attachments="interaction.attachments" />
          </div>

          <!-- Actions -->
          <div class="mt-4 pt-4 border-t border-gray-200 flex gap-2">
            <button
              @click="replyToInteraction(interaction)"
              class="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reply
            </button>
            <button
              @click="forwardInteraction(interaction)"
              class="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forward
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && filteredInteractions.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-4">No communications match your filters</p>
        <button
          @click="clearFilters"
          class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Clear Filters
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import type { Interaction } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const coachId = route.params.id as string;

const { getCoach } = useCoaches();
const { getSchool } = useSchools();
const { fetchInteractions, interactions } = useInteractions();

const coachName = ref("");
const schoolName = ref("");
const loading = ref(false);

// Filters
const selectedType = ref("");
const selectedDirection = ref("");
const selectedDateRange = ref("");
const selectedSentiment = ref("");

// Computed
const filteredInteractions = computed(() => {
  let filtered = interactions.value.filter((i) => i.coach_id === coachId);

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

  // Sort by date descending
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

const avgResponseTime = computed(() => {
  let totalTime = 0;
  let responseCount = 0;

  for (let i = 0; i < filteredInteractions.value.length - 1; i++) {
    const current = filteredInteractions.value[i];
    if (current.direction === "outbound") {
      const nextInbound = filteredInteractions.value
        .slice(i + 1)
        .find((x) => x.direction === "inbound");
      if (nextInbound) {
        const responseMs =
          new Date(nextInbound.occurred_at || "").getTime() -
          new Date(current.occurred_at || "").getTime();
        totalTime += responseMs;
        responseCount++;
      }
    }
  }

  return responseCount > 0
    ? Math.round((totalTime / responseCount / (1000 * 60 * 60)) * 10) / 10
    : 0;
});

// Methods
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatInteractionType = (type: string): string => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatSentiment = (sentiment: string): string => {
  const map: Record<string, string> = {
    very_positive: "😊 Very Positive",
    positive: "👍 Positive",
    neutral: "😐 Neutral",
    negative: "👎 Negative",
  };
  return map[sentiment] || sentiment;
};

const getSentimentEmoji = (sentiment: string): string => {
  const map: Record<string, string> = {
    very_positive: "😊",
    positive: "👍",
    neutral: "😐",
    negative: "👎",
  };
  return map[sentiment] || "";
};

const formatSentimentText = (sentiment: string): string => {
  const map: Record<string, string> = {
    very_positive: "Very Positive",
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
  };
  return map[sentiment] || sentiment;
};

const getSentimentClass = (sentiment: string): string => {
  const classes: Record<string, string> = {
    very_positive:
      "px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800",
    positive:
      "px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800",
    neutral:
      "px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800",
    negative: "px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800",
  };
  return classes[sentiment] || "";
};

const clearFilters = () => {
  selectedType.value = "";
  selectedDirection.value = "";
  selectedDateRange.value = "";
  selectedSentiment.value = "";
};

const replyToInteraction = (interaction: Interaction) => {
  // Future: Open reply modal
  console.log("Reply to:", interaction.id);
};

const forwardInteraction = (interaction: Interaction) => {
  // Future: Open forward modal
  console.log("Forward:", interaction.id);
};

onMounted(async () => {
  loading.value = true;
  try {
    const coach = await getCoach(coachId);
    if (coach) {
      coachName.value = `${coach.first_name} ${coach.last_name}`;

      if (coach.school_id) {
        await fetchInteractions({ schoolId: coach.school_id, coachId });

        const school = await getSchool(coach.school_id);
        if (school) {
          schoolName.value = school.name;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load communications:", err);
  } finally {
    loading.value = false;
  }
});
</script>
