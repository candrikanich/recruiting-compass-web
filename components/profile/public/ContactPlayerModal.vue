<!-- components/profile/public/ContactPlayerModal.vue -->
<!--
  Public-page "Contact Player" form. Unauthenticated coaches/visitors submit
  a lightweight lead through POST /api/public/profile/[slug]/contact — see
  that endpoint for the source-of-truth Zod schema this mirrors client-side.
  Two anti-abuse layers ride along silently: a hidden honeypot field (`hp`,
  never shown to a human) and an optional Cloudflare Turnstile widget that
  only mounts when a site key is configured, so the flow works unchanged
  before Turnstile is provisioned.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRuntimeConfig } from "#app";

interface ContactSchool {
  id: string;
  name: string;
}

const props = defineProps<{
  slug: string;
  playerName: string;
  schools?: ContactSchool[];
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

const schoolListId = "contact-player-schools";

const coachName = ref("");
const coachTitle = ref("");
const schoolName = ref("");
const coachEmail = ref("");
const note = ref("");
const hp = ref("");

const fieldErrors = ref<{
  coachName?: string;
  coachEmail?: string;
  note?: string;
}>({});
const submitError = ref("");
const submitting = ref(false);
const submitted = ref(false);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
  const errors: typeof fieldErrors.value = {};
  if (!coachName.value.trim()) {
    errors.coachName = "Your name is required.";
  }
  if (coachEmail.value.trim() && !EMAIL_RE.test(coachEmail.value.trim())) {
    errors.coachEmail = "Enter a valid email address.";
  }
  if (!note.value.trim()) {
    errors.note = "A short note is required.";
  }
  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

const matchedSchoolId = computed(() => {
  const typed = schoolName.value.trim();
  if (!typed || !props.schools?.length) return undefined;
  const match = props.schools.find(
    (school) => school.name.toLowerCase() === typed.toLowerCase(),
  );
  return match?.id;
});

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
        action: "contact",
        callback: (token: string) => {
          turnstileToken.value = token;
        },
      });
    }
  } catch {
    // Guarded above; nothing to do — submit still works without a token.
  }
});

onBeforeUnmount(() => {
  dialogRef.value?.close?.();
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
  return "Couldn't send your message. Please try again.";
}

async function handleSubmit() {
  submitError.value = "";
  if (!validate()) return;

  submitting.value = true;
  try {
    await $fetch(`/api/public/profile/${props.slug}/contact`, {
      method: "POST",
      body: {
        coachName: coachName.value.trim(),
        coachEmail: coachEmail.value.trim() || undefined,
        coachTitle: coachTitle.value.trim() || undefined,
        schoolId: matchedSchoolId.value,
        schoolName: schoolName.value.trim() || undefined,
        note: note.value.trim(),
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
    class="w-full max-w-lg rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black/50"
    aria-labelledby="contact-player-title"
    @cancel.prevent="handleClose"
  >
    <div
      class="flex items-center justify-between border-b border-brand-slate-200 px-6 py-4"
    >
      <h2
        id="contact-player-title"
        class="text-lg font-semibold text-brand-slate-900"
      >
        Contact {{ playerName }}
      </h2>
      <button
        type="button"
        data-test="modal-close"
        aria-label="Close"
        class="rounded-full p-1 text-brand-slate-400 hover:bg-brand-slate-100 hover:text-brand-slate-600"
        @click="handleClose"
      >
        &times;
      </button>
    </div>

    <div v-if="submitted" class="px-6 py-8 text-center">
      <p class="text-base font-medium text-brand-slate-900">Message sent.</p>
      <p class="mt-2 text-sm text-brand-slate-600">
        The player will be notified and can respond directly.
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

    <form
      v-else
      class="flex flex-col gap-4 px-6 py-5"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label
          class="mb-1 block text-sm font-medium text-brand-slate-700"
          for="contact-coach-name"
        >
          Your name
          <span aria-hidden="true" class="text-red-500">*</span>
        </label>
        <input
          id="contact-coach-name"
          data-test="coach-name"
          type="text"
          v-model="coachName"
          required
          class="w-full rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="
            fieldErrors.coachName ? 'border-red-500' : 'border-brand-slate-300'
          "
        />
        <p v-if="fieldErrors.coachName" class="mt-1 text-sm text-red-600">
          {{ fieldErrors.coachName }}
        </p>
      </div>

      <div>
        <label
          class="mb-1 block text-sm font-medium text-brand-slate-700"
          for="contact-coach-title"
        >
          Title
        </label>
        <input
          id="contact-coach-title"
          data-test="coach-title"
          type="text"
          v-model="coachTitle"
          placeholder="e.g. Head Coach"
          class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        />
      </div>

      <div>
        <label
          class="mb-1 block text-sm font-medium text-brand-slate-700"
          for="contact-school-name"
        >
          School
        </label>
        <input
          id="contact-school-name"
          data-test="school-name"
          type="text"
          v-model="schoolName"
          :list="schools?.length ? schoolListId : undefined"
          placeholder="Start typing your school"
          class="w-full rounded-xl border-2 border-brand-slate-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
        />
        <datalist v-if="schools?.length" :id="schoolListId">
          <option
            v-for="school in schools"
            :key="school.id"
            :value="school.name"
          />
        </datalist>
      </div>

      <div>
        <label
          class="mb-1 block text-sm font-medium text-brand-slate-700"
          for="contact-coach-email"
        >
          Email
        </label>
        <input
          id="contact-coach-email"
          data-test="coach-email"
          type="email"
          v-model="coachEmail"
          class="w-full rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="
            fieldErrors.coachEmail ? 'border-red-500' : 'border-brand-slate-300'
          "
        />
        <p v-if="fieldErrors.coachEmail" class="mt-1 text-sm text-red-600">
          {{ fieldErrors.coachEmail }}
        </p>
      </div>

      <div>
        <label
          class="mb-1 block text-sm font-medium text-brand-slate-700"
          for="contact-note"
        >
          Message
          <span aria-hidden="true" class="text-red-500">*</span>
        </label>
        <textarea
          id="contact-note"
          data-test="note"
          v-model="note"
          rows="4"
          required
          maxlength="2000"
          class="w-full resize-none rounded-xl border-2 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-blue-500"
          :class="
            fieldErrors.note ? 'border-red-500' : 'border-brand-slate-300'
          "
        />
        <p v-if="fieldErrors.note" class="mt-1 text-sm text-red-600">
          {{ fieldErrors.note }}
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

      <div
        v-if="turnstileEnabled"
        data-test="turnstile-widget"
        ref="turnstileEl"
      ></div>

      <p
        v-if="submitError"
        data-test="submit-error"
        role="alert"
        class="text-sm text-red-600"
      >
        {{ submitError }}
      </p>

      <div class="mt-2 flex justify-end gap-3">
        <DesignSystemButton
          type="button"
          variant="outline"
          color="slate"
          @click="handleClose"
        >
          Cancel
        </DesignSystemButton>
        <DesignSystemButton
          type="submit"
          variant="solid"
          color="blue"
          :disabled="submitting"
          :loading="submitting"
        >
          Send message
        </DesignSystemButton>
      </div>
    </form>
  </dialog>
</template>
