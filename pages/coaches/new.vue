<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
    >
      Skip to main content
    </a>

    <div id="main-content" class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6">
        <NuxtLink
          to="/coaches"
          class="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          ← Back to Coaches
        </NuxtLink>
      </div>

      <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Gradient Header -->
        <div
          class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-6"
        >
          <h1 class="text-2xl font-bold mb-1">Add New Coach</h1>
          <p class="text-blue-100 text-sm">
            Add a coach to track recruiting interactions
          </p>
        </div>

        <div class="p-8">
          <!-- School Selection (Required) -->
          <div class="mb-6">
            <label
              for="school"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              School <span class="text-red-600">*</span>
            </label>
            <select
              id="school"
              v-model="selectedSchoolId"
              required
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
            >
              <option value="">Select School</option>
              <option
                v-for="school in schools"
                :key="school.id"
                :value="school.id"
              >
                {{ school.name }}
              </option>
            </select>
            <!-- Show link to add school if no schools exist -->
            <p v-if="schools.length === 0" class="mt-2 text-sm text-slate-600">
              No schools found.
              <NuxtLink to="/schools/new" class="text-blue-600 hover:underline">
                Add a school first
              </NuxtLink>
            </p>
          </div>

          <!-- Coach Form -->
          <CoachForm
            v-if="selectedSchoolId"
            :loading="loading"
            @submit="handleCoachFormSubmit"
            @cancel="() => navigateTo('/coaches')"
          />

          <!-- Prompt if no school selected -->
          <div v-else class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-slate-600">
              Please select a school to continue
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { navigateTo } from "#app";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";

definePageMeta({
  middleware: "auth",
});

const { createCoach, loading } = useCoaches();
const { schools: allSchools, fetchSchools } = useSchools();

const selectedSchoolId = ref("");

const schools = computed(() => allSchools.value);

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

onMounted(async () => {
  // Fetch all schools if not already loaded
  if (schools.value.length === 0) {
    await fetchSchools();
  }
});
</script>
