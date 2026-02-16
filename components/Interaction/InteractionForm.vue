<script setup lang="ts">
import InterestCalibration from "~/components/Interaction/InterestCalibration.vue";
import type { Interaction } from "~/types/models";
import type { Coach } from "~/types/models";

interface InteractionFormData {
  school_id: string;
  coach_id: string | null;
  type: string;
  direction: string;
  occurred_at: string;
  subject: string;
  content: string;
  sentiment: string | null;
  interest_level: string | null;
}

interface Props {
  loading: boolean;
  initialData?: Partial<Interaction>;
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
});

const emit = defineEmits<{
  submit: [data: InteractionFormData];
  cancel: [];
}>();

const { fieldErrors } = useFormValidation();
const calibrationComponent = ref<InstanceType<
  typeof InterestCalibration
> | null>(null);

const form = ref<InteractionFormData>({
  school_id: props.initialData?.school_id || "",
  coach_id: props.initialData?.coach_id || null,
  type: props.initialData?.type || "",
  direction: props.initialData?.direction || "outbound",
  occurred_at: props.initialData?.occurred_at
    ? new Date(props.initialData.occurred_at).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16),
  subject: props.initialData?.subject || "",
  content: props.initialData?.content || "",
  sentiment: props.initialData?.sentiment || null,
  interest_level: null,
});

const selectedFiles = ref<File[]>([]);
const showAddCoachModal = ref(false);
const showOtherCoachModal = ref(false);

// Sentiment value (non-null version for the select)
const sentimentValue = computed({
  get: () => form.value.sentiment || '',
  set: (value: string) => {
    form.value.sentiment = value === '' ? null : value
  }
})

// Type options
const typeOptions = computed(() => [
  { value: '', label: 'Select Type' },
  { value: 'email', label: '📧 Email' },
  { value: 'text', label: '💬 Text' },
  { value: 'phone_call', label: '☎️ Phone Call' },
  { value: 'in_person_visit', label: '👥 In-Person Visit' },
  { value: 'virtual_meeting', label: '💻 Virtual Meeting' },
  { value: 'camp', label: '⚾ Camp' },
  { value: 'showcase', label: '🎯 Showcase' },
  { value: 'tweet', label: 'X (Twitter)' },
  { value: 'dm', label: '💭 DM' }
])

// Sentiment options
const sentimentOptions = computed(() => [
  { value: '', label: 'No sentiment' },
  { value: 'very_positive', label: '😄 Very Positive' },
  { value: 'positive', label: '😊 Positive' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'negative', label: '😕 Negative' }
])

const shouldShowCalibration = computed(() => {
  return (
    form.value.direction === "inbound" &&
    form.value.sentiment &&
    ["positive", "very_positive"].includes(form.value.sentiment)
  );
});

const isFormValid = computed(() => {
  return (
    form.value.school_id &&
    form.value.type &&
    form.value.direction &&
    form.value.occurred_at
  );
});

const handleAddNewCoach = () => {
  showAddCoachModal.value = true;
};

const handleOtherCoach = () => {
  showOtherCoachModal.value = true;
};

const handleCoachCreated = (coach: Coach) => {
  form.value.coach_id = coach.id;
  showAddCoachModal.value = false;
};

const handleOtherCoachContinue = (coachName: string) => {
  // Store coach name in content note for reference
  // Keep coach_id as null since this coach is not in the system
  form.value.coach_id = null;
  showOtherCoachModal.value = false;
};

const handleSubmit = () => {
  if (!isFormValid.value) return;

  // Capture interest level from calibration component if available
  if (calibrationComponent.value) {
    form.value.interest_level = calibrationComponent.value.interestLevel;
  }

  // Build content with interest level if calibrated
  let finalContent = form.value.content;
  if (form.value.interest_level && form.value.interest_level !== "not_set") {
    const calibrationNote = `\n\n[Coach Interest Level: ${form.value.interest_level.toUpperCase()}]`;
    finalContent = (finalContent || "") + calibrationNote;
  }

  const formData: InteractionFormData = {
    ...form.value,
    content: finalContent,
  };

  emit("submit", formData);
};

