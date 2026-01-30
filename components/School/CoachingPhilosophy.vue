<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6" data-testid="coaching-philosophy-section">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-900">Coaching Philosophy</h2>
      <div class="flex items-center gap-2">
        <NotesHistory :school-id="schoolId" />
        <button
          data-testid="coaching-philosophy-edit-btn"
          @click="toggleEditing"
          class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition flex items-center gap-1"
        >
          <PencilIcon class="w-4 h-4" />
          {{ isEditing ? "Cancel" : "Edit" }}
        </button>
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-if="isEditing" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Coaching Style
        </label>
        <textarea
          v-model="editedCoachingData.coaching_style"
          data-testid="coaching-style-textarea"
          rows="3"
          placeholder="e.g., High-intensity, Player development focused, Defensive emphasis..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Recruiting Approach
        </label>
        <textarea
          v-model="editedCoachingData.recruiting_approach"
          data-testid="recruiting-approach-textarea"
          rows="3"
          placeholder="e.g., Early recruiting, Late bloomers, All-around athletes..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Communication Style
        </label>
        <textarea
          v-model="editedCoachingData.communication_style"
          data-testid="communication-style-textarea"
          rows="3"
          placeholder="e.g., Regular emails, Phone calls, In-person only, Direct and honest..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Success Metrics
        </label>
        <textarea
          v-model="editedCoachingData.success_metrics"
          data-testid="success-metrics-textarea"
          rows="3"
          placeholder="e.g., Success with similar athletes, Draft history, MLB placement..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-2">
          Overall Philosophy
        </label>
        <textarea
          v-model="editedCoachingData.coaching_philosophy"
          data-testid="overall-philosophy-textarea"
          rows="3"
          placeholder="General notes about the coaching philosophy and program culture..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        data-testid="save-philosophy-btn"
        @click="savePhilosophy"
        :disabled="loading"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? "Saving..." : "Save Philosophy" }}
      </button>
    </div>

    <!-- View Mode -->
    <div v-else class="space-y-4">
      <div v-if="school?.coaching_style" class="pb-4 border-b border-slate-200">
        <h3 class="text-sm font-medium text-slate-700 mb-1">Coaching Style</h3>
        <p class="text-slate-700 text-sm whitespace-pre-wrap">
          {{ school.coaching_style }}
        </p>
      </div>

      <div v-if="school?.recruiting_approach" class="pb-4 border-b border-slate-200">
        <h3 class="text-sm font-medium text-slate-700 mb-1">Recruiting Approach</h3>
        <p class="text-slate-700 text-sm whitespace-pre-wrap">
          {{ school.recruiting_approach }}
        </p>
      </div>

      <div v-if="school?.communication_style" class="pb-4 border-b border-slate-200">
        <h3 class="text-sm font-medium text-slate-700 mb-1">Communication Style</h3>
        <p class="text-slate-700 text-sm whitespace-pre-wrap">
          {{ school.communication_style }}
        </p>
      </div>

      <div v-if="school?.success_metrics" class="pb-4 border-b border-slate-200">
        <h3 class="text-sm font-medium text-slate-700 mb-1">Success Metrics</h3>
        <p class="text-slate-700 text-sm whitespace-pre-wrap">
          {{ school.success_metrics }}
        </p>
      </div>

      <div v-if="school?.coaching_philosophy">
        <h3 class="text-sm font-medium text-slate-700 mb-1">Overall Philosophy</h3>
        <p class="text-slate-700 text-sm whitespace-pre-wrap">
          {{ school.coaching_philosophy }}
        </p>
      </div>

      <div
        v-if="!hasAnyCoachingInfo"
        class="text-center py-6 text-slate-500"
      >
        <p class="text-sm">No coaching philosophy information added yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { PencilIcon } from "@heroicons/vue/24/outline";
import type { School } from "~/types/models";
import NotesHistory from "~/components/School/NotesHistory.vue";

const props = defineProps<{
  school: School;
  schoolId: string;
}>();

const emit = defineEmits<{
  update: [data: Partial<School>];
}>();

const isEditing = ref(false);
const loading = ref(false);

const editedCoachingData = ref({
  coaching_philosophy: props.school.coaching_philosophy || "",
  coaching_style: props.school.coaching_style || "",
  recruiting_approach: props.school.recruiting_approach || "",
  communication_style: props.school.communication_style || "",
  success_metrics: props.school.success_metrics || "",
});

const hasAnyCoachingInfo = computed(() => {
  return (
    props.school?.coaching_philosophy ||
    props.school?.coaching_style ||
    props.school?.recruiting_approach ||
    props.school?.communication_style ||
    props.school?.success_metrics
  );
});

const toggleEditing = () => {
  isEditing.value = !isEditing.value;
  if (!isEditing.value) {
    // Reset to current values if canceling
    editedCoachingData.value = {
      coaching_philosophy: props.school.coaching_philosophy || "",
      coaching_style: props.school.coaching_style || "",
      recruiting_approach: props.school.recruiting_approach || "",
      communication_style: props.school.communication_style || "",
      success_metrics: props.school.success_metrics || "",
    };
  }
};

const savePhilosophy = async () => {
  loading.value = true;
  try {
    emit("update", editedCoachingData.value);
    isEditing.value = false;
  } catch (error) {
    console.error("Error saving coaching philosophy:", error);
  } finally {
    loading.value = false;
  }
};

// Update local state when school prop changes
watch(() => props.school, (newSchool) => {
  editedCoachingData.value = {
    coaching_philosophy: newSchool.coaching_philosophy || "",
    coaching_style: newSchool.coaching_style || "",
    recruiting_approach: newSchool.recruiting_approach || "",
    communication_style: newSchool.communication_style || "",
    success_metrics: newSchool.success_metrics || "",
  };
}, { deep: true });
</script>
