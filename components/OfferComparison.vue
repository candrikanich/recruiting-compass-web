<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @keydown.escape="handleClose"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-comparison-title"
      class="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-300 p-6"
      >
        <h2
          id="offer-comparison-title"
          class="text-2xl font-bold text-slate-900"
        >
          Compare Offers
        </h2>
        <button
          @click="handleClose"
          aria-label="Close compare offers dialog"
          class="text-2xl text-slate-600 transition hover:text-slate-900"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-6">
        <!-- Comparison Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-slate-300">
                <th
                  class="sticky left-0 bg-white px-4 py-3 text-left font-semibold text-slate-900"
                >
                  School
                </th>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">
                  Offer Type
                </th>
                <th class="px-4 py-3 text-right font-semibold text-slate-900">
                  Amount
                </th>
                <th class="px-4 py-3 text-right font-semibold text-slate-900">
                  Percentage
                </th>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">
                  Deadline
                </th>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">
                  Status
                </th>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">
                  Conditions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="offer in offers"
                :key="offer.id"
                class="border-b border-slate-300 hover:bg-slate-50"
              >
                <td
                  class="sticky left-0 bg-white px-4 py-4 font-semibold text-slate-900"
                >
                  {{ getSchoolName(offer.school_id) }}
                </td>
                <td class="px-4 py-4 text-slate-600">
                  {{ getOfferTypeLabel(offer.offer_type) }}
                </td>
                <td
                  class="px-4 py-4 text-right font-semibold"
                  :class="
                    isHighestAmount(offer)
                      ? 'bg-brand-emerald-50 text-brand-emerald-700'
                      : 'text-slate-900'
                  "
                >
                  {{
                    offer.scholarship_amount
                      ? `$${offer.scholarship_amount.toLocaleString()}`
                      : "—"
                  }}
                  <span
                    v-if="isHighestAmount(offer)"
                    data-testid="best-value-badge"
                    class="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-emerald-100 px-2 py-0.5 text-xs font-semibold text-brand-emerald-800"
                  >
                    <span aria-hidden="true">✓</span> Best Value
                  </span>
                </td>
                <td
                  class="px-4 py-4 text-right font-semibold"
                  :class="
                    isHighestPercentage(offer)
                      ? 'bg-brand-emerald-50 text-brand-emerald-700'
                      : 'text-slate-900'
                  "
                >
                  {{
                    offer.scholarship_percentage
                      ? `${offer.scholarship_percentage}%`
                      : "—"
                  }}
                  <span
                    v-if="isHighestPercentage(offer)"
                    data-testid="highest-percentage-badge"
                    class="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-emerald-100 px-2 py-0.5 text-xs font-semibold text-brand-emerald-800"
                  >
                    <span aria-hidden="true">✓</span> Highest %
                  </span>
                </td>
                <td
                  :class="
                    isEarliestDeadline(offer) && offer.deadline_date
                      ? 'px-4 py-4 font-semibold text-brand-orange-700'
                      : 'px-4 py-4 text-slate-600'
                  "
                >
                  <div v-if="offer.deadline_date">
                    <div>{{ formatDate(offer.deadline_date) }}</div>
                    <div class="mt-0.5 text-xs text-slate-600">
                      {{ daysUntil(offer) }}d
                    </div>
                    <span
                      v-if="isEarliestDeadline(offer)"
                      data-testid="most-urgent-badge"
                      class="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-orange-100 px-2 py-0.5 text-xs font-semibold text-brand-orange-800"
                    >
                      <span aria-hidden="true">⏱</span> Most Urgent
                    </span>
                  </div>
                  <div v-else>—</div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                    :class="getStatusBadgeClass(offer.status)"
                  >
                    {{ getStatusLabel(offer.status) }}
                  </span>
                </td>
                <td class="max-w-xs px-4 py-4 text-slate-600">
                  <div
                    v-if="offer.conditions"
                    class="truncate text-xs"
                    :title="offer.conditions"
                  >
                    {{ offer.conditions }}
                  </div>
                  <div v-else>—</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary Stats -->
        <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div
            class="rounded-lg border border-brand-blue-200 bg-brand-blue-100 p-4"
          >
            <p class="mb-1 text-sm font-medium text-brand-blue-700">
              Total Offers
            </p>
            <p class="text-2xl font-bold text-brand-blue-900">
              {{ offers.length }}
            </p>
          </div>

          <div
            class="rounded-lg border border-brand-emerald-200 bg-brand-emerald-100 p-4"
          >
            <p class="mb-1 text-sm font-medium text-brand-emerald-700">
              Highest Amount
            </p>
            <p class="text-2xl font-bold text-brand-emerald-900">
              {{ maxAmount ? `$${maxAmount.toLocaleString()}` : "—" }}
            </p>
          </div>

          <div
            class="rounded-lg border border-brand-purple-200 bg-brand-purple-100 p-4"
          >
            <p class="mb-1 text-sm font-medium text-brand-purple-700">
              Highest %
            </p>
            <p class="text-2xl font-bold text-brand-purple-900">
              {{ maxPercentage ? `${maxPercentage}%` : "—" }}
            </p>
          </div>

          <div
            class="rounded-lg border border-brand-orange-200 bg-brand-orange-100 p-4"
          >
            <p class="mb-1 text-sm font-medium text-brand-orange-700">
              Most Urgent
            </p>
            <p class="text-2xl font-bold text-brand-orange-900">
              {{ minDays ? `${minDays}d` : "—" }}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-4 border-t border-slate-300 p-6">
        <button
          @click="handleClose"
          class="rounded-lg bg-slate-100 px-6 py-2 font-semibold text-slate-900 transition hover:bg-slate-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useSchools } from "~/composables/useSchools";
