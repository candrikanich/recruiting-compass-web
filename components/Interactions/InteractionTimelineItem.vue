<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md"
  >
    <div class="p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 flex-1 items-start gap-4">
          <!-- Type Icon -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :class="getTypeIconBg(interaction.type)"
          >
            <UIcon
              :name="getTypeIcon(interaction.type)"
              class="h-5 w-5"
              :class="getTypeIconColor(interaction.type)"
            />
          </div>

          <div class="min-w-0 flex-1">
            <!-- Header -->
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <span class="font-semibold text-slate-900">{{
                formatType(interaction.type)
              }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  interaction.direction === 'outbound'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-emerald-100 text-emerald-900'
                "
              >
                {{
                  interaction.direction === "outbound" ? "Outbound" : "Inbound"
                }}
              </span>
              <span
                v-if="interaction.sentiment"
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="getSentimentBadgeClass(interaction.sentiment)"
              >
                {{ formatSentiment(interaction.sentiment) }}
              </span>
            </div>

            <!-- Subject -->
            <p
              v-if="interaction.subject"
              class="truncate font-medium text-slate-900"
            >
              {{ interaction.subject }}
            </p>

            <!-- Coach -->
            <p class="mt-1 text-sm text-slate-500">
              <span v-if="interaction.coach_id">{{ coachDisplay }}</span>
              <span v-if="interaction.coach_id"> &bull; </span>
              <span
                >Logged {{ formatRelativeDate(interaction.created_at) }}</span
              >
            </p>

            <!-- Content Preview -->
            <p
              v-if="interaction.content"
              class="mt-2 line-clamp-2 text-sm text-slate-600"
            >
              {{ interaction.content }}
            </p>

            <!-- Meta -->
            <div class="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="h-3.5 w-3.5" />
                {{ formatDate(interaction.occurred_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Delete Button -->
        <button
          @click="$emit('delete', interaction.id)"
          class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Interaction } from "~/types/models";
import {
  getTypeIcon,
  getTypeIconBg,
  getTypeIconColor,
  formatType,
  formatSentiment,
  getSentimentBadgeClass,
} from "~/utils/interactionFormatters";

defineProps<{
  interaction: Interaction;
  coachDisplay: string;
}>();

defineEmits<{
  delete: [id: string];
}>();

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeDate = (dateStr: string | undefined) => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
</script>
