<script setup lang="ts">
import { computed, useSlots } from "vue";
import type { Component } from "vue";

interface Props {
  title: string;
  description?: string;
  icon?: Component;
  actionText?: string;
  actionHref?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  action: [];
}>();

const slots = useSlots();

const hasAction = computed(
  () =>
    Boolean(props.actionText) ||
    Boolean(props.actionHref) ||
    Boolean(slots.action),
);
</script>

<template>
  <div
    class="flex flex-col items-center justify-center px-4 py-12"
    role="status"
  >
    <div
      class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-slate-100"
      aria-hidden="true"
    >
      <slot name="icon">
        <component
          :is="icon"
          v-if="icon"
          class="h-8 w-8 text-brand-slate-400"
        />
        <svg
          v-else
          class="h-8 w-8 text-brand-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </slot>
    </div>

    <h3 class="mb-2 text-center text-lg font-semibold text-brand-slate-900">
      {{ title }}
    </h3>

    <p
      v-if="description"
      class="mb-6 max-w-md text-center text-brand-slate-600"
    >
      {{ description }}
    </p>

    <div v-if="hasAction" class="mt-2 flex w-full flex-col items-center">
      <slot name="action">
        <DesignSystemButton
          v-if="actionText && actionHref"
          :to="actionHref"
          color="blue"
          variant="solid"
        >
          {{ actionText }}
        </DesignSystemButton>
        <DesignSystemButton
          v-else-if="actionText"
          color="blue"
          variant="solid"
          @click="emit('action')"
        >
          {{ actionText }}
        </DesignSystemButton>
      </slot>
    </div>
  </div>
</template>
