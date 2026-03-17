<template>
  <div class="min-h-screen bg-slate-50 py-12 px-6">
    <div class="max-w-2xl mx-auto">
      <div class="mb-8">
        <NuxtLink
          to="/admin"
          class="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Admin
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 mb-2">
          Broadcast Notification
        </h1>
        <p class="text-slate-600">Send a notification to all users or a specific user.</p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <form @submit.prevent="submit" class="space-y-5">
          <!-- Target -->
          <div>
            <label for="target" class="block text-sm font-medium text-slate-700 mb-1">
              Target
            </label>
            <select
              id="target"
              v-model="form.target"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All users</option>
              <option value="user">Specific user</option>
            </select>
          </div>

          <!-- User ID (shown only when target = user) -->
          <div v-if="form.target === 'user'">
            <label for="user_id" class="block text-sm font-medium text-slate-700 mb-1">
              User ID (UUID)
            </label>
            <input
              id="user_id"
              v-model="form.user_id"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              :required="form.target === 'user'"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <!-- Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              id="type"
              v-model="form.type"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="follow_up_reminder">Follow-up reminder</option>
              <option value="deadline_alert">Deadline alert</option>
              <option value="weekly_digest">Weekly digest</option>
              <option value="event">Event</option>
            </select>
          </div>

          <!-- Title -->
          <div>
            <label for="title" class="block text-sm font-medium text-slate-700 mb-1">
              Title <span class="text-slate-400 font-normal">(max 200 chars)</span>
            </label>
            <input
              id="title"
              v-model="form.title"
              type="text"
              maxlength="200"
              placeholder="Notification title"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <!-- Message -->
          <div>
            <label for="message" class="block text-sm font-medium text-slate-700 mb-1">
              Message <span class="text-slate-400 font-normal">(optional, max 1000 chars)</span>
            </label>
            <textarea
              id="message"
              v-model="form.message"
              rows="4"
              maxlength="1000"
              placeholder="Optional notification body…"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          <!-- Status messages -->
          <div
            v-if="successMessage"
            class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
          >
            ✓ {{ successMessage }}
          </div>
          <div
            v-if="errorMessage"
            class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
          >
            ✗ {{ errorMessage }}
          </div>

          <!-- Submit -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="sending"
              class="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {{ sending ? "Sending…" : "Send broadcast" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";

definePageMeta({
  middleware: "admin",
});

type NotificationType =
  | "follow_up_reminder"
  | "deadline_alert"
  | "weekly_digest"
  | "event";

const { $fetchAuth } = useAuthFetch();

const form = ref({
  target: "all" as "all" | "user",
  user_id: "",
  type: "follow_up_reminder" as NotificationType,
  title: "",
  message: "",
});

const sending = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

async function submit() {
  successMessage.value = null;
  errorMessage.value = null;

  if (form.value.target === 'user' && !form.value.user_id.trim()) {
    errorMessage.value = 'A User ID is required when targeting a specific user.'
    return
  }

  sending.value = true;

  try {
    const body: Record<string, unknown> = {
      target: form.value.target,
      type: form.value.type,
      title: form.value.title,
    };

    if (form.value.target === "user" && form.value.user_id.trim()) {
      body.user_id = form.value.user_id.trim();
    }

    if (form.value.message.trim()) {
      body.message = form.value.message.trim();
    }

    const result = await $fetchAuth<{ success: true; sent: number }>(
      "/api/admin/notifications/broadcast",
      { method: "POST", body },
    );

    successMessage.value = `Sent to ${result.sent} user(s)`;
    form.value.title = "";
    form.value.message = "";
    form.value.user_id = "";
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "Failed to send broadcast";
  } finally {
    sending.value = false;
  }
}
</script>
