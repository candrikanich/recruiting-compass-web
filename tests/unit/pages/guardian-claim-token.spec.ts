import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import claimPage from "~/pages/guardian/claim/[token].vue";

const mockRoute = { params: { token: "tok-1" } };
vi.stubGlobal("useRoute", () => mockRoute);
vi.mock("#app", () => ({
  useRuntimeConfig: () => ({ public: { turnstileSiteKey: "" } }),
}));

const {
  mockLogin,
  mockSignup,
  mockFetchAuth,
  mockRefetchFamilies,
  mockSuppress,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSignup: vi.fn(),
  mockFetchAuth: vi.fn(),
  mockRefetchFamilies: vi.fn(),
  mockSuppress: vi.fn(),
}));

vi.mock("~/composables/useAuth", () => ({
  useAuth: () => ({ login: mockLogin, signup: mockSignup }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: null }),
}));

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => ({ refetchFamilies: mockRefetchFamilies }),
}));

vi.mock("~/composables/useAccountProvisioning", () => ({
  suppressAutoFamilyCreateOnNextSignIn: mockSuppress,
}));

const claimDetails = {
  guardianEmail: "parent@example.com",
  playerName: "Conner Smith",
  playerDateOfBirth: null,
  playerGraduationYear: 2029,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

describe("pages/guardian/claim/[token].vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.$fetch = vi.fn().mockResolvedValue(claimDetails) as never;
    global.navigateTo = vi.fn();
    mockFetchAuth.mockResolvedValue({ success: true });
    mockLogin.mockResolvedValue(undefined);
    mockSignup.mockResolvedValue(undefined);
  });

  const createWrapper = () =>
    mount(claimPage, {
      global: {
        stubs: { NuxtLink: { template: "<a><slot /></a>" } },
      },
    });

  it("refetches family context after confirming, before navigating to the dashboard", async () => {
    // Found live on QA: the app-wide family-context singleton caches the (empty)
    // accessible-families list from the moment signup() flips the guardian's role to
    // "parent" -- before the accept call below ever runs -- and the dashboard read
    // that stale snapshot, showing "not connected" even after a successful confirm.
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.find("input[type=text]").setValue("Jane");
    const textInputs = wrapper.findAll("input[type=text]");
    await textInputs[1]!.setValue("Doe");
    const passwordInputs = wrapper.findAll("input[type=password]");
    await passwordInputs[0]!.setValue("StrongPass123");
    await passwordInputs[1]!.setValue("StrongPass123");
    await wrapper.find("input[type=checkbox]").setValue(true);

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(mockFetchAuth).toHaveBeenCalledWith(
      "/api/guardian/claim/tok-1/accept",
      { method: "POST" },
    );
    expect(mockRefetchFamilies).toHaveBeenCalled();
    expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");

    // refetchFamilies must happen before navigating away, or the dashboard mounts
    // before the fresh data lands.
    const refetchOrder = mockRefetchFamilies.mock.invocationCallOrder[0];
    const navigateOrder = (global.navigateTo as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(refetchOrder).toBeLessThan(navigateOrder!);
  });

  it("suppresses the auto family-create call before signing up a new guardian", async () => {
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.find("input[type=text]").setValue("Jane");
    const textInputs = wrapper.findAll("input[type=text]");
    await textInputs[1]!.setValue("Doe");
    const passwordInputs = wrapper.findAll("input[type=password]");
    await passwordInputs[0]!.setValue("StrongPass123");
    await passwordInputs[1]!.setValue("StrongPass123");
    await wrapper.find("input[type=checkbox]").setValue(true);

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(mockSuppress).toHaveBeenCalled();
    expect(mockSignup).toHaveBeenCalled();
    // Must be set before signup() fires the SIGNED_IN listener that consumes it.
    const suppressOrder = mockSuppress.mock.invocationCallOrder[0];
    const signupOrder = mockSignup.mock.invocationCallOrder[0];
    expect(suppressOrder).toBeLessThan(signupOrder!);
  });

  it("suppresses the auto family-create call before logging in an existing guardian", async () => {
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper
      .findAll("button[type=button]")[1]!
      .trigger("click"); // "I already have an account"
    await wrapper
      .find("input[type=password]")
      .setValue("StrongPass123");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(mockSuppress).toHaveBeenCalled();
    expect(mockLogin).toHaveBeenCalled();
    const suppressOrder = mockSuppress.mock.invocationCallOrder[0];
    const loginOrder = mockLogin.mock.invocationCallOrder[0];
    expect(suppressOrder).toBeLessThan(loginOrder!);
  });
});
