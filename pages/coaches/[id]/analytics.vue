<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
    >
      Skip to main content
    </a>

    <div id="main-content" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/coaches/${coachId}`"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Coach
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900">
          Coach Analytics
        </h1>
        <p class="text-gray-600 mt-2">{{ coachName }} - {{ schoolName }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading analytics...</p>
      </div>

      <!-- Main Content -->
      <div v-if="!loading && metrics" class="space-y-8">
        <!-- Metrics Cards -->
        <CoachAnalyticsMetrics :metrics="metrics" />

        <!-- Comparison Section -->
        <div v-if="comparison" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Coach Ranking -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">School Ranking</h3>
            <div class="space-y-4">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-gray-600">Your Rank</span>
                  <span class="text-2xl font-bold text-blue-600"
                    >#{{ comparison.rank }}</span
                  >
                </div>
                <p class="text-sm text-gray-500">
                  of {{ comparison.totalCoaches }} coaches
                </p>
              </div>

              <div class="pt-4 border-t border-gray-200">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-gray-600 text-sm">Your Response Rate</p>
                    <p class="text-2xl font-bold text-gray-900">
                      {{ comparison.coach.responseRate }}%
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-600 text-sm">School Average</p>
                    <p class="text-2xl font-bold text-gray-900">
                      {{ comparison.schoolAverage.responseRate }}%
                    </p>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-gray-200">
                <div
                  :class="[
                    'p-3 rounded-sm text-sm font-medium text-center',
                    comparison.coach.responseRate >=
                    comparison.schoolAverage.responseRate
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800',
                  ]"
                >
                  {{
                    comparison.coach.responseRate >=
                    comparison.schoolAverage.responseRate
                      ? "Above school average"
                      : "Below school average"
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Communication Preferences -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">
              Communication Profile
            </h3>
            <div class="space-y-4">
              <div>
                <p class="text-gray-600 text-sm">Preferred Method</p>
                <p class="text-2xl font-bold text-gray-900 capitalize">
                  {{ metrics.preferredMethod }}
                </p>
              </div>

              <div class="pt-4 border-t border-gray-200">
                <p class="text-gray-600 text-sm mb-3">Interaction Breakdown</p>

                <!-- Accessible Data Table -->
                <table class="sr-only">
                  <caption>
                    Interaction breakdown by direction
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Direction</th>
                      <th scope="col">Count</th>
                      <th scope="col">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Outbound</th>
                      <td>{{ metrics.outboundCount }}</td>
                      <td>
                        {{
                          Math.round(
                            (metrics.outboundCount /
                              metrics.totalInteractions) *
                              100,
                          )
                        }}%
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Inbound</th>
                      <td>{{ metrics.inboundCount }}</td>
                      <td>
                        {{
                          Math.round(
                            (metrics.inboundCount / metrics.totalInteractions) *
                              100,
                          )
                        }}%
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Visual Chart -->
                <div class="space-y-2" aria-hidden="true">
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm text-gray-600">Outbound</span>
                      <span class="text-sm font-semibold text-gray-900">{{
                        metrics.outboundCount
                      }}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-blue-600 h-2 rounded-full"
                        :style="{
                          width: getBarWidth(
                            metrics.outboundCount,
                            metrics.totalInteractions,
                          ),
                        }"
                      />
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm text-gray-600">Inbound</span>
                      <span class="text-sm font-semibold text-gray-900">{{
                        metrics.inboundCount
                      }}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-green-600 h-2 rounded-full"
                        :style="{
                          width: getBarWidth(
                            metrics.inboundCount,
                            metrics.totalInteractions,
                          ),
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Insights Section -->
        <div v-if="insights.length > 0" class="bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">
            Insights & Recommendations
          </h3>
          <div class="space-y-3">
            <div
              v-for="(insight, idx) in insights"
              :key="idx"
              class="flex items-start gap-3 p-3 bg-blue-50 rounded-sm"
            >
              <span class="text-xl">💡</span>
              <p class="text-sm text-blue-900">{{ insight }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import { useCoachAnalytics } from "~/composables/useCoachAnalytics";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const coachId = route.params.id as string;

const { getCoach } = useCoaches();
const { getSchool } = useSchools();
const { fetchInteractions } = useInteractions();
const {
  calculateCoachMetrics,
  compareWithSchoolAverage,
  generateInsights,
} = useCoachAnalytics();

const coachName = ref("");
const schoolName = ref("");
const loading = ref(false);

const metrics = computed(() => calculateCoachMetrics(coachId));
const insights = computed(() => generateInsights(coachId));
const comparison = ref<any>(null);

const getBarWidth = (value: number, total: number): string => {
  if (total === 0) return "0%";
  return `${(value / total) * 100}%`;
};

onMounted(async () => {
  loading.value = true;
  try {
    const coach = await getCoach(coachId);
    if (coach) {
      coachName.value = `${coach.first_name} ${coach.last_name}`;

      // Fetch interactions to populate analytics
      if (coach.school_id) {
        await fetchInteractions({ schoolId: coach.school_id, coachId });
        comparison.value = compareWithSchoolAverage(coachId, coach.school_id);

        // Get school name
        const school = await getSchool(coach.school_id);
        if (school) {
          schoolName.value = school.name;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load analytics:", err);
  } finally {
    loading.value = false;
  }
});
</script>
