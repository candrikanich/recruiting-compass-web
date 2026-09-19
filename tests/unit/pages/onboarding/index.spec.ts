/**
 * pages/onboarding/index.vue — real component tests for the single-step
 * "Tell us about you" onboarding screen (sport + graduation year required,
 * zip optional). Completing it saves details and navigates to /dashboard.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import OnboardingIndex from "~/pages/onboarding/index.vue";

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

const navigateToMock = vi.fn();
vi.stubGlobal("navigateTo", navigateToMock);
vi.stubGlobal("definePageMeta", vi.fn());

const mountPage = () =>
  mount(OnboardingIndex, {
    global: {
      stubs: { transition: false },
    },
  });

describe("pages/onboarding/index.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRoute.query = {};
  });

  it("shows the single 'Tell us about you' step with no step indicator", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Tell us about you");
    expect(wrapper.text()).not.toContain("1/2");
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

  it("does not require zip code to complete", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).toHaveBeenCalled();
    expect(mockOnboarding.completeOnboarding).toHaveBeenCalled();
    expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
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

  it("saves player details, sets home location, marks the sport checklist item complete, and navigates to /dashboard", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find("#onboarding-graduation-year").setValue("2028");
    await wrapper.find("#onboarding-primary-sport").setValue("Baseball");
    await wrapper.find("#onboarding-zip-code").setValue("43210");

    await wrapper.find("button").trigger("click");
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
    expect(mockOnboarding.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        hasHighlightVideo: false,
        hasContactedCoaches: false,
      }),
      2028,
    );
    expect(navigateToMock).toHaveBeenCalledWith("/dashboard");
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
