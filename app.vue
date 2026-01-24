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
import { useSessionTimeout } from "~/composables/useSessionTimeout";

const { isWarningVisible, secondsUntilLogout, dismissWarning, handleTimeout } =
  useSessionTimeout();
</script>
