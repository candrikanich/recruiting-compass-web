import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockActiveFamily = {
  activeFamilyId: { value: "family-123" },
  activeAthleteId: { value: "user-123" },
  isViewingAsParent: { value: false },
  getDataOwnerUserId: () => "user-123",
};
vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => mockActiveFamily,
}));

const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockSupabase = { auth: { signOut: mockSignOut } };
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

const { mockResetFamilyContext } = vi.hoisted(() => ({
  mockResetFamilyContext: vi.fn(),
}));
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => mockActiveFamily,
  resetFamilyContext: mockResetFamilyContext,
}));

import { useUserStore } from "~/stores/user";
import { useSchoolStore } from "~/stores/schools";
import { useCoachStore } from "~/stores/coaches";
import { useOffersStore } from "~/stores/offers";
import { usePlayerProfileStore } from "~/stores/playerProfile";
import {
  useAuthLifecycle,
  resetAppState,
} from "~/composables/useAuthLifecycle";

describe("useAuthLifecycle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    localStorage.clear();
  });

  describe("logoutEverywhere", () => {
    it("calls supabase.auth.signOut()", async () => {
      const { logoutEverywhere } = useAuthLifecycle();
      await logoutEverywhere();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it("clears the user store", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "u1", email: "a@b.com", role: "player" } as any;
      userStore.isAuthenticated = true;

      const { logoutEverywhere } = useAuthLifecycle();
      await logoutEverywhere();

      expect(userStore.user).toBeNull();
      expect(userStore.isAuthenticated).toBe(false);
    });

    it("resets every domain store (schools, coaches, offers, playerProfile)", async () => {
      const schoolStore = useSchoolStore();
      const coachStore = useCoachStore();
      const offersStore = useOffersStore();
      const profileStore = usePlayerProfileStore();

      schoolStore.schools = [{ id: "s1" } as any];
      schoolStore.isFetched = true;
      coachStore.coaches = [{ id: "c1" } as any];
      coachStore.isFetched = true;
      offersStore.offers = [{ id: "o1" } as any];
      offersStore.isFetched = true;
      profileStore.profile = { id: "p1" } as any;

      const { logoutEverywhere } = useAuthLifecycle();
      await logoutEverywhere();

      expect(schoolStore.schools).toEqual([]);
      expect(schoolStore.isFetched).toBe(false);
      expect(coachStore.coaches).toEqual([]);
      expect(coachStore.isFetched).toBe(false);
      expect(offersStore.offers).toEqual([]);
      expect(offersStore.isFetched).toBe(false);
      expect(profileStore.profile).toBeNull();
    });

    it("resets the shared family-context singleton", async () => {
      const { logoutEverywhere } = useAuthLifecycle();
      await logoutEverywhere();
      expect(mockResetFamilyContext).toHaveBeenCalledTimes(1);
    });

    it("clears session_preferences and last_activity from localStorage", async () => {
      localStorage.setItem("session_preferences", JSON.stringify({ a: 1 }));
      localStorage.setItem("last_activity", "12345");

      const { logoutEverywhere } = useAuthLifecycle();
      await logoutEverywhere();

      expect(localStorage.getItem("session_preferences")).toBeNull();
      expect(localStorage.getItem("last_activity")).toBeNull();
    });

    it("still resets local state even if supabase.auth.signOut() rejects", async () => {
      mockSignOut.mockRejectedValue(new Error("network down"));
      const userStore = useUserStore();
      userStore.user = { id: "u1", email: "a@b.com", role: "player" } as any;

      const { logoutEverywhere } = useAuthLifecycle();
      await expect(logoutEverywhere()).resolves.toBeUndefined();

      expect(userStore.user).toBeNull();
      expect(mockResetFamilyContext).toHaveBeenCalledTimes(1);
    });

    it("still resets local state even if supabase.auth.signOut() returns an error", async () => {
      mockSignOut.mockResolvedValue({ error: { message: "no session" } });
      const userStore = useUserStore();
      userStore.user = { id: "u1", email: "a@b.com", role: "player" } as any;

      const { logoutEverywhere } = useAuthLifecycle();
      await logoutEverywhere();

      expect(userStore.user).toBeNull();
    });
  });

  describe("resetAppState", () => {
    it("resets domain stores and the family context without touching the user store", () => {
      const userStore = useUserStore();
      const schoolStore = useSchoolStore();
      userStore.user = { id: "u1", email: "a@b.com", role: "player" } as any;
      schoolStore.schools = [{ id: "s1" } as any];
      schoolStore.isFetched = true;

      resetAppState();

      // user store untouched — resetAppState is the domain-store-only half,
      // used as a SIGNED_OUT-event backstop where userStore.logout() is
      // called separately by the caller.
      expect(userStore.user).not.toBeNull();
      expect(schoolStore.schools).toEqual([]);
      expect(mockResetFamilyContext).toHaveBeenCalledTimes(1);
    });
  });
});
