<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";

export type ModalSize = "sm" | "md" | "lg" | "full";
export type ModalTone = "default" | "danger" | "warning";

interface Props {
  open: boolean;
  title?: string;
  /** Used when `title` is omitted so the dialog still has an accessible name. */
  ariaLabel?: string;
  size?: ModalSize;
  tone?: ModalTone;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  busy?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  tone: "default",
  showClose: true,
  closeOnBackdrop: true,
  busy: false,
});

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);
const titleId = useId();
const bodyId = useId();

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  full: "max-w-[min(96vw,72rem)]",
};

const toneClasses: Record<ModalTone, string> = {
  default: "border-brand-slate-200",
  danger: "border-l-4 border-brand-red-500",
  warning: "border-l-4 border-brand-orange-500",
};

function sizeClass(size: ModalSize): string {
  switch (size) {
    case "sm":
    case "md":
    case "lg":
    case "full":
      return sizeClasses[size];
    default: {
      const _exhaustive: never = size;
      return _exhaustive;
    }
  }
}

const labelledBy = computed(() => (props.title ? titleId : undefined));
const accessibleName = computed(() =>
  props.title ? undefined : props.ariaLabel,
);

watch(
  dialogRef,
  async (el) => {
    if (!el) return;
    await nextTick();
    el.showModal?.();
  },
  { flush: "post" },
);

function handleCancel(event: Event) {
  event.preventDefault();
  if (!props.busy) emit("close");
}

function handleBackdropClick(event: MouseEvent) {
  if (!props.closeOnBackdrop || props.busy) return;
  if (event.target === dialogRef.value) emit("close");
}
</script>

<template>
  <Transition name="ds-modal">
    <dialog
      v-if="open"
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy"
      :aria-label="accessibleName"
      :aria-describedby="bodyId"
      :aria-busy="busy ? 'true' : undefined"
      class="w-[calc(100%-2rem)] rounded-xl bg-white p-0 shadow-lg backdrop:bg-black/50"
      :class="[sizeClass(size), toneClasses[tone]]"
      @cancel="handleCancel"
      @click="handleBackdropClick"
    >
      <div class="flex max-h-[min(90vh,40rem)] flex-col">
        <div
          class="flex items-start justify-between gap-3 border-b border-brand-slate-200 px-5 py-4"
        >
          <h2
            v-if="title"
            :id="titleId"
            class="text-lg font-semibold text-brand-slate-900"
          >
            {{ title }}
          </h2>
          <span v-else :id="titleId" class="sr-only">{{ ariaLabel }}</span>
          <DesignSystemButton
            v-if="showClose"
            variant="ghost"
            color="slate"
            size="sm"
            :disabled="busy"
            aria-label="Close dialog"
            @click="emit('close')"
          >
            <UIcon
              name="i-heroicons-x-mark"
              class="h-5 w-5"
              aria-hidden="true"
            />
          </DesignSystemButton>
        </div>

        <div
          :id="bodyId"
          class="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-brand-slate-700"
        >
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="flex flex-col-reverse gap-2 border-t border-brand-slate-200 px-5 py-4 sm:flex-row sm:justify-end"
        >
          <slot name="footer" />
        </div>
      </div>
    </dialog>
  </Transition>
</template>

<style scoped>
.ds-modal-enter-active,
.ds-modal-leave-active {
  transition: opacity 0.2s ease;
}

.ds-modal-enter-from,
.ds-modal-leave-to {
  opacity: 0;
}
</style>
