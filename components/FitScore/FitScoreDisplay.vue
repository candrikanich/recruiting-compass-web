<template>
  <div class="fit-score-display">
    <!-- Score Summary -->
    <div class="flex items-center gap-4 mb-4">
      <div class="flex-1">
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold" :class="scoreColorClass">{{
            fitScore.score
          }}</span>
          <span class="text-lg text-slate-600">/100</span>
        </div>
        <div class="text-sm text-slate-600 mt-1">Fit Score</div>
      </div>

      <!-- Tier Badge -->
      <Badge :color="tierColor" variant="solid" size="md">
        {{ formatTier(fitScore.tier) }}
      </Badge>
    </div>

    <!-- Missing Dimensions Warning -->
    <div
      v-if="fitScore.missingDimensions.length > 0"
      class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"
    >
      <p class="text-sm text-amber-900">
        <strong>Missing data:</strong>
        {{ fitScore.missingDimensions.join(", ") }}
      </p>
      <p class="text-xs text-amber-700 mt-1">
        Add more details to improve this score.
      </p>
    </div>

    <!-- Breakdown Toggle Button -->
    <button
      v-if="showBreakdown && Object.keys(fitScore.breakdown).length > 0"
      @click="isExpanded = !isExpanded"
      class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mb-3"
    >
      {{ isExpanded ? "Hide" : "View" }} Fit Score Breakdown
      <svg
        v-if="!isExpanded"
        class="w-4 h-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
      <svg
        v-else
        class="w-4 h-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>

    <!-- Breakdown (Optional) -->
    <div
      v-if="
        showBreakdown &&
        Object.keys(fitScore.breakdown).length > 0 &&
        isExpanded
      "
      class="bg-slate-50 rounded-lg p-4"
    >
      <h4 class="font-semibold text-sm text-slate-900 mb-3">Score Breakdown</h4>

      <div class="space-y-2">
        <!-- Athletic Fit -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Athletic Fit</span>
          <div class="flex items-center gap-2">
            <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500"
                :style="{
                  width: `${((fitScore.breakdown.athleticFit || 0) / 40) * 100}%`,
                }"
              />
            </div>
            <span class="text-sm font-medium text-slate-900 w-12 text-right">
              {{ fitScore.breakdown.athleticFit || 0 }}/40
            </span>
          </div>
        </div>

        <!-- Academic Fit -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Academic Fit</span>
          <div class="flex items-center gap-2">
            <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-purple-500"
                :style="{
                  width: `${((fitScore.breakdown.academicFit || 0) / 25) * 100}%`,
                }"
              />
            </div>
            <span class="text-sm font-medium text-slate-900 w-12 text-right">
              {{ fitScore.breakdown.academicFit || 0 }}/25
            </span>
          </div>
        </div>

        <!-- Opportunity Fit -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Opportunity Fit</span>
          <div class="flex items-center gap-2">
            <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500"
                :style="{
                  width: `${((fitScore.breakdown.opportunityFit || 0) / 20) * 100}%`,
                }"
              />
            </div>
            <span class="text-sm font-medium text-slate-900 w-12 text-right">
              {{ fitScore.breakdown.opportunityFit || 0 }}/20
            </span>
          </div>
        </div>

        <!-- Personal Fit -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-700">Personal Fit</span>
          <div class="flex items-center gap-2">
            <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-orange-500"
                :style="{
                  width: `${((fitScore.breakdown.personalFit || 0) / 15) * 100}%`,
                }"
              />
            </div>
            <span class="text-sm font-medium text-slate-900 w-12 text-right">
              {{ fitScore.breakdown.personalFit || 0 }}/15
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendation -->
    <div
      v-if="recommendation"
      class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <p class="text-sm text-blue-900">{{ recommendation }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Badge from "~/components/DesignSystem/Badge.vue";
import type { FitScoreResult, FitTier } from "~/types/timeline";
import type { BadgeColor } from "~/components/DesignSystem/Badge.vue";

interface Props {
  fitScore: FitScoreResult;
  showBreakdown?: boolean;
  showRecommendation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showBreakdown: false,
  showRecommendation: true,
});

const isExpanded = ref(false);

// Format tier name
function formatTier(tier: FitTier): string {
  const tierNames: Record<FitTier, string> = {
    reach: "Reach",
    match: "Match",
    safety: "Safety",
    unlikely: "Unlikely",
  };
  return tierNames[tier];
}

// Compute color for score display
const scoreColorClass = computed(() => {
  const score = props.fitScore.score;
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-orange-600";
  return "text-red-600";
});

// Compute tier color for badge
const tierColor = computed((): BadgeColor => {
  const tier = props.fitScore.tier;
  switch (tier) {
    case "match":
    case "safety":
      return "emerald";
    case "reach":
      return "orange";
    case "unlikely":
      return "red";
  }
});

// Generate recommendation
const recommendation = computed(() => {
  const { tier } = props.fitScore;

  if (!props.showRecommendation) return null;

  switch (tier) {
    case "match":
      return "✓ Excellent fit! This school aligns well with your profile and goals.";
    case "safety":
      return "✓ Good fit! You have a strong chance at this school.";
    case "reach":
      return "Possible fit with some growth. Focus on developing the highlighted dimensions to strengthen your candidacy.";
    case "unlikely":
      return "Not a strong fit based on current data. Consider schools that better match your profile, or work on improving key dimensions.";
  }
});
</script>

<style scoped>
.fit-score-display {
  @apply w-full;
}
</style>
