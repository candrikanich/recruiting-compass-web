import { ref } from "vue";
import { debounce } from "~/utils/debounce";

export interface NcesSchool {
  nces_id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export interface HighSchoolSelection {
  name: string;
  nces_school_id: string | null;
}

export const useHighSchoolSearch = (stateHint?: string) => {
  const results = ref<NcesSchool[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const _doSearch = async (q: string) => {
    if (!q || q.trim().length < 2) {
      results.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (stateHint) params.set("state", stateHint);
      results.value = await $fetch<NcesSchool[]>(
        `/api/schools/high-school-search?${params.toString()}`,
      );
    } catch {
      error.value = "School search unavailable";
      results.value = [];
    } finally {
      loading.value = false;
    }
  };

  const search = debounce(_doSearch, 300);

  const selectSchool = (school: NcesSchool): HighSchoolSelection => ({
    name: school.name,
    nces_school_id: school.nces_id,
  });

  const clearResults = () => {
    results.value = [];
  };

  return { results, loading, error, search, selectSchool, clearResults };
};
