<template>
  <div class="fit-score-display">
    <!-- Score Summary -->
    <div class="mb-4 flex items-center gap-4">
      <div class="flex-1">
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold" :class="scoreColorClass">{{
            fitScore.score
          }}</span>
          <span class="text-lg text-slate-600">/100</span>
        </div>
        <div class="mt-1 text-sm text-slate-600">Fit Score</div>
      </div>

      <!-- Tier Badge -->
      <Badge :color="tierColor" variant="solid" size="md">
        {{ formatTier(fitScore.tier) }}
      </Badge>
    </div>

    <!-- Missing Dimensions Warning -->
    <div
      v-if="fitScore.missingDimensions.length > 0"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3"
    >
      <p class="text-sm text-amber-900">
        <strong>Missing data:</strong>
        {{ fitScore.missingDimensions.join(", ") }}
      </p>
      <p class="mt-1 text-xs text-amber-700">
        Add more details to improve this score.
      </p>
    </div>

    <!-- Breakdown (Optional) -->
    <details
      v-if="showBreakdown && Object.keys(fitScore.breakdown).length > 0"
      class="group mb-3"
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <span class="inline-block transition-transform group-open:rotate-90"
          >▶</span
        >
        Fit Score Breakdown
      </summary>

      <div class="mt-2 rounded-lg bg-slate-50 p-4">
        <h4 class="mb-3 text-sm font-semibold text-slate-900">
          Score Breakdown
        </h4>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-700">Athletic Fit</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full bg-blue-500"
                  :style="{
                    width: `${((fitScore.breakdown.athleticFit || 0) / 40) * 100}%`,
                  }"
                />
              </div>
              <span class="w-12 text-right text-sm font-medium text-slate-900">
                {{ fitScore.breakdown.athleticFit || 0 }}/40
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-700">Academic Fit</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full bg-purple-500"
                  :style="{
                    width: `${((fitScore.breakdown.academicFit || 0) / 25) * 100}%`,
                  }"
                />
              </div>
              <span class="w-12 text-right text-sm font-medium text-slate-900">
                {{ fitScore.breakdown.academicFit || 0 }}/25
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-700">Opportunity Fit</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full bg-emerald-500"
                  :style="{
                    width: `${((fitScore.breakdown.opportunityFit || 0) / 20) * 100}%`,
                  }"
                />
              </div>
              <span class="w-12 text-right text-sm font-medium text-slate-900">
                {{ fitScore.breakdown.opportunityFit || 0 }}/20
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-700">Personal Fit</span>
            <div class="flex items-center gap-2">
              <div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full bg-orange-500"
                  :style="{
                    width: `${((fitScore.breakdown.personalFit || 0) / 15) * 100}%`,
                  }"
                />
              </div>
              <span class="w-12 text-right text-sm font-medium text-slate-900">
                {{ fitScore.breakdown.personalFit || 0 }}/15
              </span>
            </div>
          </div>
        </div>
      </div>
    </details>

    <!-- Recommendation -->
    <div
      v-if="recommendation"
      class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3"
    >
      <p class="text-sm text-blue-900">{{ recommendation }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
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
@reference "tailwindcss";

.fit-score-display {
  @apply w-full;
}
</style>
