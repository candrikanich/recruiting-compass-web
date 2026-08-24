<template>
  <div
    :id="id"
    class="rounded-lg border border-slate-200 bg-slate-50 p-4"
    role="list"
    aria-label="Password requirements"
  >
    <p class="mb-3 text-sm font-medium text-slate-700">
      Password must contain:
    </p>
    <ul class="space-y-2">
      <li
        v-for="rule in passwordRules"
        :key="rule.id"
        class="flex items-center gap-2 text-sm"
        role="listitem"
      >
        <UIcon
          name="i-heroicons-check-circle"
          v-if="rule.isValid"
          class="h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <svg
          v-else
          class="h-5 w-5 shrink-0 text-slate-300"
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
const props = withDefaults(
  defineProps<{
    password: string;
    id?: string;
  }>(),
  {
    password: "",
    id: "password-requirements",
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
