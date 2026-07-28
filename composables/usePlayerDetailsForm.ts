import { ref, computed, watch } from "vue";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useAppToast } from "~/composables/useAppToast";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";
import { useAutoSave } from "~/composables/useAutoSave";
import { normalizePositions } from "~/utils/positions";
import { normalizeHandle, type SocialPlatform } from "~/utils/social";
import { calculateProfileCompleteness } from "~/utils/profileCompletenessCalculation";
import type { PlayerDetails, VideoLink } from "~/types/models";

/**
 * Form state, autosave wiring, and field-editing logic for the
 * player-details settings page (all tabs).
 */
export function usePlayerDetailsForm() {
  const { isLoading, getPlayerDetails, setPlayerDetails, loadAllPreferences } =
    usePreferenceManager();
  const { showToast } = useAppToast();
  const { commonSports, getPositionsBySport } = useSportsPositionLookup();

  const BATS_OPTIONS = [
    { value: "R", label: "Right" },
    { value: "L", label: "Left" },
    { value: "S", label: "Switch" },
  ] as const;

  const THROWS_OPTIONS = [
    { value: "R", label: "Right" },
    { value: "L", label: "Left" },
  ] as const;

  const CAMPUS_SIZE_OPTIONS = [
    { value: "small" as const, label: "Small (<5K)" },
    { value: "medium" as const, label: "Mid (5K–25K)" },
    { value: "large" as const, label: "Large (25K+)" },
  ];

  const COST_SENSITIVITY_OPTIONS = [
    { value: "high" as const, label: "High" },
    { value: "medium" as const, label: "Medium" },
    { value: "low" as const, label: "Low" },
  ];

  const heightFeet = ref<number | undefined>(undefined);
  const heightInches = ref<number | undefined>(undefined);

  const form = ref<PlayerDetails>({
    graduation_year: undefined,
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
    video_links: [] as VideoLink[],
    core_courses: [] as string[],
  });

  const availablePositions = ref<string[]>([]);

  const isBaseballOrSoftball = computed(() => {
    return (
      form.value.primary_sport === "Baseball" ||
      form.value.primary_sport === "Softball"
    );
  });

  const profileCompleteness = computed(() =>
    calculateProfileCompleteness(form.value),
  );

  const { isSaving, triggerSave } = useAutoSave({
    debounceMs: 1000,
    // Let save failures propagate — useAutoSave's own catch is what surfaces
    // the visible error toast and retains saveError. Swallowing it here would
    // silently hide the failure from the user (form data itself is untouched
    // either way, since form.value is never reset on failure).
    onSave: async () => {
      const detailsToSave = {
        ...form.value,
        positions: normalizePositions(form.value.positions),
      };
      await setPlayerDetails(detailsToSave);
    },
  });

  watch(
    () => form.value.primary_sport,
    (sport) => {
      if (sport) {
        availablePositions.value = getPositionsBySport(sport);
        if (
          !availablePositions.value.includes(form.value.primary_position || "")
        ) {
          form.value.primary_position = undefined;
        }
      } else {
        availablePositions.value = [];
      }
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

  const addVideoLink = () => {
    form.value.video_links = [
      ...(form.value.video_links ?? []),
      { platform: "hudl", url: "", title: "" },
    ];
  };

  const removeVideoLink = (idx: number) => {
    form.value.video_links = (form.value.video_links ?? []).filter(
      (_, i) => i !== idx,
    );
    triggerSave();
  };

  const newCourseInput = ref("");

  const addCourse = () => {
    const trimmed = newCourseInput.value.trim();
    if (!trimmed || form.value.core_courses?.includes(trimmed)) return;
    form.value.core_courses = [...(form.value.core_courses ?? []), trimmed];
    newCourseInput.value = "";
    triggerSave();
  };

  const removeCourse = (idx: number) => {
    form.value.core_courses = (form.value.core_courses ?? []).filter(
      (_, i) => i !== idx,
    );
    triggerSave();
  };

  const SOCIAL_PLATFORMS: Record<string, SocialPlatform | null> = {
    twitter_handle: "twitter",
    instagram_handle: "instagram",
    tiktok_handle: "tiktok",
    facebook_url: null,
  };

  function handleSocialBlur(key: string, value: string) {
    const platform = SOCIAL_PLATFORMS[key];
    if (!platform) return;

    const { handle, isShortUrl } = normalizeHandle(value, platform);
    (form.value as Record<string, unknown>)[key] = handle;

    if (isShortUrl) {
      showToast(
        "Short links can't be used as handles — enter your username directly.",
        "warning",
      );
    }

    triggerSave();
  }

  const socialInputs: {
    key: keyof PlayerDetails;
    label: string;
    prefix?: string;
    placeholder: string;
  }[] = [
    {
      key: "twitter_handle",
      label: "Twitter / X",
      prefix: "@",
      placeholder: "username",
    },
    {
      key: "instagram_handle",
      label: "Instagram",
      prefix: "@",
      placeholder: "username",
    },
    {
      key: "tiktok_handle",
      label: "TikTok",
      prefix: "@",
      placeholder: "username",
    },
    {
      key: "facebook_url",
      label: "Facebook URL",
      placeholder: "https://facebook.com/...",
    },
  ];

  const gradeLevels = [
    {
      key: "9",
      label: "9th Grade (Freshman)",
      teamKey: "ninth_grade_team",
      coachKey: "ninth_grade_coach",
    },
    {
      key: "10",
      label: "10th Grade (Sophomore)",
      teamKey: "tenth_grade_team",
      coachKey: "tenth_grade_coach",
    },
    {
      key: "11",
      label: "11th Grade (Junior)",
      teamKey: "eleventh_grade_team",
      coachKey: "eleventh_grade_coach",
    },
    {
      key: "12",
      label: "12th Grade (Senior)",
      teamKey: "twelfth_grade_team",
      coachKey: "twelfth_grade_coach",
    },
  ] as const;

  const load = async () => {
    await loadAllPreferences();
    const playerDetails = getPlayerDetails();
    if (playerDetails) {
      if (playerDetails.high_school && !playerDetails.school_name) {
        playerDetails.school_name = playerDetails.high_school;
      }
      form.value = {
        ...form.value,
        ...playerDetails,
        positions: normalizePositions(playerDetails.positions),
      };
      form.value.video_links = playerDetails.video_links ?? [];
      form.value.core_courses = playerDetails.core_courses ?? [];
      initializeHeight(playerDetails.height_inches);
      if (form.value.primary_sport) {
        availablePositions.value = getPositionsBySport(
          form.value.primary_sport,
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
    addVideoLink,
    removeVideoLink,
    newCourseInput,
    addCourse,
    removeCourse,
    handleSocialBlur,
    socialInputs,
    gradeLevels,
    BATS_OPTIONS,
    THROWS_OPTIONS,
    CAMPUS_SIZE_OPTIONS,
    COST_SENSITIVITY_OPTIONS,
    load,
  };
}
