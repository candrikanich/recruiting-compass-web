<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    email: string;
    role?: "player" | "parent";
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    password?: string;
    confirmPassword?: string;
    agreeToTerms?: boolean;
    loading?: boolean;
    prefill?: { firstName: string; lastName: string };
  }>(),
  { loading: false },
);

const emit = defineEmits<{
  "update:email": [value: string];
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  "update:agreeToTerms": [value: boolean];
  submit: [];
}>();

const maxDateOfBirth = computed(() => new Date().toISOString().split("T")[0]);
</script>

<template>
  <form class="space-y-4" @submit.prevent="emit('submit')">
    <div class="grid grid-cols-2 gap-3">
      <DesignSystemInput
        id="firstName"
        label="First Name"
        type="text"
        placeholder="First name"
        :model-value="firstName ?? prefill?.firstName ?? ''"
        :disabled="loading"
        @update:model-value="emit('update:firstName', $event as string)"
      />
      <DesignSystemInput
        id="lastName"
        label="Last Name"
        type="text"
        placeholder="Last name"
        :model-value="lastName ?? prefill?.lastName ?? ''"
        :disabled="loading"
        @update:model-value="emit('update:lastName', $event as string)"
      />
    </div>

    <!-- Date of Birth (players only — COPPA compliance) -->
    <div v-if="role === 'player'">
      <label for="invite-dob" class="block text-sm font-medium text-slate-700 mb-1.5">
        Player Date of Birth <span class="text-red-600">*</span>
      </label>
      <input
        id="invite-dob"
        data-testid="invite-dob"
        type="date"
        required
        :max="maxDateOfBirth"
        :value="dateOfBirth ?? ''"
        :disabled="loading"
        class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-200"
        @input="emit('update:dateOfBirth', ($event.target as HTMLInputElement).value)"
      />
      <p class="mt-1 text-xs text-slate-500">Players must be 13 or older to register.</p>
    </div>

    <DesignSystemInput
      id="invite-email"
      data-testid="invite-email"
      label="Email"
      type="email"
      placeholder="Your email address"
      :model-value="email"
      :disabled="loading"
      @update:model-value="emit('update:email', $event as string)"
    />

    <DesignSystemInput
      id="password"
      label="Password"
      type="password"
      placeholder="Create a password"
      :model-value="password ?? ''"
      :disabled="loading"
      hint="8+ characters with uppercase, lowercase, and a number"
      @update:model-value="emit('update:password', $event as string)"
    />

    <DesignSystemInput
      id="confirmPassword"
      label="Confirm Password"
      type="password"
      placeholder="Confirm your password"
      :model-value="confirmPassword ?? ''"
      :disabled="loading"
      @update:model-value="emit('update:confirmPassword', $event as string)"
    />

    <div class="flex items-start gap-2">
      <input
        id="invite-terms"
        type="checkbox"
        :checked="agreeToTerms ?? false"
        :disabled="loading"
        class="mt-1 rounded-sm border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        @change="emit('update:agreeToTerms', ($event.target as HTMLInputElement).checked)"
      />
      <label for="invite-terms" class="text-sm text-slate-600">
        I agree to the
        <NuxtLink to="/legal/terms" class="text-blue-600 hover:underline">Terms</NuxtLink>
        and
        <NuxtLink to="/legal/privacy" class="text-blue-600 hover:underline">Privacy Policy</NuxtLink>
      </label>
    </div>

    <DesignSystemButton type="submit" :loading="loading" :full-width="true">
      {{ loading ? "Creating account..." : "Create account and connect" }}
    </DesignSystemButton>
  </form>
</template>
