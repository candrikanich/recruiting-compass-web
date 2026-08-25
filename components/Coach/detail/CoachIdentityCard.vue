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
      class="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-slate-200 bg-slate-100 text-lg font-semibold text-slate-600"
      aria-hidden="true"
    >
      {{ initials }}
    </div>
    <h2 class="text-xl font-bold text-slate-900">{{ fullName }}</h2>

    <a
      v-if="coach.email"
      :href="`mailto:${coach.email}`"
      class="mt-1 block truncate text-[13px] text-blue-500 hover:underline"
    >
      {{ coach.email }}
    </a>

    <div
      v-if="coach.twitter_handle || coach.instagram_handle"
      class="mt-3 space-y-2 border-t border-slate-200 pt-3"
    >
      <a
        v-if="coach.twitter_handle"
        :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`View ${fullName} on X`"
        class="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700"
      >
        <UIcon name="i-heroicons-at-symbol" class="h-4 w-4" aria-hidden="true" />
        <span class="text-[13px] text-slate-600">{{ coach.twitter_handle }}</span>
        <UIcon
          name="i-heroicons-arrow-top-right-on-square"
          class="h-3 w-3"
          aria-hidden="true"
        />
      </a>
      <a
        v-if="coach.instagram_handle"
        :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`View ${fullName} on Instagram`"
        class="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700"
      >
        <UIcon name="i-heroicons-camera" class="h-4 w-4" aria-hidden="true" />
        <span class="text-[13px] text-slate-600">{{ coach.instagram_handle }}</span>
        <UIcon
          name="i-heroicons-arrow-top-right-on-square"
          class="h-3 w-3"
          aria-hidden="true"
        />
      </a>
    </div>
  </section>
</template>
