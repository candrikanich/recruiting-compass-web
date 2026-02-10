<template>
  <!-- Skip Link -->
  <a
    href="#main-content"
    @click="handleSkipLink"
    class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
  >
    Skip to main content
  </a>

  <FormPageLayout
    ref="mainContentRef"
    id="main-content"
    tabindex="-1"
    back-to="/coaches"
    back-text="Back to Coaches"
    title="Add New Coach"
    description="Add a coach to track recruiting interactions"
    header-color="blue"
  >
    <!-- School Selection (Required) -->
    <SchoolSelect
      v-model="selectedSchoolId"
      :disabled="loading"
      :required="true"
      label="School"
    />

    <!-- Coach Form -->
    <div v-if="selectedSchoolId">
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        School selected. Coach form now available.
      </div>
      <CoachForm
        :loading="loading"
        @submit="handleCoachFormSubmit"
        @cancel="() => navigateTo('/coaches')"
      />
    </div>

    <!-- Prompt if no school selected -->
    <div
      v-else
      class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
      role="status"
      aria-live="polite"
      aria-label="School selection required"
    >
      <p class="text-sm text-slate-600">Please select a school to continue</p>
    </div>
  </FormPageLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { navigateTo } from "#app";
import { useCoaches } from "~/composables/useCoaches";

definePageMeta({
  middleware: "auth",
});

const { createCoach, loading } = useCoaches();

const selectedSchoolId = ref("");
const mainContentRef = ref<HTMLElement | null>(null);

const handleSkipLink = (e: Event) => {
  e.preventDefault();
  mainContentRef.value?.focus();
};

const handleCoachFormSubmit = async (coachData: any) => {
  try {
    // Validate that a school was selected
    if (!selectedSchoolId.value) {
      console.error("Failed to create coach: No school selected");
      return;
    }

    const newCoach = await createCoach(selectedSchoolId.value, coachData);
    if (newCoach) {
      await navigateTo(`/coaches/${newCoach.id}`);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create coach";
    console.error("Failed to create coach:", message);
  }
};
</script>
