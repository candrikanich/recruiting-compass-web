import { ref, computed, watch } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";
import { useAutoSave } from "~/composables/useAutoSave";
import {
  shouldClearPositionOnSportChange,
  reconcilePositionOptions,
  normalizePosition as normalizePositionForSport,
  normalizePositions as normalizePositionsForSport,
} from "~/utils/positions/canonical";
import { formatPhoneDisplay, toStoredPhone } from "~/utils/phone";
import {
  calculateProfileCompleteness,
  isHomeLocationPresent,
} from "~/utils/profileCompletenessCalculation";
import { useVideoLinks } from "~/composables/useVideoLinks";
import { useCoreCourses } from "~/composables/useCoreCourses";
import {
  useTravelTeams,
  buildLegacyTravelTeam,
} from "~/composables/useTravelTeams";
import { useSocialHandles } from "~/composables/useSocialHandles";
import {
  BATS_OPTIONS,
  THROWS_OPTIONS,
  CAMPUS_SIZE_OPTIONS,
  GENDER_OPTIONS,
  COST_SENSITIVITY_OPTIONS,
  SOCIAL_INPUTS,
  GRADE_LEVELS,
} from "~/utils/playerDetails/formOptions";
import type { PlayerDetails, TravelTeam } from "~/types/models";

/**
 * Form state, autosave wiring, and field-editing logic for the
 * player-details settings page (all tabs).
 */
