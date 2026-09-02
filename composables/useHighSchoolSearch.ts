import { ref } from "vue";
import { debounce } from "~/utils/debounce";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("high-school-search");

export interface NcesSchool {
  nces_id: string;
  name: string;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface HighSchoolSelection {
  name: string;
  nces_school_id: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export const useHighSchoolSearch = (stateHint?: string) => {
  const results = ref<NcesSchool[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Sequence token: guards against an older, slower search resolving after
  // a newer one (rapid typing) and clobbering fresher results.
  let searchSequence = 0;

  const _doSearch = async (q: string) => {
    const requestSequence = ++searchSequence;
    if (!q || q.trim().length < 2) {
      results.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (stateHint) params.set("state", stateHint);
      const response = await $fetch<NcesSchool[]>(
        `/api/schools/high-school-search?${params.toString()}`,
      );
      if (requestSequence !== searchSequence) return;
      results.value = response;
    } catch (err) {
      if (requestSequence !== searchSequence) return;
      logger.warn("High school search failed", err);
      error.value = "School search unavailable";
      results.value = [];
    } finally {
      if (requestSequence === searchSequence) {
        loading.value = false;
      }
    }
  };

  const search = debounce(_doSearch, 300);

  const selectSchool = (school: NcesSchool): HighSchoolSelection => ({
    name: school.name,
    nces_school_id: school.nces_id,
    city: school.city,
    state: school.state,
    zip: school.zip,
  });

  const clearResults = () => {
    results.value = [];
  };

  return { results, loading, error, search, selectSchool, clearResults };
};
