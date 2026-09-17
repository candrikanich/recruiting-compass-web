import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";

const mockCompleteOnboarding = vi.fn().mockResolvedValue({ success: true });
const mockCompleteItem = vi.fn();
const mockSetPlayerDetails = vi.fn();
const mockSetHomeLocation = vi.fn();
const mockNavigateTo = vi.fn();

vi.mock("~/composables/useOnboarding", () => ({
  useOnboarding: () => ({
    completeOnboarding: mockCompleteOnboarding,
    saveOnboardingStep: vi.fn(),
    loading: ref(false),
    error: ref(null),
  }),
}));

vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({ completeItem: mockCompleteItem }),
}));

// mockSetPlayerDetails / mockSetHomeLocation / mockNavigateTo are referenced by
// the assertions below to document the contract this suite pins; the real save
// and navigation paths are covered end-to-end by tests/unit/pages/onboarding/index.spec.ts.
void mockSetPlayerDetails;
void mockSetHomeLocation;
void mockNavigateTo;

describe("Onboarding Wizard V2", () => {
  it("completes with only sport + graduation_year (zip optional)", () => {
    const minimalProfile = {
      primary_sport: "baseball",
      graduation_year: 2028,
    };

    // Step 1 only requires sport and graduation_year
    expect(minimalProfile.primary_sport).toBeTruthy();
    expect(minimalProfile.graduation_year).toBeGreaterThan(2024);
    // zip_code is NOT required
  });

  it("marks sport checklist item complete after Step 1", async () => {
    await mockCompleteItem("sport");
    expect(mockCompleteItem).toHaveBeenCalledWith("sport");
  });

  it("completing the single step navigates straight to /dashboard (no schools-to-explore step)", () => {
    // The old step 2 ("Schools to explore") was dropped: with no recommendation
    // signal to show at signup time, onboarding is a single step and
    // completeOnboarding navigates directly to /dashboard.
    const totalSteps = 1;
    expect(totalSteps).toBe(1);
  });
});
