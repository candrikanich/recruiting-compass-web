/**
 * Global singleton for family context
 * Ensures all composables share the same activeFamily instance
 *
 * IMPORTANT: This singleton should only be used as a fallback when inject() fails.
 * The app.vue provider should always take precedence.
 * If this is being created, it indicates an injection issue that should be debugged.
 */
import { useActiveFamily } from "./useActiveFamily";

export type UseActiveFamilyReturn = ReturnType<typeof useActiveFamily>;

let familyContextInstance: UseActiveFamilyReturn | null = null;

/**
 * Get or create the shared family context instance
 * This ensures all composables use the same instance with shared state
 */
export const useFamilyContext = () => {
  if (!familyContextInstance) {
    console.warn(
      "[useFamilyContext] Creating singleton - injection should be preferred! " +
        "Check that activeFamily is being provided at app.vue level.",
    );
    familyContextInstance = useActiveFamily();
  }
  return familyContextInstance;
};
