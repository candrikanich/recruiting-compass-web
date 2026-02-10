import { computed, type Ref } from "vue";
import { useUserStore } from "~/stores/user";

/**
 * Reusable composable for private notes editing pattern
 * Used in coach and school detail pages
 *
 * @param item - Ref to the entity (coach, school, etc.) with private_notes field
 * @returns Computed property for reading/writing current user's private note
 *
 * @example
 * const coach = ref<Coach | null>(null);
 * const privateNote = usePrivateNotes(coach);
 *
 * // In template:
 * <textarea v-model="privateNote" />
 */
export function usePrivateNotes<
  T extends { private_notes?: Record<string, unknown> | null },
>(item: Ref<T | null>) {
  const userStore = useUserStore();

  return computed({
    get: (): string => {
      if (!item.value || !userStore.user) return "";
      return String(item.value.private_notes?.[userStore.user.id] || "");
    },
    set: (value: string) => {
      if (!item.value || !userStore.user) return;
      item.value.private_notes = {
        ...(item.value.private_notes || {}),
        [userStore.user.id]: value,
      };
    },
  });
}
