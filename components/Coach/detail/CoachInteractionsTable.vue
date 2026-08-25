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

const props = defineProps<{
  interactions: Interaction[];
}>();

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

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="mb-4 flex items-center justify-between">
      <h3
        id="interactions-table-heading"
        class="text-lg font-semibold text-slate-900"
      >
        Interactions
      </h3>
      <button
        v-if="hasActiveFilters"
        class="text-sm font-medium text-slate-600 hover:text-slate-900"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- Filter bar -->
    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600"
          >Type</label
        >
        <select
          v-model="selectedType"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
        <label class="mb-1 block text-xs font-medium text-slate-600"
          >Date range</label
        >
        <select
          v-model="selectedDateRange"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600"
          >Sentiment</label
        >
        <select
          v-model="selectedSentiment"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
    <div class="mb-4 grid grid-cols-3 gap-3">
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
    <div v-if="filtered.length === 0" class="py-8 text-center">
      <p class="text-slate-600">
        {{
          interactions.length === 0
            ? "No interactions recorded yet"
            : "No interactions match your filters"
        }}
      </p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-lg border border-slate-200">
      <div
        class="grid grid-cols-[1fr_2fr_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase"
      >
        <span>Channel</span>
        <span>Notes · Subject</span>
        <span>Date</span>
        <span class="sr-only">Expand</span>
      </div>
      <ul
        aria-labelledby="interactions-table-heading"
        class="divide-y divide-slate-200"
      >
        <li v-for="interaction in filtered" :key="interaction.id">
          <button
            class="grid w-full grid-cols-[1fr_2fr_auto_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            :aria-expanded="expanded.has(interaction.id)"
            @click="toggle(interaction.id)"
          >
            <span class="flex min-w-0 items-center gap-2">
              <span
                role="img"
                :aria-label="`${formatType(interaction.type)} icon`"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                :class="getTypeIconBg(interaction.type)"
              >
                <UIcon
                  :name="getTypeIcon(interaction.type)"
                  class="h-4 w-4"
                  :class="getTypeIconColor(interaction.type)"
                  aria-hidden="true"
                />
              </span>
              <span class="min-w-0">
                <span class="block truncate font-medium text-slate-900">{{
                  formatType(interaction.type)
                }}</span>
                <span
                  class="inline-block rounded-sm px-1.5 py-0.5 text-xs font-medium"
                  :class="
                    interaction.direction === 'outbound'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  "
                >
                  {{
                    interaction.direction === "outbound" ? "Sent" : "Received"
                  }}
                </span>
              </span>
            </span>

            <span class="min-w-0">
              <span
                v-if="interaction.subject"
                class="block truncate text-sm text-slate-900"
                >{{ interaction.subject }}</span
              >
              <span v-else class="block truncate text-sm text-slate-400 italic"
                >No subject</span
              >
              <span
                v-if="interaction.sentiment"
                class="mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-xs font-semibold"
                :class="getSentimentBadgeClass(interaction.sentiment)"
              >
                {{ formatSentiment(interaction.sentiment) }}
              </span>
            </span>

            <time
              :datetime="interaction.occurred_at"
              class="shrink-0 text-xs whitespace-nowrap text-slate-500"
            >
              {{ formatInteractionDateTime(interaction.occurred_at) }}
            </time>

            <UIcon
              :name="
                expanded.has(interaction.id)
                  ? 'i-heroicons-chevron-up'
                  : 'i-heroicons-chevron-down'
              "
              class="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </button>

          <!-- Expanded detail -->
          <div
            v-if="expanded.has(interaction.id)"
            class="bg-slate-50/60 px-4 pt-1 pb-4"
          >
            <p
              v-if="interaction.content"
              class="text-sm wrap-break-word whitespace-pre-wrap text-slate-700"
            >
              {{ interaction.content }}
            </p>
            <p v-else class="text-sm text-slate-400 italic">
              No message content
            </p>

            <div
              v-if="
                interaction.attachments && interaction.attachments.length > 0
              "
              class="mt-3 border-t border-slate-200 pt-3"
            >
              <p class="mb-2 text-xs font-medium text-slate-600">
                Attachments
              </p>
              <InteractionAttachments :attachments="interaction.attachments" />
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
