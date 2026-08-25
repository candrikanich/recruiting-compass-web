<script setup lang="ts">
import { ref, computed } from "vue";
import type { Interaction } from "~/types/models";
import InteractionAttachments from "~/components/InteractionAttachments.vue";
import {
  getTypeIcon,
  formatType,
  formatSentiment,
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

// Local tint map — visual-only, distinct from the shared getTypeIconBg/Color
// palette used elsewhere (InteractionCard, AthleteActivityWidget, etc.).
const CHANNEL_TINTS: Record<string, string> = {
  email: "bg-blue-50 text-blue-500",
  text: "bg-emerald-50 text-emerald-500",
  phone_call: "bg-orange-50 text-orange-500",
  virtual_meeting: "bg-sky-50 text-sky-500",
  in_person_visit: "bg-sky-50 text-sky-500",
  tweet: "bg-fuchsia-50 text-fuchsia-500",
  dm: "bg-fuchsia-50 text-fuchsia-500",
};
const channelTint = (type: string): string =>
  CHANNEL_TINTS[type] ?? "bg-slate-100 text-slate-500";

// Local sentiment badge palette matching the Figma token map — kept separate
// from the shared getSentimentBadgeClass used by other interaction views.
const SENTIMENT_BADGES: Record<string, string> = {
  very_positive: "bg-emerald-50 border-emerald-200 text-emerald-500",
  positive: "bg-emerald-50 border-emerald-200 text-emerald-500",
  neutral: "bg-slate-100 border-slate-200 text-slate-500",
  negative: "bg-red-50 border-red-300 text-red-500",
};
const sentimentBadgeClass = (sentiment: string): string =>
  SENTIMENT_BADGES[sentiment] ?? "bg-slate-100 border-slate-200 text-slate-500";
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="mb-4 flex items-center justify-between">
      <h3 id="interactions-table-heading" class="text-sm font-bold text-slate-900">
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
        <label class="mb-1 block text-[11px] font-semibold text-slate-400">Type</label>
        <select
          v-model="selectedType"
          class="h-[40px] w-full rounded-md border border-slate-200 bg-slate-50 px-[10px] text-[13px] text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          <option v-for="t in typeOptions" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-[11px] font-semibold text-slate-400">Direction</label>
        <DesignSystemFormSegmentedControl
          v-model="selectedDirection"
          label="Direction"
          hide-label
          size="sm"
          :options="[
            { value: '', label: 'Both' },
            { value: 'outbound', label: 'Sent' },
            { value: 'inbound', label: 'Received' },
          ]"
        />
      </div>

      <div>
        <label class="mb-1 block text-[11px] font-semibold text-slate-400">Date range</label>
        <select
          v-model="selectedDateRange"
          class="h-[40px] w-full rounded-md border border-slate-200 bg-slate-50 px-[10px] text-[13px] text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-[11px] font-semibold text-slate-400">Sentiment</label>
        <select
          v-model="selectedSentiment"
          class="h-[40px] w-full rounded-md border border-slate-200 bg-slate-50 px-[10px] text-[13px] text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
    <div class="mb-4 flex gap-3">
      <div class="flex w-[100px] flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
        <p class="text-[11px] font-semibold uppercase text-slate-500">Shown</p>
        <p class="text-xl font-bold text-slate-900">{{ filtered.length }}</p>
      </div>
      <div class="flex w-[100px] flex-col items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <p class="text-[11px] font-semibold uppercase text-blue-500">Sent</p>
        <p class="text-xl font-bold text-blue-500">{{ outboundCount }}</p>
      </div>
      <div class="flex w-[100px] flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
        <p class="text-[11px] font-semibold uppercase text-emerald-500">Received</p>
        <p class="text-xl font-bold text-emerald-500">{{ inboundCount }}</p>
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
        class="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase"
      >
        <span class="w-[180px] shrink-0">Channel</span>
        <span class="min-w-0 flex-1">Notes · Subject</span>
        <span class="w-[180px] shrink-0">Date</span>
      </div>
      <ul aria-labelledby="interactions-table-heading" class="divide-y divide-slate-100">
        <li v-for="interaction in filtered" :key="interaction.id">
          <button
            class="relative flex w-full items-center gap-3 py-[14px] pr-4 pl-[calc(1rem+3px)] text-left transition hover:bg-slate-50"
            :aria-expanded="expanded.has(interaction.id)"
            @click="toggle(interaction.id)"
          >
            <span
              class="absolute top-0 bottom-0 left-0 w-[3px]"
              :class="interaction.direction === 'outbound' ? 'bg-blue-500' : 'bg-emerald-500'"
              aria-hidden="true"
            />

            <span class="flex w-[180px] shrink-0 items-center gap-2">
              <span
                role="img"
                :aria-label="`${formatType(interaction.type)} icon`"
                class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md"
                :class="channelTint(interaction.type)"
              >
                <UIcon :name="getTypeIcon(interaction.type)" class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="min-w-0">
                <span class="block truncate text-[13px] font-semibold text-slate-900">{{
                  formatType(interaction.type)
                }}</span>
                <span
                  class="block text-[11px] font-medium"
                  :class="interaction.direction === 'outbound' ? 'text-blue-500' : 'text-emerald-500'"
                >
                  {{ interaction.direction === "outbound" ? "Sent" : "Received" }}
                </span>
              </span>
            </span>

            <span class="min-w-0 flex-1">
              <span
                v-if="interaction.subject"
                class="block truncate text-[13px] text-slate-600"
                >{{ interaction.subject }}</span
              >
              <span v-else class="block truncate text-[13px] text-slate-400">-</span>
              <span
                v-if="interaction.sentiment"
                class="mt-0.5 inline-block rounded border px-[6px] py-[2px] text-[11px] font-semibold"
                :class="sentimentBadgeClass(interaction.sentiment)"
              >
                {{ formatSentiment(interaction.sentiment) }}
              </span>
            </span>

            <span class="flex w-[180px] shrink-0 items-center justify-between gap-2">
              <time :datetime="interaction.occurred_at" class="text-[12px] whitespace-nowrap text-slate-500">
                {{ formatInteractionDateTime(interaction.occurred_at) }}
              </time>
              <UIcon
                :name="expanded.has(interaction.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                class="h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            </span>
          </button>

          <!-- Expanded detail -->
          <div v-if="expanded.has(interaction.id)" class="bg-slate-50/60 px-4 pt-1 pb-4">
            <p
              v-if="interaction.content"
              class="text-sm wrap-break-word whitespace-pre-wrap text-slate-700"
            >
              {{ interaction.content }}
            </p>
            <p v-else class="text-sm text-slate-400 italic">No message content</p>

            <div
              v-if="interaction.attachments && interaction.attachments.length > 0"
              class="mt-3 border-t border-slate-200 pt-3"
            >
              <p class="mb-2 text-xs font-medium text-slate-600">Attachments</p>
              <InteractionAttachments :attachments="interaction.attachments" />
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
