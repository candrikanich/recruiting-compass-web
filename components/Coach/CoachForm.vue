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

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
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
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
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

    <!-- Source -->
    <DesignSystemFormInput
      v-model="formData.source"
      label="Source"
      :disabled="loading"
      placeholder="e.g., Camp, LinkedIn, Referral"
      :error="fieldErrors.source"
      @blur="validateSource"
    />

    <!-- Tags -->
    <CoachTagsCard
      :tags="formData.tags"
      @add="handleAddTag"
      @remove="handleRemoveTag"
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
        class="flex-1 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
      >
        {{ loading ? "Adding..." : "Add Coach" }}
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        class="flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch, toRefs } from "vue";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import CoachTagsCard from "~/components/Coach/detail/CoachTagsCard.vue";
import { useFormValidation } from "~/composables/useFormValidation";
import { formatPhoneDisplay } from "~/utils/phone";
import { coachSchema, type CoachInput } from "~/utils/validation/schemas";
import { z } from "zod";

// Role options
const roleOptions = [
  { value: "", label: "Select Role" },
  { value: "head", label: "Head Coach" },
  { value: "assistant", label: "Assistant Coach" },
  { value: "recruiting", label: "Recruiting Coordinator" },
];

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
    source?: string | null;
    tags?: string[];
  };
}>();

const emit = defineEmits<{
  submit: [data: CoachInput];
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
  phone: formatPhoneDisplay(props.initialData?.phone || ""),
  twitter_handle: props.initialData?.twitter_handle || "",
  instagram_handle: props.initialData?.instagram_handle || "",
  notes: props.initialData?.notes || "",
  source: props.initialData?.source || "",
  tags: [...(props.initialData?.tags || [])],
});

const handleAddTag = (tag: string) => {
  if (!formData.tags.includes(tag)) {
    formData.tags = [...formData.tags, tag];
  }
};

const handleRemoveTag = (tag: string) => {
  formData.tags = formData.tags.filter((t) => t !== tag);
};

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
        phone: formatPhoneDisplay(newData.phone ?? formData.phone),
        twitter_handle: newData.twitter_handle ?? formData.twitter_handle,
        instagram_handle: newData.instagram_handle ?? formData.instagram_handle,
        notes: newData.notes ?? formData.notes,
        source: newData.source ?? formData.source,
        tags: newData.tags ? [...newData.tags] : formData.tags,
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
  source: z.object({ source: coachSchema.shape.source }),
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

const validateSource = async () => {
  await validateField(
    "source",
    formData.source,
    validators.source.shape.source,
  );
};

const handleSubmit = async () => {
  const validated = await validate(formData, coachSchema);

  if (!validated) {
    return;
  }

  emit("submit", validated);
};
</script>
