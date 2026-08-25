<script setup lang="ts">
import { computed } from "vue";
import type { Coach } from "~/types/models";

const props = defineProps<{ coach: Coach }>();

const initials = computed(() => {
  const first = props.coach.first_name?.[0] ?? "";
  const last = props.coach.last_name?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
});

const fullName = computed(
  () => `${props.coach.first_name} ${props.coach.last_name}`,
);
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 text-center">
    <div
      class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-100 text-lg font-semibold text-brand-blue-700"
      aria-hidden="true"
    >
      {{ initials }}
    </div>
    <h2 class="text-base font-semibold text-slate-900">{{ fullName }}</h2>

    <a
      v-if="coach.email"
      :href="`mailto:${coach.email}`"
      class="mt-1 block truncate text-sm text-brand-blue-600 hover:underline"
    >
      {{ coach.email }}
    </a>

    <div class="mt-3 flex items-center justify-center gap-3">
      <a
        v-if="coach.twitter_handle"
        :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`View ${fullName} on X`"
        class="text-slate-500 hover:text-brand-slate-700"
      >
        <UIcon name="i-heroicons-at-symbol" class="h-5 w-5" aria-hidden="true" />
      </a>
      <a
        v-if="coach.instagram_handle"
        :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`View ${fullName} on Instagram`"
        class="text-slate-500 hover:text-brand-pink-500"
      >
        <UIcon name="i-heroicons-camera" class="h-5 w-5" aria-hidden="true" />
      </a>
    </div>
  </section>
</template>
