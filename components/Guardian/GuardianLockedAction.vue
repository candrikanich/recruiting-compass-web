<script setup lang="ts">
import { computed, ref } from "vue";
import { useGuardianStatus } from "~/composables/useGuardianStatus";
import { useAppToast } from "~/composables/useAppToast";

withDefaults(
  defineProps<{
    /** What the player is trying to do, e.g. "message coaches". */
    action?: string;
  }>(),
  { action: "do this" },
);

const {
  guardianEmailMasked: guardianEmailMaskedFromComposable,
  hasNoGuardianYet: hasNoGuardianYetFromComposable,
  resend,
} = useGuardianStatus();
const { showToast } = useAppToast();
const sending = ref(false);
const newEmail = ref("");

// Wrapped locally (rather than bound straight to the composable's refs) so the
// template unwraps correctly no matter what shape a caller's mock returns — the
// predicate logic itself lives only in useGuardianStatus, not re-derived here.
const guardianEmailMasked = computed(
  () => guardianEmailMaskedFromComposable.value,
);
const hasNoGuardianYet = computed(() => hasNoGuardianYetFromComposable.value);

// Mirrors GuardianPendingBanner's "no guardian named yet" branch: a player who
// skipped naming a guardian at signup has no pending claim for "Remind them" to
// resend, so resend()'s create-branch needs an email from them instead.
const invite = async () => {
  if (sending.value || !newEmail.value.trim()) return;
  sending.value = true;
  try {
    await resend(newEmail.value.trim());
    showToast("Invitation sent.", "success");
    newEmail.value = "";
  } catch (err) {
    showToast(
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ?? "Couldn't send that invitation.",
      "error",
    );
  } finally {
    sending.value = false;
  }
};

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

    <div v-if="hasNoGuardianYet" class="flex shrink-0 gap-2">
      <label for="guardian-locked-action-email" class="sr-only">
        Parent or guardian email
      </label>
      <input
        id="guardian-locked-action-email"
        v-model="newEmail"
        data-testid="guardian-locked-invite-email"
        type="email"
        placeholder="parent.email@example.com"
        class="min-w-0 flex-1 rounded-lg border border-amber-300 px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        data-testid="guardian-locked-invite-submit"
        :disabled="sending || !newEmail.trim()"
        class="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 disabled:opacity-60"
        @click="invite"
      >
        {{ sending ? "Sending…" : "Invite" }}
      </button>
    </div>
    <button
      v-else
      type="button"
      :disabled="sending"
      class="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 disabled:opacity-60"
      @click="remind"
    >
      {{ sending ? "Sending…" : "Remind them" }}
    </button>
  </div>
</template>
