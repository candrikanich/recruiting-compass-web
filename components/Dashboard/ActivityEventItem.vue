<template>
  <div
    :class="[
      'group rounded-lg p-3 transition-colors',
      event.clickable
        ? 'cursor-pointer bg-slate-50 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
        : 'bg-slate-50',
    ]"
    :role="event.clickable ? 'button' : undefined"
    :tabindex="event.clickable ? 0 : undefined"
    :data-testid="`activity-event-item`"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="event.clickable && handleClick()"
  >
    <div class="flex items-start gap-3">
      <div class="mt-0.5 shrink-0 text-2xl">{{ event.icon }}</div>

      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium text-slate-900">
          {{ event.title }}
        </div>
        <div v-if="event.description" class="mt-1 text-sm text-slate-600">
          {{ event.description }}
        </div>
        <div class="mt-1 text-xs text-slate-400">
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
