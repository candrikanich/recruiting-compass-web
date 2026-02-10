<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
    <h2 class="text-xl font-semibold text-slate-900 mb-6">
      Log New Interaction
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Type -->
      <div>
        <label for="type" class="block text-sm font-medium text-slate-700 mb-2">
          Type <span class="text-red-600">*</span>
        </label>
        <select
          id="type"
          v-model="newInteraction.type"
          required
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <div>
        <label
          for="direction"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Direction <span class="text-red-600">*</span>
        </label>
        <select
          id="direction"
          v-model="newInteraction.direction"
          required
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :disabled="loading"
        >
          <option value="">Select Direction</option>
          <option value="outbound">Outbound (We initiated)</option>
          <option value="inbound">Inbound (They contacted us)</option>
        </select>
      </div>

      <!-- Coach (optional) -->
      <div v-if="coaches.length > 0">
        <label
          for="coach"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Coach (Optional)
        </label>
        <select
          id="coach"
          v-model="newInteraction.coach_id"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Subject
        </label>
        <input
          id="subject"
          v-model="newInteraction.subject"
          type="text"
          :maxlength="MAX_SUBJECT_LENGTH"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Initial contact, Recruitment conversation"
          :disabled="loading"
        />
        <p class="text-xs text-slate-500 mt-1">
          {{ newInteraction.subject.length }}/{{ MAX_SUBJECT_LENGTH }}
          characters
        </p>
      </div>

      <!-- Content -->
      <div>
        <label
          for="content"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Content <span class="text-red-600">*</span>
        </label>
        <textarea
          id="content"
          v-model="newInteraction.content"
          required
          rows="5"
          :maxlength="MAX_CONTENT_LENGTH"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Details about the interaction..."
          :disabled="loading"
        />
        <p
          :class="[
            'text-xs mt-1',
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
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Attachments (Optional)
          <span class="text-xs text-slate-500 font-normal">
            PDF, images, documents up to 10MB
          </span>
        </label>
        <div class="relative">
          <input
            id="attachments"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
            @change="handleFileSelect"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            :key="idx"
            class="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-lg flex-shrink-0">📎</span>
              <div class="min-w-0">
                <p class="text-sm text-slate-700 truncate">
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
              class="text-red-600 hover:text-red-700 text-sm font-medium flex-shrink-0 ml-2"
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
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Sentiment
        </label>
        <select
          id="sentiment"
          v-model="newInteraction.sentiment"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Date & Time <span class="text-red-600">*</span>
        </label>
        <input
          id="occurred_at"
          v-model="newInteraction.occurred_at"
          type="datetime-local"
          required
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :disabled="loading"
        />
      </div>

      <!-- Follow-up Reminder (Optional) -->
      <div class="border-t border-slate-200 pt-5">
        <div class="flex items-center gap-2 mb-3">
          <input
            id="reminder-enabled"
            v-model="reminderEnabled"
            type="checkbox"
            class="w-4 h-4 border border-slate-300 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
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
          class="space-y-4 ml-6 bg-slate-50 p-4 rounded-lg"
        >
          <!-- Reminder Date -->
          <div>
            <label
              for="reminder-date"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Reminder Date
            </label>
            <input
              id="reminder-date"
              v-model="reminderDate"
              type="date"
              :min="getTodayDate()"
              required
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :disabled="loading"
            />
          </div>

          <!-- Reminder Type -->
          <div>
            <label
              for="reminder-type"
              class="block text-sm font-medium text-slate-700 mb-2"
            >
              Reminder Type
            </label>
            <select
              id="reminder-type"
              v-model="reminderType"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? "Logging..." : "Log Interaction" }}
        </button>
        <button
          type="button"
          @click="$emit('cancel')"
          class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import type { Coach, Interaction } from "~/types/models";
import { getRoleLabel } from "~/utils/coachLabels";

const MAX_SUBJECT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10000;

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

const newInteraction = reactive({
  type: "",
  direction: "",
  coach_id: "",
  subject: "",
  content: "",
  sentiment: "",
  occurred_at: new Date().toISOString().slice(0, 16),
});

const reminderEnabled = ref(false);
const reminderDate = ref("");
const reminderType = ref<"email" | "sms" | "phone_call">("email");
const selectedFiles = ref<File[]>([]);

const isFormValid = computed(
  () =>
    !props.loading &&
    newInteraction.type &&
    newInteraction.direction &&
    newInteraction.content &&
    newInteraction.occurred_at,
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
  const fileInput = document.getElementById("attachments") as HTMLInputElement;
  if (fileInput) {
    fileInput.value = "";
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const resetForm = () => {
  newInteraction.type = "";
  newInteraction.direction = "";
  newInteraction.coach_id = "";
  newInteraction.subject = "";
  newInteraction.content = "";
  newInteraction.sentiment = "";
  newInteraction.occurred_at = new Date().toISOString().slice(0, 16);
  reminderEnabled.value = false;
  reminderDate.value = "";
  reminderType.value = "email";
  selectedFiles.value = [];
  const fileInput = document.getElementById("attachments") as HTMLInputElement;
  if (fileInput) {
    fileInput.value = "";
  }
};

const handleSubmit = () => {
  emit("submit", {
    type: newInteraction.type,
    direction: newInteraction.direction,
    coach_id: newInteraction.coach_id,
    subject: newInteraction.subject,
    content: newInteraction.content,
    sentiment: newInteraction.sentiment,
    occurred_at: newInteraction.occurred_at,
    selectedFiles: [...selectedFiles.value],
    reminderEnabled: reminderEnabled.value,
    reminderDate: reminderDate.value,
    reminderType: reminderType.value,
  });
  resetForm();
};

defineExpose({ resetForm });
</script>
