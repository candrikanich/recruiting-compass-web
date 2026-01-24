<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div
      class="rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col bg-white"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-slate-300"
      >
        <h2 class="text-2xl font-bold text-slate-900">Compare Offers</h2>
        <button
          @click="$emit('close')"
          class="text-2xl transition text-slate-600 hover:text-slate-900"
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
                  class="text-left px-4 py-3 font-semibold sticky left-0 bg-white text-slate-900"
                >
                  School
                </th>
                <th class="text-left px-4 py-3 font-semibold text-slate-900">
                  Offer Type
                </th>
                <th class="text-right px-4 py-3 font-semibold text-slate-900">
                  Amount
                </th>
                <th class="text-right px-4 py-3 font-semibold text-slate-900">
                  Percentage
                </th>
                <th class="text-left px-4 py-3 font-semibold text-slate-900">
                  Deadline
                </th>
                <th class="text-left px-4 py-3 font-semibold text-slate-900">
                  Status
                </th>
                <th class="text-left px-4 py-3 font-semibold text-slate-900">
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
                  class="px-4 py-4 font-semibold sticky left-0 bg-white text-slate-900"
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
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-slate-900'
                  "
                >
                  {{
                    offer.scholarship_amount
                      ? `$${offer.scholarship_amount.toLocaleString()}`
                      : "—"
                  }}
                </td>
                <td
                  class="px-4 py-4 text-right font-semibold"
                  :class="
                    isHighestPercentage(offer)
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-slate-900'
                  "
                >
                  {{
                    offer.scholarship_percentage
                      ? `${offer.scholarship_percentage}%`
                      : "—"
                  }}
                </td>
                <td
                  :class="
                    isEarliestDeadline(offer) && offer.deadline_date
                      ? 'px-4 py-4 font-semibold text-orange-600'
                      : 'px-4 py-4 text-slate-600'
                  "
                >
                  <div v-if="offer.deadline_date">
                    <div>{{ formatDate(offer.deadline_date) }}</div>
                    <div class="text-xs mt-0.5 text-slate-600">
                      {{ daysUntil(offer) }}d
                    </div>
                  </div>
                  <div v-else>—</div>
                </td>
                <td class="px-4 py-4">
                  <span
                    class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                    :class="getStatusBadgeClass(offer.status)"
                  >
                    {{ getStatusLabel(offer.status) }}
                  </span>
                </td>
                <td class="px-4 py-4 max-w-xs text-slate-600">
                  <div
                    v-if="offer.conditions"
                    class="text-xs truncate"
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
        <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="rounded-lg p-4 bg-blue-100 border border-blue-200">
            <p class="text-sm font-medium mb-1 text-blue-600">Total Offers</p>
            <p class="text-2xl font-bold text-blue-900">{{ offers.length }}</p>
          </div>

          <div class="rounded-lg p-4 bg-emerald-100 border border-emerald-200">
            <p class="text-sm font-medium mb-1 text-emerald-600">
              Highest Amount
            </p>
            <p class="text-2xl font-bold text-emerald-900">
              {{ maxAmount ? `$${maxAmount.toLocaleString()}` : "—" }}
            </p>
          </div>

          <div class="rounded-lg p-4 bg-purple-100 border border-purple-200">
            <p class="text-sm font-medium mb-1 text-purple-600">Highest %</p>
            <p class="text-2xl font-bold text-purple-900">
              {{ maxPercentage ? `${maxPercentage}%` : "—" }}
            </p>
          </div>

          <div class="rounded-lg p-4 bg-orange-100 border border-orange-200">
            <p class="text-sm font-medium mb-1 text-orange-600">Most Urgent</p>
            <p class="text-2xl font-bold text-orange-900">
              {{ minDays ? `${minDays}d` : "—" }}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-4 p-6 border-t border-slate-300">
        <button
          @click="$emit('close')"
          class="px-6 py-2 font-semibold rounded-lg transition bg-slate-100 text-slate-900 hover:bg-slate-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSchools } from "~/composables/useSchools";
import type { Offer } from "~/types/models";

interface Props {
  offers: Offer[];
}

const props = defineProps<Props>();
defineEmits<{
  close: [];
}>();

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
    pending: "bg-blue-100 text-blue-800",
    accepted: "bg-emerald-100 text-emerald-800",
    declined: "bg-red-600 text-white opacity-90",
    expired: "bg-slate-50 text-slate-900",
  };
  return classes[status] || "bg-slate-50 text-slate-900";
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
