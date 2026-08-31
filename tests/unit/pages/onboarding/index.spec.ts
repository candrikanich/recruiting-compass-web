/**
 * pages/onboarding/index.vue — real component tests for the 2-step wizard.
 *
 * Step 1 collects sport + graduation year (required) + zip (optional).
 * Step 2 renders school recommendations and completes onboarding.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import OnboardingIndex from "~/pages/onboarding/index.vue";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

const mockRoute = { query: {} as Record<string, string> };
vi.stubGlobal("useRoute", () => mockRoute);

const mockOnboarding = {
  saveOnboardingStep: vi.fn().mockResolvedValue(undefined),
  completeOnboarding: vi.fn().mockResolvedValue(undefined),
  getOnboardingProgress: vi.fn().mockResolvedValue(0),
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

const mockCreateSchool = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({ createSchool: mockCreateSchool }),
}));

const school: SchoolRecommendation = {
  catalogKey: "ohio-state",
  name: "Ohio State University",
  division: "D1",
  conference: "Big Ten",
  state: "OH",
  website: null,
  athleticsUrl: null,
  score: 70,
  reasons: ["In OH"],
};

const mockRecommendations = {
  recommendations: ref<SchoolRecommendation[]>([]),
  loading: ref(false),
  error: ref<string | null>(null),
  fetchRecommendations: vi.fn().mockResolvedValue(undefined),
  dismissRecommendation: vi.fn().mockResolvedValue(undefined),
  removeRecommendation: vi.fn(),
};
vi.mock("~/composables/useSchoolRecommendations", () => ({
  useSchoolRecommendations: () => mockRecommendations,
}));

const mockCompleteItem = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({ completeItem: mockCompleteItem }),
}));

const navigateToMock = vi.fn();
vi.stubGlobal("navigateTo", navigateToMock);
vi.stubGlobal("definePageMeta", vi.fn());

const mountPage = () =>
  mount(OnboardingIndex, {
    global: {
      stubs: {
        transition: false,
        RecommendedSchools: {
          props: ["items", "loading", "error", "addingKey"],
          template:
            '<div data-testid="recommended-schools-stub">' +
            '<button data-testid="add-first" @click="$emit(\'add\', items[0])">Add</button>' +
            '<button data-testid="dismiss-first" @click="$emit(\'dismiss\', items[0])">Dismiss</button>' +
            "</div>",
        },
      },
    },
  });

describe("pages/onboarding/index.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRoute.query = {};
    mockOnboarding.getOnboardingProgress.mockResolvedValue(0);
    mockRecommendations.recommendations.value = [];
    mockRecommendations.error.value = null;
  });

  it("starts at step 1 (Tell us about you) and shows 50% progress", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Tell us about you");
    expect(wrapper.text()).toContain("1/2");
    const bar = wrapper.find(".bg-blue-500.h-2");
    expect(bar.attributes("style")).toContain("width: 50%");
  });

  it("disables the Back button on step 1", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const backButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Back");
    expect(backButton?.attributes("disabled")).toBeDefined();
  });

  it("blocks advancing without a primary sport", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Primary sport is required");
    expect(wrapper.text()).toContain("1/2");
  });

  it("blocks advancing without a graduation year", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Graduation year is required");
  });

  it("does not require zip code to advance", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).toHaveBeenCalled();
    expect(wrapper.text()).toContain("2/2");
  });

  it("rejects an invalid zip code", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper.find("#onboarding-zip-code").setValue("abc");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("valid 5-digit zip code");
  });

  it("saves player details, sets home location, and marks the sport checklist item complete", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper.find("#onboarding-zip-code").setValue("43210");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

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

  it("step 2 renders school recommendations, not form fields", async () => {
    mockRecommendations.recommendations.value = [school];
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    expect(
      wrapper.find('[data-testid="recommended-schools-stub"]').exists(),
    ).toBe(true);
    expect(wrapper.find("#onboarding-primary-sport").exists()).toBe(false);
  });

  it("adding a recommended school calls createSchool and removes it from the list", async () => {
    mockRecommendations.recommendations.value = [school];
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    await wrapper.find('[data-testid="add-first"]').trigger("click");
    await flushPromises();

    expect(mockCreateSchool).toHaveBeenCalled();
    expect(mockRecommendations.removeRecommendation).toHaveBeenCalledWith(
      school.catalogKey,
    );
  });

  it("dismissing a recommended school calls dismissRecommendation", async () => {
    mockRecommendations.recommendations.value = [school];
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    await wrapper.find('[data-testid="dismiss-first"]').trigger("click");
    await flushPromises();

    expect(mockRecommendations.dismissRecommendation).toHaveBeenCalledWith(
      school.catalogKey,
    );
  });

  it("completing step 2 calls completeOnboarding and navigates to /dashboard", async () => {
    mockOnboarding.getOnboardingProgress.mockResolvedValue(100); // resumes at step 2
    mockPreferences.getPlayerDetails.mockReturnValueOnce({
      primary_sport: "Baseball",
      graduation_year: 2028,
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("2/2");

    const finishButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Go to your dashboard →");
    await finishButton?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        hasHighlightVideo: false,
        hasContactedCoaches: false,
      }),
    );
    expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
  });

  it("resumes from a persisted step on mount via getOnboardingProgress", async () => {
    mockOnboarding.getOnboardingProgress.mockResolvedValue(50); // 1/2 = 50%
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Schools to explore");
    expect(wrapper.text()).toContain("2/2");
  });

  it("pre-populates graduation year/sport from query params on mount", async () => {
    mockRoute.query = {
      graduationYear: "2027",
      sport: "Soccer",
    };
    const wrapper = mountPage();
    await flushPromises();

    const graduationSelect = wrapper.find("#onboarding-graduation-year");
    expect((graduationSelect.element as HTMLSelectElement).value).toBe(
      "2027",
    );
    const sportSelect = wrapper.find("#onboarding-primary-sport");
    expect((sportSelect.element as HTMLSelectElement).value).toBe("Soccer");
  });
});
