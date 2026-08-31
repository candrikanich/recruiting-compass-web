import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ParentOnboarding from "~/pages/onboarding/parent.vue";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useRoute: vi.fn(() => ({ query: {} })),
}));

const mockFetchAuth = vi.fn().mockResolvedValue({});
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(() => ({ $fetchAuth: mockFetchAuth })),
}));

vi.mock("~/composables/useFamilyCode", () => ({
  useFamilyCode: vi.fn(() => ({
    myFamilyCode: ref("FAM-TESTCODE"),
    myFamilyId: ref("family-123"),
    loading: ref(false),
    error: ref(null),
    fetchMyCode: vi.fn().mockResolvedValue(undefined),
    createFamily: vi.fn().mockResolvedValue(true),
    copyCodeToClipboard: vi.fn().mockResolvedValue(undefined),
  })),
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

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user-123", role: "parent" },
    isAuthenticated: true,
  })),
}));

global.navigateTo = vi.fn();

const createWrapper = () =>
  mount(ParentOnboarding, {
    global: {
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
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

const setDob = async (
  wrapper: ReturnType<typeof mount>,
  dob = "2005-06-15",
) => {
  const dobInput = wrapper.find('[data-testid="player-dob"]');
  (dobInput.element as HTMLInputElement).value = dob;
  await dobInput.trigger("input");
  await dobInput.trigger("change");
  await flushPromises();
};

describe("Parent Onboarding", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockFetchAuth.mockResolvedValue({});
    mockRecommendations.recommendations.value = [];
    mockRecommendations.error.value = null;
    (global.navigateTo as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
  });

  describe("Step 1: Player Details", () => {
    it("renders step 1 with player detail fields", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="step-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="step-2"]').exists()).toBe(false);
    });

    it("shows input for player name", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="player-name"]').exists()).toBe(true);
    });

    it("shows input for graduation year", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="graduation-year"]').exists()).toBe(
        true,
      );
    });

    it("shows input for sport", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="sport"]').exists()).toBe(true);
    });

    it("does not show a position field", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      expect(wrapper.find('[data-testid="position"]').exists()).toBe(false);
    });

    it("shows step indicator as step 1 of 2", () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain("1");
      expect(wrapper.text()).toContain("2");
    });

    it("Next button is disabled without a date of birth", () => {
      const wrapper = createWrapper();
      const btn = wrapper.find('[data-testid="next-button"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("Next button is disabled without a primary sport", async () => {
      const wrapper = createWrapper();
      await setDob(wrapper);
      // DOB is valid but no sport selected — sport is required
      const btn = wrapper.find('[data-testid="next-button"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("Next button is disabled without a graduation year", async () => {
      const wrapper = createWrapper();
      await setDob(wrapper);
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      const btn = wrapper.find('[data-testid="next-button"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("proceeds to step 2 when Next is clicked", async () => {
      const wrapper = createWrapper();
      await setDob(wrapper);
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      await wrapper
        .find('[data-testid="graduation-year"]')
        .setValue("2027");
      await wrapper.find('[data-testid="next-button"]').trigger("click");
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="step-2"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="step-1"]').exists()).toBe(false);
    });

    it("does not call the API when the Next button is disabled", async () => {
      const wrapper = createWrapper();
      const btn = wrapper.find('[data-testid="next-button"]');
      expect(btn.attributes("disabled")).toBeDefined();
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });

    it("calls POST /api/family/player-details (no position) when Next is clicked", async () => {
      const wrapper = createWrapper();

      await wrapper
        .find('[data-testid="player-name"]')
        .setValue("Alex Johnson");
      await wrapper.find('[data-testid="graduation-year"]').setValue("2027");
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      await setDob(wrapper);
      await wrapper.find('[data-testid="next-button"]').trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/player-details", {
        method: "POST",
        body: {
          playerName: "Alex Johnson",
          playerDob: "2005-06-15",
          graduationYear: "2027",
          sport: "Baseball",
        },
      });
    });
  });

  describe("Step 2: Schools to explore", () => {
    const goToStep2 = async (wrapper: ReturnType<typeof mount>) => {
      await setDob(wrapper);
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      await wrapper
        .find('[data-testid="graduation-year"]')
        .setValue("2027");
      await wrapper.find('[data-testid="next-button"]').trigger("click");
      await flushPromises();
      await wrapper.vm.$nextTick();
    };

    it("shows recommended schools on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(
        wrapper.find('[data-testid="recommended-schools-stub"]').exists(),
      ).toBe(true);
    });

    it("does not show an invite form on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(wrapper.find('[data-testid="invite-email"]').exists()).toBe(
        false,
      );
    });

    it("shows a go-to-dashboard CTA on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(
        wrapper.find('[data-testid="go-to-dashboard"]').exists(),
      ).toBe(true);
    });

    it("adding a recommended school calls createSchool and removes it from the list", async () => {
      mockRecommendations.recommendations.value = [school];
      const wrapper = createWrapper();
      await goToStep2(wrapper);

      await wrapper.find('[data-testid="add-first"]').trigger("click");
      await flushPromises();

      expect(mockCreateSchool).toHaveBeenCalled();
      expect(mockRecommendations.removeRecommendation).toHaveBeenCalledWith(
        school.catalogKey,
      );
    });

    it("dismissing a recommended school calls dismissRecommendation", async () => {
      mockRecommendations.recommendations.value = [school];
      const wrapper = createWrapper();
      await goToStep2(wrapper);

      await wrapper.find('[data-testid="dismiss-first"]').trigger("click");
      await flushPromises();

      expect(mockRecommendations.dismissRecommendation).toHaveBeenCalledWith(
        school.catalogKey,
      );
    });

    it("navigates to dashboard when go-to-dashboard is clicked", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);

      await wrapper.find('[data-testid="go-to-dashboard"]').trigger("click");
      await wrapper.vm.$nextTick();

      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
    });
  });
});
