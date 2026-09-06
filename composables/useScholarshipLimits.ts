import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";
import {
  selectScholarshipLimit,
  formatScholarshipLine,
  type ScholarshipLimit,
} from "~/utils/scholarshipLimits";

const logger = createClientLogger("useScholarshipLimits");

/** PostgREST-ish error shape (mirrors the house PGRST205 check). */
interface FetchError {
  code?: string;
  message?: string;
}

/** scholarship_limits is global reference config — cache once per page load. */
let limitsCache: ScholarshipLimit[] | null = null;

/** Test-only: clear the module-level cache between cases. */
export const __resetScholarshipLimitsCache = (): void => {
  limitsCache = null;
};

/**
 * Loads NCAA scholarship-limit config. Fails open everywhere (missing
 * table, load error, unmatched sport/division) — an empty/unseeded table
 * must never break the school detail page, just hide the scholarship line.
 */
export const useScholarshipLimits = () => {
  const supabase = useSupabase();

  const loadLimits = async (force = false): Promise<ScholarshipLimit[]> => {
    if (limitsCache && !force) return limitsCache;
    try {
      const { data, error } = (await supabase
        .from("scholarship_limits")
        .select("sport, division, total, head_count, equivalency, notes")) as {
        data: ScholarshipLimit[] | null;
        error: FetchError | null;
      };

      if (error) {
        if (
          error.code === "PGRST205" ||
          error.message?.includes("scholarship_limits")
        ) {
          return limitsCache ?? [];
        }
        throw error;
      }
      limitsCache = data ?? [];
      return limitsCache;
    } catch (err) {
      logger.error("Load scholarship-limits error:", err);
      return limitsCache ?? [];
    }
  };

  return { loadLimits, selectScholarshipLimit, formatScholarshipLine };
};
