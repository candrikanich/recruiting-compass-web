<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <div
          class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <!-- Header -->
          <div
            class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between"
          >
            <h2 class="text-xl font-bold text-slate-900">
              Email Recruiting Packet
            </h2>
            <button
              @click="handleClose"
              class="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-6 space-y-6">
            <!-- Coach Selection -->
            <div>
              <label class="block text-sm font-semibold text-slate-900 mb-3">
                Recipients (Select coaches or enter emails)
              </label>

              <!-- Coach Quick Select -->
              <div v-if="availableCoaches.length > 0" class="mb-4">
                <p class="text-xs text-slate-600 mb-2">
                  Quick select from coaches:
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    v-for="coach in availableCoaches"
                    :key="coach.id"
                    class="flex items-center p-2 border border-slate-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      :value="coach.email"
                      v-model="selectedEmails"
                      class="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span class="ml-2 text-sm text-slate-700">
                      {{ coach.first_name }} {{ coach.last_name }}
                      <span class="text-xs text-slate-500 block">{{
                        coach.email
                      }}</span>
                    </span>
                  </label>
                </div>
              </div>

              <!-- Manual Email Entry -->
              <div>
                <label class="text-xs text-slate-600 mb-1 block"
                  >Add manual emails (comma-separated):</label
                >
                <textarea
                  v-model="manualEmails"
                  placeholder="coach1@example.com, coach2@example.com"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows="2"
                />
              </div>

              <!-- Recipients Display -->
              <div
                v-if="allRecipients.length > 0"
                class="mt-3 flex flex-wrap gap-2"
              >
                <div
                  v-for="(email, idx) in allRecipients"
                  :key="`${email}-${idx}`"
                  class="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {{ email }}
                  <button
                    @click="removeRecipient(idx)"
                    type="button"
                    class="ml-2 hover:text-blue-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <!-- Recipient Count Error -->
              <div
                v-if="allRecipients.length > MAX_RECIPIENTS"
                class="mt-2 text-sm text-red-600 flex items-center"
              >
                <svg
                  class="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
                Maximum {{ MAX_RECIPIENTS }} recipients per send
              </div>
            </div>

            <!-- Subject Line -->
            <div>
              <label class="block text-sm font-semibold text-slate-900 mb-2">
                Subject
              </label>
              <input
                v-model="form.subject"
                type="text"
                :maxlength="MAX_SUBJECT_LENGTH"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter subject line"
              />
              <p class="text-xs text-slate-500 mt-1">
                {{ form.subject.length }}/200 characters
              </p>
            </div>

            <!-- Email Body -->
            <div>
              <label class="block text-sm font-semibold text-slate-900 mb-2">
                Message
              </label>
              <textarea
                v-model="form.body"
                rows="6"
                :maxlength="MAX_BODY_LENGTH"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Write your message here..."
              />
              <p
                :class="[
                  'text-xs mt-1',
                  form.body.length > MAX_BODY_LENGTH
                    ? 'text-red-600'
                    : 'text-slate-500',
                ]"
              >
                {{ form.body.length }}/{{ MAX_BODY_LENGTH }} characters
              </p>
            </div>

            <!-- Error Display -->
            <div
              v-if="error"
              class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {{ error }}
            </div>
          </div>

          <!-- Footer -->
          <div
            class="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3"
          >
            <button
              @click="handleClose"
              :disabled="loading"
              class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              @click="handleSend"
              :disabled="!canSend || loading"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center',
                canSend && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-500 cursor-not-allowed',
              ]"
            >
              <svg
                v-if="loading"
                class="w-4 h-4 mr-2 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ loading ? "Sending..." : "Send Email" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Coach } from "~/types/models";

const MAX_RECIPIENTS = 10;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;

const props = defineProps<{
  isOpen: boolean;
  availableCoaches?: Coach[];
  defaultSubject?: string;
  defaultBody?: string;
}>();

const emit = defineEmits<{
  close: [];
  send: [data: { recipients: string[]; subject: string; body: string }];
}>();

// State
const selectedEmails = ref<string[]>([]);
const manualEmails = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const form = ref({
  subject: props.defaultSubject || "",
  body: props.defaultBody || "",
});

// Enforce character limits
const enforceSubjectLimit = (value: string) => {
  if (value.length > MAX_SUBJECT_LENGTH) {
    form.value.subject = value.substring(0, MAX_SUBJECT_LENGTH);
  }
};

const enforceBodyLimit = (value: string) => {
  if (value.length > MAX_BODY_LENGTH) {
    form.value.body = value.substring(0, MAX_BODY_LENGTH);
  }
};

const availableCoaches = computed(() => props.availableCoaches || []);

// Parse manual emails from comma-separated input
const parsedManualEmails = computed(() => {
  return manualEmails.value
    .split(",")
    .map((email) => email.trim())
    .filter(
      (email) => email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
});

// Combine selected and manual emails
const allRecipients = computed(() => {
  return Array.from(
    new Set([...selectedEmails.value, ...parsedManualEmails.value]),
  );
});

// Validation
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const canSend = computed(() => {
  return (
    allRecipients.value.length > 0 &&
    allRecipients.value.length <= MAX_RECIPIENTS &&
    form.value.subject.length > 0 &&
    form.value.subject.length <= MAX_SUBJECT_LENGTH &&
    form.value.body.length > 0 &&
    form.value.body.length <= MAX_BODY_LENGTH
  );
});

// Methods
const removeRecipient = (index: number) => {
  const recipient = allRecipients.value[index];
  if (selectedEmails.value.includes(recipient)) {
    selectedEmails.value = selectedEmails.value.filter((e) => e !== recipient);
  } else {
    const manualArray = parsedManualEmails.value;
    manualArray.splice(index - selectedEmails.value.length, 1);
    manualEmails.value = manualArray.join(", ");
  }
};

const handleClose = () => {
  if (!loading.value) {
    emit("close");
    reset();
  }
};

const handleSend = async () => {
  if (!canSend.value) return;

  loading.value = true;
  error.value = null;

  try {
    emit("send", {
      recipients: allRecipients.value,
      subject: form.value.subject,
      body: form.value.body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    error.value = message;
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  selectedEmails.value = [];
  manualEmails.value = "";
  form.value = {
    subject: props.defaultSubject || "",
    body: props.defaultBody || "",
  };
  error.value = null;
};

// Enforce character limits when form values change
watch(
  () => form.value.subject,
  (newVal) => enforceSubjectLimit(newVal),
);

watch(
  () => form.value.body,
  (newVal) => enforceBodyLimit(newVal),
);

// Update default values when props change
watch(
  () => props.defaultSubject,
  (newVal) => {
    if (newVal && form.value.subject === "") {
      form.value.subject = newVal;
    }
  },
);

watch(
  () => props.defaultBody,
  (newVal) => {
    if (newVal && form.value.body === "") {
      form.value.body = newVal;
    }
  },
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
