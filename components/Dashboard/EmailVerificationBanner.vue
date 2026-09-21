<template>
  <DesignSystemAlert
    v-if="visible"
    data-testid="verify-email-banner"
    variant="warning"
    title="Please verify your email address"
    dismissible
    class="mb-6"
    @dismiss="dismiss"
  >
    <p>
      Check your inbox for a verification link — some features may be limited
      until it's confirmed.
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        data-testid="resend-verification"
        class="font-semibold underline underline-offset-2 disabled:opacity-60"
        :disabled="emailVerification.loading.value"
        @click="handleResend"
      >
        {{ emailVerification.loading.value ? "Sending…" : "Resend email" }}
      </button>
      <span v-if="sent" class="text-sm">Sent!</span>
      <span v-else-if="emailVerification.error.value" class="text-sm">
        {{ emailVerification.error.value }}
      </span>
    </div>
  </DesignSystemAlert>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useEmailVerification } from "~/composables/useEmailVerification";

const userStore = useUserStore();
const emailVerification = useEmailVerification();

const sent = ref(false);

const ackKey = () => `email_verify_ack_${userStore.user?.id}`;
const acknowledged = ref(
  typeof window !== "undefined" ? !!sessionStorage.getItem(ackKey()) : false,
);

const visible = computed(
  () =>
    userStore.isAuthenticated &&
    !userStore.emailVerified &&
    !acknowledged.value,
);

onMounted(() => {
  userStore.refreshVerificationStatus();
});

async function handleResend() {
  sent.value = false;
  const success = await emailVerification.resendVerificationEmail();
  sent.value = success;
}

function dismiss() {
  sessionStorage.setItem(ackKey(), "true");
  acknowledged.value = true;
}
</script>
