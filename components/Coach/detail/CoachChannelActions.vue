<script setup lang="ts">
import { toSmsHref, toTelHref } from "~/utils/phone";
import { openTwitter, openInstagram } from "~/utils/socialMediaHandlers";
import type { Coach } from "~/types/models";

const props = defineProps<{ coach: Coach }>();
const emit = defineEmits<{
  logInteraction: [];
  openSocial: [platform: "twitter" | "instagram"];
}>();

function onEmail(): void {
  if (props.coach.email) {
    window.location.href = `mailto:${props.coach.email}`;
  }
}

function onText(): void {
  if (props.coach.phone) {
    window.location.href = toSmsHref(props.coach.phone);
  }
}

function onCall(): void {
  if (props.coach.phone) {
    window.location.href = toTelHref(props.coach.phone);
  }
}

function onTwitter(): void {
  openTwitter(props.coach.twitter_handle);
  emit("openSocial", "twitter");
}

function onInstagram(): void {
  openInstagram(props.coach.instagram_handle);
  emit("openSocial", "instagram");
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-if="coach.email"
        type="button"
        data-action="email"
        :aria-label="`Email ${coach.first_name} ${coach.last_name}`"
        class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-brand-blue-600 transition hover:bg-brand-blue-50"
        @click="onEmail"
      >
        <UIcon name="i-heroicons-envelope" class="h-4 w-4" aria-hidden="true" />
        Email
      </button>
      <button
        v-if="coach.phone"
        type="button"
        data-action="text"
        :aria-label="`Text ${coach.first_name} ${coach.last_name}`"
        class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-brand-emerald-600 transition hover:bg-brand-emerald-50"
        @click="onText"
      >
        <UIcon name="i-heroicons-chat-bubble-left" class="h-4 w-4" aria-hidden="true" />
        Text
      </button>
      <button
        v-if="coach.phone"
        type="button"
        data-action="call"
        :aria-label="`Call ${coach.first_name} ${coach.last_name}`"
        class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-brand-purple-600 transition hover:bg-brand-purple-50"
        @click="onCall"
      >
        <UIcon name="i-heroicons-phone" class="h-4 w-4" aria-hidden="true" />
        Call
      </button>
      <button
        v-if="coach.twitter_handle"
        type="button"
        data-action="twitter"
        :aria-label="`View ${coach.first_name} ${coach.last_name} on X`"
        class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-brand-slate-700 transition hover:bg-brand-slate-100"
        @click="onTwitter"
      >
        <UIcon name="i-heroicons-at-symbol" class="h-4 w-4" aria-hidden="true" />
        Twitter
      </button>
      <button
        v-if="coach.instagram_handle"
        type="button"
        data-action="instagram"
        :aria-label="`View ${coach.first_name} ${coach.last_name} on Instagram`"
        class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-brand-pink-500 transition hover:bg-brand-pink-50"
        @click="onInstagram"
      >
        <UIcon name="i-heroicons-camera" class="h-4 w-4" aria-hidden="true" />
        Instagram
      </button>
    </div>

    <button
      type="button"
      data-action="log-interaction"
      class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-700"
      @click="emit('logInteraction')"
    >
      <UIcon name="i-heroicons-clipboard-document-check" class="h-4 w-4" aria-hidden="true" />
      Log Interaction
    </button>
  </section>
</template>
