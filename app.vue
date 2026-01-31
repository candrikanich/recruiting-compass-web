<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <DesignSystemToast />
    <FeedbackButton />
    <SessionTimeoutWarning
      :visible="isWarningVisible"
      :seconds-remaining="secondsUntilLogout"
      @stay-logged-in="dismissWarning"
      @logout-now="handleTimeout"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, provide } from "vue";
import { useSessionTimeout } from "~/composables/useSessionTimeout";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "~/composables/useActiveFamily";
import SessionTimeoutWarning from "~/components/Auth/SessionTimeoutWarning.vue";

const { isWarningVisible, secondsUntilLogout, dismissWarning, handleTimeout } =
  useSessionTimeout();

const userStore = useUserStore();

// Provide family context to all pages and composables
const activeFamily = useActiveFamily();
provide("activeFamily", activeFamily);

// Single point of user initialization at app startup
// This prevents race conditions from multiple initialization attempts
let initializePromise: Promise<void> | null = null;

onBeforeMount(async () => {
  if (!initializePromise) {
    console.debug("[App] Starting user initialization");
    initializePromise = (async () => {
      try {
        await userStore.initializeUser();
        console.debug("[App] User initialization complete");
      } catch (err) {
        console.error("[App] Failed to initialize user:", err);
      }
    })();
  }

  // Wait for initialization to complete
  await initializePromise;
});
</script>