const handleCancel = () => {
  emit("cancel");
};
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- School Selection -->
    <SchoolSelect
      v-model="form.school_id"
      :disabled="loading"
      :required="true"
      :error="fieldErrors.school_id"
    />

    <!-- Coach Selection -->
    <CoachSelect
      v-model="form.coach_id"
      :school-id="form.school_id"
      :disabled="loading || !form.school_id"
      :error="fieldErrors.coach_id"
      @add-new-coach="handleAddNewCoach"
      @other-coach="handleOtherCoach"
    />

    <!-- Interaction Type -->
    <DesignSystemFormSelect
      v-model="form.type"
      label="Type"
      :required="true"
      :disabled="loading"
      :options="typeOptions"
      :error="fieldErrors.type"
    />

    <!-- Direction -->
    <fieldset>
      <legend class="block text-sm font-medium text-slate-700 mb-3">
        Direction
        <span class="text-red-500" aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
      </legend>
      <div class="flex gap-4">
        <label class="group flex cursor-pointer items-center gap-3">
          <input
            v-model="form.direction"
            type="radio"
            value="outbound"
            required
            aria-required="true"
            :disabled="loading"
            class="h-5 w-5 border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
          />
          <span
            class="text-slate-700 transition-colors group-hover:text-indigo-600"
          >
            Outbound (We initiated)
          </span>
        </label>
        <label class="group flex cursor-pointer items-center gap-3">
          <input
            v-model="form.direction"
            type="radio"
            value="inbound"
            required
            aria-required="true"
            :disabled="loading"
            class="h-5 w-5 border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
          />
          <span
            class="text-slate-700 transition-colors group-hover:text-indigo-600"
          >
            Inbound (They initiated)
          </span>
        </label>
      </div>
      <DesignSystemFieldError :error="fieldErrors.direction" />
    </fieldset>

    <!-- Date/Time -->
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-2">
        Date & Time
        <span class="text-red-500" aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
      </label>
      <input
        v-model="form.occurred_at"
        type="datetime-local"
        required
        :disabled="loading"
        class="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
      />
      <p class="mt-1 text-xs text-slate-600">
        Select a date and time using the picker, or enter: YYYY-MM-DD HH:MM
      </p>
      <DesignSystemFieldError :error="fieldErrors.occurred_at" />
    </div>

    <!-- Subject -->
    <DesignSystemFormInput
      v-model="form.subject"
      label="Subject (Optional)"
      :disabled="loading"
      placeholder="Email subject, call topic, etc."
      :error="fieldErrors.subject"
    />

    <!-- Content -->
    <DesignSystemFormTextarea
      v-model="form.content"
      label="Content (Optional)"
      :disabled="loading"
      placeholder="Details about the interaction..."
      :rows="4"
      :error="fieldErrors.content"
    />

    <!-- Sentiment -->
    <div>
      <DesignSystemFormSelect
        v-model="sentimentValue"
        label="Sentiment (Optional)"
        :disabled="loading"
        :options="sentimentOptions"
        :error="fieldErrors.sentiment"
      />
    </div>

    <!-- Interest Calibration (conditional) -->
    <div
      v-if="shouldShowCalibration"
      class="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6"
    >
      <InterestCalibration ref="calibrationComponent" />
    </div>

    <!-- File Attachments -->
    <FileUpload
      v-model="selectedFiles"
      :disabled="loading"
      accept="image/*,.pdf,.doc,.docx"
      :multiple="true"
    />

    <!-- Buttons -->
    <div class="flex gap-3 pt-4">
      <button
        data-testid="log-interaction-submit-button"
        type="submit"
        :aria-busy="loading"
        :disabled="loading || !isFormValid"
        class="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
      >
        {{ loading ? "Logging..." : "Log Interaction" }}
      </button>
      <button
        type="button"
        :disabled="loading"
        class="flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        @click="handleCancel"
      >
        Cancel
      </button>
    </div>

    <!-- Add Coach Modal -->
    <CoachAddCoachModal
      :show="showAddCoachModal"
      :school-id="form.school_id"
      @close="showAddCoachModal = false"
      @coach-created="handleCoachCreated"
    />

    <!-- Other Coach Modal -->
    <CoachOtherCoachModal
      :show="showOtherCoachModal"
      @close="showOtherCoachModal = false"
      @continue="handleOtherCoachContinue"
    />
  </form>
</template>
