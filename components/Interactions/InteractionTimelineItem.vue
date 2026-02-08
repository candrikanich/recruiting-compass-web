<template>
  <div
    class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
  >
    <div class="p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <!-- Type Icon -->
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="getTypeIconBg(interaction.type)"
          >
            <component
              :is="getTypeIcon(interaction.type)"
              class="w-5 h-5"
              :class="getTypeIconColor(interaction.type)"
            />
          </div>

          <div class="flex-1 min-w-0">
            <!-- Header -->
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-semibold text-slate-900">{{
                formatType(interaction.type)
              }}</span>
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="
                  interaction.direction === 'outbound'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                "
              >
                {{
                  interaction.direction === "outbound" ? "Outbound" : "Inbound"
                }}
              </span>
              <span
                v-if="interaction.sentiment"
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="getSentimentBadgeClass(interaction.sentiment)"
              >
                {{ formatSentiment(interaction.sentiment) }}
              </span>
            </div>

            <!-- Subject -->
            <p
              v-if="interaction.subject"
              class="text-slate-700 font-medium truncate"
            >
              {{ interaction.subject }}
            </p>

            <!-- Coach -->
            <p class="text-sm text-slate-500 mt-1">
              <span v-if="interaction.coach_id">{{ coachDisplay }}</span>
              <span v-if="interaction.coach_id"> &bull; </span>
              <span
                >Logged {{ formatRelativeDate(interaction.created_at) }}</span
              >
            </p>

            <!-- Content Preview -->
            <p
              v-if="interaction.content"
              class="text-sm text-slate-600 mt-2 line-clamp-2"
            >
              {{ interaction.content }}
            </p>

            <!-- Meta -->
            <div class="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <CalendarIcon class="w-3.5 h-3.5" />
                {{ formatDate(interaction.occurred_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Delete Button -->
        <button
          @click="$emit('delete', interaction.id)"
          class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Interaction } from "~/types/models";
import { CalendarIcon } from "@heroicons/vue/24/outline";
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
