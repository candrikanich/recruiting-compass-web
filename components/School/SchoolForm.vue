<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Error summary -->
    <FormErrorSummary
      v-if="hasErrors"
      :errors="errors"
      @dismiss="clearErrors"
    />

    <!-- Name -->
    <div v-if="useAutocomplete">
      <label class="block text-sm font-medium mb-2 text-slate-700">
        School Name
        <span class="text-red-500" aria-hidden="true">*</span>
        <span class="sr-only">(required)</span>
        <span
          v-if="isAutoFilled('name')"
          class="text-xs font-normal text-blue-700"
          >(auto-filled)</span
        >
      </label>
      <SchoolAutocomplete @select="handleCollegeSelect" :disabled="loading" />
    </div>
    <DesignSystemFormInput
      v-else
      v-model="formData.name"
      label="School Name"
      :required="true"
      :disabled="loading"
      :auto-filled="isAutoFilled('name')"
      placeholder="e.g., University of Florida"
      :error="fieldErrors.name"
      @blur="validateName"
    />

    <!-- Location -->
    <DesignSystemFormInput
      v-model="formData.location"
      label="Location"
      :disabled="loading"
      :auto-filled="isAutoFilled('location')"
      placeholder="e.g., Gainesville, Florida"
      :error="fieldErrors.location"
      @blur="validateLocation"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Division -->
      <div>
        <DesignSystemFormSelect
          v-model="formData.division"
          label="Division"
          :disabled="loading"
          :auto-filled="isAutoFilled('division')"
          :options="divisionOptions"
          :error="fieldErrors.division"
          @blur="validateDivision"
        />
      </div>

      <!-- Conference -->
      <DesignSystemFormInput
        v-model="formData.conference"
        label="Conference"
        :disabled="loading"
        :auto-filled="isAutoFilled('conference')"
        placeholder="e.g., SEC, ACC, Pac-12"
        :error="fieldErrors.conference"
        @blur="validateConference"
      />
    </div>

    <!-- Website -->
    <DesignSystemFormInput
      v-model="formData.website"
      label="School Website"
      type="url"
      :disabled="loading"
      :auto-filled="isAutoFilled('website')"
      placeholder="https://example.com or www.example.com"
      :error="fieldErrors.website"
      @blur="validateWebsite"
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
      placeholder="Any notes about this school..."
      :rows="4"
      :error="fieldErrors.notes"
      @blur="validateNotes"
    />

    <!-- Status -->
    <DesignSystemFormSelect
      v-model="formData.status"
      label="Initial Status"
      :disabled="loading"
      :options="statusOptions"
      :error="fieldErrors.status"
      @blur="validateStatus"
    />

    <!-- College Scorecard Data (Display Only) -->
    <div v-if="collegeScorecardData" class="border-t border-slate-200 pt-6">
      <h3 class="text-sm font-semibold text-slate-900 mb-4">
        College Scorecard Data
      </h3>
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl text-sm"
      >
        <div v-if="collegeScorecardData.studentSize">
          <p class="text-slate-600">Student Size</p>
          <p class="font-semibold text-slate-900">
            {{ collegeScorecardData.studentSize.toLocaleString() }}
          </p>
        </div>
        <div v-if="collegeScorecardData.carnegieSize">
          <p class="text-slate-600">Size Category</p>
          <p class="font-semibold text-slate-900">
            {{ collegeScorecardData.carnegieSize }}
          </p>
        </div>
        <div v-if="collegeScorecardData.enrollmentAll">
          <p class="text-slate-600">Total Enrollment</p>
          <p class="font-semibold text-slate-900">
            {{ collegeScorecardData.enrollmentAll.toLocaleString() }}
          </p>
        </div>
        <div v-if="collegeScorecardData.admissionRate">
          <p class="text-slate-600">Admission Rate</p>
          <p class="font-semibold text-slate-900">
            {{ (collegeScorecardData.admissionRate * 100).toFixed(1) }}%
          </p>
        </div>
        <div v-if="collegeScorecardData.studentFacultyRatio">
          <p class="text-slate-600">Student-Faculty Ratio</p>
          <p class="font-semibold text-slate-900">
            {{ collegeScorecardData.studentFacultyRatio }}:1
          </p>
        </div>
        <div v-if="collegeScorecardData.tuitionInState">
          <p class="text-slate-600">Tuition (In-State)</p>
          <p class="font-semibold text-slate-900">
            ${{ collegeScorecardData.tuitionInState.toLocaleString() }}
          </p>
        </div>
        <div v-if="collegeScorecardData.tuitionOutOfState">
          <p class="text-slate-600">Tuition (Out-of-State)</p>
          <p class="font-semibold text-slate-900">
            ${{ collegeScorecardData.tuitionOutOfState.toLocaleString() }}
          </p>
        </div>
        <div
          v-if="collegeScorecardData.latitude && collegeScorecardData.longitude"
        >
          <p class="text-slate-600">Location</p>
          <p class="font-semibold text-green-800">Map coordinates available</p>
        </div>
      </div>
    </div>

    <!-- Submit and Cancel buttons -->
    <div class="flex gap-3 pt-4">
      <button
        data-testid="add-school-button"
        type="submit"
        :aria-busy="loading"
        :disabled="loading || hasErrors || !formData.name"
        class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
      >
        {{ loading ? "Adding..." : "Add School" }}
      </button>
      <button
        data-testid="cancel-school-button"
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
import { reactive, watch, computed, toRefs } from "vue";
import { useFormValidation } from "~/composables/useFormValidation";
import { schoolSchema } from "~/utils/validation/schemas";
import { z } from "zod";
import type { CollegeDataResult } from "~/composables/useCollegeData";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";

