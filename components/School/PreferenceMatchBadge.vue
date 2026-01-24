<template>
  <div v-if="badge" class="inline-flex items-center gap-1">
    <span
      :class="[
        'px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1',
        badge.class,
      ]"
    >
      <span v-if="showIcon">{{ badge.icon }}</span>
      {{ badge.label }}
    </span>
    <span
      v-if="showScore && !matchResult.hasDealbreakers"
      class="text-xs text-slate-600"
    >
      {{ matchResult.score }}%
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  useSchoolMatching,
  type MatchResult,
} from "~/composables/useSchoolMatching";
import type { School } from "~/types/models";

const props = defineProps<{
  school: School;
  showScore?: boolean;
  showIcon?: boolean;
}>();

const { calculateMatchScore, getMatchBadge } = useSchoolMatching();

const matchResult = computed<MatchResult>(() => {
  return calculateMatchScore(props.school);
});

const badge = computed(() => {
  return getMatchBadge(
    matchResult.value.score,
    matchResult.value.hasDealbreakers,
  );
});
</script>
