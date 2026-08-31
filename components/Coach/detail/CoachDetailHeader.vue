<script setup lang="ts">
import { computed } from "vue";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import type { Coach, School } from "~/types/models";
import { getRoleLabel } from "~/utils/coachLabels";

const props = defineProps<{
  coach: Coach;
  school?: School | null;
  schoolName?: string | null;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const initials = computed(() => {
  const first = props.coach.first_name?.[0] ?? "";
  const last = props.coach.last_name?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
});

const fullName = computed(
  () => `${props.coach.first_name} ${props.coach.last_name}`,
);

const subtitle = computed(() => {
  const role = getRoleLabel(props.coach.role);
  return props.schoolName ? `${role} · ${props.schoolName}` : role;
});
</script>

<template>
  <section
    class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3"
  >
    <div class="flex items-center gap-3">
      <SchoolLogo v-if="school" :school="school" size="sm" class="shrink-0" />
      <div
        v-else
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-500"
        aria-hidden="true"
      >
        {{ initials }}
      </div>
      <div class="flex flex-col gap-0.5">
        <p class="text-base font-bold text-slate-900">{{ fullName }}</p>
        <p class="text-xs text-slate-600">{{ subtitle }}</p>
      </div>
    </div>

    <div class="flex items-center gap-2.5">
      <button
        type="button"
        data-testid="coach-header-edit"
        class="flex items-center gap-1.5 rounded-lg bg-blue-50 px-4 py-2"
        @click="emit('edit')"
      >
        <UIcon
          name="i-heroicons-pencil"
          class="h-3.5 w-3.5 text-blue-500"
          aria-hidden="true"
        />
        <span class="text-[13px] font-semibold text-blue-500"
          >Edit Profile</span
        >
      </button>
      <button
        type="button"
        data-testid="coach-header-delete"
        class="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-4 py-2"
        @click="emit('delete')"
      >
        <UIcon
          name="i-heroicons-trash"
          class="h-3.5 w-3.5 text-red-500"
          aria-hidden="true"
        />
        <span class="text-[13px] font-semibold text-red-500">Delete Coach</span>
      </button>
    </div>
  </section>
</template>
