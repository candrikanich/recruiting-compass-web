<template>
  <div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <h2 class="mb-6 text-xl font-semibold text-slate-900">
      Log New Interaction
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Type -->
      <div>
        <label for="type" class="mb-2 block text-sm font-medium text-slate-700">
          Type <span class="text-red-600">*</span>
        </label>
        <select
          id="type"
          v-model="newInteraction.type"
          required
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :disabled="loading"
        >
          <option value="">Select Type</option>
          <option value="email">Email</option>
          <option value="text">Text Message</option>
          <option value="phone_call">Phone Call</option>
          <option value="in_person_visit">In-Person Visit</option>
          <option value="virtual_meeting">Virtual Meeting</option>
          <option value="camp">Camp</option>
          <option value="showcase">Showcase</option>
          <option value="game">Game</option>
          <option value="unofficial_visit">Unofficial Visit</option>
          <option value="official_visit">Official Visit</option>
          <option value="other">Other</option>
          <option value="tweet">Tweet</option>
          <option value="dm">Direct Message</option>
        </select>
      </div>

      <!-- Direction -->
      <DesignSystemFormSegmentedControl
        v-model="newInteraction.direction"
        label="Direction"
        required
        :disabled="loading"
        :options="[
          { value: 'outbound', label: 'Outbound (We initiated)' },
          { value: 'inbound', label: 'Inbound (They contacted us)' },
        ]"
      />

      <!-- Coach (optional) -->
      <div v-if="coaches.length > 0">
        <label
          for="coach"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Coach (Optional)
        </label>
        <select
          id="coach"
          v-model="newInteraction.coach_id"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :disabled="loading"
        >
          <option value="">Select Coach</option>
          <option v-for="coach in coaches" :key="coach.id" :value="coach.id">
            {{ coach.first_name }} {{ coach.last_name }} ({{
              getRoleLabel(coach.role)
            }})
          </option>
        </select>
      </div>

      <!-- Subject -->
      <div>
        <label
          for="subject"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Subject
        </label>
        <input
          id="subject"
          v-model="newInteraction.subject"
          type="text"
          :maxlength="MAX_SUBJECT_LENGTH"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Initial contact, Recruitment conversation"
          :disabled="loading"
        />
        <p class="mt-1 text-xs text-slate-500">
          {{ newInteraction.subject.length }}/{{ MAX_SUBJECT_LENGTH }}
          characters
        </p>
      </div>

      <!-- Content -->
      <div>
        <label
          for="content"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Content <span class="text-red-600">*</span>
        </label>
        <textarea
          id="content"
          v-model="newInteraction.content"
          required
          rows="5"
          :maxlength="MAX_CONTENT_LENGTH"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder="Details about the interaction..."
          :disabled="loading"
        />
        <p
          :class="[
            'mt-1 text-xs',
            newInteraction.content.length > MAX_CONTENT_LENGTH * 0.9
              ? 'text-red-600'
              : 'text-slate-500',
          ]"
        >
          {{ newInteraction.content.length }}/{{ MAX_CONTENT_LENGTH }}
          characters
        </p>
      </div>

      <!-- Attachments (Optional) -->
      <div>
        <label
          for="attachments"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Attachments (Optional)
          <span class="text-xs font-normal text-slate-500">
            PDF, images, documents up to 10MB
          </span>
        </label>
        <div class="relative">
          <input
            id="attachments"
            ref="attachments"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
            @change="handleFileSelect"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            :disabled="loading"
          />
        </div>

        <!-- File Preview -->
        <div v-if="selectedFiles.length > 0" class="mt-3 space-y-2">
          <p class="text-xs font-medium text-slate-600">
            Selected files ({{ selectedFiles.length }})
          </p>
          <div
            v-for="(file, idx) in selectedFiles"
            :key="file.name + file.size"
            class="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-50 p-2"
          >
            <div class="flex min-w-0 items-center gap-2">
              <span class="shrink-0 text-lg">📎</span>
              <div class="min-w-0">
                <p class="truncate text-sm text-slate-700">
                  {{ file.name }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ formatFileSize(file.size) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="removeFile(idx)"
              class="ml-2 shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Sentiment -->
      <div>
        <label
          for="sentiment"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Sentiment
        </label>
        <select
          id="sentiment"
          v-model="newInteraction.sentiment"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :disabled="loading"
        >
          <option value="">Not specified</option>
          <option value="very_positive">Very Positive</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      <!-- Date/Time -->
      <div>
        <label
          for="occurred_at"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Date & Time <span class="text-red-600">*</span>
        </label>
        <input
          id="occurred_at"
          v-model="newInteraction.occurred_at"
          type="datetime-local"
          required
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :disabled="loading"
        />
      </div>

      <!-- Follow-up Reminder (Optional) -->
      <div class="border-t border-slate-200 pt-5">
        <div class="mb-3 flex items-center gap-2">
          <input
            id="reminder-enabled"
            v-model="reminderEnabled"
            type="checkbox"
            class="h-4 w-4 rounded-sm border border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            :disabled="loading"
          />
          <label
            for="reminder-enabled"
            class="text-sm font-medium text-slate-700"
          >
            Set Follow-up Reminder
          </label>
        </div>

        <div
          v-if="reminderEnabled"
          class="ml-6 space-y-4 rounded-lg bg-slate-50 p-4"
        >
          <!-- Reminder Date -->
          <div>
            <label
              for="reminder-date"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Reminder Date
            </label>
            <input
              id="reminder-date"
              v-model="reminderDate"
              type="date"
              :min="getTodayDate()"
              required
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              :disabled="loading"
            />
          </div>

          <!-- Reminder Type -->
          <div>
            <label
              for="reminder-type"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Reminder Type
            </label>
            <select
              id="reminder-type"
              v-model="reminderType"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              :disabled="loading"
            >
              <option value="email">Email Reminder</option>
              <option value="sms">Text Reminder</option>
              <option value="phone_call">Phone Call Reminder</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          :disabled="!isFormValid"
          class="flex-1 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? "Logging..." : "Log Interaction" }}
        </button>
        <button
          type="button"
          @click="$emit('cancel')"
          class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from "vue";
import type { Coach, Interaction } from "~/types/models";
import { getRoleLabel } from "~/utils/coachLabels";

const MAX_SUBJECT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10000;

// `<input type="datetime-local">` expects/displays its value in LOCAL time.
// `new Date().toISOString()` is UTC — defaulting to it pre-fills the form
// with the wrong local clock time (off by the timezone offset).
const formatLocalDatetimeInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const props = defineProps<{
  coaches: Coach[];
  loading: boolean;
}>();

type InteractionSubmitData = {
  type: string;
  direction: string;
  coach_id: string;
  subject: string;
  content: string;
  sentiment: string;
  occurred_at: string;
  selectedFiles: File[];
  reminderEnabled: boolean;
  reminderDate: string;
  reminderType: "email" | "sms" | "phone_call";
};

const emit = defineEmits<{
  submit: [data: InteractionSubmitData];
  cancel: [];
}>();

const createInitialForm = () => ({
  type: "",
  direction: "",
  coach_id: "",
  subject: "",
  content: "",
  sentiment: "",
  occurred_at: formatLocalDatetimeInputValue(new Date()),
});
const newInteraction = ref(createInitialForm());

const reminderEnabled = ref(false);
const reminderDate = ref("");
const reminderType = ref<"email" | "sms" | "phone_call">("email");
const selectedFiles = ref<File[]>([]);
const fileInputRef = useTemplateRef<HTMLInputElement>("attachments");

const isFormValid = computed(
  () =>
    !props.loading &&
    newInteraction.value.type &&
    newInteraction.value.direction &&
    newInteraction.value.content &&
    newInteraction.value.occurred_at,
);

const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

const handleFileSelect = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    selectedFiles.value = Array.from(target.files);
  }
};

const removeFile = (index: number): void => {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== index);
  if (fileInputRef.value) {
    const dt = new DataTransfer();
    selectedFiles.value.forEach((file) => dt.items.add(file));
    fileInputRef.value.files = dt.files;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const resetForm = () => {
  newInteraction.value = createInitialForm();
  reminderEnabled.value = false;
  reminderDate.value = "";
  reminderType.value = "email";
  selectedFiles.value = [];
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

const handleSubmit = () => {
  emit("submit", {
    type: newInteraction.value.type,
    direction: newInteraction.value.direction,
    coach_id: newInteraction.value.coach_id,
    subject: newInteraction.value.subject,
    content: newInteraction.value.content,
    sentiment: newInteraction.value.sentiment,
    occurred_at: newInteraction.value.occurred_at,
    selectedFiles: [...selectedFiles.value],
    reminderEnabled: reminderEnabled.value,
    reminderDate: reminderDate.value,
    reminderType: reminderType.value,
  });
  resetForm();
};

defineExpose({ resetForm });
</script>
