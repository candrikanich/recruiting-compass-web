<template>
  <div
    class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
    :class="iconBgClass"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Validating state -->
    <svg
      v-if="status === 'validating'"
      class="w-11 h-11 text-blue-600 animate-spin motion-reduce:animate-none"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Success state -->
    <svg
      v-else-if="status === 'success'"
      class="w-11 h-11 text-emerald-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      stroke-width="2"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>

    <!-- Error state -->
    <svg
      v-else-if="status === 'error'"
      class="w-11 h-11 text-red-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>

    <!-- Default state (email/lock icon) -->
    <svg
      v-else
      class="w-11 h-11"
      :class="iconColor"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <!-- Email icon -->
      <path
        v-if="icon === 'email'"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
      <!-- Lock icon -->
      <path
        v-else-if="icon === 'lock'"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type IconStatus = "validating" | "success" | "error" | "default";
export type IconType = "email" | "lock";

const props = withDefaults(
  defineProps<{
    status: IconStatus;
    icon?: IconType;
    ariaLabel: string;
  }>(),
  {
    status: "default",
    icon: "email",
  },
);

const iconBgClass = computed(() => {
  switch (props.status) {
    case "validating":
      return "bg-blue-100";
    case "success":
      return "bg-emerald-100";
    case "error":
      return "bg-red-100";
    default:
      return "bg-amber-100";
  }
});

const iconColor = computed(() => {
  switch (props.status) {
    case "validating":
      return "text-blue-700";
    case "success":
      return "text-emerald-700";
    case "error":
      return "text-red-700";
    default:
      return "text-amber-700";
  }
});
</script>
