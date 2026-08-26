<!-- components/profile/public/ExpressInterestPopover.vue -->
<!--
  Public-page "Express Interest" popover — the one-tap sibling of
  Contact Player. Submits POST /api/public/profile/[slug]/interest — see
  that endpoint for the source-of-truth Zod schema this mirrors client-side.
  Same anti-abuse layers as ContactPlayerModal: a hidden honeypot field
  (`hp`) and an optional Turnstile widget (action: "interest", vs
  ContactPlayerModal's "contact") that only mounts when a site key is
  configured, so the flow works unchanged before Turnstile is provisioned.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRuntimeConfig } from "#app";

const props = defineProps<{
  slug: string;
  playerName: string;
  programs?: string[];
}>();

const emit = defineEmits<{
  close: [];
  submitted: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

onMounted(async () => {
  await nextTick();
  dialogRef.value?.showModal?.();
});

onBeforeUnmount(() => {
  dialogRef.value?.close?.();
});

const program = ref("");
const note = ref("");
const coachName = ref("");
const coachEmail = ref("");
const hp = ref("");

const hasProgramOptions = computed(() => !!props.programs?.length);

const fieldErrors = ref<{ program?: string; coachEmail?: string; note?: string }>({});
const submitError = ref("");
const submitting = ref(false);
const submitted = ref(false);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
  const errors: typeof fieldErrors.value = {};
  const trimmedProgram = program.value.trim();
  if (!trimmedProgram) {
    errors.program = "Please select or enter a program.";
  } else if (trimmedProgram.length > 80) {
    errors.program = "Keep the program under 80 characters.";
  }
  if (note.value.trim().length > 1000) {
    errors.note = "Keep the note under 1000 characters.";
  }
  if (coachEmail.value.trim() && !EMAIL_RE.test(coachEmail.value.trim())) {
    errors.coachEmail = "Enter a valid email address.";
  }
  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

// --- Turnstile (optional, flag-gated) -------------------------------------
const runtimeConfig = useRuntimeConfig();
const turnstileSiteKey = computed(
  () => runtimeConfig.public?.turnstileSiteKey ?? "",
);
const turnstileEnabled = computed(() => turnstileSiteKey.value.length > 0);
const turnstileToken = ref<string | undefined>(undefined);
const turnstileEl = ref<HTMLDivElement | null>(null);
const turnstileWidgetId = ref<string | undefined>(undefined);

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileGlobal = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as unknown as { turnstile?: TurnstileGlobal };
    if (w.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    // Never crash the form: a blocked/failed script just means the widget
    // never renders and the server no-ops verification when the flag is off.
    script.addEventListener("error", () => resolve());
    if (!existing) {
      try {
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      } catch {
        resolve();
      }
    }
  });
}

onMounted(async () => {
  if (!turnstileEnabled.value) return;
  try {
    await loadTurnstileScript();
    const w = window as unknown as { turnstile?: TurnstileGlobal };
    if (w.turnstile && turnstileEl.value) {
      turnstileWidgetId.value = w.turnstile.render(turnstileEl.value, {
        sitekey: turnstileSiteKey.value,
        action: "interest",
        callback: (token: string) => {
          turnstileToken.value = token;
        },
      });
    }
  } catch {
    // Guarded above; nothing to do — submit still works without a token.
  }
});
// ---------------------------------------------------------------------------

function friendlyErrorMessage(err: unknown): string {
  const statusCode =
    err && typeof err === "object" && "statusCode" in err
      ? (err as { statusCode?: number }).statusCode
      : undefined;
  if (statusCode === 429) {
    return "You've sent a few already — try again shortly.";
  }
  return "Couldn't send your interest. Please try again.";
}

async function handleSubmit() {
  submitError.value = "";
  if (!validate()) return;

  submitting.value = true;
  try {
    await $fetch(`/api/public/profile/${props.slug}/interest`, {
      method: "POST",
      body: {
        program: program.value.trim(),
        note: note.value.trim() || undefined,
        coachName: coachName.value.trim() || undefined,
        coachEmail: coachEmail.value.trim() || undefined,
        turnstileToken: turnstileToken.value,
        hp: hp.value,
      },
    });
    submitted.value = true;
    emit("submitted");
  } catch (err) {
    submitError.value = friendlyErrorMessage(err);
    resetTurnstile();
  } finally {
    submitting.value = false;
  }
}

// A Turnstile token is single-use — Cloudflare redeems it at siteverify, so
// replaying the same token after a failed submit always fails. Resetting
// the widget mints a fresh token for the retry instead of 403-looping.
function resetTurnstile() {
  const w = window as unknown as { turnstile?: TurnstileGlobal };
  if (w.turnstile) {
    w.turnstile.reset(turnstileWidgetId.value);
  }
  turnstileToken.value = undefined;
}

