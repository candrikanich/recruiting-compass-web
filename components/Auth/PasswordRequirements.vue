<template>
  <div
    class="p-4 bg-slate-50 rounded-lg border border-slate-200"
    role="list"
    aria-label="Password requirements"
  >
    <p class="text-sm font-medium text-slate-700 mb-3">
      Password must contain:
    </p>
    <ul class="space-y-2">
      <li
        v-for="rule in passwordRules"
        :key="rule.id"
        class="flex items-center gap-2 text-sm"
        role="listitem"
      >
        <CheckCircleIcon
          v-if="rule.isValid"
          class="w-5 h-5 text-emerald-600 flex-shrink-0"
          aria-hidden="true"
        />
        <svg
          v-else
          class="w-5 h-5 text-slate-300 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke-width="2" />
        </svg>
        <span :class="rule.isValid ? 'text-slate-900' : 'text-slate-500'">
          {{ rule.label }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { CheckCircleIcon } from "@heroicons/vue/24/outline";

const props = withDefaults(
  defineProps<{
    password: string;
  }>(),
  {
    password: "",
  },
);

interface PasswordRule {
  id: string;
  label: string;
  isValid: boolean;
}

const passwordRules = computed<PasswordRule[]>(() => [
  {
    id: "length",
    label: "At least 8 characters",
    isValid: props.password.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    isValid: /[A-Z]/.test(props.password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    isValid: /[a-z]/.test(props.password),
  },
  {
    id: "number",
    label: "One number",
    isValid: /[0-9]/.test(props.password),
  },
]);
</script>
