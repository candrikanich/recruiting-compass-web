<template>
  <div>
    <!-- Service Unavailable Error Page (highest priority) -->
    <ServiceUnavailable v-if="isServiceUnavailable" />

    <!-- Normal app content (hidden when service is unavailable) -->
    <template v-else>
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
      <SpeedInsights v-if="isVercel" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, provide } from "vue";
import { useSessionTimeout } from "~/composables/useSessionTimeout";
import { useUserStore } from "~/stores/user";
import { useFamilyContext } from "~/composables/useFamilyContext";
import SessionTimeoutWarning from "~/components/Auth/SessionTimeoutWarning.vue";
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { createClientLogger } from "~/utils/logger";
const logger = createClientLogger("app");
const { public: publicConfig } = useRuntimeConfig();
const isVercel = publicConfig.isVercel;

const { isAdminHost } = useAppHost();
if (isAdminHost) {
  useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
}

// Service status for error page
const { isServiceUnavailable } = useServiceStatus();

const { isWarningVisible, secondsUntilLogout, dismissWarning, handleTimeout } =
  useSessionTimeout();

const userStore = useUserStore();

// Provide family context to all pages and composables. Using the shared
// singleton (rather than a fresh useActiveFamily() call) means app.vue's
// provided instance and the module-scope fallback used by non-component
// callers (e.g. Pinia store actions) are always the exact same object — one
// source of truth, and one thing for the auth lifecycle orchestrator to
// reset on logout.
const activeFamily = useFamilyContext();
provide("activeFamily", activeFamily);

// Single point of user initialization at app startup
// This prevents race conditions from multiple initialization attempts
let initializePromise: Promise<void> | null = null;

onBeforeMount(async () => {
  if (!initializePromise) {
    logger.debug("Starting user initialization");
    initializePromise = (async () => {
      try {
        await userStore.initializeUser();
        logger.debug("User initialization complete");
      } catch (err) {
        logger.error("Failed to initialize user", err);
      }
    })();
  }

  // Wait for initialization to complete
  await initializePromise;
});
</script>
