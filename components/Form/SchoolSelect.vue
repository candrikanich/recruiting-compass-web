<script setup lang="ts">
interface Props {
  modelValue: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: true,
  error: undefined,
  label: "School",
});

const emit = defineEmits<{
  "update:modelValue": [schoolId: string];
}>();

const { schools, loading, fetchSchools } = useSchools();

onMounted(() => {
  fetchSchools();
});

const hasSchools = computed(() => schools.value.length > 0);
</script>

<template>
  <div>
    <label for="school-select" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div v-if="loading" class="mt-1 text-sm text-slate-500">
      Loading schools...
    </div>

    <div v-else-if="!hasSchools">
      <p class="mt-1 text-sm text-slate-600">
        No schools found.
        <NuxtLink to="/schools/new" class="text-blue-600 hover:text-blue-700">
          Add a school first
        </NuxtLink>
      </p>
    </div>

    <select
      v-else
      id="school-select"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="!!error"
      :aria-describedby="error ? 'school-select-error' : undefined"
      :aria-required="required"
      class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      :class="{
        'border-red-500 focus:border-red-500 focus:ring-red-500': !!error,
      }"
      @change="
        emit('update:modelValue', ($event.target as HTMLSelectElement).value)
      "
    >
      <option value="">Select a school</option>
      <option v-for="school in schools" :key="school.id" :value="school.id">
        {{ school.name }}
      </option>
    </select>

    <p v-if="error" id="school-select-error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>
