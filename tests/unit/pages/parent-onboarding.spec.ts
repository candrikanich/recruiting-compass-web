import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ParentOnboarding from "~/pages/onboarding/parent.vue";

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
  })),
}));

vi.mock("~/composables/useFamilyInvite", () => ({
  useFamilyInvite: vi.fn(() => ({
    sendInvite: vi.fn().mockResolvedValue(undefined),
    loading: ref(false),
    error: ref(null),
  })),
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
      },
    },
  });

describe("Parent Onboarding", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockFetchAuth.mockResolvedValue({});
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

    it("shows input for position after sport is selected", async () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="position"]').exists()).toBe(false);
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      expect(wrapper.find('[data-testid="position"]').exists()).toBe(true);
    });

    it("shows step indicator as step 1 of 2", () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain("1");
      expect(wrapper.text()).toContain("2");
    });

    it("proceeds to step 2 when Next is clicked", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="next-button"]').trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="step-2"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="step-1"]').exists()).toBe(false);
    });

    it("proceeds to step 2 when Skip is clicked", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="skip-step-1"]').trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="step-2"]').exists()).toBe(true);
    });

    it("calls POST /api/family/player-details when Next is clicked with data", async () => {
      const wrapper = createWrapper();

      await wrapper
        .find('[data-testid="player-name"]')
        .setValue("Alex Johnson");
      await wrapper.find('[data-testid="graduation-year"]').setValue("2027");
      await wrapper.find('[data-testid="sport"]').setValue("Baseball");
      await wrapper.find('[data-testid="position"]').setValue("Pitcher");
      await wrapper.find('[data-testid="next-button"]').trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/player-details", {
        method: "POST",
        body: {
          playerName: "Alex Johnson",
          graduationYear: "2027",
          sport: "Baseball",
          position: "Pitcher",
        },
      });
    });

    it("skips API call when Skip is clicked", async () => {
      const wrapper = createWrapper();
      await wrapper.find('[data-testid="skip-step-1"]').trigger("click");
      await wrapper.vm.$nextTick();
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });
  });

  describe("Step 2: Invite Player", () => {
    const goToStep2 = async (wrapper: ReturnType<typeof mount>) => {
      await wrapper.find('[data-testid="skip-step-1"]').trigger("click");
      await wrapper.vm.$nextTick();
    };

    it("shows email invite input on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(wrapper.find('[data-testid="invite-email"]').exists()).toBe(true);
    });

    it("shows family code on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(wrapper.text()).toContain("FAM-TESTCODE");
    });

    it("shows send invite button on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(wrapper.find('[data-testid="send-invite-button"]').exists()).toBe(
        true,
      );
    });

    it("shows skip invite button on step 2", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);
      expect(wrapper.find('[data-testid="skip-invite"]').exists()).toBe(true);
    });

    it("calls sendInvite with player role when invite is sent", async () => {
      const { useFamilyInvite } = await import(
        "~/composables/useFamilyInvite"
      );
      const mockSendInvite = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useFamilyInvite).mockReturnValue({
        sendInvite: mockSendInvite,
        loading: ref(false),
        error: ref(null),
        sendParentInvite: vi.fn(),
        linkParentWithCode: vi.fn(),
        lastInvitedEmail: ref(null),
      });

      const wrapper = createWrapper();
      await goToStep2(wrapper);

      await wrapper
        .find('[data-testid="invite-email"]')
        .setValue("player@example.com");
      await wrapper
        .find('[data-testid="send-invite-button"]')
        .trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockSendInvite).toHaveBeenCalledWith({
        email: "player@example.com",
        role: "player",
      });
    });

    it("navigates to dashboard after sending invite", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);

      await wrapper
        .find('[data-testid="invite-email"]')
        .setValue("player@example.com");
      await wrapper
        .find('[data-testid="send-invite-button"]')
        .trigger("click");
      await wrapper.vm.$nextTick();

      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
    });

    it("navigates to dashboard when skip invite is clicked", async () => {
      const wrapper = createWrapper();
      await goToStep2(wrapper);

      await wrapper.find('[data-testid="skip-invite"]').trigger("click");
      await wrapper.vm.$nextTick();

      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
    });
  });
});
