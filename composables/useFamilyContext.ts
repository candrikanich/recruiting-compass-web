/**
 * Global singleton for family context
 * Ensures all composables share the same activeFamily instance
 *
 * IMPORTANT: This singleton should only be used as a fallback when inject() fails.
 * The app.vue provider should always take precedence.
 * If this is being created, it indicates an injection issue that should be debugged.
 */
import { useActiveFamily, type UseActiveFamilyReturn } from "./useActiveFamily";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useFamilyContext");

let familyContextInstance: UseActiveFamilyReturn | null = null;

/**
 * Get or create the shared family context instance
 * This ensures all composables use the same instance with shared state
 */
export const useFamilyContext = () => {
  if (!familyContextInstance) {
    logger.warn(
      "[useFamilyContext] Creating singleton - injection should be preferred! " +
        "Check that activeFamily is being provided at app.vue level.",
    );
    familyContextInstance = useActiveFamily();
  }
  return familyContextInstance;
};

/**
 * Reset the shared family-context singleton's internal state.
 *
 * Intentionally keeps the same object reference (does NOT null it out) —
 * app.vue's `provide("activeFamily", ...)` and every already-injected
 * component/composable hold onto this exact object, so replacing it would
 * leave them pointing at stale, un-reset state. Called by the auth lifecycle
 * orchestrator on logout/account-switch.
 */
export const resetFamilyContext = () => {
  familyContextInstance?.reset();
};
