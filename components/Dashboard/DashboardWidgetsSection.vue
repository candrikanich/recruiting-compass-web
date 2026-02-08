<template>
  <!-- Row 4: Tasks, Frequency, Social (each 1 col) -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <QuickTasksWidget
      :tasks="tasks"
      :show-tasks="true"
      @add-task="$emit('add-task', $event)"
      @toggle-task="$emit('toggle-task', $event)"
      @delete-task="$emit('delete-task', $event)"
      @clear-completed="$emit('clear-completed')"
    />
    <ContactFrequencyWidget :interactions="interactions" :schools="schools" />
    <div class="lg:col-span-1">
      <SocialMediaWidget :show-social="true" />
    </div>
  </div>

  <!-- Row 5: Full-width widgets -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
    <CoachFollowupWidget
      v-if="showWidget('coachFollowupWidget', 'widgets')"
      class="lg:col-span-2"
    />
    <AthleteActivityWidget
      v-if="isParent && showWidget('athleteActivity', 'widgets')"
      class="lg:col-span-1"
    />
    <AtAGlanceSummary
      v-if="showWidget('atAGlanceSummary', 'widgets')"
      :coaches="coaches"
      :schools="schools"
      :interactions="interactions"
      :offers="offers"
      class="lg:col-span-3"
    />
  </div>
</template>

<script setup lang="ts">
import QuickTasksWidget from "./QuickTasksWidget.vue";
import ContactFrequencyWidget from "./ContactFrequencyWidget.vue";
import SocialMediaWidget from "./SocialMediaWidget.vue";
import CoachFollowupWidget from "./CoachFollowupWidget.vue";
import AthleteActivityWidget from "./AthleteActivityWidget.vue";
import AtAGlanceSummary from "./AtAGlanceSummary.vue";
import type { Coach, School, Interaction, Offer } from "~/types/models";
import type { UserTask } from "~/composables/useUserTasks";

defineProps<{
  tasks: UserTask[];
  coaches: Coach[];
  schools: School[];
  interactions: Interaction[];
  offers: Offer[];
  isParent: boolean;
  showWidget: (widgetKey: string, section: "statsCards" | "widgets") => boolean;
}>();

defineEmits<{
  "add-task": [taskText: string];
  "toggle-task": [taskId: string];
  "delete-task": [taskId: string];
  "clear-completed": [];
}>();
</script>
