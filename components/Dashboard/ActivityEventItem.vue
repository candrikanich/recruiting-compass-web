<template>
  <div
    :class="[
      'p-3 rounded-lg transition-colors group',
      event.clickable
        ? 'cursor-pointer bg-slate-50 hover:bg-slate-100'
        : 'bg-slate-50',
    ]"
    :data-testid="`activity-event-item`"
    @click="handleClick"
  >
    <div class="flex items-start gap-3">
      <div class="text-2xl flex-shrink-0 mt-0.5">{{ event.icon }}</div>

      <div class="flex-1 min-w-0">
        <div class="text-slate-900 font-medium text-sm truncate">
          {{ event.title }}
        </div>
        <div v-if="event.description" class="text-slate-600 text-sm mt-1">
          {{ event.description }}
        </div>
        <div class="text-slate-400 text-xs mt-1">
          {{ event.metadata?.relativeTime || "Recently" }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "#app";
import type { ActivityEvent } from "~/composables/useActivityFeed";

interface Props {
  event: ActivityEvent;
}

const props = defineProps<Props>();
const router = useRouter();

const handleClick = (): void => {
  if (props.event.clickable && props.event.clickUrl) {
    router.push(props.event.clickUrl);
  }
};
</script>
