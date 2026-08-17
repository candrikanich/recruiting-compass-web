import { ref } from "vue";
import { useAuthFetch } from "./useAuthFetch";

/**
 * Inline write-back for coach-outreach compose (Slice 5c). PATCHes a single
 * editable profile field through /api/athlete/profile-field (athlete-self only,
 * whitelist-guarded server-side). Returns the saved (coerced) value so the
 * caller can re-resolve the template preview.
 */
export const useProfileFieldWrite = (): {
  writeField: (
    athleteUserId: string,
    sourcePath: string,
    value: string | null,
  ) => Promise<string | null>;
  saving: import("vue").Ref<boolean>;
  error: import("vue").Ref<string | null>;
} => {
  const { $fetchAuth } = useAuthFetch();
  const saving = ref(false);
  const error = ref<string | null>(null);

  const writeField = async (
    athleteUserId: string,
    sourcePath: string,
    value: string | null,
  ): Promise<string | null> => {
    saving.value = true;
    error.value = null;
    try {
      const res = await $fetchAuth<{
        success: boolean;
        sourcePath: string;
        value: string | null;
      }>("/api/athlete/profile-field", {
        method: "PATCH",
        body: { athleteUserId, sourcePath, value },
      });
      return res.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to save";
      throw err;
    } finally {
      saving.value = false;
    }
  };

  return { writeField, saving, error };
};
