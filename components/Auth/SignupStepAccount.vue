<template>
  <div class="space-y-6">
    <!-- Name Fields -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <LoginInputField
        id="firstName"
        label="First Name"
        type="text"
        placeholder="John"
        autocomplete="given-name"
        :model-value="firstName"
        :error="fieldErrors.firstName"
        :disabled="disabled"
        icon="i-heroicons-user"
        :required="true"
        @update:model-value="$emit('update:firstName', $event)"
      />
      <LoginInputField
        id="lastName"
        label="Last Name"
        type="text"
        placeholder="Smith"
        autocomplete="family-name"
        :model-value="lastName"
        :error="fieldErrors.lastName"
        :disabled="disabled"
        icon="i-heroicons-user"
        :required="true"
        @update:model-value="$emit('update:lastName', $event)"
      />
    </div>

    <!-- Date of Birth (players only — COPPA compliance) -->
    <div v-if="userType === 'player'">
      <label
        for="dateOfBirth"
        class="mb-2 block text-sm font-medium text-slate-700"
      >
        Player Date of Birth
        <span class="ml-1 text-red-600" aria-label="required">*</span>
      </label>
      <div class="relative">
        <UIcon
          name="i-heroicons-calendar"
          class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <!-- Safari/WebKit fires only `change` (not `input`) when a date is
             picked via the native calendar popover, as opposed to typed
             digit-by-digit — issue #696. Both handlers below keep
             dateOfBirth in sync regardless of how the value was set. -->
        <input
          id="dateOfBirth"
          :value="dateOfBirth"
          type="date"
          required
          aria-required="true"
          :aria-invalid="fieldErrors.dateOfBirth ? 'true' : 'false'"
          :aria-describedby="
            fieldErrors.dateOfBirth ? 'dateOfBirth-error' : 'dateOfBirth-hint'
          "
          :max="maxDateOfBirth"
          :class="[
            'w-full rounded-lg border py-3 pr-4 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-offset-2 focus:outline-2',
            fieldErrors.dateOfBirth
              ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
              : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
          ]"
          :disabled="disabled"
          @input="
            $emit(
              'update:dateOfBirth',
              ($event.target as HTMLInputElement).value,
            )
          "
          @change="
            $emit(
              'update:dateOfBirth',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </div>
      <p id="dateOfBirth-hint" class="mt-1 text-xs text-slate-500">
        Recruiting Compass is for ages 13 and up. By entering a date of birth,
        you confirm you are 13 or older.
      </p>
      <FieldError id="dateOfBirth-error" :error="fieldErrors.dateOfBirth" />
    </div>

    <!-- Email -->
    <LoginInputField
      id="email"
      label="Email"
      type="email"
      placeholder="your.email@example.com"
      autocomplete="email"
      :model-value="email"
      :error="fieldErrors.email"
      :disabled="disabled"
      icon="i-heroicons-envelope"
      :required="true"
      @update:model-value="$emit('update:email', $event)"
      @blur="$emit('validateEmail')"
    />

    <!-- Password Fields -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <LoginInputField
        id="password"
        label="Password"
        type="password"
        placeholder="Create a password"
        autocomplete="new-password"
        :model-value="password"
        :error="fieldErrors.password"
        :disabled="disabled"
        icon="i-heroicons-lock-closed"
        :required="true"
        described-by="password-requirements"
        @update:model-value="$emit('update:password', $event)"
        @blur="$emit('validatePassword')"
      />
      <div>
        <label
          for="confirmPassword"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Confirm Password
          <span class="ml-1 text-red-600" aria-label="required">*</span>
        </label>
        <div class="relative">
          <UIcon
            name="i-heroicons-lock-closed"
            class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="confirmPassword"
            :value="confirmPassword"
            type="password"
            required
            aria-required="true"
            autocomplete="new-password"
            :aria-invalid="fieldErrors.confirmPassword ? 'true' : 'false'"
            :class="[
              'w-full rounded-lg border py-3 pr-4 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-offset-2 focus:outline-2',
              fieldErrors.confirmPassword
                ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
                : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
            ]"
            placeholder="Confirm password"
            :disabled="disabled"
            @input="
              $emit(
                'update:confirmPassword',
                ($event.target as HTMLInputElement).value,
              )
            "
            @blur="$emit('validatePassword')"
          />
        </div>
        <FieldError
          id="confirmPassword-error"
          :error="fieldErrors.confirmPassword"
        />
      </div>
    </div>

    <!-- Password Requirements Hint -->
    <p id="password-requirements" class="text-xs text-slate-500">
      Must be 8+ characters with uppercase, lowercase, and a number
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoginInputField from "~/components/Auth/LoginInputField.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";

const props = defineProps<{
  userType: "player" | "parent";
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:email": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  validateEmail: [];
  validatePassword: [];
}>();

const disabled = computed(() => props.loading);

// Max selectable date: today (no future dates)
const maxDateOfBirth = computed(() => new Date().toISOString().split("T")[0]);
</script>
