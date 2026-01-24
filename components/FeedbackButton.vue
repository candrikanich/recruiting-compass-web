<template>
  <div>
    <!-- Floating Feedback Button -->
    <button
      @click="isOpen = true"
      class="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center z-40 bg-blue-600"
      title="Send feedback"
      aria-label="Send feedback"
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
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
    </button>

    <!-- Feedback Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isOpen"
          class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          @click="closeModal"
        >
          <!-- Modal Content -->
          <div
            class="rounded-lg shadow-xl max-w-md w-full bg-white"
            @click.stop
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between p-6 border-b border-slate-200"
            >
              <h2 class="text-xl font-bold text-slate-900">Send Feedback</h2>
              <button
                @click="closeModal"
                class="transition text-slate-600 hover:text-slate-900"
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

            <!-- Form -->
            <form @submit.prevent="submitFeedback" class="p-6 space-y-4">
              <!-- Name -->
              <div>
                <label class="block text-sm font-medium mb-1 text-slate-600">
                  Name
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  placeholder="Your name"
                />
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-medium mb-1 text-slate-600">
                  Email
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  placeholder="your@email.com"
                />
              </div>

              <!-- Feedback Type -->
              <div>
                <label class="block text-sm font-medium mb-1 text-slate-600">
                  Feedback Type
                </label>
                <select
                  v-model="form.feedbackType"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                >
                  <option value="">Select a type</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other Feedback</option>
                </select>
              </div>

              <!-- Page -->
              <div>
                <label class="block text-sm font-medium mb-1 text-slate-600">
                  Page / Feature (Optional)
                </label>
                <input
                  v-model="form.page"
                  type="text"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  placeholder="e.g., Schools List, School Detail, Dashboard"
                />
              </div>

              <!-- Message -->
              <div>
                <label class="block text-sm font-medium mb-1 text-slate-600">
                  Message
                </label>
                <textarea
                  v-model="form.message"
                  required
                  rows="4"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 resize-none"
                  placeholder="Tell me what you think..."
                />
              </div>

              <!-- Error Message -->
              <div
                v-if="error"
                class="p-3 rounded-lg text-sm bg-red-50 border border-red-300 text-red-700"
              >
                {{ error }}
              </div>

              <!-- Success Message -->
              <div
                v-if="success"
                class="p-3 rounded-lg text-sm flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700"
              >
                <CheckIcon class="w-4 h-4" />
                <span>Thank you for your feedback!</span>
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="flex-1 px-4 py-2 rounded-lg transition font-medium border border-slate-300 text-slate-900 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 rounded-lg transition font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ loading ? "Sending..." : "Send" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { CheckIcon } from "@heroicons/vue/24/solid";

const isOpen = ref(false);
const loading = ref(false);
const error = ref("");
const success = ref(false);

const form = reactive({
  name: "",
  email: "",
  feedbackType: "",
  page: "",
  message: "",
});

const closeModal = () => {
  isOpen.value = false;
  // Reset form after modal closes
  setTimeout(() => {
    form.name = "";
    form.email = "";
    form.feedbackType = "";
    form.page = "";
    form.message = "";
    error.value = "";
    success.value = false;
  }, 300);
};

const submitFeedback = async () => {
  error.value = "";
  success.value = false;
  loading.value = true;

  try {
    const response = await $fetch("/api/feedback", {
      method: "POST",
      body: {
        name: form.name,
        email: form.email,
        feedbackType: form.feedbackType,
        page: form.page,
        message: form.message,
      },
    });

    if (response.success) {
      success.value = true;
      // Close modal after 2 seconds
      setTimeout(() => {
        closeModal();
      }, 2000);
    }
  } catch (err: any) {
    error.value =
      err.data?.message || "Failed to send feedback. Please try again.";
    console.error("Feedback submission error:", err);
  } finally {
    loading.value = false;
  }
};
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
