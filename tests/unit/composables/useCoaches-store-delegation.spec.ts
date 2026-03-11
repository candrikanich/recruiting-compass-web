import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({ data: [], error: null }),
    }),
  }),
}));
vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({ activeFamilyId: { value: "fam-1" } }),
}));
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({ activeFamilyId: { value: "fam-1" } }),
}));
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn() }),
}));
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: { id: "u1" } }),
}));

describe("useCoaches — store delegation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("coaches ref reads from useCoachStore, not a separate shallowRef", async () => {
    const { useCoaches } = await import("~/composables/useCoaches");
    const { useCoachStore } = await import("~/stores/coaches");

    const store = useCoachStore();
    const { coaches } = useCoaches();

    store.coaches = [{ id: "c1", first_name: "Jane", last_name: "Doe" } as any];

    expect(coaches.value).toHaveLength(1);
    expect(coaches.value[0].id).toBe("c1");
  });
});
