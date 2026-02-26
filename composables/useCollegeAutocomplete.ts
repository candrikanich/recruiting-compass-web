import { ref } from "vue";
import type {
  CollegeSearchResult,
  CollegeScorecardResponse,
  CollegeScorecardSchool,
} from "~/types/api";

export const useCollegeAutocomplete = () => {
  const results = ref<CollegeSearchResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Format website URL to include protocol
   * Prepends http:// to URLs that don't have a protocol
   */
  const formatWebsite = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // If already has protocol, return as-is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // Prepend http:// to URLs without protocol
    return `http://${url}`;
  };

  /**
   * Transform College Scorecard API response to our CollegeSearchResult format
   */
  const transformResult = (
    school: CollegeScorecardSchool,
  ): CollegeSearchResult => {
    const city = school["school.city"] || "";
    const state = school["school.state"] || "";
    const location = [city, state].filter(Boolean).join(", ");

    return {
      id: String(school.id),
      name: school["school.name"],
      city,
      state,
      location,
      website: formatWebsite(school["school.school_url"]),
    };
  };

  /**
   * Search colleges using College Scorecard API
   * Minimum 3 characters required to avoid excessive API calls
   */
  const searchColleges = async (query: string): Promise<void> => {
    // Clear previous results
    results.value = [];
    error.value = null;

    // Validate query length
    if (query.length < 3) {
      return;
    }

    loading.value = true;

    try {
      const params = new URLSearchParams({
        q: query,
        fields:
          "id,school.name,school.city,school.state,school.school_url,location.lat,location.lon,latest.admissions.admission_rate.overall,latest.student.size,program_percentage.mathematics,enrollment.all,net_price.public.by_income_level.110001-plus,tuition.in_state,tuition.out_of_state,alias,program_reporter.programs_offered,booksupply,roomboard.oncampus,otherexpense.oncampus,main_campus,carnegie_size_setting",
        per_page: "10",
      });

      const url = `/api/colleges/search?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          error.value = "Too many requests. Please try again in a moment.";
        } else {
          error.value =
            "Unable to search colleges. Please check your connection.";
        }
        return;
      }

      const data = (await response.json()) as CollegeScorecardResponse;

      if (!data.results || data.results.length === 0) {
        error.value = null; // No error, just no results
        results.value = [];
        return;
      }

      // Transform and deduplicate by ID
      const uniqueSchools = new Map<string, CollegeScorecardSchool>();
      for (const school of data.results) {
        const key = String(school.id);
        if (!uniqueSchools.has(key)) {
          uniqueSchools.set(key, school);
        }
      }

      results.value = Array.from(uniqueSchools.values()).map(transformResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = `Failed to search colleges: ${errorMessage}`;
      results.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    results,
    loading,
    error,
    searchColleges,
  };
};
