<template>
  <div class="max-w-4xl mx-auto">
    <div v-if="interaction" class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold">{{ interaction.subject }}</h1>
          <p class="text-gray-600 mt-2">
            {{ formatDate(interaction.occurred_at) }}
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="exportInteraction"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            📤 Export
          </button>
          <button
            @click="deleteInteraction"
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <!-- Status Badges -->
      <div class="flex gap-2">
        <span
          class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
        >
          {{ interaction.type }}
        </span>
        <span
          :class="[
            'px-3 py-1 rounded-full text-sm font-medium',
            interaction.direction === 'inbound'
              ? 'bg-green-100 text-green-800'
              : 'bg-purple-100 text-purple-800',
          ]"
        >
          {{ interaction.direction }}
        </span>
        <span :class="sentimentClass">
          {{ interaction.sentiment }}
        </span>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">Content</h2>
        <p class="text-gray-700 whitespace-pre-wrap">
          {{ interaction.content }}
        </p>
      </div>

      <!-- Details Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="font-semibold text-gray-900 mb-2">School</h3>
          <p v-if="school" class="text-gray-700">
            <NuxtLink
              :to="`/schools/${school.id}`"
              class="text-blue-600 hover:underline"
            >
              {{ school.name }}
            </NuxtLink>
          </p>
          <p v-else class="text-gray-500">—</p>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Coach</h3>
          <p v-if="coach" class="text-gray-700">
            <NuxtLink
              :to="`/coaches/${coach.id}`"
              class="text-blue-600 hover:underline"
            >
              {{ coach.first_name }} {{ coach.last_name }}
            </NuxtLink>
          </p>
          <p v-else class="text-gray-500">—</p>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Event</h3>
          <p v-if="event" class="text-gray-700">
            <NuxtLink
              :to="`/events/${event.id}`"
              class="text-blue-600 hover:underline"
            >
              {{ event.name }}
            </NuxtLink>
          </p>
          <p v-else class="text-gray-500">—</p>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Logged By</h3>
          <p class="text-gray-700">{{ loggedByName }}</p>
        </div>
      </div>

      <!-- Attachments -->
      <div
        v-if="interaction.attachments && interaction.attachments.length > 0"
        class="bg-white rounded-lg shadow p-6"
      >
        <h2 class="text-xl font-bold mb-4">
          Attachments ({{ interaction.attachments.length }})
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <a
            v-for="(url, idx) in interaction.attachments"
            :key="idx"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            class="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <p class="text-sm font-medium text-blue-600 break-all">
              📎 {{ getFilename(url) }}
            </p>
          </a>
        </div>
      </div>

      <!-- Metadata -->
      <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
        <p>
          <span class="font-semibold">Created:</span>
          {{ formatDate(interaction.created_at) }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-else class="text-center py-12">
      <p class="text-gray-600">Loading interaction...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useInteractions } from "~/composables/useInteractions";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useEvents } from "~/composables/useEvents";
import type { Interaction } from "~/types/models";

const route = useRoute();
const router = useRouter();
const { getInteraction, deleteInteraction: deleteInt } = useInteractions();
const { schools } = useSchools();
const { coaches } = useCoaches();
const { events } = useEvents();

const interactionId = route.params.id as string;
const interaction = ref<Interaction | null>(null);

onMounted(async () => {
  interaction.value = await getInteraction(interactionId);
});

const school = computed(() => {
  if (!interaction.value?.school_id) return null;
  return (
    schools.value?.find((s) => s.id === interaction.value?.school_id) ?? null
  );
});

const coach = computed(() => {
  if (!interaction.value?.coach_id) return null;
  return (
    coaches.value?.find((c) => c.id === interaction.value?.coach_id) ?? null
  );
});

const event = computed(() => {
  if (!interaction.value?.event_id) return null;
  return (
    events.value?.find((e) => e.id === interaction.value?.event_id) ?? null
  );
});

const loggedByName = computed(() => {
  // In a real app, fetch user by ID. For now show initials or ID
  return "You";
});

const sentimentClass = computed(() => {
  const sentiment = interaction.value?.sentiment;
  const classes = "px-3 py-1 rounded-full text-sm font-medium";

  if (!sentiment) return classes;

  const sentimentMap: Record<string, string> = {
    very_positive: `${classes} bg-green-100 text-green-800`,
    positive: `${classes} bg-lime-100 text-lime-800`,
    neutral: `${classes} bg-gray-100 text-gray-800`,
    negative: `${classes} bg-red-100 text-red-800`,
  };

  return sentimentMap[sentiment] || classes;
});

const formatDate = (date: string | undefined): string => {
  if (!date) return "Unknown";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFilename = (url: string) => {
  return url.split("/").pop() || url;
};

const exportInteraction = () => {
  if (!interaction.value) return;
  const csv = [
    ["Field", "Value"],
    ["Subject", interaction.value.subject || "N/A"],
    ["Type", interaction.value.type],
    ["Direction", interaction.value.direction],
    ["Sentiment", interaction.value.sentiment || "N/A"],
    ["School", school.value?.name || "N/A"],
    [
      "Coach",
      coach.value
        ? `${coach.value.first_name} ${coach.value.last_name}`
        : "N/A",
    ],
    ["Date", formatDate(interaction.value.occurred_at)],
    ["Content", interaction.value.content || "N/A"],
    ["Attachments", interaction.value.attachments?.length || 0],
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `interaction-${(interaction.value.subject || "export").toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
};

const deleteInteraction = async () => {
  if (confirm("Are you sure you want to delete this interaction?")) {
    await deleteInt(interactionId);
    router.push("/interactions");
  }
};
</script>
