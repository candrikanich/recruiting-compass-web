/**
 * pages/onboarding/index.vue — real component tests.
 *
 * Replaces a fully-tautological predecessor (61 `expect(true).toBe(true)`
 * placeholders — planning/audit-2026-07-27-findings.md, "6. Testing") with
 * tests that actually mount the real page and drive its navigation,
 * validation, and completion logic.
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

const mockFamilyCode = {
  myFamilyCode: { value: null },
  fetchMyCode: vi.fn().mockResolvedValue(undefined),
  copyCodeToClipboard: vi.fn().mockResolvedValue(undefined),
};
vi.mock("~/composables/useFamilyCode", () => ({
  useFamilyCode: () => mockFamilyCode,
}));

vi.mock("~/composables/useFamilyInvite", () => ({
  useFamilyInvite: () => ({
    sendInvite: vi.fn().mockResolvedValue(undefined),
    loading: { value: false },
  }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

const navigateToMock = vi.fn();
vi.stubGlobal("navigateTo", navigateToMock);
vi.stubGlobal("definePageMeta", vi.fn());

const mountPage = () =>
  mount(OnboardingIndex, {
    global: { stubs: { transition: false } },
  });

describe("pages/onboarding/index.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRoute.query = {};
    mockOnboarding.getOnboardingProgress.mockResolvedValue(0);
  });

  it("starts at step 1 (Welcome) and shows 20% progress", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Welcome!");
    expect(wrapper.text()).toContain("1/5");
    const bar = wrapper.find(".bg-blue-500.h-2");
    expect(bar.attributes("style")).toContain("width: 20%");
  });

  it("disables the Back button on step 1", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const backButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Back");
    expect(backButton?.attributes("disabled")).toBeDefined();
  });

  it("advancing to step 2 saves step 1 and renders Basic Information", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const nextButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Next");
    await nextButton?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).toHaveBeenCalledWith(1, {});
    expect(wrapper.text()).toContain("Basic Information");
    expect(wrapper.text()).toContain("2/5");
  });

  it("clicking Back from step 2 returns to step 1 without saving", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();
    mockOnboarding.saveOnboardingStep.mockClear();

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Back")
      ?.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Welcome!");
    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
  });

  it("blocks advancing past step 3 without a valid zip code", async () => {
    const wrapper = mountPage();
    await flushPromises();
    // step 1 -> 2
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();
    // step 2 -> 3
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();
    mockOnboarding.saveOnboardingStep.mockClear();

    // step 3 has no zip code entered — nextScreen() should refuse to advance
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("2/5");
  });

  it("Skip advances the step and persists progress via saveOnboardingStep", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const skipButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Skip");
    await skipButton?.trigger("click");
    await flushPromises();

    expect(mockOnboarding.saveOnboardingStep).toHaveBeenCalledWith(1, {});
    expect(wrapper.text()).toContain("2/5");
  });

  it("completing step 5 calls completeOnboarding and navigates to /dashboard", async () => {
    mockOnboarding.getOnboardingProgress.mockResolvedValue(100); // resumes at step 5
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("5/5");

    const finishButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "I'll invite them later");
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
    mockOnboarding.getOnboardingProgress.mockResolvedValue(40); // 2/5 = 40%
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Basic Information");
    expect(wrapper.text()).toContain("2/5");
  });

  it("pre-populates graduation year/sport/position from query params on mount", async () => {
    mockRoute.query = {
      graduationYear: "2027",
      sport: "Soccer",
      position: "Midfielder",
    };
    const wrapper = mountPage();
    await flushPromises();

    // Advance to step 2 where graduation_year/sport/position are editable.
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")
      ?.trigger("click");
    await flushPromises();

    const graduationSelect = wrapper.find("#onboarding-graduation-year");
    expect((graduationSelect.element as HTMLSelectElement).value).toBe("2027");
  });
});
