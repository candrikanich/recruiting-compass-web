<script setup lang="ts">
interface Props {
  modelValue: string | null;
  schoolId: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  error: undefined,
  label: "Coach (Optional)",
});

const emit = defineEmits<{
  "update:modelValue": [coachId: string | null];
  "add-new-coach": [];
  "other-coach": [];
}>();

const { coaches, loading, fetchCoaches } = useCoaches();

const filteredCoaches = computed(() => {
  if (!props.schoolId) return [];
  return coaches.value.filter((coach) => coach.school_id === props.schoolId);
});

watch(
  () => props.schoolId,
  (newSchoolId) => {
    if (newSchoolId) {
      fetchCoaches(newSchoolId);
    }
  },
  { immediate: true },
);

const handleChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;

  if (value === "add-new") {
    emit("update:modelValue", null);
    emit("add-new-coach");
  } else if (value === "other") {
    emit("update:modelValue", null);
    emit("other-coach");
  } else {
    emit("update:modelValue", value || null);
  }
};
</script>

<template>
  <div>
    <label for="coach-select" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div v-if="loading" class="mt-1 text-sm text-slate-500">
      Loading coaches...
    </div>

    <select
      v-else
      id="coach-select"
      :value="modelValue || ''"
      :disabled="disabled || !schoolId"
      :required="required"
      :aria-invalid="!!error"
      :aria-describedby="error ? 'coach-select-error' : undefined"
      :aria-required="required"
      class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      :class="{
        'border-red-500 focus:border-red-500 focus:ring-red-500': !!error,
      }"
      @change="handleChange"
    >
      <option value="">Select a coach (optional)</option>
      <option
        v-for="coach in filteredCoaches"
        :key="coach.id"
        :value="coach.id"
      >
        {{ coach.first_name }} {{ coach.last_name }} -
        {{ getRoleLabel(coach.role) }}
      </option>
      <option value="---" disabled>---</option>
      <option value="other">Other coach (not listed)</option>
      <option value="add-new">+ Add new coach</option>
    </select>

    <p v-if="error" id="coach-select-error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>
