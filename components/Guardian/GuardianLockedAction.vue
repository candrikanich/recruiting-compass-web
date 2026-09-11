<script setup lang="ts">
import { ref } from "vue";
import { useGuardianStatus } from "~/composables/useGuardianStatus";
import { useAppToast } from "~/composables/useAppToast";

withDefaults(
  defineProps<{
    /** What the player is trying to do, e.g. "message coaches". */
    action?: string;
  }>(),
  { action: "do this" },
);

const { guardianEmailMasked, resend } = useGuardianStatus();
const { showToast } = useAppToast();
const sending = ref(false);

const remind = async () => {
  if (sending.value) return;
  sending.value = true;
  try {
    await resend();
    showToast("Reminder sent to your parent or guardian.", "success");
  } catch (err) {
    showToast(
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ?? "Couldn't send that reminder.",
      "error",
    );
  } finally {
    sending.value = false;
  }
};
</script>

<template>
  <!-- Never a dead end: every locked surface offers the one action that unlocks it. -->
  <div
    class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="flex items-start gap-2 text-amber-900">
      <UIcon
        name="i-heroicons-lock-closed"
        class="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span>
        Your parent or guardian needs to confirm your account before you can
        {{ action }}.
        <span v-if="guardianEmailMasked" class="text-amber-800">
          We emailed {{ guardianEmailMasked }}.
        </span>
      </span>
    </p>
    <button
      type="button"
      :disabled="sending"
      class="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 disabled:opacity-60"
      @click="remind"
    >
      {{ sending ? "Sending…" : "Remind them" }}
    </button>
  </div>
</template>
