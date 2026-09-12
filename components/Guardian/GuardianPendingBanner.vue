<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useGuardianStatus } from "~/composables/useGuardianStatus";
import { useAppToast } from "~/composables/useAppToast";

const { isPending, guardianEmailMasked, load, resend } = useGuardianStatus();
const { showToast } = useAppToast();

const sending = ref(false);
const editing = ref(false);
const newEmail = ref("");

onMounted(load);

const submit = async (email?: string) => {
  if (sending.value) return;
  sending.value = true;
  try {
    await resend(email);
    showToast(
      email ? "Sent to the new address." : "Reminder sent.",
      "success",
    );
    editing.value = false;
    newEmail.value = "";
  } catch (err) {
    showToast(
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ?? "Couldn't send that email.",
      "error",
    );
  } finally {
    sending.value = false;
  }
};
</script>

<template>
  <!-- Not dismissible: it is the only explanation for why parts of the app are disabled. -->
  <section
    v-if="isPending"
    class="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4"
    aria-labelledby="guardian-pending-title"
  >
    <h2
      id="guardian-pending-title"
      class="flex items-center gap-2 font-semibold text-amber-900"
    >
      <UIcon
        name="i-heroicons-clock"
        class="h-5 w-5"
        aria-hidden="true"
      />
      Waiting on your parent or guardian
    </h2>
    <p class="mt-1 text-sm text-amber-800">
      <template v-if="guardianEmailMasked">
        We emailed {{ guardianEmailMasked }} a link to confirm your account.
      </template>
      <template v-else> We emailed your guardian a confirmation link. </template>
      You can build your school list and track deadlines now — messaging coaches
      and sharing your profile unlock once they confirm.
    </p>

    <div v-if="!editing" class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="sending"
        class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        @click="submit()"
      >
        {{ sending ? "Sending…" : "Resend email" }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900"
        @click="editing = true"
      >
        Use a different email
      </button>
    </div>

    <form v-else class="mt-3 flex flex-wrap gap-2" @submit.prevent="submit(newEmail)">
      <label for="guardian-new-email" class="sr-only">
        Parent or guardian email
      </label>
      <input
        id="guardian-new-email"
        v-model="newEmail"
        type="email"
        required
        placeholder="parent.email@example.com"
        class="min-w-0 flex-1 rounded-lg border border-amber-300 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        :disabled="sending"
        class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {{ sending ? "Sending…" : "Send" }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900"
        @click="editing = false"
      >
        Cancel
      </button>
    </form>
  </section>
</template>
