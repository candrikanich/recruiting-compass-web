<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Error summary -->
    <FormErrorSummary
      v-if="hasErrors"
      :errors="errors"
      @dismiss="clearErrors"
    />

    <!-- Role -->
    <DesignSystemFormSelect
      v-model="formData.role"
      label="Role"
      :required="true"
      :disabled="loading"
      :options="roleOptions"
      :error="fieldErrors.role"
      @blur="validateRole"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- First Name -->
      <DesignSystemFormInput
        v-model="formData.first_name"
        label="First Name"
        :required="true"
        :disabled="loading"
        placeholder="e.g., John"
        :error="fieldErrors.first_name"
        @blur="validateFirstName"
      />

      <!-- Last Name -->
      <DesignSystemFormInput
        v-model="formData.last_name"
        label="Last Name"
        :required="true"
        :disabled="loading"
        placeholder="e.g., Smith"
        :error="fieldErrors.last_name"
        @blur="validateLastName"
      />
    </div>

    <!-- Email -->
    <DesignSystemFormInput
      v-model="formData.email"
      label="Email"
      type="email"
      :disabled="loading"
      placeholder="john.smith@university.edu"
      :error="fieldErrors.email"
      @blur="validateEmail"
    />

    <!-- Phone -->
    <DesignSystemFormInput
      v-model="formData.phone"
      label="Phone"
      type="tel"
      :disabled="loading"
      placeholder="(555) 123-4567"
      :error="fieldErrors.phone"
      @blur="validatePhone"
    />

    <!-- Social Media -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DesignSystemFormInput
        v-model="formData.twitter_handle"
        label="Twitter Handle"
        :disabled="loading"
        placeholder="@handle"
        :error="fieldErrors.twitter_handle"
        @blur="validateTwitter"
      />

      <DesignSystemFormInput
        v-model="formData.instagram_handle"
        label="Instagram Handle"
        :disabled="loading"
        placeholder="@handle"
        :error="fieldErrors.instagram_handle"
        @blur="validateInstagram"
      />
    </div>

    <!-- Notes -->
    <DesignSystemFormTextarea
      v-model="formData.notes"
      label="Notes"
      :disabled="loading"
      placeholder="Any notes about this coach..."
      :rows="4"
      :error="fieldErrors.notes"
      @blur="validateNotes"
    />

    <!-- Submit and Cancel buttons -->
    <div class="flex gap-4">
      <button
        data-testid="add-coach-button"
        type="submit"
        :aria-busy="loading"
        :disabled="
          loading ||
          hasErrors ||
          !formData.role ||
          !formData.first_name ||
          !formData.last_name
        "
        class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? "Adding..." : "Add Coach" }}
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-300 hover:bg-slate-50 transition"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch, toRefs, computed } from "vue";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import { useFormValidation } from "~/composables/useFormValidation";
import { coachSchema } from "~/utils/validation/schemas";
import { z } from "zod";

// Role options
const roleOptions = computed(() => [
  { value: '', label: 'Select Role' },
  { value: 'head', label: 'Head Coach' },
  { value: 'assistant', label: 'Assistant Coach' },
  { value: 'recruiting', label: 'Recruiting Coordinator' }
])

const props = defineProps<{
  loading: boolean;
  initialData?: {
    role?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    twitter_handle?: string;
    instagram_handle?: string;
    notes?: string;
  };
}>();

const emit = defineEmits<{
  submit: [data: any];
  cancel: [];
}>();

const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

// Form data - initialize with parent data or defaults
const formData = reactive({
  role: props.initialData?.role || "",
  first_name: props.initialData?.first_name || "",
  last_name: props.initialData?.last_name || "",
  email: props.initialData?.email || "",
  phone: props.initialData?.phone || "",
  twitter_handle: props.initialData?.twitter_handle || "",
  instagram_handle: props.initialData?.instagram_handle || "",
  notes: props.initialData?.notes || "",
});

// Watch for changes to initialData from parent
const { initialData } = toRefs(props);

watch(
  initialData,
  (newData) => {
    if (newData) {
      Object.assign(formData, {
        role: newData.role ?? formData.role,
        first_name: newData.first_name ?? formData.first_name,
        last_name: newData.last_name ?? formData.last_name,
        email: newData.email ?? formData.email,
        phone: newData.phone ?? formData.phone,
        twitter_handle: newData.twitter_handle ?? formData.twitter_handle,
        instagram_handle: newData.instagram_handle ?? formData.instagram_handle,
        notes: newData.notes ?? formData.notes,
      });
    }
  },
  { deep: true },
);

// Field validators
const validators = {
  role: z.object({ role: coachSchema.shape.role }),
  first_name: z.object({ first_name: coachSchema.shape.first_name }),
  last_name: z.object({ last_name: coachSchema.shape.last_name }),
  email: z.object({ email: coachSchema.shape.email }),
  phone: z.object({ phone: coachSchema.shape.phone }),
  twitter_handle: z.object({
    twitter_handle: coachSchema.shape.twitter_handle,
  }),
  instagram_handle: z.object({
    instagram_handle: coachSchema.shape.instagram_handle,
  }),
  notes: z.object({ notes: coachSchema.shape.notes }),
};

const validateRole = async () => {
  await validateField("role", formData.role, validators.role.shape.role);
};

const validateFirstName = async () => {
  await validateField(
    "first_name",
    formData.first_name,
    validators.first_name.shape.first_name,
  );
};

const validateLastName = async () => {
  await validateField(
    "last_name",
    formData.last_name,
    validators.last_name.shape.last_name,
  );
};

const validateEmail = async () => {
  await validateField("email", formData.email, validators.email.shape.email);
};

const validatePhone = async () => {
  await validateField("phone", formData.phone, validators.phone.shape.phone);
};

const validateTwitter = async () => {
  await validateField(
    "twitter_handle",
    formData.twitter_handle,
    validators.twitter_handle.shape.twitter_handle,
  );
};

const validateInstagram = async () => {
  await validateField(
    "instagram_handle",
    formData.instagram_handle,
    validators.instagram_handle.shape.instagram_handle,
  );
};

const validateNotes = async () => {
  await validateField("notes", formData.notes, validators.notes.shape.notes);
};

const handleSubmit = async () => {
  const validated = await validate(formData, coachSchema);

  if (!validated) {
    return;
  }

  emit("submit", validated);
};
</script>