// Division options
const divisionOptions = computed(() => [
  { value: '', label: 'Select Division' },
  { value: 'D1', label: 'Division 1 (D1)' },
  { value: 'D2', label: 'Division 2 (D2)' },
  { value: 'D3', label: 'Division 3 (D3)' }
])

// Status options
const statusOptions = computed(() => [
  { value: 'researching', label: 'Researching' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'declined', label: 'Declined' },
  { value: 'committed', label: 'Committed' }
])

const props = defineProps<{
  loading: boolean;
  useAutocomplete?: boolean;
  collegeScorecardData?: CollegeDataResult | null;
  initialData?: {
    name?: string;
    location?: string;
    division?: string;
    conference?: string;
    website?: string;
    twitter_handle?: string;
    instagram_handle?: string;
    notes?: string;
    status?: string;
  };
  initialAutoFilledFields?: {
    name?: boolean;
    location?: boolean;
    website?: boolean;
    division?: boolean;
    conference?: boolean;
  };
}>();

const emit = defineEmits<{
  submit: [data: any];
  collegeSelect: [college: any];
  cancel: [];
}>();

const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

// Form data - initialize with parent data or defaults
const formData = reactive({
  name: props.initialData?.name || "",
  location: props.initialData?.location || "",
  division: props.initialData?.division || "",
  conference: props.initialData?.conference || "",
  website: props.initialData?.website || "",
  twitter_handle: props.initialData?.twitter_handle || "",
  instagram_handle: props.initialData?.instagram_handle || "",
  notes: props.initialData?.notes || "",
  status: props.initialData?.status || "researching",
});

const autoFilledFields = reactive({
  name: props.initialAutoFilledFields?.name || false,
  location: props.initialAutoFilledFields?.location || false,
  website: props.initialAutoFilledFields?.website || false,
  division: props.initialAutoFilledFields?.division || false,
  conference: props.initialAutoFilledFields?.conference || false,
});

// Watch for changes to initialData from parent (college selection)
const { initialData, initialAutoFilledFields } = toRefs(props);

watch(
  initialData,
  (newData) => {
    if (newData) {
      Object.assign(formData, {
        name: newData.name ?? formData.name,
        location: newData.location ?? formData.location,
        division: newData.division ?? formData.division,
        conference: newData.conference ?? formData.conference,
        website: newData.website ?? formData.website,
      });
    }
  },
  { deep: true },
);

// Watch for changes to autoFilledFields from parent
watch(
  initialAutoFilledFields,
  (newFields) => {
    if (newFields) {
      Object.assign(autoFilledFields, {
        name: newFields.name ?? autoFilledFields.name,
        location: newFields.location ?? autoFilledFields.location,
        website: newFields.website ?? autoFilledFields.website,
        division: newFields.division ?? autoFilledFields.division,
        conference: newFields.conference ?? autoFilledFields.conference,
      });
    }
  },
  { deep: true },
);

// Field validators
const validators = {
  name: z.object({ name: schoolSchema.shape.name }),
  location: z.object({ location: schoolSchema.shape.location }),
  division: z.object({ division: schoolSchema.shape.division }),
  conference: z.object({ conference: schoolSchema.shape.conference }),
  website: z.object({ website: schoolSchema.shape.website }),
  twitter_handle: z.object({
    twitter_handle: schoolSchema.shape.twitter_handle,
  }),
  instagram_handle: z.object({
    instagram_handle: schoolSchema.shape.instagram_handle,
  }),
  notes: z.object({ notes: schoolSchema.shape.notes }),
  status: z.object({ status: schoolSchema.shape.status }),
};

const validateName = async () => {
  await validateField("name", formData.name, validators.name.shape.name);
};

const validateLocation = async () => {
  await validateField(
    "location",
    formData.location,
    validators.location.shape.location,
  );
};

const validateDivision = async () => {
  await validateField(
    "division",
    formData.division,
    validators.division.shape.division,
  );
};

const validateConference = async () => {
  await validateField(
    "conference",
    formData.conference,
    validators.conference.shape.conference,
  );
};

const validateWebsite = async () => {
  await validateField(
    "website",
    formData.website,
    validators.website.shape.website,
  );
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

const validateStatus = async () => {
  await validateField(
    "status",
    formData.status,
    validators.status.shape.status,
  );
};

const isAutoFilled = (field: string) => {
  return autoFilledFields[field as keyof typeof autoFilledFields];
};

const handleCollegeSelect = (college: any) => {
  formData.name = college.name;
  formData.location = college.location || "";
  formData.website = college.website || "";

  autoFilledFields.name = true;
  autoFilledFields.location = !!college.location;
  autoFilledFields.website = !!college.website;

  emit("collegeSelect", college);
};

const handleSubmit = async () => {
  // Convert empty strings to undefined for optional fields (Zod's .optional() expects undefined, not null)
  const normalizedData = {
    ...formData,
    division: formData.division || undefined,
    conference: formData.conference || undefined,
    website: formData.website || undefined,
    twitter_handle: formData.twitter_handle || undefined,
    instagram_handle: formData.instagram_handle || undefined,
  };

  const validated = await validate(normalizedData, schoolSchema);

  if (!validated) {
    return;
  }
  emit("submit", {
    ...validated,
    favicon_url: null,
    pros: [],
    cons: [],
    is_favorite: false,
    private_notes: {},
    user_id: "",
  });
};
</script>
