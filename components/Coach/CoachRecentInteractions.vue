<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <h3
      id="recent-interactions-heading"
      class="text-lg font-semibold text-slate-900 mb-4"
    >
      Recent Interactions
    </h3>

    <!-- Empty State -->
    <div v-if="interactions.length === 0" class="text-center py-8">
      <p class="text-slate-600">No interactions recorded yet</p>
    </div>

    <!-- Interactions List -->
    <ul
      v-else
      aria-labelledby="recent-interactions-heading"
      class="border border-slate-200 rounded-lg overflow-hidden"
    >
      <li
        v-for="(interaction, index) in displayedInteractions"
        :key="interaction.id"
        class="flex items-center justify-between px-4 py-3"
        :class="{ 'border-t border-slate-200': index > 0 }"
      >
        <div class="flex items-center gap-3">
          <div
            role="img"
            :aria-label="`${formatInteractionType(interaction.type)} icon`"
            class="w-8 h-8 rounded-full flex items-center justify-center"
            :class="getInteractionBgColor(interaction.type)"
          >
            <component
              :is="getInteractionIconComponent(interaction.type)"
              class="w-4 h-4"
              :class="getInteractionIconColor(interaction.type)"
              aria-hidden="true"
            />
          </div>
          <div>
            <p class="font-medium text-slate-900">
              {{ formatInteractionType(interaction.type) }}
            </p>
            <time
              :datetime="interaction.occurred_at"
              class="text-xs text-slate-500"
            >
              {{ formatDate(interaction.occurred_at) }}
            </time>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="interaction.sentiment"
            role="status"
            :aria-label="`Sentiment: ${interaction.sentiment}`"
            class="px-2 py-1 text-xs font-semibold rounded"
            :class="getSentimentColor(interaction.sentiment)"
          >
            {{ interaction.sentiment }}
          </span>
          <span
            v-if="interaction.subject"
            class="text-sm text-slate-600 max-w-[200px] truncate"
          >
            {{ interaction.subject }}
          </span>
        </div>
      </li>
    </ul>

    <!-- View All Link -->
    <div v-if="hasMoreInteractions" class="text-center pt-4">
      <button
        :aria-label="viewAllAriaLabel"
        class="text-blue-600 hover:text-blue-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
      >
        View All {{ interactions.length }} Interactions →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Interaction } from "~/types/models";
import { formatDate } from "~/utils/dateFormatters";
import {
  getTypeIcon as getInteractionIconComponent,
  getTypeIconBg as getInteractionBgColor,
  getTypeIconColor as getInteractionIconColor,
  formatType as formatInteractionType,
  getSentimentBadgeClass as getSentimentColor,
} from "~/utils/interactionFormatters";

const props = withDefaults(
  defineProps<{
    interactions: Interaction[];
    coachName?: string;
    maxDisplay?: number;
  }>(),
  {
    coachName: "",
    maxDisplay: 10,
  },
);

const displayedInteractions = computed(() =>
  props.interactions.slice(0, props.maxDisplay),
);

const hasMoreInteractions = computed(
  () => props.interactions.length > props.maxDisplay,
);

const viewAllAriaLabel = computed(() =>
  props.coachName
    ? `View all ${props.interactions.length} interactions with ${props.coachName}`
    : `View all ${props.interactions.length} interactions`,
);
</script>
