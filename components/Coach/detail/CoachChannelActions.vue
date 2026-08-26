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

const buttonClass =
  "flex items-center justify-center gap-2 rounded-lg px-[14px] py-[10px] text-[13px] font-semibold text-white transition hover:opacity-90";
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4">
    <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
      Direct Channels
    </h3>
    <div class="grid grid-cols-2 gap-[10px]">
      <button
        v-if="coach.email"
        type="button"
        data-action="email"
        :aria-label="`Email ${coach.first_name} ${coach.last_name}`"
        :class="[buttonClass, 'bg-blue-500']"
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
        :class="[buttonClass, 'bg-emerald-500']"
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
        :class="[buttonClass, 'bg-orange-500']"
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
        :class="[buttonClass, 'bg-sky-500']"
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
        :class="[buttonClass, 'bg-fuchsia-500']"
        @click="onInstagram"
      >
        <UIcon name="i-heroicons-camera" class="h-4 w-4" aria-hidden="true" />
        Instagram
      </button>
      <button
        type="button"
        data-action="log-interaction"
        :class="[buttonClass, 'bg-slate-700']"
        @click="emit('logInteraction')"
      >
        <UIcon name="i-heroicons-plus" class="h-4 w-4" aria-hidden="true" />
        Log Interaction
      </button>
    </div>
  </section>
</template>
