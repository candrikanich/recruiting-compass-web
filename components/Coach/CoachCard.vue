<template>
  <NuxtLink
    :to="resolvedDetailTo"
    :aria-label="`View profile for ${fullName}`"
    :class="[
      'block rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-offset-2',
      variant === 'compact' ? 'p-3' : 'p-4',
    ]"
  >
    <!-- Header: logo* + name + school* + role badge -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <SchoolLogo
          v-if="showSchoolMeta && school"
          :school="school"
          size="md"
        />
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-slate-900">{{ fullName }}</h3>
          <p
            v-if="showSchoolMeta && school"
            class="truncate text-sm text-slate-500"
          >
            {{ school.name }}
          </p>
        </div>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-xs font-medium"
        :class="roleBadgeClass"
        :aria-label="`Coach role: ${roleLabel}`"
      >
        {{ roleLabel }}
      </span>
    </div>

    <!-- Contact rows (full only) -->
    <div v-if="variant === 'full'" class="mt-3 space-y-1.5">
      <div
        v-if="coach.email"
        class="flex items-center gap-2 text-sm text-slate-600"
      >
        <UIcon
          name="i-heroicons-envelope"
          class="h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <span class="truncate">{{ coach.email }}</span>
      </div>
      <div
        v-if="coach.phone"
        class="flex items-center gap-2 text-sm text-slate-600"
      >
        <UIcon
          name="i-heroicons-phone"
          class="h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <span>{{ coach.phone }}</span>
      </div>
    </div>

    <!-- Action-icon row (implemented in Task 3) -->
    <CoachCardActions
      :coach="coach"
      :contact-mode="contactMode"
      @open-communication="emit('open-communication', coach.id)"
    />

    <!-- Last contact (full only) -->
    <p
      v-if="variant === 'full' && coach.last_contact_date"
      class="mt-2 text-xs text-slate-500"
    >
      Last contact: {{ lastContactLabel }}
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import CoachCardActions from "~/components/Coach/CoachCardActions.vue";
import { getRoleLabel } from "~/utils/coachLabels";
import {
  getRoleBadgeClass,
  formatCoachDate,
  getDaysAgoExact,
} from "~/utils/coachFormatters";
import type { Coach, School } from "~/types/models";

const props = withDefaults(
  defineProps<{
    coach: Coach;
    variant?: "compact" | "full";
    showSchoolMeta?: boolean;
    school?: School;
    contactMode?: "native" | "modal";
    detailTo?: string;
  }>(),
  { variant: "full", showSchoolMeta: false, contactMode: "native" },
);

const emit = defineEmits<{ "open-communication": [coachId: string] }>();

const fullName = computed(
  () => `${props.coach.first_name} ${props.coach.last_name}`,
);
const roleLabel = computed(() => getRoleLabel(props.coach.role));
const roleBadgeClass = computed(() => getRoleBadgeClass(props.coach.role));
const resolvedDetailTo = computed(
  () => props.detailTo ?? `/coaches/${props.coach.id}`,
);
const lastContactLabel = computed(() => {
  const d = props.coach.last_contact_date;
  if (!d) return "";
  return `${formatCoachDate(d)} (${getDaysAgoExact(d)})`;
});
</script>
