<template>
  <div
    v-if="hasRecs"
    class="rounded-lg border border-brand-slate-200 bg-white p-4 dark:border-brand-slate-700 dark:bg-brand-slate-800"
  >
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-brand-slate-900 dark:text-brand-slate-100">
        Schools to explore
      </h3>
      <NuxtLink
        to="/schools"
        class="text-xs font-medium text-brand-blue-600 hover:text-brand-blue-700"
      >
        See all →
      </NuxtLink>
    </div>

    <p v-if="actionError" role="alert" class="mb-2 text-xs text-brand-red-600">
      {{ actionError }}
    </p>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div
        v-for="school in displayRecs"
        :key="school.catalogKey"
        data-testid="rec-card"
        class="rounded-md border border-brand-slate-100 p-3 dark:border-brand-slate-600"
      >
        <p class="truncate text-sm font-medium text-brand-slate-900 dark:text-brand-slate-100">
          {{ school.name }}
        </p>
        <p class="text-xs text-brand-slate-500">
          {{ school.division }} · {{ school.conference ?? school.state }}
        </p>
        <div class="mt-2 flex gap-1">
          <button
            type="button"
            data-testid="rec-add"
            class="rounded bg-brand-blue-600 px-2 py-0.5 text-xs text-white hover:bg-brand-blue-700 disabled:opacity-60"
            :disabled="addingKey === school.catalogKey"
            @click="handleAdd(school)"
          >
            Add
          </button>
          <button
            type="button"
            data-testid="rec-dismiss"
            class="rounded px-2 py-0.5 text-xs text-brand-slate-400 hover:text-brand-slate-600"
            :disabled="addingKey === school.catalogKey"
            @click="handleDismiss(school.catalogKey)"
          >
            Not a fit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSchoolRecommendations } from "~/composables/useSchoolRecommendations";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { useSchools } from "~/composables/useSchools";
import { recommendationToSchoolDraft } from "~/utils/schoolRecommendations";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";
import type { School } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("SchoolRecommendationsWidget");

const emit = defineEmits<{
  "school-added": [school: SchoolRecommendation];
}>();

const { recommendations, fetchRecommendations, dismissRecommendation, removeRecommendation } =
  useSchoolRecommendations();
const { completeItem } = useNuxProgress();
const { createSchool } = useSchools();

const addingKey = ref<string | null>(null);
const actionError = ref<string | null>(null);

const displayRecs = computed(() => recommendations.value.slice(0, 4));
const hasRecs = computed(() => displayRecs.value.length > 0);

onMounted(() => {
  void fetchRecommendations();
});

async function handleAdd(school: SchoolRecommendation) {
  addingKey.value = school.catalogKey;
  actionError.value = null;
  try {
    await createSchool(
      recommendationToSchoolDraft(school) as Omit<
        School,
        "id" | "created_at" | "updated_at"
      >,
    );
    removeRecommendation(school.catalogKey);
    await completeItem("first_school");
    emit("school-added", school);
  } catch (err) {
    logger.warn("Failed to add recommended school", err);
    actionError.value = "Could not add that school.";
  } finally {
    addingKey.value = null;
  }
}

async function handleDismiss(catalogKey: string) {
  actionError.value = null;
  try {
    await dismissRecommendation(catalogKey);
  } catch (err) {
    logger.warn("Failed to dismiss school recommendation", err);
    actionError.value = "Could not dismiss that school.";
  }
}
</script>
