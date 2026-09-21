import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ParentOnboarding from "~/pages/onboarding/parent.vue";
import { useFamilyCode } from "~/composables/useFamilyCode";

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useRoute: vi.fn(() => ({ query: {} })),
}));

const mockFetchAuth = vi.fn().mockResolvedValue({});
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(() => ({ $fetchAuth: mockFetchAuth })),
}));

const { defaultFamilyCode } = vi.hoisted(() => ({
  defaultFamilyCode: () => ({
    myFamilyCode: ref("FAM-TESTCODE"),
    myFamilyId: ref("family-123"),
    loading: ref(false),
    error: ref(null),
    fetchMyCode: vi.fn().mockResolvedValue(undefined),
    createFamily: vi.fn().mockResolvedValue(true),
    copyCodeToClipboard: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("~/composables/useFamilyCode", () => ({
  useFamilyCode: vi.fn(defaultFamilyCode),
}));

const mockCompleteOnboarding = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useOnboarding", () => ({
  useOnboarding: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

const mockCompleteItem = vi.fn().mockResolvedValue(undefined);
vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({ completeItem: mockCompleteItem }),
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
    mockCompleteOnboarding.mockResolvedValue(undefined);
    (global.navigateTo as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
  });

  it("renders player detail fields", () => {
    const wrapper = createWrapper();
    expect(wrapper.find('[data-testid="step-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="player-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="graduation-year"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="sport"]').exists()).toBe(true);
  });

  it("does not show a position field", async () => {
    const wrapper = createWrapper();
    await wrapper.find('[data-testid="sport"]').setValue("Baseball");
    expect(wrapper.find('[data-testid="position"]').exists()).toBe(false);
  });

  it("go-to-dashboard button is disabled without a date of birth", () => {
    const wrapper = createWrapper();
    const btn = wrapper.find('[data-testid="go-to-dashboard"]');
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("go-to-dashboard button is disabled without a primary sport", async () => {
    const wrapper = createWrapper();
    await setDob(wrapper);
    const btn = wrapper.find('[data-testid="go-to-dashboard"]');
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("go-to-dashboard button is disabled without a graduation year", async () => {
    const wrapper = createWrapper();
    await setDob(wrapper);
    await wrapper.find('[data-testid="sport"]').setValue("Baseball");
    const btn = wrapper.find('[data-testid="go-to-dashboard"]');
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("does not call the API when the button is disabled", async () => {
    const wrapper = createWrapper();
    const btn = wrapper.find('[data-testid="go-to-dashboard"]');
    expect(btn.attributes("disabled")).toBeDefined();
    expect(mockFetchAuth).not.toHaveBeenCalled();
  });

  it("disables the button while family provisioning is still in flight (issue #782)", async () => {
    let resolveCreateFamily!: (value: boolean) => void;
    vi.mocked(useFamilyCode).mockReturnValueOnce({
      ...defaultFamilyCode(),
      myFamilyCode: ref(""),
      createFamily: vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveCreateFamily = resolve;
          }),
      ),
    });

    const wrapper = createWrapper();
    await setDob(wrapper);
    await wrapper.find('[data-testid="sport"]').setValue("Baseball");
    await wrapper.find('[data-testid="graduation-year"]').setValue("2027");
    await flushPromises();

    // All fields valid, but family creation hasn't resolved yet — the
    // button must stay disabled so player-details can't fire before the
    // family_members row exists (the exact race that 403'd silently).
    expect(
      wrapper.find('[data-testid="go-to-dashboard"]').attributes("disabled"),
    ).toBeDefined();
    expect(mockFetchAuth).not.toHaveBeenCalled();

    resolveCreateFamily(true);
    await flushPromises();

    expect(
      wrapper.find('[data-testid="go-to-dashboard"]').attributes("disabled"),
    ).toBeUndefined();
  });

  it("shows an error and does not navigate when saving player details fails", async () => {
    mockFetchAuth.mockRejectedValueOnce(new Error("Not a family member"));
    const wrapper = createWrapper();

    await setDob(wrapper);
    await wrapper.find('[data-testid="sport"]').setValue("Baseball");
    await wrapper.find('[data-testid="graduation-year"]').setValue("2027");
    await wrapper.find('[data-testid="go-to-dashboard"]').trigger("click");
    await flushPromises();

    expect(
      wrapper.find('[data-testid="save-player-details-error"]').text(),
    ).toContain("Not a family member");
    // Not permanently wedged — the button re-enables for a retry.
    expect(
      wrapper.find('[data-testid="go-to-dashboard"]').attributes("disabled"),
    ).toBeUndefined();
    expect(global.navigateTo).not.toHaveBeenCalled();
  });

  it("calls POST /api/family/player-details (no position) when the button is clicked", async () => {
    const wrapper = createWrapper();

    await wrapper.find('[data-testid="player-name"]').setValue("Alex Johnson");
    await wrapper.find('[data-testid="graduation-year"]').setValue("2027");
    await wrapper.find('[data-testid="sport"]').setValue("Baseball");
    await setDob(wrapper);
    await wrapper.find('[data-testid="go-to-dashboard"]').trigger("click");
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

  it("completes onboarding and navigates to dashboard when the button is clicked", async () => {
    const wrapper = createWrapper();

    await setDob(wrapper);
    await wrapper.find('[data-testid="sport"]').setValue("Baseball");
    await wrapper.find('[data-testid="graduation-year"]').setValue("2027");
    await wrapper.find('[data-testid="go-to-dashboard"]').trigger("click");
    await flushPromises();

    expect(mockCompleteOnboarding).toHaveBeenCalled();
    expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
  });
});
