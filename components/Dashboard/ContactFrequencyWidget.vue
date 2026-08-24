<template>
  <div
    data-testid="contact-frequency-widget"
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="mb-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-slate-100 p-2">
          <UIcon name="i-heroicons-phone" class="h-5 w-5 text-slate-700" />
        </div>
        <h3 class="font-semibold text-slate-900">Contact Frequency</h3>
      </div>
      <div
        v-if="recentContacts.length > 0"
        class="rounded-full bg-brand-blue-100 px-3 py-1 text-sm font-medium text-brand-blue-700"
        data-testid="contact-frequency-count"
      >
        {{ recentContacts.length }}
      </div>
    </div>

    <div
      v-if="recentContacts.length > 0 || totalSchoolsTracked > 0"
      class="space-y-4"
    >
      <!-- Summary Metrics -->
      <div
        class="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-4"
      >
        <div class="text-center" data-testid="metric-total-schools">
          <div class="text-lg font-bold text-slate-900">
            {{ totalSchoolsTracked }}
          </div>
          <div class="text-xs text-slate-600">Total Schools</div>
        </div>
        <div class="text-center" data-testid="metric-contacted-7days">
          <div class="text-lg font-bold text-slate-900">
            {{ schoolsContactedLast7Days }}
          </div>
          <div class="text-xs text-slate-600">Last 7 Days</div>
        </div>
        <div class="text-center" data-testid="metric-avg-frequency">
          <div class="text-lg font-bold text-slate-900">
            {{ averageContactFrequency }}
          </div>
          <div class="text-xs text-slate-600">Avg/Month</div>
        </div>
        <div
          class="cursor-pointer rounded-sm p-1 text-center transition-colors hover:bg-slate-100"
          data-testid="metric-need-attention"
        >
          <div class="text-lg font-bold text-slate-900">
            {{ schoolsWithNoRecentContact }}
          </div>
          <div class="text-xs text-slate-600">Need Attention</div>
        </div>
      </div>

      <p v-if="recentContacts.length > 0" class="mb-3 text-sm text-slate-600">
        Schools contacted in the last 7 days
      </p>
      <div
        v-if="recentContacts.length > 0"
        class="max-h-64 space-y-2 overflow-y-auto"
      >
        <NuxtLink
          v-for="contact in recentContacts.slice(0, 5)"
          :key="contact.schoolId"
          :to="`/schools/${contact.schoolId}`"
          :data-testid="`contacted-school-${contact.schoolId}`"
          class="flex cursor-pointer items-start justify-between rounded-lg border-l-4 bg-slate-50 p-3 transition-colors hover:bg-slate-100"
          :class="[
            contact.contactRecency === 'green' && 'border-green-500',
            contact.contactRecency === 'yellow' && 'border-yellow-500',
            contact.contactRecency === 'red' && 'border-red-500',
          ]"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium text-slate-900">
              {{ contact.schoolName }}
            </div>
            <div class="mt-0.5 text-sm text-slate-600">
              {{ formatLastContactDate(contact.lastContactDate) }}
            </div>
          </div>
          <div
            class="ml-2 rounded-sm bg-brand-blue-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-brand-blue-700"
          >
            {{ contact.contactCount }}
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-else class="py-6 text-center text-slate-500">
      <p>No schools tracked yet</p>
      <p class="mt-1 text-sm text-slate-400">
        Add schools to start tracking contact frequency
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Interaction, School } from "~/types/models";

interface ContactRecord {
  schoolId: string;
  schoolName: string;
  lastContactDate: string;
  contactCount: number;
  contactRecency: "green" | "yellow" | "red";
}

interface Props {
  interactions?: Interaction[];
  schools?: School[];
}

const props = withDefaults(defineProps<Props>(), {
  interactions: () => [],
  schools: () => [],
});

const getContactRecency = (
  lastContactDate: string,
): "green" | "yellow" | "red" => {
  const now = new Date();
  const contactDate = new Date(lastContactDate);
  const diffDays = Math.floor(
    (now.getTime() - contactDate.getTime()) / 86400000,
  );

  if (diffDays <= 7) return "green";
  if (diffDays <= 30) return "yellow";
  return "red";
};

const recentContacts = computed((): ContactRecord[] => {
  if (!props.interactions || !props.schools) {
    return [];
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Filter interactions from the last 7 days
  const recentInteractions = props.interactions.filter((interaction) => {
    const interactionDate = new Date(
      interaction.occurred_at || interaction.created_at || "",
    );
    return interactionDate >= sevenDaysAgo;
  });

  if (recentInteractions.length === 0) {
    return [];
  }

  // Create a map of school_id -> interactions
  const schoolContactMap = new Map<string, Interaction[]>();

  recentInteractions.forEach((interaction) => {
    if (interaction.school_id) {
      const existing = schoolContactMap.get(interaction.school_id) || [];
      schoolContactMap.set(interaction.school_id, [...existing, interaction]);
    }
  });

  // Build contact records
  const contacts: ContactRecord[] = [];

  schoolContactMap.forEach((interactions, schoolId) => {
    const school = props.schools?.find((s) => s.id === schoolId);
    if (school) {
      // Get the most recent interaction for this school
      const mostRecent = interactions.sort((a, b) => {
        const dateA = new Date(a.occurred_at || a.created_at || "").getTime();
        const dateB = new Date(b.occurred_at || b.created_at || "").getTime();
        return dateB - dateA;
      })[0];

      const lastContactDate =
        mostRecent.occurred_at || mostRecent.created_at || "";

      contacts.push({
        schoolId,
        schoolName: school.name,
        lastContactDate,
        contactCount: interactions.length,
        contactRecency: getContactRecency(lastContactDate),
      });
    }
  });

  // Sort by most recent contact date
  return contacts.sort((a, b) => {
    const dateA = new Date(a.lastContactDate).getTime();
    const dateB = new Date(b.lastContactDate).getTime();
    return dateB - dateA;
  });
});

const totalSchoolsTracked = computed(() => props.schools?.length || 0);

const schoolsContactedLast7Days = computed(() => recentContacts.value.length);

const averageContactFrequency = computed(() => {
  if (!props.schools || props.schools.length === 0) return "0.0";
  const totalInteractions = props.interactions?.length || 0;
  const monthsTracked = 1; // One month average
  const avg = totalInteractions / props.schools.length / monthsTracked;
  return avg.toFixed(1);
});

const schoolsWithNoRecentContact = computed(() => {
  if (!props.schools || props.schools.length === 0) return 0;
  if (!props.interactions || props.interactions.length === 0) {
    return props.schools.length;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Build school interaction index once
  const schoolLastInteractionMap = new Map<string, Date>();

  props.interactions.forEach((interaction) => {
    if (!interaction.school_id) return;

    const dateStr = interaction.occurred_at || interaction.created_at;
    if (!dateStr) return;

    const interactionDate = new Date(dateStr).getTime();
    const existing = schoolLastInteractionMap.get(interaction.school_id);

    if (!existing || interactionDate > existing.getTime()) {
      schoolLastInteractionMap.set(
        interaction.school_id,
        new Date(interactionDate),
      );
    }
  });

  // Count schools without recent contact
  return props.schools.filter((school) => {
    const lastDate = schoolLastInteractionMap.get(school.id);
    if (!lastDate) return true;
    return lastDate < thirtyDaysAgo;
  }).length;
});

const formatLastContactDate = (date: string): string => {
  const contactDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - contactDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return contactDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
</script>