import type { Offer } from "~/types/models";

interface Props {
  offers: Offer[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

onMounted(async () => {
  await nextTick();
  activate();
});

const handleClose = () => {
  deactivate();
  emit("close");
};

const { schools } = useSchools();

const getSchoolName = (schoolId: string): string => {
  return schools.value.find((s) => s.id === schoolId)?.name || "Unknown School";
};

const getOfferTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    full_ride: "Full Ride",
    partial: "Partial",
    scholarship: "Scholarship",
    recruited_walk_on: "Recruited Walk-On",
    preferred_walk_on: "Preferred Walk-On",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    pending: "bg-brand-blue-100 text-brand-blue-800",
    accepted: "bg-brand-emerald-100 text-brand-emerald-800",
    declined: "bg-brand-red-600 text-white opacity-90",
    expired: "bg-brand-slate-50 text-brand-slate-900",
  };
  return classes[status] || "bg-brand-slate-50 text-brand-slate-900";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const daysUntil = (offer: Offer): number | null => {
  if (!offer.deadline_date) return null;
  const deadline = new Date(offer.deadline_date);
  const today = new Date();
  return Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const maxAmount = computed(() => {
  const amounts = props.offers
    .map((o: Offer) => o.scholarship_amount || 0)
    .filter((a: number) => a > 0);
  return amounts.length > 0 ? Math.max(...amounts) : null;
});

const maxPercentage = computed(() => {
  const percentages = props.offers
    .map((o: Offer) => o.scholarship_percentage || 0)
    .filter((p: number) => p > 0);
  return percentages.length > 0 ? Math.max(...percentages) : null;
});

const minDays = computed(() => {
  const days = props.offers
    .map((o) => daysUntil(o))
    .filter((d) => d !== null && d > 0) as number[];
  return days.length > 0 ? Math.min(...days) : null;
});

const isHighestAmount = (offer: Offer): boolean => {
  return (
    maxAmount.value !== null && offer.scholarship_amount === maxAmount.value
  );
};

const isHighestPercentage = (offer: Offer): boolean => {
  return (
    maxPercentage.value !== null &&
    offer.scholarship_percentage === maxPercentage.value
  );
};

const isEarliestDeadline = (offer: Offer): boolean => {
  const days = daysUntil(offer);
  return minDays.value !== null && days === minDays.value;
};
</script>
