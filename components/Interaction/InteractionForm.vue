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

const selectDropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: "right 0.75rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1.5em 1.5em",
  paddingRight: "2.5rem",
}));

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
    <div>
      <label for="type" class="block text-sm font-medium text-slate-700">
        Type
        <span class="text-red-500" aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
      </label>
      <select
        id="type"
        v-model="form.type"
        required
        :disabled="loading"
        class="mt-1 block w-full appearance-none rounded-lg border-2 border-slate-300 bg-white px-4 py-3 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        :style="selectDropdownStyle"
      >
        <option value="">Select Type</option>
        <option value="email">📧 Email</option>
        <option value="text">💬 Text</option>
        <option value="phone_call">☎️ Phone Call</option>
        <option value="in_person_visit">👥 In-Person Visit</option>
        <option value="virtual_meeting">💻 Virtual Meeting</option>
        <option value="camp">⚾ Camp</option>
        <option value="showcase">🎯 Showcase</option>
        <option value="tweet">X (Twitter)</option>
        <option value="dm">💭 DM</option>
      </select>
      <DesignSystemFieldError :error="fieldErrors.type" />
    </div>

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
      <label for="occurred_at" class="block text-sm font-medium text-slate-700">
        Date & Time
        <span class="text-red-500" aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
      </label>
      <input
        id="occurred_at"
        v-model="form.occurred_at"
        type="datetime-local"
        required
        aria-required="true"
        aria-describedby="datetime-help"
        :disabled="loading"
        class="mt-1 block w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p id="datetime-help" class="mt-1 text-xs text-slate-600">
        Select a date and time using the picker, or enter: YYYY-MM-DD HH:MM
      </p>
      <DesignSystemFieldError :error="fieldErrors.occurred_at" />
    </div>

    <!-- Subject -->
    <div>
      <label for="subject" class="block text-sm font-medium text-slate-700">
        Subject (Optional)
      </label>
      <input
        id="subject"
        v-model="form.subject"
        type="text"
        placeholder="Email subject, call topic, etc."
        :disabled="loading"
        class="mt-1 block w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <DesignSystemFieldError :error="fieldErrors.subject" />
    </div>

    <!-- Content -->
    <div>
      <label for="content" class="block text-sm font-medium text-slate-700">
        Content (Optional)
      </label>
      <textarea
        id="content"
        v-model="form.content"
        rows="4"
        placeholder="Details about the interaction..."
        :disabled="loading"
        class="mt-1 block w-full resize-none rounded-lg border-2 border-slate-300 bg-white px-4 py-3 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <DesignSystemFieldError :error="fieldErrors.content" />
    </div>

    <!-- Sentiment -->
    <div>
      <label for="sentiment" class="block text-sm font-medium text-slate-700">
        Sentiment (Optional)
      </label>
      <select
        id="sentiment"
        v-model="form.sentiment"
        :disabled="loading"
        class="mt-1 block w-full appearance-none rounded-lg border-2 border-slate-300 bg-white px-4 py-3 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        :style="selectDropdownStyle"
      >
        <option value="">No sentiment</option>
        <option value="very_positive">😄 Very Positive</option>
        <option value="positive">😊 Positive</option>
        <option value="neutral">😐 Neutral</option>
        <option value="negative">😕 Negative</option>
      </select>
      <DesignSystemFieldError :error="fieldErrors.sentiment" />
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
        class="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
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
    <AddCoachModal
      :show="showAddCoachModal"
      :school-id="form.school_id"
      @close="showAddCoachModal = false"
      @coach-created="handleCoachCreated"
    />

    <!-- Other Coach Modal -->
    <OtherCoachModal
      :show="showOtherCoachModal"
      @close="showOtherCoachModal = false"
      @continue="handleOtherCoachContinue"
    />
  </form>
</template>
