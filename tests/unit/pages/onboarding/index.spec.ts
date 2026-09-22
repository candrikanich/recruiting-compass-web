/**
 * pages/onboarding/index.vue — real component tests for the "Tell us about
 * you" onboarding step, followed by a conditional "Schools to explore" step
 * shown only when the sport+location match returns recommendations. No
 * matches falls straight through to /dashboard, same as before this step
 * existed (that's what got the original attempt scrapped — an empty shell).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import OnboardingIndex from "~/pages/onboarding/index.vue";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

const mockRoute = { query: {} as Record<string, string> };
vi.stubGlobal("useRoute", () => mockRoute);

const mockOnboarding = {
  saveOnboardingStep: vi.fn().mockResolvedValue(undefined),
  completeOnboarding: vi.fn().mockResolvedValue(undefined),
};
vi.mock("~/composables/useOnboarding", () => ({
  useOnboarding: () => mockOnboarding,
}));

const mockPreferences = {
  setHomeLocation: vi.fn().mockResolvedValue(undefined),
  setPlayerDetails: vi.fn().mockResolvedValue(undefined),
  loadAllPreferences: vi.fn().mockResolvedValue(undefined),
  getPlayerDetails: vi.fn(() => null),
  getHomeLocation: { value: null },
};
vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => mockPreferences,
}));

const mockCompleteItem = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({ completeItem: mockCompleteItem }),
}));

const rec: SchoolRecommendation = {
  catalogKey: "bowling-green",
  name: "Bowling Green State University",
  division: "D1",
  conference: "MAC",
  state: "OH",
  website: null,
  athleticsUrl: null,
  score: 70,
  reasons: ["In OH"],
};

const mockRecs = ref<SchoolRecommendation[]>([]);
const mockRecsError = ref<string | null>(null);
const mockFetchRecommendations = vi.fn();
const mockDismissRecommendation = vi.fn().mockResolvedValue(undefined);
const mockRemoveRecommendation = vi.fn();
vi.mock("~/composables/useSchoolRecommendations", () => ({
  useSchoolRecommendations: () => ({
    recommendations: mockRecs,
    signals: ref({ homeState: "OH", gpa: null, excludedCount: 0 }),
    loading: ref(false),
    error: mockRecsError,
    fetchRecommendations: mockFetchRecommendations,
    dismissRecommendation: mockDismissRecommendation,
    removeRecommendation: mockRemoveRecommendation,
  }),
}));

const mockCreateSchool = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({ createSchool: mockCreateSchool }),
}));

const navigateToMock = vi.fn();
vi.stubGlobal("navigateTo", navigateToMock);
vi.stubGlobal("definePageMeta", vi.fn());

const mountPage = () =>
  mount(OnboardingIndex, {
    attachTo: document.body,
    global: {
      stubs: { transition: false },
    },
  });

async function completeStep1(wrapper: ReturnType<typeof mountPage>) {
  await wrapper.find("#onboarding-graduation-year").setValue("2028");
  await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
  await wrapper.find("button").trigger("click");
  await flushPromises();
}

describe("pages/onboarding/index.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRoute.query = {};
    mockRecs.value = [];
    mockRecsError.value = null;
    mockFetchRecommendations.mockImplementation(async () => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the 'Tell us about you' step with no step indicator", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Tell us about you");
    expect(wrapper.text()).not.toContain("Step 2 of 2");
    expect(wrapper.text()).not.toContain("Schools to explore");
    expect(
      wrapper.findAll("button").find((b) => b.text() === "Back"),
    ).toBeUndefined();
  });

  it("blocks completing without a primary sport", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Primary sport is required");
  });

  it("blocks completing without a graduation year", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Graduation year is required");
  });

  it("rejects an invalid zip code", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper.find("#onboarding-zip-code").setValue("abc");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("valid 5-digit zip code");
  });

  describe("when no school recommendations match", () => {
    it("skips step 2 and goes straight to /dashboard", async () => {
      mockRecs.value = [];
      const wrapper = mountPage();
      await flushPromises();

      await completeStep1(wrapper);

      expect(mockFetchRecommendations).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).not.toContain("Schools to explore");
      expect(mockOnboarding.completeOnboarding).toHaveBeenCalled();
      expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
    });

    it("saves player details, sets home location, and marks the sport checklist item complete", async () => {
      const wrapper = mountPage();
      await flushPromises();
      await wrapper.find("#onboarding-zip-code").setValue("43210");
      await completeStep1(wrapper);

      expect(mockPreferences.setPlayerDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          graduation_year: 2028,
          primary_sport: "Baseball",
          gender: "male",
        }),
      );
      expect(mockPreferences.setHomeLocation).toHaveBeenCalledWith({
        zip: "43210",
      });
      expect(mockCompleteItem).toHaveBeenCalledWith("sport");
    });
  });

  describe("when the recommendation fetch fails", () => {
    it("stays on step 1, shows the error, and does not complete onboarding", async () => {
      mockFetchRecommendations.mockImplementation(async () => {
        mockRecs.value = [];
        mockRecsError.value = "Could not load recommended schools.";
      });
      const wrapper = mountPage();
      await flushPromises();

      await completeStep1(wrapper);

      expect(wrapper.text()).toContain("Could not load recommended schools.");
      expect(wrapper.text()).not.toContain("Step 2 of 2");
      expect(mockOnboarding.completeOnboarding).not.toHaveBeenCalled();
      expect(navigateToMock).not.toHaveBeenCalled();
    });
  });

  describe("when school recommendations match", () => {
    beforeEach(() => {
      mockFetchRecommendations.mockImplementation(async () => {
        mockRecs.value = [rec];
      });
    });

    it("shows step 2 instead of navigating immediately", async () => {
      const wrapper = mountPage();
      await flushPromises();
      await completeStep1(wrapper);

      expect(wrapper.text()).toContain("Step 2 of 2");
      expect(wrapper.text()).toContain("Bowling Green State University");
      expect(mockOnboarding.completeOnboarding).not.toHaveBeenCalled();
      expect(navigateToMock).not.toHaveBeenCalled();
    });

    it("adds a school via createSchool and removes it from the list on 'Add to list'", async () => {
      const wrapper = mountPage();
      await flushPromises();
      await completeStep1(wrapper);

      await wrapper.find('[aria-label^="Add "]').trigger("click");
      await flushPromises();

      expect(mockCreateSchool).toHaveBeenCalledTimes(1);
      expect(mockRemoveRecommendation).toHaveBeenCalledWith("bowling-green");
      expect(mockCompleteItem).toHaveBeenCalledWith("first_school");
    });

    it("dismisses a school on 'Not a fit'", async () => {
      const wrapper = mountPage();
      await flushPromises();
      await completeStep1(wrapper);

      await wrapper.find('[aria-label^="Dismiss "]').trigger("click");
      await flushPromises();

      expect(mockDismissRecommendation).toHaveBeenCalledWith("bowling-green");
    });

    it("completes onboarding and navigates to /dashboard from step 2", async () => {
      const wrapper = mountPage();
      await flushPromises();
      await completeStep1(wrapper);

      const finishButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Go to Dashboard"));
      expect(finishButton).toBeDefined();
      await finishButton!.trigger("click");
      await flushPromises();

      expect(mockOnboarding.completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          hasHighlightVideo: false,
          hasContactedCoaches: false,
        }),
        2028,
      );
      expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
    });

    it("shows a visible error on step 2 when completing onboarding fails", async () => {
      mockOnboarding.completeOnboarding.mockRejectedValueOnce(
        new Error("Network error"),
      );
      const wrapper = mountPage();
      await flushPromises();
      await completeStep1(wrapper);

      const finishButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Go to Dashboard"));
      await finishButton!.trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Network error");
      expect(navigateToMock).not.toHaveBeenCalled();
    });

    it("moves focus to the step 2 region so keyboard/screen-reader users land there", async () => {
      const wrapper = mountPage();
      await flushPromises();
      await completeStep1(wrapper);

      expect(document.activeElement?.getAttribute("aria-label")).toBe(
        "Schools to explore",
      );

      wrapper.unmount();
    });
  });

  it("does not show a gender field for a sport with an unambiguous gender", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await flushPromises();

    expect(wrapper.find("#onboarding-gender").exists()).toBe(false);
  });

  it("shows a gender field for a sport without an unambiguous gender", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-primary-sport").setValue("Basketball");
    await flushPromises();

    expect(wrapper.find("#onboarding-gender").exists()).toBe(true);
  });

  it("pre-populates graduation year/sport from query params on mount", async () => {
    mockRoute.query = {
      graduationYear: "2027",
      sport: "Soccer",
    };
    const wrapper = mountPage();
    await flushPromises();

    const graduationSelect = wrapper.find("#onboarding-graduation-year");
    expect((graduationSelect.element as HTMLSelectElement).value).toBe("2027");
    const sportSelect = wrapper.find("#onboarding-primary-sport");
    expect((sportSelect.element as HTMLSelectElement).value).toBe("Soccer");
  });
});
