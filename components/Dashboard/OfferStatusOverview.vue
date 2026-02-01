<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold">Offer Status Overview</h2>

    <div v-if="offers.length === 0" class="text-center py-8">
      <div class="text-4xl mb-2">📬</div>
      <p class="text-slate-600">No offers yet</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Accepted Count -->
      <div
        v-if="acceptedCount > 0"
        class="p-4 bg-green-50 rounded-lg border border-green-200"
      >
        <div class="text-sm text-slate-600">Accepted</div>
        <div class="text-2xl font-bold text-green-600">{{ acceptedCount }}</div>
      </div>

      <!-- Pending Count -->
      <div
        v-if="pendingCount > 0"
        class="p-4 bg-yellow-50 rounded-lg border border-yellow-200"
      >
        <div class="text-sm text-slate-600">Pending</div>
        <div class="text-2xl font-bold text-yellow-600">{{ pendingCount }}</div>
      </div>

      <!-- Declined Count -->
      <div
        v-if="declinedCount > 0"
        class="p-4 bg-red-50 rounded-lg border border-red-200"
      >
        <div class="text-sm text-slate-600">Declined</div>
        <div class="text-2xl font-bold text-red-600">{{ declinedCount }}</div>
      </div>

      <!-- Total Scholarship Value -->
      <div
        v-if="totalScholarshipValue > 0"
        class="p-4 bg-blue-50 rounded-lg border border-blue-200"
      >
        <div class="text-sm text-slate-600">Total Scholarship Value</div>
        <div class="text-2xl font-bold text-blue-600">
          {{ totalScholarshipValue }}%
        </div>
      </div>

      <!-- Average Offer -->
      <div
        v-if="averageOffer > 0"
        class="p-4 bg-purple-50 rounded-lg border border-purple-200"
      >
        <div class="text-sm text-slate-600">Average Offer</div>
        <div class="text-2xl font-bold text-purple-600">
          {{ averageOffer }}%
        </div>
      </div>

      <!-- Upcoming Deadlines -->
      <div
        v-if="upcomingDeadlines.length > 0"
        class="p-4 bg-orange-50 rounded-lg border border-orange-200"
      >
        <div class="text-sm text-slate-600">Upcoming Deadlines</div>
        <div class="text-2xl font-bold text-orange-600">
          {{ upcomingDeadlines.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Offer, School } from "~/types/models";

interface Props {
  offers: Offer[];
  schools: School[];
}

const props = defineProps<Props>();

const acceptedCount = computed(
  () => props.offers.filter((o) => o.status === "accepted").length,
);
const pendingCount = computed(
  () => props.offers.filter((o) => o.status === "pending").length,
);
const declinedCount = computed(
  () => props.offers.filter((o) => o.status === "declined").length,
);

const totalScholarshipValue = computed(() => {
  return props.offers.reduce(
    (sum, offer) => sum + (offer.scholarship_percentage || 0),
    0,
  );
});

const averageOffer = computed(() => {
  if (props.offers.length === 0) return 0;
  return Math.round(totalScholarshipValue.value / props.offers.length);
});

const upcomingDeadlines = computed(() => {
  const now = Date.now();
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

  return props.offers.filter((offer) => {
    if (!offer.deadline_date) return false;
    const deadline = new Date(offer.deadline_date).getTime();
    return deadline > now && deadline <= sevenDaysFromNow;
  });
});
</script>
