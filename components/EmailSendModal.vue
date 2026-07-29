<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end z-1001 p-4"
        @keydown.escape="handleClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="
            step === 'preview' ? 'email-send-title' : 'email-send-confirm-title'
          "
          class="bg-white rounded-t-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up"
        >
          <!-- Step 1: Email Preview -->
          <div v-if="step === 'preview'" class="flex flex-col max-h-[90vh]">
            <!-- Header -->
            <div
              class="bg-linear-to-r from-blue-600 to-blue-700 text-white px-6 py-6"
            >
              <h2 id="email-send-title" class="text-xl font-bold mb-1">
                Send Email
              </h2>
              <p class="text-blue-100 text-sm">
                Review before sending via your email client
              </p>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <!-- Recipient -->
              <div>
                <p
                  id="email-send-to-label"
                  class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1"
                >
                  To
                </p>
                <div
                  aria-labelledby="email-send-to-label"
                  class="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-900"
                >
                  {{ recipientEmail || "No recipient" }}
                </div>
              </div>

              <!-- Subject -->
              <div>
                <p
                  id="email-send-subject-label"
                  class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1"
                >
                  Subject
                </p>
                <div
                  aria-labelledby="email-send-subject-label"
                  class="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-900"
                >
                  {{ subject || "(No subject)" }}
                </div>
              </div>

              <!-- Body Preview -->
              <div>
                <p
                  id="email-send-message-label"
                  class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1"
                >
                  Message
                </p>
                <div
                  aria-labelledby="email-send-message-label"
                  class="px-3 py-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto"
                >
                  {{ body || "(No message)" }}
                </div>
              </div>

              <!-- Info Box -->
              <div class="bg-blue-50 border-l-4 border-blue-600 p-3 rounded-sm">
                <p class="text-xs text-blue-900">
                  <strong>Next:</strong> Click "Send via Email" to open your
                  email client. The email content will be pre-filled. After
                  sending, confirm so we can log this interaction.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-3"
            >
              <button
                @click="handleSendClick"
                class="w-full px-4 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition"
              >
                📧 Send via Email Client
              </button>
              <button
                @click="handleClose"
                class="w-full px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Step 2: Confirmation -->
          <div v-if="step === 'confirmation'" class="flex flex-col">
            <!-- Header -->
            <div
              class="bg-linear-to-r from-brand-orange-600 to-brand-orange-700 text-white px-6 py-6"
            >
              <h2 id="email-send-confirm-title" class="text-xl font-bold mb-1">
                Confirm Email Sent
              </h2>
              <p class="text-brand-orange-100 text-sm">
                Did you send the email from your email client?
              </p>
            </div>

            <!-- Content -->
            <div class="px-6 py-6 space-y-4">
              <div
                class="bg-brand-orange-50 border-l-4 border-brand-orange-600 p-4 rounded-sm"
              >
                <p class="text-sm text-brand-orange-900">
                  Your email client should have opened with the message
                  pre-filled. Send it, then confirm below so we can record this
                  interaction.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-3"
            >
              <button
                @click="confirmAndClose"
                class="w-full px-4 py-3 bg-linear-to-r from-brand-emerald-600 to-brand-emerald-700 text-white font-semibold rounded-xl hover:from-brand-emerald-700 hover:to-brand-emerald-800 transition"
              >
                ✓ Yes, Email Sent
              </button>
              <button
                @click="step = 'preview'"
                class="w-full px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
              >
                Back
              </button>
              <button
                @click="handleClose"
                class="w-full px-4 py-3 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";

interface Props {
  isOpen: boolean;
  recipientEmail: string;
  subject: string;
  body: string;
}

interface Emits {
  (e: "close"): void;
  (e: "confirmed"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const step = ref<"preview" | "confirmation">("preview");

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const handleClose = () => {
  deactivate();
  emit("close");
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);

const handleSendClick = () => {
  // Build mailto link with proper encoding
  // Use encodeURIComponent instead of URLSearchParams to preserve line breaks
  // and avoid + encoding for spaces
  const subject = encodeURIComponent(props.subject || "");
  const body = encodeURIComponent(props.body || "");

  const mailtoLink = `mailto:${props.recipientEmail}?subject=${subject}&body=${body}`;

  // Open email client
  if (typeof window !== "undefined") {
    window.location.href = mailtoLink;
  }

  // Move to confirmation step
  setTimeout(() => {
    step.value = "confirmation";
  }, 500);
};

const confirmAndClose = () => {
  // Emit confirmed event so parent can create interaction
  emit("confirmed");
  // Reset and close
  step.value = "preview";
  handleClose();
};

// Expose methods for testing
defineExpose({
  step,
  handleSendClick,
  confirmAndClose,
});
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

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
