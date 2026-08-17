<template>
  <div class="mt-3 flex items-center gap-1">
    <!-- Email -->
    <button
      v-if="coach.email"
      data-action="email"
      type="button"
      :aria-label="`Email ${name}`"
      class="rounded-lg p-2 text-brand-blue-600 transition hover:bg-brand-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500"
      @click.stop.prevent="onEmail"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon name="i-heroicons-envelope" class="h-5 w-5" aria-hidden="true" />
    </button>

    <!-- Text (SMS) -->
    <button
      v-if="coach.phone"
      data-action="text"
      type="button"
      :aria-label="`Text ${name}`"
      class="rounded-lg p-2 text-brand-emerald-600 transition hover:bg-brand-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald-500"
      @click.stop.prevent="onText"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon
        name="i-heroicons-chat-bubble-left"
        class="h-5 w-5"
        aria-hidden="true"
      />
    </button>

    <!-- Call -->
    <button
      v-if="coach.phone"
      data-action="call"
      type="button"
      :aria-label="`Call ${name}`"
      class="rounded-lg p-2 text-brand-purple-600 transition hover:bg-brand-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-500"
      @click.stop.prevent="onCall"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon name="i-heroicons-phone" class="h-5 w-5" aria-hidden="true" />
    </button>

    <!-- X / Twitter -->
    <button
      v-if="coach.twitter_handle"
      data-action="twitter"
      type="button"
      :aria-label="`View ${name} on X`"
      class="rounded-lg p-2 text-brand-slate-700 transition hover:bg-brand-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-slate-500"
      @click.stop.prevent="openTwitter(coach.twitter_handle)"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <svg
        class="h-5 w-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    </button>

    <!-- Instagram -->
    <button
      v-if="coach.instagram_handle"
      data-action="instagram"
      type="button"
      :aria-label="`View ${name} on Instagram`"
      class="rounded-lg p-2 text-brand-pink-500 transition hover:bg-brand-pink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink-500"
      @click.stop.prevent="openInstagram(coach.instagram_handle)"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <svg
        class="h-5 w-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { toSmsHref, toTelHref } from "~/utils/phone";
import { openTwitter, openInstagram } from "~/utils/socialMediaHandlers";
import type { Coach } from "~/types/models";

const props = withDefaults(
  defineProps<{ coach: Coach; contactMode?: "native" | "modal" }>(),
  { contactMode: "native" },
);

const emit = defineEmits<{ "open-communication": [] }>();

const name = computed(
  () => `${props.coach.first_name} ${props.coach.last_name}`,
);

function onEmail(): void {
  if (props.contactMode === "modal") {
    emit("open-communication");
    return;
  }
  if (props.coach.email) {
    window.location.href = `mailto:${props.coach.email}`;
  }
}

function onText(): void {
  if (props.contactMode === "modal") {
    emit("open-communication");
    return;
  }
  if (props.coach.phone) {
    window.location.href = toSmsHref(props.coach.phone);
  }
}

function onCall(): void {
  if (props.coach.phone) {
    window.location.href = toTelHref(props.coach.phone);
  }
}
</script>
