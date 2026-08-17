import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";
import {
  evaluateContactWindow,
  filterTemplatesByWindow,
  type ContactWindowRule,
  type ContactWindowInput,
  type ContactWindowResult,
} from "~/utils/contactWindow";

const logger = createClientLogger("useContactWindow");

/** PostgREST-ish error shape (mirrors the house PGRST205 check). */
interface FetchError {
  code?: string;
  message?: string;
}

/** contact_window_rules is global reference config — cache once per page load. */
let rulesCache: ContactWindowRule[] | null = null;

/** Test-only: clear the module-level rules cache between cases. */
export const __resetContactWindowRulesCache = (): void => {
  rulesCache = null;
};

/**
 * Loads the per-sport contact-window config and evaluates the pre-vs-open
 * window for an athlete. Fails open everywhere (missing table, load error,
 * unknown sport/division) — a config gap must never gate outreach.
 */
export const useContactWindow = () => {
  const supabase = useSupabase();

  const loadRules = async (force = false): Promise<ContactWindowRule[]> => {
    if (rulesCache && !force) return rulesCache;
    try {
      const { data, error } = (await supabase
        .from("contact_window_rules")
        .select(
          "sport, division, rule_kind, reference, window_date, notes",
        )) as {
        data: ContactWindowRule[] | null;
        error: FetchError | null;
      };

      if (error) {
        if (
          error.code === "PGRST205" ||
          error.message?.includes("contact_window_rules")
        ) {
          return rulesCache ?? [];
        }
        throw error;
      }
      rulesCache = data ?? [];
      return rulesCache;
    } catch (err) {
      logger.error("Load contact-window rules error:", err);
      return rulesCache ?? [];
    }
  };

  const evaluate = async (
    input: ContactWindowInput,
  ): Promise<ContactWindowResult> => {
    const rules = await loadRules();
    return evaluateContactWindow(rules, input);
  };

  return { loadRules, evaluate, filterTemplatesByWindow };
};
