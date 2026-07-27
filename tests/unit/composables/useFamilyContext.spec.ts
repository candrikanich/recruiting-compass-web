import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";

const mockFetchFn = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchFn }),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}));

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: {} })),
}));

describe("useFamilyContext (shared singleton)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockFetchFn.mockClear();
    localStorage.clear();
    vi.resetModules();
  });

  it("returns the exact same object reference on repeated calls", async () => {
    const { useFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );
    const a = useFamilyContext();
    const b = useFamilyContext();
    expect(a).toBe(b);
  });

  it("resetFamilyContext keeps the same object reference but clears its state", async () => {
    mockFetchFn.mockResolvedValue({
      families: [
        {
          familyUnitId: "family-1",
          athleteId: "athlete-1",
          athleteName: "Player A",
          graduationYear: 2025,
          familyName: "Test Family",
        },
      ],
    });

    const userStore = useUserStore();
    userStore.user = { id: "parent-1", role: "parent" } as any;

    const { useFamilyContext, resetFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );
    const instance = useFamilyContext();
    await instance.initializeFamily();
    await instance.switchAthlete("athlete-1");
    expect(instance.activeAthleteId.value).toBe("athlete-1");

    resetFamilyContext();

    // Same reference — anything holding onto `instance` (e.g. app.vue's
    // provide('activeFamily', instance)) still sees the reset state.
    expect(useFamilyContext()).toBe(instance);
    expect(instance.parentAccessibleFamilies.value).toEqual([]);
    expect(instance.familyMembers.value).toEqual([]);
  });

  it("resetFamilyContext is a no-op (does not throw) if the singleton was never created", async () => {
    const { resetFamilyContext } = await import(
      "~/composables/useFamilyContext"
    );
    expect(() => resetFamilyContext()).not.toThrow();
  });
});
