<script setup lang="ts">
import { computed } from "vue";

export type DialogVariant = "danger" | "warning";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
    confirming?: boolean;
  }>(),
  {
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    confirming: false,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const confirmColor = computed(() => {
  switch (props.variant) {
    case "danger":
      return "red" as const;
    case "warning":
      return "orange" as const;
    default: {
      const _exhaustive: never = props.variant;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <DesignSystemModal
    :open="isOpen"
    :title="title"
    size="sm"
    :tone="variant"
    :show-close="false"
    :busy="confirming"
    :close-on-backdrop="!confirming"
    @close="emit('cancel')"
  >
    <p class="text-sm text-brand-slate-600">{{ message }}</p>
    <template #footer>
      <DesignSystemButton
        variant="outline"
        color="slate"
        :disabled="confirming"
        @click="emit('cancel')"
      >
        {{ cancelText }}
      </DesignSystemButton>
      <DesignSystemButton
        :color="confirmColor"
        variant="solid"
        :loading="confirming"
        @click="emit('confirm')"
      >
        {{ confirmText }}
      </DesignSystemButton>
    </template>
  </DesignSystemModal>
</template>
