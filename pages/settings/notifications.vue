<template>
  <div class="max-w-2xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold mb-2">Notification Preferences</h1>
    <p class="text-gray-500 mb-8">
      Control which notifications you receive and how.
    </p>

    <div v-if="loading" class="text-gray-400">Loading preferences...</div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>
    <div v-else class="space-y-4">
      <div
        v-for="type in NOTIFICATION_TYPES"
        :key="type.value"
        class="p-4 bg-white rounded-lg border border-gray-200 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">{{ type.label }}</p>
            <p class="text-sm text-gray-500">{{ type.description }}</p>
          </div>
          <button
            role="switch"
            :aria-checked="pushPrefs[type.value]"
            :aria-label="`Push notifications for ${type.label}`"
            @click="togglePush(type.value)"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            :class="pushPrefs[type.value] ? 'bg-blue-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="pushPrefs[type.value] ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <!-- Email toggle only for deadline_alert and weekly_digest -->
        <div
          v-if="EMAIL_TYPES.has(type.value)"
          class="flex items-center justify-between pt-2 border-t border-gray-100"
        >
          <p class="text-sm text-gray-600">Also send email</p>
          <button
            role="switch"
            :aria-checked="emailPrefs[type.value]"
            :aria-label="`Email notifications for ${type.label}`"
            @click="toggleEmail(type.value)"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            :class="emailPrefs[type.value] ? 'bg-blue-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              :class="
                emailPrefs[type.value] ? 'translate-x-5' : 'translate-x-1'
              "
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";

const NOTIFICATION_TYPES = [
  {
    value: "follow_up_reminder",
    label: "Follow-up Reminders",
    description: "When it's time to contact a coach",
  },
  {
    value: "deadline_alert",
    label: "Deadline Alerts",
    description:
      "Application, offer, and NCAA deadlines — 7, 3, and 0 days out",
  },
  {
    value: "weekly_digest",
    label: "Weekly Digest",
    description: "Monday morning recruiting summary",
  },
  {
    value: "event",
    label: "Event Reminders",
    description: "24 hours before visits and showcases",
  },
] as const;

const EMAIL_TYPES = new Set(["deadline_alert", "weekly_digest"]);

type NotificationPrefRow = {
  notification_type: string;
  push_enabled: boolean;
  email_enabled: boolean | null;
};

// notification_preferences is not yet in the generated database types — cast to any
const db = useSupabase() as any;
const userStore = useUserStore();
const loading = ref(true);
const error = ref<string | null>(null);
const pushPrefs = ref<Record<string, boolean>>({});
const emailPrefs = ref<Record<string, boolean>>({});

definePageMeta({ middleware: "auth" });

onMounted(async () => {
  if (!userStore.user) return;
  try {
    const userId = userStore.user.id;

    const { data } = (await db
      .from("notification_preferences")
      .select("notification_type, push_enabled, email_enabled")
      .eq("user_id", userId)) as { data: NotificationPrefRow[] | null };

    // Defaults: all push on, email on for applicable types
    const pushMap: Record<string, boolean> = {};
    const emailMap: Record<string, boolean> = {};
    for (const t of NOTIFICATION_TYPES) {
      pushMap[t.value] = true;
      if (EMAIL_TYPES.has(t.value)) emailMap[t.value] = true;
    }

    // Apply saved preferences
    for (const row of data ?? []) {
      pushMap[row.notification_type] = row.push_enabled;
      if (EMAIL_TYPES.has(row.notification_type)) {
        emailMap[row.notification_type] = row.email_enabled ?? true;
      }
    }

    pushPrefs.value = pushMap;
    emailPrefs.value = emailMap;
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Failed to load notification preferences";
  } finally {
    loading.value = false;
  }
});

async function togglePush(type: string) {
  const originalValue = pushPrefs.value[type];
  pushPrefs.value[type] = !pushPrefs.value[type];

  try {
    await db
      .from("notification_preferences")
      .upsert(
        {
          user_id: userStore.user!.id,
          notification_type: type,
          push_enabled: pushPrefs.value[type],
        },
        { onConflict: "user_id,notification_type" },
      );
  } catch (err) {
    // Revert on failure
    pushPrefs.value[type] = originalValue;
    console.error("Failed to update push notification preference:", err);
  }
}

async function toggleEmail(type: string) {
  const originalValue = emailPrefs.value[type];
  emailPrefs.value[type] = !emailPrefs.value[type];

  try {
    await db
      .from("notification_preferences")
      .upsert(
        {
          user_id: userStore.user!.id,
          notification_type: type,
          email_enabled: emailPrefs.value[type],
        },
        { onConflict: "user_id,notification_type" },
      );
  } catch (err) {
    // Revert on failure
    emailPrefs.value[type] = originalValue;
    console.error("Failed to update email notification preference:", err);
  }
}
</script>