function handleClose() {
  emit("close");
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="w-full max-w-sm rounded-xl border-2 border-brand-slate-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
    aria-labelledby="express-interest-title"
    @cancel.prevent="handleClose"
  >
    <div class="flex items-center justify-between border-b border-brand-slate-200 px-5 py-3">
      <h2 id="express-interest-title" class="text-base font-semibold text-brand-slate-900">
        Express interest in {{ playerName }}
      </h2>
      <button
        type="button"
        data-test="popover-close"
        aria-label="Close"
        class="rounded-full p-1 text-brand-slate-400 hover:bg-brand-slate-100 hover:text-brand-slate-600"
        @click="handleClose"
      >
        &times;
      </button>
    </div>

    <div v-if="submitted" class="px-5 py-6 text-center">
      <p class="text-base font-medium text-brand-slate-900">
        Interest sent.
      </p>
      <p class="mt-2 text-sm text-brand-slate-600">
        The player has been notified of your interest.
      </p>
      <DesignSystemButton
        class="mt-6"
        color="blue"
        variant="solid"
        @click="handleClose"
      >
        Close
      </DesignSystemButton>
    </div>

    <form v-else class="flex flex-col gap-4 px-5 py-4" @submit.prevent="handleSubmit">
      <div>
        <label class="mb-1 block text-sm font-medium text-brand-slate-700" for="interest-program">
          Program
          <span aria-hidden="true" class="text-red-500">*</span>
        </label>
        <select
          v-if="hasProgramOptions"
          id="interest-program"
          data-test="program-select"
          v-model="program"
          required
          class="w-full rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="fieldErrors.program ? 'border-red-500' : 'border-brand-slate-300'"
        >
          <option value="" disabled>Select a program</option>
          <option v-for="p in programs" :key="p" :value="p">{{ p }}</option>
        </select>
        <input
          v-else
          id="interest-program"
          data-test="program-input"
          type="text"
          v-model="program"
          required
          maxlength="80"
          placeholder="e.g. Baseball - SS"
          class="w-full rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="fieldErrors.program ? 'border-red-500' : 'border-brand-slate-300'"
        />
        <p v-if="fieldErrors.program" class="mt-1 text-sm text-red-600">
          {{ fieldErrors.program }}
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-brand-slate-700" for="interest-note">
          Note (optional)
        </label>
        <textarea
          id="interest-note"
          data-test="note"
          v-model="note"
          rows="3"
          maxlength="1000"
          class="w-full resize-none rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="fieldErrors.note ? 'border-red-500' : 'border-brand-slate-300'"
        />
        <p v-if="fieldErrors.note" class="mt-1 text-sm text-red-600">
          {{ fieldErrors.note }}
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-brand-slate-700" for="interest-coach-name">
          Your name (optional)
        </label>
        <input
          id="interest-coach-name"
          data-test="coach-name"
          type="text"
          v-model="coachName"
          maxlength="120"
          class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-brand-slate-700" for="interest-coach-email">
          Your email (optional)
        </label>
        <input
          id="interest-coach-email"
          data-test="coach-email"
          type="email"
          v-model="coachEmail"
          class="w-full rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="fieldErrors.coachEmail ? 'border-red-500' : 'border-brand-slate-300'"
        />
        <p v-if="fieldErrors.coachEmail" class="mt-1 text-sm text-red-600">
          {{ fieldErrors.coachEmail }}
        </p>
      </div>

      <!-- Honeypot: never shown to a human. A filled value silently no-ops
           the submission server-side. -->
      <input
        type="text"
        name="hp"
        v-model="hp"
        autocomplete="off"
        tabindex="-1"
        aria-hidden="true"
        class="absolute h-px w-px overflow-hidden opacity-0"
        style="clip: rect(0, 0, 0, 0)"
      />

      <div v-if="turnstileEnabled" data-test="turnstile-widget" ref="turnstileEl"></div>

      <p v-if="submitError" data-test="submit-error" role="alert" class="text-sm text-red-600">
        {{ submitError }}
      </p>

      <div class="mt-1 flex justify-end gap-3">
        <DesignSystemButton type="button" variant="outline" color="slate" @click="handleClose">
          Cancel
        </DesignSystemButton>
        <DesignSystemButton type="submit" variant="solid" color="blue" :disabled="submitting" :loading="submitting">
          Express interest
        </DesignSystemButton>
      </div>
    </form>
  </dialog>
</template>