export function usePlayerDetailsForm() {
  const {
    isLoading,
    getPlayerDetails,
    setPlayerDetails,
    loadAllPreferences,
    getHomeLocation,
  } = usePreferenceManager();
  const { links: videoLinks, load: loadVideoLinks } = useVideoLinks();
  const { commonSports, getPositionsBySport } = useSportsPositionLookup();

  const heightFeet = ref<number | undefined>(undefined);
  const heightInches = ref<number | undefined>(undefined);

  const form = ref<PlayerDetails>({
    graduation_year: undefined,
    gender: undefined,
    club_team: "",
    positions: [],
    bats: undefined,
    throws: undefined,
    height_inches: undefined,
    weight_lbs: undefined,
    gpa: undefined,
    sat_score: undefined,
    act_score: undefined,
    ncaa_id: "",
    perfect_game_id: "",
    prep_baseball_id: "",
    prep_baseball_state: "",
    twitter_handle: "",
    instagram_handle: "",
    tiktok_handle: "",
    facebook_url: "",
    phone: "",
    email: "",
    allow_share_phone: false,
    allow_share_email: false,
    school_name: "",
    nces_school_id: "",
    school_address: "",
    school_city: "",
    school_state: "",
    campus_size_preference: undefined,
    cost_sensitivity: undefined,
    ninth_grade_team: "",
    ninth_grade_coach: "",
    tenth_grade_team: "",
    tenth_grade_coach: "",
    eleventh_grade_team: "",
    eleventh_grade_coach: "",
    twelfth_grade_team: "",
    twelfth_grade_coach: "",
    travel_team_year: undefined,
    travel_team_name: "",
    travel_team_coach: "",
    travel_teams: [] as TravelTeam[],
    core_courses: [] as string[],
  });

  const availablePositions = ref<string[]>([]);

  const isBaseballOrSoftball = computed(() => {
    return (
      form.value.primary_sport === "Baseball" ||
      form.value.primary_sport === "Softball"
    );
  });

  // Completeness signals that live outside the player-prefs form (video_links
  // table, location store). Fetched once in load(); they don't change while the
  // athlete edits player details, but the score stays reactive to form edits.
  const hasHighlightVideo = computed(() => videoLinks.value.length > 0);
  const homeState = computed(() => getHomeLocation.value?.state ?? "");

  const hasHomeLocation = ref(false);

  const profileCompleteness = computed(() =>
    calculateProfileCompleteness(form.value, {
      hasHighlightVideo: hasHighlightVideo.value,
      hasHomeLocation: hasHomeLocation.value,
    }),
  );

  const { isSaving, triggerSave } = useAutoSave({
    debounceMs: 1000,
    // Let save failures propagate — useAutoSave's own catch is what surfaces
    // the visible error toast and retains saveError. Swallowing it here would
    // silently hide the failure from the user (form data itself is untouched
    // either way, since form.value is never reset on failure).
    onSave: async () => {
      // Drop blank travel-team rows, then mirror the most-recent one (highest
      // season year) back onto the legacy scalar fields so downstream readers
      // (edit-history labels, template resolver) keep working unchanged.
      const travelTeams = (form.value.travel_teams ?? []).filter(
        (t) => t.year !== undefined || !!t.name || !!t.coach,
      );
      const latest = [...travelTeams].sort(
        (a, b) => (b.year ?? 0) - (a.year ?? 0),
      )[0];
      // positions[] is the ordered source of truth (index 0 = primary). Mirror
      // it back onto the legacy primary_position string every save so every
      // downstream reader (template resolver, completeness, recruiting packet,
      // public profile) stays in sync — this is what permanently reconciles the
      // two stores that used to drift (onboarding primary vs. edited array).
      const normalizedPositions = normalizePositionsForSport(
        form.value.primary_sport,
        form.value.positions,
      );
      const detailsToSave = {
        ...form.value,
        travel_teams: travelTeams,
        travel_team_year: latest?.year,
        travel_team_name: latest?.name ?? "",
        travel_team_coach: latest?.coach ?? "",
        positions: normalizedPositions,
        primary_position: normalizedPositions[0] ?? form.value.primary_position,
        phone: toStoredPhone(form.value.phone) ?? "",
      };
      await setPlayerDetails(detailsToSave);
    },
  });

  // List-editing + social-handle concerns operate on the shared form + autosave.
  const { newCourseInput, addCourse, removeCourse } = useCoreCourses(
    form,
    triggerSave,
  );
  const { addTravelTeam, removeTravelTeam } = useTravelTeams(form, triggerSave);
  const { handleSocialBlur } = useSocialHandles(form, triggerSave);

  watch(
    () => form.value.primary_sport,
    (sport, previousSport) => {
      const canonical = sport ? getPositionsBySport(sport) : [];
      // Only reset the position on a genuine USER sport change — never on the
      // initial load (previousSport === undefined), which would silently wipe a
      // stored value that isn't a canonical option (e.g. "Infielder" from iOS)
      // and cost 10% of profile completeness.
      if (
        shouldClearPositionOnSportChange(
          previousSport,
          sport,
          form.value.primary_position,
          canonical,
        )
      ) {
        form.value.primary_position = undefined;
      }
      availablePositions.value = reconcilePositionOptions(
        canonical,
        form.value.primary_position,
      );
    },
  );

  const graduationYears = computed(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear + i);
  });

  watch([heightFeet, heightInches], ([feet, inches]) => {
    if (feet !== undefined) {
      form.value.height_inches = feet * 12 + (inches || 0);
    }
  });

  const initializeHeight = (totalInches: number | undefined) => {
    if (totalInches) {
      heightFeet.value = Math.floor(totalInches / 12);
      heightInches.value = totalInches % 12;
    }
  };

  const isPositionSelected = (pos: string) =>
    form.value.positions?.includes(pos) || false;

  const togglePosition = (pos: string) => {
    if (!form.value.positions) form.value.positions = [];
    const idx = form.value.positions.indexOf(pos);
    if (idx >= 0) form.value.positions.splice(idx, 1);
    else form.value.positions.push(pos);
  };

  // Reorder the selected positions — index 0 is the athlete's primary, index 1
  // their secondary. Mutates in place so the reactive array reference is stable
  // (autosave mirrors positions[0] back onto primary_position on save).
  const movePosition = (index: number, direction: "up" | "down") => {
    const list = form.value.positions;
    if (!list) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
  };

  const load = async () => {
    await Promise.all([loadAllPreferences(), loadVideoLinks()]);
    hasHomeLocation.value = isHomeLocationPresent(getHomeLocation.value);
    const playerDetails = getPlayerDetails();
    if (playerDetails) {
      if (playerDetails.high_school && !playerDetails.school_name) {
        playerDetails.school_name = playerDetails.high_school;
      }
      // Canonicalize stored positions (legacy abbreviations / coarse buckets
      // like "Infielder" → real full-name positions) so the dropdown, the
      // multi-select, and completeness all agree. Preserve an unresolved value
      // so nothing is silently dropped.
      const canonicalPrimary = normalizePositionForSport(
        playerDetails.primary_sport,
        playerDetails.primary_position,
      );
      form.value = {
        ...form.value,
        ...playerDetails,
        primary_position:
          canonicalPrimary ?? playerDetails.primary_position ?? undefined,
        positions: normalizePositionsForSport(
          playerDetails.primary_sport,
          playerDetails.positions,
        ),
      };
      form.value.phone = formatPhoneDisplay(form.value.phone ?? "");
      form.value.core_courses = playerDetails.core_courses ?? [];
      // Seed the multi-row list from the legacy single-team scalar fields the
      // first time an athlete opens the new UI (no travel_teams stored yet).
      form.value.travel_teams =
        playerDetails.travel_teams && playerDetails.travel_teams.length > 0
          ? playerDetails.travel_teams
          : buildLegacyTravelTeam(playerDetails);
      initializeHeight(playerDetails.height_inches);
      if (form.value.primary_sport) {
        availablePositions.value = reconcilePositionOptions(
          getPositionsBySport(form.value.primary_sport),
          form.value.primary_position,
        );
      }
    }
  };

  return {
    isLoading,
    form,
    heightFeet,
    heightInches,
    availablePositions,
    isBaseballOrSoftball,
    profileCompleteness,
    isSaving,
    saving: ref(false),
    triggerSave,
    graduationYears,
    commonSports,
    isPositionSelected,
    togglePosition,
    movePosition,
    newCourseInput,
    addCourse,
    removeCourse,
    addTravelTeam,
    removeTravelTeam,
    handleSocialBlur,
    socialInputs: SOCIAL_INPUTS,
    gradeLevels: GRADE_LEVELS,
    BATS_OPTIONS,
    THROWS_OPTIONS,
    CAMPUS_SIZE_OPTIONS,
    COST_SENSITIVITY_OPTIONS,
    GENDER_OPTIONS,
    homeState,
    load,
  };
}
