<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import type { LoadingStateVariant } from "./LoadingState.vue";

interface Props {
  loading?: boolean;
  error?: Error | string | null;
  empty?: boolean;
  loadingMessage?: string;
  loadingVariant?: LoadingStateVariant;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: Component;
  emptyActionText?: string;
  emptyActionHref?: string;
  errorTitle?: string;
  retryable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  empty: false,
  loadingMessage: "Loading...",
  loadingVariant: "spinner",
  emptyTitle: "Nothing here yet",
  emptyDescription: "",
  errorTitle: "Something went wrong",
  retryable: true,
});

const emit = defineEmits<{
  retry: [];
  "empty-action": [];
}>();

type Phase = "loading" | "error" | "empty" | "ready";

const phase = computed<Phase>(() => {
  if (props.loading) return "loading";
  if (props.error) return "error";
  if (props.empty) return "empty";
  return "ready";
});
</script>

<template>
  <DesignSystemLoadingState
    v-if="phase === 'loading'"
    :message="loadingMessage"
    :variant="loadingVariant"
  />
  <div v-else-if="phase === 'error'">
    <slot name="error">
      <DesignSystemErrorState
        :error="error"
        :title="errorTitle"
        :retryable="retryable"
        @retry="emit('retry')"
      />
    </slot>
  </div>
  <div v-else-if="phase === 'empty'">
    <slot name="empty">
      <DesignSystemEmptyState
        :title="emptyTitle"
        :description="emptyDescription"
        :icon="emptyIcon"
        :action-text="emptyActionText"
        :action-href="emptyActionHref"
        @action="emit('empty-action')"
      >
        <template v-if="$slots['empty-icon']" #icon>
          <slot name="empty-icon" />
        </template>
        <template v-if="$slots['empty-action']" #action>
          <slot name="empty-action" />
        </template>
      </DesignSystemEmptyState>
    </slot>
  </div>
  <div v-else>
    <slot />
  </div>
</template>
