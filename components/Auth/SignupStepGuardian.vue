<template>
  <div>
    <div
      class="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
    >
      <p class="font-medium">Bring a parent or guardian along</p>
      <p class="mt-1 text-blue-800">
        They'll see what you're working on and can help — messaging coaches
        unlocks once they confirm. You can add this later if you'd rather do
        that now.
      </p>
    </div>
    <LoginInputField
      id="guardianEmail"
      label="Parent or Guardian Email"
      type="email"
      placeholder="parent.email@example.com"
      autocomplete="off"
      :model-value="guardianEmail ?? ''"
      :error="fieldErrors.guardianEmail"
      :disabled="loading"
      icon="i-heroicons-user-group"
      @update:model-value="$emit('update:guardianEmail', $event)"
    />
    <div class="mt-4 flex items-center justify-between">
      <button
        type="button"
        data-testid="signup-guardian-skip"
        class="text-sm font-medium text-slate-600 underline hover:text-slate-800"
        @click="$emit('skip')"
      >
        Skip for now
      </button>
      <button
        type="button"
        data-testid="signup-step-continue"
        :disabled="!canContinue"
        class="rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-6 py-2 font-semibold text-white shadow disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
        @click="$emit('continue')"
      >
        Continue
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoginInputField from "~/components/Auth/LoginInputField.vue";

const props = defineProps<{
  guardianEmail?: string;
  loading: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:guardianEmail": [value: string];
  continue: [];
  skip: [];
}>();

// Continue is always available once an email is *typed* — full format validation
// stays server-side (same EMAIL_RE the endpoint applies), matching this form's
// existing pattern of not duplicating regex validation client-side for guardianEmail.
const canContinue = computed(
  () => (props.guardianEmail ?? "").trim().length > 0,
);
</script>
