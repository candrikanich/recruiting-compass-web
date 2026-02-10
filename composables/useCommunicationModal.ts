import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useCommunication } from "~/composables/useCommunication";

/**
 * Composable for managing communication panel modal with focus trap
 * Extracted from coach detail page to reduce complexity
 *
 * @returns Dialog ref, panel visibility state, communication functions, and close handler
 *
 * @example
 * const { dialogRef, showPanel, openCommunication, handleClose } = useCommunicationModal();
 *
 * // In template:
 * <div ref="dialogRef" v-if="showPanel">
 *   <CommunicationPanel @close="handleClose" />
 * </div>
 */
export function useCommunicationModal() {
  const dialogRef = ref<HTMLElement | null>(null);
  const {
    showPanel,
    communicationType,
    openCommunication,
    handleInteractionLogged,
  } = useCommunication();

  const { activate, deactivate } = useFocusTrap(dialogRef);

  // Watch for panel visibility changes to manage focus trap
  watch(showPanel, async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  });

  const handleClose = () => {
    deactivate();
    showPanel.value = false;
  };

  return {
    dialogRef,
    showPanel,
    communicationType,
    openCommunication,
    handleInteractionLogged,
    handleClose,
  };
}
