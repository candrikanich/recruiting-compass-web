<template>
  <div class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100">
    <PageHeader title="About" description="Our mission and how to reach us" />

    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <!-- Mission Statement -->
      <section>
        <p class="text-lg text-slate-700 leading-relaxed">
          The Recruiting Compass helps high school student athletes and their families manage the
          college recruiting journey — tracking schools, coaches, interactions, and timelines in one
          place. We believe every athlete deserves clarity, control, and a fair shot. No professional
          service required.
        </p>
      </section>

      <!-- Feedback Form -->
      <section>
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Send Us a Message</h2>

        <form class="space-y-4" @submit.prevent="submitFeedback">
          <div>
            <label for="subject" class="block text-sm font-medium text-slate-700 mb-1">
              Subject
            </label>
            <select
              id="subject"
              v-model="form.subject"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>Select a category</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="question">Question</option>
              <option value="general">General Feedback</option>
            </select>
          </div>

          <div>
            <label for="message" class="block text-sm font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              v-model="form.message"
              rows="6"
              maxlength="5000"
              placeholder="Tell us what's on your mind..."
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              required
            />
            <p class="text-xs text-slate-400 mt-1 text-right">
              {{ form.message.length }} / 5000
            </p>
          </div>

          <div v-if="errorMessage" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <div v-if="submitted" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p class="text-sm text-green-700">Thanks for your message — we'll be in touch soon.</p>
          </div>

          <UButton
            type="submit"
            :loading="loading"
            :disabled="loading || submitted"
            color="primary"
          >
            Send Message
          </UButton>
        </form>
      </section>

      <!-- Fallback contact -->
      <section>
        <p class="text-sm text-slate-500">
          You can also reach us directly at
          <a
            href="mailto:info@therecruitingcompass.com"
            class="text-blue-600 hover:underline"
          >info@therecruitingcompass.com</a>.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue"
import { useAuthFetch } from "~/composables/useAuthFetch"

definePageMeta({
  middleware: "auth",
})

const { $fetchAuth } = useAuthFetch()

const form = reactive({ subject: "", message: "" })
const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref("")

async function submitFeedback() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ""

  try {
    await $fetchAuth("/api/feedback", {
      method: "POST",
      body: { subject: form.subject, message: form.message },
    })
    submitted.value = true
    form.subject = ""
    form.message = ""
    setTimeout(() => (submitted.value = false), 5000)
  } catch {
    errorMessage.value = "Something went wrong. Please try again or email us directly."
  } finally {
    loading.value = false
  }
}
</script>
