import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { useAccountProvisioning } from "~/composables/useAccountProvisioning";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useUserStore } from "~/stores/user";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useOnboarding } from "~/composables/useOnboarding";

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(),
}));
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(),
}));
vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: vi.fn(),
}));
vi.mock("~/composables/useOnboarding", () => ({
  useOnboarding: vi.fn(),
}));
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn() }),
}));

const mockUseAuthFetch = vi.mocked(useAuthFetch);
const mockUseUserStore = vi.mocked(useUserStore);
const mockUsePreferenceManager = vi.mocked(usePreferenceManager);
const mockUseOnboarding = vi.mocked(useOnboarding);

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-123",
    user_metadata: {},
    ...overrides,
  }) as User;

describe("useAccountProvisioning", () => {
  let fetchAuthMock: ReturnType<typeof vi.fn>;
  let userStoreState: { user: { is_admin: boolean; full_name?: string } | null };
  let getPlayerDetailsMock: ReturnType<typeof vi.fn>;
  let setPlayerDetailsMock: ReturnType<typeof vi.fn>;
  let setHomeLocationMock: ReturnType<typeof vi.fn>;
  let loadAllPreferencesMock: ReturnType<typeof vi.fn>;
  let saveOnboardingStepMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchAuthMock = vi.fn().mockResolvedValue({});
    mockUseAuthFetch.mockReturnValue({ $fetchAuth: fetchAuthMock } as any);

    userStoreState = { user: { is_admin: false, full_name: "Existing Name" } };
    mockUseUserStore.mockReturnValue({
      get user() {
        return userStoreState.user;
      },
      initializeUser: vi.fn().mockResolvedValue(undefined),
    } as any);

    getPlayerDetailsMock = vi.fn().mockReturnValue(null);
    setPlayerDetailsMock = vi.fn().mockResolvedValue(undefined);
    setHomeLocationMock = vi.fn().mockResolvedValue(undefined);
    loadAllPreferencesMock = vi.fn().mockResolvedValue(undefined);
    mockUsePreferenceManager.mockReturnValue({
      getPlayerDetails: getPlayerDetailsMock,
      setPlayerDetails: setPlayerDetailsMock,
      setHomeLocation: setHomeLocationMock,
      loadAllPreferences: loadAllPreferencesMock,
    } as any);

    saveOnboardingStepMock = vi.fn().mockResolvedValue(undefined);
    mockUseOnboarding.mockReturnValue({
      saveOnboardingStep: saveOnboardingStepMock,
    } as any);
  });

  it("calls /api/family/create for every provisioned user", async () => {
    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(buildUser());

    expect(fetchAuthMock).toHaveBeenCalledWith("/api/family/create", {
      method: "POST",
    });
  });

  it("does not throw when family creation fails — must never block sign-in", async () => {
    fetchAuthMock.mockRejectedValueOnce(new Error("network error"));

    const { ensureAccountProvisioned } = useAccountProvisioning();
    await expect(ensureAccountProvisioned(buildUser())).resolves.toBeUndefined();
  });

  it("applies the pending admin flag when metadata carries it and the user isn't already admin", async () => {
    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(
      buildUser({ user_metadata: { pending_admin: true } }),
    );

    expect(fetchAuthMock).toHaveBeenCalledWith("/api/auth/admin-profile", {
      method: "POST",
      body: { fullName: "Existing Name" },
    });
  });

  it("does not call admin-profile when there is no pending admin intent", async () => {
    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(buildUser());

    expect(fetchAuthMock).not.toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.anything(),
    );
  });

  it("does not re-apply the admin flag once the user is already admin", async () => {
    userStoreState.user = { is_admin: true };

    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(
      buildUser({ user_metadata: { pending_admin: true } }),
    );

    expect(fetchAuthMock).not.toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.anything(),
    );
  });

  describe("pending onboarding step 1 (pre-confirmation signup fields)", () => {
    it("flushes the drafted step-1 fields into preferences when none exist yet", async () => {
      const { ensureAccountProvisioned } = useAccountProvisioning();
      await ensureAccountProvisioned(
        buildUser({
          user_metadata: {
            pending_graduation_year: "2027",
            pending_primary_sport: "Baseball",
            pending_gender: "male",
            pending_zip_code: "90210",
          },
        }),
      );

      expect(loadAllPreferencesMock).toHaveBeenCalled();
      expect(setPlayerDetailsMock).toHaveBeenCalledWith({
        graduation_year: 2027,
        primary_sport: "Baseball",
        gender: "male",
      });
      expect(setHomeLocationMock).toHaveBeenCalledWith({ zip: "90210" });
      expect(saveOnboardingStepMock).toHaveBeenCalledWith(1, {
        graduation_year: 2027,
        primary_sport: "Baseball",
        gender: "male",
        zip_code: "90210",
      });
    });

    it("skips zip write when no zip was drafted", async () => {
      const { ensureAccountProvisioned } = useAccountProvisioning();
      await ensureAccountProvisioned(
        buildUser({
          user_metadata: {
            pending_graduation_year: "2027",
            pending_primary_sport: "Baseball",
          },
        }),
      );

      expect(setHomeLocationMock).not.toHaveBeenCalled();
    });

    it("does not re-apply once player details already exist — idempotent across every sign-in", async () => {
      getPlayerDetailsMock.mockReturnValue({ primary_sport: "Softball" });

      const { ensureAccountProvisioned } = useAccountProvisioning();
      await ensureAccountProvisioned(
        buildUser({
          user_metadata: {
            pending_graduation_year: "2027",
            pending_primary_sport: "Baseball",
          },
        }),
      );

      expect(setPlayerDetailsMock).not.toHaveBeenCalled();
      expect(setHomeLocationMock).not.toHaveBeenCalled();
      expect(saveOnboardingStepMock).not.toHaveBeenCalled();
    });

    it("does nothing when no onboarding draft is present in metadata", async () => {
      const { ensureAccountProvisioned } = useAccountProvisioning();
      await ensureAccountProvisioned(buildUser());

      expect(loadAllPreferencesMock).not.toHaveBeenCalled();
      expect(setPlayerDetailsMock).not.toHaveBeenCalled();
    });

    it("does not throw when the preference write fails — must never block sign-in", async () => {
      setPlayerDetailsMock.mockRejectedValueOnce(new Error("network error"));

      const { ensureAccountProvisioned } = useAccountProvisioning();
      await expect(
        ensureAccountProvisioned(
          buildUser({
            user_metadata: {
              pending_graduation_year: "2027",
              pending_primary_sport: "Baseball",
            },
          }),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
