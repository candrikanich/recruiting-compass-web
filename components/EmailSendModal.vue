<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-1001 flex items-end bg-black/50 p-4 backdrop-blur-xs"
        @keydown.escape="handleClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="
            step === 'preview' ? 'email-send-title' : 'email-send-confirm-title'
          "
          class="animate-slide-up w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl"
        >
          <!-- Step 1: Email Preview -->
          <div v-if="step === 'preview'" class="flex max-h-[90vh] flex-col">
            <!-- Header -->
            <div
              class="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-6 text-white"
            >
              <h2 id="email-send-title" class="mb-1 text-xl font-bold">
                Send Email
              </h2>
              <p class="text-sm text-blue-100">
                Review before sending via your email client
              </p>
            </div>

            <!-- Content -->
            <div class="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <!-- Recipient -->
              <div>
                <p
                  id="email-send-to-label"
                  class="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase"
                >
                  To
                </p>
                <div
                  aria-labelledby="email-send-to-label"
                  class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  {{ recipientEmail || "No recipient" }}
                </div>
              </div>

              <!-- Subject -->
              <div>
                <p
                  id="email-send-subject-label"
                  class="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase"
                >
                  Subject
                </p>
                <div
                  aria-labelledby="email-send-subject-label"
                  class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  {{ subject || "(No subject)" }}
                </div>
              </div>

              <!-- Body Preview -->
              <div>
                <p
                  id="email-send-message-label"
                  class="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase"
                >
                  Message
                </p>
                <div
                  aria-labelledby="email-send-message-label"
                  class="max-h-48 overflow-y-auto rounded-lg bg-slate-50 px-3 py-3 text-sm whitespace-pre-wrap text-slate-700"
                >
                  {{ body || "(No message)" }}
                </div>
              </div>

              <!-- Info Box -->
              <div class="rounded-sm border-l-4 border-blue-600 bg-blue-50 p-3">
                <p class="text-xs text-blue-900">
                  <strong>Next:</strong> Click "Send via Email" to open your
                  email client. The email content will be pre-filled. After
                  sending, confirm so we can log this interaction.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4"
            >
              <button
                @click="handleSendClick"
                class="w-full rounded-xl bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white transition hover:from-blue-700 hover:to-blue-800"
              >
                📧 Send via Email Client
              </button>
              <button
                @click="handleClose"
                class="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Step 2: Confirmation -->
          <div v-if="step === 'confirmation'" class="flex flex-col">
            <!-- Header -->
            <div
              class="bg-linear-to-r from-brand-orange-600 to-brand-orange-700 px-6 py-6 text-white"
            >
              <h2 id="email-send-confirm-title" class="mb-1 text-xl font-bold">
                Confirm Email Sent
              </h2>
              <p class="text-sm text-brand-orange-100">
                Did you send the email from your email client?
              </p>
            </div>

            <!-- Content -->
            <div class="space-y-4 px-6 py-6">
              <div
                class="rounded-sm border-l-4 border-brand-orange-600 bg-brand-orange-50 p-4"
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
              class="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4"
            >
              <button
                @click="confirmAndClose"
                class="w-full rounded-xl bg-linear-to-r from-brand-emerald-600 to-brand-emerald-700 px-4 py-3 font-semibold text-white transition hover:from-brand-emerald-700 hover:to-brand-emerald-800"
              >
                ✓ Yes, Email Sent
              </button>
              <button
                @click="step = 'preview'"
                class="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
              <button
                @click="handleClose"
                class="w-full rounded-xl px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-100"
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
