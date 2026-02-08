import { onUnmounted } from "vue";
import type { Ref } from "vue";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const useFocusTrap = (containerRef: Ref<HTMLElement | null>) => {
  let previouslyFocusedElement: HTMLElement | null = null;

  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.value) return [];
    return Array.from(
      containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  const activate = () => {
    previouslyFocusedElement = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeydown);

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  const deactivate = () => {
    document.removeEventListener("keydown", handleKeydown);
    previouslyFocusedElement?.focus();
    previouslyFocusedElement = null;
  };

  onUnmounted(deactivate);

  return { activate, deactivate };
};
