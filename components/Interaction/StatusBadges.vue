<script setup lang="ts">
import { computed } from "vue";
import Badge from "~/components/DesignSystem/Badge.vue";
import {
  getSentimentBadgeColor,
  getDirectionBadgeColor,
  getTypeBadgeColor,
} from "~/utils/sentiment";

interface Props {
  type: string;
  direction: string;
  sentiment?: string | null;
}

const props = defineProps<Props>();

const typeColor = computed(() => getTypeBadgeColor(props.type));
const directionColor = computed(() => getDirectionBadgeColor(props.direction));
const sentimentColor = computed(() => getSentimentBadgeColor(props.sentiment));
</script>

<template>
  <div
    class="flex gap-2 flex-wrap"
    role="region"
    aria-label="Interaction status"
  >
    <Badge :color="typeColor" variant="light">
      <span class="sr-only">Type:</span>{{ type }}
    </Badge>
    <Badge :color="directionColor" variant="light">
      <span class="sr-only">Direction:</span>{{ direction }}
    </Badge>
    <Badge v-if="sentiment" :color="sentimentColor" variant="light">
      <span class="sr-only">Sentiment:</span>{{ sentiment }}
    </Badge>
  </div>
</template>
