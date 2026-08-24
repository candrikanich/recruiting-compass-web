import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useCoreCourses } from "~/composables/useCoreCourses";
import {
  useTravelTeams,
  buildLegacyTravelTeam,
} from "~/composables/useTravelTeams";
import { useSocialHandles } from "~/composables/useSocialHandles";
import type { PlayerDetails } from "~/types/models";

const showToast = vi.fn();
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast }),
}));

const makeForm = (over: Partial<PlayerDetails> = {}) =>
  ref<PlayerDetails>({ core_courses: [], travel_teams: [], ...over } as PlayerDetails);

beforeEach(() => showToast.mockClear());

describe("useCoreCourses", () => {
  it("adds a trimmed course, clears the input, and autosaves", () => {
    const form = makeForm();
    const save = vi.fn();
    const { newCourseInput, addCourse } = useCoreCourses(form, save);
    newCourseInput.value = "  Algebra II  ";
    addCourse();
    expect(form.value.core_courses).toEqual(["Algebra II"]);
    expect(newCourseInput.value).toBe("");
    expect(save).toHaveBeenCalledOnce();
  });

  it("ignores blank input and exact duplicates without saving", () => {
    const form = makeForm({ core_courses: ["Chem"] });
    const save = vi.fn();
    const { newCourseInput, addCourse } = useCoreCourses(form, save);
    newCourseInput.value = "   ";
    addCourse();
    newCourseInput.value = "Chem";
    addCourse();
    expect(form.value.core_courses).toEqual(["Chem"]);
    expect(save).not.toHaveBeenCalled();
  });

  it("removes a course by index and autosaves", () => {
    const form = makeForm({ core_courses: ["A", "B", "C"] });
    const save = vi.fn();
    const { removeCourse } = useCoreCourses(form, save);
    removeCourse(1);
    expect(form.value.core_courses).toEqual(["A", "C"]);
    expect(save).toHaveBeenCalledOnce();
  });
});

describe("useTravelTeams", () => {
  it("appends a blank row WITHOUT autosaving (nothing to persist yet)", () => {
    const form = makeForm();
    const save = vi.fn();
    const { addTravelTeam } = useTravelTeams(form, save);
    addTravelTeam();
    expect(form.value.travel_teams).toHaveLength(1);
    expect(form.value.travel_teams?.[0]).toEqual({
      year: undefined,
      name: "",
      coach: "",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("removes a row by index and autosaves", () => {
    const form = makeForm({
      travel_teams: [
        { year: 2024, name: "A", coach: "" },
        { year: 2025, name: "B", coach: "" },
      ],
    });
    const save = vi.fn();
    const { removeTravelTeam } = useTravelTeams(form, save);
    removeTravelTeam(0);
    expect(form.value.travel_teams).toEqual([{ year: 2025, name: "B", coach: "" }]);
    expect(save).toHaveBeenCalledOnce();
  });
});

describe("buildLegacyTravelTeam", () => {
  it("returns [] when the legacy scalar fields are all empty", () => {
    expect(buildLegacyTravelTeam({} as PlayerDetails)).toEqual([]);
  });

  it("seeds one row from the legacy scalar fields", () => {
    const rows = buildLegacyTravelTeam({
      travel_team_year: 2025,
      travel_team_name: "Scorpions",
      travel_team_coach: "Reyes",
    } as PlayerDetails);
    expect(rows).toEqual([{ year: 2025, name: "Scorpions", coach: "Reyes" }]);
  });
});

describe("useSocialHandles", () => {
  it("normalizes a handle, writes it back, and autosaves", () => {
    const form = makeForm({ twitter_handle: "" });
    const save = vi.fn();
    const { handleSocialBlur } = useSocialHandles(form, save);
    handleSocialBlur("twitter_handle", "@JordanE");
    expect(form.value.twitter_handle).toBe("JordanE");
    expect(save).toHaveBeenCalledOnce();
  });

  it("no-ops for facebook_url (no platform normalizer) and does not save", () => {
    const form = makeForm({ facebook_url: "https://facebook.com/x" });
    const save = vi.fn();
    const { handleSocialBlur } = useSocialHandles(form, save);
    handleSocialBlur("facebook_url", "https://facebook.com/x");
    expect(save).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("warns when a TikTok short link is pasted as a handle", () => {
    const form = makeForm({ tiktok_handle: "" });
    const save = vi.fn();
    const { handleSocialBlur } = useSocialHandles(form, save);
    // vm.tiktok.com short links are the case normalizeHandle flags as isShortUrl.
    handleSocialBlur("tiktok_handle", "https://vm.tiktok.com/ZM123/");
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("Short links"),
      "warning",
    );
    expect(save).toHaveBeenCalledOnce();
  });
});
