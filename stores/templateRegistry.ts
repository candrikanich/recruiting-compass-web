import { defineStore } from "pinia";
import { ref } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { createClientLogger } from "~/utils/logger";
import type { RegistryVar } from "~/utils/templateResolver";

const logger = createClientLogger("templateRegistry");

/** PostgREST-ish error shape (avoids `any` while matching the house PGRST205 check). */
interface FetchError {
  code?: string;
  message?: string;
}

/**
 * `template_variables` is global reference data — cache it once per session in a
 * store (devtools-visible, reset per test via a fresh Pinia) rather than a module
 * singleton. Replaces the old module-level `registryCache` in useTemplateResolver.
 */
export const useTemplateRegistryStore = defineStore("templateRegistry", () => {
  const vars = ref<RegistryVar[] | null>(null);

  const load = async (force = false): Promise<RegistryVar[]> => {
    if (vars.value && !force) return vars.value;
    const supabase = useSupabase();
    try {
      const { data, error } = (await supabase
        .from("template_variables")
        .select(
          "key, source_type, source_path, category, is_required_default, label",
        )) as {
        data: RegistryVar[] | null;
        error: FetchError | null;
      };

      if (error) {
        if (
          error.code === "PGRST205" ||
          error.message?.includes("template_variables")
        ) {
          return vars.value ?? [];
        }
        throw error;
      }
      vars.value = data ?? [];
      return vars.value;
    } catch (err) {
      logger.error("Load registry error:", err);
      return vars.value ?? [];
    }
  };

  return { vars, load };
});
