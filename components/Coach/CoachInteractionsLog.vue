<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 id="interactions-log-heading" class="text-lg font-semibold text-slate-900">
        Interactions
      </h3>
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-sm text-slate-600 hover:text-slate-900 font-medium"
      >
        Clear filters
      </button>
    </div>

    <!-- Filter bar -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1">Type</label>
        <select
          v-model="selectedType"
          class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All types</option>
          <option v-for="t in typeOptions" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>

      <DesignSystemFormSegmentedControl
        v-model="selectedDirection"
        label="Direction"
        size="sm"
        :options="[
          { value: '', label: 'Both' },
          { value: 'outbound', label: 'Sent' },
          { value: 'inbound', label: 'Received' },
        ]"
      />

      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1"
          >Date range</label
        >
        <select
          v-model="selectedDateRange"
          class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1"
          >Sentiment</label
        >
        <select
          v-model="selectedSentiment"
          class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All sentiments</option>
          <option value="very_positive">Very Positive</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>
    </div>

    <!-- Summary stats -->
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-center">
        <p class="text-xs text-slate-600">Shown</p>
        <p class="text-lg font-bold text-slate-900">{{ filtered.length }}</p>
      </div>
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-center">
        <p class="text-xs text-slate-600">Sent</p>
        <p class="text-lg font-bold text-blue-600">{{ outboundCount }}</p>
      </div>
      <div class="rounded-lg bg-slate-50 px-3 py-2 text-center">
        <p class="text-xs text-slate-600">Received</p>
        <p class="text-lg font-bold text-green-600">{{ inboundCount }}</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filtered.length === 0" class="text-center py-8">
      <p class="text-slate-600">
        {{
          interactions.length === 0
            ? "No interactions recorded yet"
            : "No interactions match your filters"
        }}
      </p>
    </div>

    <!-- Expandable list -->
    <ul
      v-else
      aria-labelledby="interactions-log-heading"
      class="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden"
    >
      <li v-for="interaction in filtered" :key="interaction.id">
        <button
          class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition"
          :aria-expanded="expanded.has(interaction.id)"
          @click="toggle(interaction.id)"
        >
          <span class="flex items-center gap-3 min-w-0">
            <span
              role="img"
              :aria-label="`${formatType(interaction.type)} icon`"
              class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
              :class="getTypeIconBg(interaction.type)"
            >
              <UIcon
                :name="getTypeIcon(interaction.type)"
                class="w-4 h-4"
                :class="getTypeIconColor(interaction.type)"
                aria-hidden="true"
              />
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <span class="font-medium text-slate-900">{{
                  formatType(interaction.type)
                }}</span>
                <span
                  class="text-xs px-1.5 py-0.5 rounded-sm font-medium"
                  :class="
                    interaction.direction === 'outbound'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  "
                >
                  {{ interaction.direction === "outbound" ? "Sent" : "Received" }}
                </span>
              </span>
              <span
                v-if="interaction.subject"
                class="block text-sm text-slate-600 truncate"
                >{{ interaction.subject }}</span
              >
            </span>
          </span>
          <span class="flex items-center gap-2 shrink-0 pl-2">
            <span
              v-if="interaction.sentiment"
              class="hidden sm:inline px-2 py-1 text-xs font-semibold rounded-sm"
              :class="getSentimentBadgeClass(interaction.sentiment)"
            >
              {{ formatSentiment(interaction.sentiment) }}
            </span>
            <time :datetime="interaction.occurred_at" class="text-xs text-slate-500">
              {{ formatInteractionDateTime(interaction.occurred_at) }}
            </time>
            <UIcon
              :name="
                expanded.has(interaction.id)
                  ? 'i-heroicons-chevron-up'
                  : 'i-heroicons-chevron-down'
              "
              class="w-4 h-4 text-slate-400"
              aria-hidden="true"
            />
          </span>
        </button>

        <!-- Expanded detail -->
        <div
          v-if="expanded.has(interaction.id)"
          class="px-4 pb-4 pt-1 bg-slate-50/60"
        >
          <p
            v-if="interaction.content"
            class="text-sm text-slate-700 whitespace-pre-wrap wrap-break-word"
          >
            {{ interaction.content }}
          </p>
          <p v-else class="text-sm italic text-slate-400">No message content</p>

          <div
            v-if="interaction.attachments && interaction.attachments.length > 0"
            class="mt-3 pt-3 border-t border-slate-200"
          >
            <p class="text-xs font-medium text-slate-600 mb-2">Attachments</p>
            <InteractionAttachments :attachments="interaction.attachments" />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Interaction } from "~/types/models";
import InteractionAttachments from "~/components/InteractionAttachments.vue";
import {
  getTypeIcon,
  getTypeIconBg,
  getTypeIconColor,
  formatType,
  formatSentiment,
  getSentimentBadgeClass,
  formatInteractionDateTime,
} from "~/utils/interactionFormatters";

const props = withDefaults(
  defineProps<{
    interactions: Interaction[];
    coachName?: string;
  }>(),
  { coachName: "" },
);

const typeOptions = [
  { value: "email", label: "Email" },
  { value: "phone_call", label: "Phone Call" },
  { value: "text", label: "Text" },
  { value: "in_person_visit", label: "In-Person Visit" },
  { value: "virtual_meeting", label: "Virtual Meeting" },
  { value: "dm", label: "Direct Message" },
  { value: "tweet", label: "Tweet" },
];

const selectedType = ref("");
const selectedDirection = ref("");
const selectedDateRange = ref("");
const selectedSentiment = ref("");

const hasActiveFilters = computed(
  () =>
    !!selectedType.value ||
    !!selectedDirection.value ||
    !!selectedDateRange.value ||
    !!selectedSentiment.value,
);

const clearFilters = () => {
  selectedType.value = "";
  selectedDirection.value = "";
  selectedDateRange.value = "";
  selectedSentiment.value = "";
};

const filtered = computed(() => {
  let list = [...props.interactions];

  if (selectedType.value)
    list = list.filter((i) => i.type === selectedType.value);
  if (selectedDirection.value)
    list = list.filter((i) => i.direction === selectedDirection.value);
  if (selectedSentiment.value)
    list = list.filter((i) => i.sentiment === selectedSentiment.value);
  if (selectedDateRange.value) {
    const days = parseInt(selectedDateRange.value, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    list = list.filter((i) => new Date(i.occurred_at || "") > cutoff);
  }

  return list.sort(
    (a, b) =>
      new Date(b.occurred_at || "").getTime() -
      new Date(a.occurred_at || "").getTime(),
  );
});

const outboundCount = computed(
  () => filtered.value.filter((i) => i.direction === "outbound").length,
);
const inboundCount = computed(
  () => filtered.value.filter((i) => i.direction === "inbound").length,
);

const expanded = ref<Set<string>>(new Set());
const toggle = (id: string) => {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
};
</script>
