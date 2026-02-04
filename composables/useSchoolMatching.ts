import { usePreferenceManager } from "./usePreferenceManager";
import { calculateDistance } from "~/utils/distance";
import type { School, SchoolPreference } from "~/types/models";

export interface MatchResult {
  score: number;
  matchedCriteria: string[];
  missedCriteria: string[];
  dealbreakers: string[];
  hasDealbreakers: boolean;
}

export const useSchoolMatching = () => {
  const { getSchoolPreferences, getHomeLocation } = usePreferenceManager();

  /**
   * Calculate match score for a school against user preferences
   */
  const calculateMatchScore = (school: School): MatchResult => {
    const schoolPrefs = getSchoolPreferences();
    const prefs = schoolPrefs?.preferences || [];

    if (prefs.length === 0) {
      return {
        score: 0,
        matchedCriteria: [],
        missedCriteria: [],
        dealbreakers: [],
        hasDealbreakers: false,
      };
    }

    let totalWeight = 0;
    let matchedWeight = 0;
    const matchedCriteria: string[] = [];
    const missedCriteria: string[] = [];
    const dealbreakers: string[] = [];

    prefs.forEach((pref, index) => {
      // Weight based on priority (higher priority = more weight)
      // Priority 1 = weight 10, Priority 2 = weight 8, etc.
      const weight = Math.max(10 - index, 1);
      totalWeight += weight;

      const matches = evaluatePreference(school, pref);

      if (matches) {
        matchedWeight += weight;
        matchedCriteria.push(pref.type);
      } else {
        missedCriteria.push(pref.type);
        if (pref.is_dealbreaker) {
          dealbreakers.push(pref.type);
        }
      }
    });

    return {
      score:
        totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0,
      matchedCriteria,
      missedCriteria,
      dealbreakers,
      hasDealbreakers: dealbreakers.length > 0,
    };
  };

  /**
   * Evaluate a single preference against a school
   */
  const evaluatePreference = (
    school: School,
    pref: SchoolPreference,
  ): boolean => {
    switch (pref.type) {
      case "max_distance_miles":
        return evaluateDistance(school, pref.value as number);

      case "division":
        if (!school.division) return false;
        return (pref.value as string[]).includes(school.division);

      case "conference_type":
        if (!school.conference) return false;
        return evaluateConferenceType(
          school.conference,
          pref.value as string[],
        );

      case "min_academic_rating": {
        const academicRating = getAcademicRating(school);
        return academicRating >= (pref.value as number);
      }

      case "school_size": {
        const schoolSize = pref.value as string;
        return evaluateSchoolSize(school, schoolSize);
      }

      case "scholarship_required":
        // This would need offer data - for now, assume matches
        return true;

      case "preferred_regions":
        return evaluateRegion(school, pref.value as string[]);

      case "preferred_states":
        return evaluateState(school, pref.value as string[]);

      default:
        // Custom preferences - check school notes/tags
        return false;
    }
  };

  /**
   * Evaluate distance preference
   */
  const evaluateDistance = (school: School, maxMiles: number): boolean => {
    const home = getHomeLocation();
    if (!home?.latitude || !home?.longitude) return true; // Can't evaluate without home

    const academicInfo = school.academic_info as {
      latitude?: number;
      longitude?: number;
    } | null;
    if (!academicInfo?.latitude || !academicInfo?.longitude) return true; // Can't evaluate without school coords

    const distance = calculateDistance(
      { latitude: home.latitude, longitude: home.longitude },
      { latitude: academicInfo.latitude, longitude: academicInfo.longitude },
    );

    return distance <= maxMiles;
  };

  /**
   * Get academic rating (1-5) from school data
   */
  const getAcademicRating = (school: School): number => {
    const academicInfo = school.academic_info as {
      admission_rate?: number;
    } | null;
    if (!academicInfo?.admission_rate) return 3; // Default to middle

    // Lower admission rate = more selective = higher rating
    const rate = academicInfo.admission_rate;
    if (rate < 0.15) return 5; // Elite (<15%)
    if (rate < 0.3) return 4; // Excellent
    if (rate < 0.5) return 3; // Very Good
    if (rate < 0.7) return 2; // Good
    return 1; // Basic
  };

  /**
   * Evaluate conference type
   */
  const evaluateConferenceType = (
    conference: string,
    preferredTypes: string[],
  ): boolean => {
    const power4 = ["SEC", "Big Ten", "Big 12", "ACC"];
    const group5 = [
      "AAC",
      "Mountain West",
      "Sun Belt",
      "MAC",
      "Conference USA",
    ];

    const confUpper = conference.toUpperCase();

    for (const type of preferredTypes) {
      if (
        type === "Power 4" &&
        power4.some((c) => confUpper.includes(c.toUpperCase()))
      ) {
        return true;
      }
      if (
        type === "Group of 5" &&
        group5.some((c) => confUpper.includes(c.toUpperCase()))
      ) {
        return true;
      }
      if (type === "Mid-Major" || type === "Small Conference") {
        // Not in power conferences
        if (!power4.some((c) => confUpper.includes(c.toUpperCase()))) {
          return true;
        }
      }
    }
    return false;
  };

  /**
   * Evaluate school size
   */
  const evaluateSchoolSize = (
    school: School,
    sizeCategory: string,
  ): boolean => {
    const academicInfo = school.academic_info as { enrollment?: number } | null;
    if (!academicInfo?.enrollment) return true; // Can't evaluate

    const enrollment = academicInfo.enrollment;

    switch (sizeCategory) {
      case "small":
        return enrollment < 5000;
      case "medium":
        return enrollment >= 5000 && enrollment < 15000;
      case "large":
        return enrollment >= 15000 && enrollment < 30000;
      case "very_large":
        return enrollment >= 30000;
      default:
        return true;
    }
  };

  /**
   * Evaluate region preference
   */
  const evaluateRegion = (
    school: School,
    preferredRegions: string[],
  ): boolean => {
    if (!school.location) return false;

    const location = school.location.toLowerCase();
    const regionStates: Record<string, string[]> = {
      northeast: ["me", "nh", "vt", "ma", "ri", "ct", "ny", "nj", "pa"],
      southeast: [
        "md",
        "de",
        "va",
        "wv",
        "nc",
        "sc",
        "ga",
        "fl",
        "al",
        "tn",
        "ky",
      ],
      midwest: [
        "oh",
        "in",
        "il",
        "mi",
        "wi",
        "mn",
        "ia",
        "mo",
        "nd",
        "sd",
        "ne",
        "ks",
      ],
      southwest: ["tx", "ok", "ar", "la", "nm", "az"],
      "west coast": ["ca"],
      "pacific northwest": ["or", "wa", "id", "mt"],
    };

    for (const region of preferredRegions) {
      const states = regionStates[region.toLowerCase()] || [];
      if (
        states.some(
          (st) => location.includes(st) || location.includes(getStateName(st)),
        )
      ) {
        return true;
      }
    }
    return false;
  };

  /**
   * Evaluate state preference
   */
  const evaluateState = (
    school: School,
    preferredStates: string[],
  ): boolean => {
    if (!school.location) return false;
    const location = school.location.toLowerCase();
    return preferredStates.some(
      (st) =>
        location.includes(st.toLowerCase()) ||
        location.includes(getStateName(st.toLowerCase())),
    );
  };

  /**
   * Get state name from abbreviation
   */
  const getStateName = (abbr: string): string => {
    const stateNames: Record<string, string> = {
      al: "alabama",
      ak: "alaska",
      az: "arizona",
      ar: "arkansas",
      ca: "california",
      co: "colorado",
      ct: "connecticut",
      de: "delaware",
      fl: "florida",
      ga: "georgia",
      hi: "hawaii",
      id: "idaho",
      il: "illinois",
      in: "indiana",
      ia: "iowa",
      ks: "kansas",
      ky: "kentucky",
      la: "louisiana",
      me: "maine",
      md: "maryland",
      ma: "massachusetts",
      mi: "michigan",
      mn: "minnesota",
      ms: "mississippi",
      mo: "missouri",
      mt: "montana",
      ne: "nebraska",
      nv: "nevada",
      nh: "new hampshire",
      nj: "new jersey",
      nm: "new mexico",
      ny: "new york",
      nc: "north carolina",
      nd: "north dakota",
      oh: "ohio",
      ok: "oklahoma",
      or: "oregon",
      pa: "pennsylvania",
      ri: "rhode island",
      sc: "south carolina",
      sd: "south dakota",
      tn: "tennessee",
      tx: "texas",
      ut: "utah",
      vt: "vermont",
      va: "virginia",
      wa: "washington",
      wv: "west virginia",
      wi: "wisconsin",
      wy: "wyoming",
    };
    return stateNames[abbr] || abbr;
  };

  /**
   * Get match badge info for display
   */
  const getMatchBadge = (score: number, hasDealbreakers: boolean) => {
    if (hasDealbreakers) {
      return { label: "Dealbreaker", class: "badge badge-danger", icon: "⚠️" };
    }
    if (score >= 80) {
      return { label: "Great Match", class: "badge badge-success", icon: "✓" };
    }
    if (score >= 60) {
      return { label: "Good Match", class: "badge badge-warning", icon: "○" };
    }
    return null; // No badge for lower scores
  };

  return {
    calculateMatchScore,
    evaluatePreference,
    getMatchBadge,
    getAcademicRating,
  };
};
